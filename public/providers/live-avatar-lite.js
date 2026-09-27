/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/live-avatar-lite.js
 * Transmitir audio al canal de control LITE.
 * Entrada: URL/autorización temporal, audio PCM y callbacks de eventos.
 * Salida: Conexión, comandos y eventos de habla/cierre.
 * Estado importante: socket mantiene transporte; ready indica confirmación; eventId correlaciona
 * órdenes; bufferedAmount limita el envío por congestión.
 * Efectos y límites: Usa WebSocket del proveedor; disconnect debe liberar transporte y esperas.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import { wavToPcm24k, pcmChunkBase64 } from './avatar-audio.js';

/** LITE control channel. Only a short-lived session URL reaches the browser. */
export class LiteAvatarTransport {
  constructor({ createSocket = url => new WebSocket(url), onEvent = () => {}, onFailure = () => {} } = {}) {
    Object.assign(this, { createSocket, onEvent, onFailure });
  }
  connect(url) {
    this.ready = false;
    const socket = this.createSocket(url); this.socket = socket;
    return new Promise((resolve, reject) => {
      this.rejectConnect = reject;
      this.connectTimer = setTimeout(() => fail('LiveAvatar no confirmó la conexión LITE.'), 20_000);
      const fail = message => {
        if (this.socket !== socket) return;
        this.ready = false; clearTimeout(this.connectTimer); reject(new Error(message)); this.onFailure(message);
      };
      socket.addEventListener('message', message => {
        if (this.socket !== socket) return;
        let event; try { event = JSON.parse(message.data); } catch { return; }
        if (event.type === 'session.state_updated' && event.state === 'connected') {
          this.ready = true; clearTimeout(this.connectTimer); this.rejectConnect = null; resolve();
        } else if (event.type === 'session.state_updated' && event.state === 'disconnected') fail('Se cerró el control del avatar.');
        else if (event.type === 'error') fail('LiveAvatar no pudo procesar la voz. Puedes continuar por texto.');
        else this.onEvent(event);
      });
      socket.addEventListener('close', () => fail('Se perdió la conexión del avatar.'));
      socket.addEventListener('error', () => fail('No se pudo conectar el control del avatar.'));
    });
  }
  command(type, extra = {}, eventId = crypto.randomUUID()) {
    if (!this.ready || this.socket?.readyState !== 1) throw new Error('El control del avatar todavía no está listo.');
    this.socket.send(JSON.stringify({ type, event_id: eventId, ...extra }));
  }
  async speak(wav, eventId, signal) {
    const pcm = wavToPcm24k(wav), deadline = Date.now() + 20_000;
    for (let offset = 0; offset < pcm.length; offset += 48000) {
      while (this.socket?.bufferedAmount > 512_000) {
        signal.throwIfAborted();
        if (Date.now() > deadline) throw new Error('La conexión no permite enviar la voz a tiempo.');
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      signal.throwIfAborted();
      this.command('agent.speak', { audio: pcmChunkBase64(pcm.subarray(offset, offset + 48000)) }, eventId);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    signal.throwIfAborted(); this.command('agent.speak_end', {}, eventId);
  }
  disconnect() {
    clearTimeout(this.connectTimer); this.rejectConnect?.(new Error('Conexión cancelada.')); this.rejectConnect = null;
    const socket = this.socket; this.socket = null; this.ready = false; socket?.close();
  }
}
