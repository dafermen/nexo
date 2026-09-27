/**
 * NEXO · GUÍA DEL MÓDULO: server/db.js
 * Abrir SQLite y componer el repositorio de persistencia.
 * Entrada: path de la base o :memory: en pruebas.
 * Salida: repo con métodos de catálogo, configuración, auditoría y almacenes especializados; close
 * libera la conexión.
 * Estado importante: db es DatabaseSync; revision evita sobrescribir cambios ajenos; priceCents
 * expresa centavos; requestId identifica reintentos.
 * Efectos y límites: Crea tablas si faltan. BEGIN IMMEDIATE/COMMIT/ROLLBACK hacen atómicas las
 * operaciones locales. El catálogo inicial y appointments pertenecen a la demo base;
 * centerRepository adapta el negocio activo.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {createAgendaStore} from './admin-agenda.js';
import {createNotificationStore} from './booking-notifications.js';
import {createReportStore} from './admin-reports.js';
import {encryptedSnapshot} from './database-backup.js';
import {createAudioStore} from './audio-store.js';
import {createCalendarStore} from './calendar-store.js';
import {createBookingStore} from './booking-store.js';
import {createConversationStore} from './conversation-store.js';
import {createReviewStore} from './review-store.js';
import {createAdminStore} from './admin-store.js';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from './errors.js';

export const initialServices = [
  { id: 'orientacion', name: 'Orientación general', category: 'TE AYUDAMOS A EMPEZAR', description: 'Resuelve dudas y encuentra el área que necesitas.', duration: 20, priceCents: 0, currency: 'USD', icon: 'compass', requirements: 'No necesitas documentación para una consulta inicial.' },
  { id: 'tramites', name: 'Gestión de trámites', category: 'TODO EN UN MISMO LUGAR', description: 'Recibe ayuda para iniciar y revisar tus solicitudes.', duration: 30, priceCents: 1500, currency: 'USD', icon: 'document', requirements: 'Trae la referencia de tu trámite si ya tienes una. No la escribas en el chat.' },
  { id: 'asesoria', name: 'Asesoría personalizada', category: 'UN ESPACIO PARA TI', description: 'Reserva una sesión individual con nuestro equipo.', duration: 40, priceCents: 2500, currency: 'USD', icon: 'spark', requirements: 'Cuéntale al personal el motivo de tu visita al llegar.' },
];

const serviceRow = r => r && ({ ...r, active: !!r.active });
/**
 * createRepository: Abre la conexión, asegura el esquema y reúne los almacenes bajo una interfaz
 * compartida.
 * Entrada (firma real): path.
 * Salida: Repositorio; llamar close al terminar.
 */
