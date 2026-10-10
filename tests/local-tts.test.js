/**
 * NEXO · GUÍA DEL MÓDULO: tests/local-tts.test.js
 * Pruebas unitarias y de integración de local tts.
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
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {readConfig} from '../server/config.js';
import { LocalTtsService, pcmToWav } from '../server/providers/local-tts.js';
import { mouthTimeline, mouthBlend, smoothSpeechLevel } from '../public/providers/local-speech.js';
function fixture() {
  let child, argumentsUsed;
  const service = new LocalTtsService({ available: true, spawnImpl: (...args) => {
    argumentsUsed = args; child = new EventEmitter();
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = () => { child.killed = true; }; return child;
  } });
  return { service, get child() { return child; }, get args() { return argumentsUsed; } };
}
test('PCM local contiene cabecera WAV y duración correctas', () => {
  const wav = pcmToWav(Buffer.alloc(44100)); assert.equal(wav.toString('ascii',0,4),'RIFF');
  assert.equal(wav.readUInt32LE(24),22050); assert.equal(wav.readUInt32LE(40),44100); assert.equal(wav.length,44144);
});
test('Piper recibe texto solo por stdin, usa voz masculina y no abre un shell', async () => {
  const f=fixture(); const promise=f.service.synthesize('Hola; $(no ejecutar)',{owner:'a'});
  assert.equal(f.args[2].shell,false); assert.equal(f.args[2].windowsHide,true);
  assert.ok(!f.args[1].includes('Hola; $(no ejecutar)')); assert.equal(f.args[1][3],'0');
  assert.match(f.child.stdin.read().toString(),/Hola; \$\(no ejecutar\)/);
  f.child.stdout.write(Buffer.alloc(4410));f.child.emit('close',0);
  const result=await promise;assert.equal(result.duration,.1);assert.equal(result.provider,'piper-local');
});

test('perfiles validados separan identidad de caché aunque compartan el modelo español',async()=>{
 assert.equal(readConfig({}).localTts.voiceProfile,'male');assert.equal(readConfig({PIPER_VOICE_PROFILE:'female'}).localTts.voiceProfile,'female');
 assert.throws(()=>readConfig({PIPER_VOICE_PROFILE:'otro'}));assert.throws(()=>new LocalTtsService({voiceProfile:'__proto__'}));
 const root=await mkdtemp(join(tmpdir(),'nexo-voice-profile-'));
 try{
  const engine=join(root,'piper');await writeFile(engine,'test engine');
  const names=['es_ES-sharvard-medium','en_US-bryce-medium','fr_FR-upmc-medium','en_US-ljspeech-high','fr_FR-siwis-medium'];
  for(const name of names){await writeFile(join(root,name+'.onnx'),'test model '+name);await writeFile(join(root,name+'.onnx.json'),'{}');}
  const male=new LocalTtsService({executable:engine,voicesDirectory:root}),female=new LocalTtsService({executable:engine,voicesDirectory:root,voiceProfile:'female'});
  for(const language of ['es','en','fr']){const a=await male.cacheIdentity(language),b=await female.cacheIdentity(language);assert.notDeepEqual(a,b);assert.equal(male.status(language).voiceProfile,'male');}
  const a=await male.cacheIdentity('es'),b=await female.cacheIdentity('es');assert.equal(a.modelHash,b.modelHash);assert.equal(a.speaker,'0');assert.equal(b.speaker,'1');
 }finally{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep));await rm(root,{recursive:true,force:true});}
});
test('cancelar voz mata el proceso, descarta resultado tardío y aísla propietario', async () => {
  const f=fixture(), controller=new AbortController();
  const promise=f.service.synthesize('hola',{owner:'a',signal:controller.signal});
  f.service.stop('b');assert.equal(f.child.killed,undefined);
  controller.abort();await assert.rejects(promise,error=>error.status===409);assert.equal(f.child.killed,true);
  f.child.emit('close',0);assert.equal(f.service.job,null);
});
test('voz limita concurrencia y comunica instalación ausente', async () => {
  await assert.rejects(new LocalTtsService({available:false}).synthesize('hola'),e=>e.status===503);
  const f=fixture();const first=f.service.synthesize('hola',{owner:'a'});
  await assert.rejects(f.service.synthesize('otra',{owner:'b'}),e=>e.status===409);
  f.service.close();await assert.rejects(first,e=>e.status===409);
});
test('fallo de Piper no devuelve audio ni filtra diagnósticos internos', async () => {
  const f=fixture();const result=f.service.synthesize('hola');f.child.emit('close',1);
  await assert.rejects(result,e=>e.status===503 && !e.message.includes('runtime'));
});
test('formas españolas cubren vocales y cierre de labios con tiempos monotónicos', () => {
  const timeline=mouthTimeline('Mamá, pide un turno.',3);
  assert.equal(timeline[0].shape,'PP');assert.ok(timeline.some(x=>x.shape==='aa'));
  assert.ok(timeline.some(x=>x.shape==='U'));assert.ok(Math.abs(timeline.at(-1).end-3)<.00001);
  for (let i=1;i<timeline.length;i++) assert.equal(timeline[i].start,timeline[i-1].end);
  assert.deepEqual(mouthTimeline('',3),[]);
});

test('labios mezclan formas continuas en lugar de saltar al cambiar de sonido', () => {
  const timeline = [{shape:'aa',start:0,end:.2},{shape:'O',start:.2,end:.4}];
  const middle = mouthBlend(timeline,.2);
  assert.ok(middle.aa > .1 && middle.O > .1);
  assert.ok(Math.abs(middle.aa + middle.O - 1) < .00001);
  const before = mouthBlend(timeline,.199), after = mouthBlend(timeline,.201);
  assert.ok(Math.abs(before.aa - after.aa) < .08);
  assert.deepEqual(mouthBlend(timeline,.4),{});
});
test('un pico de volumen se suaviza y una pausa termina con boca en reposo', () => {
  const attack = smoothSpeechLevel(0,1,1/60);
  assert.ok(attack > 0 && attack < .2);
  let level = .5;
  for (let i=0;i<60;i++) level=smoothSpeechLevel(level,0,1/60);
  assert.ok(level < .001);
  assert.equal(smoothSpeechLevel(.2,.5,0),.2);
});
