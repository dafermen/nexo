/**
 * NEXO · GUÍA DEL MÓDULO: server/booking-transfers.js
 * Mueve eventos propios mediante events.move, conservando hora/código y sin copiar/eliminar citas.
 * Entrada: origen, destino, ID idempotente, motivo y actor autenticado. Salida: vista previa o estado.
 * Ante incertidumbre nunca repite move: comprueba ambos calendarios y mantiene bloqueos durables.
 */
import {HttpError} from './errors.js';
import {eventBusy} from './booking.js';
import {cancellationReason} from './admin-agenda.js';
const overlaps=(row,b)=>Date.parse(row.slot)<b.end&&Date.parse(row.end)>b.start;
const active=e=>e&&e.status!=='cancelled';
export class BookingTransfers{
 constructor({repository,calendar,bookings,now=Date.now}){this.repo=repository;this.calendar=calendar;this.bookings=bookings;this.now=now;}
 target(id){const t=this.repo.bookingSettings().instructors?.find(i=>i.id===id&&i.active);if(!t||this.repo.bookingSettings().assignment!=='instructors')throw new HttpError(409,'Seleccione un profesor activo en la agenda por profesores.');return t;}
 validate(sourceId,targetId){if(sourceId!=='unassigned'&&!/^[a-f0-9]{24}$/.test(sourceId||''))throw new HttpError(400,'Seleccione el profesor de origen.');if(!/^[a-f0-9]{24}$/.test(targetId||'')||targetId===sourceId)throw new HttpError(400,'Seleccione un profesor de destino diferente.');}
 localReason(row,target){if(row.status!=='reserved')return 'La cita aún no está confirmada.';if(Date.parse(row.slot)<=this.now())return 'La cita ya comenzó.';if(this.repo.pendingBookingTransfer(row.id))return 'Tiene un traslado por verificar.';if(row.calendarId===target.calendarId)return 'Ya pertenece a ese calendario.';if(!target.serviceIds.includes(row.serviceId))return 'El profesor no imparte ese servicio.';return '';}
 async busy(target,start,end){const calendar=await this.calendar.calendar(target.calendarId);if(!calendar.writable)throw new HttpError(403,'El calendario de destino no permite editar citas.');const events=await this.calendar.bookingEvents(target.calendarId,start,end);return [...events.map(e=>eventBusy(e,calendar.timeZone)).filter(Boolean),...this.repo.bookingBlocks(target.calendarId).map(b=>({start:Date.parse(b.slot),end:Date.parse(b.end)}))];}
 async preview({sourceId,targetId}){return this.calendar.exclusive(async()=>{
  this.validate(sourceId,targetId);const target=this.target(targetId),rows=this.repo.futureInstructorBookings(sourceId,new Date(this.now()).toISOString());if(rows.length>100)throw new HttpError(400,'Hay más de 100 citas futuras. Requiere una reasignación asistida por el administrador técnico.');
  const busy=rows.length?await this.busy(target,rows[0].slot,rows.reduce((max,r)=>r.end>max?r.end:max,rows[0].end)):[];
  const items=rows.map(row=>{const reason=this.localReason(row,target)||(busy.some(b=>overlaps(row,b))?'El profesor de destino está ocupado.':'');if(!reason)busy.push({start:Date.parse(row.slot),end:Date.parse(row.end)});return {id:row.id,code:row.code,customerName:row.customerName,serviceName:row.serviceName,slot:row.slot,timezone:row.timezone,sourceName:row.instructorName||'Agenda única',eligible:!reason,reason};});
  return {items,sourceId,targetId,targetName:target.name,revision:this.repo.bookingSettings().revision};
 });}
 outcome(t){return {id:t.id,bookingId:t.bookingId,status:t.status,sourceName:t.sourceName,targetName:t.targetName,createdAt:t.createdAt,updatedAt:t.updatedAt||t.createdAt};}
 async reconcileRecord(t){if(t.status!=='pending')return this.outcome(t);const row=this.repo.calendarBooking(t.bookingId);
  // Una falta de permisos NO equivale a ausencia. request solo convierte 404/410 en null.
  const [source,found]=await Promise.all([this.calendar.request(this.bookings.path({...row,calendarId:t.sourceCalendarId},true),{allowMissing:true}),this.calendar.request(this.bookings.path({...row,calendarId:t.calendarId},true),{allowMissing:true})]);
  if(active(found)&&!active(source)){
   let destination=found;const marker=destination.extendedProperties?.private?.nexoBooking;
   // Google elimina propiedades privadas al cambiar organizador (comprobado con evento técnico).
   // ID + iCalUID guardado antes de mover + intervalo identifican la cita antes de restaurar marca.
   if(destination.id!==row.id.replaceAll('-','')||!t.eventUid||destination.iCalUID!==t.eventUid||Date.parse(destination.start?.dateTime)!==Date.parse(row.slot)||Date.parse(destination.end?.dateTime)!==Date.parse(row.end)||destination.attendees?.length||(marker&&marker!==row.marker))throw new HttpError(409,'El evento de destino cambió; el traslado requiere revisión.');
   if(!marker){if(!destination.etag)throw new HttpError(409,'Falta la versión del evento de destino.');destination=await this.calendar.request(this.bookings.path({...row,calendarId:t.calendarId},true)+'?sendUpdates=none',{method:'PATCH',ifMatch:destination.etag,body:{extendedProperties:{private:{...destination.extendedProperties?.private,nexoBooking:row.marker}}}});}
   this.bookings.match(row,destination);const finished=this.repo.finishBookingTransfer(t.id,'moved');this.repo.recordBookingSync(row.id,'reserved');return this.outcome(finished);
  }
  // Incluso source presente/destino ausente puede ser una respuesta perdida aún en curso.
  return this.outcome(t);
 }
 async reconcile(id){return this.calendar.exclusive(async()=>{const t=this.repo.bookingTransfer(id);if(!t)throw new HttpError(404,'Traslado no encontrado.');return this.reconcileRecord(t);});}
 async move({id,bookingId,sourceId,targetId,reason},actor){return this.calendar.exclusive(async()=>{
  this.validate(sourceId,targetId);if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(id||'')||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(bookingId||''))throw new HttpError(400,'Identificador de traslado inválido.');reason=cancellationReason({reason});
  const prior=this.repo.bookingTransfer(id);if(prior){if(prior.bookingId!==bookingId||prior.targetId!==targetId||prior.sourceId!==sourceId)throw new HttpError(409,'Esta solicitud corresponde a otro traslado.');return this.reconcileRecord(prior);}
  const row=this.repo.calendarBooking(bookingId);if(!row||(row.instructorId||'unassigned')!==sourceId)throw new HttpError(409,'El profesor de la cita cambió. Actualice la vista previa.');const target=this.target(targetId),why=this.localReason(row,target);if(why)throw new HttpError(409,why);
  const revision=this.repo.bookingSettings().revision,busy=await this.busy(target,row.slot,row.end);if(busy.some(b=>overlaps(row,b)))throw new HttpError(409,'El profesor de destino está ocupado.');
  const sourceCalendar=await this.calendar.calendar(row.calendarId);if(!sourceCalendar.writable)throw new HttpError(403,'El calendario de origen no permite mover citas.');
  const event=await this.calendar.request(this.bookings.path(row,true));this.bookings.match(row,event);
  if(!event.etag||!event.iCalUID||event.status==='cancelled'||(event.eventType&&event.eventType!=='default')||event.recurringEventId||event.recurrence||event.attendees?.length||event.organizer?.self===false)throw new HttpError(409,'El evento cambió o no permite traslado automático. Revíselo con el administrador.');
  if(this.repo.bookingSettings().revision!==revision)throw new HttpError(409,'La configuración cambió. Actualice la vista previa.');
  const t=this.repo.beginBookingTransfer({id,bookingId,sourceId,sourceCalendarId:row.calendarId,sourceName:row.instructorName||'Agenda única',targetId,calendarId:target.calendarId,targetName:target.name,eventUid:event.iCalUID,slot:row.slot,end:row.end,actor,reason,createdAt:new Date(this.now()).toISOString()});
  try{
   await this.calendar.request(this.bookings.path(row,true)+'/move?'+new URLSearchParams({destination:target.calendarId,sendUpdates:'none'}),{method:'POST',ifMatch:event.etag});
  }catch(e){
   // Rechazos definitivos antes de mover. 5xx, timeout o 404 requieren reconciliación.
   if([400,403,412,429].includes(e.googleStatus))return this.outcome(this.repo.finishBookingTransfer(id,'failed'));
   return this.outcome(t);
  }
  try{return await this.reconcileRecord(t);}catch{return this.outcome(t);}
 });}
}
