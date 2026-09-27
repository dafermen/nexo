/**
 * NEXO · GUÍA DEL MÓDULO: tests/admin-access.e2e.js
 * E2E de navegador de admin access.
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
import {SqliteFaqRepository} from '../server/sqlite-faq.js';
import {schoolCenter} from '../server/center.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repository=createRepository(':memory:'),faq=new SqliteFaqRepository(repository,new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url));await faq.refresh();
const messages=[],email='admin@example.test';
const server=createApp({repository,faq,config:{provider:'demo',center:schoolCenter,installation:{email,mode:'email'},sessionTtlMs:300000},ai:{async reply(){throw new Error('No provider calls');}},adminMailer:{ready:true,async sendCode(v){messages.push(v);},close(){}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),async stop(){},async close(){}}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const context=await browser.newContext({viewport:{width:1366,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/admin');await page.waitForSelector('#admin-email');assert.ok(await page.locator('#login').isHidden());
 await page.locator('#admin-email').fill(email);await page.locator('#request-admin-code').click();await page.waitForSelector('#admin-code');assert.equal(messages.length,1);
 await page.locator('#admin-code').fill(messages[0].code==='00000000'?'11111111':'00000000');await page.locator('#verify-admin-code').click();await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('inválido'));
 await page.locator('#admin-code').fill(messages[0].code);await page.locator('#verify-admin-code').click();await page.waitForSelector('#dashboard:not([hidden])');
 const cookies=await context.cookies(base+'/api');assert.equal(cookies.find(c=>c.name==='nexo_admin').httpOnly,true);assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 const settings=await context.newPage();await settings.goto(base+'/settings');await settings.waitForSelector('#dashboard:not([hidden])');
 await page.getByRole('link',{name:'Respuestas frecuentes',exact:true}).click();await page.locator('#text-mode').click();await page.waitForSelector('#source');const original=await page.locator('#source').inputValue();
 await page.locator('#source').fill('Esto no es válido');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('Línea'));assert.equal(repository.readKnowledge('school').revision,1);
 await page.locator('#source').fill(original+'\n\n[editor-prueba]\npregunta: Consulta de prueba del editor\nrespuesta: Respuesta confirmada del editor.');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#saved').textContent.includes('Respuestas guardadas'));assert.equal(repository.readKnowledge('school').revision,2);
 const shot=process.env.SCREENSHOT_DIR;if(shot){mkdirSync(shot,{recursive:true});await page.screenshot({path:join(shot,'respuestas-sqlite.png'),fullPage:true});}
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('#logout').click();await settings.waitForSelector('#admin-email');assert.ok(await page.locator('#dashboard').isHidden());assert.ok(await page.locator('#login').isHidden());assert.equal(await page.locator('#source').inputValue(),'');
 if(shot)await page.screenshot({path:join(shot,'acceso-correo-movil.png'),fullPage:true});
 assert.equal((await context.request.get(base+'/api/admin/overview')).status(),401);assert.deepEqual(errors,[]);
 console.log('✓ Código simulado, rechazo de código erróneo, cookie HttpOnly, acceso compartido, editor SQLite, validación, móvil y cierre entre pestañas. Sin correo real, IA ni LiveAvatar.');
}finally{await browser.close();await new Promise(r=>server.close(r));await server.closeAdminAuth();repository.close();}

