/**
 * NEXO · GUÍA DEL MÓDULO: server/booking.js
 * Aplicar reglas de disponibilidad y confirmar reservas contra Google.
 * Entrada: repository, calendar, mailer y reloj; servicio, horario y datos del formulario.
 * Salida: Slots disponibles, schedule completo, resultado de reserva o error controlado.
 * Estado importante: rules fija anticipación y horizonte; slot/end son instantes ISO; fingerprint
 * detecta cambios de configuración; marker vincula el evento.
 * Efectos y límites: Consulta y escribe eventos mediante Calendar. Un resultado incierto queda
 * pending; solo un evento verificado permite reserved. El correo tiene estado independiente.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {HttpError} from './errors.js';

const minute=60000,day=86400000;
// Identificador público estable; nunca publicar el ID/correo del calendario del profesor.
export const instructorId=calendarId=>createHash('sha256').update('nexo-instructor:'+calendarId).digest('hex').slice(0,24);
const overlap=(a,b,c,d)=>a<d&&b>c;
const formatter=zone=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const parts=(fmt,time)=>Object.fromEntries(fmt.formatToParts(new Date(time)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
const dateKey=p=>`${p.year}-${p.month}-${p.day}`;
const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3));

/**
 * candidateSlots: Recorre instantes y compara hora comercial en su zona; excluye cierres y saltos
 * de reloj que alteran la duración.
 * Entrada (firma real):
 * {now,timezone,weeklyHours,duration,horizonDays,noticeMinutes,stepMinutes,includeUnavailable=false}.
 * Salida: Array {slot,end}; son candidatos, todavía no disponibilidad confirmada.
 */
export function candidateSlots({now,timezone,weeklyHours,duration,horizonDays,noticeMinutes,stepMinutes,includeUnavailable=false}){
 const fmt=formatter(timezone),out=[],first=includeUnavailable?Math.floor((now-36*60*minute)/minute)*minute:Math.ceil((now+noticeMinutes*minute)/minute)*minute;
 const today=dateKey(parts(fmt,now));
 for(let start=first;start+duration*minute<=now+horizonDays*day;start+=minute){
  const p=parts(fmt,start),date=dateKey(p),weekday=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7,row=weeklyHours[weekday];
  if(!row?.open)continue;
  if(includeUnavailable&&date<today)continue;
  const local=Number(p.hour)*60+Number(p.minute),open=minutes(row.open),close=minutes(row.close);
  if(local<open||(local-open)%stepMinutes!==0||local+duration>close)continue;
  const end=start+duration*minute,q=parts(fmt,end);
  // Exclude appointments spanning a local clock jump or closing time.
  if(dateKey(q)!==date||Number(q.hour)*60+Number(q.minute)!==local+duration)continue;
  out.push({slot:new Date(start).toISOString(),end:new Date(end).toISOString()});
 }
 return out;
}

/**
 * eventBusy: Convierte evento horario o de día completo a un intervalo; ignora eventos
 * cancelados/transparentes.
 * Entrada (firma real): event, timeZone.
 * Salida: {start,end} en milisegundos, null si no bloquea; HttpError si no puede interpretarlo.
 */
export function eventBusy(event,timeZone){
 if(event.status==='cancelled'||event.transparency==='transparent')return null;
 const convert=point=>{
  if(point?.dateTime&&/(Z|[+-]\d{2}:\d{2})$/.test(point.dateTime))return Date.parse(point.dateTime);
  if(point?.date&&/^\d{4}-\d{2}-\d{2}$/.test(point.date)){
   const fmt=formatter(timeZone),target=Date.parse(point.date+'T00:00:00Z');let t=target;
   for(let i=0;i<4;i++){const p=parts(fmt,t),actual=Date.parse(dateKey(p)+'T'+p.hour+':'+p.minute+':00Z');t+=target-actual;}
   const p=parts(fmt,t);if(dateKey(p)===point.date&&p.hour==='00'&&p.minute==='00')return t;
  }
  throw new HttpError(502,'No se pudo interpretar la disponibilidad de Google. Consulte al personal.');
 };
 const start=convert(event.start),end=convert(event.end);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw new HttpError(502,'Google devolvió un horario no válido.');return {start,end};
}

