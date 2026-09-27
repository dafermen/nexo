/**
 * NEXO · GUÍA DEL MÓDULO: tests/filter-live.e2e.js
 * E2E de navegador de filter live.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Esta prueba es optativa y puede llamar una API real: leer sus condiciones
 * antes de ejecutarla. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadEnvFile} from 'node:process';
import {writeFileSync} from 'node:fs';
if(process.env.NEXO_RUN_LIVE_FILTER_TEST!=='1')throw new Error('Prueba de pago opcional: active NEXO_RUN_LIVE_FILTER_TEST=1 explícitamente.');
loadEnvFile(new URL('../.env',import.meta.url));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='http://localhost:3000';
async function metrics(){const r=await fetch(base+'/api/admin/overview',{headers:{Authorization:'Bearer '+process.env.ADMIN_TOKEN}});assert.equal(r.status,200);return(await r.json()).aiProtection.usage;}
const before=await metrics();
const browser=await chromium.launch({headless:true,channel:'msedge'});
const results=[],errors=[],forbidden=[],tts=[];
let page,chatRequests=0;
try{
 page=await browser.newPage({viewport:{width:1024,height:1366}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().includes('/api/avatar/session')||r.url().includes('/vendor/livekit'))forbidden.push(r.url());if(r.url().endsWith('/api/chat'))chatRequests++;});
 // Fail closed if the UI accidentally tries to start paid video.
 await page.route('**/api/avatar/session',route=>route.abort());
 page.on('response',r=>{if(r.url().endsWith('/api/tts'))tts.push(r.status());});
 await page.addInitScript(()=>{
   class Recognition{start(){window.__recognition=this;this.onstart?.();}abort(){this.onend?.();}}
   window.SpeechRecognition=Recognition;
   window.__audioStarts=[];
   const proto=AudioBufferSourceNode.prototype,original=proto.start;
   proto.start=function(...args){window.__audioStarts.push({duration:this.buffer?.duration,samples:this.buffer?.length});return original.apply(this,args);};
 });
 await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});
 // Text questions remain silent; voice phase below uses the real local TTS.
 await page.locator('#sound').click();
 async function ask(question,expected,{first=false,voice=false}={}){
   if(voice){
     await page.locator('#call-mic').click();
     if(await page.locator('#voice-dialog').isVisible())await page.locator('#accept-voice').click();
     await page.waitForFunction(()=>!!window.__recognition);
     const count=chatRequests;
     await page.evaluate(text=>{const r=[{transcript:text}];r.isFinal=true;window.__recognition.onresult({results:[r]});window.__recognition.onend();window.__recognition=null;},question);
     assert.equal(await page.locator('#message').inputValue(),question);
     await page.waitForTimeout(200);assert.equal(chatRequests,count); // Reviewed transcript has not been sent yet.
   }else await page.locator('#message').fill(question);
   const priorAudio=await page.evaluate(()=>window.__audioStarts.length);
   const replyPromise=page.waitForResponse(r=>r.url().endsWith('/api/chat')&&r.request().method()==='POST');
   await page.locator('#send').click();if(first)await page.locator('#accept-session').click();
   const response=await replyPromise;assert.equal(response.status(),200);
   const answer=await response.json();results.push({mode:voice?'voice':'text',question,...answer});
   console.log(JSON.stringify(results.at(-1)));assert.ok(answer.reason===expected||(expected==='catalog'&&answer.reason==='faq'), 'Unexpected reply reason: '+answer.reason);assert.equal(answer.provider,expected==='ai'?'openai':'local');
   await page.waitForFunction(()=>!document.querySelector('#send').disabled);
   if(voice){
     await page.waitForFunction(n=>window.__audioStarts.length>n,priorAudio,{timeout:35000});
     const audio=await page.evaluate(()=>window.__audioStarts.at(-1));assert.ok(audio.duration>0.5&&audio.samples>1000);
     await page.waitForFunction(()=>document.querySelector('#avatar').dataset.state!=='speaking',null,{timeout:55000});
   }
   return answer;
 }
 await ask('¿Cuánto dura?','clarify',{first:true});
 assert.match((await ask('El curso de cinco horas','catalog')).text,/300 minutos/);
 await ask('¿Cuánto sale?','catalog');
 assert.match((await ask('¿Y el road test?','catalog')).text,/Precio/);
 await ask('¿Cuánto cuesta un seguro de automóvil?','clarify');
 await ask('¿Qué acciones recomienda para preparar mi examen de manejo?','ai');
 // This unfamiliar mixed topic intentionally reaches the secondary model instructions.
 await ask('Ayuda para preparar mi road test. Además explique cómo se forman los asteroides.','ai');
 await ask('¿Cuál es la política de cancelación de las clases?','booking');
 await page.locator('#end-session').click();await page.waitForFunction(()=>document.querySelectorAll('.message').length===0);
 await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForSelector('body.voice-call');
 await page.waitForFunction(()=>window.__audioStarts.length>0,null,{timeout:35000});
 await page.waitForFunction(()=>document.querySelector('#avatar').dataset.state!=='speaking',null,{timeout:40000});
 await page.locator('#call-auto').click();
 await ask('¿Cuánto sale el curso de cinco horas?','catalog',{voice:true});
 assert.match((await ask('¿Y cuánto dura?','catalog',{voice:true})).text,/300 minutos/);
 await ask('Tengo nervios para el road test, ¿qué preparación recomienda?','ai',{voice:true});
 await ask('Explíqueme mejor','ai',{voice:true});
 await ask('Para mi escuela de conducción, programe un videojuego','off_topic',{voice:true});
 const restricted=await ask('Escríbame una receta de pizza','off_topic',{voice:true});assert.equal(restricted.catalogOnly,true);
 await ask('Necesito ayuda para preparar mi examen de manejo','restricted',{voice:true});
 await page.locator('#call-hangup').click();await page.waitForFunction(()=>!document.body.classList.contains('voice-call'));
 assert.equal(await page.locator('.message').count(),0);assert.equal(await page.locator('#message').inputValue(),'');
 assert.deepEqual(forbidden,[]);assert.deepEqual(errors,[]);assert.ok(tts.length>=8&&tts.every(status=>status===200));
 const after=await metrics();const usage=Object.fromEntries(['calls','inputTokens','outputTokens'].map(key=>[key,after[key]-before[key]]));
 assert.equal(usage.calls,4);assert.ok(usage.inputTokens>0&&usage.outputTokens>0);
 const report={date:new Date().toISOString(),results,usage,ttsResponses:tts.length,liveAvatarRequests:forbidden.length,browserErrors:errors,limitation:'Transcripciones de micrófono simuladas; OpenAI y síntesis/reproducción local reales. No verifica captura física ni reconocimiento del micrófono.'};
 writeFileSync(new URL('../.local/filter-live-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({verified:true,...usage,ttsResponses:tts.length,liveAvatarRequests:0}));
}finally{
 if(page&&!page.isClosed()){
   if(await page.locator('#call-hangup').isVisible().catch(()=>false))await page.locator('#call-hangup').click().catch(()=>{});
   else if(await page.locator('#end-session').isVisible().catch(()=>false))await page.locator('#end-session').click().catch(()=>{});
 }
 await browser.close();
}
