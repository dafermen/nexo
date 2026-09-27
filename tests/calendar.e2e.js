/**
 * NEXO · GUÍA DEL MÓDULO: tests/calendar.e2e.js
 * E2E de navegador de calendar.
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
import {schoolCenter} from '../server/center.js';
import {calendarFixture} from './calendar-fixture.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const f=calendarFixture(),adminToken='google-calendar-browser-test-token';await f.authorize();
const app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,adminToken,sessionTtlMs:300000,googleCalendar:f.config},ai:{async reply(){throw Error('No AI expected');}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),async stop(){},async close(){}}});app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.log('Browser error:',e.message);});page.on('dialog',d=>d.accept());
 await page.goto(base+'/settings');await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])');await page.locator('[data-section-button="integrations"]').click();await page.waitForFunction(()=>document.querySelector('#calendar-select').options.length===4);
 assert.equal(await page.locator('#calendar-select option:disabled').count(),1);assert.equal(await page.locator('#calendar-test').isDisabled(),true);
 await page.locator('#calendar-select').selectOption(f.calendars[1].id);await page.locator('#calendar-save').click();await page.waitForFunction(()=>document.querySelector('.calendar-notice').textContent.includes('Calendario guardado'));
 assert.equal(f.repo.readCalendarConnection().selected.id,f.calendars[1].id);await page.locator('#calendar-check').click();await page.waitForFunction(()=>document.querySelector('.calendar-notice').textContent.includes('Lectura correcta'));
 await page.locator('#calendar-test').click();await page.waitForFunction(()=>document.querySelector('.calendar-notice').textContent.includes('evento creado, leído y eliminado'));assert.equal(f.events.size,0);
 f.flags.deleteFails=true;await page.locator('#calendar-test').click();await page.waitForSelector('#calendar-cleanup:not([hidden])');assert.equal(await page.locator('#calendar-test').isDisabled(),true);f.flags.deleteFails=false;await page.locator('#calendar-cleanup').click();await page.locator('#calendar-cleanup').waitFor({state:'hidden'});assert.equal(f.events.size,0);
 const shot=process.env.SCREENSHOT_DIR;if(shot){mkdirSync(shot,{recursive:true});await page.screenshot({path:join(shot,'calendar-desktop.png'),fullPage:true});}
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(shot)await page.screenshot({path:join(shot,'calendar-mobile.png'),fullPage:true});
 await page.locator('#calendar-disconnect').click();await page.waitForFunction(()=>document.querySelector('.calendar-notice').textContent.includes('Cuenta desconectada'));assert.equal(f.service.status().connected,false);
 await page.locator('#logout').click();assert.equal(await page.locator('#calendar-settings').count(),0);assert.deepEqual(errors,[]);
 console.log('✓ Calendar: selección por ID, permisos de lectura, comprobación, creación y limpieza, fallo recuperable, desconexión y móvil. Google simulado; sin correo, IA ni LiveAvatar.');
}finally{await browser.close();await new Promise(r=>app.close(r));f.repo.close();}
