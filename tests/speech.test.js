/**
 * NEXO · GUÍA DEL MÓDULO: tests/speech.test.js
 * Pruebas unitarias y de integración de speech.
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
import { BrowserSttProvider, BrowserTtsProvider } from '../public/providers/speech.js';

test('STT transcribe parciales y finales y descarta callbacks de sesiones anteriores', () => {
  let instance; const calls = [];
  class Recognition { constructor() { instance = this; } start() {} abort() {} }
  const provider = new BrowserSttProvider({ SpeechRecognition: Recognition });
  provider.start({ onPartial: x => calls.push(['partial', x]), onFinal: x => calls.push(['final', x]), onError: x => calls.push(['error', x]), onEnd: () => calls.push(['end']) });
  const partial = [{ transcript: 'Necesito' }]; partial.isFinal = false;
  instance.onresult({ results: [partial] });
  const final = [{ transcript: 'Necesito un turno' }]; final.isFinal = true;
  instance.onresult({ results: [final] });
  const stale = instance.onresult; provider.stop(); stale({ results: [final] });
  assert.deepEqual(calls, [['partial', 'Necesito'], ['final', 'Necesito un turno']]);
});
test('STT traduce permiso denegado a un error utilizable', () => {
  let instance, error;
  class Recognition { constructor() { instance = this; } start() {} abort() {} }
  const provider = new BrowserSttProvider({ SpeechRecognition: Recognition });
  provider.start({ onPartial() {}, onFinal() {}, onEnd() {}, onError: x => { error = x; } });
  instance.onerror({ error: 'not-allowed' }); assert.match(error, /No se autorizó/); provider.stop();
});
test('TTS selecciona voz española y cancela callbacks al terminar sesión', () => {
  let utterance, started = 0, ended = 0, cancelled = 0;
  const voice = { lang: 'es-ES', localService: true };
  const provider = new BrowserTtsProvider({ SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } }, speechSynthesis: { getVoices: () => [voice], cancel: () => cancelled++, speak: value => { utterance = value; } } });
  provider.speak('Hola', { onStart: () => started++, onEnd: () => ended++ });
  utterance.onstart(); assert.equal(started, 1); assert.equal(utterance.voice, voice);
  provider.stop(); utterance.onend(); assert.equal(ended, 0); assert.ok(cancelled >= 2);
});
test('sin APIs de voz conserva fallback explícito', () => {
  assert.equal(new BrowserSttProvider({}).available, false);
  const tts = new BrowserTtsProvider({}); assert.equal(tts.available, false);
  let error; tts.speak('hola', { onError: e => { error = e; } }); assert.match(error, /Lee la respuesta/);
});

test('STT no confirma una frase mientras todavía contiene un fragmento parcial',()=>{
 let instance;const events=[];
 class Recognition {constructor(){instance=this;}start(){}abort(){}}
 const provider=new BrowserSttProvider({SpeechRecognition:Recognition});
 provider.start({onPartial:text=>events.push(['partial',text]),onFinal:text=>events.push(['final',text]),onError(){},onEnd(){}});
 const a=[{transcript:'Quiero clases'}];a.isFinal=true;
 const b=[{transcript:'por la tarde'}];b.isFinal=false;
 instance.onresult({results:[a,b]});assert.deepEqual(events,[['partial','Quiero clases por la tarde']]);
 b.isFinal=true;instance.onresult({results:[a,b]});assert.deepEqual(events.at(-1),['final','Quiero clases por la tarde']);provider.stop();
});
