/**
 * NEXO · GUÍA DEL MÓDULO: tests/faq.test.js
 * Pruebas unitarias y de integración de faq.
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
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {FileFaqRepository,compileFaq,parseFaq} from '../server/faq.js';
import {filterSchoolMessage} from '../server/school-filter.js';
import {schoolServices,schoolCenter} from '../server/center.js';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
const source=readFileSync(new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url),'utf8');
const catalog=schoolServices.map(s=>({...s,requirements:null,modality:null}));
const faq=compileFaq(parseFaq(source));
const decide=(message,state={},services=catalog,k=faq)=>filterSchoolMessage({message,state,services,center:schoolCenter,faq:k});
test('base inicial válida y saludos naturales no consumen IA ni alteran contexto',()=>{
 assert.equal(parseFaq(source).length,24);
 for(const message of ['buenos días','Buenos días Nexo','Hola, muy buenos días, ¿cómo está usted?', 'Hola, buenos días, ¿cómo está?','Buen día señorita','Buenas tardes, ¿qué tal?','¿Cómo estás?','Hola, ¿puede ayudarme?']){
  const state={serviceId:'cinco-horas',lastIntent:'price'};const answer=decide(message,state);assert.equal(answer.reason,'greeting',message);assert.equal(answer.kind,'local');assert.equal(state.lastIntent,'price');assert.equal(state.serviceId,'cinco-horas');
 }
 assert.match(decide('Hola, buenos días, ¿cómo está?').text,/Buenos días/);
 assert.match(decide('Buenos días, ¿cuánto cuesta el curso de cinco horas?').text,/pendiente/);
 assert.equal(decide('Buenos días, programe un videojuego para el DMV').reason,'off_topic');
});
test('plantillas consultan precios actuales y mantienen nulo, cero y contexto',()=>{
 const state={};assert.match(decide('¿Cuánto cuesta el curso de cinco horas?',state).text,/pendiente/);assert.equal(state.serviceId,'cinco-horas');
 const paid=catalog.map(s=>s.id==='cinco-horas'?{...s,priceCents:7525}:s);assert.match(decide('¿Cuánto cuesta el curso de cinco horas?',state,paid).text,/75.25 USD/);
 const free=paid.map(s=>s.id==='cinco-horas'?{...s,priceCents:0}:s);assert.match(decide('¿Cuánto cuesta el curso de cinco horas?',state,free).text,/sin costo/);
 assert.match(decide('¿Y cuánto dura?',state).text,/300 minutos/);assert.match(decide('¿Y el road test?',state).text,/Duración pendiente/);
 assert.equal(decide('¿Y cuánto dura?',{}).reason,'clarify');
});
test('sin coincidencia suficiente no inventa equivalencias y nunca omite negaciones',()=>{
 assert.equal(decide('¿Cómo los contacto?').reason,'faq');
 assert.equal(decide('Precio curso cinco horas').reason,'faq');
 assert.equal(decide('¿Cuánto cuesta un seguro de automóvil?').reason,'clarify');
 const simple=compileFaq(parseFaq('[uno]\npregunta: curso recomendado\nrespuesta: A'));
 assert.equal(simple.lookup({query:'curso no recomendado',services:catalog,center:schoolCenter,state:{}}),null);
 assert.equal(decide('Hola, ¿tienen receta de pizza?',{},catalog,simple).reason,'off_topic');
});
test('respuestas desactivadas y servicios pausados no se publican',()=>{
 const disabled=compileFaq(parseFaq('[uno]\nactivo: no\npregunta: estacionamiento para alumnos\nrespuesta: A'));
 assert.equal(disabled.lookup({query:'estacionamiento para alumnos',services:catalog,center:schoolCenter,state:{}}),null);
 const paused=catalog.filter(s=>s.id!=='cinco-horas');
 assert.equal(decide('¿Cuánto cuesta el curso de cinco horas?',{},paused).reason,'clarify');
});
test('coincidencias ambiguas piden aclaración',()=>{
 const ambiguous=compileFaq(parseFaq('[uno]\npregunta: información especial\nrespuesta: A\n[dos]\npregunta: información especial\nrespuesta: B'));
 assert.equal(decide('Información especial',{},catalog,ambiguous).reason,'clarify');
});
test('valida IDs, campos, parámetros y líneas sin ejecutar plantillas',()=>{
 for(const value of ['', '[x]\npregunta: hola','[x]\npregunta: hola\nrespuesta: {{secreto}}','[x]\npregunta: hola\nrespuesta: {{servicio.precio}}','[x]\npregunta: hola\nrespuesta: A\n[x]\npregunta: otro\nrespuesta: B','[x]\nactivar: si','[x]\npregunta: hola\nrespuesta: {mal}'])assert.throws(()=>parseFaq(value),/Línea/);
 assert.equal(parseFaq('\ufeff# comentario\n[x]\npregunta: hola\nrespuesta: A\n  continuación')[0].answer,'A continuación');
});
test('archivo se recarga y conserva la última versión válida ante errores o desaparición',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'nexo-faq-')),path=join(dir,'preguntas.txt');
 try{
  writeFileSync(path,'[x]\npregunta: información especial\nrespuesta: Primera');const repo=new FileFaqRepository(path);await repo.refresh();assert.equal(repo.status().entries,1);
  writeFileSync(path,'[x]\npregunta: información especial\nrespuesta: Segunda respuesta');await repo.refresh();assert.match(decide('información especial',{},catalog,repo).text,/Segunda/);
  writeFileSync(path,'[x]\npregunta: incompleta');await repo.refresh();assert.match(repo.status().error,/Línea/);assert.match(decide('información especial',{},catalog,repo).text,/Segunda/);
  rmSync(path);await repo.refresh();assert.match(repo.status().error,/No se encuentra/);assert.match(decide('información especial',{},catalog,repo).text,/Segunda/);
  writeFileSync(path,'[x]\npregunta: información especial\nrespuesta: Tercera versión');await repo.refresh();assert.equal(repo.status().error,null);assert.match(decide('información especial',{},catalog,repo).text,/Tercera/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('permite 5000 temas con índice y rechaza 5001',()=>{
 const many=Array.from({length:5000},(_,i)=>`[tema-${i}]\npregunta: consulta especial ${i}\nrespuesta: Respuesta ${i}`).join('\n');
 const index=compileFaq(parseFaq(many));assert.equal(decide('consulta especial 4999',{},catalog,index).text,'Respuesta 4999');assert.throws(()=>parseFaq(many+'\n[extra]\npregunta: extra\nrespuesta: Extra'),/5000/);
});
test('API integra FAQ antes de IA, mantiene filtro y devuelve estado solo al administrador',async t=>{
 const repo=createRepository(':memory:');const knowledge=new FileFaqRepository(new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url));let calls=0;
 const app=createApp({repository:repo,faq:knowledge,config:{provider:'openai',model:'fake',center:schoolCenter,sessionTtlMs:300000,retentionDays:7,adminToken:'faq-test-admin'},ai:{reply:async()=>{calls++;return{text:'Orientación.'};}}});app.listen(0,'127.0.0.1');await once(app,'listening');t.after(async()=>{await new Promise(r=>app.close(r));repo.close();});
 const base='http://127.0.0.1:'+app.address().port;
 const call=async(path,method,token,body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json()};};
 const token=(await call('/api/sessions','POST',null,{consent:true})).data.token;
 for(const message of ['Hola buenos días cómo está','¿Cómo los contacto?','¿Cuánto cuesta el curso de cinco horas?','¿Y cuánto dura?','Receta de pizza','Programe un videojuego','¿Cuál es la dirección?'])assert.equal((await call('/api/chat','POST',token,{message})).data.provider,'local');
 assert.equal(calls,0);assert.equal((await call('/api/admin/overview','GET')).status,401);
 const admin=(await call('/api/admin/overview','GET','faq-test-admin')).data;assert.equal(admin.knowledge.entries,24);assert.equal(admin.aiProtection.usage.calls,0);
 await call('/api/session','DELETE',token);
});
