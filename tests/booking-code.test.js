/**
 * NEXO · GUÍA DEL MÓDULO: tests/booking-code.test.js
 * Pruebas unitarias y de integración de booking code.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createBookingStore} from '../server/booking-store.js';
import {newBookingCode,isBookingCode,normalizeBookingCode} from '../server/booking-code.js';
const record=(id,slot='2026-09-28T12:00:00Z')=>({id,requestId:id,sessionHash:'test',calendarId:'test-calendar',slot,end:new Date(Date.parse(slot)+3600000).toISOString(),email:'test@example.test',marker:'keep-marker'});
test('códigos aleatorios de ocho letras sin caracteres ambiguos; normalización flexible',()=>{
 for(let n=0;n<100;n++)assert.match(newBookingCode(),/^[ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
 assert.equal(normalizeBookingCode(' abcd efgh '),'ABCDEFGH');assert.ok(isBookingCode('abcd-efgh'));assert.ok(!isBookingCode('ABCD-1234'));assert.ok(!isBookingCode('ABCD-EFGI'));
});
test('migración de reservas anteriores es persistente, mantiene UUID y datos y resuelve colisiones',()=>{
 const db=new DatabaseSync(':memory:');try{
 createBookingStore(db);
 for(const id of ['old-a','old-b']){const r=record(id);db.prepare("INSERT INTO calendar_bookings VALUES(?,?,?,?,?,?,'reserved',?)").run(r.id,r.requestId,r.sessionHash,r.calendarId,r.slot,r.end,JSON.stringify(r));}
 const codes=['ABCDEFGH','ABCDEFGH','JKMNPQRS'];let attempts=0;
 const store=createBookingStore(db,{generateCode:()=>codes[attempts++]});assert.equal(attempts,3);
 assert.equal(store.calendarBooking('old-a').code,'ABCD-EFGH');assert.equal(store.calendarBooking('old-b').code,'JKMN-PQRS');assert.equal(store.bookingByCode(' abcd efgh ').id,'old-a');
 assert.equal(store.calendarBooking('old-a').marker,'keep-marker');assert.equal(store.calendarBooking('old-a').status,'reserved');
 const again=createBookingStore(db,{generateCode:()=>{throw Error('No regeneration');}});assert.equal(again.calendarBooking('old-a').code,'ABCD-EFGH');
 }finally{db.close();}
});
test('reserva nueva recibe código único; agotamiento de colisiones revierte la reserva',()=>{
 const db=new DatabaseSync(':memory:');try{
 const store=createBookingStore(db,{generateCode:()=> 'ABCDEFGH'});const a=store.claimBooking(record('a'));assert.equal(a.code,'ABCD-EFGH');
 assert.throws(()=>store.claimBooking(record('b','2026-09-28T14:00:00Z')),/único/);assert.equal(store.calendarBooking('b'),undefined);assert.equal(store.calendarBookings().length,1);
 }finally{db.close();}
});
