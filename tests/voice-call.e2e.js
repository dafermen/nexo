/**
 * NEXO · GUÍA DEL MÓDULO: tests/voice-call.e2e.js
 * E2E de navegador de voice call.
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
import {join} from 'node:path';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
import {schoolCenter,centerRepository} from '../server/center.js';
import {DemoAiProvider} from '../server/providers/ai.js';
import {pcmToWav} from '../server/providers/local-tts.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repository=createRepository(':memory:');const starts=[],spoken=[];
const centerRepo=centerRepository(repository,schoolCenter),theme=process.env.TEST_THEME==='metodomogollon'?'metodomogollon':'nexo';
const settings=centerRepo.getCenterSettings();settings.configuration.experience.theme=theme;centerRepo.saveConfiguration(settings.revision,{profile:settings.profile,configuration:settings.configuration});
const liveAvatar={status:()=>({mode:'LITE',configured:true,paidEnabled:true,occupied:false,requirements:{key:true,avatar:true},durationSeconds:60}),start:async()=>{starts.push(true);throw new Error('Voice must not start video');},stop:async()=>({stopped:true}),close:async()=>{}};
const localTts={status:()=>({available:true}),stop(){},close(){},synthesize:async text=>{spoken.push(text);return{audioBase64:pcmToWav(Buffer.alloc(4410)).toString('base64')};}};
const app=createApp({config:{provider:'demo',center:schoolCenter,avatarProvider:'liveavatar',sessionTtlMs:300000,retentionDays:7},repository,ai:new DemoAiProvider(),liveAvatar,localTts});
app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const context=await browser.newContext({viewport:{width:1024,height:1366}});const page=await context.newPage();const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 await page.addInitScript(()=>{class Recognition{start(){window.__recognition=this;this.onstart?.();}abort(){this.onend?.();}}window.SpeechRecognition=Recognition;});
 await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});assert.equal(await page.locator('#start').innerText(),'Llamada por voz');assert.equal(await page.locator('#start-video').innerText(),'Videollamada');
 const shots=process.env.SCREENSHOT_DIR;if(shots){mkdirSync(shots,{recursive:true});await page.screenshot({path:join(shots,'inicio-voz-video.png'),fullPage:true});}
 // Cancel consent: no chat, no voice call and no video request.
 await page.locator('#start').click();await page.waitForSelector('#welcome-dialog[open]');assert.match(await page.locator('#welcome-detail').innerText(),/no abre una sesión de LiveAvatar/);await page.keyboard.press('Escape');assert.equal(await page.locator('body.voice-call').count(),0);assert.equal(spoken.length,0);
 await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForSelector('body.voice-call');await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===1);await page.waitForTimeout(200);
 assert.equal(starts.length,0);assert.equal(spoken.length,1);assert.equal(await page.locator('#avatar-video').isVisible(),false);assert.equal(await page.locator('.avatar-photo').isVisible(),true);assert.equal(await page.locator('#call-rotate').isVisible(),false);assert.equal(await page.locator('#call-time').isVisible(),false);
 assert.equal(await page.locator('.method-menu').isVisible(),false);assert.equal(await page.locator('.method-footer').isVisible(),false);
 assert.match(await page.locator('.avatar-photo').getAttribute('src'),theme==='metodomogollon'?/asesora-mogollon-v1/:/recepcionista-v1/);
 for(const viewport of [{width:1024,height:1366},{width:1366,height:1024},{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.call-dock button:not([hidden])')].map(el=>{const b=el.getBoundingClientRect();return b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.right<=innerWidth&&b.bottom<=innerHeight;})}));assert.equal(geometry.overflow,false);assert.ok(geometry.buttons.every(Boolean));
  if(shots)await page.screenshot({path:join(shots,'voz-'+viewport.width+'.png')});
 }
 console.log('✓ Voz con retrato en cuatro tamaños, sin video ni temporizador de LiveAvatar.');
 await page.setViewportSize({width:1024,height:1366});await page.locator('#call-auto').click();await page.locator('#call-mic').click();await page.waitForFunction(()=>!!window.__recognition);
 await page.evaluate(()=>{const result=[{transcript:'¿Qué servicios ofrecen?'}];result.isFinal=true;window.__recognition.onresult({results:[result]});window.__recognition.onend();});
 assert.equal(await page.locator('#message').inputValue(),'¿Qué servicios ofrecen?');assert.equal(await page.locator('#message').isVisible(),true);assert.equal(await page.locator('.message.assistant').count(),1);
 await page.locator('#send').click();await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===2);await page.keyboard.press('Escape');
 await page.locator('#call-sound').click();assert.equal(await page.locator('#call-sound').getAttribute('aria-pressed'),'false');await page.locator('#call-sound').click();
 await page.locator('#call-hangup').click();await page.waitForFunction(()=>!document.body.classList.contains('video-first'));assert.equal(await page.locator('.message').count(),0);assert.equal(await page.locator('#message').inputValue(),'');assert.equal(await page.locator('#start').isVisible(),true);assert.equal(await page.locator('#start-video').isVisible(),true);
 console.log('✓ Micrófono simulado, transcripción editable, respuesta local, silencio y colgar limpian la atención.');
 await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForSelector('body.voice-call');await page.waitForFunction(()=>document.querySelectorAll('.message.assistant').length===1);await page.waitForTimeout(250);
 // End local speech explicitly before advancing the inactivity clock.
 await page.locator('#call-sound').click();assert.equal(await page.locator('#call-sound').getAttribute('aria-pressed'),'false');
 await page.waitForFunction(()=>document.querySelector('#mic').getAttribute('aria-pressed')==='true');
 await page.evaluate(()=>window.__recognition.onerror({error:'network'}));
 await page.waitForFunction(()=>document.querySelector('#call-mic').getAttribute('aria-pressed')==='false');
 assert.match(await page.locator('#call-notice').innerText(),/Chrome/);
 assert.equal(await page.locator('#call-mic').isDisabled(),false);
 console.log('✓ Error de conexión termina la escucha y permite reintentar sin abrir video.');
 await page.evaluate(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+46000;});await page.waitForFunction(()=>!document.body.classList.contains('voice-call'));assert.equal(await page.locator('.message').count(),0);
 await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForSelector('body.voice-call');await page.waitForFunction(()=>document.querySelector('#mic').getAttribute('aria-pressed')==='true');
 // La voz actual pausa al ocultar y recupera una ausencia breve; no debe cerrarse de inmediato.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>document.querySelector('#call-notice').textContent.includes('Llamada en pausa'));assert.equal(await page.locator('body.voice-call').count(),1);assert.equal(await page.locator('#call-mic').getAttribute('aria-pressed'),'false');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>document.querySelector('#mic').getAttribute('aria-pressed')==='true');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));const now=Date.now.bind(Date);Date.now=()=>now()+46000;Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>!document.body.classList.contains('voice-call'));
 assert.deepEqual(starts,[]);assert.equal(requests.filter(r=>r.url.endsWith('/api/avatar/session')).length,0);assert.equal(requests.filter(r=>r.url.includes('/vendor/livekit')).length,0);
 console.log('✓ Inactividad cierra; ausencia breve pausa y recupera voz. Cero solicitudes de sesión o SDK de LiveAvatar.');
 // No voice installation: explain text fallback and never open paid video.
 await page.route('**/api/config',async route=>{const response=await route.fetch();const cfg=await response.json();cfg.localVoice.available=false;await route.fulfill({json:cfg});});
 await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});await page.locator('#start').click();assert.match(await page.locator('#notice').innerText(),/voz no está disponible/);assert.equal(await page.locator('body.voice-call').count(),0);assert.deepEqual(starts,[]);assert.deepEqual(errors,[]);
 console.log('✓ Si falta voz, ofrece texto sin activar video automáticamente.');
}finally{await browser.close();await new Promise(resolve=>app.close(resolve));repository.close();}
