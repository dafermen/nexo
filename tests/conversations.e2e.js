/**
 * NEXO · GUÍA DEL MÓDULO: tests/conversations.e2e.js
 * E2E de navegador de conversations.
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
const repo=createRepository(':memory:'),adminToken='history-ui-test-credential';
const server=createApp({repository:repo,config:{provider:'demo',center:schoolCenter,adminToken,sessionTtlMs:300000},ai:{async reply(){return{text:'Respuesta de prueba.'};}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),async stop(){},async close(){}}});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const context=await browser.newContext({viewport:{width:1366,height:950}}),kiosk=await context.newPage(),page=await context.newPage(),errors=[];for(const p of [page,kiosk])p.on('pageerror',e=>errors.push(e.message));
 await kiosk.goto(base);await kiosk.waitForSelector('.service-card',{state:'attached'});if(!await kiosk.locator('#home-panel').evaluate(e=>e.open))await kiosk.locator('#home-chat').click();await kiosk.locator('#message').fill('Buenos días');await kiosk.locator('#send').click();assert.match(await kiosk.locator('#welcome-dialog').innerText(),/historial privado/);await kiosk.locator('#accept-session').click();await kiosk.waitForSelector('.message.assistant');
 await kiosk.locator('#home-panel-close').click();await kiosk.locator('#new-conversation').click();assert.equal(await kiosk.locator('.message').count(),0);
 await page.goto(base+'/conversations');await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.waitForSelector('.history-item');await page.locator('.history-item').first().click();await page.waitForSelector('.turn');assert.match(await page.locator('#turns').innerText(),/Buenos días/);
 const download=page.waitForEvent('download');await page.locator('#download').click();const exported=await download;assert.match(exported.suggestedFilename(),/^nexo-conversacion-.*\.txt$/);assert.match(readFileSync(await exported.path(),'utf8'),/Buenos días/);
 const id=repo.listConversations()[0].id,t=repo.startConversationTurn(id,{message:'<img src=x onerror=alert(1)>'});repo.completeConversationTurn(t,{text:'Texto sin ejecutar.'});
 await page.locator('#refresh').click();await page.locator('.history-item').first().click();await page.waitForFunction(()=>document.querySelectorAll('.turn').length===2);assert.equal(await page.locator('#turns img').count(),0);
 const shot=process.env.SCREENSHOT_DIR;if(shot){mkdirSync(shot,{recursive:true});await page.screenshot({path:join(shot,'historial-escritorio.png'),fullPage:true});}
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(shot)await page.screenshot({path:join(shot,'historial-movil.png'),fullPage:true});
 await page.locator('#logout').click();assert.equal(await page.locator('#turns').innerText(),'');assert.equal(await page.locator('#conversations').innerText(),'');assert.ok(await page.locator('#dashboard').isHidden());assert.deepEqual(errors,[]);
 console.log('✓ Aviso, conversación persistida tras limpiar inicio, acceso protegido, lectura, descarga TXT, texto seguro, móvil y limpieza al salir. Sin correo ni proveedores externos.');
}finally{await browser.close();await new Promise(r=>server.close(r));repo.close();}

