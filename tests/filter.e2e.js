/**
 * NEXO · GUÍA DEL MÓDULO: tests/filter.e2e.js
 * E2E de navegador de filter.
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
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
import {schoolCenter} from '../server/center.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:');const calls=[];
const app=createApp({repository:repo,config:{provider:'openai',model:'fake',center:schoolCenter,avatarProvider:'portrait',sessionTtlMs:300000,retentionDays:7,aiLimits:{sessionCalls:1}},ai:{reply:async input=>{calls.push(input);return{text:'Podemos orientarle sobre la preparación para el examen.'};}},localTts:{status:()=>({available:false}),stop(){},close(){}}});
app.listen(0,'127.0.0.1');await once(app,'listening');const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+app.address().port);await page.waitForSelector('.service-card',{state:'attached'});
 let replies=0;
 const ask=async(text,first=false)=>{if(!await page.locator('#home-panel').evaluate(e=>e.open))await page.locator('#home-chat').click();else await page.locator('#chat-tab').click();await page.locator('#message').fill(text);await page.locator('#send').click();if(first)await page.locator('#accept-session').click();await page.waitForFunction(count=>document.querySelectorAll('.message.assistant').length===count,++replies);return page.locator('.message.assistant').last().innerText();};
 assert.match(await ask('¿Cuánto cuesta el curso de las 5 horas?',true),/pendiente/);assert.match(await ask('¿Y cuánto dura?'),/300 minutos/);assert.equal(calls.length,0);
 await ask('Necesito orientación para preparar mi examen de manejo');assert.equal(calls.length,1);
 await ask('Necesito ayuda para preparar mi examen de manejo');assert.equal(calls.length,1);assert.equal(await page.locator('#services-view').isVisible(),true);
 assert.match(await ask('¿Y los requisitos?'),/pendientes/);assert.equal(calls.length,1);
 await page.locator('#end-session').click();replies=0;
 await ask('Escriba una receta de pizza',true);await ask('Programe un videojuego para la escuela');assert.equal(await page.locator('#services-view').isVisible(),true);await ask('Necesito orientación para preparar mi examen de manejo');assert.equal(calls.length,1);
 assert.deepEqual(errors,[]);console.log('✓ Filtro visible: contexto local, cupo de IA, dos desvíos y retorno al catálogo sin consultas extra.');
}finally{await browser.close();await new Promise(resolve=>app.close(resolve));repo.close();}
