/**
 * NEXO · GUÍA DEL MÓDULO: tests/docs.e2e.js
 * E2E de navegador de docs.
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
import {mkdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createRepository} from '../server/db.js';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repository=createRepository(':memory:');
const server=createApp({config:{provider:'demo',center:schoolCenter,sessionTtlMs:300000},repository,ai:{reply(){throw new Error('Unexpected paid provider');}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{async close(){}}});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,permissions:["clipboard-read","clipboard-write"]}),admin=await context.newPage();await admin.goto(base+'/admin');
 const opened=context.waitForEvent('page');await admin.locator('#documentation-link').click();const page=await opened;const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.waitForSelector('body[data-ready="true"]');assert.match(page.url(),/\/docs/);assert.equal(await page.locator('.doc-card').count(),10);assert.equal(await page.locator('.learning-grid .doc-card').count(),4);assert.equal(await page.evaluate(()=>window.opener===null),true);
 const shot=process.env.SCREENSHOT_DIR;if(shot){mkdirSync(shot,{recursive:true});await page.screenshot({path:join(shot,'documentacion-inicio.png'),fullPage:true});}
 // Recorrido educativo real: portada -> mapa -> ficha del servidor -> manual junior.
 // Las referencias deben ser enlaces navegables, no texto que aparenta ser un enlace.
 await page.locator('.learning-grid .doc-card').first().click();
 await page.waitForFunction(()=>document.querySelector('.document h1')?.textContent==='Mapa del código fuente de Nexo');
 await page.locator('.document').getByRole('link',{name:'Servidor',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.document h1')?.textContent==='Referencia: Servidor y reglas de negocio');
 assert.match(await page.locator('.document').innerText(),/reserveAiCall/);
 await page.locator('.document').getByRole('link',{name:'manual junior',exact:true}).first().click();
 await page.waitForFunction(()=>document.querySelector('.document h1')?.textContent==='Manual del desarrollador junior');
 assert.match(await page.locator('.document').innerText(),/Semilla|semilla/);
 await page.locator('.docs-code-copy').first().click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replaceAll('\r\n','\n'),(await page.locator('.document pre').first().textContent()).replaceAll('\r\n','\n'));
 await page.locator('#docs-theme').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');

 await page.locator('[data-category="Aprender el código"]').click();
 await page.waitForFunction(()=>document.querySelector('#view h1')?.textContent==='Aprender el código');
 assert.equal(await page.locator('.doc-card').count(),10);
 await page.locator('#search').fill('git clone https://github.com/dafermen/nexo.git');await page.waitForFunction(()=>document.querySelector('#view h1')?.textContent==='Resultados de búsqueda');await page.waitForFunction(()=>document.querySelectorAll('.doc-card').length===1);assert.match(await page.locator('.doc-card').innerText(),/GitHub/i);await page.locator('.doc-card').click();await page.waitForSelector('.document h1');assert.match(await page.locator('.document h1').innerText(),/GitHub/i);
 await page.locator('.toc a').first().click();await page.waitForSelector('.document h1');assert.ok(page.url().includes('heading='));
 await page.evaluate(()=>window.print=()=>{window.printRequested=true;});await page.getByRole('button',{name:'Imprimir / PDF'}).click();assert.equal(await page.evaluate(()=>window.printRequested),true);
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar',exact:true}).click();const download=await downloaded;assert.equal(download.suggestedFilename(),'24-manual-github.md');assert.match(readFileSync(await download.path(),'utf8'),/git clone https:\/\/github\.com\/dafermen\/nexo\.git/);
 if(shot)await page.screenshot({path:join(shot,'documentacion-manual.png'),fullPage:true});
 await page.locator('[data-nav=tasks]').click();await page.waitForSelector('.phase');assert.equal(await page.locator('.phase').count(),10);await page.getByRole('button',{name:'Pendientes',exact:true}).click();assert.ok(await page.locator('.task').count()>0);assert.equal(await page.locator('.task .pill.completed').count(),0);if(shot)await page.screenshot({path:join(shot,'documentacion-tareas.png'),fullPage:true});
 await page.locator('[data-nav=library]').click();await page.waitForSelector('.doc-card');const count=await page.locator('.doc-card').count();assert.ok(count>=30);await page.locator('[data-category="Licencias"]').click();await page.waitForFunction(()=>document.querySelector('#view h1')?.textContent==='Licencias');assert.equal(await page.locator('.doc-card').count(),7);
 const catalog=await(await fetch(base+'/api/docs/catalog')).json();
 await page.goto(base+'/docs#doc='+catalog.documents.find(d=>d.path==='docs/03-arquitectura.md').id);await page.waitForSelector('.document');assert.match(await page.locator('#view .notice').innerText(),/evolución/);
 // Parse every Nexo document: supported internal documentation links must resolve.
 const audit=await page.evaluate(async catalog=>{
   const {renderDocument}=await import('/docs-renderer.js');const broken=[];
   for(const doc of catalog.documents){const result=renderDocument(doc.searchText,{path:doc.path,documents:catalog.documents,assets:catalog.assets});for(const n of result.fragment.querySelectorAll('.file-reference')){const href=n.title.replace('Referencia local: ','');if(/\.(md|txt)(?:#.*)?$/.test(href)&&!href.includes(':')&&!href.startsWith('/')&&!href.startsWith('../conocimiento'))broken.push({path:doc.path,href});}}
   const result=renderDocument('# Safe\n\n<script>window.UNSAFE=true</script>\n\n[Unsafe](javascript:alert(1))\n\n![remote](https://example.com/tracker.png)\n\n[Bad](#%E0%A4%A)\n\n| A | B |\n|---|---|\n| 1 | 2 |',{path:catalog.documents[0].path,documents:catalog.documents,assets:catalog.assets});const holder=document.createElement('div');holder.append(result.fragment);document.body.append(holder);const safe=!holder.querySelector('script,iframe,img,[onclick]')&&![...holder.querySelectorAll('a')].some(a=>a.href.startsWith('javascript:'))&&!window.UNSAFE;holder.remove();return {broken,safe};
 },catalog);assert.equal(audit.safe,true);assert.deepEqual(audit.broken,[]);
 await page.goto(base+'/docs');await page.waitForSelector('body[data-ready="true"]');await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#menu-toggle').click();await page.locator('[data-nav=tasks]').click();await page.waitForSelector('.phase');assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.goto(base+'/docs#doc='+catalog.documents.find(d=>d.path==='docs/23-manual-desarrollador-junior.md').id);await page.waitForSelector('.document');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(shot)await page.screenshot({path:join(shot,'documentacion-movil.png'),fullPage:true});
 await page.locator('#search').fill('zzzinexistente');await page.waitForSelector('.empty');assert.equal(await page.locator('.doc-card').count(),0);
 assert.deepEqual(errors,[]);assert.ok(!requests.some(url=>/api\/(chat|sessions|avatar\/session|tts)/.test(url)));console.log('✓ Portal: nueva pestaña, búsqueda en contenido, lectura, índice, impresión, descarga, fases, categorías y móvil.');console.log('✓ Todos los documentos analizados, enlaces internos comprobados y Markdown seguro; sin llamadas a IA ni video.');
}finally{await browser.close();await new Promise(r=>server.close(r));repository.close();}
