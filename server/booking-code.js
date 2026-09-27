/**
 * NEXO · GUÍA DEL MÓDULO: server/booking-code.js
 * Generar y normalizar códigos de reserva legibles.
 * Entrada: Texto introducido por el visitante, o ninguna entrada para generar.
 * Salida: Código aleatorio, normalizado o formateado; booleano de formato válido.
 * Estado importante: El alfabeto evita caracteres confusos; el guion es presentación, no parte de
 * la identidad.
 * Efectos y límites: Usa azar criptográfico; la unicidad se verifica en SQLite, no se presupone
 * por ser aleatorio.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {randomInt} from 'node:crypto';

// Public reference only; internal UUIDs remain stable for Calendar and retries.
const alphabet='ABCDEFGHJKMNPQRSTUVWXYZ';
export const normalizeBookingCode=value=>String(value).replace(/[\s-]/g,'').toUpperCase();
export const isBookingCode=value=>/^[ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(normalizeBookingCode(value));
export const formatBookingCode=value=>value.slice(0,4)+'-'+value.slice(4);
export const newBookingCode=()=>Array.from({length:8},()=>alphabet[randomInt(alphabet.length)]).join('');
