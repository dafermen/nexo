/** NEXO · GUÍA DEL MÓDULO: tests/faq-editor.e2e.js
 * Entrada: navegador y negocio ficticio en memoria, sin correo ni proveedores.
 * Salida: validación del editor visual, conflicto, vista previa segura y móvil.
 * SCREENSHOT_DIR permite guardar una captura ilustrativa sin datos reales.
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
const repo=createRepository(':memory:'),faq=new SqliteFaqRepository(repo,new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url));await faq.refresh();
const token='editor-browser-test-123456789',server=createApp({repository:repo,faq,config:{provider:'demo',center:schoolCenter,adminToken:token,sessionTtlMs:300000},ai:{async reply(){throw Error('No IA');}},localTts:{status:()=>({available:false}),close(){}},liveAvatar:{status:()=>({configured:false}),async close(){}}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'/knowledge');await page.locator('#token').fill(token);await page.locator('#login button').click();await page.waitForSelector('#dashboard:not([hidden])');
 assert.ok(await page.locator('#source').isHidden());
 await page.locator('#add-topic').click();await page.locator('#topic-id').fill('saludo-editor');await page.locator('#topic-category').fill('Bienvenida');
 await page.locator('#topic-questions').fill('¿Cómo puedo empezar?\nQuiero información para comenzar');await page.locator('#topic-answer').fill('Bienvenido a {{centro.nombre}}. Con gusto le ayudamos a elegir su servicio.');
 await page.locator('#preview').click();await page.waitForFunction(()=>document.querySelector('#preview-result').textContent.includes('MetodoMogollon'));
 assert.equal(repo.readKnowledge('school').revision,1);
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#saved').textContent.includes('guardadas'));assert.equal(repo.readKnowledge('school').revision,2);
 await page.locator('#category-filter').selectOption('Bienvenida');assert.equal(await page.locator('.topic-row').count(),1);await page.locator('.topic-row').click();
 await page.locator('#preview').click();await page.waitForSelector('#preview-result:not([hidden])');
 if(process.env.SCREENSHOT_DIR){mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.SCREENSHOT_DIR,'editor-faq.png'),fullPage:true});}
 await page.locator('#topic-answer').fill('<img src=x onerror="window.injected=true"> Texto literal');await page.locator('#preview').click();await page.waitForFunction(()=>document.querySelector('#preview-result').textContent.includes('<img'));
 assert.equal(await page.locator('#preview-result img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);
 await page.locator('#topic-active').uncheck();await page.locator('#preview').click();await page.waitForFunction(()=>document.querySelector('#preview-result').textContent.includes('pausado'));
 // Otro administrador publica; el borrador local debe conservarse al recibir 409.
 const saved=repo.readKnowledge('school');repo.saveKnowledge('school',saved.revision,saved.source+'\n# otro administrador');
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#error').textContent.includes('Otra ventana'));
 assert.match(await page.locator('#topic-answer').inputValue(),/Texto literal/);assert.equal(repo.readKnowledge('school').revision,3);
 await page.locator('#reload').click();await page.waitForFunction(()=>document.querySelector('#revision').textContent.includes('Versión 3'));
 await page.locator('#category-filter').selectOption('Bienvenida');await page.locator('.topic-row').click();await page.locator('#topic-active').uncheck();
 await page.locator('#text-mode').click();await page.waitForSelector('#source');assert.match(await page.locator('#source').inputValue(),/categoria: Bienvenida/);
 await page.locator('#visual-mode').click();await page.waitForSelector('#visual-editor:not([hidden])');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#revision').textContent.includes('Versión 4'));
 await page.locator('#active-filter').selectOption('paused');assert.equal(await page.locator('.topic-row').count(),1);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,id:e.id,width:e.getBoundingClientRect().width})).slice(0,12))));
 await page.locator('#logout').click();assert.ok(await page.locator('#dashboard').isHidden());assert.equal(await page.locator('#topic-answer').inputValue(),'');assert.equal(await page.locator('#source').inputValue(),'');assert.equal(await page.locator('#preview-result').textContent(),'');assert.deepEqual(errors,[]);
 console.log('✓ Editor visual: crear, categoría, vista previa, guardar, pausa, texto, conflicto, XSS, móvil y limpieza. Sin servicios de pago.');
}finally{await browser.close();await new Promise(r=>server.close(r));await server.closeAdminAuth();repo.close();}
