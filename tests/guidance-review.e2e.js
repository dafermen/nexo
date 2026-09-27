/**
 * NEXO · GUÍA DEL MÓDULO: tests/guidance-review.e2e.js
 * E2E de navegador de guidance review.
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
import {mkdirSync} from 'node:fs';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
import {schoolCenter} from '../server/center.js';
import {SqliteFaqRepository} from '../server/sqlite-faq.js';
import {pcmToWav} from '../server/providers/local-tts.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:'),admin='review-browser-test-credential',errors=[];
repo.seedKnowledge('school','[saludo]\npregunta: hola\nrespuesta: Hola. ¿Qué desea consultar?');
const faq=new SqliteFaqRepository(repo,'unused');await faq.refresh();
const app=createApp({repository:repo,faq,config:{center:schoolCenter,provider:'demo',adminToken:admin,avatarProvider:'portrait',sessionTtlMs:300000},ai:{reply:async()=>{throw Error('Unexpected AI');}},localTts:{status:()=>({available:true}),stop(){},close(){},synthesize:async()=>({audioBase64:pcmToWav(Buffer.alloc(4410)).toString('base64')})},liveAvatar:{status:()=>({configured:false}),stop:async()=>{},close:async()=>{}}});
app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port,browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1360,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{class Recognition{start(){this.active=true;window.recognition=this;this.onstart?.();}abort(){this.active=false;this.onend?.();}}window.SpeechRecognition=Recognition;window.say=text=>{const r=window.recognition;if(!r?.active)throw Error('Not listening');const result=[{transcript:text}];result.isFinal=true;r.onresult({results:[result]});r.onend?.();};});
 await page.goto(base);await page.locator('#start').click();await page.locator('#accept-session').click();
 const listen=()=>page.waitForFunction(()=>window.recognition?.active&&document.querySelector('#mic').getAttribute('aria-pressed')==='true');
 await listen();await page.evaluate(()=>window.say('Quiero sacar mi licencia pero no sé por dónde empezar'));await page.waitForFunction(()=>document.querySelector('.message.assistant:last-child')?.textContent.includes('permiso de aprendizaje'));await listen();
 await page.evaluate(()=>window.say('sí'));await page.waitForFunction(()=>document.querySelector('.message.assistant:last-child')?.textContent.includes('practicar manejo'));await listen();
 await page.evaluate(()=>window.say('Quiero aprender a manejar'));await page.waitForFunction(()=>document.querySelector('.message.assistant:last-child')?.textContent.includes('puede considerar'));await listen();
 await page.locator('#call-chat').click();await page.locator('#message').fill('¿Tienen estacionamiento cubierto?');await page.locator('#send').click();await page.waitForFunction(()=>document.querySelector('.message.assistant:last-child')?.textContent.includes('¿Su consulta'));
 await page.locator('#call-hangup').click();
 await page.goto(base+'/admin');await page.getByRole('link',{name:'Mejorar respuestas'}).click();await page.locator('#token').fill(admin);await page.locator('#login button').click();await page.locator('#items button').first().click();
 assert.equal(await page.locator('#question').inputValue(),'');assert.equal(await page.locator('#publish').isDisabled(),true);
 await page.locator('#question').fill('¿Hay estacionamiento?');await page.locator('#answer').fill('Consulte al personal en recepción.');await page.locator('#draft').click();await page.waitForFunction(()=>document.querySelector('#saved').textContent.includes('Borrador guardado'));
 assert.equal(repo.readKnowledge('school').revision,1);await page.reload();await page.locator('#token').fill(admin);await page.locator('#login button').click();await page.locator('#items button').first().click();assert.equal(await page.locator('#answer').inputValue(),'Consulte al personal en recepción.');
 await page.locator('#approved').check();await page.locator('#answer').fill('Consulte al personal en recepción para confirmar.');assert.equal(await page.locator('#approved').isChecked(),false);await page.locator('#approved').check();await page.locator('#publish').click();await page.waitForFunction(()=>document.querySelector('#saved').textContent.includes('aprobada y publicada'));assert.equal(repo.readKnowledge('school').revision,2);
 await page.locator('#status').selectOption('closed');await page.locator('#items button').first().click();assert.equal(await page.locator('#draft').isDisabled(),true);
 // Render visitor text as text; never execute it. Real data is isolated in memory.
 const c=repo.startConversation(),id=repo.startConversationTurn(c,{message:'<img src=x onerror="window.injected=true">'});repo.completeConversationTurn(id,{text:'¿Puede aclarar?',reason:'clarify'});
 await page.locator('#status').selectOption('pending');await page.locator('#items button').first().click();assert.match(await page.locator('#visitor').innerText(),/<img/);assert.equal(await page.locator('#visitor img').count(),0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 mkdirSync('.local/review-qa',{recursive:true});await page.screenshot({path:'.local/review-qa/mobile.png',fullPage:true});
 await page.locator('#dismiss').click();await page.waitForFunction(()=>document.querySelector('#saved').textContent.includes('descartada'));
 assert.equal(repo.calendarBookings().length,0);assert.equal(repo.conversationMetrics().turns.aiCalls,0);assert.deepEqual(errors,[]);
 console.log('Voz y texto, orientación, borrador, aprobación, descarte, XSS y móvil aprobados. Sin proveedores reales.');
}finally{await browser.close();await new Promise(r=>app.close(r));repo.close();}
