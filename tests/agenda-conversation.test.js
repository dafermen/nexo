/**
 * NEXO · GUÍA DEL MÓDULO: tests/agenda-conversation.test.js
 * Pruebas unitarias y de integración de agenda conversation.
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
import {once} from 'node:events';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
import {instructorsFixture} from './instructors-fixture.js';
import {agendaCandidate,parseAgenda,resolveAgenda,validateAgenda,buildAgendaRequest} from '../server/agenda-conversation.js';
const now=Date.parse('2026-09-28T13:00:00Z'),services=[{id:'practice',name:'Clase práctica'},{id:'course',name:'Curso de las 5 horas'}],center={name:'Centro',timezone:'America/New_York',booking:{serviceIds:['practice']}},empty={status:'agenda',serviceId:null,date:null,period:null,after:null,selection:null,clarification:null};
const slots=['2026-10-02T13:00:00Z','2026-10-02T14:00:00Z','2026-10-02T15:00:00Z','2026-10-02T19:00:00Z','2026-10-02T20:00:00Z','2026-10-02T21:00:00Z'];
const parse=(message,state={})=>parseAgenda(message,{services,center,state,now});
const resolve=(plan,state,availability=async()=>({slots}))=>resolveAgenda({plan,state,services,center,availability,now});
test('fecha local y preferencias: mañana día, mañana franja y hora ambigua',()=>{
 assert.equal(parse('Clase práctica mañana').date,'2026-09-29');assert.equal(parse('mejor por la mañana',{active:true}).date,null);assert.equal(parse('mejor por la mañana',{active:true}).period,'morning');
 const p=parse('Quiero una clase práctica el viernes después de las tres');assert.equal(p.clarification,'time');assert.equal(p.after,180);assert.equal(p.date,'2026-10-02');
 assert.equal(parse('Clase práctica el viernes después de las 15:00').after,900);assert.equal(parse('el viernes no, mejor el lunes'),null);
});
test('agenda recuerda día/servicio, ofrece tres horas reales y revalida la segunda sin reservar',async()=>{
 const state={};let r=await resolve(parse('Quiero una clase práctica el viernes por la tarde'),state);assert.equal(r.agenda.options.length,3);assert.equal(r.agenda.options[0].slot,slots[3]);
 r=await resolve(parse('mejor por la mañana',state),state);assert.equal(state.date,'2026-10-02');assert.equal(state.serviceId,'practice');assert.equal(r.agenda.options[0].slot,slots[0]);
 r=await resolve(parse('la segunda',state),state);assert.equal(r.agenda.selectedSlot,slots[1]);assert.match(r.text,/Todavía no está reservada/);
 r=await resolve(parse('la segunda',state),state,async()=>({slots:slots.filter(s=>s!==slots[1])}));assert.ok(!r.agenda);assert.match(r.text,/ya no está disponible/);assert.deepEqual(state.options,[]);
});
test('hora ambigua conserva el umbral al aclarar tarde; no confunde cambiar de día con resolver hora',async()=>{
 const state={};await resolve(parse('Clase práctica el viernes después de las tres'),state);const pending=await resolve({...empty,date:'2026-10-02'},state);assert.ok(!pending.agenda);
 const r=await resolve(parse('por la tarde',state),state);assert.equal(state.after,900);assert.equal(r.agenda.options[0].slot,slots[3]);
});
test('servicio no reservable, fecha pasada, sin cupos, error y memoria aislada',async()=>{
 assert.match((await resolve({...empty,serviceId:'course',date:'2026-10-02'},{})).text,/no admite/);
 assert.match((await resolve({...empty,serviceId:'practice',date:'2026-09-27'},{})).text,/ya pasó/);
 assert.match((await resolve({...empty,serviceId:'practice',date:'2026-10-02'},{},async()=>({slots:[]}))).text,/No encontré/);
 const state={options:slots};const r=await resolve({...empty,serviceId:'practice',date:'2026-10-02'},state,async()=>{throw Error('private token');});assert.doesNotMatch(r.text,/private/);assert.deepEqual(state.options,[]);
 assert.match((await resolve({...empty,selection:2},{})).text,/Qué servicio/);
 await resolve({...empty,status:'reset'},state);assert.deepEqual(state,{});
});
test('esquema rechaza IDs/fechas/horas/opciones falsos; no acepta campos arbitrarios',()=>{
 for(const patch of [{serviceId:'unknown'},{date:'2026-02-30'},{after:1440},{selection:4},{extra:true}])assert.throws(()=>validateAgenda({...empty,...patch},services));
 const request=buildAgendaRequest({model:'test',message:'algo el viernes',services,center,state:{},now});assert.equal(request.store,false);assert.equal(request.text.format.strict,true);assert.equal(request.text.format.name,'booking_preferences');
 assert.equal(agendaCandidate('cuánto cuesta la clase',{active:true}),false);assert.equal(agendaCandidate('consultar mi cita',{active:true}),false);assert.equal(agendaCandidate('la segunda',{active:true}),true);
});

test('fecha y hora exacta abre datos con disponibilidad real; no cambia una hora ocupada',async()=>{
 const p=parse('¿Hay disponibilidad el viernes a las 9 am?');assert.equal(p.at,540);assert.equal(p.date,'2026-10-02');
 const result=await resolve(p,{});assert.equal(result.agenda.selectedSlot,slots[0]);assert.match(result.text,/Todavía no está reservada/);
 assert.ok(!(await resolve(p,{},async()=>({slots:slots.slice(1)}))).agenda);
 assert.equal(parse('Clase práctica el 2 de octubre de 2026 a las 3 pm').at,900);
 assert.equal(parse('Clase práctica el viernes a las nueve de la mañana').at,540);
 assert.equal(parse('Clase práctica el viernes a las 15:30').at,930);
 assert.equal(agendaCandidate('¿Hay disponibilidad el 2 de octubre a las 9 am?',{}),true);
 assert.equal(agendaCandidate('a las 9 am',{active:true}),true);
});
test('hora exacta ambigua pide precisión; al aclarar tarde conserva fecha y hora',async()=>{
 const state={};const p=parse('Clase práctica el viernes a las tres');assert.equal(p.clarification,'time');await resolve(p,state);
 const r=await resolve(parse('por la tarde',state),state);assert.equal(r.agenda.selectedSlot,slots[3]);assert.equal(state.at,900);
 assert.throws(()=>validateAgenda({...empty,at:1440},services));
});
test('fecha sola usa únicamente el servicio reservable; con varios pregunta cuál',async()=>{
 assert.equal((await resolve(parse('¿Hay disponibilidad el viernes?'),{})).agenda.options.length,3);
 const multiple={...center,booking:{serviceIds:['practice','course']}};
 const r=await resolveAgenda({plan:parse('¿Hay disponibilidad el viernes?'),state:{},services,center:multiple,availability:()=>{throw Error('No consultar sin elegir servicio');},now});assert.match(r.text,/Qué servicio/);
});

const teacherCenter={...center,booking:{...center.booking,instructors:[{id:'hector',name:'Héctor',serviceIds:['practice']},{id:'dario',name:'Darío',serviceIds:['practice']}]}};
const teacherParse=(message,state={})=>parseAgenda(message,{services,center:teacherCenter,state,now});
const teacherData={slots,schedule:slots.map((slot,i)=>({slot,available:true,instructorIds:i===0?['dario']:['hector','dario']})),instructors:teacherCenter.booking.instructors};
const teacherResolve=(plan,state,availability=async()=>teacherData,c=teacherCenter)=>resolveAgenda({plan,state,services,center:c,availability,now});

test('profesor hablado filtra su calendario; no ofrece el cupo de otro profesor',async()=>{
 const state={};assert.equal(agendaCandidate('Con Héctor el viernes',{},teacherCenter),true);
 const p=teacherParse('Con Héctor el viernes a las 9 am');assert.equal(p.instructorId,'hector');
 assert.ok(!(await teacherResolve(p,state)).agenda);
 const r=await teacherResolve(teacherParse('mejor con Darío',state),state);
 assert.equal(r.agenda.selectedSlot,slots[0]);assert.equal(r.agenda.instructorId,'dario');assert.equal(state.at,540);assert.equal(state.date,'2026-10-02');
 assert.match(r.text,/Darío/);assert.match(r.text,/Todavía no está reservada/);
});

test('cambiar día conserva hora y profesor; cambiar franja borra hora exacta',async()=>{
 const state={};await teacherResolve(teacherParse('Con Darío el viernes a las 9 am'),state);
 await teacherResolve(teacherParse('mejor el lunes a la misma hora',state),state);
 assert.equal(state.date,'2026-09-28');assert.equal(state.at,540);assert.equal(state.instructorId,'dario');
 await teacherResolve(teacherParse('mejor por la tarde',state),state);assert.equal(state.at,null);assert.equal(state.period,'afternoon');
 assert.equal(teacherParse('el lunes a la misma hora').clarification,'time');
 assert.equal(teacherParse('No quiero el lunes, mejor el martes'),null);
});

test('elección ordinal recuerda hora; profesor ocupado al elegir invalida la opción',async()=>{
 const state={};await teacherResolve(teacherParse('Con Héctor el viernes por la mañana'),state);
 assert.equal(state.options[0],slots[1]);
 const r=await teacherResolve(teacherParse('la segunda',state),state);assert.equal(r.agenda.selectedSlot,slots[2]);assert.equal(state.at,660);
 const busy={...teacherData,schedule:teacherData.schedule.map(s=>({...s,instructorIds:['dario']}))};
 assert.ok(!(await teacherResolve({...empty,selection:2},state,async()=>busy)).agenda);assert.deepEqual(state.options,[]);
});

test('no sustituye profesores desconocidos, pausados ni no habilitados; cualquiera limpia preferencia',async()=>{
 assert.throws(()=>validateAgenda({...empty,instructorId:'otro'},services,teacherCenter));
 assert.throws(()=>validateAgenda({...empty,instructorId:'hector',anyInstructor:true},services,teacherCenter));
 const state={serviceId:'practice',date:'2026-10-02',at:540,instructorId:'hector'};
 const paused={...teacherCenter,booking:{...teacherCenter.booking,instructors:teacherCenter.booking.instructors.filter(i=>i.id!=='hector')}};
 assert.ok(!(await teacherResolve(empty,state,async()=>{throw Error('No debe consultar');},paused)).agenda);
 assert.ok(!(await teacherResolve({...empty,clarification:'instructor'},state)).agenda);
 assert.ok(!(await teacherResolve({...empty,date:'2026-10-02'},state)).agenda);
 const r=await teacherResolve(teacherParse('cualquier profesor',state),state);assert.equal(r.agenda.instructorId,null);assert.equal(r.agenda.selectedSlot,slots[0]);
 const request=buildAgendaRequest({model:'test',message:'with Dario tomorrow',services,center:teacherCenter,state,history:[{user:'con Héctor',assistant:'¿Para qué día?'}],now});
 assert.ok(request.text.format.schema.properties.instructorId.enum.includes('dario'));assert.ok(!JSON.stringify(request).includes('calendarId'));
 assert.equal(JSON.parse(request.input[0].content).history.length,1);
});

test('API conecta intención indirecta con agenda, transmite profesor y comparte cuotas sin crear citas',async t=>{
 const f=await instructorsFixture({now:Date.now}),calls=[];
 const settings=f.repo.getCenterSettings();settings.configuration.ai.sessionCalls=2;f.repo.saveConfiguration(settings.revision,{profile:settings.profile,configuration:settings.configuration});
 const available=await f.bookings.availability('road-test'),slot=available.slots[0],teacher=f.repo.bookingSettings().instructors[0];
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'America/New_York'}).formatToParts(new Date(slot)).map(p=>[p.type,p.value]));
 const date=parts.year+'-'+parts.month+'-'+parts.day,at=Number(parts.hour)*60+Number(parts.minute);
 const ai={async interpret({preparedRequest}){calls.push(preparedRequest);return {usage:{input_tokens:10,output_tokens:10},interpretation:preparedRequest.text.format.name==='school_intent'?{status:'school',intent:'booking',serviceId:'road-test',facts:[],clarification:null}:{...empty,at,date,serviceId:'road-test',instructorId:teacher.id,anyInstructor:false}};},reply(){throw Error('No debe redactar disponibilidad con IA');}};
 const app=createApp({repository:f.repo,calendar:f.service,ai,config:{provider:'openai',model:'test',center:schoolCenter,sessionTtlMs:300000,aiLimits:{sessionCalls:2,dailyCalls:10}}});
 app.listen(0,'127.0.0.1');await once(app,'listening');t.after(async()=>{await new Promise(r=>app.close(r));f.close();});
 const base='http://127.0.0.1:'+app.address().port;
 const req=async(path,body,token)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});assert.ok(r.ok);return r.json();};
 const token=(await req('/api/sessions',{consent:true})).token;
 const r=await req('/api/chat',{message:'Me gustaría apartar un espacio para practicar',channel:'text'},token);
 assert.equal(r.agenda.selectedSlot,slot);assert.equal(r.agenda.instructorId,teacher.id);assert.equal(calls.length,2);assert.equal(f.events.size,0);
 assert.doesNotMatch(JSON.stringify(calls),/@example\.test|calendarId/);
 const capped=await req('/api/chat',{message:'Con otro instructor pero al mismo rato',channel:'voice'},token);assert.equal(capped.reason,'session_limit');assert.equal(calls.length,2);assert.equal(f.events.size,0);
});
