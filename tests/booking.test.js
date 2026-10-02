/**
 * NEXO · GUÍA DEL MÓDULO: tests/booking.test.js
 * Pruebas unitarias y de integración de booking.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {BookingService,candidateSlots,eventBusy} from '../server/booking.js';
import {centerRepository,schoolCenter} from '../server/center.js';
import {calendarFixture} from './calendar-fixture.js';
import {createApp} from '../server/app.js';
import {BookingMailer} from '../server/providers/booking-mail.js';
import {bookingIntent} from '../server/booking-intent.js';
const hours=Array.from({length:7},(_,day)=>({day,open:day<5?'08:00':null,close:day<5?'18:00':null}));
async function fixture(t){
 const f=calendarFixture();await f.authorize();await f.service.select(f.calendars[1].id);
 const repo=centerRepository(f.repo,schoolCenter),current=repo.getCenterSettings();
 repo.saveService(current.revision,'road-test',{name:'Clase práctica',description:'Clase práctica de conducción.',duration:60,priceCents:null,requirements:null,modality:'Presencial',active:true});
 const events=[],original=f.service.fetch;
 f.service.fetch=async(url,opts)=>{const u=new URL(url);if((opts.method==='GET')&&u.pathname.endsWith('/events')){
  if(f.flags.listError)return new Response('{}',{status:503});
  const items=[...events,...[...f.events.values()]];return new Response(JSON.stringify({items}));
 }return original(url,opts);};
 const bookings=new BookingService({repository:repo,calendar:f.service,now:()=>Date.parse('2026-09-28T11:00:00Z')});
 await bookings.configure({...repo.bookingSettings(),enabled:true,serviceIds:['road-test']});
 t.after(()=>{f.service.close();f.repo.close();});
 const input=slot=>({requestId:randomUUID(),sessionHash:'visitor-a',serviceId:'road-test',slot,customerName:'Prueba Nexo',email:'test@example.test',priceCents:null});
 return {...f,repo,bookings,events,input};
}
test('horarios respetan duración, semana, anticipación, cierre y DST Nueva York',()=>{
 const make=now=>candidateSlots({now:Date.parse(now),timezone:'America/New_York',weeklyHours:hours,duration:60,horizonDays:5,noticeMinutes:60,stepMinutes:60});
 const spring=make('2026-03-06T12:00:00Z');assert.equal(spring[0].slot,'2026-03-06T13:00:00.000Z');assert.ok(spring.some(s=>s.slot==='2026-03-09T12:00:00.000Z'));assert.ok(!spring.some(s=>s.slot.startsWith('2026-03-07')||s.slot.startsWith('2026-03-08')));
 const fall=make('2026-10-30T11:00:00Z');assert.ok(fall.some(s=>s.slot==='2026-11-02T13:00:00.000Z'));
 for(const s of spring){const end=Number(new Intl.DateTimeFormat('en',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(new Date(s.end)));assert.ok(end<=18);assert.equal(Date.parse(s.end)-Date.parse(s.slot),3600000);}
});
test('eventos de todo el día y cambios DST bloquean su intervalo completo; transparentes/cancelados no',()=>{
 assert.deepEqual(eventBusy({start:{date:'2026-03-08'},end:{date:'2026-03-09'}},'America/New_York'),{start:Date.parse('2026-03-08T05:00Z'),end:Date.parse('2026-03-09T04:00Z')});
 assert.equal(eventBusy({transparency:'transparent'},'UTC'),null);assert.equal(eventBusy({status:'cancelled'},'UTC'),null);assert.throws(()=>eventBusy({start:{},end:{}},'UTC'));
});
test('disponibilidad excluye intervalos solapados, días completos y no expone citas',async t=>{
 const f=await fixture(t);f.events.push({summary:'Dato privado',start:{dateTime:'2026-09-28T12:30:00Z'},end:{dateTime:'2026-09-28T13:30:00Z'}},{start:{date:'2026-09-29'},end:{date:'2026-09-30'}});
 const r=await f.bookings.availability('road-test');assert.ok(!r.slots.includes('2026-09-28T12:00:00.000Z'));assert.ok(!r.slots.includes('2026-09-28T13:00:00.000Z'));assert.ok(r.slots.includes('2026-09-28T14:00:00.000Z'));assert.ok(!r.slots.some(s=>s.startsWith('2026-09-29')));assert.doesNotMatch(JSON.stringify(r),/Dato privado/);
 assert.equal(r.schedule.find(s=>s.slot==='2026-09-28T12:00:00.000Z').reason,'occupied');assert.ok(r.schedule.filter(s=>s.slot.startsWith('2026-09-29')).every(s=>!s.available&&s.reason==='occupied'));assert.ok(r.schedule.some(s=>s.available));
 f.flags.listError=true;await assert.rejects(f.bookings.availability('road-test'));
});
test('reserva confirmada es idempotente, privada, sin correos y bloquea la hora',async t=>{
 const f=await fixture(t),slot=(await f.bookings.availability('road-test')).slots[0],input=f.input(slot);
 const r=await f.bookings.reserve(input);assert.equal(r.status,'reserved');assert.equal((await f.bookings.reserve(input)).id,r.id);assert.equal(f.calls.filter(c=>c.method==='POST'&&c.path.endsWith('/events')).length,1);
 const event=[...f.events];assert.equal(event.length,0);const created=[...f.service.repo.calendarBookings()][0];assert.equal(created.consentVersion,'calendar-2026-09');
 const call=f.calls.find(c=>c.method==='POST'&&c.path.endsWith('/events'));assert.equal(call.body.visibility,'private');assert.equal(call.body.transparency,'opaque');assert.equal(call.body.attendees,undefined);assert.match(call.url,/sendUpdates=none/);
 assert.ok(!(await f.bookings.availability('road-test')).slots.includes(slot));await assert.rejects(f.bookings.reserve({...input,sessionHash:'visitor-b'}),/otros datos/);
 await f.bookings.cancel(r.id);assert.equal((await f.bookings.verify(r.id)).status,'cancelled');assert.ok((await f.bookings.availability('road-test')).slots.includes(slot));
});
test('dos reservas simultáneas nunca insertan dos eventos en la misma hora',async t=>{
 const f=await fixture(t),slot=(await f.bookings.availability('road-test')).slots[0];const results=await Promise.allSettled([f.bookings.reserve(f.input(slot)),f.bookings.reserve(f.input(slot))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.repo.calendarBookings().length,1);
});
test('creación incierta mantiene el horario protegido y verificar no vuelve a insertar',async t=>{
 const f=await fixture(t),slot=(await f.bookings.availability('road-test')).slots[0],input=f.input(slot);f.flags.insertUncertain=true;const r=await f.bookings.reserve(input);assert.equal(r.status,'pending');assert.ok(!(await f.bookings.availability('road-test')).slots.includes(slot));
 assert.equal((await f.bookings.reserve(input)).status,'reserved');assert.equal(f.calls.filter(c=>c.method==='POST'&&c.path.endsWith('/events')).length,1);
});
test('no inventa disponibilidad ni acepta precio, horario o servicio alterado',async t=>{
 const f=await fixture(t),slot=(await f.bookings.availability('road-test')).slots[0];await assert.rejects(f.bookings.reserve({...f.input(slot),priceCents:0}),/cambió/);await assert.rejects(f.bookings.reserve(f.input('2026-09-28T03:00:00.000Z')),/horario/);await assert.rejects(f.bookings.availability('clases'),/no admite/);
 const rules=f.repo.bookingSettings();await assert.rejects(f.bookings.configure({...rules,serviceIds:['clases']}),/duración/);await assert.rejects(f.bookings.configure({...rules,noticeMinutes:0}));await f.bookings.configure({...rules,enabled:false});await assert.rejects(f.bookings.availability('road-test'));
});
test('cancelación no borra eventos modificados ni crea copias',async t=>{
 const f=await fixture(t),slot=(await f.bookings.availability('road-test')).slots[0],r=await f.bookings.reserve(f.input(slot));
 const original=f.service.request.bind(f.service);f.service.request=async(path,opts)=>{const v=await original(path,opts);return opts?.allowMissing&&v?{...v,extendedProperties:{private:{nexoBooking:'wrong'}}}:v;};
 await assert.rejects(f.bookings.cancel(r.id),/modificado/);assert.equal(f.repo.calendarBooking(r.id).status,'reserved');assert.equal(f.calls.filter(c=>c.method==='DELETE').length,0);
});
test('API de reservas exige sesión, consentimiento y administración; no revela PII ni secretos',async t=>{
 const f=await fixture(t),admin='test-administrator-token-long';
 const app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,adminToken:admin,sessionTtlMs:300000},ai:{reply:async()=>({text:'local'})},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),stop:async()=>{},close:async()=>{}}});app.listen(0,'127.0.0.1');await once(app,'listening');
 // Close server before the fixture disposes the repository.
 const base='http://127.0.0.1:'+app.address().port,req=async(path,method='GET',body,token)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{
 assert.equal((await req('/api/admin/calendar/booking-settings')).status,401);assert.equal((await req('/api/services/road-test/slots')).status,401);
 const token=(await req('/api/sessions','POST',{consent:true})).data.token;
 for(const [message,action] of [['Quiero reservar una cita','reserve'],['Quiero consultar mi cita','lookup'],['Quiero ver disponibilidad','availability']]){
   const reply=await req('/api/chat','POST',{message,channel:'voice'},token);assert.equal(reply.data.bookingAction,action);
 }
 const slots=(await req('/api/services/road-test/slots','GET',null,token)).data.slots;assert.ok(slots.length);
 const input={...f.input(slots[0]),expectedPriceCents:null,consent:false};assert.equal((await req('/api/appointments','POST',input,token)).status,400);
 input.consent=true;const r=await req('/api/appointments','POST',input,token);assert.equal(r.status,201);assert.equal(r.data.status,'reserved');assert.doesNotMatch(JSON.stringify(r.data),/email|sessionHash|marker|calendarId/);
 assert.equal((await req('/api/appointments/lookup','POST',{id:r.data.id,email:input.email})).status,401);
 assert.equal((await req('/api/admin/calendar/bookings/'+r.data.id+'/receipt','POST',{},token)).status,401);
 assert.equal((await req('/api/appointments/lookup','POST',{id:r.data.id,email:'wrong@example.test'},token)).status,404);
 assert.match(r.data.code,/^[A-Z]{4}-[A-Z]{4}$/);
 const looked=await req('/api/appointments/lookup','POST',{id:r.data.code.toLowerCase().replace('-',' '),email:input.email},token);assert.equal(looked.status,200);assert.equal(looked.data.status,'reserved');assert.doesNotMatch(JSON.stringify(looked.data),/email|customerName|marker|calendarId/);
 const summary=await req('/api/admin/overview','GET',null,admin);assert.equal(summary.data.appointments[0].provider,'google-calendar');assert.equal((await req('/api/admin/calendar/bookings/'+r.data.id+'/verify','POST',{},token)).status,401);
 assert.equal((await req('/api/admin/appointments/'+r.data.id,'PATCH',{status:'cancelled',reason:'Prueba de cancelación'},admin)).status,200);
 }finally{await new Promise(r=>app.close(r));}
});
test('correo de confirmación se envía solo una vez, después de confirmar y separado del estado de la cita',async t=>{
 const f=await fixture(t),sent=[];f.bookings.mailer={ready:true,async sendConfirmation(value){sent.push(value);}};
 const slot=(await f.bookings.availability('road-test')).slots[0],r=await f.bookings.reserve(f.input(slot));
 await Promise.all([f.bookings.sendConfirmation(r.id),f.bookings.sendConfirmation(r.id)]);assert.equal(sent.length,1);assert.equal(f.repo.bookingReceipt(r.id).status,'sent');assert.equal(sent[0].booking.id,r.id);
 await f.bookings.sendConfirmation(r.id);assert.equal(sent.length,1);await f.bookings.cancel(r.id);assert.equal(await f.bookings.sendConfirmation(r.id),'not_sent');
});
test('fallo o envío SMTP incierto no cancela la cita ni se reenvía automáticamente',async t=>{
 const f=await fixture(t);let calls=0;f.bookings.mailer={ready:true,async sendConfirmation(){calls++;throw Error('SMTP timeout');}};
 const r=await f.bookings.reserve(f.input((await f.bookings.availability('road-test')).slots[0]));assert.equal(await f.bookings.sendConfirmation(r.id),'uncertain');assert.equal(f.repo.calendarBooking(r.id).status,'reserved');await f.bookings.sendConfirmation(r.id);assert.equal(calls,1);
});
test('consulta exige correo y referencia completos y consulta el evento real del proveedor',async t=>{
 const f=await fixture(t),r=await f.bookings.reserve(f.input((await f.bookings.availability('road-test')).slots[0]));
 await assert.rejects(f.bookings.lookup({id:r.id,email:'other@example.test'}),/No encontramos/);await assert.rejects(f.bookings.lookup({id:r.id.slice(0,8),email:'test@example.test'}),/No encontramos/);
 assert.match(r.code,/^[A-Z]{4}-[A-Z]{4}$/);
 for(const id of [r.code,r.code.toLowerCase().replace('-',''),r.code.replace('-',' '),r.id,r.id.toUpperCase()])assert.equal((await f.bookings.lookup({id,email:'test@example.test'})).status,'reserved');
 await assert.rejects(f.bookings.lookup({id:r.code,email:'other@example.test'}),/No encontramos/);
 assert.equal((await f.bookings.lookup({id:r.id,email:'test@example.test'})).status,'reserved');await f.bookings.cancel(r.id);assert.equal((await f.bookings.lookup({id:r.id,email:'test@example.test'})).status,'cancelled');
});
test('plantilla de correo incluye fecha local y código corto, sin invitaciones ni credenciales',async()=>{
 let sent;const mailer=new BookingMailer({host:'smtp.example.test',from:'school@example.test',user:'test',password:'private-secret',port:465,secure:true},()=>({async sendMail(value){sent=value;return {accepted:['test@example.test']};}}));
 await mailer.sendConfirmation({centerName:'Centro',booking:{id:'reference-full',code:'ABCD-EFGH',serviceName:'Clase práctica',email:'test@example.test',slot:'2026-09-28T12:00:00Z',end:'2026-09-28T13:00:00Z',timezone:'America/New_York'}});
 assert.match(sent.text,/8:00|08:00/);assert.match(sent.text,/ABCD-EFGH/);assert.doesNotMatch(sent.text,/reference-full/);assert.match(sent.text,/no se añade automáticamente/);assert.doesNotMatch(JSON.stringify(sent),/private-secret/);assert.equal(sent.to,'test@example.test');
});
test('intenciones de voz abren formularios sin crear citas y respetan negación',()=>{
 for(const [message,expected] of [['Quiero reservar una cita','reserve'],['Quiero confirmar una cita','reserve'],['Quiero consultar mi cita','lookup'],['consultar cita','lookup'],['¿Qué horarios disponibles tienen?','availability'],['Quiero ver disponibilidad de una cita','availability'],['No quiero reservar una cita',null],['Cancelar mi cita',null]])assert.equal(bookingIntent(message),expected);
});

test('horarios visibles incluyen pasados y anticipación pero nunca se ofrecen para reservar',async t=>{
 const f=await fixture(t);f.bookings.now=()=>Date.parse('2026-09-28T14:30:00Z');const r=await f.bookings.availability('road-test');
 assert.equal(r.schedule.find(s=>s.slot==='2026-09-28T12:00:00.000Z').reason,'past');assert.equal(r.schedule.find(s=>s.slot==='2026-09-28T15:00:00.000Z').reason,'notice');assert.ok(!r.slots.includes('2026-09-28T15:00:00.000Z'));assert.ok(r.slots.includes('2026-09-28T16:00:00.000Z'));assert.ok(r.schedule.every(s=>s.slot>='2026-09-28T04:00:00Z'));
});
test('API agenda: texto/voz comparten preferencias, sesiones aisladas y no crea eventos por conversar',async t=>{
 // Mantener el reloj de la API alineado con los datos de prueba, sin depender del día real.
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-09-28T11:00:00Z')});
 const f=await fixture(t),app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,sessionTtlMs:300000},ai:{reply:async()=>{throw Error('AI forbidden');}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),stop:async()=>{},close:async()=>{}}});app.listen(0,'127.0.0.1');await once(app,'listening');
 const base='http://127.0.0.1:'+app.address().port;
 const request=async(path,data,token)=>{const r=await fetch(base+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,...await r.json()};};
 try{const token=(await request('/api/sessions',{consent:true})).token;const date=(await request('/api/services/road-test/slots',null,token)).slots[0].slice(0,10);
 let r=await request('/api/chat',{message:'Quiero una clase práctica el '+date+' por la tarde',channel:'text'},token);assert.equal(r.reason,'agenda');assert.equal(r.agenda.options.length,3);assert.equal(r.provider,'local');
 r=await request('/api/chat',{message:'mejor por la mañana',channel:'voice'},token);assert.equal(r.agenda.options.length,3);const second=r.agenda.options[1].slot;
 r=await request('/api/chat',{message:'la segunda',channel:'voice'},token);assert.equal(r.agenda.selectedSlot,second);assert.equal(f.repo.calendarBookings().length,0);
 r=await request('/api/chat',{message:'Cuánto dura la clase práctica',channel:'text'},token);assert.equal(r.agenda,undefined);assert.match(r.text,/60 minutos/);
 r=await request('/api/chat',{message:'Quiero una clase el viernes y una receta de pizza',channel:'text'},token);assert.equal(r.agenda,undefined);assert.equal(r.reason,'off_topic');
 const other=(await request('/api/sessions',{consent:true})).token;r=await request('/api/chat',{message:'la segunda',channel:'text'},other);assert.equal(r.agenda,undefined);
 await fetch(base+'/api/session',{method:'DELETE',headers:{Authorization:'Bearer '+token}});assert.equal((await request('/api/chat',{message:'la segunda'},token)).status,401);
 }finally{await new Promise(r=>app.close(r));}
});
test('agenda semántica reutiliza la cuota de OpenAI y valida el plan antes de consultar',async t=>{
 const f=await fixture(t),setting=f.repo.getCenterSettings();setting.configuration.ai.sessionCalls=1;f.repo.saveConfiguration(setting.revision,{profile:setting.profile,configuration:setting.configuration});let calls=0,date;
 const app=createApp({repository:f.repo,calendar:f.service,config:{provider:'openai',model:'test',center:schoolCenter,sessionTtlMs:300000},ai:{interpret:async({preparedRequest})=>{calls++;assert.equal(preparedRequest.text.format.name,'booking_preferences');return {interpretation:{status:'agenda',serviceId:'road-test',date,period:'afternoon',after:null,selection:null,clarification:null},usage:{input_tokens:20,output_tokens:20}};},reply:async()=>{throw Error('No guidance');}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),stop:async()=>{},close:async()=>{}}});app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
 const request=async(path,data,token)=>fetch(base+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})}).then(r=>r.json());
 try{const token=(await request('/api/sessions',{consent:true})).token;date=(await request('/api/services/road-test/slots',null,token)).slots[0].slice(0,10);
 let r=await request('/api/chat',{message:'Tienen huequito para una clase práctica el '+date+' al salir de mi trabajo'},token);assert.equal(r.provider,'openai');assert.equal(r.agenda.options.length,3);assert.equal(calls,1);
 r=await request('/api/chat',{message:'mejor tempranito'},token);assert.equal(r.reason,'session_limit');assert.equal(r.catalogOnly,true);assert.equal(calls,1);assert.equal(f.repo.calendarBookings().length,0);
 }finally{await new Promise(r=>app.close(r));}
});
