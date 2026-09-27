/**
 * NEXO · GUÍA DEL MÓDULO: tests/browser.e2e.js
 * E2E de navegador de browser.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Optional: npm install --no-save playwright && npx playwright install chromium
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createApp } from '../server/app.js';
import { createRepository } from '../server/db.js';
import { DemoAiProvider } from '../server/providers/ai.js';
import { pcmToWav } from '../server/providers/local-tts.js';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repository = createRepository(':memory:');
const config = { provider: 'demo', adminToken: 'browser-test-admin-token-123456789', sessionTtlMs: 300_000, retentionDays: 7 };
const spoken = [];
const localTts = { status: () => ({available:true, local:true}), stop() {}, close() {}, synthesize: async text => { spoken.push(text); return { audioBase64: pcmToWav(Buffer.alloc(8820)).toString('base64') }; } };
const server = createApp({ config, repository, ai: new DemoAiProvider(), localTts });
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
let passed = 0;
const pass = label => { passed++; console.log(`✓ ${label}`); };
const screenshots = new URL('../docs/capturas/', import.meta.url);
await mkdir(screenshots, { recursive: true });
const { fileURLToPath } = await import('node:url');
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  // Exercise UI wiring with explicit doubles. This is not a real microphone test.
  await context.addInitScript(() => {
    window.__spoken = [];
    class MockUtterance { constructor(text) { this.text = text; } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      cancel() {}, getVoices: () => [{ lang: 'es-ES', localService: true }],
      speak(u) { window.__spoken.push(u.text); setTimeout(() => { u.onstart?.(); setTimeout(() => u.onend?.(), 50); }, 10); },
    } });
    class MockRecognition {
      start() { window.__recognition = this; }
      abort() { this.onend?.(); }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: MockRecognition });
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base); await page.waitForSelector('.service-card',{state:'attached'});
  await page.waitForSelector('#avatar.portrait-ready');
  assert.equal(await page.locator('.avatar-canvas').count(), 0, 'El kiosco remoto no carga un modelo 3D en espera.');
  assert.ok(await page.locator('.avatar-photo').evaluate(image => image.naturalWidth > 0));
  assert.equal(await page.locator('.service-card').count(), 3);
  assert.equal(await page.locator('#mode').innerText(), 'DEMO · Sin IA real');
  await page.screenshot({ path: fileURLToPath(new URL('inicio.png', screenshots)), fullPage: true });
  pass('Inicio, catálogo y modo demo explícito');

  await page.locator('#home-options').click();await page.locator('#avatar-live').click();
  await page.waitForFunction(() => document.querySelector('#avatar-config-status').textContent.includes('Falta configurar'));
  assert.equal(await page.locator('#avatar-connect').isDisabled(), true);
  assert.match(await page.locator('#avatar-dialog').innerText(), /Wayne/);
  await page.screenshot({ path: fileURLToPath(new URL('avatar-configuracion.png', screenshots)), fullPage: true });
  await page.keyboard.press('Escape');
  // Load the bundled SDK under the actual CSP; no external session is created.
  assert.equal(await page.evaluate(async () => {
    const { loadLiveKit } = await import('/providers/live-avatar.js');
    return typeof (await loadLiveKit()).Room;
  }), 'function');
  pass('Video informa configuración faltante y carga SDK local sin abrir sesión remota');

  await page.keyboard.press('Escape');await page.locator('#home-chat').click();await page.locator('#message').fill('Hola'); await page.locator('#send').click(); await page.locator('#accept-session').click();
  await page.waitForSelector('.message.assistant');
  assert.match(await page.locator('.message.assistant').innerText(), /modo de prueba/);
  await page.waitForTimeout(300); assert.ok(spoken.length > 0);
  pass('Inicio con consentimiento, respuesta de demo y llamada TTS');

  await page.locator('#mic').click(); await page.locator('#accept-voice').click();
  await page.waitForFunction(() => !!window.__recognition);
  await page.evaluate(() => {
    const result = [{ transcript: '¿Cómo reservo un turno?' }]; result.isFinal = true;
    window.__recognition.onresult({ results: [result] }); window.__recognition.onend();
  });
  assert.equal(await page.locator('#message').inputValue(), '¿Cómo reservo un turno?');
  await page.locator('#send').click();
  await page.waitForFunction(() => document.querySelectorAll('.message.assistant').length === 2);
  await page.screenshot({ path: fileURLToPath(new URL('conversacion.png', screenshots)), fullPage: true });
  pass('Transcripción simulada editable, envío y respuesta');

  await page.locator('#message').fill('<img src=x onerror=alert(1)>'); await page.locator('#send').click();
  await page.waitForFunction(() => document.querySelectorAll('.message.assistant').length === 3);
  assert.equal(await page.locator('.message-body img').count(), 0);
  pass('Texto del visitante se presenta sin interpretar HTML');

  if(!await page.locator('#home-panel').evaluate(e=>e.open))await page.locator('#home-services').click();else await page.locator('#services-tab').click(); await page.locator('.service-card').first().click();
  await page.waitForSelector('.slot'); await page.locator('.slot').first().click();
  await page.locator('[name="customerName"]').fill('Persona de prueba'); await page.locator('[name="email"]').fill('qa@example.test');
  await page.locator('[name="consent"]').check(); await page.getByRole('button', { name: 'Revisar turno' }).click();
  await page.getByRole('button', { name: 'Confirmar turno' }).click();
  await page.waitForSelector('.receipt-code'); assert.equal(repository.listAppointments().length, 1);
  await page.screenshot({ path: fileURLToPath(new URL('turno.png', screenshots)), fullPage: true });
  await page.getByRole('button', { name: 'Finalizar atención' }).click();
  assert.equal(await page.locator('.message').count(), 0); assert.equal(await page.locator('#message').inputValue(), '');
  pass('Reserva completa persistida y limpieza de pantalla al finalizar');

  if(!await page.locator('#home-panel').evaluate(e=>e.open))await page.locator('#home-services').click();else await page.locator('#services-tab').click(); await page.locator('.service-card').first().click(); await page.locator('#accept-session').click();
  await page.waitForSelector('.slot'); await page.locator('.slot').first().click();
  await page.locator('[name="customerName"]').fill('No debe permanecer');
  await page.clock.install(); await page.clock.fastForward(61_000); await page.waitForFunction(() => !document.querySelector('#booking-dialog').open);
  assert.equal(await page.locator('[name="customerName"]').count(), 0);
  pass('Un minuto de inactividad limpia el inicio y elimina datos de formulario');
  await context.close();

  const adminPage = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  await adminPage.goto(base + '/admin'); await adminPage.locator('#token').fill(config.adminToken); await adminPage.getByRole('button', { name: 'Entrar' }).click();
  await adminPage.waitForSelector('#dashboard:not([hidden])'); assert.equal(await adminPage.locator('#appointments tr').count(), 1);
  if(!await adminPage.locator('.history').evaluate(e=>e.open))await adminPage.locator('.history summary').click();
  adminPage.once('dialog', dialog => dialog.accept()); await adminPage.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await adminPage.waitForFunction(() => document.querySelector('#appointments').textContent.includes('Cancelado'));
  await adminPage.getByRole('button', { name: 'Pausar servicio' }).first().click(); await adminPage.waitForSelector('text=Pausado');
  await adminPage.screenshot({ path: fileURLToPath(new URL('administracion.png', screenshots)), fullPage: true });
  await adminPage.locator('#logout').click(); assert.equal(await adminPage.locator('#appointments tr').count(), 0);
  pass('Administración: autenticar, cancelar, pausar servicio y cerrar sesión');
  await adminPage.close();

  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  await fallback.addInitScript(() => { Object.defineProperty(window, 'SpeechRecognition', { value: undefined }); Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined }); });
  await fallback.goto(base); await fallback.waitForSelector('.service-card',{state:'attached'});
  await fallback.waitForSelector('#avatar.portrait-ready');
  assert.equal(await fallback.locator('.avatar-canvas').count(), 0);
  assert.equal(await fallback.locator('#mic').isDisabled(), true);
  assert.ok(await fallback.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await fallback.screenshot({ path: fileURLToPath(new URL('movil.png', screenshots)), fullPage: true });
  await fallback.setViewportSize({ width: 1080, height: 1920 });
  assert.ok(await fallback.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await fallback.screenshot({ path: fileURLToPath(new URL('vertical.png', screenshots)), fullPage: true });
  pass('Pantallas móvil y vertical sin desbordamiento y fallback sin STT');
  await fallback.close();

  assert.deepEqual(errors, []); pass('Sin errores JavaScript en el recorrido principal');
  console.log(`${passed} recorridos de navegador aprobados. Voz probada con dobles; prueba física pendiente.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); repository.close(); }
