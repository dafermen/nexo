/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/speech.js
 * Adaptar reconocimiento y voz disponibles en el navegador.
 * Entrada: scope inyectable y callbacks; texto para BrowserTtsProvider.
 * Salida: Transcripciones parciales/finales o eventos de síntesis y error.
 * Estado importante: recognition identifica escucha vigente; timers detectan silencio/fallo;
 * generation invalida síntesis vieja.
 * Efectos y límites: El reconocimiento Web Speech puede necesitar un servicio de red del
 * navegador; disponibilidad no garantiza permiso ni transcripción.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

/** SttProvider: available, start({onStart,onPartial,onFinal,onError,onEnd}), stop(). */
export class BrowserSttProvider {
  constructor(scope = window) { this.scope = scope; this.Recognition = scope.SpeechRecognition || scope.webkitSpeechRecognition; this.recognition = null; }
  get available() { return !!this.Recognition; }
  /**
   * start: Abre una instancia de reconocimiento, observa eventos vigentes y separa resultados
   * provisionales de definitivos.
   * Entrada (firma real): { onStart = () => {}, onPartial, onFinal, onError, onEnd }.
   * Salida: Sin valor; onPartial/onFinal entregan texto, onError/onEnd informan fallos y cierre.
   */
  start({ onStart = () => {}, onPartial, onFinal, onError, onEnd }) {
    if (!this.available) { onError('Este navegador no admite reconocimiento de voz. Abra Nexo en Google Chrome o Microsoft Edge, o escriba su consulta.'); onEnd(); return; }
    this.stop();
    let recognition;
    try { recognition = new this.Recognition(); } catch { onError('No se pudo preparar el reconocimiento. Abra Nexo en Google Chrome o Microsoft Edge.'); onEnd(); return; }
    this.recognition = recognition;
    recognition.lang = this.language || 'es-ES'; recognition.interimResults = true; recognition.continuous = false;
    const isCurrent = () => this.recognition === recognition;
    const fail = message => { if (!isCurrent()) return; this.stop(); onError(message); onEnd(); };
    const watch = (delay, message) => {
      (this.scope.clearTimeout || clearTimeout)(this.timer);
      this.timer = (this.scope.setTimeout || setTimeout)(() => fail(message), delay);
    };
    recognition.onstart = () => {
      if (!isCurrent()) return;
      onStart();
      watch(20_000, 'No llegó ninguna transcripción. Revise el micrófono seleccionado y sus permisos. Si usa el navegador integrado, pruebe Nexo en Google Chrome o Microsoft Edge.');
    };
    recognition.onresult = event => {
      if (!isCurrent()) return;
      watch(20_000, 'El reconocimiento dejó de responder. Puede revisar el texto recibido o volver a pulsar el micrófono.');
      const final = [], partial = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final.push(result[0].transcript); else partial.push(result[0].transcript);
      }
      if (partial.length) onPartial([...final,...partial].join(' ').trim().slice(0, 1000));
      else if(final.length) onFinal(final.join(' ').trim().slice(0, 1000));
    };
    recognition.onerror = event => {
      if (!isCurrent() || event.error === 'aborted') return;
      const messages = { 'not-allowed': 'No se autorizó el micrófono. Permita el acceso para este sitio en su navegador y revise los permisos de micrófono del dispositivo.', 'service-not-allowed': 'Este navegador no permite el servicio de reconocimiento. Abra Nexo en Google Chrome o Microsoft Edge.', 'audio-capture': 'No se encontró un micrófono disponible. Revise que esté conectado y seleccionado en su dispositivo.', network: 'No se pudo conectar al servicio de reconocimiento de voz del navegador. Si usa el navegador integrado, abra Nexo en Google Chrome o Microsoft Edge.', 'no-speech': 'No se detectó voz. Compruebe que su micrófono no esté silenciado y vuelva a intentarlo.', 'language-not-supported': 'Este servicio no admite el idioma seleccionado.' };
      fail(messages[event.error] || 'No pude transcribir su voz. Puede escribir su consulta.');
    };
    recognition.onend = () => { if (isCurrent()) { this.stop(); onEnd(); } };
    watch(12_000, 'El navegador no confirmó el inicio del micrófono. Revise el permiso pendiente o abra Nexo en Google Chrome o Microsoft Edge.');
    try { recognition.start(); } catch { fail('No pude iniciar el micrófono. Revise los permisos o pruebe Nexo en Google Chrome o Microsoft Edge.'); }
  }
  stop() {
    (this.scope.clearTimeout || clearTimeout)(this.timer); this.timer = null;
    const recognition = this.recognition; this.recognition = null;
    if (recognition) { recognition.onstart = null; recognition.onresult = null; recognition.onend = null; recognition.onerror = null; try { recognition.abort(); } catch { /* already ended */ } }
  }
}

/** TtsProvider: available, speak(text,{onStart,onEnd,onError}), stop(). */
export class BrowserTtsProvider {
  constructor(scope = window) { this.scope = scope; this.synth = scope.speechSynthesis; this.generation = 0; this.timer = null; }
  get available() { return !!this.synth && !!this.scope.SpeechSynthesisUtterance; }
  speak(text, { onStart = () => {}, onEnd = () => {}, onError = () => {} } = {}) {
    this.stop();
    if (!this.available) { onError('La voz de salida no está disponible. Lee la respuesta en pantalla.'); return; }
    const generation = this.generation;
    const utterance = new this.scope.SpeechSynthesisUtterance(text);
    this.utterance = utterance; utterance.lang = this.language || 'es-ES'; utterance.rate = .98;
    const voices = this.synth.getVoices();
    const voice = voices.find(v => v.lang.startsWith(utterance.lang.slice(0,2)) && v.localService) || voices.find(v => v.lang.startsWith(utterance.lang.slice(0,2)));
    if (voice) utterance.voice = voice;
    const current = () => generation === this.generation;
    utterance.onstart = () => { if (current()) { clearTimeout(this.timer); onStart(); } };
    utterance.onend = () => { if (current()) { clearTimeout(this.timer); this.utterance = null; onEnd(); } };
    utterance.onerror = event => { if (current()) { clearTimeout(this.timer); this.utterance = null; if (!['canceled', 'interrupted'].includes(event.error)) onError('No se pudo reproducir la voz. Usa «Escuchar» o lee la respuesta.'); onEnd(); } };
    this.timer = setTimeout(() => { if (current()) { this.stop(); onError('La voz no inició. Pulse «Escuchar» para volver a intentarlo.'); onEnd(); } }, 7000);
    this.synth.speak(utterance);
  }
  stop() { this.generation++; clearTimeout(this.timer); this.synth?.cancel(); this.utterance = null; }
}
