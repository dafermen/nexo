/**
 * NEXO · GUÍA DEL MÓDULO: tests/admin-agenda.test.js
 * Verifica filtros reales de SQLite, permisos, auditoría y fallos de cancelación.
 * Usa calendario/correo simulados; no modifica reservas reales ni consume proveedores.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {createRepository} from '../server/db.js';
import {agendaFilters,cancellationReason} from '../server/admin-agenda.js';
import {calendarFixture} from './calendar-fixture.js';
import {BookingService} from '../server/booking.js';
import {createApp} from '../server/app.js';

const record=(i=0)=>({id:randomUUID(),requestId:randomUUID(),sessionHash:'private-session',calendarId:'private-calendar',marker:'private-marker',slot:new Date(Date.UTC(2026,8,28,12)+i*3600000).toISOString(),end:new Date(Date.UTC(2026,8,28,13)+i*3600000).toISOString(),customerName:'Alumno '+i,email:'person'+i+'@example.test',serviceId:'practice',serviceName:'Clase práctica',priceCents:null,currency:'USD',timezone:'America/New_York',createdAt:'2026-09-26T12:00:00.000Z'});
test('agenda pagina más de 200 citas, filtra sin SQL injection y no expone secretos',t=>{
 const repo=createRepository(':memory:');t.after(()=>repo.close());let last;
 for(let i=0;i<215;i++){last=repo.claimBooking(record(i));repo.setBookingStatus(last.id,i%2?'reserved':'cancelled');}
 const all=repo.agendaList();assert.equal(all.total,215);assert.equal(all.items.length,50);
 assert.equal(repo.agendaList({offset:200}).items.length,15);
 assert.equal(repo.agendaList({q:'person214@example.test'}).total,1);
 assert.equal(repo.agendaList({q:last.code.toLowerCase()}).total,1);
 assert.equal(repo.agendaList({q:"' OR 1=1 --"}).total,0);
 assert.equal(repo.agendaList({status:'reserved'}).total,107);
 assert.equal(repo.agendaList({serviceId:'unknown'}).total,0);
 assert.doesNotMatch(JSON.stringify(repo.agendaDetail(last.id)),/private-session|private-marker|private-calendar|sessionHash|requestId|marker|calendarId/);
 assert.throws(()=>repo.agendaDetail(randomUUID()),/no encontrada/);
});
test('rangos por día respetan DST y validan fechas/motivos',()=>{
 const filters=(s)=>agendaFilters(new URLSearchParams(s),'America/New_York');
 const spring=filters('from=2026-03-08&to=2026-03-08');assert.equal(Date.parse(spring.end)-Date.parse(spring.start),23*3600000);
 const fall=filters('from=2026-11-01&to=2026-11-01');assert.equal(Date.parse(fall.end)-Date.parse(fall.start),25*3600000);
 for(const s of ['from=2026-02-30&to=2026-03-01','from=2026-09-29','offset=-1','offset=NaN','status=deleted','from=2026-01-01&to=2028-01-01'])assert.throws(()=>filters(s));
 for(const reason of [null,'','x','a'.repeat(301),'error\nno pago'])assert.throws(()=>cancellationReason({reason}));
 assert.equal(cancellationReason({reason:' Falta de pago '}),'Falta de pago');
});
test('profesor filtra antes de paginar y conserva historial, nombres iguales y agenda única',t=>{
 const repo=createRepository(':memory:');t.after(()=>repo.close());const one='a'.repeat(24),two='b'.repeat(24);
 for(let i=0;i<105;i++)repo.claimBooking({...record(i),instructorId:i%2?one:two,instructorName:'Ana Pérez'});
 repo.claimBooking(record(106));
 assert.equal(repo.agendaList({instructorId:one}).total,52);assert.equal(repo.agendaList({instructorId:one,offset:50}).items.length,2);
 assert.equal(repo.agendaList({instructorId:two}).total,53);assert.equal(repo.agendaList({instructorId:'unassigned'}).total,1);
 assert.equal(repo.agendaList({instructorId:"' OR 1=1 --"}).total,0);
 let options=repo.agendaInstructors([{id:one,name:'Ana actual',active:false}]);assert.equal(options.find(i=>i.id===one).state,'paused');assert.equal(options.find(i=>i.id===one).name,'Ana actual');assert.equal(options.find(i=>i.id===two).state,'historical');assert.doesNotMatch(JSON.stringify(options),/private-calendar|marker|session/);
 assert.equal(repo.agendaInstructors().length,2);assert.equal(repo.agendaList({instructorId:one}).items[0].instructorName,'Ana Pérez');
 const filter=s=>agendaFilters(new URLSearchParams({instructorId:s}),'America/New_York');assert.equal(filter(one).instructorId,one);assert.equal(filter('unassigned').instructorId,'unassigned');assert.throws(()=>filter('bad'));assert.throws(()=>filter("' OR 1=1 --"));
});
async function fixture(t){
 const f=calendarFixture();await f.authorize();await f.service.select(f.calendars[1].id);
 const bookings=new BookingService({repository:f.repo,calendar:f.service});
 const row=f.repo.claimBooking({...record(),calendarId:f.calendars[1].id});f.repo.setBookingStatus(row.id,'reserved');
 const key=row.calendarId+'/'+row.id.replaceAll('-','');f.events.set(key,{id:row.id.replaceAll('-',''),start:{dateTime:row.slot},end:{dateTime:row.end},extendedProperties:{private:{nexoBooking:row.marker}}});
 t.after(()=>{f.service.close();f.repo.close();});return {...f,bookings,row,key};
}
test('cancelación registra motivo/actor, confirma Google y no repite al reintentar',async t=>{
 const f=await fixture(t);
 await f.bookings.cancel(f.row.id,{reason:'Falta de pago',actor:'admin@example.test'});
 await f.bookings.cancel(f.row.id,{reason:'Duplicado',actor:'otro@example.test'});
 const detail=f.repo.agendaDetail(f.row.id);assert.equal(detail.status,'cancelled');assert.equal(detail.sync.state,'cancelled');assert.equal(detail.cancellations.length,1);assert.equal(detail.cancellations[0].actor,'admin@example.test');assert.equal(detail.cancellations[0].reason,'Falta de pago');assert.equal(detail.cancellations[0].outcome,'confirmed');assert.equal(f.events.size,0);
});
test('fallo de Google conserva horario y auditoría; verificación reconcilia DELETE incierto',async t=>{
 const f=await fixture(t);f.flags.deleteFails=true;
 await assert.rejects(f.bookings.cancel(f.row.id,{reason:'Error de prueba',actor:'admin'}));
 assert.equal(f.repo.agendaDetail(f.row.id).sync.state,'error');assert.equal(f.repo.agendaDetail(f.row.id).status,'reserved');assert.equal(f.repo.bookingBlocks(f.row.calendarId).length,1);assert.equal(f.repo.agendaDetail(f.row.id).cancellations[0].outcome,'uncertain');
 // Simula que Google borró el evento pero la respuesta se perdió.
 f.events.delete(f.key);await f.bookings.verify(f.row.id);
 assert.equal(f.repo.agendaDetail(f.row.id).status,'cancelled');assert.equal(f.repo.agendaDetail(f.row.id).cancellations[0].outcome,'confirmed');
 assert.equal(f.repo.bookingBlocks(f.row.calendarId).length,0);
});
test('eventos modificados fuera de Nexo no se eliminan',async t=>{
 const f=await fixture(t);f.events.get(f.key).extendedProperties.private.nexoBooking='another-owner';
 await assert.rejects(f.bookings.cancel(f.row.id,{reason:'Error',actor:'admin'}),/modificado/);
 assert.equal(f.events.size,1);assert.equal(f.repo.agendaDetail(f.row.id).sync.state,'error');assert.equal(f.calls.some(c=>c.method==='DELETE'),false);
});
test('cambio concurrente en Google usa If-Match y mantiene la cita ante 412',async t=>{
 const f=await fixture(t);f.flags.changedBeforeDelete=true;
 await assert.rejects(f.bookings.cancel(f.row.id,{reason:'Error',actor:'admin'}),/cambió en Google/);
 assert.equal(f.calls.find(c=>c.method==='DELETE').headers['If-Match'],'"fixture-v1"');
 assert.equal(f.events.size,1);assert.equal(f.repo.agendaDetail(f.row.id).status,'reserved');assert.equal(f.repo.agendaDetail(f.row.id).sync.state,'error');
});
test('API privada exige administrador/origen y motivo; identidad no viene del formulario',async t=>{
 const f=await fixture(t),admin='test-admin-agenda-long-secret';
 const app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',adminToken:admin},ai:{reply:async()=>({text:'test'})},localTts:{status:()=>({available:false}),close(){},stop(){}}});
 app.listen(0,'127.0.0.1');await once(app,'listening');t.after(()=>new Promise(resolve=>app.close(resolve)));const base='http://127.0.0.1:'+app.address().port;
 const call=(path,method='GET',body,authorized=true,origin=base)=>fetch(base+path,{method,headers:{...(authorized?{Authorization:'Bearer '+admin}:{}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 for(const path of ['/api/admin/agenda','/api/admin/agenda/'+f.row.id,'/api/admin/agenda-availability?serviceId=practice'])assert.equal((await call(path,'GET',null,false)).status,401);
 assert.equal((await call('/api/admin/agenda?status=bad')).status,400);
 const path='/api/admin/appointments/'+f.row.id;
 assert.equal((await call(path,'PATCH',{status:'cancelled'})).status,400);
 assert.equal((await call(path,'PATCH',{status:'cancelled',reason:'Error'},true,'https://evil.example')).status,403);
 assert.equal((await call(path,'PATCH',{status:'cancelled',reason:'Error al crear la reserva',actor:'forged'})).status,200);
 const detail=await (await call('/api/admin/agenda/'+f.row.id)).json();assert.equal(detail.cancellations[0].actor,'Acceso local por clave');assert.equal(detail.cancellations[0].outcome,'confirmed');
 assert.doesNotMatch(JSON.stringify(detail),/private-marker|private-session/);
});
