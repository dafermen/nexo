/**
 * NEXO · GUÍA DEL MÓDULO: server/booking-transfers-store.js
 * Diario durable de reasignaciones. Recibe SQLite y snapshots privados de origen/destino.
 * pending protege AMBOS calendarios; solo moved cambia la asignación. No llama Google.
 * El ID de operación es idempotente; actor/reason proceden de la administración autenticada.
 */
import {HttpError} from './errors.js';
export function createTransferStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS booking_transfers(id TEXT PRIMARY KEY,bookingId TEXT NOT NULL,calendarId TEXT NOT NULL,slot TEXT NOT NULL,end TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','moved','failed')),document TEXT NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS transfer_pending_booking ON booking_transfers(bookingId) WHERE status='pending';
 CREATE INDEX IF NOT EXISTS transfer_overlap ON booking_transfers(calendarId,status,slot,end);`);
 const unpack=r=>r?{...JSON.parse(r.document),...r,document:undefined}:null;
 return {
  bookingTransfer(id){return unpack(db.prepare('SELECT * FROM booking_transfers WHERE id=?').get(id));},
  pendingBookingTransfer(bookingId){return unpack(db.prepare("SELECT * FROM booking_transfers WHERE bookingId=? AND status='pending'").get(bookingId));},
  bookingTransferHistory(bookingId){return db.prepare('SELECT * FROM booking_transfers WHERE bookingId=? ORDER BY rowid DESC LIMIT 50').all(bookingId).map(unpack);},
  futureInstructorBookings(instructorId,now){return db.prepare("SELECT id FROM calendar_bookings WHERE status IN ('reserved','pending') AND slot>? AND coalesce(json_extract(document,'$.instructorId'),'unassigned')=? ORDER BY slot,id LIMIT 101").all(now,instructorId).map(r=>this.calendarBooking(r.id));},
  beginBookingTransfer(record){db.exec('BEGIN IMMEDIATE');try{
   const b=this.calendarBooking(record.bookingId);
   if(!b||b.status!=='reserved'||b.calendarId!==record.sourceCalendarId||b.slot!==record.slot||b.end!==record.end||this.pendingBookingTransfer(b.id))throw new HttpError(409,'La cita cambió o tiene otro traslado pendiente. Actualice la vista previa.');
   if(db.prepare("SELECT 1 FROM booking_receipts WHERE id=? AND status='sending'").get(b.id)||db.prepare("SELECT 1 FROM booking_notifications WHERE bookingId=? AND status='sending'").get(b.id))throw new HttpError(409,'Se está enviando un aviso de esta cita. Espere y vuelva a revisar.');
   if(this.bookingBlocks(record.calendarId).some(x=>x.slot<record.end&&x.end>record.slot))throw new HttpError(409,'El profesor de destino acaba de ocuparse.');
   db.prepare("INSERT INTO booking_transfers VALUES(?,?,?,?,?,'pending',?)").run(record.id,b.id,record.calendarId,record.slot,record.end,JSON.stringify(record));db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}return this.bookingTransfer(record.id);},
  finishBookingTransfer(id,status){if(!['moved','failed'].includes(status))throw Error('Invalid transfer result');db.exec('BEGIN IMMEDIATE');try{
   const t=this.bookingTransfer(id);if(!t)throw new HttpError(404,'Traslado no encontrado.');
   if(t.status!=='pending'){db.exec('COMMIT');return t;}
   if(status==='moved'){
    const b=this.calendarBooking(t.bookingId);if(b.status!=='reserved'||b.calendarId!==t.sourceCalendarId)throw new HttpError(409,'La cita cambió durante el traslado; requiere revisión.');
    const row=db.prepare('SELECT document FROM calendar_bookings WHERE id=?').get(b.id),document={...JSON.parse(row.document),calendarId:t.calendarId,instructorId:t.targetId,instructorName:t.targetName};
    db.prepare('UPDATE calendar_bookings SET calendarId=?,document=? WHERE id=?').run(t.calendarId,JSON.stringify(document),b.id);
   }
   db.prepare('UPDATE booking_transfers SET status=?,document=? WHERE id=?').run(status,JSON.stringify({...t,updatedAt:new Date().toISOString()}),id);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}return this.bookingTransfer(id);}
 };
}
