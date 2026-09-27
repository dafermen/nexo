/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/avatar.js
 * Proveer avatar estático y estados visuales básicos.
 * Entrada: Elementos de avatar/etiqueta y estado del asistente.
 * Salida: Clases y atributos del retrato; texto de estado. El retrato estático no mueve labios.
 * Estado importante: El estado idle/listening/thinking/speaking comunica actividad.
 * Efectos y límites: No conecta video ni sintetiza audio; implementa la interfaz visual mínima.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

/** AvatarProvider: setState(idle|listening|thinking|speaking). Replace to use video/3D. */
export class SvgAvatarProvider {
  constructor(element, label) { this.element = element; this.label = label; }
  setState(state) {
    this.element.dataset.state = state;
    this.label.textContent = { idle: 'A su disposición', listening: 'Le escucho', thinking: 'Pensando…', speaking: 'Hablando con usted' }[state] || 'A su disposición';
  }
}

/** Photographic portrait with state indicators. No facial animation or lip sync. */
export class PortraitAvatarProvider extends SvgAvatarProvider {
  constructor(element, label) {
    super(element, label);
    const portrait = element.querySelector('.avatar-photo');
    const update = () => {
      const ready = portrait.complete && portrait.naturalWidth > 0;
      element.classList.toggle('portrait-ready', ready);
      element.setAttribute('aria-label', ready
        ? 'Nexo, recepcionista virtual con retrato generado por IA'
        : 'Nexo, asistente virtual');
    };
    portrait.addEventListener('load', update);
    portrait.addEventListener('error', update);
    update();
  }
}
