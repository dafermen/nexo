/**
 * NEXO · GUÍA DEL MÓDULO: server/admin-reports.js
 * Reportes privados sobre datos retenidos. Entrada: filtros validados y SQLite.
 * Salida: métricas del período, páginas ordenadas y CSV. Fechas en zona del negocio;
 * las citas se cuentan por creación, no por fecha de asistencia. No estima ingresos ni éxito.
 * SQL usa parámetros y una lista cerrada de columnas; nunca consulta servicios de pago.
 */
import {HttpError} from './errors.js';
import {agendaFilters} from './admin-agenda.js';
import {reviewCandidate} from './review-store.js';

const sorts={appointments:['createdAt','slot','customerName','serviceName','status'],questions:['createdAt','question','serviceId','status','channel'],notifications:['createdAt','recipient','status','attempts']};
export function reportFilters(params,timezone,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const from=params.get('from')||new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10),to=params.get('to')||today;
 const {start,end}=agendaFilters(new URLSearchParams({from,to}),timezone);
 const type=params.get('type')||'appointments',sort=params.get('sort')||'createdAt',direction=params.get('direction')||'desc',q=(params.get('q')||'').trim(),channel=params.get('channel')||'',status=params.get('status')||'',serviceId=params.get('serviceId')||'',offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||25);
 const states={appointments:['','reserved','pending','cancelled'],questions:['','pending','draft','published','dismissed'],notifications:['','queued','sending','sent','uncertain','skipped']};
 if(!Object.hasOwn(sorts,type)||!sorts[type].includes(sort)||!['asc','desc'].includes(direction)||q.length>100||serviceId.length>60||!['','text','voice','video'].includes(channel)||!states[type].includes(status)||![25,50,100].includes(limit)||!Number.isSafeInteger(offset)||offset<0||offset>10000000)throw new HttpError(400,'Filtros de reporte inválidos.');
 return {from,to,start,end,type,sort,direction,q,channel,status,serviceId,offset,limit};
}
// Citar cada celda no basta: neutralizar fórmulas incluso tras espacios o controles.
export function csvCell(value){let text=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/u.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function reportCsv(report){const columns=report.columns;return '\uFEFF'+[columns.map(c=>csvCell(c.label)).join(','),...report.items.map(r=>columns.map(c=>csvCell(r[c.key])).join(','))].join('\r\n')+'\r\n';}
const columns={
 appointments:[['code','Código'],['createdAt','Creación (UTC)'],['slot','Cita (UTC)'],['timezone','Zona horaria'],['customerName','Nombre'],['email','Correo'],['serviceName','Servicio'],['instructorName','Profesor'],['status','Estado'],['mailStatus','Correo al cliente']],
 questions:[['createdAt','Fecha (UTC)'],['question','Pregunta'],['answer','Respuesta dada'],['channel','Canal'],['serviceId','Servicio'],['reason','Motivo de revisión'],['status','Revisión']],
 notifications:[['createdAt','Creación (UTC)'],['code','Código'],['serviceName','Servicio'],['recipient','Administrador'],['status','Envío'],['attempts','Intentos'],['updatedAt','Actualización (UTC)']]
};
const sources={
 appointments:`SELECT b.id,c.code,json_extract(b.document,'$.createdAt') createdAt,b.slot,json_extract(b.document,'$.timezone') timezone,json_extract(b.document,'$.customerName') customerName,json_extract(b.document,'$.email') email,json_extract(b.document,'$.serviceName') serviceName,json_extract(b.document,'$.instructorName') instructorName,json_extract(b.document,'$.serviceId') serviceId,b.status,coalesce(r.status,'not_sent') mailStatus FROM calendar_bookings b LEFT JOIN booking_codes c ON c.bookingId=b.id LEFT JOIN booking_receipts r ON r.id=b.id`,
 questions:`SELECT t.id,t.conversationId,t.startedAt createdAt,t.userText question,t.assistantText answer,t.channel,t.serviceId,t.reason,coalesce(r.status,'pending') status FROM conversation_turns t LEFT JOIN answer_reviews r ON r.turnId=t.id WHERE ${reviewCandidate}`,
 notifications:`SELECT n.id,n.bookingId,c.code,n.createdAt,n.updatedAt,n.recipient,n.status,n.attempts,json_extract(b.document,'$.serviceName') serviceName,json_extract(b.document,'$.instructorName') instructorName,json_extract(b.document,'$.serviceId') serviceId FROM booking_notifications n JOIN calendar_bookings b ON b.id=n.bookingId LEFT JOIN booking_codes c ON c.bookingId=b.id`
};
export function createReportStore(db){
 db.exec('CREATE INDEX IF NOT EXISTS turns_started ON conversation_turns(startedAt);');
 return {
  reportSummary({start,end}){
   const one=(sql)=>db.prepare(sql).get(start,end);
   return {
    conversations:one('SELECT count(*) total FROM conversations WHERE startedAt>=? AND startedAt<?').total,
    turns:one("SELECT count(*) total,coalesce(sum(aiCalls),0) aiCalls,coalesce(sum(inputTokens),0) inputTokens,coalesce(sum(outputTokens),0) outputTokens,coalesce(round(avg(CASE WHEN outcome='completed' THEN durationMs END)),0) averageMs,coalesce(sum(CASE WHEN outcome='completed' AND aiCalls=0 THEN 1 ELSE 0 END),0) withoutAi FROM conversation_turns WHERE kind='message' AND startedAt>=? AND startedAt<?"),
    bookings:one("SELECT count(*) total,coalesce(sum(status='reserved'),0) reserved,coalesce(sum(status='cancelled'),0) cancelled,coalesce(sum(status='pending'),0) pending FROM calendar_bookings WHERE json_extract(document,'$.createdAt')>=? AND json_extract(document,'$.createdAt')<?"),
    reviews:one(`SELECT count(*) total,coalesce(sum(status IN ('pending','draft')),0) pending FROM (${sources.questions}) WHERE createdAt>=? AND createdAt<?`),
    channels:db.prepare("SELECT channel,count(*) total FROM conversation_turns WHERE kind='message' AND startedAt>=? AND startedAt<? GROUP BY channel ORDER BY total DESC").all(start,end),
    topics:db.prepare("SELECT coalesce(serviceId,'general') serviceId,count(*) total FROM conversation_turns WHERE kind='message' AND startedAt>=? AND startedAt<? GROUP BY serviceId ORDER BY total DESC,serviceId LIMIT 8").all(start,end),
    notifications:db.prepare('SELECT status,count(*) total FROM booking_notifications WHERE createdAt>=? AND createdAt<? GROUP BY status').all(start,end)
   };
  },
  reportRows(f,{exportAll=false}={}){
   const where=['createdAt>=?','createdAt<?'],args=[f.start,f.end];
   if(f.status){where.push('status=?');args.push(f.status);}
   if(f.serviceId){where.push('serviceId=?');args.push(f.serviceId);}
   if(f.channel&&f.type==='questions'){where.push('channel=?');args.push(f.channel);}
   if(f.q){const fields={appointments:['customerName','email','code','serviceName','instructorName'],questions:['question','answer'],notifications:['recipient','code','serviceName']}[f.type];where.push('('+fields.map(c=>`instr(lower(coalesce(${c},'')),lower(?))>0`).join(' OR ')+')');args.push(...fields.map(()=>f.q));}
   const sql=`FROM (${sources[f.type]}) WHERE ${where.join(' AND ')}`;
   const total=db.prepare('SELECT count(*) total '+sql).get(...args).total;
   if(exportAll&&total>10000)throw new HttpError(400,'Hay más de 10.000 filas. Reduzca el período o los filtros antes de exportar.');
   const items=db.prepare('SELECT * '+sql+` ORDER BY ${f.sort} ${f.direction.toUpperCase()},id ${f.direction.toUpperCase()} LIMIT ? OFFSET ?`).all(...args,exportAll?10000:f.limit,exportAll?0:f.offset);
   return {items,total,limit:f.limit,offset:exportAll?0:f.offset,columns:columns[f.type].map(([key,label])=>({key,label})),sorts:sorts[f.type]};
  }
 };
}
