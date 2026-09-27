/**
 * NEXO · GUÍA DEL MÓDULO: tests/home-reset.e2e.js
 * E2E de navegador de home reset.
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
import {createRepository} from '../server/db.js';
import {createApp} from '../server/app.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:');let release=null,hold=false;
const server=createApp({repository:repo,config:{provider:'demo',sessionTtlMs:300000},ai:{async reply(){if(hold)await new Promise(r=>release=r);return{text:'Respuesta de prueba local.'};}},localTts:{status:()=>({available:false}),close(){},stop(){}},liveAvatar:{status:()=>({configured:false}),async stop(){},async close(){}}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const context=await browser.newContext({viewport:{width:1366,height:1000}}),page=await context.newPage(),errors=[],tokens=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{if(r.url()===base+'/api/sessions'&&r.status()===201)tokens.push((await r.json()).token);});
 await page.clock.install();await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});
 await page.locator('#home-chat').click();await page.locator('#message').fill('Texto sin enviar del visitante anterior');
 await page.clock.fastForward(59000);assert.notEqual(await page.locator('#message').inputValue(),'');
 await page.clock.fastForward(2000);assert.equal(await page.locator('#message').inputValue(),'');assert.ok(await page.locator('#home-services').isVisible());
 async function send(text){if(!await page.locator('#home-panel').evaluate(e=>e.open))await page.locator('#home-chat').click();await page.locator('#message').fill(text);await page.locator('#send').click();if(await page.locator('#welcome-dialog').evaluate(e=>e.open))await page.locator('#accept-session').click();await page.waitForSelector('.message.assistant');}
 await send('Primera atención');assert.equal(tokens.length,1);
 await page.clock.fastForward(50000);await page.locator('#message').fill('Actividad reciente');
 await page.clock.fastForward(50000);assert.equal(await page.locator('.message').count(),2);
 await page.clock.fastForward(11000);assert.equal(await page.locator('.message').count(),0);assert.equal(await page.locator('#message').inputValue(),'');
 // Reset waits for the DELETE request, without advancing the real server clock.
 await page.waitForTimeout(100);
 assert.equal((await fetch(base+'/api/session/touch',{method:'POST',headers:{Authorization:'Bearer '+tokens[0]}})).status,401);
 await send('Nueva persona');assert.equal(tokens.length,2);assert.notEqual(tokens[0],tokens[1]);assert.doesNotMatch(await page.locator('#messages').innerText(),/Primera atención/);
 await page.evaluate(()=>document.getElementById('idle-dialog').showModal());
 await page.locator('#continue-session').click();assert.equal(await page.locator('#idle-dialog').evaluate(e=>e.open),false);assert.equal(await page.locator('.message').count(),2);
 await page.locator('#message').fill('Borrador privado');await page.evaluate(()=>document.getElementById('idle-dialog').showModal());
 const ended=page.waitForResponse(r=>r.request().method()==='DELETE'&&r.url().includes('/api/session?reason=new_conversation'));
 await page.locator('#idle-new-conversation').click();await ended;assert.equal(await page.locator('#idle-dialog').evaluate(e=>e.open),false);assert.equal(await page.locator('#message').inputValue(),'');assert.equal(await page.locator('#new-conversation').evaluate(e=>e===document.activeElement),true);
 assert.equal((await fetch(base+'/api/session/touch',{method:'POST',headers:{Authorization:'Bearer '+tokens[1]}})).status,401);
 assert.ok(repo.listConversations().some(c=>c.closeReason==='new_conversation'&&repo.conversationTurns(c.id).some(t=>t.userText==='Nueva persona')));
 assert.equal(await page.locator('.message').count(),0);assert.ok(await page.locator('#home-services').isVisible());assert.equal(await page.locator('#notice').innerText(),'');
 hold=true;await page.locator('#home-chat').click();await page.locator('#message').fill('Respuesta tardía');await page.locator('#send').click();await page.locator('#accept-session').click();await page.waitForSelector('#send:disabled');
 await page.locator('#home-panel-close').click();await page.locator('#new-conversation').click();release?.();await page.waitForTimeout(50);assert.equal(await page.locator('.message').count(),0);assert.equal(await page.locator('#message').inputValue(),'');assert.ok(await page.locator('#home-services').isVisible());
 await page.locator('#home-chat').click();await page.locator('#message').fill('Borrador abandonado');await page.clock.fastForward(61000);assert.equal(await page.locator('#message').inputValue(),'');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.locator('#new-conversation').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.ok(await page.evaluate(()=>{const reset=document.querySelector('#new-conversation');return reset.parentElement===document.querySelector('#start').parentElement&&reset.parentElement===document.querySelector('#start-video').parentElement&&!document.querySelector('.header').contains(reset);}));
 const shot=process.env.SCREENSHOT_DIR;if(shot){mkdirSync(shot,{recursive:true});await page.screenshot({path:join(shot,'inicio-limpio-movil.png'),fullPage:true});}
 await page.evaluate(()=>document.getElementById('idle-dialog').showModal());assert.ok(await page.locator('#idle-new-conversation').isVisible());
 const button=await page.locator('#idle-new-conversation').boundingBox();assert.ok(button.height>=44&&button.x>=0&&button.x+button.width<=390);
 if(shot)await page.screenshot({path:join(shot,'aviso-dos-opciones-movil.png')});
 await page.locator('#idle-new-conversation').click();assert.equal(await page.locator('#idle-dialog').evaluate(e=>e.open),false);
 assert.deepEqual(errors,[]);console.log('✓ Borrador, actividad renovada, limpieza a 60 s, revocación del token, nueva persona, botón durante respuesta pendiente y móvil. Sin proveedores externos.');
}finally{release?.();await browser.close();await new Promise(r=>server.close(r));repo.close();}

