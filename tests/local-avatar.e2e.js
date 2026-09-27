/**
 * NEXO · GUÍA DEL MÓDULO: tests/local-avatar.e2e.js
 * E2E de navegador de local avatar.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Requires the installed local Piper runtime and Edge/Chromium. No speech doubles.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { createRepository } from '../server/db.js';
import { DemoAiProvider } from '../server/providers/ai.js';
import { LocalTtsService } from '../server/providers/local-tts.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
assert.ok(new LocalTtsService().status().available, 'Instala la voz local antes de ejecutar esta prueba real.');
const repository = createRepository(':memory:');
const server = createApp({config:{provider:'demo',avatarProvider:'local3d',sessionTtlMs:300000,retentionDays:7},repository,ai:new DemoAiProvider()});
server.listen(0,'127.0.0.1'); await once(server,'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}}), errors=[], external=[], audio=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
  await page.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(base+'/') || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    external.push(url);return route.abort();
  });
  page.on('response',async response=>{if(response.url().endsWith('/api/tts') && response.ok()) audio.push(await response.json());});
  let releaseModel;
  const modelGate = new Promise(resolve => { releaseModel = resolve; });
  await page.route('**/assets/recepcionista-3d.glb', async route => { await modelGate; await route.continue(); });
  await page.goto(base);
  await page.waitForSelector('#avatar.local-3d-loading');
  assert.equal(await page.locator('.avatar-photo').isVisible(),false,'No mostrar otra identidad mientras se carga el 3D.');
  releaseModel();
  await page.waitForSelector('#avatar.local-3d-ready',{timeout:60000});
  const still = await page.locator('#avatar').screenshot();
  await page.waitForTimeout(800);
  assert.notDeepEqual(await page.locator('#avatar').screenshot(),still,'El avatar debe cambiar de pose durante la espera.');
  await page.locator('#start').click();await page.locator('#accept-session').click();
  await page.waitForFunction(()=>Number(document.querySelector('#avatar').dataset.mouthLevel)>.03,{}, {timeout:60000});
  assert.equal(audio[0].provider,'piper-local');assert.ok(audio[0].duration>1);
  assert.equal(Buffer.from(audio[0].audioBase64,'base64').toString('ascii',0,4),'RIFF');
  await page.screenshot({path:fileURLToPath(new URL('../docs/capturas/avatar-local-hablando.png',import.meta.url)),fullPage:true});
  await page.locator('#sound').click();
  await page.waitForFunction(()=>Number(document.querySelector('#avatar').dataset.mouthLevel)===0);
  await page.locator('.replay').first().click();
  await page.waitForFunction(()=>Number(document.querySelector('#avatar').dataset.mouthLevel)>.03,{}, {timeout:60000});
  await page.locator('#end-session').click();
  await page.waitForFunction(()=>Number(document.querySelector('#avatar').dataset.mouthLevel)===0);
  assert.equal(await page.locator('.message').count(),0);
  await page.locator('#avatar-local').click();assert.equal(await page.locator('#avatar').evaluate(x=>x.classList.contains('local-3d-ready')),false);
  await page.locator('#avatar-local').click();assert.equal(await page.locator('#avatar').evaluate(x=>x.classList.contains('local-3d-ready')),true);
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log('Prueba real local aprobada: modelo 3D, cambios de pose, Piper/WAV, movimiento de boca, silencio, repetición, cierre y cambio de imagen. Sin peticiones externas desde la página.');
  console.log('No evalúa oído humano, precisión fonética ni micrófono físico.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));repository.close();}
