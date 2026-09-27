/**
 * NEXO · GUÍA DEL MÓDULO: tests/languages.e2e.js
 * E2E de navegador de languages.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {pcmToWav} from '../server/providers/local-tts.js';
import {compileFaq,parseFaq} from '../server/faq.js';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync} from 'node:fs';
import {createApp} from '../server/app.js';
import {schoolCenter,centerRepository} from '../server/center.js';
import {BookingService} from '../server/booking.js';
import {calendarFixture} from './calendar-fixture.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const spoken=[];let videoStarts=0;
const f=calendarFixture();await f.authorize();await f.service.select(f.calendars[1].id);
const originalCalendarFetch=f.service.fetch;f.service.fetch=async(url,opts)=>opts.method==='GET'&&new URL(url).pathname.endsWith('/events')?new Response(JSON.stringify({items:[...f.events.values()]})):originalCalendarFetch(url,opts);
const repo=centerRepository(f.repo,schoolCenter);await new BookingService({repository:repo,calendar:f.service}).configure({...repo.bookingSettings(),enabled:true,serviceIds:['cinco-horas']});
const settings=repo.getCenterSettings();settings.configuration.experience.touchKeyboard=true;repo.saveConfiguration(settings.revision,{profile:settings.profile,configuration:settings.configuration});
const app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,sessionTtlMs:300000},ai:{reply:async()=>({text:'Respuesta de prueba.'})},localTts:{status:()=>({available:true,languages:{es:true,en:true,fr:true}}),synthesize:async(text,opts)=>{spoken.push({text,language:opts.language});return{audioBase64:pcmToWav(Buffer.alloc(4410)).toString('base64')};},stop(){},close(){}},faq:compileFaq(parseFaq(readFileSync('conocimiento/preguntas-frecuentes.txt','utf8'))),liveAvatar:{status:()=>({configured:false}),start:async()=>{videoStarts++;throw Error('No paid video');},stop:async()=>{},close:async()=>{}}});
app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;

const watchdog=setTimeout(()=>{console.error('Language browser watchdog');process.exit(1);},90000);
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
try{
 const page=await browser.newPage({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));mkdirSync('.local/languages-qa',{recursive:true});
 await page.addInitScript(()=>{window.SpeechRecognition=class{start(){window.__recognition=this;this.onstart?.();}abort(){this.onend?.();}};});
 for(const lang of ['es','en','fr']){console.log('Language',lang);
  await page.setViewportSize({width:820,height:1180});await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});await page.locator(`[data-language="${lang}"]`).click();
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  for(const [width,height] of [[320,568],[390,844],[768,1024],[820,1180],[1080,1920],[1920,1080],[1366,768],[1024,600],[844,390]]){
   await page.setViewportSize({width,height});
   for(const selector of ['#start','#start-video','#new-conversation','#home-services','#home-agenda','#home-chat','#home-options','[data-language="es"]','[data-language="en"]','[data-language="fr"]']){
    const b=await page.locator(selector).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1&&b.height>=44,`${lang} ${selector} ${width}x${height}: ${JSON.stringify(b)}`);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.setViewportSize({width:820,height:1180});await page.screenshot({path:`.local/languages-qa/home-${lang}.png`});
  console.log('Chat');await page.locator('#home-chat').click();const greeting={es:'Buenos días',en:'Good morning',fr:'Bonjour'}[lang];await page.locator('#message').fill(greeting);await page.locator('#send').click();await page.locator('#accept-session').click();await page.waitForSelector('.message.assistant');
  assert.match(await page.locator('.message.assistant').innerText(),{es:/Buenos días/,en:/Good morning/,fr:/Bonjour/}[lang]);assert.equal(await page.locator('.message.user .message-body').innerText(),greeting);
  await page.locator('#message').fill({es:'¿Cuánto cuesta el curso de las 5 horas?',en:'How much is the five hour course?',fr:'Combien coûte le cours de 5 heures ?'}[lang]);await page.locator('#send').click();await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===2);
  assert.match(await page.locator('.message.assistant').last().innerText(),{es:/Precio/,en:/Price/,fr:/Tarif/}[lang]);
  console.log('Booking');await page.locator('#home-panel-close').click();await page.locator('#home-agenda').click();await page.locator('#booking-content > button').first().click();await page.waitForSelector('.slot:not([disabled])');await page.locator('.slot:not([disabled])').first().click();
  assert.match(await page.locator('#booking-content').innerText(),{es:/Nombre y apellido/,en:/Full name/,fr:/Prénom et nom/}[lang]);
  await page.locator('input[name="customerName"]').fill('Hola Servicios');await page.locator('input[name="email"]').fill('Servicios@example.test');await page.locator('input[name="consent"]').check();await page.locator('.booking-form button[type="submit"]').click();
  assert.equal(await page.locator('#booking-content [data-no-translate]').first().innerText(),'Hola Servicios');assert.equal(await page.locator('#booking-content [data-no-translate]').last().innerText(),'Servicios@example.test');
  await page.screenshot({path:`.local/languages-qa/review-${lang}.png`});await page.keyboard.press('Escape');await page.locator('#new-conversation').click();
  console.log('Voice');await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForFunction(()=>document.querySelector('#mic').getAttribute('aria-pressed')==='true');assert.equal(await page.evaluate(()=>window.__recognition.lang),{es:'es-US',en:'en-US',fr:'fr-FR'}[lang]);assert.equal(spoken.at(-1).language,lang);
  assert.match(spoken.at(-1).text,{es:/Hola/,en:/Hello/,fr:/Bonjour/}[lang]);
  await page.screenshot({path:`.local/languages-qa/call-${lang}.png`});
  await page.evaluate(text=>{const result=[{transcript:text}];result.isFinal=true;window.__recognition.onresult({results:[result]});window.__recognition.onend();},greeting);
  await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===2);assert.match(await page.locator('.message.assistant').last().innerText(),{es:/Buenos días/,en:/Good morning/,fr:/Bonjour/}[lang]);
  await page.locator('#call-hangup').click();assert.equal(await page.locator('.message').count(),0);
 }
 await page.locator('#home-chat').click();await page.locator('#message').fill('private draft');await page.locator('#home-panel-close').click();await page.locator('[data-language="en"]').click();assert.equal(await page.locator('#message').inputValue(),'');
 assert.equal(f.events.size,0);assert.equal(videoStarts,0);assert.deepEqual(errors,[]);console.log('Tres idiomas: 27 tamaños, texto, FAQ, reservas sin confirmar, datos intactos, STT/TTS y voz automática. Sin LiveAvatar ni eventos reales.');
}finally{clearTimeout(watchdog);await browser.close();await new Promise(r=>app.close(r));f.repo.close();}
