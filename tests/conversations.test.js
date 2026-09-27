/**
 * NEXO · GUÍA DEL MÓDULO: tests/conversations.test.js
 * Pruebas unitarias y de integración de conversations.
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
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createRepository} from '../server/db.js';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
const admin='history-admin-test-credential';
async function fixture(t,{center=schoolCenter,ai}={}){
 const repo=createRepository(':memory:');
 const app=createApp({repository:repo,config:{center,provider:'openai',model:'test',adminToken:admin,sessionTtlMs:300000},ai:ai||{async reply(){return{text:'Respuesta de orientación.',usage:{input_tokens:12,output_tokens:7}};}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),async stop(){},async close(){}}});
 app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
 t.after(async()=>{await new Promise(r=>app.close(r));repo.close();});
 const req=async(path,{method='GET',token='',body}={})=>{const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{response,status:response.status,data:response.headers.get('content-type')?.includes('application/json')?await response.json():await response.text()};};
 const session=async(channel='text')=>(await req('/api/sessions',{method:'POST',body:{consent:true,channel}})).data.token;
 return {repo,req,session,chat:(token,message,channel='text')=>req('/api/chat',{method:'POST',token,body:{message,channel}})};
}
test('historial conserva texto y voz tras limpiar sesión; token visitante nunca permite leerlo',async t=>{
 const f=await fixture(t),token=await f.session('voice');await f.chat(token,'Buenos días','voice');await f.chat(token,'¿Cuál es el horario?','text');
 const c=f.repo.listConversations()[0],turns=f.repo.conversationTurns(c.id);assert.equal(turns.length,2);assert.equal(turns[0].userText,'Buenos días');assert.ok(turns[0].assistantText);assert.equal(turns[0].channel,'voice');
 await f.req('/api/session?reason=inactivity',{method:'DELETE',token});assert.equal(f.repo.conversation(c.id).closeReason,'inactivity');assert.equal(f.repo.conversationTurns(c.id).length,2);
 for(const path of ['/api/admin/conversations','/api/admin/conversations/'+c.id,'/api/admin/conversations/'+c.id+'/export'])assert.equal((await f.req(path,{token})).status,401);
 const result=await f.req('/api/admin/conversations/'+c.id,{token:admin});assert.equal(result.status,200);assert.ok(!JSON.stringify(result.data).includes(token));
});
test('métricas registran IA y tokens reportados; dos visitantes quedan separados',async t=>{
 const f=await fixture(t,{center:null}),a=await f.session(),b=await f.session('video');await f.chat(a,'Consulta A');await f.chat(b,'Consulta B','video');
 const metrics=f.repo.conversationMetrics();assert.equal(metrics.sessions.total,2);assert.equal(metrics.turns.aiCalls,2);assert.equal(metrics.turns.inputTokens,24);assert.equal(metrics.turns.outputTokens,14);assert.equal(metrics.channels.find(v=>v.channel==='video').turns,1);
 for(const c of f.repo.listConversations())assert.equal(f.repo.conversationTurns(c.id).length,1);
});
test('saludo por voz se registra una vez y no acepta texto inventado del cliente',async t=>{
 const f=await fixture(t),token=await f.session('voice');for(let n=0;n<2;n++)await f.req('/api/session/greeting',{method:'POST',token,body:{channel:'voice',text:'No registrar este texto'}});
 const turns=f.repo.conversationTurns(f.repo.listConversations()[0].id);assert.equal(turns.length,1);assert.equal(turns[0].kind,'greeting');assert.equal(turns[0].assistantText,(await f.req('/api/config')).data.center.greeting);assert.equal(f.repo.conversationMetrics().turns.total,0);
});
test('errores quedan registrados sin exponer diagnósticos ni inventar respuesta',async t=>{
 const f=await fixture(t,{center:null,ai:{async reply(){throw new Error('sensitive internal diagnosis');}}}),token=await f.session();assert.equal((await f.chat(token,'Mi pregunta')).status,500);
 const record=f.repo.conversationTurns(f.repo.listConversations()[0].id)[0];assert.equal(record.outcome,'error');assert.equal(record.assistantText,null);assert.equal(record.reason,'response_error');assert.doesNotMatch(JSON.stringify(record),/sensitive/);
});
test('exportación protegida descarga texto íntegro a través de páginas de registros',async t=>{
 const f=await fixture(t),id=f.repo.startConversation('text');for(let i=0;i<205;i++){const turn=f.repo.startConversationTurn(id,{message:'Pregunta '+i});f.repo.completeConversationTurn(turn,{text:'Respuesta '+i,provider:'local'});}
 const result=await f.req('/api/admin/conversations/'+id+'/export',{token:admin});assert.equal(result.status,200);assert.match(result.response.headers.get('content-disposition'),/attachment/);assert.match(result.data,/Pregunta 0/);assert.match(result.data,/Respuesta 204/);assert.equal((await f.req('/api/admin/conversations/'+id+'?offset=100',{token:admin})).data.turns.length,100);
 assert.equal((await f.req('/api/admin/conversations?offset=-1',{token:admin})).status,400);
});
test('SQLite conserva historial al reabrir y marca interrupciones del servidor',()=>{
 const directory=mkdtempSync(join(tmpdir(),'nexo-conversations-')),path=join(directory,'history.sqlite');
 try{let repo=createRepository(path);const id=repo.startConversation('text');repo.startConversationTurn(id,{message:'Consulta antes de reiniciar'});repo.close();repo=createRepository(path);repo.recoverConversations();assert.equal(repo.conversation(id).status,'interrupted');assert.equal(repo.conversationTurns(id)[0].outcome,'interrupted');assert.equal(repo.conversationTurns(id)[0].userText,'Consulta antes de reiniciar');repo.close();}
 finally{assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));rmSync(directory,{recursive:true,force:true});}
});
test('conservación es indefinida por defecto y purga configurada elimina también sus mensajes',()=>{
 const repo=createRepository(':memory:');try{const id=repo.startConversation();repo.startConversationTurn(id,{message:'Prueba de conservación'});repo.endConversation(id);const future=new Date(Date.now()+31*86400000);assert.equal(repo.purgeConversations(0,future),0);assert.ok(repo.conversation(id));assert.equal(repo.purgeConversations(30,future),1);assert.equal(repo.conversationTurns(id).length,0);}finally{repo.close();}
});
test('cancelar una consulta en curso registra cancelación y no añade respuesta tardía',async t=>{
 let entered,release;const ready=new Promise(r=>entered=r);
 const f=await fixture(t,{center:null,ai:{async reply(){entered();await new Promise(r=>release=r);return{text:'No entregar'};}}}),token=await f.session(),response=f.chat(token,'Consulta cancelada');await ready;await f.req('/api/session?reason=new_conversation',{method:'DELETE',token});release();await response;
 const record=f.repo.conversationTurns(f.repo.listConversations()[0].id)[0];assert.equal(record.outcome,'cancelled');assert.equal(record.assistantText,null);
});

