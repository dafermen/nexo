/** NEXO · GUÍA DEL MÓDULO: tests/publications.e2e.js
 * Navegador real: borrador, edición, aprobación, publicación, recuperación y panel responsive.
 * Base temporal en memoria, credencial ficticia y proveedores sin gasto.
 */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {createRepository} from '../server/db.js';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:'),key='isolated-publication-admin-test-key';
repo.seedKnowledge('school','[saludo]\npregunta: buenos días\nrespuesta: Buenos días.\n');
const server=createApp({repository:repo,config:{provider:'demo',center:schoolCenter,adminToken:key,sessionTtlMs:300000},ai:{reply(){throw Error('No AI');}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),async stop(){},async close(){}}});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
try{
 await page.goto(base+'/publications');await page.locator('#token').fill(key);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])');
 await page.locator('#template').click();await page.waitForSelector('#editor:not([hidden])');await page.locator('#service-picker').selectOption('cinco-horas');
 assert.equal(await page.locator('[name=price]').inputValue(),'');assert.equal(await page.locator('[name=publication]').inputValue(),'information');
 await page.locator('[name=description]').fill('Información del curso verificada en prueba.');await page.locator('#service-editor [name=duration]').fill('75');await page.locator('#service-editor [name=active]').uncheck();await page.locator('#faq-editor [name=answer]').fill('Respuesta revisada desde formulario visual.');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Borrador guardado'));
 assert.match(await page.locator('#diff').textContent(),/Duración en minutos/);assert.match(await page.locator('#diff').textContent(),/Visible en catálogo/);await page.locator('#approve').click();await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.includes('Aprobado'));
 await page.locator('#publish').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Contenido publicado'));
 assert.equal(repo.readCenterSettings().services.find(s=>s.id==='cinco-horas').description,'Información del curso verificada en prueba.');
 assert.match(repo.readKnowledge('school').source,/Respuesta revisada desde formulario visual/);
 assert.equal(await page.locator('#versions button').count(),2);await page.locator('#versions button').first().click();await page.waitForFunction(()=>document.querySelector('#source').value.startsWith('Restauración propuesta'));
 await page.locator('#close').click();mkdirSync('docs/capturas',{recursive:true});await page.screenshot({path:'docs/capturas/publicaciones-escritorio.png',fullPage:true});
 await page.goto(base+'/admin');await page.locator('#token').fill(key);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])');await page.waitForSelector('.admin-status-strip strong');
 assert.equal(await page.locator('#admin-home').isVisible(),true);await page.getByRole('button',{name:'Servicios',exact:true}).click();assert.equal(await page.locator('#service-admin').isVisible(),true);
 await page.getByRole('button',{name:'Inicio',exact:true}).click();await page.screenshot({path:'docs/capturas/administracion-inicio.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'docs/capturas/administracion-movil.png',fullPage:true});
 await page.goto(base+'/publications');await page.locator('#token').fill(key);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('#logout').click();assert.equal(await page.locator('#dashboard').isVisible(),false);assert.equal(await page.locator('#knowledge-source').inputValue(),'');assert.equal(await page.locator('#faq-editor [name=answer]').inputValue(),'');assert.deepEqual(errors,[]);
 console.log('Publicaciones y administración aprobadas en escritorio y móvil; sin gastos externos.');
}finally{await browser.close();await new Promise(r=>server.close(r));await server.closeAdminAuth();repo.close();}
