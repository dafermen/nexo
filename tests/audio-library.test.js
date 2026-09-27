/**
 * NEXO · GUÍA DEL MÓDULO: tests/audio-library.test.js
 * Pruebas unitarias y de integración de audio library.
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
import {mkdtemp,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {once} from 'node:events';
import {createRepository} from '../server/db.js';
import {AudioLibrary} from '../server/audio-library.js';
import {rememberReusable,canReuseAudio,reusableText} from '../server/audio-policy.js';
import {pcmToWav} from '../server/providers/local-tts.js';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
import {readConfig} from '../server/config.js';

async function fixture(t,options={}){
 const closers=[];const root=await mkdtemp(join(tmpdir(),'nexo-audio-test-')),repo=createRepository(join(root,'test.sqlite'));
 let calls=0,time=100000,voice='voice-one';const provider={status:()=>({available:true}),cacheIdentity:async lang=>({provider:'fake',voice,lang,speed:1}),synthesize:async()=>{calls++;return {provider:'piper-local',audioBase64:pcmToWav(Buffer.alloc(4410,calls)).toString('base64'),duration:.1};},stop(){},close(){}};
 const directory=join(root,'audio-cache'),library=new AudioLibrary({repository:repo,provider,directory,now:()=>time,...options});
 t.after(async()=>{for(const close of closers)await close();await library.queue;repo.close();assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep));await rm(root,{recursive:true,force:true});});
 return {closeFirst:fn=>closers.push(fn),root,repo,library,provider,directory,get calls(){return calls;},setVoice:v=>voice=v,advance:ms=>time+=ms,options:{owner:'session-one',language:'es',cacheable:true,scope:'approved-v1'}};
}
test('audio compartido persiste en SQLite y WAV sin guardar el texto ni el visitante',async t=>{
 const f=await fixture(t),first=await f.library.synthesize('Hola, ¿qué desea consultar?',f.options);
 const second=await f.library.synthesize('Hola, ¿qué desea consultar?',{...f.options,owner:'session-two'});assert.deepEqual(first,second);assert.equal(f.calls,1);
 const other=new AudioLibrary({repository:f.repo,provider:f.provider,directory:f.directory,now:()=>100001});assert.deepEqual(await other.synthesize('Hola, ¿qué desea consultar?',f.options),first);
 assert.equal(f.calls,1);assert.equal((await other.status()).hits,2);assert.equal(f.repo.audioEntries().length,1);
 assert.doesNotMatch(JSON.stringify(f.repo.audioEntries()),/Hola|session-one|voice-one/);assert.deepEqual(await readdir(f.directory),[f.repo.audioEntries()[0].key+'.wav']);
});
test('texto, idioma, voz y revisión comercial nunca reutilizan el audio anterior',async t=>{
 const f=await fixture(t);await f.library.synthesize('Precio 50 USD',f.options);await f.library.synthesize('Precio 60 USD',f.options);
 await f.library.synthesize('Precio 60 USD',{...f.options,language:'fr'});f.setVoice('voice-two');await f.library.synthesize('Precio 60 USD',{...f.options,language:'fr'});
 await f.library.synthesize('Precio 60 USD',{...f.options,language:'fr',scope:'approved-v2'});assert.equal(f.calls,5);
});
test('presupuesto elimina primero el menos usado y caducidad elimina audios antiguos',async t=>{
 const f=await fixture(t,{maxBytes:9000,ttlDays:1});await f.library.synthesize('A',f.options);f.advance(1);await f.library.synthesize('B',f.options);f.advance(1);await f.library.synthesize('A',f.options);f.advance(1);await f.library.synthesize('C',f.options);
 assert.equal((await f.library.status()).entries,2);assert.ok((await f.library.status()).bytes<=9000);
 await f.library.synthesize('B',f.options);assert.equal(f.calls,4);f.advance(86400000);assert.equal((await f.library.status()).entries,0);assert.equal((await readdir(f.directory)).length,0);
});
test('archivo corrupto o perdido se regenera, huérfanos se limpian al iniciar',async t=>{
 const f=await fixture(t);await f.library.synthesize('Hola',f.options);const path=join(f.directory,f.repo.audioEntries()[0].key+'.wav');
 const bytes=await readFile(path);bytes[60]^=1;await writeFile(path,bytes);await f.library.synthesize('Hola',f.options);assert.equal(f.calls,2);
 await rm(path);await f.library.synthesize('Hola',f.options);assert.equal(f.calls,3);
 const orphan=join(f.directory,'a'.repeat(64)+'.wav');await writeFile(orphan,bytes);const reopened=new AudioLibrary({repository:f.repo,provider:f.provider,directory:f.directory,now:()=>100000});await reopened.status();assert.ok(!(await readdir(f.directory)).includes('a'.repeat(64)+'.wav'));
});
test('política no confía en texto arbitrario, IA libre, citas o identificadores personales',()=>{
 const session={};for(const reason of ['ai','agenda_options','booking','intent_unknown']){rememberReusable(session,'Texto privado',reason,'v1');assert.equal(canReuseAudio(session,'Texto privado','v1','Saludo'),false);}
 rememberReusable(session,'Curso de 5 horas. Precio 50 USD.','catalog','v1');assert.equal(canReuseAudio(session,'Curso de 5 horas. Precio 50 USD.','v1','Saludo'),true);assert.equal(canReuseAudio(session,'Curso de 5 horas. Precio 50 USD.','v2','Saludo'),false);
 for(const text of ['Correo name@example.test','Teléfono +1 (555) 123-4567','Cita ABCD-EFGH','Cita 2026-10-01'])assert.equal(reusableText(text),false);
 assert.equal(canReuseAudio({},'Saludo','v1','Saludo'),true);assert.equal(canReuseAudio({},'Inventado','v1','Saludo'),false);
});
test('bypass, falta de identidad, disco no utilizable y desactivación mantienen la voz',async t=>{
 const f=await fixture(t);await f.library.synthesize('Privado',{...f.options,cacheable:false});assert.equal(f.repo.audioEntries().length,0);
 f.provider.cacheIdentity=async()=>{throw Error('Unavailable fingerprint');};await f.library.synthesize('Hola',f.options);assert.equal(f.repo.audioEntries().length,0);
 const file=join(f.root,'not-a-folder');await writeFile(file,'keep');const unavailable=new AudioLibrary({repository:f.repo,provider:{...f.provider,cacheIdentity:async()=>({voice:1})},directory:file});await unavailable.synthesize('Hola',f.options);assert.equal(await readFile(file,'utf8'),'keep');
 const disabled=new AudioLibrary({repository:f.repo,provider:f.provider,directory:f.directory,enabled:false});await disabled.synthesize('Hola',f.options);assert.equal(f.calls,4);
});
test('cancelación y vaciado durante generación no guardan resultados tardíos',async t=>{
 const f=await fixture(t);let release,started;const begun=new Promise(r=>started=r);
 f.provider.synthesize=()=>new Promise(r=>{release=()=>r({provider:'piper-local',audioBase64:pcmToWav(Buffer.alloc(4410)).toString('base64'),duration:.1});started();});
 const pending=f.library.synthesize('Hola',f.options);await begun;await f.library.clear();release();await pending;assert.equal(f.repo.audioEntries().length,0);
 const controller=new AbortController();controller.abort();await assert.rejects(f.library.synthesize('Hola',{...f.options,signal:controller.signal}),e=>e.status===409);
});
test('API solo comparte respuestas aprobadas por el servidor y protege administración y archivos',async t=>{
 const f=await fixture(t);const app=createApp({repository:f.repo,localTts:f.provider,config:{provider:'demo',center:schoolCenter,dbPath:join(f.root,'test.sqlite'),audioCache:{enabled:true},adminToken:'test-admin-library-token',sessionTtlMs:300000},ai:{reply:async()=>({text:'Private generated answer'})},liveAvatar:{status:()=>({}),stop:async()=>{},close:async()=>{}}});
 app.listen(0,'127.0.0.1');await once(app,'listening');f.closeFirst(()=>new Promise(r=>app.close(r)));
 const base='http://127.0.0.1:'+app.address().port;
 const req=async(path,body,token,method=body?'POST':'GET')=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};};
 const session=async()=> (await req('/api/sessions',{consent:true,language:'es'})).data.token;const a=await session(),b=await session();
 const config=(await req('/api/config')).data;
 await req('/api/tts',{text:config.center.greeting},a);await req('/api/tts',{text:config.center.greeting},b);assert.equal(f.calls,1);
 const answer=(await req('/api/chat',{message:'Cuánto cuesta el curso de las 5 horas'},a)).data.text;
 await req('/api/tts',{text:answer},a);assert.equal(f.repo.audioEntries().length,2);
 await req('/api/tts',{text:answer,cacheable:true},b);assert.equal(f.calls,3,'Otra sesión no puede usar respuestas que no obtuvo');
 await req('/api/tts',{text:'Nombre Privado',cacheable:true,scope:'approved-v1'},a);assert.equal(f.repo.audioEntries().length,2);
 assert.equal((await req('/api/admin/audio-library',null,a)).status,401);assert.equal((await req('/api/admin/audio-library',{},a,'DELETE')).status,401);
 assert.equal((await req('/data/audio-cache/'+f.repo.audioEntries()[0].key+'.wav')).status,404);
 assert.equal((await req('/api/admin/audio-library',null,'test-admin-library-token')).data.entries,2);
 assert.equal((await req('/api/admin/audio-library',{},'test-admin-library-token','DELETE')).status,200);assert.equal(f.repo.audioEntries().length,0);
});
test('configuración acota tamaño, caducidad y activación sin modificar credenciales',()=>{
 for(const env of [{AUDIO_CACHE_ENABLED:'yes'},{AUDIO_CACHE_MAX_MB:'0'},{AUDIO_CACHE_MAX_MB:'2048'},{AUDIO_CACHE_TTL_DAYS:'0'}])assert.throws(()=>readConfig(env),/AUDIO_CACHE/);
 const config=readConfig({AUDIO_CACHE_ENABLED:'false',AUDIO_CACHE_MAX_MB:'64',AUDIO_CACHE_TTL_DAYS:'7'});assert.deepEqual(config.audioCache,{enabled:false,maxBytes:64*1048576,ttlDays:7});
});
