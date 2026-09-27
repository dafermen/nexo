/**
 * NEXO · GUÍA DEL MÓDULO: tests/microphone.test.js
 * Pruebas unitarias y de integración de microphone.
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
import {BrowserSttProvider} from '../public/providers/speech.js';
function fixture(){
 let instance;const events=[],timers=new Map();let sequence=0;
 class Recognition{constructor(){instance=this;}start(){}abort(){this.aborted=true;}}
 const p=new BrowserSttProvider({SpeechRecognition:Recognition,setTimeout(fn,delay){const id=++sequence;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);}});
 p.start({onStart:()=>events.push('start'),onEnd:()=>events.push('end'),onError:message=>events.push(message),onPartial:()=>{},onFinal:()=>{}});
 return{p,events,timers,get instance(){return instance;}};
}
test('micrófono solo confirma escucha cuando el navegador confirma inicio',()=>{
 const f=fixture();assert.deepEqual(f.events,[]);assert.equal([...f.timers.values()][0].delay,12000);
 f.instance.onstart();assert.deepEqual(f.events,['start']);assert.equal([...f.timers.values()][0].delay,20000);f.p.stop();assert.equal(f.timers.size,0);
});
test('fallo network aborta escucha inmediatamente aunque no llegue onend',()=>{
 const f=fixture();f.instance.onstart();const stale=f.instance.onstart;
 f.instance.onerror({error:'network'});assert.equal(f.instance.aborted,true);assert.equal(f.p.recognition,null);assert.equal(f.events.at(-1),'end');assert.match(f.events[1],/Chrome/);assert.equal(f.timers.size,0);
 stale();assert.equal(f.events.length,3);
});
test('silencio del proveedor termina con un aviso y no deja micrófono activo',()=>{
 for(const started of [false,true]){const f=fixture();if(started)f.instance.onstart();[...f.timers.values()][0].fn();assert.equal(f.p.recognition,null);assert.equal(f.events.at(-1),'end');assert.match(f.events.at(-2),/Chrome/);assert.equal(f.timers.size,0);}
});
test('finalización del navegador y cierre manual limpian temporizadores',()=>{
 const f=fixture();f.instance.onstart();f.instance.onend();assert.deepEqual(f.events,['start','end']);assert.equal(f.timers.size,0);
 const g=fixture();const stale=[...g.timers.values()][0].fn;g.p.stop();stale();assert.deepEqual(g.events,[]);
});
