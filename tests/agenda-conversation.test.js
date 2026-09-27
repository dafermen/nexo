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
