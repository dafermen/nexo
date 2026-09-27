/**
 * NEXO · GUÍA DEL MÓDULO: server/admin-agenda.js
 * Agenda privada paginada y bitácora de cancelaciones. Entrada: filtros validados, SQLite,
 * ID de cita y actor obtenido de la sesión. Salida: solo datos administrativos permitidos.
 * No publica tokens, marcadores de Google ni datos de otras agendas. Las lecturas no llaman
 * a Google: checkedAt es la última comprobación, no una promesa de sincronización en vivo.
 */
import {HttpError} from './errors.js';
import {eventBusy} from './booking.js';

export function agendaFilters(params,timezone){
 const q=(params.get('q')||'').trim(),status=params.get('status')||'all',serviceId=params.get('serviceId')||'',offset=Number(params.get('offset')||0),instructorId=params.get('instructorId')||'';
 if(instructorId&&instructorId!=='unassigned'&&!/^[a-f0-9]{24}$/.test(instructorId))throw new HttpError(400,'Profesor inválido.');
 if(q.length>100||serviceId.length>60||!['all','pending','reserved','cancelled'].includes(status)||!Number.isSafeInteger(offset)||offset<0||offset>10000000)throw new HttpError(400,'Filtros de agenda inválidos.');
 const from=params.get('from')||'',to=params.get('to')||'';
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 let start='',end='';
 if(from||to){
  if(!valid(from)||!valid(to)||to<from||Date.parse(to)-Date.parse(from)>366*86400000)throw new HttpError(400,'Seleccione un rango válido de hasta un año.');
  const next=new Date(Date.parse(to)+86400000).toISOString().slice(0,10);
  const range=eventBusy({start:{date:from},end:{date:next}},timezone);
  start=new Date(range.start).toISOString();end=new Date(range.end).toISOString();
 }
 return {q,status,serviceId,instructorId,offset,start,end};
}

export function cancellationReason(input){
 const reason=typeof input?.reason==='string'?input.reason.trim():'';
 if(reason.length<3||reason.length>300||/[\x00-\x1f\x7f]/.test(reason))throw new HttpError(400,'Indique el motivo de cancelación (3 a 300 caracteres).');
 return reason;
}

