/**
 * NEXO · GUÍA DEL MÓDULO: tests/live-avatar.test.js
 * Pruebas unitarias y de integración de live avatar.
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
import { LiveAvatarService, SANDBOX_AVATAR_ID } from '../server/providers/live-avatar.js';
import { LiveAvatarProvider } from '../public/providers/live-avatar.js';

const id = '11111111-1111-4111-8111-111111111111';
const settings = { mode: 'FULL', durationSeconds: 60, allowPaid: true, apiKey: 'test-private-key', avatarId: '22222222-2222-4222-8222-222222222222', voiceId: '33333333-3333-4333-8333-333333333333' };
const options = { mode: 'receptionist', consent: true, costConsent: true };
const ok = data => ({ ok: true, json: async () => ({ code: 100, data }) });
function serviceFixture(t, override) {
  const calls = [];
  const service = new LiveAvatarService(settings, { fetchImpl: async (url, request) => {
    calls.push({ url, ...request });
    if (override) { const result = await override(url, request); if (result) return result; }
    if (url.endsWith('/token')) return ok({ session_id: id, session_token: 'secret-session-token' });
    if (url.endsWith('/start')) return ok({ session_id: id, livekit_url: 'wss://test.livekit.cloud', livekit_client_token: 'temporary-room-token', livekit_agent_token: 'private-agent-token' });
    return ok(null);
  } });
  t.after(async () => { await service.close().catch(() => {}); if (service.active) clearTimeout(service.active.timer); });
  return { service, calls };
}

test('avatar sin cuenta informa requisitos y no llama servicios externos', async () => {
  let calls = 0; const service = new LiveAvatarService({}, { fetchImpl: async () => calls++ });
  assert.equal(service.status().configured, false);
  await assert.rejects(service.start('owner', options), error => error.status === 503);
  assert.equal(calls, 0);
});
test('avatar exige consentimiento y modo válido', async t => {
  const { service, calls } = serviceFixture(t);
  for (const input of [{ ...options, consent: false }, { ...options, mode: 'unknown' }]) await assert.rejects(service.start('owner', input), error => error.status === 400);
  assert.equal(calls.length, 0);
});
test('sesión de recepcionista es acotada y solo devuelve token de sala', async t => {
  const { service, calls } = serviceFixture(t);
  const result = await service.start('owner', options);
  const sent = JSON.parse(calls[0].body);
  assert.equal(sent.max_session_duration, 60); assert.equal(sent.avatar_id, settings.avatarId);
  assert.equal(sent.interactivity_type, 'PUSH_TO_TALK'); assert.equal(sent.avatar_persona.language, 'es');
  assert.equal(sent.is_sandbox, false); assert.equal(result.roomToken, 'temporary-room-token');
  const exposed = JSON.stringify(result) + JSON.stringify(service.status());
  for (const secret of [settings.apiKey, 'secret-session-token', 'private-agent-token']) assert.ok(!exposed.includes(secret));
  await service.stop('owner');
  assert.equal(JSON.parse(calls.at(-1).body).session_id, id);
  assert.equal(calls.at(-1).headers['X-API-KEY'], settings.apiKey);
});
test('sandbox es explícito y usa únicamente el avatar técnico documentado', async t => {
  const { service, calls } = serviceFixture(t);
  await service.start('owner', { mode: 'sandbox', consent: true, costConsent: false });
  const sent = JSON.parse(calls[0].body);
  assert.equal(sent.avatar_id, SANDBOX_AVATAR_ID); assert.equal(sent.is_sandbox, true);
});
test('no abre dos sesiones y otra sesión local no puede detener el video', async t => {
  const { service } = serviceFixture(t); await service.start('owner', options);
  await assert.rejects(service.start('other', options), error => error.status === 409);
  await service.stop('other'); assert.equal(service.status().occupied, true);
  await service.stop('owner'); assert.equal(service.status().occupied, false);
});
test('error al iniciar intenta cerrar la sesión remota conocida', async t => {
  const { service, calls } = serviceFixture(t, async url => url.endsWith('/start') ? { ok: false, status: 503 } : null);
  await assert.rejects(service.start('owner', options), error => error.status === 503);
  assert.ok(calls.at(-1).url.endsWith('/stop')); assert.equal(service.status().occupied, false);
});
test('cancelar durante creación no deja iniciar un video tardío', async t => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { service, calls } = serviceFixture(t, async url => { if (url.endsWith('/token')) await gate; });
  const started = service.start('owner', options);
  assert.equal((await service.stop('owner')).pending, true); release();
  await assert.rejects(started, error => error.status === 409);
  assert.ok(!calls.some(call => call.url.endsWith('/start'))); assert.ok(calls.at(-1).url.endsWith('/stop'));
});
test('no conecta a una URL ajena devuelta por el proveedor', async t => {
  const { service } = serviceFixture(t, async url => url.endsWith('/start') ? ok({ session_id: id, livekit_url: 'wss://attacker.example', livekit_client_token: 'temp' }) : null);
  await assert.rejects(service.start('owner', options), error => error.status === 502);
  assert.equal(service.status().occupied, false);
});
test('cierre remoto fallido mantiene bloqueo y reporta cierre pendiente', async t => {
  let fail = true;
  const { service } = serviceFixture(t, async url => url.endsWith('/stop') && fail ? { ok: false, status: 503 } : null);
  await service.start('owner', options);
  await assert.rejects(service.stop('owner'), error => error.status === 503);
  assert.equal(service.status().stopPending, true);
  await assert.rejects(service.start('owner', options), error => error.status === 409);
  fail = false; await service.stop('owner'); assert.equal(service.status().occupied, false);
});

function clientFixture(t) {
  let room; const commands = [], deleted = [], statuses = [];
  const events = { TrackSubscribed: 'track', DataReceived: 'data', Disconnected: 'disconnected' };
  class Room {
    constructor() { room = this; this.handlers = {}; this.localParticipant = { publishData: async (data, options) => commands.push({ packet: JSON.parse(new TextDecoder().decode(data)), options }) }; }
    on(event, handler) { this.handlers[event] = handler; }
    async connect() { this.handlers.track({ kind: 'video', attach() {} }); this.handlers.track({ kind: 'audio', attach() {} }); }
    async startAudio() {}
    async disconnect() { this.handlers.disconnected?.(); }
  }
  const classes = new Set();
  const mediaElement = () => ({ play: async () => {}, pause() {}, srcObject: null });
  const provider = new LiveAvatarProvider({
    api: { token: 'local-owner', request: async () => ({ id, roomUrl: 'wss://test.livekit.cloud', roomToken: 'temp', mode: 'receptionist', expiresAt: Date.now() + 60_000 }) },
    stage: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) }, setAttribute() {} },
    video: mediaElement(), audio: mediaElement(), loadSdk: async () => ({ Room, RoomEvent: events }),
    cleanupFetch: async (url, options) => { deleted.push(options); return { ok: true }; },
    onStatus: state => statuses.push(state),
  });
  const emit = event => room.handlers.data(new TextEncoder().encode(JSON.stringify({ session_id: id, ...event })), null, null, 'agent-response');
  t.after(() => provider.stop());
  return { provider, commands, deleted, classes, statuses, emit };
}
test('reproductor espera medios y envía exactamente speak_text sin usar otro agente', async t => {
  const f = clientFixture(t); await f.provider.start(options);
  assert.equal(f.provider.ready, true); assert.ok(f.classes.has('video-ready'));
  let started = 0, ended = 0;
  f.provider.speak('Hola, soy Nexo.', { onStart: () => started++, onEnd: () => ended++ });
  const message = f.commands.find(command => command.packet.event_type === 'avatar.speak_text');
  assert.equal(message.packet.text, 'Hola, soy Nexo.'); assert.equal(message.options.topic, 'agent-control');
  assert.ok(!f.commands.some(command => command.packet.event_type === 'avatar.speak_response'));
  f.emit({ event_type: 'avatar.speak_started', source_event_id: message.packet.event_id });
  f.emit({ event_type: 'avatar.speak_ended', source_event_id: message.packet.event_id });
  assert.equal(started, 1); assert.equal(ended, 1);
});
test('detener limpia medios, silencia y descarta eventos de habla antiguos', async t => {
  const f = clientFixture(t); await f.provider.start(options);
  let starts = 0; f.provider.speak('Primera respuesta', { onStart: () => starts++ });
  const first = f.commands.at(-1).packet.event_id; f.provider.stopSpeech();
  f.emit({ event_type: 'avatar.speak_started', source_event_id: first }); assert.equal(starts, 0);
  await f.provider.stop();
  assert.equal(f.provider.ready, false); assert.equal(f.classes.has('video-ready'), false);
  assert.equal(f.provider.audio.muted, true); assert.equal(f.provider.video.srcObject, null);
  assert.equal(f.deleted[0].headers.Authorization, 'Bearer local-owner');
});
