/**
 * NEXO · GUÍA DEL MÓDULO: tests/admin.e2e.js
 * E2E de navegador de admin.
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
import {schoolCenter} from '../server/center.js';
import {DemoAiProvider} from '../server/providers/ai.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repository=createRepository(':memory:');
const adminToken='test-admin-key-for-isolated-ui-only';
const server=createApp({config:{provider:'demo',avatarProvider:'portrait',center:schoolCenter,adminToken,sessionTtlMs:300000,retentionDays:7},repository,ai:new DemoAiProvider(),localTts:{status:()=>({available:false}),stop(){},close(){}}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const context=await browser.newContext({viewport:{width:1366,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const kiosk=await page.context().newPage();await kiosk.goto(base);await kiosk.waitForSelector('.service-card',{state:'attached'});
 await page.goto(base+'/admin');await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])');
 assert.equal(await page.locator('.admin-service').count(),3);assert.equal(await page.locator('#token').inputValue(),'');
 await page.locator('.admin-service button').first().click();await page.locator('[name=price]').fill('123.45');await page.locator('[name=duration]').fill('45');await page.locator('[name=modality]').selectOption('Presencial');await page.locator('[name=requirements]').fill('Comprobante de inscripción de prueba.');await page.locator('#save-service').click();await page.waitForSelector('#service-dialog:not([open])',{state:'attached'});await page.waitForFunction(()=>document.querySelector('#saved').textContent.includes('Servicio guardado'));
 assert.match(await page.locator('.admin-service').first().innerText(),/123.45/);
 await kiosk.evaluate(()=>window.dispatchEvent(new Event('focus')));await kiosk.waitForFunction(()=>document.querySelector('#services').textContent.includes('123.45'));
 await kiosk.locator('#home-services').click();await kiosk.locator('.service-card').first().click();assert.match(await kiosk.locator('#booking-content').innerText(),/Comprobante de inscripción de prueba/);assert.match(await kiosk.locator('#booking-content').innerText(),/45 minutos/);await kiosk.locator('#booking-content button').click();
 console.log('✓ Editar servicio actualiza el kiosco abierto, precio, duración y requisitos.');
 await page.locator('#school-details summary').click();await page.locator('#school-form [name=name]').fill('Escuela de prueba');await page.locator('[name=close-0]').fill('17:00');await page.locator('#school-form button').click();await page.waitForFunction(()=>document.querySelector('#saved').textContent.includes('Escuela y horarios guardados'));
 const cfg=await (await fetch(base+'/api/config')).json();assert.equal(cfg.center.name,'Escuela de prueba');assert.match(cfg.center.hours,/17:00/);assert.equal(cfg.center.booking.enabled,false);
 await page.locator('#school-details summary').click();
 await page.locator('#new-service').click();await page.locator('#service-form [name=name]').fill('Servicio de prueba');await page.locator('[name=description]').fill('Descripción para una prueba aislada.');await page.locator('[name=active]').uncheck();await page.locator('#save-service').click();await page.waitForFunction(()=>document.querySelectorAll('.admin-service').length===4);
 const catalog=await (await fetch(base+'/api/services')).json();assert.equal(catalog.length,3);assert.equal(catalog.some(s=>s.name==='Servicio de prueba'),false);
 console.log('✓ Horarios editables y alta de servicio pausado sin publicarlo ni habilitar reservas.');
 const shot=process.env.SCREENSHOT_DIR;if(shot){mkdirSync(shot,{recursive:true});await page.screenshot({path:join(shot,'panel-escritorio.png'),fullPage:true});}
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.admin-service button').first().click();assert.ok(await page.locator('#service-dialog').evaluate(el=>el.getBoundingClientRect().right<=innerWidth));if(shot)await page.screenshot({path:join(shot,'panel-editor-movil.png'),fullPage:true});
 await page.locator('#close-editor').click();await page.locator('#logout').click();assert.equal(await page.locator('#dashboard').isHidden(),true);assert.equal(await page.locator('#service-admin').innerText(),'');assert.equal(await page.locator('#token').inputValue(),'');assert.deepEqual(errors,[]);
 console.log('✓ Editor móvil, cierre de sesión y limpieza; sin errores JavaScript ni proveedores externos.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));repository.close();}
