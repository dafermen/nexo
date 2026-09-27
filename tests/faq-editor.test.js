/** NEXO · GUÍA DEL MÓDULO: tests/faq-editor.test.js
 * Entrada: borradores, catálogo ficticio y API con SQLite en memoria.
 * Salida: evidencia de validación, autorización y concurrencia; no llama proveedores.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {parseFaq} from '../server/faq.js';
import {serializeFaq,previewFaq} from '../server/faq-editor.js';
import {createRepository} from '../server/db.js';
import {SqliteFaqRepository} from '../server/sqlite-faq.js';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
const entry={id:'precio-clase',category:'Clases prácticas',active:true,serviceId:'clase',questions:['¿Cuánto cuesta la clase?'],answer:'La clase cuesta {{servicio.precio}}.'};
test('categorías y estado sobreviven al formato de texto, compatible con temas antiguos',()=>{
 const parsed=parseFaq(serializeFaq([entry,{...entry,id:'otra',active:false,category:'Consultas'}]));
 assert.equal(parsed[0].category,entry.category);assert.equal(parsed[1].active,false);
 assert.equal(parseFaq('[hola]\npregunta: Hola\nrespuesta: Buenos días')[0].category,undefined);
});
test('borradores rechazan bloques inyectados, duplicados, límites y parámetros desconocidos',()=>{
 for(const bad of [{category:'A\n[otro]'},{id:'mal\n[otro]'},{answer:'Hola\nactivo: no'},{questions:['hola\nrespuesta: otra']},{category:'x'.repeat(61)},{active:'sí'},{questions:[]},{answer:'{{clave.secreta}}'},{serviceId:null}])assert.throws(()=>serializeFaq([{...entry,...bad}]));
 assert.throws(()=>serializeFaq([entry,entry]));assert.throws(()=>serializeFaq([]));
});
test('vista previa resuelve precio vigente, no modifica entrada y explica respuestas pausadas',()=>{
 const services=[{id:'clase',name:'Clase',active:true,priceCents:6000,currency:'USD'}],before=JSON.stringify(entry);
 assert.match(previewFaq(entry,services,schoolCenter).text,/60.00 USD/);
 services[0].priceCents=6500;assert.match(previewFaq(entry,services,schoolCenter).text,/65.00 USD/);
 assert.match(previewFaq({...entry,active:false},services,schoolCenter).warning,/pausado/);
 services[0].active=false;assert.match(previewFaq(entry,services,schoolCenter).warning,/inactivo/);
 assert.throws(()=>previewFaq(entry,[],schoolCenter));assert.equal(JSON.stringify(entry),before);
});
test('API visual exige administrador, no guarda al previsualizar y conserva cambios ante conflicto',async t=>{
 const repo=createRepository(':memory:'),faq=new SqliteFaqRepository(repo,new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url));await faq.refresh();
 const token='faq-editor-test-token-123456789',app=createApp({repository:repo,faq,config:{center:schoolCenter,provider:'demo',adminToken:token,sessionTtlMs:300000},ai:{async reply(){throw Error('Proveedor prohibido');}},localTts:{status:()=>({available:false}),close(){}},liveAvatar:{status:()=>({configured:false}),async close(){}}});
 app.listen(0,'127.0.0.1');await once(app,'listening');t.after(async()=>{await new Promise(r=>app.close(r));await app.closeAdminAuth();repo.close();});
 const call=async(method,body,suffix='',auth=true)=>{const r=await fetch('http://127.0.0.1:'+app.address().port+'/api/admin/knowledge'+suffix,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 for(const suffix of ['/parse','/preview'])assert.equal((await call('POST',{},suffix,false)).status,401);
 const initial=(await call('GET')).data;assert.ok(initial.entries.length);assert.ok(initial.services.length);
 const draft={...entry,serviceId:null,answer:'Bienvenido a {{centro.nombre}}.'};
 assert.equal((await call('POST',{entry:draft},'/preview')).status,200);assert.equal(repo.readKnowledge('school').revision,initial.revision);
 const converted=await call('POST',{entries:[draft]},'/parse');assert.equal(converted.status,200);assert.equal(converted.data.entries[0].category,draft.category);
 assert.equal((await call('PUT',{entries:[{...draft,answer:'{{error}}'}],revision:initial.revision})).status,400);
 assert.equal(repo.readKnowledge('school').source,initial.source);
 assert.equal((await call('PUT',{entries:[draft],revision:initial.revision})).status,200);
 assert.equal((await call('PUT',{entries:[{...draft,answer:'Sobrescritura'}],revision:initial.revision})).status,409);
 assert.equal((await call('GET')).data.entries[0].answer,draft.answer);
 assert.equal(faq.lookup({query:draft.questions[0],services:[],center:schoolCenter,state:{}}).id,draft.id);
});
