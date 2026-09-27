/**
 * NEXO · GUÍA DEL MÓDULO: public/call-conversation.js
 * Organizar turnos automáticos entre escuchar, enviar y reproducir.
 * Entrada: Callbacks listen/stopListening/send/changed/paused y reloj; transcripción final.
 * Salida: Transiciones de phase y llamadas a callbacks; no respuesta HTTP propia.
 * Estado importante: enabled activa automatismo; revision invalida timers; text espera 900 ms
 * antes de envío; timer se cancela al pausar.
 * Efectos y límites: No sabe qué proveedor hace STT/IA/TTS. Al terminar voz espera 650 ms y
 * escucha; una transcripción parcial nunca se envía como final.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Automatic turn-taking is independent of STT, AI and avatar providers.
// Only final transcripts are sent; every timer is cancelled on pause/teardown.
export class CallConversation {
  constructor({listen, stopListening, send, changed = () => {}, paused = () => {}, clock = globalThis}) {
    Object.assign(this,{listen,stopListening,send,changed,paused,clock});
    this.enabled=false; this.phase='paused'; this.timer=null; this.revision=0; this.text='';
  }
  cancelTimer() { this.revision++; this.clock.clearTimeout(this.timer); this.timer=null; }
  state(phase) { this.phase=phase; this.changed({enabled:this.enabled,phase}); }
  /**
   * later: Programa un callback protegido por revision y enabled.
   * Entrada (firma real): callback, ms.
   * Salida: Sin valor; un pause posterior impide ejecutar el callback viejo.
   */
  later(callback,ms) {
    this.cancelTimer();const revision=this.revision;
    this.timer=this.clock.setTimeout(()=>{this.timer=null;if(this.enabled&&revision===this.revision)callback();},ms);
  }
  enable({waitForReply=false}={}) { this.cancelTimer();this.enabled=true;this.text='';if(waitForReply)this.state('thinking');else this.startTurn(); }
  startTurn() { if(!this.enabled)return;this.text='';this.state('starting');this.listen(); }
  started() { if(this.enabled&&this.phase==='starting')this.state('listening'); }
  /**
   * partial: Cancela envío en preparación porque el visitante continúa hablando.
   * Entrada (firma real): (sin parámetros).
   * Salida: Sin valor; conserva fase listening y vacía texto pendiente.
   */
  partial() { if(!this.enabled||!['starting','listening','settling'].includes(this.phase))return;this.cancelTimer();this.text='';this.state('listening'); }
  /**
   * final: Recibe solo una transcripción final no vacía y espera 900 ms; otra frase parcial puede
   * cancelar el envío.
   * Entrada (firma real): text.
   * Salida: Sin valor; programa send y transición a thinking.
   */
  final(text) {
    if(!this.enabled||!['starting','listening','settling'].includes(this.phase))return;
    this.text=text.trim();if(!this.text){this.cancelTimer();this.state('listening');return;}
    this.state('settling');
    this.later(()=>{
      const message=this.text;this.text='';this.stopListening();this.state('thinking');
      Promise.resolve().then(()=>{if(this.enabled&&this.phase==='thinking')return this.send(message);}).catch(()=>this.pause('No se pudo enviar su consulta. Puede volver a activar el micrófono.'));
    },900);
  }
  ended() {
    if(!this.enabled||!['starting','listening','settling'].includes(this.phase))return;
    if(this.phase==='settling'&&this.text)return;
    this.pause('No recibí una frase completa. Pulse el micrófono para continuar o revise el texto.');
  }
  thinking() { if(this.enabled){this.cancelTimer();this.text='';this.stopListening();this.state('thinking');} }
  speaking() { if(this.enabled){this.cancelTimer();this.stopListening();this.state('speaking');} }
  /**
   * replyEnded: Espera 650 ms tras la voz antes de abrir el próximo turno.
   * Entrada (firma real): (sin parámetros).
   * Salida: Sin valor; transición waiting y luego starting.
   */
  replyEnded() {
    if(!this.enabled||!['speaking','thinking'].includes(this.phase))return;
    this.state('waiting');this.later(()=>this.startTurn(),650);
  }
  /**
   * pause: Desactiva automatismo, invalida timers y detiene el micrófono.
   * Entrada (firma real): message=''.
   * Salida: Sin valor; avisa al llamador si recibe un mensaje.
   */
  pause(message='') {
    this.enabled=false;this.cancelTimer();this.text='';this.stopListening();this.state('paused');
    if(message)this.paused(message);
  }
}
