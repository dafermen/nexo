/**
 * NEXO · GUÍA DEL MÓDULO: tests/settings.e2e.js
 * E2E de navegador de settings.
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
import {schoolCenter} from '../server/center.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:'),adminToken='isolated-settings-admin-credential';let paidCalls=0;
const server=createApp({repository:repo,config:{provider:'demo',center:schoolCenter,adminToken,sessionTtlMs:300000},ai:{async reply(){paidCalls++;throw Error('No provider expected');}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),async start(){paidCalls++;throw Error('No video');},async stop(){},async close(){}}});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),kiosk=await context.newPage(),errors=[];for(const p of [page,kiosk])p.on('pageerror',e=>errors.push(e.message));
 await kiosk.goto(base);await kiosk.waitForSelector('.service-card',{state:'attached'});await page.goto(base+'/admin');await page.locator('#settings-link').click();assert.match(page.url(),/settings/);await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])').catch(async error=>{console.error(await page.locator('#error').innerText(),errors);throw error;});assert.equal(await page.locator('#sections button').count(),6);assert.equal(await page.locator('#token').inputValue(),'');
 // El selector se previsualiza sin guardar y publica solo por el formulario protegido.
 for(const theme of ['metodomogollon','nexo']){
  await page.locator('[data-section-button="experience"]').click();
  await page.locator('[name="experience.theme"]').selectOption(theme);
  assert.equal(await page.locator('#preview-card').getAttribute('data-theme'),theme);
  const previous=await kiosk.locator('body').getAttribute('data-theme');assert.notEqual(previous,theme);
  const saved=page.waitForResponse(r=>r.url().endsWith('/api/admin/configuration')&&r.request().method()==='PUT');await page.locator('#save').click();assert.equal((await saved).status(),200);
  await kiosk.evaluate(()=>window.dispatchEvent(new Event('focus')));await kiosk.waitForFunction(theme=>document.body.dataset.theme===theme,theme);
 }
 await page.locator('[data-section-button="business"]').click();
 const shot=process.env.SCREENSHOT_DIR;if(shot){mkdirSync(shot,{recursive:true});await page.screenshot({path:join(shot,'configuracion-negocio.png'),fullPage:true});}
 await page.locator('[name="profile.name"]').fill('Brisa · Limpieza');await page.locator('[name="business.type"]').selectOption('general');await page.locator('[name="business.description"]').fill('Servicios de limpieza para hogares y oficinas.');await page.locator('[name="business.timezone"]').selectOption('America/Bogota');await page.locator('[name="business.currency"]').selectOption('COP');await page.locator('[name="business.phone"]').fill('555-0100');
 await page.locator('[data-section-button="assistant"]').click();await page.locator('[name="assistant.name"]').fill('Luna');await page.locator('[name="assistant.addressStyle"]').selectOption('tu');await page.locator('[name="assistant.welcome"]').fill('Hola, soy {asistente} de {negocio}. ¿Qué quieres consultar?');await page.locator('[name="assistant.topics"]').fill('limpieza, oficinas, hogares');assert.match(await page.locator('#preview-greeting').innerText(),/Luna de Brisa/);
 await page.locator('[data-section-button="ai"]').click();await page.locator('[name="ai.model"]').selectOption('gpt-4.1-mini');if(shot)await page.screenshot({path:join(shot,'configuracion-modelo.png'),fullPage:true});
 await page.locator('[data-section-button="experience"]').click();await page.locator('[name="experience.videoEnabled"]').uncheck();await page.locator('[name="experience.voiceEnabled"]').uncheck();await page.locator('[name="experience.automaticVoice"]').uncheck();await page.locator('[name="experience.inactivityMinutes"]').fill('3');await page.locator('[name="experience.accent"]').selectOption('blue');
 await page.locator('[data-section-button="knowledge"]').click();await page.locator('[name="assistant.knowledgeMode"]').selectOption('custom');await page.locator('[name="assistant.knowledgeText"]').fill('[domicilio]\npregunta: ¿Atienden a domicilio?\nrespuesta: Sí, ofrecemos atención en {{centro.nombre}}.');
 await page.locator('[data-section-button="integrations"]').click();await page.locator('[name="booking.url"]').fill('https://example.com/reservas');await page.locator('#save').click();await page.waitForSelector('#saved:not([hidden])');
 await kiosk.evaluate(()=>window.dispatchEvent(new Event('focus')));await kiosk.waitForFunction(()=>document.querySelector('.center-label').textContent==='Brisa · Limpieza');assert.match(await kiosk.locator('#agent-heading').innerText(),/Luna/);assert.equal(await kiosk.locator('#start-video').isHidden(),true);assert.equal(await kiosk.locator('#start').isHidden(),true);assert.equal(await kiosk.locator('#mic').isHidden(),true);assert.equal(await kiosk.locator('.service-card').count(),0);assert.equal(await kiosk.locator('body').getAttribute('data-accent'),'blue');
 if(!await kiosk.locator('#home-panel').evaluate(e=>e.open))await kiosk.locator('#home-chat').click();await kiosk.locator('#message').fill('¿Atienden a domicilio?');await kiosk.locator('#send').click();await kiosk.locator('#accept-session').click();await kiosk.waitForSelector('.message.assistant');assert.match(await kiosk.locator('.message.assistant').last().innerText(),/Brisa/);assert.doesNotMatch(await kiosk.locator('.message.assistant').last().innerText(),/escuela/i);
 // Current settings survive a page reload. A stale editor cannot overwrite another window.
 await page.reload();await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])');assert.equal(await page.locator('[name="profile.name"]').inputValue(),'Brisa · Limpieza');assert.equal(await page.locator('[name="ai.model"]').inputValue(),'gpt-4.1-mini');await page.locator('[data-section-button="assistant"]').click();assert.equal(await page.locator('[name="assistant.name"]').inputValue(),'Luna');
 const headers={Authorization:'Bearer '+adminToken,'Content-Type':'application/json'};const stale=await(await fetch(base+'/api/admin/configuration',{headers})).json();await fetch(base+'/api/admin/configuration',{method:'PUT',headers,body:JSON.stringify({revision:stale.revision,profile:stale.profile,configuration:stale.configuration})});await page.locator('[name="assistant.name"]').fill('Cambio no guardado');await page.locator('#save').click();await page.waitForSelector('#error:not([hidden])');assert.match(await page.locator('#error').innerText(),/Otra ventana/);
 page.on('dialog',dialog=>dialog.accept());await page.locator('#reload').click();await page.waitForFunction(()=>document.querySelector('[name="assistant.name"]').value==='Luna');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-section-button="assistant"]').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(shot)await page.screenshot({path:join(shot,'configuracion-movil.png'),fullPage:true});
 await page.locator('#logout').click();assert.equal(await page.locator('#dashboard').isHidden(),true);assert.equal(await page.locator('#fields').innerText(),'');assert.equal(await page.locator('#token').inputValue(),'');assert.equal(paidCalls,0);assert.deepEqual(errors,[]);console.log('✓ Configuración: acceso, seis secciones, vista previa, guardado, negocio genérico, FAQ, actualización del kiosco, móvil y conflictos. Sin IA ni video de pago.');
}finally{await browser.close();await new Promise(r=>server.close(r));repo.close();}
