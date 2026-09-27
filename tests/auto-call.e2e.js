/**
 * NEXO · GUÍA DEL MÓDULO: tests/auto-call.e2e.js
 * E2E de navegador de auto call.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
import {schoolCenter} from '../server/center.js';
import {pcmToWav} from '../server/providers/local-tts.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:');let aiCalls=0;
const app=createApp({repository:repo,config:{provider:'openai',model:'fake',center:schoolCenter,avatarProvider:'portrait',sessionTtlMs:300000,retentionDays:7},ai:{reply:async()=>{aiCalls++;return{text:'Consulte la preparación para el examen.'};}},localTts:{status:()=>({available:true}),stop(){},close(){},synthesize:async()=>({audioBase64:pcmToWav(Buffer.alloc(44100)).toString('base64')})},liveAvatar:{status:()=>({configured:true,paidEnabled:true,mode:'LITE',requirements:{key:true,avatar:true}}),start:()=>{throw new Error('Video forbidden');},stop:async()=>({stopped:true}),close:async()=>{}}});
app.listen(0,'127.0.0.1');await once(app,'listening');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try {
 const page=await browser.newPage({viewport:{width:1024,height:1366}}), errors=[],chats=[],video=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().endsWith('/api/chat'))chats.push(r.postDataJSON().message);if(r.url().includes('/api/avatar/session')||r.url().includes('/vendor/livekit'))video.push(r.url());});
 await page.addInitScript(()=>{
  window.__starts=0;window.__stops=0;window.__recognition=null;
  class Recognition {
   start(){window.__starts++;window.__recognition=this;this.active=true;this.onstart?.();}
   abort(){window.__stops++;this.active=false;this.onend?.();}
  }
  window.SpeechRecognition=Recognition;
  window.say=(text,final=true,end=true)=>{const r=window.__recognition;if(!r?.active)throw new Error('Microphone not active');const result=[{transcript:text}];result.isFinal=final;r.onresult({results:[result]});if(end&&final)r.onend?.();};
 });
 const base='http://127.0.0.1:'+app.address().port;
 await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});
 async function begin(){await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForSelector('body.voice-call');await page.waitForFunction(()=>document.querySelector('#avatar').dataset.state==='speaking');await page.waitForFunction(()=>document.querySelector('#avatar').dataset.state==='idle');}
 const listening=()=>page.waitForFunction(()=>window.__recognition?.active&&document.querySelector('#mic').getAttribute('aria-pressed')==='true');
 await begin();await listening();assert.equal(await page.evaluate(()=>window.__starts),1);assert.equal(await page.locator('#voice-dialog').isVisible(),false);
 // Simula suspensión móvil sin permisos ni micrófonos reales.
 const beforeBackground=await page.evaluate(()=>window.__starts);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.evaluate(()=>window.__recognition.active),false);
 await page.waitForTimeout(1100);assert.equal(await page.evaluate(()=>window.__starts),beforeBackground);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
 await listening();assert.equal(await page.evaluate(()=>window.__starts),beforeBackground+1);assert.equal(await page.locator('body.voice-call').count(),1);
 console.log('✓ Cambio de aplicación pausa el micrófono y retoma una sola escucha al volver.');
 const initial=chats.length;
 await page.evaluate(()=>window.say('¿Cuánto cuesta',false,false));await page.waitForTimeout(1100);assert.equal(chats.length,initial);
 await page.evaluate(()=>{window.say('¿Cuánto cuesta el curso de cinco horas?',true,false);window.say('¿Cuánto cuesta el curso de cinco horas?',true,true);});
 await page.waitForFunction(()=>document.querySelector('#avatar').dataset.state==='speaking');assert.equal(chats.length,initial+1);assert.equal(await page.evaluate(()=>window.__recognition.active),false);
 const starts=await page.evaluate(()=>window.__starts);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__starts),starts);await listening();
 await page.evaluate(()=>window.say('¿Y cuánto dura?'));await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===3);await listening();assert.equal(chats.length,initial+2);assert.equal(aiCalls,0);
 assert.match(await page.locator('.message.assistant').last().innerText(),/300 minutos/);
 console.log('✓ Dos turnos automáticos, sin Enviar; parciales no enviados, finales duplicados solo una vez, micrófono cerrado mientras habla.');
 await page.evaluate(()=>window.say('No enviar esta frase'));await page.locator('#call-mic').click();await page.waitForTimeout(1100);assert.equal(chats.length,initial+2);assert.equal(await page.locator('#message').inputValue(),'No enviar esta frase');
 await page.locator('#call-mic').click();await listening();await page.evaluate(()=>window.__recognition.onerror({error:'network'}));assert.equal(await page.locator('#mic').getAttribute('data-automatic'),'false');assert.match(await page.locator('#call-notice').innerText(),/Chrome/);
 await page.locator('#call-mic').click();await listening();await page.evaluate(()=>window.__recognition.onend());assert.equal(await page.locator('#mic').getAttribute('data-automatic'),'false');assert.equal(chats.length,initial+2);
 console.log('✓ Pausar, error de conexión y fin sin frase no envían texto ni reabren el micrófono.');
 await page.locator('#call-auto').click();await page.locator('#call-mic').click();await listening();await page.evaluate(()=>window.say('¿Qué servicios ofrecen?'));await page.waitForTimeout(1100);assert.equal(chats.length,initial+2);assert.equal(await page.locator('#message').isVisible(),true);
 await page.locator('#send').click();await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===4);await page.keyboard.press('Escape');
 await page.locator('#call-auto').click();await page.locator('#call-mic').click();await listening();await page.evaluate(()=>window.say('Ayuda para preparar mi examen de manejo'));await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===5);await listening();assert.equal(aiCalls,1);
 await page.evaluate(()=>window.say('Escriba una receta de pizza'));await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===6);await listening();
 await page.evaluate(()=>window.say('Programe un videojuego'));await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===7);assert.equal(await page.locator('#mic').getAttribute('data-automatic'),'false');assert.equal(await page.locator('#services-view').isVisible(),true);assert.equal(aiCalls,1);
 await page.locator('#call-hangup').click();const total=chats.length;await page.waitForTimeout(1100);assert.equal(chats.length,total);assert.equal(await page.locator('.message').count(),0);assert.equal(await page.evaluate(()=>window.__recognition.active),false);
 console.log('✓ Modo manual, orientación, filtro, pausa tras dos desvíos y colgar conservan los límites.');
 await begin();await listening();const beforeClose=chats.length;
 await page.evaluate(()=>window.say('¿Cuánto dura el curso de cinco horas?'));await page.locator('#call-hangup').click();await page.waitForTimeout(1100);assert.equal(chats.length,beforeClose);
 const count=await page.evaluate(()=>window.__starts);await page.locator('#home-chat').click();await page.locator('#message').fill('¿Qué servicios ofrecen?');await page.waitForTimeout(1100);assert.equal(chats.length,beforeClose);assert.equal(await page.evaluate(()=>window.__starts),count);
 await page.locator('#home-panel-close').click();
 // A denied browser permission must pause, never loop or submit audio.
 await begin();await listening();await page.evaluate(()=>window.__recognition.onerror({error:'not-allowed'}));
 assert.match(await page.locator('#call-notice').innerText(),/No se autorizó/);const deniedStarts=await page.evaluate(()=>window.__starts);await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>window.__starts),deniedStarts);await page.locator('#call-hangup').click();
 // Closing during the greeting must never open the microphone later.
 await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForFunction(()=>document.querySelector('#avatar').dataset.state==='speaking');const greetingStarts=await page.evaluate(()=>window.__starts);await page.locator('#call-hangup').click();await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>window.__starts),greetingStarts);
 // Starting voice after text has already begun skips the greeting and listens directly.
 await page.locator('#home-chat').click();await page.locator('#message').fill('Buenos días');await page.locator('#send').click();await page.locator('#accept-session').click();await page.waitForSelector('.message.assistant');await page.waitForFunction(()=>document.querySelector('#avatar').dataset.state==='idle');
 const resumed=await page.evaluate(()=>window.__starts);await page.locator('#home-panel-close').click();await page.locator('#start').click();await listening();assert.equal(await page.evaluate(()=>window.__starts),resumed+1);await page.locator('#call-hangup').click();
 await begin();await listening();await page.locator('#call-mic').click();const manualStarts=await page.evaluate(()=>window.__starts);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>window.__starts),manualStarts);assert.equal(await page.evaluate(()=>window.__recognition.active),false);
 await page.locator('#call-mic').click();await listening();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));const now=Date.now;Date.now=()=>now()+46000;Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));Date.now=now;});
 assert.equal(await page.locator('body.voice-call').count(),0);assert.equal(await page.locator('.message').count(),0);assert.equal(await page.evaluate(()=>window.__recognition.active),false);
 console.log('✓ Retorno respeta pausa manual; ausencia larga limpia la atención sin reabrir micrófono.');
 assert.deepEqual(video,[]);assert.deepEqual(errors,[]);console.log('✓ Cierre cancela envío pendiente, texto manual y cero conexiones a LiveAvatar.');
} finally {await browser.close();await new Promise(resolve=>app.close(resolve));repo.close();}
