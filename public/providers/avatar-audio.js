/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/avatar-audio.js
 * Adaptar WAV a muestras PCM para el canal de LiveAvatar LITE.
 * Entrada: Bytes WAV válidos y bloques PCM.
 * Salida: PCM mono a 24 kHz y bloques base64.
 * Estado importante: sampleRate convierte tiempos/muestras; tag comprueba cabeceras del
 * contenedor.
 * Efectos y límites: Cálculo local sin red. No confundir el WAV completo con el PCM crudo que
 * espera LITE.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

/** Convert a PCM16 mono WAV into LiveAvatar's PCM16/24kHz stream. No playback or recording. */
export function wavToPcm24k(base64) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const tag = offset => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('La voz devolvió un WAV inválido.');
  let rate, pcm;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const length = view.getUint32(offset + 4, true), start = offset + 8;
    if (start + length > bytes.length) throw new Error('Audio incompleto.');
    if (tag(offset) === 'fmt ') {
      if (length < 16 || view.getUint16(start, true) !== 1 || view.getUint16(start + 2, true) !== 1 || view.getUint16(start + 14, true) !== 16) throw new Error('Se requiere voz PCM16 mono.');
      rate = view.getUint32(start + 4, true);
    }
    if (tag(offset) === 'data') pcm = new DataView(bytes.buffer, start, length);
    offset = start + length + (length % 2);
  }
  if (!rate || rate < 8000 || rate > 96000 || !pcm?.byteLength || pcm.byteLength % 2 || pcm.byteLength > 5_000_000) throw new Error('Formato de voz no compatible.');
  const samples = pcm.byteLength / 2, count = Math.round(samples * 24000 / rate);
  const output = new Uint8Array(count * 2), target = new DataView(output.buffer);
  for (let i = 0; i < count; i++) {
    const source = i * rate / 24000, left = Math.min(samples - 1, Math.floor(source)), right = Math.min(samples - 1, left + 1);
    const sample = pcm.getInt16(left * 2, true) * (1 - (source - left)) + pcm.getInt16(right * 2, true) * (source - left);
    target.setInt16(i * 2, Math.max(-32768, Math.min(32767, Math.round(sample))), true);
  }
  return output;
}

export function pcmChunkBase64(bytes) {
  let text = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) text += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(text);
}
