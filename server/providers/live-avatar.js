/**
 * NEXO · GUÍA DEL MÓDULO: server/providers/live-avatar.js
 * Controlar la sesión remota de video desde el servidor.
 * Entrada: Ajustes LiveAvatar y owner de sesión visitante.
 * Salida: Estado público y datos temporales para conectar video; errores controlados.
 * Estado importante: active identifica propietario; duration limita a 60 segundos; stopPending
 * evita crear otra sesión antes de cerrar.
 * Efectos y límites: Puede consumir servicio de pago. Cancelación y cierre deben alcanzar al
 * proveedor aunque el navegador ya no espere la respuesta.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import { HttpError } from '../errors.js';

export const SANDBOX_AVATAR_ID = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a';
export const AVATAR_DURATION_SECONDS = 60;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** One bounded remote session per local station. API credentials stay on the server. */
export class LiveAvatarService {
  constructor(settings = {}, { fetchImpl = fetch } = {}) {
    this.settings = settings; this.fetch = fetchImpl; this.active = null;
    this.mode = settings.mode || 'LITE';
    this.duration = Math.min(60, Math.max(30, Number(settings.durationSeconds) || 60));
  }
  status() {
    const key = !!this.settings.apiKey;
    const voice = uuid.test(this.settings.voiceId || '');
    const avatar = uuid.test(this.settings.avatarId || '');
    return {
      provider: 'liveavatar', configured: key && avatar && (this.mode === 'LITE' || voice), sandboxReady: key && (this.mode === 'LITE' || voice),
      mode: this.mode, paidEnabled: this.settings.allowPaid === true,
      requirements: { key, voice, avatar, voiceRequired: this.mode === 'FULL' }, durationSeconds: this.duration,
      occupied: !!this.active, stopPending: !!this.active?.cancelled,
    };
  }
  async request(path, { body, sessionToken } = {}) {
    let response;
    try {
      response = await this.fetch(`https://api.liveavatar.com/v1/${path}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12_000),
        headers: { 'Content-Type': 'application/json', ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : { 'X-API-KEY': this.settings.apiKey }) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new HttpError(503, 'No se pudo conectar con LiveAvatar. Comprueba la conexión e intenta nuevamente.'); }
    if (!response.ok) {
      if (path === 'sessions/stop' && response.status === 404) return null;
      const message = [401, 403].includes(response.status) ? 'LiveAvatar rechazó el acceso. Revisa la clave y los permisos de la cuenta.'
        : response.status === 402 ? 'La cuenta de LiveAvatar no tiene créditos suficientes.'
        : response.status === 429 ? 'LiveAvatar alcanzó su límite de sesiones. Espera antes de reintentar.'
        : 'LiveAvatar no pudo completar la operación. Revisa avatar, voz y disponibilidad de la cuenta.';
      throw new HttpError(503, message);
    }
    let payload;
    try { payload = await response.json(); } catch { throw new HttpError(502, 'LiveAvatar devolvió una respuesta inválida.'); }
    if (payload.code !== 100 && payload.code !== 1000) throw new HttpError(502, 'LiveAvatar no confirmó la operación.');
    return payload.data;
  }
  async start(owner, { mode, consent, language='es' } = {}) {
    if (!['receptionist', 'sandbox'].includes(mode)) throw new HttpError(400, 'Selecciona recepcionista o prueba técnica.');
    if (consent !== true) throw new HttpError(400, 'Acepta el envío de las respuestas a LiveAvatar para animar a la asesora.');
    const state = this.status();
    if (!(mode === 'sandbox' ? state.sandboxReady : state.configured)) throw new HttpError(503, 'Falta configurar LiveAvatar en esta PC. Abre CONFIGURAR-AVATAR.cmd.');
    if (mode === 'receptionist' && !state.paidEnabled) throw new HttpError(403, 'El responsable debe habilitar LIVEAVATAR_ALLOW_PAID en la configuración del servidor.');
    if (this.active) throw new HttpError(409, 'Ya hay una prueba de video iniciada o cerrándose. Detén esa prueba antes de continuar.');
    const record = { owner, id: null, pending: true, cancelled: false, closing: null, timer: null };
    this.active = record;
    const duration = this.duration;
    try {
      const tokenData = await this.request('sessions/token', { body: {
        mode: this.mode, avatar_id: mode === 'sandbox' ? SANDBOX_AVATAR_ID : this.settings.avatarId,
        is_sandbox: mode === 'sandbox', max_session_duration: duration,
        video_settings: { quality: 'high', encoding: 'H264' },
        ...(this.mode === 'FULL' ? { avatar_persona: { voice_id: this.settings.voiceId, language: ['es','en','fr'].includes(language)?language:'es' }, interactivity_type: 'PUSH_TO_TALK' } : {}),
      } });
      if (!uuid.test(tokenData?.session_id || '') || typeof tokenData?.session_token !== 'string' || !tokenData.session_token) throw new HttpError(502, 'LiveAvatar no devolvió una sesión válida.');
      record.id = tokenData.session_id;
      if (record.cancelled) throw new HttpError(409, 'Prueba cancelada.');
      const data = await this.request('sessions/start', { sessionToken: tokenData.session_token });
      if (record.cancelled) throw new HttpError(409, 'Prueba cancelada.');
      let roomUrl;
      try { roomUrl = new URL(data?.livekit_url); } catch { throw new HttpError(502, 'LiveAvatar no devolvió una conexión de video válida.'); }
      if (roomUrl.protocol !== 'wss:' || roomUrl.username || roomUrl.password || !(roomUrl.hostname.endsWith('.livekit.cloud') || roomUrl.hostname.endsWith('.liveavatar.com'))) throw new HttpError(502, 'El servidor de video no pertenece a los dominios autorizados.');
      if (typeof data.livekit_client_token !== 'string' || !data.livekit_client_token || data.session_id !== record.id) throw new HttpError(502, 'LiveAvatar devolvió credenciales de video incompletas.');
      let websocketUrl;
      if (this.mode === 'LITE') {
        try { websocketUrl = new URL(data.ws_url); } catch { throw new HttpError(502, 'Falta la conexión de control LITE.'); }
        // LiveAvatar's authenticated session API also provisions this HeyGen signaling host.
        const allowedControlHost = websocketUrl.hostname.endsWith('.liveavatar.com') || websocketUrl.hostname === 'webrtc-signaling.heygen.io';
        if (websocketUrl.protocol !== 'wss:' || websocketUrl.username || websocketUrl.password || (websocketUrl.port && websocketUrl.port !== '443') || !allowedControlHost) throw new HttpError(502, 'La conexión LITE no pertenece a LiveAvatar.');
      }
      record.pending = false;
      record.timer = setTimeout(() => { this.stop(owner).catch(() => {}); }, duration * 1000);
      record.timer.unref?.();
      return { id: record.id, roomUrl: roomUrl.href, roomToken: data.livekit_client_token, ...(websocketUrl ? { websocketUrl: websocketUrl.href } : {}), mode, integrationMode: this.mode, expiresAt: Date.now() + duration * 1000 };
    } catch (error) {
      record.pending = false; record.cancelled = true;
      await this.closeRecord(record).catch(() => {});
      throw error;
    }
  }
  async closeRecord(record) {
    if (record.closing) return record.closing;
    clearTimeout(record.timer);
    record.closing = (async () => {
      try {
        if (record.id) await this.request('sessions/stop', { body: { session_id: record.id, reason: 'USER_CLOSED' } });
        if (this.active === record) this.active = null;
        return { stopped: true };
      } catch {
        record.timer = setTimeout(() => { this.closeRecord(record).catch(() => {}); }, 10_000);
        record.timer.unref?.();
        throw new HttpError(503, 'El video se desconectó, pero LiveAvatar aún no confirmó el cierre. Reintentaremos; se conserva el límite de duración solicitado al proveedor.');
      } finally { record.closing = null; }
    })();
    return record.closing;
  }
  async stop(owner) {
    const record = this.active;
    if (!record || record.owner !== owner) return { stopped: true };
    record.cancelled = true;
    if (record.pending) return { stopped: false, pending: true };
    return this.closeRecord(record);
  }
  async close() { if (this.active) await this.stop(this.active.owner); }
}
