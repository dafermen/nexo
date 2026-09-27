/**
 * NEXO · GUÍA DEL MÓDULO: server/booking-notifications.js
 * Cola persistente de avisos administrativos. Entrada: SQLite, reservas confirmadas y SMTP.
 * Salida: estados por destinatario. queued espera; sending reclama; sent significa aceptación
 * SMTP, no lectura ni entrega en bandeja. uncertain exige revisión y reintento explícito.
 * No reconstruye avisos de citas antiguas ni repite automáticamente un envío incierto.
 */
import {HttpError} from './errors.js';
export function createNotificationStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS booking_notifications(
 id INTEGER PRIMARY KEY,bookingId TEXT NOT NULL REFERENCES calendar_bookings(id),recipient TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('queued','sending','sent','uncertain','skipped')),
 attempts INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,
 UNIQUE(bookingId,recipient)) STRICT;
 CREATE INDEX IF NOT EXISTS booking_notifications_queue ON booking_notifications(status,id);`);
 return {
  recoverBookingNotifications(){db.prepare("UPDATE booking_notifications SET status='uncertain',updatedAt=? WHERE status='sending'").run(new Date().toISOString());},
  queuedBookingNotifications(){return db.prepare("SELECT id,bookingId,recipient FROM booking_notifications WHERE status='queued' ORDER BY id LIMIT 10").all();},
  claimBookingNotification(id){return db.prepare("UPDATE booking_notifications SET status='sending',attempts=attempts+1,updatedAt=? WHERE id=? AND status='queued'").run(new Date().toISOString(),id).changes===1;},
  finishBookingNotification(id,status){if(!['sent','uncertain','skipped'].includes(status))throw Error('Estado inválido');db.prepare('UPDATE booking_notifications SET status=?,updatedAt=? WHERE id=?').run(status,new Date().toISOString(),id);},
  retryBookingNotification(id,recipients,actor){
   const row=db.prepare("SELECT n.*,b.status bookingStatus FROM booking_notifications n JOIN calendar_bookings b ON b.id=n.bookingId WHERE n.id=?").get(id);
   if(!row||row.status!=='uncertain'||row.bookingStatus!=='reserved'||!recipients.includes(row.recipient))throw new HttpError(409,'Solo puede reintentar avisos inciertos de citas confirmadas para administradores actuales.');
   db.exec('BEGIN IMMEDIATE');try{
    db.prepare("UPDATE booking_notifications SET status='queued',updatedAt=? WHERE id=? AND status='uncertain'").run(new Date().toISOString(),id);
    db.prepare('INSERT INTO audit_events(action,entityId,createdAt) VALUES(?,?,?)').run('booking_notification.retry',JSON.stringify({id,actor}),new Date().toISOString());db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
  }
 };
}
export class BookingNotifications{
 constructor({repository,mailer,recipients=[]}){
  this.repo=repository;this.mailer=mailer;this.recipients=[...new Set(recipients)];this.stopped=false;this.running=null;
  repository.setBookingNotificationRecipients(this.recipients);repository.recoverBookingNotifications();
 }
 // La promesa compartida impide dos workers simultáneos; SQLite protege cada reclamación.
 run(){if(this.stopped||!this.mailer?.ready||!this.mailer.sendNewBooking)return Promise.resolve();if(this.running)return this.running;
  this.running=this.drain().finally(()=>{this.running=null;});return this.running;
 }
 async drain(){for(const item of this.repo.queuedBookingNotifications()){
  if(this.stopped)break;
  const booking=this.repo.calendarBooking(item.bookingId);
  if(this.repo.pendingBookingTransfer(item.bookingId))continue;
  if(booking?.status!=='reserved'||!this.recipients.includes(item.recipient)){this.repo.finishBookingNotification(item.id,'skipped');continue;}
  if(!this.repo.claimBookingNotification(item.id))continue;
  try{await this.mailer.sendNewBooking({to:item.recipient,booking,centerName:this.repo.getCenter?.()?.name||'Nexo'});this.repo.finishBookingNotification(item.id,'sent');}
  catch{this.repo.finishBookingNotification(item.id,'uncertain');}
 }}
 async close(){this.stopped=true;await this.running;}
}
