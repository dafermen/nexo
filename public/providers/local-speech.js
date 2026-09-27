/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/local-speech.js
 * Reproducir WAV local y producir señales de movimiento de boca.
 * Entrada: api, onFrame, texto y callbacks onStart/onEnd/onError.
 * Salida: Audio del navegador y cuadros de animación con weights/level/elapsed.
 * Estado importante: generation invalida trabajos cancelados; AudioContext decodifica; analyser
 * calcula energía; timeline aproxima fonemas.
 * Efectos y límites: Pide /api/tts y reproduce. La sincronía local es aproximada por letras, no
 * alineación exacta de fonemas.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

/** Spanish orthographic approximation. Timings are estimated, not forced alignment. */
/**
 * mouthTimeline: Reparte duración entre letras y pausas para estimar posiciones de boca.
 * Entrada (firma real): text, duration.
 * Salida: Array de formas con start/end; aproximación, no marcas de fonemas del sintetizador.
 */
export function mouthTimeline(text, duration) {
  const clean = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = { a: 'aa', e: 'E', i: 'I', o: 'O', u: 'U', m: 'PP', b: 'PP', p: 'PP', f: 'FF', v: 'FF', s: 'SS', z: 'SS', r: 'RR', l: 'nn', n: 'nn', t: 'DD', d: 'DD', c: 'kk', k: 'kk', g: 'kk', j: 'kk' };
  const parts = [...clean].map(char => ({ shape: map[char] || 'sil', weight: /[.,!?;:]/.test(char) ? 2.2 : /\s/.test(char) ? .45 : 'aeiou'.includes(char) ? 1.3 : .8 }));
  const total = parts.reduce((sum, item) => sum + item.weight, 0); let time = 0;
  return parts.map(part => { const start = time; time += total ? duration * part.weight / total : 0; return { shape: part.shape, start, end: time }; });
}
/** Blend neighboring mouth shapes instead of snapping at estimated letter boundaries. */
/**
 * mouthBlend: Mezcla formas vecinas suavemente alrededor del tiempo actual.
 * Entrada (firma real): timeline, elapsed.
 * Salida: Mapa de pesos normalizados o {} fuera de la reproducción.
 */
export function mouthBlend(timeline, elapsed) {
  if (!timeline.length || elapsed < 0 || elapsed >= timeline.at(-1).end) return {};
  const weights = {}; let total = 0;
  for (const part of timeline) {
    const middle = (part.start + part.end) / 2;
    const radius = (part.end - part.start) / 2 + .065;
    const distance = Math.abs(elapsed - middle) / radius;
    if (distance >= 1) continue;
    const strength = (1 + Math.cos(Math.PI * distance)) / 2;
    weights[part.shape] = (weights[part.shape] || 0) + strength; total += strength;
  }
  for (const key in weights) weights[key] /= total || 1;
  return weights;
}
/**
 * smoothSpeechLevel: Suaviza energía RMS con tiempos diferentes de apertura y cierre.
 * Entrada (firma real): previous, rms, dt.
 * Salida: Número de amplitud visual; no cambia volumen del audio.
 */
export function smoothSpeechLevel(previous, rms, dt) {
  const target = rms < .006 ? 0 : .78 * (1 - Math.exp(-rms * 12));
  const seconds = target > previous ? .07 : .12;
  return previous + (target - previous) * (1 - Math.exp(-Math.min(.1, Math.max(0, dt)) / seconds));
}
export class LocalSpeechProvider {
  constructor({ api, onFrame = () => {}, scope = window }) { this.api = api; this.onFrame = onFrame; this.scope = scope; this.enabled = false; this.generation = 0; }
  get available() { return this.enabled && !!(this.scope.AudioContext || this.scope.webkitAudioContext); }
  async prepare() {
    if (!this.available) throw new Error('La voz local no está disponible.');
    this.context ||= new (this.scope.AudioContext || this.scope.webkitAudioContext)();
    await this.context.resume();
  }
  /**
   * speak: Pide WAV, verifica generation tras cada espera y conecta fuente/analyser al audio del
   * navegador.
   * Entrada (firma real): text, { onStart = () => {}, onEnd = () => {}, onError = () => {} } = {}.
   * Salida: Promise<void>; callbacks comunican inicio/fin/error y onFrame animación.
   */
  async speak(text, { onStart = () => {}, onEnd = () => {}, onError = () => {} } = {}) {
    this.stop(); const generation = this.generation; const current = () => this.generation === generation;
    if (!this.available) { onError('La voz local no está disponible. Ejecuta INSTALAR-VOZ-LOCAL.cmd.'); return; }
    this.controller = new AbortController();
    try {
      this.context ||= new (this.scope.AudioContext || this.scope.webkitAudioContext)();
      await this.context.resume();
      const result = await this.api.request('/api/tts', { method: 'POST', body: { text }, signal: this.controller.signal });
      if (!current()) return;
      const bytes = Uint8Array.from(atob(result.audioBase64), c => c.charCodeAt(0));
      const buffer = await this.context.decodeAudioData(bytes.buffer);
      if (!current()) return;
      const source = this.context.createBufferSource(); source.buffer = buffer;
      const analyser = this.context.createAnalyser(); analyser.fftSize = 1024;
      source.connect(analyser); analyser.connect(this.context.destination); this.source = source; this.analyser = analyser;
      const samples = new Float32Array(analyser.fftSize), timeline = mouthTimeline(text, buffer.duration);
      const started = this.context.currentTime; let previousTime = 0, level = 0;
      const tick = () => {
        if (!current()) return;
        const elapsed = this.context.currentTime - started;
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        level = smoothSpeechLevel(level, rms, elapsed - previousTime); previousTime = elapsed;
        this.onFrame({ weights: mouthBlend(timeline, elapsed), level, elapsed });
        this.frame = this.scope.requestAnimationFrame(tick);
      };
      source.onended = () => { if (current()) { this.stop(); onEnd(); } };
      source.start(); onStart(); tick();
    } catch (error) { if (current()) { this.stop(); onError(error.message || 'No se pudo reproducir la voz local.'); onEnd(); } }
  }
  /**
   * stop: Invalida trabajo anterior y cancela petición, animación y fuente de audio.
   * Entrada (firma real): (sin parámetros).
   * Salida: Sin valor; devuelve boca a silencio.
   */
  stop() {
    this.generation++; this.controller?.abort(); this.controller = null;
    this.scope.cancelAnimationFrame?.(this.frame);
    if (this.source) { this.source.onended = null; try { this.source.stop(); } catch {} this.source.disconnect(); this.source = null; }
    this.analyser?.disconnect(); this.analyser = null; this.onFrame({ shape: 'sil', level: 0 });
  }
}