export class BookingService{
 constructor({repository,calendar,mailer=null,now=Date.now}){this.repo=repository;this.calendar=calendar;this.mailer=mailer;this.now=now;}
 publicStatus(){const rules=this.repo.bookingSettings(),state=this.calendar.status(),multiple=rules.assignment==='instructors';return {enabled:rules.enabled&&state.connected&&!!state.selected&&!state.pendingTests?.length&&(!multiple||rules.instructors?.some(i=>i.active)),serviceIds:rules.serviceIds,chooseInstructor:multiple};}
 /**
  * configure: Valida reglas, servicios y permisos antes de habilitar agenda.
  * Entrada (firma real): input.
  * Salida: Promise de reglas guardadas con nueva revision.
  */
 async configure(input){return this.calendar.exclusive(async()=>{
  const {revision,enabled,serviceIds,horizonDays,noticeMinutes,stepMinutes}=input;
  const previous=this.repo.bookingSettings(),assignment=input.assignment??previous.assignment??'single',raw=input.instructors??previous.instructors??[];
  if(!['single','instructors'].includes(assignment)||!Array.isArray(raw)||raw.length>10)throw new HttpError(400,'Seleccione agenda única o hasta 10 profesores.');
  const calendars=new Set(),instructors=raw.map(i=>{
   if(!i||typeof i.name!=='string'||i.name.trim().length<2||i.name.trim().length>80||/[\x00-\x1f\x7f]/.test(i.name)||typeof i.calendarId!=='string'||!i.calendarId||i.calendarId.length>1024||typeof i.active!=='boolean'||!Array.isArray(i.serviceIds)||!i.serviceIds.length||i.serviceIds.length>50||i.serviceIds.some(id=>typeof id!=='string'||!this.repo.getService(id))||new Set(i.serviceIds).size!==i.serviceIds.length)throw new HttpError(400,'Cada profesor necesita nombre, calendario y servicios válidos.');
   if(calendars.has(i.calendarId))throw new HttpError(400,'No puede asignar el mismo calendario a dos profesores.');calendars.add(i.calendarId);
   return {id:instructorId(i.calendarId),name:i.name.trim(),calendarId:i.calendarId,active:i.active,serviceIds:i.serviceIds};
  });
  if(typeof enabled!=='boolean'||!Number.isSafeInteger(revision)||!Array.isArray(serviceIds)||serviceIds.length>50||new Set(serviceIds).size!==serviceIds.length||!Number.isInteger(horizonDays)||horizonDays<1||horizonDays>30||!Number.isInteger(noticeMinutes)||noticeMinutes<60||noticeMinutes>10080||![15,30,60].includes(stepMinutes))throw new HttpError(400,'Revise las reglas de reservas. La anticipación mínima es de 60 minutos y el horizonte máximo, 30 días.');
  if(serviceIds.some(id=>typeof id!=='string'||!this.repo.getService(id)))throw new HttpError(400,'Seleccione servicios existentes.');
  if(enabled){const state=this.calendar.status();if(!state.connected||!state.selected||state.pendingTests?.length)throw new HttpError(409,'Conecte y seleccione un calendario sin pruebas pendientes.');if(!serviceIds.length||serviceIds.some(id=>{const s=this.repo.getService(id);return !s.active||!Number.isInteger(s.duration)||s.duration<1||s.duration>480;}))throw new HttpError(400,'Los servicios deben estar activos y tener duración confirmada (hasta 480 minutos).');}
  if(enabled&&assignment==='instructors'&&serviceIds.some(id=>!instructors.some(i=>i.active&&i.serviceIds.includes(id))))throw new HttpError(400,'Cada servicio reservable necesita al menos un profesor activo.');
  // Cambiar el recurso comprueba permisos de lectura/escritura sin crear eventos técnicos.
  if(assignment==='instructors'&&(enabled||JSON.stringify(instructors)!==JSON.stringify(previous.instructors||[])))await Promise.all(instructors.filter(i=>i.active).map(async i=>{const c=await this.calendar.calendar(i.calendarId);if(!c.writable)throw new HttpError(403,'El calendario de '+i.name+' no permite registrar citas.');}));
  return this.repo.saveBookingSettings(revision,{enabled,serviceIds,horizonDays,noticeMinutes,stepMinutes,assignment,instructors});
 });}
 context(serviceId){const rules=this.repo.bookingSettings(),state=this.calendar.status(),service=this.repo.getService(serviceId),center=this.repo.getCenter();
  if(!this.publicStatus().enabled||!rules.serviceIds.includes(serviceId)||!service?.active||!service.duration||service.duration>480||!center)throw new HttpError(409,'Este servicio no admite reservas en línea. Consulte al personal.');
  const instructors=rules.assignment==='instructors'?rules.instructors.filter(i=>i.active&&i.serviceIds.includes(serviceId)):[{id:null,name:null,calendarId:state.selected.id}];
  if(!instructors.length)throw new HttpError(409,'Este servicio no tiene profesores disponibles para reservar.');
  return {rules,selected:state.selected,service,center,instructors};
 }
 /**
  * availability: Combina candidatos, eventos reales y bloqueos locales pending/reserved; conserva
  * horas ocupadas en schedule.
  * Entrada (firma real): serviceId.
  * Salida: Promise<{slots,schedule,timezone}>; slots contiene solo opciones elegibles.
  */
 async availability(serviceId){const c=this.context(serviceId),now=this.now();
  const slots=candidateSlots({now,timezone:c.center.timezone,weeklyHours:c.center.weeklyHours,duration:c.service.duration,...c.rules,includeUnavailable:true});
  if(!slots.length)return {slots:[],schedule:[],timezone:c.center.timezone};
  // No ofrecer cupos si una lectura falla: nunca interpretar un calendario ilegible como libre.
  const resources=await Promise.all(c.instructors.map(async instructor=>{
   const calendar=await this.calendar.calendar(instructor.calendarId);if(!calendar.writable)throw new HttpError(403,'La agenda no permite registrar reservas. Consulte al personal.');
   const events=await this.calendar.bookingEvents(instructor.calendarId,slots[0].slot,slots.at(-1).end);
   const busy=events.map(e=>eventBusy(e,calendar.timeZone)).filter(Boolean);
   busy.push(...this.repo.bookingBlocks(instructor.calendarId).map(r=>({start:Date.parse(r.slot),end:Date.parse(r.end)})));
   return {...instructor,busy};
  }));
  const multiple=c.rules.assignment==='instructors';
  const schedule=slots.map(s=>{const start=Date.parse(s.slot),free=resources.filter(r=>!r.busy.some(b=>overlap(start,Date.parse(s.end),b.start,b.end))),occupied=!free.length;const reason=occupied?'occupied':start<now?'past':start<now+c.rules.noticeMinutes*minute?'notice':null;return {slot:s.slot,available:reason===null,reason,remaining:reason===null?free.length:0,capacity:resources.length,...(multiple?{instructorIds:reason===null?free.map(i=>i.id):[]}: {})};});
  return {slots:schedule.filter(s=>s.available).map(s=>s.slot),schedule,timezone:c.center.timezone,...(multiple?{instructors:c.instructors.map(({id,name})=>({id,name}))}:{})};
 }
 result(row){return {id:row.id,code:row.code,serviceName:row.serviceName,instructorName:row.instructorName||null,slot:row.slot,end:row.end,priceCents:row.priceCents,currency:row.currency,status:row.status,timezone:row.timezone,mailStatus:this.repo.bookingReceipt(row.id).status};}
 /**
  * sendConfirmation: Reclama un único envío y solo envía para reserved; un fallo de red deja
  * uncertain.
  * Entrada (firma real): id.
  * Salida: Promise del estado de correo; no cambia la existencia del evento.
  */
 async sendConfirmation(id){
  if(this.repo.pendingBookingTransfer(id))throw new HttpError(409,'Hay un traslado de esta cita por verificar. Consulte al personal.');
  const row=this.repo.calendarBooking(id);if(!row||row.status!=='reserved')return 'not_sent';
  if(!this.mailer?.ready)return 'unavailable';
  if(!this.repo.claimBookingReceipt(id))return this.repo.bookingReceipt(id).status;
  try{await this.mailer.sendConfirmation({booking:row,centerName:this.repo.getCenter()?.name||'el centro'});this.repo.finishBookingReceipt(id,'sent');}
  catch{this.repo.finishBookingReceipt(id,'uncertain');}
  return this.repo.bookingReceipt(id).status;
 }
 /**
  * lookup: Exige coincidencia de correo y código/ID antes de verificar el evento.
  * Entrada (firma real): {id,email}.
  * Salida: Promise del resultado público; HttpError 404 si no coinciden los datos.
  */
 async lookup({id,email}){
  const row=this.repo.bookingByCode(id)||this.repo.calendarBooking(id.toLowerCase());
  if(!row||row.email.toLowerCase()!==email.toLowerCase())throw new HttpError(404,'No encontramos una cita con ese correo y código. Revise ambos datos o consulte al personal.');
  return this.verify(row.id);
 }
 /**
  * reserve: Reutiliza requestId, comprueba precio/agenda y persiste pending antes de insertar en
  * Google.
  * Entrada (firma real): input.
  * Salida: Promise de resultado con status pending o reserved; pending no debe presentarse como
  * éxito.
  */
 async reserve(input){return this.calendar.exclusive(async()=>{
  const old=this.repo.bookingByRequest(input.requestId);
  if(old&&this.repo.pendingBookingTransfer(old.id))throw new HttpError(409,'Hay un traslado de esta cita por verificar. Consulte al personal.');
  if(old&&(old.instructorId||null)!==(input.instructorId||null))throw new HttpError(409,'Esa solicitud ya se utilizó con otro profesor.');
  if(old){for(const k of ['sessionHash','serviceId','slot','customerName','email','priceCents'])if(old[k]!==input[k])throw new HttpError(409,'Esa solicitud ya se utilizó con otros datos.');if(old.status==='cancelled')throw new HttpError(409,'Esta reserva fue cancelada.');return this.result(old.status==='pending'?await this.verifyRecord(old):old);}
  const context=this.context(input.serviceId);
  if(context.service.priceCents!==input.priceCents)throw new HttpError(409,'La información del servicio cambió. Vuelva a abrirlo.');
  const fingerprint=JSON.stringify(context);
  const resource=context.instructors.find(i=>i.id===(input.instructorId||null));
  if(!resource)throw new HttpError(409,'Elija un profesor habilitado para este servicio.');
  const availability=await this.availability(input.serviceId),slot=availability.schedule.find(s=>s.slot===input.slot);
  if(!slot?.available||(slot.instructorIds&&!slot.instructorIds.includes(resource.id)))throw new HttpError(409,'Ese profesor u horario ya no está disponible. Elija otro.');
  if(JSON.stringify(this.context(input.serviceId))!==fingerprint)throw new HttpError(409,'La configuración cambió. Vuelva a elegir un horario.');
  const row=this.repo.claimBooking({...input,instructorId:resource.id,instructorName:resource.name,id:randomUUID(),calendarId:resource.calendarId,marker:randomBytes(24).toString('hex'),end:new Date(Date.parse(input.slot)+context.service.duration*minute).toISOString(),serviceName:context.service.name,currency:context.service.currency,timezone:context.center.timezone,consentVersion:'calendar-2026-09',createdAt:new Date(this.now()).toISOString()});
  const event={id:row.id.replaceAll('-',''),summary:'Nexo · '+row.serviceName,description:'Reserva '+row.id+'\nAlumno: '+row.customerName+'\nContacto: '+row.email,start:{dateTime:row.slot,timeZone:row.timezone},end:{dateTime:row.end,timeZone:row.timezone},visibility:'private',transparency:'opaque',reminders:{useDefault:false},extendedProperties:{private:{nexoBooking:row.marker}}};
  // Persist intent before the network call. Never insert again after an uncertain result.
  try{const created=await this.calendar.request(this.path(row)+'?sendUpdates=none',{method:'POST',body:event});this.match(row,created);const saved=this.repo.setBookingStatus(row.id,'reserved');this.repo.recordBookingSync(row.id,'reserved');return this.result(saved);}
  catch{this.repo.recordBookingSync(row.id,'pending');return this.result(row);}
 });}
 path(row,item=false){return '/calendars/'+encodeURIComponent(row.calendarId)+'/events'+(item?'/'+row.id.replaceAll('-',''):'');}
 /**
  * match: Comprueba el marcador privado y ambos extremos del horario del evento.
  * Entrada (firma real): row, event.
  * Salida: Sin valor; HttpError 409 si un evento fue alterado fuera de Nexo.
  */
 match(row,event){if(event?.extendedProperties?.private?.nexoBooking!==row.marker||Date.parse(event.start?.dateTime)!==Date.parse(row.slot)||Date.parse(event.end?.dateTime)!==Date.parse(row.end))throw new HttpError(409,'El evento fue modificado fuera de Nexo. Revíselo con el administrador.');}
 /**
  * verifyRecord: Consulta el ID Google conocido y compara su marcador y horario con SQLite.
  * Entrada (firma real): row.
  * Salida: Registro reconciliado; ausencia de un evento pending no autoriza insertar uno nuevo.
  */
 async verifyRecord(row){if(this.repo.pendingBookingTransfer(row.id))throw new HttpError(409,'Hay un traslado de esta cita por verificar. Consulte al personal.');const event=await this.calendar.request(this.path(row,true),{allowMissing:true});if(event?.status==='cancelled')return this.repo.setBookingStatus(row.id,'cancelled');if(!event)return row.status==='reserved'?this.repo.setBookingStatus(row.id,'cancelled'):row;this.match(row,event);return this.repo.setBookingStatus(row.id,'reserved');}
 /**
  * verify: Serializa la verificación de una reserva existente.
  * Entrada (firma real): id.
  * Salida: Promise del resultado público de la reserva.
  */
 async verify(id){return this.calendar.exclusive(async()=>{const row=this.repo.calendarBooking(id);if(!row)throw new HttpError(404,'Reserva no encontrada.');if(row.status==='cancelled')return this.result(row);
  try{const checked=await this.verifyRecord(row);this.repo.recordBookingSync(id,checked.status);return this.result(checked);}
  catch(error){this.repo.recordBookingSync(id,'error');throw error;}
 });}
 /**
  * cancel: Verifica propiedad del evento antes de eliminarlo; un pending no confirmado mantiene el
  * bloqueo.
  * Entrada (firma real): id.
  * Salida: Promise del resultado cancelado o error controlado.
  */
 async cancel(id,{reason='Cancelación técnica',actor='Sistema'}={}){return this.calendar.exclusive(async()=>{const row=this.repo.calendarBooking(id);if(!row)throw new HttpError(404,'Reserva no encontrada.');if(row.status==='cancelled')return this.result(row);
  if(this.repo.pendingBookingTransfer(id))throw new HttpError(409,'Hay un traslado de esta cita por verificar. Consulte al personal.');
  const attempt=this.repo.beginCancellation(id,reason,actor);
  try{
  const event=await this.calendar.request(this.path(row,true),{allowMissing:true});
  if(!event&&row.status==='pending')throw new HttpError(409,'La creación aún no está confirmada. Verifique de nuevo más tarde; el horario permanece protegido.');
  if(event&&event.status!=='cancelled'){this.match(row,event);if(!event.etag)throw new HttpError(409,'Google no devolvió la versión del evento. No se puede cancelar con seguridad.');await this.calendar.request(this.path(row,true)+'?sendUpdates=none',{method:'DELETE',allowMissing:true,ifMatch:event.etag});}
  const saved=this.repo.setBookingStatus(id,'cancelled');this.repo.finishCancellation(attempt,'confirmed');this.repo.recordBookingSync(id,'cancelled');return this.result(saved);
  }catch(error){this.repo.finishCancellation(attempt,'uncertain');this.repo.recordBookingSync(id,'error');throw error;}
 });}
}
