/**
 * NEXO · GUÍA DEL MÓDULO: server/audio-policy.js
 * Decidir qué respuestas aprobadas pueden reutilizar audio.
 * Entrada: Texto, reason del servidor, session y scope del contenido vigente.
 * Salida: Hash de contexto, booleano de elegibilidad y memoria acotada de respuestas aprobadas.
 * Estado importante: reusableReasons es una lista cerrada; reusableAudio recuerda hashes; scope
 * cambia con catálogo/configuración.
 * Efectos y límites: Solo muta memoria de sesión. No aceptar cacheable del navegador; datos
 * personales y respuestas dinámicas se excluyen.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {createHash} from 'node:crypto';

// These reasons are produced from approved business data or fixed local instructions,
// never from free model prose, visitor names, lookup results or available slots.
const reusableReasons=new Set(['greeting','courtesy','catalog','faq','hours','payment','service_guidance','guidance_question','guidance_unknown','intent_catalog','intent_faq','intent_hours','intent_payment','intent_greeting','intent_courtesy']);
export const audioScope=(center,services,knowledge)=>createHash('sha256').update(JSON.stringify({center,services,knowledge})).digest('hex');
export const textDigest=text=>createHash('sha256').update(text).digest('hex');
/**
 * reusableText: Rechaza texto vacío/largo y patrones de correo, códigos, UUID, fechas o teléfono.
 * Entrada (firma real): text.
 * Salida: Booleano; es una defensa adicional, no detección perfecta de todo dato personal.
 */
export function reusableText(text){
 return typeof text==='string'&&text.length>0&&text.length<=3000
  &&!/[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|\b[A-Z]{4}-[A-Z]{4}\b|\b\d{4}-\d{2}-\d{2}\b/i.test(text)
  &&!/(?:\+?\d[ ().-]*){7,}/.test(text);
}
/**
 * rememberReusable: Autoriza reutilización solo para respuestas locales elegibles y guarda hasta
 * 24 hashes por sesión.
 * Entrada (firma real): session, text, reason, scope.
 * Salida: Sin valor; cambia session.reusableAudio sin guardar el texto.
 */
export function rememberReusable(session,text,reason,scope){
 if(!reusableReasons.has(reason)||!reusableText(text))return;
 session.reusableAudio ||= new Map();session.reusableAudio.set(textDigest(text),scope);
 while(session.reusableAudio.size>24)session.reusableAudio.delete(session.reusableAudio.keys().next().value);
}
/**
 * canReuseAudio: Exige texto genérico y saludo vigente o hash aprobado en el mismo scope.
 * Entrada (firma real): session, text, scope, greeting.
 * Salida: Booleano de permiso decidido en servidor.
 */
export function canReuseAudio(session,text,scope,greeting){
 return reusableText(text)&&(text===greeting||session.reusableAudio?.get(textDigest(text))===scope);
}
