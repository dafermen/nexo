/**
 * NEXO · GUÍA DEL MÓDULO: tests/booking-transfers.test.js
 * Movimientos simulados con SQLite real: conflictos, propiedad, reintentos, incertidumbre y API.
 * No modifica Google ni envía correos. Los dos bloqueos deben sobrevivir hasta confirmación.
 */
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {once} from 'node:events';
import {instructorsFixture} from './instructors-fixture.js';import {BookingTransfers} from '../server/booking-transfers.js';import {createApp} from '../server/app.js';import {schoolCenter} from '../server/center.js';
async function fixture(t){const f=await instructorsFixture();t.after(()=>f.close());const available=await f.bookings.availability('road-test'),[source,target]=available.instructors,slot=available.slots[0],saved=await f.bookings.reserve(f.input(slot,source.id));const transfers=new BookingTransfers({repository:f.repo,calendar:f.service,bookings:f.bookings,now:()=>Date.parse('2026-09-28T11:00:00Z')});return {...f,available,source,target,slot,saved,transfers,input:{id:randomUUID(),bookingId:saved.id,sourceId:source.id,targetId:target.id,reason:'Ausencia del profesor'}};}
test('mover conserva código/hora, verifica calendario destino y reintento no duplica ni notifica',async t=>{
 const f=await fixture(t),result=await f.transfers.move(f.input,'admin@example.test');assert.equal(result.status,'moved');const row=f.repo.calendarBooking(f.saved.id);assert.equal(row.calendarId,f.teachers[1].id);assert.equal(row.code,f.saved.code);assert.equal(row.slot,f.slot);assert.equal(row.instructorName,f.target.name);assert.equal(f.events.size,1);assert.equal(f.repo.bookingBlocks(f.teachers[0].id).length,0);
 assert.equal((await f.transfers.move(f.input,'admin')).status,'moved');assert.equal(f.calls.filter(c=>c.path.endsWith('/move')).length,1);assert.ok(f.calls.find(c=>c.path.endsWith('/move')).url.includes('sendUpdates=none'));assert.equal(f.calls.find(c=>c.path.endsWith('/move')).body,null);
 const detail=f.repo.agendaDetail(row.id);assert.equal(detail.transfers[0].actor,'admin@example.test');assert.doesNotMatch(JSON.stringify(detail),/calendarId|marker|sourceCalendar/);assert.equal((await f.bookings.verify(row.id)).status,'reserved');await f.bookings.cancel(row.id);assert.equal(f.events.size,0);
});
test('ocupado y servicio incompatible permanecen en origen; pausa no elimina citas',async t=>{
 const f=await fixture(t),other=await f.bookings.reserve({requestId:randomUUID(),sessionHash:'other',serviceId:'road-test',slot:f.slot,instructorId:f.target.id,customerName:'Otro alumno',email:'other@example.test',priceCents:null});
 let preview=await f.transfers.preview(f.input);assert.equal(preview.items[0].eligible,false);assert.match(preview.items[0].reason,/ocupado/);await assert.rejects(f.transfers.move(f.input,'admin'),/ocupado/);await f.bookings.cancel(other.id);
 await f.bookings.configure({...f.repo.bookingSettings(),instructors:f.repo.bookingSettings().instructors.map(i=>({...i,active:i.id!==f.source.id,serviceIds:i.id===f.target.id?['cinco-horas']:i.serviceIds}))});
 preview=await f.transfers.preview(f.input);assert.equal(preview.items[0].eligible,false);assert.match(preview.items[0].reason,/imparte/);assert.equal(f.repo.calendarBooking(f.saved.id).status,'reserved');assert.equal(f.calls.some(c=>c.path.endsWith('/move')),false);
});
test('respuesta perdida protege ambos calendarios y verificar resuelve sin repetir move',async t=>{
 const f=await fixture(t);f.flags.moveUncertain=true;assert.equal((await f.transfers.move(f.input,'admin')).status,'pending');for(const c of f.teachers.slice(0,2))assert.equal(f.repo.bookingBlocks(c.id).length,1);
 await assert.rejects(f.bookings.cancel(f.saved.id),/traslado/);await assert.rejects(f.bookings.verify(f.saved.id),/traslado/);await assert.rejects(f.bookings.sendConfirmation(f.saved.id),/traslado/);
 await assert.rejects(f.bookings.reserve(f.repo.calendarBooking(f.saved.id)),/traslado/);
 assert.throws(()=>f.repo.claimBooking({...f.repo.calendarBooking(f.saved.id),id:randomUUID(),requestId:randomUUID(),calendarId:f.teachers[1].id}),/ocuparse/);
 const restarted=new BookingTransfers({repository:f.repo,calendar:f.service,bookings:f.bookings});assert.equal((await restarted.reconcile(f.input.id)).status,'moved');assert.equal(f.calls.filter(c=>c.path.endsWith('/move')).length,1);assert.equal(f.repo.bookingBlocks(f.teachers[0].id).length,0);
});
test('red antes de mover mantiene pending sin asumir fracaso ni volver a enviar',async t=>{
 const f=await fixture(t);f.flags.moveNetworkBefore=true;assert.equal((await f.transfers.move(f.input,'admin')).status,'pending');f.flags.moveNetworkBefore=false;assert.equal((await f.transfers.move(f.input,'admin')).status,'pending');assert.equal(f.calls.filter(c=>c.path.endsWith('/move')).length,1);assert.equal(f.repo.calendarBooking(f.saved.id).instructorId,f.source.id);
});
test('rechazo definitivo de Google libera solo destino y queda auditado',async t=>{
 const f=await fixture(t);f.flags.moveRejected=412;assert.equal((await f.transfers.move(f.input,'admin')).status,'failed');assert.equal(f.repo.bookingBlocks(f.teachers[1].id).length,0);assert.equal(f.repo.bookingBlocks(f.teachers[0].id).length,1);assert.equal((await f.transfers.move(f.input,'admin')).status,'failed');
});
test('restauración de marca falla: conserva bloqueos; iCalUID alterado jamás se adopta',async t=>{
 const f=await fixture(t);f.flags.patchFails=true;assert.equal((await f.transfers.move(f.input,'admin')).status,'pending');const key=f.teachers[1].id+'/'+f.saved.id.replaceAll('-',''),event=f.events.get(key);assert.equal(event.extendedProperties?.private?.nexoBooking,undefined);f.flags.patchFails=false;const uid=event.iCalUID;event.iCalUID='another-event';await assert.rejects(f.transfers.reconcile(f.input.id),/destino cambió/);assert.equal(f.repo.pendingBookingTransfer(f.saved.id).status,'pending');event.iCalUID=uid;assert.equal((await f.transfers.reconcile(f.input.id)).status,'moved');assert.equal(f.calls.filter(c=>c.path.endsWith('/move')).length,1);
});
test('traslado de agenda única conserva código y solicitudes simultáneas no pisan destino',async t=>{
 const f=await fixture(t);await f.bookings.configure({...f.repo.bookingSettings(),assignment:'single'});const a=await f.bookings.availability('road-test'),old=await f.bookings.reserve({requestId:randomUUID(),sessionHash:'legacy',serviceId:'road-test',slot:a.slots[1],customerName:'Legacy',email:'legacy@example.test',priceCents:null});await f.bookings.configure({...f.repo.bookingSettings(),assignment:'instructors'});
 const input={id:randomUUID(),bookingId:old.id,sourceId:'unassigned',targetId:f.target.id,reason:'Asignar profesor'};const results=await Promise.allSettled([f.transfers.move(input,'admin'),f.transfers.move({...input,id:randomUUID()},'admin')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.repo.calendarBooking(old.id).code,old.code);assert.equal(f.repo.calendarBooking(old.id).instructorId,f.target.id);
});
test('marcador alterado, invitados, falta de permisos y profesor inválido no envían move',async t=>{
 const f=await fixture(t),key=f.teachers[0].id+'/'+f.saved.id.replaceAll('-',''),event=f.events.get(key);event.attendees=[{email:'guest@example.test'}];await assert.rejects(f.transfers.move(f.input,'admin'),/automático/);delete event.attendees;event.extendedProperties.private.nexoBooking='other';await assert.rejects(f.transfers.move(f.input,'admin'),/modificado/);assert.equal(f.calls.some(c=>c.path.endsWith('/move')),false);assert.equal(f.repo.bookingTransfer(f.input.id),null);
});
test('API exige sesión administrativa, origen y actor confiable para traslado',async t=>{
 // Mantener el reloj de la API alineado con los datos de prueba, sin depender del día real.
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-09-28T11:00:00Z')});
 const f=await fixture(t),token='transfer-test-admin-token',app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,adminToken:token},ai:{reply:async()=>{throw Error('No AI');}},localTts:{status:()=>({available:false}),stop(){},close(){}}});app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
 const call=(path,input,auth=true,origin=base)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(auth?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(input)});
 try{assert.equal((await call('/api/admin/transfers/preview',f.input,false)).status,401);assert.equal((await call('/api/admin/transfers',f.input,true,'https://evil.test')).status,403);const p=await (await call('/api/admin/transfers/preview',f.input)).json();assert.equal(p.items[0].eligible,true);const r=await (await call('/api/admin/transfers',{...f.input,actor:'forged'})).json();assert.equal(r.status,'moved');assert.equal(f.repo.bookingTransfer(f.input.id).actor,'Acceso local por clave');assert.equal((await call('/api/admin/transfers/'+f.input.id+'/verify',{})).status,200);}finally{await new Promise(r=>app.close(r));await app.closeAdminAuth();}
});