export function createAgendaStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS booking_sync(id TEXT PRIMARY KEY,state TEXT NOT NULL,checkedAt TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS booking_cancellations(id INTEGER PRIMARY KEY,bookingId TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,outcome TEXT NOT NULL,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL) STRICT;
 CREATE INDEX IF NOT EXISTS booking_cancellations_booking ON booking_cancellations(bookingId,id);`);
 // Unión de reservas reales y demo sin el límite histórico de 200 filas del overview.
 const union=`SELECT id,slot,status,document,'google-calendar' provider FROM calendar_bookings UNION ALL
 SELECT id,slot,status,json_object('id',id,'serviceId',serviceId,'serviceName',serviceName,'customerName',customerName,'email',email,'slot',slot,'priceCents',priceCents,'currency',currency,'createdAt',createdAt) document,'local' provider FROM appointments`;
 const unpack=row=>{
  if(!row)return null;const d=JSON.parse(row.document);
  const code=db.prepare('SELECT code FROM booking_codes WHERE bookingId=?').get(row.id)?.code;
  return {id:row.id,code:code?code.slice(0,4)+'-'+code.slice(4):row.id,provider:row.provider,status:row.status,transferPending:!!db.prepare("SELECT 1 FROM booking_transfers WHERE bookingId=? AND status='pending'").get(row.id),serviceId:d.serviceId,serviceName:d.serviceName,instructorName:d.instructorName||null,customerName:d.customerName,email:d.email,slot:row.slot,end:d.end||null,timezone:d.timezone||null,priceCents:d.priceCents,currency:d.currency,createdAt:d.createdAt,mailStatus:db.prepare('SELECT status FROM booking_receipts WHERE id=?').get(row.id)?.status||'not_sent',sync:db.prepare('SELECT state,checkedAt FROM booking_sync WHERE id=?').get(row.id)||{state:row.provider==='local'?'local':'unchecked',checkedAt:null}};
 };
 return {
  // Combina el registro actual con la última identificación guardada en citas antiguas.
  // Quitar un profesor de configuración no lo vuelve invisible en el historial.
  agendaInstructors(configured=[]){
   const historical=db.prepare(`SELECT id,name FROM (SELECT json_extract(document,'$.instructorId') id,json_extract(document,'$.instructorName') name,row_number() OVER (PARTITION BY json_extract(document,'$.instructorId') ORDER BY json_extract(document,'$.createdAt') DESC,calendar_bookings.id DESC) n FROM calendar_bookings) WHERE n=1 AND id IS NOT NULL`).all();
   const list=new Map(historical.filter(i=>/^[a-f0-9]{24}$/.test(i.id)).map(i=>[i.id,{id:i.id,name:i.name||'Profesor registrado',state:'historical'}]));
   for(const i of configured)list.set(i.id,{id:i.id,name:i.name,state:i.active?'active':'paused'});
   return [...list.values()].sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
  },
  agendaList({q='',status='all',serviceId='',instructorId='',offset=0,start='',end=''}={}){
   const where=[],args=[];
   if(status!=='all'){where.push('b.status=?');args.push(status);}
   if(serviceId){where.push("json_extract(b.document,'$.serviceId')=?");args.push(serviceId);}
   if(instructorId==='unassigned')where.push("json_extract(b.document,'$.instructorId') IS NULL");
   else if(instructorId){where.push("json_extract(b.document,'$.instructorId')=?");args.push(instructorId);}
   if(start){where.push('b.slot>=? AND b.slot<?');args.push(start,end);}
   if(q){where.push(`(instr(lower(json_extract(b.document,'$.customerName')),lower(?))>0 OR instr(lower(json_extract(b.document,'$.email')),lower(?))>0 OR instr(lower(b.id),lower(?))>0 OR EXISTS(SELECT 1 FROM booking_codes c WHERE c.bookingId=b.id AND length(?)>0 AND instr(c.code,?)>0))`);const code=q.toUpperCase().replace(/[-\s]/g,'');args.push(q,q,q,code,code);}
   const sql=`FROM (${union}) b${where.length?' WHERE '+where.join(' AND '):''}`;
   const total=db.prepare('SELECT count(*) total '+sql).get(...args).total;
   const items=db.prepare('SELECT b.* '+sql+` ORDER BY b.slot ${start?'ASC':'DESC'},b.id LIMIT 50 OFFSET ?`).all(...args,offset).map(unpack);
   return {items,total,offset,limit:50};
  },
  agendaDetail(id){const row=unpack(db.prepare(`SELECT * FROM (${union}) WHERE id=?`).get(id));if(!row)throw new HttpError(404,'Cita no encontrada.');return {...row,transfers:this.bookingTransferHistory(id).map(t=>({id:t.id,status:t.status,sourceName:t.sourceName,targetName:t.targetName,reason:t.reason,actor:t.actor,createdAt:t.createdAt})),cancellations:db.prepare('SELECT reason,actor,outcome,createdAt,updatedAt FROM booking_cancellations WHERE bookingId=? ORDER BY id DESC LIMIT 50').all(id)};},
  recordBookingSync(id,state){const now=new Date().toISOString();db.prepare('INSERT INTO booking_sync VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,checkedAt=excluded.checkedAt').run(id,state,now);
   if(state==='cancelled')db.prepare("UPDATE booking_cancellations SET outcome='confirmed',updatedAt=? WHERE bookingId=? AND outcome IN ('pending','uncertain')").run(now,id);
  },
  beginCancellation(id,reason,actor){const now=new Date().toISOString();return Number(db.prepare("INSERT INTO booking_cancellations(bookingId,reason,actor,outcome,createdAt,updatedAt) VALUES(?,?,?,'pending',?,?)").run(id,reason,actor,now,now).lastInsertRowid);},
  finishCancellation(id,outcome){db.prepare('UPDATE booking_cancellations SET outcome=?,updatedAt=? WHERE id=?').run(outcome,new Date().toISOString(),id);},
  administratorIdentity(tokenHash,now){return db.prepare('SELECT a.email FROM administrators a JOIN admin_sessions s ON s.adminId=a.id WHERE s.tokenHash=? AND s.expiresAt>? AND s.absoluteExpiresAt>?').get(tokenHash,now,now)?.email||null;}
 };
}
