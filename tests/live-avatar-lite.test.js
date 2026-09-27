/**
 * NEXO · GUÍA DEL MÓDULO: tests/live-avatar-lite.test.js
 * Pruebas unitarias y de integración de live avatar lite.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { wavToPcm24k } from '../public/providers/avatar-audio.js';
import { LiteAvatarTransport } from '../public/providers/live-avatar-lite.js';
import { LiveAvatarProvider } from '../public/providers/live-avatar.js';
import { LiveAvatarService } from '../server/providers/live-avatar.js';
import { pcmToWav } from '../server/providers/local-tts.js';
import { readConfig } from '../server/config.js';

const id = '11111111-1111-4111-8111-111111111111';
const wav = (rate = 22050, seconds = 1) => {
  const samples = Buffer.alloc(rate * seconds * 2);
  for (let i = 0; i < samples.length; i += 2) samples.writeInt16LE(1234, i);
  return pcmToWav(samples, rate).toString('base64');
};
class Socket {
  readyState = 1; bufferedAmount = 0; handlers = {}; sent = [];
  addEventListener(name, handler) { this.handlers[name] = handler; }
  emit(event) { this.handlers.message({ data: JSON.stringify(event) }); }
  send(text) { this.sent.push(JSON.parse(text)); }
  close() { this.readyState = 3; this.handlers.close?.(); }
}

test('PCM LITE conserva duración y amplitud al convertir 22050/44100 a 24000 Hz', () => {
  for (const rate of [22050, 44100]) {
    const converted = wavToPcm24k(wav(rate));
    assert.equal(converted.byteLength, 48000);
    assert.equal(Buffer.from(converted).readInt16LE(0), 1234);
    assert.equal(Buffer.from(converted).readInt16LE(47998), 1234);
  }
});
test('voz rechaza WAV truncado y formatos estéreo', () => {
  const stereo = Buffer.from(wav(), 'base64'); stereo.writeUInt16LE(2, 22);
  assert.throws(() => wavToPcm24k(stereo.toString('base64')), /mono/);
  assert.throws(() => wavToPcm24k(Buffer.from(wav(), 'base64').subarray(0, 50).toString('base64')), /incompleto/);
});
test('LITE espera estado conectado y transmite PCM en bloques más speak_end', async t => {
  const socket = new Socket(), transport = new LiteAvatarTransport({ createSocket: () => socket });
  t.after(() => transport.disconnect());
  const connected = transport.connect('wss://test.liveavatar.com');
  assert.throws(() => transport.command('agent.interrupt'), /listo/);
  socket.emit({ type: 'session.state_updated', state: 'connected' }); await connected;
  await transport.speak(wav(22050, 2), 'utterance', new AbortController().signal);
  assert.deepEqual(socket.sent.map(e => e.type), ['agent.speak', 'agent.speak', 'agent.speak_end']);
  assert.equal(Buffer.from(socket.sent[0].audio, 'base64').length, 48000);
  assert.ok(socket.sent.every(e => e.event_id === 'utterance'));
});
test('LITE cancelado no envía voz y desconectar resuelve una conexión pendiente', async () => {
  const socket = new Socket(), transport = new LiteAvatarTransport({ createSocket: () => socket });
  const connection = transport.connect('wss://test.liveavatar.com');
  transport.disconnect(); await assert.rejects(connection, /cancelada/);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(transport.speak(wav(), 'stale', abort.signal), { name: 'AbortError' });
  assert.equal(socket.sent.length, 0);
});

function service(t, overrides = {}, ws = 'wss://control.liveavatar.com/session') {
  const calls = [];
  const instance = new LiveAvatarService({ apiKey: 'secret-key', avatarId: id, mode: 'LITE', allowPaid: true, durationSeconds: 180, ...overrides }, {
    fetchImpl: async (url, request) => {
      calls.push({ url, ...request });
      const data = url.endsWith('/token') ? { session_id: id, session_token: 'secret-session' }
        : url.endsWith('/start') ? { session_id: id, livekit_url: 'wss://test.livekit.cloud', livekit_client_token: 'ephemeral', livekit_agent_token: 'secret-agent', ws_url: ws } : null;
      return { ok: true, json: async () => ({ code: 100, data }) };
    },
  });
  t.after(() => instance.close()); return { instance, calls };
}
test('servidor LITE no requiere voz remota y oculta credenciales permanentes', async t => {
  const { instance, calls } = service(t);
  assert.equal(instance.status().configured, true);
  const result = await instance.start('owner', { mode: 'receptionist', consent: true });
  const token = JSON.parse(calls[0].body);
  assert.equal(token.mode, 'LITE'); assert.equal(token.max_session_duration, 60);
  assert.equal(token.avatar_persona, undefined); assert.equal(token.video_settings.encoding, 'H264');
  assert.equal(result.integrationMode, 'LITE'); assert.equal(result.websocketUrl, 'wss://control.liveavatar.com/session');
  assert.ok(!JSON.stringify(result).includes('secret'));
});
test('visitante no puede habilitar créditos con parámetros del navegador', async t => {
  const { instance, calls } = service(t, { allowPaid: false });
  await assert.rejects(instance.start('owner', { mode: 'receptionist', consent: true, costConsent: true }), e => e.status === 403);
  assert.equal(calls.length, 0);
});
test('LITE rechaza control externo y cierra la sesión asignada', async t => {
  const { instance, calls } = service(t, {}, 'wss://attacker.example');
  await assert.rejects(instance.start('owner', { mode: 'receptionist', consent: true }), e => e.status === 502);
  assert.ok(calls.at(-1).url.endsWith('/stop')); assert.equal(instance.active, null);
});
test('LITE acepta el host HeyGen observado y mantiene el máximo de un minuto', async t => {
  const { instance, calls } = service(t, { durationSeconds: 180 }, 'wss://webrtc-signaling.heygen.io/session');
  const result = await instance.start('owner', { mode: 'receptionist', consent: true });
  assert.equal(result.websocketUrl, 'wss://webrtc-signaling.heygen.io/session');
  assert.equal(JSON.parse(calls[0].body).max_session_duration, 60);
});
test('LITE rechaza imitaciones del host HeyGen, puertos y conexiones sin TLS', async t => {
  for (const endpoint of ['wss://webrtc-signaling.heygen.io.attacker.example', 'wss://otro.heygen.io', 'ws://webrtc-signaling.heygen.io/session', 'wss://webrtc-signaling.heygen.io:8080/session']) {
    const { instance } = service(t, {}, endpoint);
    await assert.rejects(instance.start('owner', { mode: 'receptionist', consent: true }), e => e.status === 502);
    assert.equal(instance.active, null);
  }
});
test('configuración permite origen HTTPS exacto y limita duración del piloto', () => {
  assert.equal(readConfig({}).liveAvatar.mode, 'LITE');
  assert.equal(readConfig({ PUBLIC_ORIGIN: 'https://kiosco.example' }).publicOrigin, 'https://kiosco.example');
  for (const origin of ['http://kiosco.example', 'https://kiosco.example/ruta', 'https://kiosco.example/']) assert.throws(() => readConfig({ PUBLIC_ORIGIN: origin }));
  for (const duration of ['0', '61', '301', 'abc']) assert.throws(() => readConfig({ LIVEAVATAR_MAX_SECONDS: duration }));
});

function client(t, tts) {
  const socket = new Socket(), requests = [], deleted = [];
  class Room {
    handlers = {};
    on(name, handler) { this.handlers[name] = handler; }
    async connect() {
      this.handlers.track({ kind: 'video', attach() {} }); this.handlers.track({ kind: 'audio', attach() {} });
      socket.emit({ type: 'session.state_updated', state: 'connected' });
    }
    async startAudio() {}
    async disconnect() {}
  }
  const media = () => ({ play: async () => {}, pause() {} });
  const provider = new LiveAvatarProvider({
    api: { token: 'owner', request: async (url, request) => {
      requests.push({ url, ...request });
      if (url === '/api/tts') return tts ? tts(request) : { audioBase64: wav() };
      return { id, integrationMode: 'LITE', mode: 'receptionist', roomUrl: 'wss://test.livekit.cloud', roomToken: 'temp', websocketUrl: 'wss://test.liveavatar.com', expiresAt: Date.now() + 180000 };
    } },
    stage: { classList: { add() {}, remove() {} }, setAttribute() {} }, video: media(), audio: media(),
    loadSdk: async () => ({ Room, RoomEvent: { TrackSubscribed: 'track', DataReceived: 'data', Disconnected: 'disconnect' } }),
    createSocket: () => socket, cleanupFetch: async () => { deleted.push(true); return { ok: true }; },
  });
  t.after(() => provider.stop()); return { provider, socket, requests, deleted };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
test('adaptador LITE sintetiza texto, correlaciona habla e interrupción y libera sesión', async t => {
  const f = client(t); await f.provider.start({}); let starts = 0, ends = 0;
  f.provider.speak('Hola.', { onStart: () => starts++, onEnd: () => ends++ }); await tick();
  const speech = f.socket.sent.find(e => e.type === 'agent.speak'); assert.ok(speech);
  assert.equal(f.requests.find(e => e.url === '/api/tts').body.text, 'Hola.');
  f.socket.emit({ type: 'agent.speak_started', source_event_id: 'old' }); assert.equal(starts, 0);
  f.socket.emit({ type: 'agent.speak_started', source_event_id: speech.event_id }); assert.equal(starts, 1);
  f.socket.emit({ type: 'agent.speak_interrupted', source_event_id: speech.event_id }); assert.equal(ends, 1);
  assert.equal(f.provider.pendingSpeech, null);
  await f.provider.stop(); assert.equal(f.deleted.length, 1); assert.equal(f.socket.readyState, 3);
});
test('cancelar TTS impide envío tardío de audio a LiveAvatar', async t => {
  let release, signal;
  const gate = new Promise(resolve => { release = resolve; });
  const f = client(t, request => { signal = request.signal; return gate; });
  await f.provider.start({}); f.provider.speak('Respuesta antigua'); f.provider.stopSpeech();
  assert.equal(signal.aborted, true); release({ audioBase64: wav() }); await tick();
  assert.ok(!f.socket.sent.some(e => e.type === 'agent.speak'));
});
