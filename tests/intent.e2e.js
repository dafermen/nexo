/**
 * NEXO · GUÍA DEL MÓDULO: tests/intent.e2e.js
 * E2E de navegador de intent.
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
import {FileFaqRepository} from '../server/faq.js';
import {pcmToWav} from '../server/providers/local-tts.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:');let calls=0;const spoken=[],requests=[],errors=[];
const ai={reply:async()=>{throw Error('Unexpected guidance call');},interpret:async({preparedRequest})=>{
 calls++;const {message}=JSON.parse(preparedRequest.input.at(-1).content);
 return{interpretation:message.includes('papelito')?{status:'unclear',intent:'unknown',serviceId:null,facts:[],clarification:'document'}:{status:'school',intent:'facts',serviceId:'cinco-horas',facts:['price'],clarification:null},usage:{input_tokens:20,output_tokens:10}};
}};
const app=createApp({repository:repo,ai,faq:new FileFaqRepository(new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url)),config:{provider:'openai',model:'test',center:schoolCenter,avatarProvider:'portrait',sessionTtlMs:300000,retentionDays:7},localTts:{status:()=>({available:true}),stop(){},close(){},synthesize:async text=>{spoken.push(text);return{audioBase64:pcmToWav(Buffer.alloc(44100)).toString('base64')};}},liveAvatar:{status:()=>({configured:true,mode:'LITE'}),start:async()=>{throw Error('Video forbidden');},stop:async()=>({stopped:true}),close:async()=>{}}});
app.listen(0,'127.0.0.1');await once(app,'listening');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1024,height:1366}});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{
  class Recognition{start(){this.active=true;window.recognition=this;this.onstart?.();}abort(){this.active=false;this.onend?.();}}
  window.SpeechRecognition=Recognition;
  window.say=text=>{const r=window.recognition;if(!r?.active)throw Error('Not listening');const result=[{transcript:text}];result.isFinal=true;r.onresult({results:[result]});r.onend?.();};
 });
 await page.goto('http://127.0.0.1:'+app.address().port);await page.waitForSelector('.service-card',{state:'attached'});await page.locator('#start').click();await page.locator('#accept-session').click();
 await page.waitForSelector('body.voice-call');await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===1&&document.querySelector('#avatar').dataset.state==='idle');
 await page.locator('#call-mic').click();await page.locator('#accept-voice').click();
 const listening=()=>page.waitForFunction(()=>window.recognition?.active&&document.querySelector('#mic').getAttribute('aria-pressed')==='true');
 await listening();await page.evaluate(()=>window.say('A cómo sale lo de las cinco horas'));await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===2);await listening();
 assert.match(await page.locator('.message.assistant').last().innerText(),/pendiente/i);assert.equal(calls,1);
 await page.evaluate(()=>window.say('¿Y cuánto dura?'));await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===3);await listening();assert.match(await page.locator('.message.assistant').last().innerText(),/300 minutos/);assert.equal(calls,1);
 await page.locator('#call-chat').click();await page.locator('#message').fill('Necesito el papelito ese');await page.locator('#send').click();await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===4&&document.querySelector('#avatar').dataset.state==='idle');
 assert.match(await page.locator('.message.assistant').last().innerText(),/¿Se refiere al curso/);assert.equal(calls,2);assert.equal(spoken.length,4);
 await page.locator('#call-hangup').click();assert.equal(await page.locator('.message').count(),0);
 assert.ok(!requests.some(url=>url.includes('/api/avatar/session')||url.includes('/vendor/livekit')));assert.deepEqual(errors,[]);
 console.log('Voz automática y texto: interpretación, seguimiento, aclaración, 4 audios simulados y cierre; cero LiveAvatar.');
}finally{await browser.close();await new Promise(r=>app.close(r));repo.close();}