export function createRepository(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_daily_usage (
      provider TEXT NOT NULL, day TEXT NOT NULL, calls INTEGER NOT NULL CHECK(calls>=0),
      PRIMARY KEY(provider,day)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS ai_daily_usage (
      day TEXT PRIMARY KEY, calls INTEGER NOT NULL DEFAULT 0 CHECK(calls>=0),
      inputTokens INTEGER NOT NULL DEFAULT 0, outputTokens INTEGER NOT NULL DEFAULT 0
    ) STRICT;
    CREATE TABLE IF NOT EXISTS center_settings (
      id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL,
      document TEXT NOT NULL, updatedAt TEXT NOT NULL
    ) STRICT;
    PRAGMA foreign_keys=ON;
    PRAGMA journal_mode=WAL;
    PRAGMA secure_delete=ON;
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      description TEXT NOT NULL, duration INTEGER NOT NULL,
      priceCents INTEGER NOT NULL CHECK(priceCents>=0), currency TEXT NOT NULL,
      icon TEXT NOT NULL, requirements TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY, requestId TEXT NOT NULL UNIQUE,
      sessionHash TEXT NOT NULL, serviceId TEXT NOT NULL REFERENCES services(id),
      serviceName TEXT NOT NULL, customerName TEXT NOT NULL, email TEXT NOT NULL,
      slot TEXT NOT NULL, priceCents INTEGER NOT NULL, currency TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('reserved','cancelled')),
      consentVersion TEXT NOT NULL, createdAt TEXT NOT NULL
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS occupied_slots ON appointments(serviceId,slot) WHERE status='reserved';
    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY, action TEXT NOT NULL, entityId TEXT NOT NULL, createdAt TEXT NOT NULL
    ) STRICT;
  `);
  const insert = db.prepare('INSERT OR IGNORE INTO services (id,name,category,description,duration,priceCents,currency,icon,requirements) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const s of initialServices) insert.run(s.id, s.name, s.category, s.description, s.duration, s.priceCents, s.currency, s.icon, s.requirements);
  const audit = (action, id) => db.prepare('INSERT INTO audit_events(action,entityId,createdAt) VALUES (?,?,?)').run(action, id, new Date().toISOString());
  const repo = {
    ...createAudioStore(db),
    ...createAdminStore(db),
    ...createCalendarStore(db),
    ...createBookingStore(db),
    ...createNotificationStore(db),
    ...createAgendaStore(db),
    ...createConversationStore(db),
    ...createReviewStore(db),
    ...createReportStore(db),
    encryptedBackup: password => encryptedSnapshot(db,password),
    /**
     * reserveAiCall: Incrementa atómicamente el contador diario solo si queda presupuesto.
     * Entrada (firma real): day, limit.
     * Salida: Booleano: true significa que la consulta ya fue contabilizada.
     */
    // Reserva antes de llamar al proveedor: los fallos también consumen el cupo preventivo.
    reserveProviderCall(provider,day,limit){
      if(!Number.isInteger(limit)||limit<1)return false;
      return db.prepare('INSERT INTO provider_daily_usage VALUES (?,?,1) ON CONFLICT(provider,day) DO UPDATE SET calls=calls+1 WHERE calls < ?').run(provider,day,limit).changes===1;
    },
    reserveAiCall(day, limit) {
      return db.prepare('INSERT INTO ai_daily_usage(day,calls) VALUES (?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1 WHERE calls < ?').run(day,limit).changes === 1;
    },
    aiUsage(day) { return db.prepare('SELECT day,calls,inputTokens,outputTokens FROM ai_daily_usage WHERE day=?').get(day) || {day,calls:0,inputTokens:0,outputTokens:0}; },
    /**
     * recordAiTokens: Suma uso reportado por el proveedor únicamente si ambos contadores son enteros
     * no negativos.
     * Entrada (firma real): day, usage.
     * Salida: Sin valor; modifica ai_daily_usage.
     */
    recordAiTokens(day, usage) {
      if (Number.isSafeInteger(usage?.input_tokens) && usage.input_tokens>=0 && Number.isSafeInteger(usage?.output_tokens) && usage.output_tokens>=0) db.prepare('UPDATE ai_daily_usage SET inputTokens=inputTokens+?,outputTokens=outputTokens+? WHERE day=?').run(usage.input_tokens,usage.output_tokens,day);
    },
    ensureCenterSettings(initial) {
      db.prepare('INSERT OR IGNORE INTO center_settings VALUES (1,1,?,?)').run(JSON.stringify(initial), new Date().toISOString());
    },
    readCenterSettings() {
      const row = db.prepare('SELECT * FROM center_settings WHERE id=1').get();
      return row ? { ...JSON.parse(row.document), revision: row.revision, updatedAt: row.updatedAt } : null;
    },
    /**
     * updateCenterSettings: Exige la revision que leyó el editor y aplica transform dentro de una
     * transacción; un error revierte todo.
     * Entrada (firma real): revision, transform.
     * Salida: Nueva configuración con revision incrementada; HttpError 409 si hubo edición
     * concurrente.
     */
    updateCenterSettings(revision, transform) {
      if (!Number.isSafeInteger(revision) || revision < 1) throw new HttpError(400, 'Versión de datos inválida. Actualice el panel.');
      db.exec('BEGIN IMMEDIATE');
      try {
        const current = repo.readCenterSettings();
        if (current.revision !== revision) throw new HttpError(409, 'Otra ventana modificó los datos. Cierre el editor y actualice el panel antes de volver a guardar.');
        const next = transform(current);
        db.prepare('UPDATE center_settings SET document=?, revision=revision+1, updatedAt=? WHERE id=1').run(JSON.stringify({ profile: next.profile, services: next.services, configuration: next.configuration, configurationRevision: next.configurationRevision }), new Date().toISOString());
        audit('center.updated', 'configuration');
        db.exec('COMMIT');
        return repo.readCenterSettings();
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    listServices: (all = false) => db.prepare(`SELECT * FROM services ${all ? '' : 'WHERE active=1'} ORDER BY rowid`).all().map(serviceRow),
    getService: id => serviceRow(db.prepare('SELECT * FROM services WHERE id=?').get(id)),
    /**
     * slots: Genera horarios del catálogo de demostración base y descarta los ocupados en
     * appointments.
     * Entrada (firma real): serviceId, now = new Date().
     * Salida: Array de instantes ISO; no es la agenda real de Google.
     */
    slots(serviceId, now = new Date()) {
      const occupied = new Set(db.prepare("SELECT slot FROM appointments WHERE serviceId=? AND status='reserved'").all(serviceId).map(r => r.slot));
      const slots = [];
      const day = new Date(now); day.setHours(0, 0, 0, 0);
      for (let count = 0, offset = 1; count < 5; offset++) {
        const date = new Date(day); date.setDate(day.getDate() + offset);
        if ([0, 6].includes(date.getDay())) continue;
        count++;
        for (const hour of [9, 10, 11, 14, 15]) {
          date.setHours(hour, 0, 0, 0);
          const iso = date.toISOString();
          if (!occupied.has(iso)) slots.push(iso);
        }
      }
      return slots;
    },
    /**
     * reserve: Registra el turno de la demo base con precio y disponibilidad verificados; el mismo
     * requestId no crea otra reserva.
     * Entrada (firma real): { requestId, sessionHash, serviceId, customerName, email, slot,
     * expectedPriceCents }.
     * Salida: Fila de appointments; no usar este método como confirmación Google.
     */
    reserve({ requestId, sessionHash, serviceId, customerName, email, slot, expectedPriceCents }) {
      const prior = db.prepare('SELECT * FROM appointments WHERE requestId=?').get(requestId);
      if (prior) {
        if (prior.sessionHash !== sessionHash || prior.serviceId !== serviceId || prior.slot !== slot || prior.customerName !== customerName || prior.email !== email || prior.priceCents !== expectedPriceCents) {
          throw new HttpError(409, 'Este identificador ya se utilizó para otra solicitud.');
        }
        if (prior.status === 'cancelled') throw new HttpError(409, 'Este turno fue cancelado. Elige un horario para una reserva nueva.');
        return prior;
      }
      const service = repo.getService(serviceId);
      if (!service?.active) throw new HttpError(404, 'Este servicio ya no está disponible.');
      if (service.priceCents !== expectedPriceCents) throw new HttpError(409, 'El precio cambió. Cierra y vuelve a abrir el servicio para revisarlo.');
      if (!repo.slots(serviceId).includes(slot)) throw new HttpError(409, 'Este horario ya no está disponible. Elige otro.');
      const id = randomUUID();
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`INSERT INTO appointments VALUES (?,?,?,?,?,?,?,?,?,?, 'reserved','2026-09-v1',?)`).run(
          id, requestId, sessionHash, serviceId, service.name, customerName, email, slot,
          service.priceCents, service.currency, new Date().toISOString(),
        );
        audit('appointment.reserved', id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        if (String(error.message).includes('UNIQUE')) throw new HttpError(409, 'Este horario acaba de ocuparse. Elige otro.');
        throw error;
      }
      return db.prepare('SELECT * FROM appointments WHERE id=?').get(id);
    },
    listAppointments: () => db.prepare('SELECT id, serviceName, customerName, email, slot, priceCents, currency, status, createdAt FROM appointments ORDER BY createdAt DESC LIMIT 200').all(),
    cancel(id) {
      db.exec('BEGIN IMMEDIATE');
      try {
        if (!db.prepare("UPDATE appointments SET status='cancelled' WHERE id=? AND status='reserved'").run(id).changes) throw new HttpError(404, 'Reserva activa no encontrada.');
        audit('appointment.cancelled', id);
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    setServiceActive(id, active) {
      db.exec('BEGIN IMMEDIATE');
      try {
        if (!db.prepare('UPDATE services SET active=? WHERE id=?').run(Number(active), id).changes) throw new HttpError(404, 'Servicio no encontrado.');
        audit(active ? 'service.enabled' : 'service.disabled', id);
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    /**
     * purge: Elimina datos antiguos de la demo y limpia autenticación; no borra reservas futuras por
     * haber sido creadas hace tiempo.
     * Entrada (firma real): retentionDays = 7, now = new Date().
     * Salida: Cantidad de appointments eliminados.
     */
    purge(retentionDays = 7, now = new Date()) {
      repo.purgeAdministratorData(now.getTime());
      const cutoff = new Date(now.getTime() - retentionDays * 86400_000).toISOString();
      // Retain a future appointment until seven days after its scheduled time.
      const result = db.prepare('DELETE FROM appointments WHERE slot < ? AND createdAt < ?').run(cutoff, cutoff);
      db.prepare('DELETE FROM audit_events WHERE createdAt < ?').run(cutoff);
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      return result.changes;
    },
    close: () => db.close(),
  };
  return repo;
}
