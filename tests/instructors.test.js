/**
 * NEXO · GUÍA DEL MÓDULO: tests/instructors.test.js
 * Cupos por profesor, elección explícita, carreras, permisos y compatibilidad de citas.
 * Calendarios y SMTP simulados; las restricciones SQLite y HTTP son reales.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {instructorsFixture} from './instructors-fixture.js';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
import {calendarInstructorName} from '../public/instructor-settings.js';
test('nombre sugerido elimina solo prefijo decorativo, conserva acentos y apellidos compuestos',()=>{
 assert.equal(calendarInstructorName('Clases · Héctor Mogollón'),'Héctor Mogollón');assert.equal(calendarInstructorName('  Clases - Anne-Marie Dupont  '),'Anne-Marie Dupont');assert.equal(calendarInstructorName('Ana Pérez'),'Ana Pérez');assert.equal(calendarInstructorName('Clases avanzadas de Juan'),'Clases avanzadas de Juan');assert.equal(calendarInstructorName('Clases · '),'');
});
async function fixture(t){const f=await instructorsFixture();t.after(()=>f.close());return f;}
test('cinco profesores: cuatro reservas dejan un cupo, el quinto lo ocupa y cancelar libera solo uno',async t=>{
 const f=await fixture(t),initial=await f.bookings.availability('road-test'),slot=initial.slots[0],ids=initial.instructors.map(i=>i.id);const rows=[];
 assert.equal(initial.schedule.find(s=>s.slot===slot).remaining,5);assert.doesNotMatch(JSON.stringify(initial),/@example|calendarId|marker|Alumno/);
 for(let i=0;i<4;i++)rows.push(await f.bookings.reserve(f.input(slot,ids[i])));
 let state=(await f.bookings.availability('road-test')).schedule.find(s=>s.slot===slot);assert.equal(state.remaining,1);assert.deepEqual(state.instructorIds,[ids[4]]);
 const last=await f.bookings.reserve(f.input(slot,ids[4]));assert.equal(last.instructorName,'Profesor 5');assert.equal(f.repo.calendarBooking(last.id).calendarId,f.teachers[4].id);
 state=(await f.bookings.availability('road-test')).schedule.find(s=>s.slot===slot);assert.equal(state.available,false);assert.equal(state.remaining,0);await assert.rejects(f.bookings.reserve(f.input(slot,ids[4])),/no está disponible/);
 await f.bookings.cancel(rows[1].id);state=(await f.bookings.availability('road-test')).schedule.find(s=>s.slot===slot);assert.equal(state.remaining,1);assert.deepEqual(state.instructorIds,[ids[1]]);assert.equal(f.events.size,4);
});
test('selección obligatoria, nunca cambia de profesor silenciosamente y reintento conserva asignación',async t=>{
 const f=await fixture(t),a=await f.bookings.availability('road-test'),slot=a.slots[0],[one,two]=a.instructors;
 await assert.rejects(f.bookings.reserve(f.input(slot,null)),/profesor/);await assert.rejects(f.bookings.reserve(f.input(slot,'forged')),/profesor/);assert.equal(f.events.size,0);
 const input=f.input(slot,one.id),saved=await f.bookings.reserve(input);assert.equal((await f.bookings.reserve(input)).id,saved.id);
 await assert.rejects(f.bookings.reserve({...input,instructorId:two.id}),/otro profesor/);await assert.rejects(f.bookings.reserve(f.input(slot,one.id)),/no está disponible/);assert.equal(f.events.size,1);
 assert.equal(f.repo.agendaDetail(saved.id).instructorName,one.name);
});
test('dos solicitudes del último cupo no sobrevendan y un pending bloquea solo su profesor',async t=>{
 const f=await fixture(t),a=await f.bookings.availability('road-test'),slot=a.slots[0],ids=a.instructors.map(i=>i.id);
 for(let i=0;i<4;i++)await f.bookings.reserve(f.input(slot,ids[i]));
 f.flags.insertUncertain=true;const input=f.input(slot,ids[4]);const results=await Promise.allSettled([f.bookings.reserve(input),f.bookings.reserve(f.input(slot,ids[4]))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='fulfilled').value.status,'pending');assert.equal(f.events.size,5);
 assert.equal((await f.bookings.availability('road-test')).schedule.find(s=>s.slot===slot).remaining,0);f.flags.insertUncertain=false;assert.equal((await f.bookings.reserve(input)).status,'reserved');assert.equal(f.events.size,5);
});
test('duplicados, permisos, revisión y cobertura de servicios impiden configuración insegura',async t=>{
 const f=await fixture(t),rules=f.repo.bookingSettings();
 await assert.rejects(f.bookings.configure({...rules,instructors:[rules.instructors[0],rules.instructors[0]]}),/mismo calendario/);
 await assert.rejects(f.bookings.configure({...rules,instructors:rules.instructors.map(i=>({...i,active:false}))}),/profesor activo/);
 await assert.rejects(f.bookings.configure({...rules,instructors:[{...rules.instructors[0],calendarId:f.calendars[2].id}]}),/no permite/);
 await assert.rejects(f.bookings.configure({...rules,instructors:[{...rules.instructors[0],name:'A\nB'}]}),/válidos/);
 await f.bookings.configure({...rules,instructors:rules.instructors});await assert.rejects(f.bookings.configure(rules),/Otra ventana/);
 f.flags.unreadableCalendar=f.teachers[3].id;const before=f.events.size;await assert.rejects(f.bookings.availability('road-test'));assert.equal(f.events.size,before);
});
test('solapamiento externo y eventos de todo el día bloquean solo el calendario correspondiente',async t=>{
 const f=await fixture(t),a=await f.bookings.availability('road-test'),slot=a.slots[0];
 f.events.set(f.teachers[0].id+'/external',{summary:'privado externo',start:{dateTime:new Date(Date.parse(slot)+30*60000).toISOString()},end:{dateTime:new Date(Date.parse(slot)+90*60000).toISOString()}});
 f.events.set(f.teachers[1].id+'/holiday',{start:{date:'2026-09-28'},end:{date:'2026-09-29'}});
 f.events.set(f.teachers[2].id+'/transparent',{transparency:'transparent'});
 const r=await f.bookings.availability('road-test');assert.equal(r.schedule.find(s=>s.slot===slot).remaining,3);assert.equal(r.schedule.find(s=>s.slot==='2026-09-28T13:00:00.000Z').remaining,3);assert.doesNotMatch(JSON.stringify(r),/privado externo/);
});
test('quitar profesor o volver a agenda única conserva verificación/cancelación en su calendario original',async t=>{
 const f=await fixture(t),a=await f.bookings.availability('road-test'),slot=a.slots[0],saved=await f.bookings.reserve(f.input(slot,a.instructors[0].id));
 await f.bookings.configure({...f.repo.bookingSettings(),instructors:f.repo.bookingSettings().instructors.slice(1)});
 assert.equal((await f.bookings.availability('road-test')).instructors.length,4);assert.equal((await f.bookings.verify(saved.id)).instructorName,'Profesor 1');
 await f.bookings.configure({...f.repo.bookingSettings(),assignment:'single'});const legacy=await f.bookings.availability('road-test');assert.equal(legacy.instructors,undefined);assert.equal(legacy.schedule[0].capacity,1);
 await f.bookings.cancel(saved.id);assert.equal(f.calls.findLast(c=>c.method==='DELETE').url.includes(encodeURIComponent(f.teachers[0].id)),true);assert.equal(f.repo.calendarBooking(saved.id).status,'cancelled');
});
test('servicios y pausas restringen profesores; solapamientos entre servicios siguen bloqueando',async t=>{
 const f=await fixture(t),rules=f.repo.bookingSettings();
 await f.bookings.configure({...rules,serviceIds:['road-test','cinco-horas'],instructors:rules.instructors.map((i,n)=>({...i,active:n!==4,serviceIds:n===0?['road-test','cinco-horas']:['road-test']}))});
 const practical=await f.bookings.availability('road-test'),course=await f.bookings.availability('cinco-horas');assert.equal(practical.instructors.length,4);assert.equal(course.instructors.length,1);
 const slot=course.slots[0];await f.bookings.reserve(f.input(slot,practical.instructors[0].id));
 const next=await f.bookings.availability('cinco-horas');assert.equal(next.schedule.find(s=>s.slot===slot).remaining,0);assert.equal((await f.bookings.availability('road-test')).schedule.find(s=>s.slot===slot).remaining,3);
 await assert.rejects(f.bookings.reserve(f.input(practical.slots.at(-1),rules.instructors[4].id)),/profesor habilitado/);
});

test('API exige administrador para profesores, IDs públicos y conserva el profesor elegido al reservar',async t=>{
 const f=await fixture(t),admin='test-admin-instructors-secret',app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,adminToken:admin,sessionTtlMs:300000},ai:{reply:async()=>({text:'demo'})},localTts:{status:()=>({available:false}),close(){},stop(){}}});app.listen(0,'127.0.0.1');await once(app,'listening');
 const base='http://127.0.0.1:'+app.address().port,call=(path,method='GET',data,token)=>fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});
 try{
  assert.equal((await call('/api/admin/calendar/booking-settings','PUT',f.repo.bookingSettings())).status,401);
  const {token}=await (await call('/api/sessions','POST',{consent:true})).json();const available=await (await call('/api/services/road-test/slots','GET',null,token)).json();assert.doesNotMatch(JSON.stringify(available),/@example|calendarId|access_token/);
  const input={...f.input(available.slots[0],available.instructors[2].id),expectedPriceCents:null,consent:true,instructorName:'Forged',calendarId:'Forged'};
  assert.equal((await call('/api/appointments','POST',{...input,instructorId:'bad'},token)).status,400);
  const response=await call('/api/appointments','POST',input,token);assert.equal(response.status,201);const saved=await response.json();assert.equal(saved.instructorName,'Profesor 3');assert.doesNotMatch(JSON.stringify(saved),/Forged|calendarId|marker/);assert.equal(f.repo.calendarBooking(saved.id).calendarId,f.teachers[2].id);
  const teacher=available.instructors[2].id,path='/api/admin/agenda?instructorId='+teacher;
  assert.equal((await call(path,'GET',null,token)).status,401);const filtered=await (await call(path,'GET',null,admin)).json();assert.equal(filtered.total,1);assert.equal(filtered.items[0].id,saved.id);assert.equal(filtered.instructors.length,5);assert.doesNotMatch(JSON.stringify(filtered.instructors),/calendarId|@example|marker/);
  assert.equal((await call('/api/admin/agenda?instructorId=forged','GET',null,admin)).status,400);
  const scoped=await (await call('/api/admin/agenda-availability?serviceId=road-test&instructorId='+teacher,'GET',null,admin)).json();const occupied=scoped.schedule.find(s=>s.slot===input.slot);assert.equal(occupied.remaining,0);assert.equal(occupied.capacity,1);assert.equal(scoped.instructors.length,1);
  const other=await (await call('/api/admin/agenda-availability?serviceId=road-test&instructorId='+available.instructors[1].id,'GET',null,admin)).json();assert.equal(other.schedule.find(s=>s.slot===input.slot).remaining,1);
  assert.equal((await call('/api/admin/agenda-availability?serviceId=road-test&instructorId=unassigned','GET',null,admin)).status,409);
 }finally{await new Promise(resolve=>app.close(resolve));await app.closeAdminAuth();}
});
