/**
 * NEXO · GUÍA DEL MÓDULO: tests/audio-library.e2e.js
 * E2E de navegador de audio library.
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
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createRepository} from '../server/db.js';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
import {pcmToWav} from '../server/providers/local-tts.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=await mkdtemp(join(tmpdir(),'nexo-audio-browser-')),dbPath=join(root,'test.sqlite'),repository=createRepository(dbPath),adminToken='isolated-admin-audio-test';
let generated=0,videoStarts=0;
const app=createApp({repository,config:{provider:'demo',center:schoolCenter,dbPath,audioCache:{enabled:true},adminToken,sessionTtlMs:300000},
 ai:{reply:async()=>{throw Error('Unexpected AI');}},
 localTts:{status:()=>({available:true,languages:{es:true,en:true,fr:true}}),cacheIdentity:async language=>({voice:language}),synthesize:async()=>{generated++;return{provider:'piper-local',audioBase64:pcmToWav(Buffer.alloc(4410)).toString('base64'),duration:.1};},stop(){},close(){}},
 liveAvatar:{status:()=>({configured:false}),start:async()=>{videoStarts++;throw Error('Unexpected video');},stop:async()=>{},close:async()=>{}}
});app.listen(0,'127.0.0.1');await once(app,'listening');
const base='http://127.0.0.1:'+app.address().port,browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:820,height:1180}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.SpeechRecognition=class{start(){this.onstart?.();}abort(){this.onend?.();}};});
 await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});
 for(let i=0;i<2;i++){await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForFunction(()=>document.querySelector('#mic').getAttribute('aria-pressed')==='true');await page.locator('#call-hangup').click();}
 assert.equal(generated,1);assert.equal(repository.audioMetrics().hits,1);assert.equal(repository.audioEntries().length,1);
 await page.locator('[data-language="fr"]').click();await page.locator('#start').click();await page.locator('#accept-session').click();await page.waitForFunction(()=>document.querySelector('#mic').getAttribute('aria-pressed')==='true');await page.locator('#call-hangup').click();assert.equal(generated,2);assert.equal(repository.audioEntries().length,2);
 await page.goto(base+'/admin');await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])');await page.locator('#audio-library summary').click();await page.waitForFunction(()=>document.querySelector('#audio-library-status').textContent.includes('2 audios'));assert.match(await page.locator('#audio-library-status').innerText(),/1 reutilizaciones/);
 await mkdir('.local/audio-library-qa',{recursive:true});await page.screenshot({path:'.local/audio-library-qa/admin.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const services=repository.listServices().length,conversations=repository.listConversations(0).length;
 await page.locator('#audio-library-clear').click();await page.waitForFunction(()=>document.querySelector('#audio-library-status').textContent.includes('0 audios'));assert.equal(repository.audioEntries().length,0);assert.equal(repository.listServices().length,services);assert.equal(repository.listConversations(0).length,conversations);assert.equal(await page.locator('#audio-library-clear').isDisabled(),true);
 await page.locator('#logout').click();assert.equal(await page.locator('#audio-library-status').textContent(),'Abra esta sección para consultar el uso.');assert.deepEqual(errors,[]);assert.equal(videoStarts,0);
 console.log('Dos llamadas reutilizan el saludo; francés genera su audio; panel protegido muestra uso y vacía solo audios. Móvil sin desbordamiento. Sin IA, SMTP, Calendar ni LiveAvatar reales.');
}finally{await browser.close();await new Promise(r=>app.close(r));repository.close();assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep));await rm(root,{recursive:true,force:true});}
