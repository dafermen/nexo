/**
 * NEXO · GUÍA DEL MÓDULO: public/call-view.js
 * Presentar la llamada a pantalla completa y sus controles.
 * Entrada: Elementos existentes del DOM y cambios de estado, subtítulo o tiempo.
 * Salida: Controlador con status/caption/time/exit y propiedades de conexión.
 * Estado importante: mode distingue voice/video; active/connected diferencian pantalla abierta y
 * sesión lista; framing ajusta encuadre.
 * Efectos y límites: Mueve/presenta elementos visuales; la conexión real la controla el proveedor,
 * no este componente.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Full-window call presentation; the home screen and session logic remain separate.
const paths = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 10v2a6 6 0 0 0 12 0v-2M12 18v3m-4 0h8"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
  chat: '<path d="M20 15a3 3 0 0 1-3 3H9l-6 4V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3zM7 8h9M7 12h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 5 2 2 5-5"/>',
  rotate: '<rect x="8" y="6" width="8" height="12" rx="2" transform="rotate(30 12 12)"/><path d="M3 8a9 9 0 0 1 15-5m0-3v4h-4M21 16a9 9 0 0 1-15 5m0 3v-4h4"/>',
  hangup: '<path d="M3 15c5-6 13-6 18 0l-2 4-5-2v-4h-4v4l-5 2z"/>',
  automatic: '<path d="M4 8a8 8 0 0 1 14-3l3 3M21 3v5h-5M20 16a8 8 0 0 1-14 3l-3-3M3 21v-5h5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const $ = id => document.getElementById(id);

export function createCallView() {
  const root = document.querySelector('.kiosk'), workspace = document.querySelector('.workspace');
  let mode = null, active = false, connected = false, manualFraming = false, previousFocus, scrollPosition = 0, bookingAvailable = false;
  const overlay = document.createElement('div'); overlay.className = 'call-overlay'; overlay.hidden = true;
  // Fixed local markup only. Captions and visitor content always use textContent.
  overlay.innerHTML = `
    <div class="call-welcome"><h1 id="call-heading">Conectando con su asesora…</h1></div>
    <div class="call-bottom"><div class="call-voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <p id="call-notice" class="call-notice" role="alert" hidden></p>
      <p id="call-caption" class="call-caption" aria-live="polite" data-no-translate></p>
      <button id="call-booking" class="call-booking" type="button" aria-haspopup="dialog" aria-controls="booking-dialog" hidden>${icon('calendar')}<span>Mi cita y horarios</span></button>
      <nav class="call-dock" aria-label="Controles de llamada">
        <button id="call-mic" class="call-button" type="button" aria-label="Activar micrófono" title="Micrófono" aria-pressed="false">${icon('mic')}</button>
        <button id="call-sound" class="call-button" type="button" aria-label="Silenciar respuesta" title="Silenciar respuesta" aria-pressed="true">${icon('sound')}</button>
        <button id="call-chat" class="call-button" type="button" aria-label="Abrir conversación por texto" title="Conversación" aria-controls="call-panel" aria-expanded="false">${icon('chat')}</button>
        <button id="call-rotate" class="call-button" type="button" aria-label="Cambiar encuadre" aria-pressed="false">${icon('rotate')}</button>
        <button id="call-auto" class="call-button" type="button" aria-label="Cambiar a envío manual" title="Cambiar a envío manual" aria-pressed="true">${icon('automatic')}</button>
        <button id="call-hangup" class="call-button call-danger" type="button" aria-label="Colgar y volver al inicio" title="Colgar y volver al inicio">${icon('hangup')}</button>
      </nav>
      <div class="call-footnote"><span id="call-status">Puede colgar en cualquier momento.</span><span id="call-time" hidden aria-label="Tiempo restante de video"></span></div>
    </div>`;
  root.append(overlay);
  workspace.id = 'call-panel';
  const closer = document.createElement('button'); closer.id = 'call-panel-close'; closer.className = 'call-panel-close'; closer.hidden = true; closer.type = 'button'; closer.setAttribute('aria-label', 'Cerrar panel y volver al video'); closer.title = 'Volver al video'; closer.innerHTML = icon('close');
  workspace.prepend(closer);
  function closePanel({ focus = true } = {}) {
    root.classList.remove('panel-open'); workspace.inert = active;
    $('call-chat').setAttribute('aria-expanded', 'false');
    if (focus && active) $('call-chat').focus();
  }
  function openPanel() {
    if (!active) return;
    $('chat-tab').click(); workspace.inert = false; root.classList.add('panel-open');
    $('call-chat').setAttribute('aria-expanded', 'true'); closer.focus();
  }
  closer.addEventListener('click', () => closePanel());
  document.addEventListener('keydown', e => {
    if (!active || e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    if (root.classList.contains('panel-open')) closePanel(); else $('end-session').click();
  });
  $('call-chat').addEventListener('click', openPanel);
  $('call-hangup').addEventListener('click', () => $('end-session').click());
  $('call-mic').addEventListener('click', () => $('mic').click());
  $('call-sound').addEventListener('click', () => (!$('avatar-audio-enable').hidden ? $('avatar-audio-enable') : $('sound')).click());
  function framing() {
    const portrait = root.dataset.framing === 'portrait';
    const label = portrait ? 'Ver video horizontal completo' : 'Llenar pantalla con encuadre vertical';
    $('call-rotate').setAttribute('aria-label', label); $('call-rotate').title = label;
    $('call-rotate').setAttribute('aria-pressed', String(portrait));
  }
  $('call-rotate').addEventListener('click', () => {
    manualFraming = true; root.dataset.framing = root.dataset.framing === 'portrait' ? 'landscape' : 'portrait'; framing();
    $('call-status').textContent = root.dataset.framing === 'portrait' ? 'Encuadre vertical · Laterales recortados' : 'Encuadre horizontal · Video completo';
  });
  matchMedia('(orientation: portrait)').addEventListener('change', e => {
    if (active && !manualFraming) { root.dataset.framing = e.matches ? 'portrait' : 'landscape'; framing(); }
  });
  function sync() {
    if (!active) return;
    $('call-booking').hidden = !bookingAvailable;
    const listening = $('mic').getAttribute('aria-pressed') === 'true';
    $('call-mic').disabled = !connected || $('mic').disabled;
    $('call-mic').setAttribute('aria-pressed', String(listening));
    const starting = $('mic').dataset.starting === 'true';
    const automatic = $('mic').dataset.automatic === 'true';
    const micLabel = automatic ? 'Pausar escucha automática' : starting ? 'Cancelar activación del micrófono' : listening ? 'Detener micrófono y revisar texto' : 'Hablar con Nexo';
    if (connected) {
      $('call-status').textContent = $('input-status').textContent;
      if (mode === 'voice') $('call-heading').textContent = starting ? 'Activando el micrófono…' : listening ? 'Le escucho. Hable ahora.' : $('avatar').dataset.state === 'thinking' ? 'Pensando…' : $('avatar').dataset.state === 'speaking' ? 'Hablando…' : 'Su asistente está disponible.';
    }
    $('call-mic').setAttribute('aria-label', micLabel); $('call-mic').title = micLabel;
    const audible = $('sound').getAttribute('aria-pressed') === 'true', blocked = !$('avatar-audio-enable').hidden;
    $('call-sound').disabled = !connected || ($('sound').disabled && !blocked);
    $('call-sound').setAttribute('aria-pressed', String(audible)); $('call-sound').innerHTML = icon(audible ? 'sound' : 'muted');
    const soundLabel = blocked ? 'Activar sonido del video' : audible ? 'Silenciar respuesta' : 'Activar voz';
    $('call-sound').setAttribute('aria-label', soundLabel); $('call-sound').title = soundLabel;
    $('call-sound').classList.toggle('needs-audio', blocked);
    $('call-notice').textContent = $('notice').textContent; $('call-notice').hidden = $('notice').hidden;
  }
  const observer = new MutationObserver(sync);
  for (const id of ['mic', 'sound', 'avatar-audio-enable', 'notice', 'input-status']) observer.observe($(id), { attributes: true, childList: true, subtree: true, characterData: true });
  observer.observe($('avatar'), {attributes:true,attributeFilter:['data-state']});
  return {
    get connected() { return connected; },
    get active() { return active; },
    get mode() { return mode; },
    openPanel,
    setBookingAvailable(value) { bookingAvailable=!!value;sync(); },
    status(state, requestedMode = 'video') {
      if (state === 'connecting' && !active) {
        previousFocus = document.activeElement; scrollPosition = window.scrollY;
        const homePanel=$('home-panel');if(homePanel){if(homePanel.open)homePanel.close();document.querySelector('.main-grid').append(workspace);}
        mode = requestedMode; active = true; connected = false; manualFraming = false;
        document.body.classList.toggle('voice-call', mode === 'voice');
        $('call-rotate').hidden = mode === 'voice';
        closer.setAttribute('aria-label', 'Cerrar panel y volver a la llamada'); closer.title = 'Volver a la llamada';
        root.dataset.framing = matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'; framing();
        document.body.classList.add('video-first'); overlay.hidden = false; closer.hidden = false;
        closePanel({ focus: false }); window.scrollTo(0, 0);
        $('call-heading').textContent = mode === 'voice' ? 'Preparando la llamada por voz…' : 'Conectando con su asesora…'; $('call-caption').textContent = '';
        $('call-status').textContent = 'Puede colgar en cualquier momento.'; $('call-hangup').focus();
      }
      if (state === 'ready') {
        connected = true; $('call-heading').textContent = mode === 'voice' ? 'Le escucho. ¿En qué puedo ayudarle?' : 'Hola, estoy aquí para ayudarle.';
        $('call-status').textContent = mode === 'voice' ? 'Llamada por voz · Puede pausar con el micrófono' : 'Hable o abra la conversación por texto.';
      }
      root.classList.toggle('in-call', connected); sync();
    },
    caption(text) { if (active) $('call-caption').textContent = text; },
    time(seconds) { if (active) { $('call-time').hidden = false; $('call-time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; } },
    exit() {
      const wasActive = active; active = connected = false; mode = null;
      document.body.classList.remove('video-first', 'voice-call'); $('call-rotate').hidden = false; root.classList.remove('in-call', 'panel-open');
      workspace.inert = false; overlay.hidden = true; closer.hidden = true;
      if($('home-panel'))$('home-panel').append(workspace);
      $('call-caption').textContent = ''; $('call-notice').textContent = ''; $('call-time').hidden = true;
      $('call-chat').setAttribute('aria-expanded', 'false');
      if (wasActive) { window.scrollTo(0, scrollPosition); (previousFocus?.isConnected && !previousFocus.hidden ? previousFocus : $('start')).focus(); }
    },
  };
}
