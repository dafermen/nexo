/** NEXO · GUÍA DEL MÓDULO: server/reception.js
 * Cola presencial, separada de Calendar. Entrada: sesión, ficha y acciones autenticadas.
 * Salida: turno privado o tablero público sin datos personales. BEGIN IMMEDIATE y los
 * índices únicos evitan doble atención; revision rechaza botones de una pantalla antigua.
 * Conservación: siete días; turnos abiertos del día anterior expiran sin llamar a nadie.
 */
import {randomUUID} from 'node:crypto';
import {HttpError} from './errors.js';
export const receptionCategories=['permit','prices','lessons','packages','five-hours','defensive','road-test','payments','reschedule','complaint','other','unspecified'];
const uuid=/^[a-f0-9-]{36}$/i;
export function createReceptionStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS reception_desks(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,active INTEGER NOT NULL DEFAULT 1,revision INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS reception_tickets(id TEXT PRIMARY KEY,requestId TEXT NOT NULL UNIQUE,sessionHash TEXT NOT NULL,day TEXT NOT NULL,number INTEGER NOT NULL,visitorType TEXT NOT NULL,category TEXT NOT NULL,note TEXT NOT NULL,language TEXT NOT NULL,status TEXT NOT NULL,deskId TEXT,actor TEXT,revision INTEGER NOT NULL DEFAULT 1,callSequence INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,UNIQUE(day,number));
 CREATE UNIQUE INDEX IF NOT EXISTS reception_actor_busy ON reception_tickets(actor) WHERE status IN ('called','serving');
 CREATE UNIQUE INDEX IF NOT EXISTS reception_desk_busy ON reception_tickets(deskId) WHERE status IN ('called','serving');
 CREATE UNIQUE INDEX IF NOT EXISTS reception_session_active ON reception_tickets(sessionHash) WHERE status IN ('waiting','called','serving');
 CREATE TABLE IF NOT EXISTS reception_calls(requestId TEXT PRIMARY KEY,actor TEXT NOT NULL,ticketId TEXT NOT NULL,createdAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reception_events(id INTEGER PRIMARY KEY,ticketId TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,createdAt TEXT NOT NULL);
 INSERT OR IGNORE INTO reception_desks(id,name) VALUES('desk-1','Escritorio 1');`);
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 const now=()=>new Date().toISOString();
 const event=(id,actor,action)=>db.prepare('INSERT INTO reception_events(ticketId,actor,action,createdAt) VALUES(?,?,?,?)').run(id,actor,action,now());
 const ticket=id=>db.prepare('SELECT * FROM reception_tickets WHERE id=?').get(id);
 const safe=t=>t?{id:t.id,code:'A'+String(t.number).padStart(3,'0'),day:t.day,status:t.status,desk:t.deskId?db.prepare('SELECT name FROM reception_desks WHERE id=?').get(t.deskId)?.name:null,revision:t.revision,callSequence:t.callSequence}:null;
 const clean=day=>{
  db.prepare("UPDATE reception_tickets SET status='expired',revision=revision+1,updatedAt=? WHERE day<>? AND status IN ('waiting','called','serving')").run(now(),day);
  const cutoff=new Date(Date.now()-7*86400000).toISOString();
  db.prepare('DELETE FROM reception_events WHERE createdAt<?').run(cutoff);
  db.prepare('DELETE FROM reception_calls WHERE createdAt<?').run(cutoff);
  db.prepare('DELETE FROM reception_tickets WHERE createdAt<?').run(cutoff);
 };
 return {
  receptionDay(timezone='America/New_York'){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());},
  receptionBoard(day){clean(day);return {day,waiting:db.prepare("SELECT count(*) n FROM reception_tickets WHERE day=? AND status='waiting'").get(day).n,calls:db.prepare("SELECT * FROM reception_tickets WHERE day=? AND status IN ('called','serving') ORDER BY callSequence DESC").all(day).map(safe)};},
  receptionMine(sessionHash,day){clean(day);return safe(db.prepare('SELECT * FROM reception_tickets WHERE sessionHash=? AND day=? ORDER BY number DESC LIMIT 1').get(sessionHash,day));},
  receptionJoin(input,sessionHash,day,language='es'){return transaction(()=>{
   clean(day);
   if(!uuid.test(input.requestId||'')||input.onSite!==true||!['new','student'].includes(input.visitorType)||!receptionCategories.includes(input.category)||typeof (input.note??'')!=='string'||(input.note||'').length>240||(input.note||'').split('\n').length>2)throw new HttpError(400,'Complete la ficha presencial; observación de hasta dos líneas y 240 caracteres.');
   const prior=db.prepare('SELECT * FROM reception_tickets WHERE requestId=?').get(input.requestId);
   if(prior){if(prior.sessionHash!==sessionHash)throw new HttpError(409,'Solicitud ya utilizada.');return safe(prior);}
   const active=db.prepare("SELECT * FROM reception_tickets WHERE sessionHash=? AND status IN ('waiting','called','serving')").get(sessionHash);if(active)return safe(active);
   const number=db.prepare('SELECT coalesce(max(number),0)+1 n FROM reception_tickets WHERE day=?').get(day).n;
   if(number>500)throw new HttpError(429,'Consulte al personal para recibir atención.');
   const id=randomUUID(),stamp=now();
   db.prepare("INSERT INTO reception_tickets(id,requestId,sessionHash,day,number,visitorType,category,note,language,status,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,'waiting',?,?)").run(id,input.requestId,sessionHash,day,number,input.visitorType,input.category,(input.note||'').trim(),language,stamp,stamp);
   event(id,'visitor','joined');return safe(ticket(id));
  });},
  receptionCancel(sessionHash,day){return transaction(()=>{clean(day);const t=db.prepare("SELECT * FROM reception_tickets WHERE sessionHash=? AND day=? AND status='waiting'").get(sessionHash,day);if(t){db.prepare("UPDATE reception_tickets SET status='cancelled',revision=revision+1,updatedAt=? WHERE id=?").run(now(),t.id);event(t.id,'visitor','cancelled');}return {cancelled:!!t};});},
  receptionList(day){clean(day);return {day,desks:db.prepare('SELECT * FROM reception_desks ORDER BY name').all(),tickets:db.prepare('SELECT * FROM reception_tickets WHERE day=? ORDER BY number').all(day).map(({sessionHash,requestId,...t})=>({...t,...safe(t)}))};},
  receptionDesk(input,actor){return transaction(()=>{
   if(typeof input.name!=='string'||!input.name.trim()||input.name.length>40||typeof input.active!=='boolean')throw new HttpError(400,'Revise el escritorio.');
   const prior=input.id?db.prepare('SELECT * FROM reception_desks WHERE id=?').get(input.id):null;
   if(input.id&&!prior)throw new HttpError(404,'Escritorio inexistente.');
   if(prior&&prior.revision!==input.revision)throw new HttpError(409,'Actualice los escritorios.');
   if(prior&&db.prepare("SELECT id FROM reception_tickets WHERE deskId=? AND status IN ('called','serving')").get(prior.id))throw new HttpError(409,'Finalice la atención antes de cambiar el escritorio.');
   if(db.prepare('SELECT id FROM reception_desks WHERE name=? AND id<>?').get(input.name.trim(),prior?.id||''))throw new HttpError(409,'Nombre de escritorio repetido.');
   if(!prior&&db.prepare('SELECT count(*) n FROM reception_desks').get().n>=30)throw new HttpError(400,'Máximo 30 escritorios.');
   const id=prior?.id||randomUUID();
   if(prior)db.prepare('UPDATE reception_desks SET name=?,active=?,revision=revision+1 WHERE id=?').run(input.name.trim(),+input.active,id);
   else db.prepare('INSERT INTO reception_desks(id,name,active) VALUES(?,?,?)').run(id,input.name.trim(),+input.active);
   event(id,actor,'desk.updated');return {id};
  });},
  receptionNext({requestId,deskId},actor,day){return transaction(()=>{
   clean(day);if(!uuid.test(requestId||''))throw new HttpError(400,'Identificador inválido.');
   const prior=db.prepare('SELECT * FROM reception_calls WHERE requestId=?').get(requestId);
   if(prior){if(prior.actor!==actor)throw new HttpError(409,'Solicitud ya utilizada.');return safe(ticket(prior.ticketId));}
   if(!db.prepare('SELECT id FROM reception_desks WHERE id=? AND active=1').get(deskId))throw new HttpError(400,'Elija un escritorio activo.');
   if(db.prepare("SELECT id FROM reception_tickets WHERE (actor=? OR deskId=?) AND status IN ('called','serving')").get(actor,deskId))throw new HttpError(409,'Usted o ese escritorio ya tienen una atención abierta.');
   const t=db.prepare("SELECT * FROM reception_tickets WHERE day=? AND status='waiting' ORDER BY number LIMIT 1").get(day);if(!t)throw new HttpError(409,'No hay personas esperando.');
   const sequence=db.prepare('SELECT coalesce(max(id),0)+1 n FROM reception_events').get().n;
   db.prepare("UPDATE reception_tickets SET status='called',actor=?,deskId=?,revision=revision+1,callSequence=?,updatedAt=? WHERE id=?").run(actor,deskId,sequence,now(),t.id);
   db.prepare('INSERT INTO reception_calls VALUES(?,?,?,?)').run(requestId,actor,t.id,now());event(t.id,actor,'called');return safe(ticket(t.id));
  });},
  receptionAction(id,input,principal,day){return transaction(()=>{
   clean(day);const t=ticket(id);if(!t||t.day!==day)throw new HttpError(404,'Turno no disponible.');
   if(t.revision!==input.revision)throw new HttpError(409,'El turno cambió. Actualice el panel.');
   if(t.actor!==principal.email&&!['owner','manager'].includes(principal.role))throw new HttpError(403,'Solo el asesor asignado puede cambiar esta atención.');
   const allowed={repeat:['called'],start:['called'],finish:['serving'],absent:['called'],cancel:['waiting','called','serving']};
   if(!allowed[input.action]?.includes(t.status))throw new HttpError(409,'Acción no disponible en este estado.');
   const status={repeat:'called',start:'serving',finish:'completed',absent:'absent',cancel:'cancelled'}[input.action];
   const sequence=input.action==='repeat'?db.prepare('SELECT coalesce(max(id),0)+1 n FROM reception_events').get().n:t.callSequence;
   db.prepare('UPDATE reception_tickets SET status=?,revision=revision+1,callSequence=?,updatedAt=? WHERE id=?').run(status,sequence,now(),id);event(id,principal.email,input.action);return safe(ticket(id));
  });},
 };
}
