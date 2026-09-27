/**
 * NEXO · GUÍA DEL MÓDULO: tests/auto-conversation.test.js
 * Pruebas unitarias y de integración de auto conversation.
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
import {CallConversation} from '../public/call-conversation.js';
function setup() {
 const timers=new Map(),events=[],sent=[];let seq=0;
 const c=new CallConversation({listen:()=>events.push('listen'),stopListening:()=>events.push('stop'),send:async text=>sent.push(text),paused:text=>events.push(text),clock:{setTimeout(fn,ms){timers.set(++seq,{fn,ms});return seq;},clearTimeout(id){timers.delete(id);}}});
 const tick=async()=>{const [id,t]=timers.entries().next().value||[];assert.ok(t,'Pending timer required');timers.delete(id);t.fn();await Promise.resolve();};
 return{c,timers,events,sent,tick};
}
test('al iniciar llamada espera el saludo y escucha sin pulsar el micrófono',async()=>{
 const f=setup();f.c.enable({waitForReply:true});assert.equal(f.c.enabled,true);assert.equal(f.events.includes('listen'),false);
 f.c.speaking();f.c.final('eco del saludo');assert.deepEqual(f.sent,[]);f.c.replyEnded();await f.tick();assert.deepEqual(f.events.filter(e=>e==='listen'),['listen']);
});
test('pausar o colgar durante el saludo impide la primera escucha',()=>{
 const f=setup();f.c.enable({waitForReply:true});f.c.speaking();f.c.pause();f.c.replyEnded();assert.equal(f.timers.size,0);assert.equal(f.events.includes('listen'),false);
});
test('envía solo texto final una vez y espera al fin de la respuesta para reabrir',async()=>{
 const f=setup();f.c.enable();f.c.started();f.c.partial();assert.equal(f.timers.size,0);f.c.final('  ¿Cuánto dura?  ');f.c.final('¿Cuánto dura?');f.c.ended();assert.equal(f.timers.size,1);await f.tick();assert.deepEqual(f.sent,['¿Cuánto dura?']);assert.equal(f.c.phase,'thinking');assert.equal(f.timers.size,0);
 f.c.speaking();f.c.final('eco');assert.equal(f.timers.size,0);f.c.replyEnded();assert.equal([...f.timers.values()][0].ms,650);await f.tick();assert.equal(f.c.phase,'starting');assert.equal(f.events.filter(e=>e==='listen').length,2);
});
test('seguir hablando cancela la frase pendiente, y pausa evita envíos tardíos',async()=>{
 const f=setup();f.c.enable();f.c.started();f.c.final('Quiero');const stale=[...f.timers.values()][0].fn;f.c.partial();assert.equal(f.timers.size,0);stale();await Promise.resolve();assert.deepEqual(f.sent,[]);
 f.c.final('Quiero clases');f.c.pause();assert.equal(f.timers.size,0);assert.equal(f.c.enabled,false);assert.deepEqual(f.sent,[]);
});
test('cerrar mientras habla o espera cancela la reapertura automática',async()=>{
 const f=setup();f.c.enable();f.c.speaking();f.c.replyEnded();const stale=[...f.timers.values()][0].fn;f.c.pause();stale();f.c.replyEnded();assert.equal(f.timers.size,0);assert.equal(f.events.filter(e=>e==='listen').length,1);
});
test('sin una frase completa se pausa y no gasta consultas',()=>{
 for(const partial of [false,true]){const f=setup();f.c.enable();f.c.started();if(partial)f.c.partial();f.c.ended();assert.equal(f.c.enabled,false);assert.deepEqual(f.sent,[]);assert.equal(f.timers.size,0);}
});
test('texto o replay interrumpen una transcripción pendiente',()=>{
 const f=setup();f.c.enable();f.c.final('Pendiente');f.c.thinking();assert.equal(f.timers.size,0);f.c.speaking();assert.equal(f.timers.size,0);assert.deepEqual(f.sent,[]);
});
