/**
 * NEXO · GUÍA DEL MÓDULO: server/booking-store.js
 * Persistir reservas de Google, códigos cortos y estado de correo.
 * Entrada: db y generateCode opcional; registro de reserva y revisión de reglas.
 * Salida: Reservas, códigos, bloqueos de horarios y estado de comprobante.
 * Estado importante: requestId es único; pending protege un horario incierto; booking_codes separa
 * código visible e ID interno.
 * Efectos y límites: Una transacción verifica solapamientos y guarda intención antes de llamar a
 * Google. No enviar correos ni crear eventos desde este almacén.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {HttpError} from './errors.js';
import {createTransferStore} from './booking-transfers-store.js';
import {newBookingCode,normalizeBookingCode,formatBookingCode,isBookingCode} from './booking-code.js';

export function createBookingStore(db,{generateCode=newBookingCode}={}){
 let notificationRecipients=[];
 db.exec(`CREATE TABLE IF NOT EXISTS booking_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,document TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS calendar_bookings(id TEXT PRIMARY KEY,requestId TEXT NOT NULL UNIQUE,sessionHash TEXT NOT NULL,calendarId TEXT NOT NULL,slot TEXT NOT NULL,end TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','reserved','cancelled')),document TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS calendar_booking_overlap ON calendar_bookings(calendarId,slot,end,status);
 CREATE TABLE IF NOT EXISTS booking_receipts(id TEXT PRIMARY KEY,status TEXT NOT NULL,updatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS booking_codes(bookingId TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE CHECK(length(code)=8));
 INSERT OR IGNORE INTO booking_settings VALUES(1,1,'{"enabled":false,"serviceIds":[],"horizonDays":14,"noticeMinutes":60,"stepMinutes":60}');`);
 /**
  * assignCode: Reintenta una colisión de código hasta un límite; no cambia el identificador del
  * evento Google.
  * Entrada (firma real): id.
  * Salida: Sin valor; Error si no consigue un código válido y único.
  */
 const assignCode=id=>{
  if(db.prepare('SELECT 1 FROM booking_codes WHERE bookingId=?').get(id))return;
  for(let attempt=0;attempt<20;attempt++){
   const code=normalizeBookingCode(generateCode());
   if(!isBookingCode(code))throw new Error('Formato de código de reserva inválido.');
   if(db.prepare('INSERT INTO booking_codes VALUES(?,?) ON CONFLICT(code) DO NOTHING').run(id,code).changes)return;
  }
  throw new Error('No se pudo asignar un código de reserva único.');
 };
 // Backfill all existing reservations atomically, without touching Google events.
 db.exec('BEGIN IMMEDIATE');try{
  for(const row of db.prepare('SELECT id FROM calendar_bookings WHERE id NOT IN (SELECT bookingId FROM booking_codes)').all())assignCode(row.id);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
 const unpack=r=>r&&({...JSON.parse(r.document),...r,document:undefined,code:formatBookingCode(db.prepare('SELECT code FROM booking_codes WHERE bookingId=?').get(r.id).code)});
 const transfers=createTransferStore(db);
 return {
  ...transfers,
  setBookingNotificationRecipients(emails){notificationRecipients=[...new Set(emails)];},
  bookingSettings(){const r=db.prepare('SELECT * FROM booking_settings WHERE id=1').get();return {...JSON.parse(r.document),revision:r.revision};},
  saveBookingSettings(revision,document){if(!db.prepare('UPDATE booking_settings SET document=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(document),revision).changes)throw new HttpError(409,'Otra ventana modificó las reservas. Actualice el panel.');return this.bookingSettings();},
  bookingByRequest(id){return unpack(db.prepare('SELECT * FROM calendar_bookings WHERE requestId=?').get(id));},
  calendarBooking(id){return unpack(db.prepare('SELECT * FROM calendar_bookings WHERE id=?').get(id));},
  bookingByCode(code){return unpack(db.prepare('SELECT b.* FROM calendar_bookings b JOIN booking_codes c ON c.bookingId=b.id WHERE c.code=?').get(normalizeBookingCode(code)));},
  bookingReceipt(id){return db.prepare('SELECT status,updatedAt FROM booking_receipts WHERE id=?').get(id)||{status:'not_sent'};},
  /**
   * claimBookingReceipt: Reclama el envío mediante escritura atómica, evitando dos comprobantes
   * simultáneos.
   * Entrada (firma real): id.
   * Salida: Booleano que indica si este llamador puede enviar.
   */
  claimBookingReceipt(id){return db.prepare("INSERT INTO booking_receipts VALUES(?,'sending',?) ON CONFLICT(id) DO UPDATE SET status='sending',updatedAt=excluded.updatedAt WHERE booking_receipts.status='failed'").run(id,new Date().toISOString()).changes===1;},
  finishBookingReceipt(id,status){db.prepare('UPDATE booking_receipts SET status=?,updatedAt=? WHERE id=?').run(status,new Date().toISOString(),id);},
  calendarBookings(){return db.prepare('SELECT * FROM calendar_bookings ORDER BY slot DESC LIMIT 200').all().map(unpack);},
  /**
   * bookingBlocks: Devuelve intervalos que deben protegerse aunque Google todavía no confirme la
   * escritura.
   * Entrada (firma real): calendarId.
   * Salida: Filas {slot,end} para pending y reserved de ese calendario.
   */
  bookingBlocks(calendarId){return db.prepare("SELECT slot,end FROM calendar_bookings WHERE calendarId=? AND status IN ('pending','reserved') UNION ALL SELECT slot,end FROM booking_transfers WHERE calendarId=? AND status='pending'").all(calendarId,calendarId);},
  /**
   * claimBooking: Dentro de una transacción detecta solapamiento, inserta pending y asigna código
   * único.
   * Entrada (firma real): record.
   * Salida: Registro persistido; HttpError 409 si el horario está ocupado.
   */
  claimBooking(record){db.exec('BEGIN IMMEDIATE');try{
   if(this.bookingBlocks(record.calendarId).some(b=>b.slot<record.end&&b.end>record.slot))throw new HttpError(409,'Ese horario acaba de ocuparse. Elija otro.');
   db.prepare("INSERT INTO calendar_bookings VALUES(?,?,?,?,?,?,'pending',?)").run(record.id,record.requestId,record.sessionHash,record.calendarId,record.slot,record.end,JSON.stringify(record));assignCode(record.id);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}return this.calendarBooking(record.id);},
  setBookingStatus(id,status){
   db.exec('BEGIN IMMEDIATE');try{
    const prior=db.prepare('SELECT status FROM calendar_bookings WHERE id=?').get(id);
    db.prepare('UPDATE calendar_bookings SET status=? WHERE id=?').run(status,id);
    // Mismo commit que la primera confirmación: una caída no pierde ni duplica el aviso.
    if(prior?.status==='pending'&&status==='reserved')for(const recipient of notificationRecipients){const now=new Date().toISOString();db.prepare("INSERT OR IGNORE INTO booking_notifications(bookingId,recipient,status,createdAt,updatedAt) VALUES(?,?,'queued',?,?)").run(id,recipient,now,now);}
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}return this.calendarBooking(id);
  }
 };
}
