/**
 * NEXO · GUÍA DEL MÓDULO: tests/live-avatar.e2e.js
 * E2E de navegador de live avatar.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {join} from 'node:path';
import {mkdirSync} from 'node:fs';
// Lifecycle integration with explicit video/WebSocket/TTS doubles; no paid session is opened.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { createRepository } from '../server/db.js';
import { DemoAiProvider } from '../server/providers/ai.js';
import { pcmToWav } from '../server/providers/local-tts.js';
if(process.env.SCREENSHOT_DIR)mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repository = createRepository(':memory:');
const starts = [], stops = [], speech = [];
let occupied = false;
const liveAvatar = {
  status: () => ({ mode: 'LITE', configured: true, sandboxReady: true, paidEnabled: true, occupied, requirements: { key: true, avatar: true, voiceRequired: false } }),
  start: async (owner, options) => {
    starts.push({ owner, options }); occupied = true;
    return { id: 'test-session', integrationMode: 'LITE', mode: 'receptionist', websocketUrl: 'wss://test.liveavatar.com', roomUrl: 'wss://test.livekit.cloud', roomToken: 'temp', expiresAt: Date.now() + 60000 };
  },
  stop: async owner => { stops.push(owner); occupied = false; return { stopped: true }; }, close: async () => {},
};
const localTts = { status: () => ({ available: true, local: true }), stop() {}, close() {}, synthesize: async text => { speech.push(text); return { audioBase64: pcmToWav(Buffer.alloc(4410)).toString('base64') }; } };
const server = createApp({ config: { provider: 'demo', avatarProvider: 'liveavatar', sessionTtlMs: 300000, retentionDays: 7 }, repository, ai: new DemoAiProvider(), liveAvatar, localTts });
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1366 } });
  const errors = [], models = []; page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.url().endsWith('.glb')) models.push(r.url()); });
  await page.addInitScript(() => {
    window.__packets = [];
    // Real streaming/autoplay cannot be validated by these substitutes.
    const realPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { return this.tagName === 'VIDEO' ? realPlay.call(this) : Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function () {};
    class Socket {
      readyState = 1; bufferedAmount = 0; handlers = {};
      constructor() { setTimeout(() => this.emit({ type: 'session.state_updated', state: 'connected' }), 20); }
      addEventListener(name, fn) { this.handlers[name] = fn; }
      emit(event) { this.handlers.message?.({ data: JSON.stringify(event) }); }
      send(text) {
        const packet = JSON.parse(text); window.__packets.push(packet);
        if (packet.type === 'agent.speak_end') {
          this.emit({ type: 'agent.speak_started', source_event_id: packet.event_id });
          setTimeout(() => this.emit({ type: 'agent.speak_ended', source_event_id: packet.event_id }), 20);
        }
      }
      close() { this.readyState = 3; this.handlers.close?.(); }
    }
    window.WebSocket = Socket;
    class Room {
      handlers = {};
      on(name, fn) { this.handlers[name] = fn; }
      async connect() {
        const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
        const ctx = canvas.getContext('2d'), portrait = new Image(); portrait.src = '/assets/recepcionista-v1.png'; await portrait.decode();
        const paint = () => {
          ctx.fillStyle = '#526c60'; ctx.fillRect(0, 0, 1280, 720); ctx.drawImage(portrait, 290, 30, 700, 700);
          ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('SIMULACIÓN VISUAL · PRUEBA SIN CRÉDITOS', 35, 370);
        };
        paint(); this.paintTimer = setInterval(paint, 100);
        this.stream = canvas.captureStream(10);
        this.handlers.track({ kind: 'video', attach: el => { el.srcObject = this.stream; } });
        this.handlers.track({ kind: 'audio', attach() {} });
      }
      async startAudio() {}
      async disconnect() { clearInterval(this.paintTimer); this.stream?.getTracks().forEach(t => t.stop()); }
    }
    window.LivekitClient = { Room, RoomEvent: { TrackSubscribed: 'track', DataReceived: 'data', Disconnected: 'disconnected' } };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForSelector('.service-card',{state:'attached'}); await page.waitForTimeout(150);
  assert.equal(starts.length, 0); assert.equal(models.length, 0);
  console.log('✓ Espera sin sesión remota ni descarga de modelo 3D');
  await page.locator('#start-video').click(); await page.locator('#accept-session').click();
  await page.waitForSelector('#avatar.video-ready');
  await page.waitForFunction(() => window.__packets.some(p => p.type === 'agent.speak_end'));
  assert.equal(starts.length, 1); assert.equal(starts[0].options.consent, true); assert.equal(speech.length, 1);
  assert.ok(await page.locator('.message.assistant').count());
  console.log('✓ Iniciar conecta LITE y transmite la voz de la respuesta del chat');
  assert.equal(await page.locator('body.video-first').count(), 1);
  assert.equal(await page.locator('.workspace').isVisible(), false);
  const assertCallFits = async () => {
    const boxes = await page.evaluate(() => {
      const video = document.querySelector('#avatar-video').getBoundingClientRect();
      return { width: innerWidth, height: innerHeight, video: { width: video.width, height: video.height }, controls: [...document.querySelectorAll('.call-dock button')].map(b => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; }), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(boxes.video.width >= boxes.width * .98 && boxes.video.height >= boxes.height * .98);
    assert.equal(boxes.overflow, false);
    assert.ok(boxes.controls.every(r => r.x >= 0 && r.y >= 0 && r.right <= boxes.width && r.bottom <= boxes.height && r.width >= 44 && r.height >= 44));
  };
  await assertCallFits();
  await page.screenshot({ path: process.env.SCREENSHOT_DIR?join(process.env.SCREENSHOT_DIR,'llamada-vertical.png'):fileURLToPath(new URL('../docs/capturas/llamada-vertical.png', import.meta.url)) });
  await page.locator('#call-rotate').click();
  assert.equal(await page.locator('#avatar-video').evaluate(v => getComputedStyle(v).objectFit), 'contain');
  await page.locator('#call-rotate').click();
  assert.equal(await page.locator('#avatar-video').evaluate(v => getComputedStyle(v).objectFit), 'cover');
  assert.equal(starts.length, 1, 'Cambiar encuadre no abre otra sesión');
  await page.locator('#call-chat').click(); assert.equal(await page.locator('.workspace').isVisible(), true);
  await page.locator('#message').fill('Borrador privado');
  await page.keyboard.press('Escape'); assert.equal(await page.locator('.workspace').isVisible(), false);
  assert.equal(await page.locator('#call-chat').evaluate(b => b === document.activeElement), true);
  await page.locator('#call-sound').click(); assert.equal(await page.locator('#call-sound').getAttribute('aria-pressed'), 'false');
  for (const size of [{ width: 1366, height: 1024 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size); await assertCallFits();
    if (size.width === 1366) {
      await page.locator('#call-rotate').click();
      await page.screenshot({ path: process.env.SCREENSHOT_DIR?join(process.env.SCREENSHOT_DIR,'llamada-horizontal.png'):fileURLToPath(new URL('../docs/capturas/llamada-horizontal.png', import.meta.url)) });
    }
  }
  await page.locator('#call-hangup').click();
  await page.waitForFunction(() => !document.body.classList.contains('video-first'));
  assert.equal(await page.locator('#message').inputValue(), ''); assert.equal(await page.locator('.message').count(), 0);
  assert.equal(await page.locator('#home-services').isVisible(), true);
  console.log('✓ Video ocupa la pantalla; encuadre sin reconectar, controles táctiles, texto y colgar vuelven al inicio limpio');
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.locator('#start-video').click(); await page.locator('#accept-session').click();
  await page.waitForSelector('#avatar.video-ready');
  await page.waitForFunction(() => window.__packets.filter(p => p.type === 'agent.speak_end').length >= 2);
  await page.waitForTimeout(100);
  await page.evaluate(() => { const now = Date.now.bind(Date); Date.now = () => now() + 46000; });
  await page.waitForFunction(() => !document.querySelector('#avatar').classList.contains('video-ready'));
  await page.waitForFunction(() => document.querySelector('#end-session').hidden);
  assert.ok(stops.length > 0); assert.equal(await page.locator('.message').count(), 0);
  await page.waitForTimeout(100); assert.equal(starts.length, 2);
  console.log('✓ Inactividad cierra video, limpia la atención y no reconecta sola');
  await page.locator('#start-video').click(); await page.locator('#accept-session').click();
  await page.waitForSelector('#avatar.video-ready');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => document.querySelector('#end-session').hidden);
  assert.equal(await page.locator('#avatar.video-ready').count(), 0); assert.deepEqual(errors, []);
  console.log('✓ Salir de la pantalla cierra el video; sin errores JavaScript');
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, value: false }));
  // Move both clocks past the start-rate window, without waiting a real minute.
  const actualNow = Date.now.bind(Date), clockStart = actualNow() + 61000;
  Date.now = () => actualNow() + 61000;
  await page.clock.install({ time: new Date(clockStart) });
  await page.locator('#start-video').click(); await page.locator('#accept-session').click();
  await page.waitForSelector('#avatar.video-ready');
  for (let i = 0; i < 4; i++) { await page.clock.fastForward(14000); await page.locator('#call-rotate').click(); }
  await page.clock.fastForward(5000);
  await page.waitForFunction(() => !document.body.classList.contains('video-first'));
  assert.equal(await page.locator('#end-session').isVisible(), false);
  assert.equal(await page.locator('.message').count(), 0);
  assert.equal(await page.locator('#home-services').isVisible(), true);
  console.log('✓ Límite de un minuto vuelve al inicio y limpia la sesión incluso con actividad');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); repository.close(); }
