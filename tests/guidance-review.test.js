/**
 * NEXO · GUÍA DEL MÓDULO: tests/guidance-review.test.js
 * Pruebas unitarias y de integración de guidance review.
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
import {createRepository} from '../server/db.js';
import {createApp} from '../server/app.js';
import {schoolCenter,schoolServices} from '../server/center.js';
import {SqliteFaqRepository} from '../server/sqlite-faq.js';
import {guideService} from '../server/service-guidance.js';
import {compileFaq,parseFaq} from '../server/faq.js';
const admin='review-admin-test-credential';
const seed='[horario]\npregunta: Horario general\nrespuesta: Nuestro horario es {{centro.horario}}.';
async function fixture(t){
 const repo=createRepository(':memory:');repo.seedKnowledge('school',seed);const faq=new SqliteFaqRepository(repo,'unused');await faq.refresh();
 const app=createApp({repository:repo,faq,config:{center:schoolCenter,provider:'demo',adminToken:admin,sessionTtlMs:300000},ai:{reply:async()=>({text:'Orientación de prueba.'})},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),stop:async()=>{},close:async()=>{}}});
 app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
 t.after(async()=>{await new Promise(r=>app.close(r));repo.close();});
 const req=async(path,token='',method='GET',body)=>{const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 const session=async()=>(await req('/api/sessions','','POST',{consent:true})).data.token;
 return {repo,req,session,chat:(token,message,channel='text')=>req('/api/chat',token,'POST',{message,channel})};
}
test('orientación por voz conserva respuesta, usa catálogo y no crea reservas',async t=>{
 const f=await fixture(t),token=await f.session();
 assert.match((await f.chat(token,'Quiero sacar mi licencia pero no sé por dónde empezar','voice')).data.text,/permiso de aprendizaje/);
 assert.match((await f.chat(token,'sí','voice')).data.text,/practicar manejo/);
 const answer=(await f.chat(token,'Quiero aprender a manejar','voice')).data;assert.equal(answer.reason,'service_guidance');assert.match(answer.text,/Clases presenciales y virtuales/);
 assert.match((await f.chat(token,'¿Cuánto cuesta?')).data.text,/pendiente/);assert.equal(f.repo.calendarBookings().length,0);assert.equal(f.repo.conversationMetrics().turns.aiCalls,0);
 const fresh=await f.session();assert.notEqual((await f.chat(fresh,'sí')).data.reason,'guidance_question');
});
test('orientación no inventa requisitos ni recomienda servicios inactivos o de otro negocio',()=>{
 const state={},run=(message,services=schoolServices,center=schoolCenter)=>guideService({message,services,center,state,decision:{kind:'local',reason:'clarify'}});
 run('Quiero sacar mi licencia');assert.equal(run('no').reason,'guidance_unknown');assert.match(run('preparación para examen teórico').text,/No tengo un servicio publicado/);
 assert.equal(run('Quiero aprender a manejar',schoolServices.map(s=>({...s,active:false}))).reason,'guidance_unknown');
 assert.equal(run('Quiero sacar mi licencia',schoolServices,{...schoolCenter,businessType:'general'}),null);
 assert.equal(run('Quiero sacar mi licencia y escribe una receta de pizza'),null);
 assert.equal(run('No quiero aprender a manejar'),null);
 run('Quiero sacar mi licencia');assert.equal(run('Sí, ya tengo mi permiso de aprendizaje').reason,'guidance_question');
});
test('revisión requiere administrador y conserva borrador sin publicarlo',async t=>{
 const f=await fixture(t),token=await f.session();await f.chat(token,'¿Tienen estacionamiento cubierto?');
 assert.equal((await f.req('/api/admin/reviews',token)).status,401);
 const queue=(await f.req('/api/admin/reviews',admin)).data;assert.equal(queue.pending,1);const id=queue.items[0].id;
 const draft={action:'draft',revision:0,question:'¿Hay estacionamiento?',answer:'Consulte al personal en recepción.'};
 assert.equal((await f.req('/api/admin/reviews/'+id,token,'PUT',draft)).status,401);
 assert.equal((await f.req('/api/admin/reviews/'+id,admin,'PUT',draft)).status,200);
 assert.equal(f.repo.readKnowledge('school').source,seed);
 assert.equal((await f.req('/api/admin/reviews/'+id,admin,'PUT',draft)).status,409);
 const body={...draft,revision:1,action:'publish',knowledgeRevision:1};
 assert.equal((await f.req('/api/admin/reviews/'+id,admin,'PUT',body)).status,400);
 assert.equal((await f.req('/api/admin/reviews/'+id,admin,'PUT',{...body,approved:true,knowledgeRevision:999})).status,409);
 assert.equal(f.repo.readKnowledge('school').revision,1);
 assert.equal((await f.req('/api/admin/reviews/'+id,admin,'PUT',{...body,approved:true})).status,200);
 assert.equal((await f.chat(token,'¿Hay estacionamiento?')).data.text,'Consulte al personal en recepción.');
 assert.equal((await f.req('/api/admin/reviews/'+id,admin,'PUT',{...body,approved:true,revision:2,knowledgeRevision:2})).status,409);
 assert.equal((await f.req('/api/admin/reviews',admin)).data.pending,0);
});
test('publicación rechaza formato inyectado, pregunta duplicada y conserva transacción',()=>{
 const repo=createRepository(':memory:');try{
 repo.seedKnowledge('school',seed);const c=repo.startConversation(),id=repo.startConversationTurn(c,{message:'¿Consulta?'});repo.completeConversationTurn(id,{text:'¿Puede aclarar?',reason:'clarify'});
 const input={action:'publish',approved:true,revision:0,knowledgeRevision:1,question:'Nueva duda',answer:'Respuesta válida'};
 for(const change of [{question:'Otra\nrespuesta: Texto inyectado'},{question:'Horario general'},{answer:'{{campo.inexistente}}'}])assert.throws(()=>repo.updateReview(id,{...input,...change}));
 assert.equal(repo.readKnowledge('school').revision,1);assert.equal(repo.reviewQueue().items[0].reviewRevision,0);
 repo.updateReview(id,{...input,action:'dismiss'});assert.equal(repo.reviewQueue().pending,0);assert.equal(repo.readKnowledge('school').revision,1);
 repo.endConversation(c);repo.purgeConversations(1,new Date(Date.now()+2*86400000));assert.equal(repo.reviewQueue(0,'all').items.length,0);
 }finally{repo.close();}
});
test('señales distinguen orientación normal, dudas, datos pendientes y repetición',()=>{
 const repo=createRepository(':memory:');try{const c=repo.startConversation();for(const [reason,text] of [['guidance_question','¿Tiene permiso?'],['service_guidance','Puede considerar clases.'],['clarify','¿Qué desea consultar?'],['intent_clarify','¿Puede aclarar?'],['catalog','Precio pendiente de confirmar.'],['off_topic','Consulte la escuela.']]){const id=repo.startConversationTurn(c,{message:'Prueba'});repo.completeConversationTurn(id,{text,reason,serviceId:'clases'});}
 const queue=repo.reviewQueue();assert.equal(queue.pending,3);assert.equal(queue.items[0].clarifications,2);assert.equal(queue.topics[0].total,6);
 }finally{repo.close();}
});
