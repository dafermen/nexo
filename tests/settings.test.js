/**
 * NEXO · GUÍA DEL MÓDULO: tests/settings.test.js
 * Pruebas unitarias y de integración de settings.
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
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
import {centerRepository,schoolCenter,schoolServices} from '../server/center.js';
import {settingsDefaults,validateSettings} from '../server/business-settings.js';
import {readConfig} from '../server/config.js';
import {FileFaqRepository} from '../server/faq.js';
const admin='settings-test-admin-credential';
async function fixture(t){
 const repo=createRepository(':memory:'),calls=[],stops=[];
 const ai={async reply(input){calls.push(input.preparedRequest);return{text:'Puede consultar el catálogo.',usage:{input_tokens:10,output_tokens:5}};},async interpret(input){calls.push(input.preparedRequest);return{interpretation:{status:'school',intent:'unknown',serviceId:null,facts:[],clarification:null},usage:{input_tokens:10,output_tokens:5}};}};
 const app=createApp({repository:repo,config:{provider:'openai',model:'test-model',apiKey:'private-test-ai',adminToken:admin,center:schoolCenter,sessionTtlMs:300000,liveAvatar:{apiKey:'private-test-video'}},ai,faq:new FileFaqRepository(new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url)),localTts:{status:()=>({available:true}),close(){},stop(id){stops.push(id);}},liveAvatar:{status:()=>({configured:true}),async start(){throw new Error('Paid session forbidden');},async stop(){},async close(){}}});app.listen(0,'127.0.0.1');await once(app,'listening');t.after(async()=>{await new Promise(r=>app.close(r));repo.close();});const base='http://127.0.0.1:'+app.address().port;
 async function request(path,method='GET',body,token=admin){const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};}
 const get=async()=>(await request('/api/admin/configuration')).data;
 const save=async state=>request('/api/admin/configuration','PUT',{revision:state.revision,profile:state.profile,configuration:state.configuration});
 const session=async()=>(await request('/api/sessions','POST',{consent:true},'')).data.token;
 return {repo,calls,stops,request,get,save,session,chat:(token,message)=>request('/api/chat','POST',{message},token)};
}
function generic(state){state.profile.name='Brisa · Limpieza';Object.assign(state.configuration.business,{type:'general',description:'Limpieza de hogares y oficinas.',timezone:'America/Bogota',phone:'555-0100',currency:'COP'});Object.assign(state.configuration.assistant,{name:'Luna',addressStyle:'tu',scope:'Servicios de limpieza y atención al cliente.',topics:'limpieza, oficinas, hogares',knowledgeMode:'none'});state.configuration.booking.message='Coordine su visita con nuestro personal.';return state;}
test('configuración protegida: no expone claves y rechaza cambios no autorizados',async t=>{
 const f=await fixture(t);assert.equal((await f.request('/api/admin/configuration','GET',null,'wrong')).status,401);const state=await f.get();assert.equal(state.configuration.business.type,'driving-school');assert.equal(state.configuration.video.maxSeconds,60);assert.equal(state.services.length,3);const serialized=JSON.stringify(state);assert.ok(!serialized.includes('private-test-'));assert.ok(!JSON.stringify((await f.request('/api/config')).data).includes('knowledgeText'));state.configuration.apiKey='should-not-store';assert.equal((await f.save(state)).status,400);
});
test('validación rechaza límites, URLs, zonas, plantillas y FAQ de otra actividad',()=>{
 for(const mutate of [s=>s.video.maxSeconds=61,s=>s.ai.dailyCalls=0,s=>s.experience.inactivityMinutes=1,s=>s.business.timezone='unknown/timezone',s=>s.booking.url='javascript:alert(1)',s=>s.business.website='https://user:password@example.com',s=>s.assistant.welcome='{secreto}',s=>s.business.type='general',s=>s.video.avatarId='invalid',s=>s.ai.model='x\nHeader: secret']){const value=settingsDefaults(schoolCenter);mutate(value);assert.throws(()=>validateSettings(value),e=>e.status===400);}
 assert.equal(readConfig({CENTER_PROFILE:'general'}).center.businessType,'general');
});
test('migración conserva datos y configuración sobrevive al reinicio y ediciones de catálogo',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nexo-settings-')),db=join(dir,'test.sqlite');let repo;
 try{repo=createRepository(db);repo.ensureCenterSettings({profile:{name:'Nombre existente',weeklyHours:Array.from({length:7},(_,day)=>({day,open:null,close:null}))},services:schoolServices.map(s=>({...s,priceCents:1234}))});const wrapped=centerRepository(repo,schoolCenter);let state=wrapped.getCenterSettings();assert.equal(state.profile.name,'Nombre existente');assert.equal(state.services[0].priceCents,1234);state.configuration.assistant.name='Eva';state=wrapped.saveConfiguration(state.revision,{profile:state.profile,configuration:state.configuration});const svc=state.services[0];wrapped.saveService(state.revision,svc.id,{name:svc.name,description:svc.description,priceCents:2500,requirements:null,modality:null,duration:20,active:true});repo.close();repo=null;repo=createRepository(db);const reopened=centerRepository(repo,schoolCenter);assert.equal(reopened.getCenter().assistantName,'Eva');assert.equal(reopened.getCenter().name,'Nombre existente');assert.equal(reopened.listServices()[0].priceCents,2500);
 }finally{repo?.close();const full=resolve(dir);assert.ok(full.startsWith(resolve(tmpdir())+sep)&&full.includes('nexo-settings-'));rmSync(full,{recursive:true,force:true});}
});
test('cambiar de actividad pausa catálogo, cambia moneda sin convertir y evita respuestas escolares',async t=>{
 const f=await fixture(t),before=await f.get();before.configuration.ai.enabled=false;const saved=await f.save(generic(before));assert.equal(saved.status,200);assert.ok(saved.data.services.every(s=>!s.active&&s.priceCents===null&&s.currency==='COP'));const cfg=(await f.request('/api/config')).data;assert.equal(cfg.center.name,'Brisa · Limpieza');assert.equal(cfg.center.timezone,'America/Bogota');assert.match(cfg.center.greeting,/Luna/);assert.ok(!cfg.center.hours.includes('Nueva York'));const token=await f.session();for(const q of ['Buenos días','¿Qué servicios ofrecen?','¿Cuál es el teléfono?','¿Cuánto cuesta el curso de cinco horas?']){const answer=await f.chat(token,q);assert.equal(answer.status,200);assert.doesNotMatch(answer.data.text,/escuela|DMV|road test|curso de las 5/i);}assert.match((await f.chat(token,'teléfono')).data.text,/555-0100/);assert.equal(f.calls.length,0);
});
test('FAQ propias y catálogo genérico responden localmente y conservan parámetros',async t=>{
 const f=await fixture(t);let state=generic(await f.get());state.configuration.assistant.knowledgeMode='custom';state.configuration.assistant.knowledgeText='[domicilio]\npregunta: ¿Atienden a domicilio?\nrespuesta: Sí, consulte los servicios de {{centro.nombre}}.';state=(await f.save(state)).data;
 const added=await f.request('/api/admin/services','POST',{revision:state.revision,service:{name:'Limpieza de oficinas',description:'Atención para oficinas.',duration:60,priceCents:120000,requirements:'Confirmar tamaño del espacio.',modality:'Presencial',active:true}});assert.equal(added.status,201);const token=await f.session();const answer=await f.chat(token,'¿Atienden a domicilio?');assert.match(answer.data.text,/Brisa/);const price=await f.chat(token,'precio de Limpieza de oficinas');assert.match(price.data.text,/1200.00 COP/);assert.equal(f.calls.length,0);
 state=await f.get();state.configuration.assistant.knowledgeText='[invalido]\npregunta: Falta respuesta';assert.equal((await f.save(state)).status,400);assert.match((await f.chat(token,'¿Atienden a domicilio?')).data.text,/Brisa/);
});
test('guardado invalida sesiones, aplica inactividad y bloquea video desde API',async t=>{
 const f=await fixture(t),token=await f.session(),state=await f.get();state.configuration.experience.videoEnabled=false;state.configuration.experience.voiceEnabled=false;state.configuration.experience.inactivityMinutes=3;assert.equal((await f.save(state)).status,200);assert.equal((await f.chat(token,'hola')).status,401);assert.ok(f.stops.includes(token));assert.equal((await f.request('/api/config')).data.sessionTtlMs,180000);const next=await f.session();assert.equal((await f.request('/api/avatar/session','POST',{mode:'receptionist',consent:true},next)).status,403);assert.equal((await f.request('/api/tts','POST',{text:'Hola'},next)).status,403);assert.equal((await f.chat(next,'Buenos días')).status,200);
});
test('configuración impide sobrescritura desde dos editores',async t=>{
 const f=await fixture(t),state=await f.get();state.profile.name='Guardado primero';assert.equal((await f.save(state)).status,200);state.profile.name='Sobrescritura';assert.equal((await f.save(state)).status,409);assert.equal((await f.get()).profile.name,'Guardado primero');
});
test('IA genérica usa modelo, alcance y cuota configurados sin instrucciones escolares',async t=>{
 const f=await fixture(t),state=generic(await f.get());state.configuration.ai.model='model-configured';state.configuration.ai.sessionCalls=1;assert.equal((await f.save(state)).status,200);const token=await f.session();await f.chat(token,'quiero asear mi apartamento');assert.equal(f.calls.length,1);assert.equal(f.calls[0].model,'model-configured');assert.doesNotMatch(JSON.stringify(f.calls[0]),/DMV|cinco.horas|road test|seguros de automóvil/i);assert.match(JSON.stringify(f.calls[0]),/limpieza/i);const second=await f.chat(token,'no sé cuál me sirve');assert.equal(second.data.reason,'session_limit');assert.equal(f.calls.length,1);
});
test('desactivar interpretación evita llamadas ambiguas sin desactivar catálogo',async t=>{
 const f=await fixture(t),state=await f.get();state.configuration.ai.interpretationEnabled=false;await f.save(state);const token=await f.session();assert.equal((await f.chat(token,'nesesito sinco oras')).data.provider,'local');assert.equal(f.calls.length,0);assert.match((await f.chat(token,'duración curso de cinco horas')).data.text,/300/);
});

test('teclado táctil opcional conserva configuración anterior y valida booleanos',async t=>{
 const defaults=settingsDefaults(schoolCenter);assert.equal(defaults.experience.touchKeyboard,false);delete defaults.experience.touchKeyboard;assert.equal(validateSettings(defaults).experience.touchKeyboard,false);
 defaults.experience.touchKeyboard='yes';assert.throws(()=>validateSettings(defaults),e=>e.status===400);
 const f=await fixture(t),state=await f.get();state.configuration.experience.touchKeyboard=true;assert.equal((await f.save(state)).status,200);assert.equal((await f.get()).configuration.experience.touchKeyboard,true);assert.equal((await f.request('/api/config')).data.center.experience.touchKeyboard,true);
});

test('temas permitidos, compatibilidad con formulario antiguo y aislamiento del catálogo',async t=>{
 const defaults=settingsDefaults(schoolCenter);delete defaults.experience.theme;assert.equal(validateSettings(defaults).experience.theme,'nexo');
 defaults.experience.theme='custom.css';assert.throws(()=>validateSettings(defaults),e=>e.status===400);
 const f=await fixture(t),state=await f.get();assert.equal(state.configuration.experience.theme,'nexo');
 state.configuration.experience.theme='metodomogollon';assert.equal((await f.save(state)).status,200);
 const updated=await f.get();assert.equal((await f.request('/api/config')).data.center.experience.theme,'metodomogollon');assert.deepEqual(updated.services,state.services);assert.deepEqual(updated.configuration.booking,state.configuration.booking);
 delete updated.configuration.experience.theme;assert.equal((await f.save(updated)).status,200);assert.equal((await f.get()).configuration.experience.theme,'metodomogollon');
 const restored=await f.get();restored.configuration.experience.theme='nexo';assert.equal((await f.save(restored)).status,200);assert.equal((await f.request('/api/config')).data.center.experience.theme,'nexo');assert.equal(f.calls.length,0);
});
