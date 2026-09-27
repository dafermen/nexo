/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/live-avatar.js
 * Conectar video/audio remoto y coordinar habla del avatar.
 * Entrada: api, stage, video, audio y callbacks; texto a reproducir.
 * Salida: Estado de conexión y reproducción; stop libera sesión y recursos.
 * Estado importante: generation invalida eventos antiguos; mode distingue FULL/LITE; deadlines
 * limitan duración.
 * Efectos y límites: Pide sesión al backend; LiveKit lleva medios y LITE lleva PCM. No poner la
 * clave privada LiveAvatar en este archivo público.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import { LiteAvatarTransport } from './live-avatar-lite.js';
let sdkPromise;
export function loadLiveKit() {
  if (window.LivekitClient) return Promise.resolve(window.LivekitClient);
  if (!sdkPromise) sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = '/vendor/livekit-client-2.22.3.umd.min.js';
    script.onload = () => window.LivekitClient ? resolve(window.LivekitClient) : reject(new Error('No se pudo cargar el reproductor de video.'));
    script.onerror = () => { script.remove(); sdkPromise = null; reject(new Error('No se pudo cargar el reproductor de video.')); };
    document.head.append(script);
  });
  return sdkPromise;
}

/** Remote video + TTS adapter. Never publishes microphone/camera tracks. */
export class LiveAvatarProvider {
  constructor({ api, stage, video, audio, loadSdk = loadLiveKit, cleanupFetch = fetch, createSocket, onStatus = () => {}, onError = () => {}, onAudioBlocked = () => {} }) {
    Object.assign(this, { api, stage, video, audio, loadSdk, cleanupFetch, createSocket, onStatus, onError, onAudioBlocked });
    this.ready = false; this.connecting = false; this.generation = 0; this.room = null; this.pendingSpeech = null;
    this.video.autoplay = true; this.video.playsInline = true; this.video.muted = true; this.audio.autoplay = true;
  }
  async start(options) {
    if (this.connecting || this.ready) throw new Error('La prueba ya está iniciada.');
    const generation = ++this.generation;
    const current = () => generation === this.generation;
    this.connecting = true; this.onStatus('connecting'); this.controller = new AbortController();
    const startedAt = performance.now(); this.ownerToken = this.api.token;
    try {
      // Load playback support before allocating a potentially billable remote session.
      const sdk = await this.loadSdk();
      if (!current()) return;
      const session = await this.api.request('/api/avatar/session', { method: 'POST', body: options, signal: this.controller.signal });
      if (!current()) return;
      this.session = session;
      // The video is hidden until its first frame. Adaptive visibility would pause
      // that subscription and prevent play() from ever completing during startup.
      const room = new sdk.Room({ adaptiveStream: false, dynacast: false }); this.room = room;
      let gotVideo = false, gotAudio = false;
      let resolveMedia, rejectMedia;
      const media = new Promise((resolve, reject) => { resolveMedia = resolve; rejectMedia = reject; });
      // Attach a rejection handler immediately, even if room.connect has not settled yet.
      media.catch(() => {});
      const maybeReady = () => { if (gotVideo && gotAudio) resolveMedia(); };
      this.rejectMedia = rejectMedia;
      this.mediaTimer = setTimeout(() => rejectMedia(new Error('No llegaron audio y video a tiempo. Comprueba la conexión o la cuenta de LiveAvatar.')), 25_000);
      room.on(sdk.RoomEvent.TrackSubscribed, track => {
        if (!current()) return;
        if (track.kind === 'video') {
          track.attach(this.video);
          this.video.play().then(() => { if (current()) { gotVideo = true; maybeReady(); } }).catch(() => rejectMedia(new Error('El navegador no pudo reproducir el video.')));
        } else if (track.kind === 'audio') {
          track.attach(this.audio); gotAudio = true; maybeReady();
          this.audio.play().catch(() => { if (current()) this.onAudioBlocked(); });
        }
      });
      const handleEvent = event => {
        if (!current()) return;
        if (event.session_id && event.session_id !== session.id) return;
        if (event.event_type === 'session.stopped') {
          this.stop().catch(() => {}); this.onError('La prueba de video terminó. Puedes continuar con la imagen y la conversación local.'); return;
        }
        const speech = this.pendingSpeech;
        if (!speech || (session.integrationMode === 'LITE' ? event.source_event_id !== speech.eventId : event.source_event_id && event.source_event_id !== speech.eventId)) return;
        if (event.event_type === 'avatar.speak_started' && !speech.started) {
          speech.started = true; this.audio.muted = false; clearTimeout(this.speechTimer);
          this.onStatus('speaking', { responseDelayMs: Math.round(performance.now() - speech.sentAt) });
          speech.onStart?.();
        } else if (['avatar.speak_ended', 'avatar.speak_interrupted'].includes(event.event_type)) {
          this.pendingSpeech = null; clearTimeout(this.speechTimer); speech.onEnd?.(); this.onStatus('ready');
        }
      };
      room.on(sdk.RoomEvent.DataReceived, (data, participant, kind, topic) => {
        if (session.integrationMode === 'LITE' || topic !== 'agent-response') return;
        let event; try { event = JSON.parse(new TextDecoder().decode(data)); } catch { return; }
        handleEvent(event);
      });
      let controls = Promise.resolve();
      if (session.integrationMode === 'LITE') {
        this.lite = new LiteAvatarTransport({ createSocket: this.createSocket,
          onEvent: event => handleEvent({ ...event, event_type: event.type?.replace('agent.speak_', 'avatar.speak_') }),
          onFailure: message => {
            if (!current()) return;
            rejectMedia(new Error(message));
            if (this.ready) { this.stop().catch(() => {}); this.onError(message); }
          },
        });
        controls = this.lite.connect(session.websocketUrl); controls.catch(() => {});
      }
      room.on(sdk.RoomEvent.Disconnected, () => {
        if (!current()) return;
        rejectMedia(new Error('La conexión de video se cerró.'));
        if (this.ready) { this.stop().catch(() => {}); this.onError('Se perdió la conexión de video. La imagen de Nexo sigue disponible.'); }
      });
      await room.connect(session.roomUrl, session.roomToken, { autoSubscribe: true });
      if (!current()) { await room.disconnect(); return; }
      try { await room.startAudio(); } catch { this.onAudioBlocked(); }
      await Promise.all([media, controls]);
      if (!current()) return;
      clearTimeout(this.mediaTimer); this.rejectMedia = null;
      this.ready = true; this.connecting = false; this.stage.classList.add('video-ready');
      this.stage.setAttribute('aria-label', session.mode === 'sandbox' ? 'Avatar de prueba técnica Wayne, video en tiempo real' : 'Recepcionista virtual, video en tiempo real');
      this.timer = setTimeout(() => { this.stop().catch(() => {}); this.onError('Finalizó el minuto de videollamada.'); }, Math.max(0, session.expiresAt - Date.now()));
      this.onStatus('ready', { connectionMs: Math.round(performance.now() - startedAt), mode: session.mode, expiresAt: session.expiresAt });
      return session;
    } catch (error) {
      if (!current()) return;
      await this.stop().catch(() => {}); throw error;
    }
  }
  async command(type, extra = {}, eventId = crypto.randomUUID()) {
    if (!this.room || !this.session) throw new Error('El video no está conectado.');
    if (this.lite) return this.lite.command(type.replace('avatar.', 'agent.'), extra, eventId);
    const packet = { event_id: eventId, event_type: type, session_id: this.session.id, ...extra };
    await this.room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(packet)), { reliable: true, topic: 'agent-control' });
  }
  speak(text, callbacks = {}) {
    if (!this.ready) { callbacks.onError?.('El video todavía no está listo.'); return; }
    this.stopSpeech();
    const eventId = crypto.randomUUID();
    const speech = { ...callbacks, eventId, started: false, sentAt: performance.now() }; this.pendingSpeech = speech;
    const failed = message => {
      if (this.pendingSpeech !== speech) return;
      this.stopSpeech(); callbacks.onError?.(message); callbacks.onEnd?.();
    };
    this.speechTimer = setTimeout(() => {
      if (this.pendingSpeech !== speech) return;
      this.stopSpeech(); callbacks.onError?.('LiveAvatar no inició la respuesta. Puedes reintentar con Escuchar.'); callbacks.onEnd?.();
    }, this.lite ? 45_000 : 15_000);
    if (this.lite) {
      this.speechAbort = new AbortController(); const signal = this.speechAbort.signal;
      this.api.request('/api/tts', { method: 'POST', body: { text: text.slice(0, 3000) }, signal })
        .then(result => {
          if (this.pendingSpeech !== speech || signal.aborted) return;
          return this.lite.speak(result.audioBase64, eventId, signal);
        }).catch(error => { if (!signal.aborted) failed(error.message || 'No se pudo enviar la voz al avatar.'); });
      return;
    }
    this.command('avatar.speak_text', { text: text.slice(0, 6000) }, eventId).catch(() => {
      if (this.pendingSpeech !== speech) return;
      this.stopSpeech(); callbacks.onError?.('No se pudo enviar la respuesta al avatar.'); callbacks.onEnd?.();
    });
  }
  stopSpeech() {
    this.pendingSpeech = null; this.speechAbort?.abort(); this.speechAbort = null; clearTimeout(this.speechTimer); this.audio.muted = true;
    if (this.ready) this.command('avatar.interrupt').catch(() => {});
  }
  async resumeAudio() { if (this.room) { await this.room.startAudio(); await this.audio.play(); } }
  async stop() {
    ++this.generation; this.controller?.abort(); this.controller = null;
    clearTimeout(this.timer); clearTimeout(this.mediaTimer); this.rejectMedia?.(new Error('Prueba detenida.')); this.rejectMedia = null;
    this.stopSpeech(); this.ready = false; this.connecting = false;
    this.lite?.disconnect(); this.lite = null;
    const room = this.room; this.room = null; this.session = null;
    this.video.pause(); this.audio.pause(); this.video.srcObject = null; this.audio.srcObject = null;
    this.stage.classList.remove('video-ready');
    this.stage.setAttribute('aria-label', 'Nexo, recepcionista virtual con retrato generado por IA');
    this.onStatus('stopped');
    const owner = this.ownerToken; this.ownerToken = null;
    try { await room?.disconnect(); } finally {
      if (owner) {
        const response = await this.cleanupFetch('/api/avatar/session', { method: 'DELETE', headers: { Authorization: `Bearer ${owner}` }, keepalive: true, signal: AbortSignal.timeout(15_000) });
        if (!response.ok && response.status !== 401) throw new Error('El video se cerró localmente; el proveedor todavía debe confirmar el cierre remoto.');
      }
    }
  }
}
