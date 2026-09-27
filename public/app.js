/**
 * NEXO · GUÍA DEL MÓDULO: public/app.js
 * Coordinar la experiencia del visitante: texto, voz, video y formularios.
 * Entrada: Eventos de interfaz; config, servicios y respuestas de la API.
 * Salida: DOM actualizado, reproducción, llamadas HTTP y formularios de agenda.
 * Estado importante: generation invalida respuestas antiguas; bookingGeneration protege modales;
 * busy evita envíos simultáneos; pendingSession reúne inicios concurrentes.
 * Efectos y límites: No accede a SQLite. resetSession detiene trabajo y limpia pantalla; iniciar
 * otra conversación no borra el historial administrativo.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {language,languages,translate as t} from './i18n.js';
import {installLanguageUI} from './language-ui.js';
import {createTouchKeyboard} from './touch-keyboard.js';
import {createKioskHome} from './kiosk-home.js';
import { ApiClient } from './api.js';
import { PortraitAvatarProvider } from './providers/avatar.js';
import { LocalSpeechProvider } from './providers/local-speech.js';
import { BrowserSttProvider } from './providers/speech.js';
import { LiveAvatarProvider } from './providers/live-avatar.js';
import { CallConversation } from './call-conversation.js';
import { createCallView } from './call-view.js';

const $ = id => document.getElementById(id);
const api = new ApiClient();
let avatar = new PortraitAvatarProvider($('avatar'), $('agent-state'));
let localAvatarLoading = null;
async function loadLocalAvatar() {
  if (avatar.load) return;
  if (localAvatarLoading) return localAvatarLoading;
  localAvatarLoading = (async () => {
    const { LocalAvatarProvider } = await import('./providers/avatar-3d.js');
    avatar = new LocalAvatarProvider($('avatar'), $('agent-state'));
    $('avatar').classList.add('local-3d-loading');
    await avatar.load(); $('avatar-local').hidden = false;
  })();
  try { await localAvatarLoading; } finally { localAvatarLoading = null; }
}
const stt = new BrowserSttProvider();
const tts = new LocalSpeechProvider({ api, onFrame: frame => avatar.setMouth?.(frame) });
let messageChannel='text';
let config, services = [], busy = false, listening = false, sound = true, voiceConsent = false;
// generation cambia al reiniciar atención; cada tarea captura su valor antes de await.
// pendingSession comparte un único consentimiento/inicio; chatAbort cancela la petición.
// Son memoria de esta página, no el historial que conserva el servidor en SQLite.
let generation = 0, conversationStarted = false, pendingSession = null, chatAbort = null;
const homeIdleMs = 60_000;
// lastActivity controla limpieza visual; lastTouch limita renovaciones HTTP.
// bookingGeneration invalida una respuesta de agenda si ya se cerró/cambió el modal.
let lastActivity = Date.now(), lastTouch = Date.now(), bookingGeneration = 0;
let liveAvatarConfig = null, avatarDeadline = null, startingCall = false, localSpeaking = false;
const callView = createCallView();
const kioskHome=createKioskHome({switchView,onClose:()=>{touchKeyboard.close();stopAudio();},openAgenda:()=>showAgendaMenu()});
const languageUI=installLanguageUI(selectLanguage);
/**
 * selectLanguage: Cierra la sesión anterior y aplica idioma a UI, STT y disponibilidad de voz.
 * Entrada (firma real): locale.
 * Salida: Sin valor; siguiente sesión se crea con el nuevo idioma.
 */
function selectLanguage(locale){
  if(locale===language)return;
  resetSession('',{reason:'new_conversation'});
  languageUI.apply(locale);stt.language=languages[locale].speech;
  applyVoiceLanguage();renderCenter();renderServices();renderBusy(false);
  lastActivity=Date.now();
}
function applyVoiceLanguage(){tts.enabled=!!(config?.localVoice?.languages?.[language]??config?.localVoice?.available)&&config?.center?.experience?.voiceEnabled!==false;}
stt.language=languages[language].speech;
let automaticMode = true;
let bookingResume = null;
// Pausa breve al cambiar de aplicación; no captura audio en segundo plano.
let suspendedCall = null;
function stopListeningOnly() {
  stt.stop(); listening=false; if($('avatar').dataset.state==='listening')avatar.setState('idle'); delete $('mic').dataset.starting; $('mic').setAttribute('aria-pressed','false');
}
function updateCallMode() {
  $('call-auto').setAttribute('aria-pressed',String(automaticMode));
  const label=automaticMode?'Cambiar a envío manual':'Cambiar a conversación automática';
  $('call-auto').setAttribute('aria-label',label);$('call-auto').title=label;
  $('mic').dataset.automatic=String(autoConversation.enabled);
}
const autoConversation = new CallConversation({
  listen: () => { if(!document.hidden && !suspendedCall && callView.connected && api.token && !busy && !$('booking-dialog').open)startListening(true); else autoConversation.pause(); },
  stopListening: stopListeningOnly,
  send: text => sendMessage(text),
  paused: message => notify(message),
  changed: ({enabled,phase}) => {
    $('mic').dataset.automatic=String(enabled);
    const labels={starting:'Activando micrófono…',listening:'Escuchando… hable con naturalidad',settling:'Preparando el envío… pulse el micrófono para cancelar',thinking:'Pensando…',speaking:'Hablando… después volveré a escuchar',waiting:'Preparándome para escuchar…',paused:'Micrófono en pausa · Pulse para hablar'};
    if(callView.active)$('input-status').textContent=labels[phase];
    $('mic').disabled=(!enabled && busy)||liveAvatar.connecting||!stt.available;
  },
});
const touchKeyboard=createTouchKeyboard({onOpen:()=>{autoConversation.pause();stopListeningOnly();lastActivity=Date.now();}});
const liveAvatar = new LiveAvatarProvider({
  api, stage: $('avatar'), video: $('avatar-video'), audio: $('avatar-audio'),
  onStatus: (state, detail = {}) => {
    if (state !== 'stopped') callView.status(state);
    if (detail.expiresAt) avatarDeadline = detail.expiresAt;
    if (state === 'connecting') $('avatar-live').textContent = 'Cancelar conexión';
    if (state === 'ready') { $('avatar-live').textContent = 'Detener video'; $('sound').disabled = false; }
    if (state === 'stopped') {
      const endedCall = callView.connected && callView.mode === 'video';
      if (callView.mode !== 'voice') callView.exit();
      if(endedCall&&$('booking-dialog').open){bookingResume=null;autoConversation.pause();stopListeningOnly();$('booking-content').prepend(element('p','notice','La videollamada terminó. Puede completar su reserva aquí sin mantener el video conectado.'));}
      else if(endedCall)resetSession('',{stopVideo:false});
      avatarDeadline = null; $('avatar-live').textContent = 'Opciones de video'; $('avatar-audio-enable').hidden = true; avatar.setState(busy ? 'thinking' : 'idle');
      if (!tts.available) { sound = false; updateSound(); $('sound').disabled = true; }
    }
    renderBusy(busy);
    if (detail.connectionMs) $('input-status').textContent = `Video conectado en ${(detail.connectionMs / 1000).toFixed(1)} s`;
    if (detail.responseDelayMs) $('input-status').textContent = `Inicio de voz en ${(detail.responseDelayMs / 1000).toFixed(1)} s`;
  },
  onError: message => notify(message),
  onAudioBlocked: () => { $('avatar-audio-enable').hidden = false; notify('Pulse «Activar sonido» para escuchar el video.'); },
});
const price = s => s.priceCents == null ? 'Consultar precio' : s.priceCents === 0 ? 'Sin costo' : `${(s.priceCents / 100).toFixed(2)} ${s.currency}`;
const dateLabel = slot => new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short', timeZone: config.timezone }).format(new Date(slot));
const element = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
/**
 * privateText: Crea un nodo marcado noTranslate para mantener nombres/códigos sin modificación.
 * Entrada (firma real): value.
 * Salida: Elemento p con textContent, no HTML interpretado.
 */
function privateText(value){const node=element('p','',value);node.dataset.noTranslate='';return node;}
function notify(message = '') { $('notice').hidden = !message; $('notice').textContent = message; }
function switchView(view) {
  const chat = view === 'chat';
  $('chat-view').hidden = !chat; $('services-view').hidden = chat;
  for (const [id, active] of [['chat-tab', chat], ['services-tab', !chat]]) { $(id).classList.toggle('active', active); $(id).setAttribute('aria-pressed', String(active)); }
  if (chat) { $('chat-dot').hidden = true; $('messages').scrollTop = $('messages').scrollHeight; }
}
function stopAudio() { localSpeaking = false; stt.stop(); tts.stop(); liveAvatar.stopSpeech(); listening = false; delete $('mic').dataset.starting; $('mic').setAttribute('aria-pressed', 'false'); avatar.setState(busy ? 'thinking' : 'idle'); }
function renderBusy(value) {
  $('call-booking').disabled = value || !callView.connected || startingCall;
  busy = value; $('send').disabled = value || liveAvatar.connecting; $('mic').disabled = (value && !autoConversation.enabled) || liveAvatar.connecting || !stt.available;
  $('start').disabled = $('start-video').disabled = value || !config || liveAvatar.connecting || startingCall;
  if (!autoConversation.enabled && !localSpeaking) $('input-status').textContent = value ? 'Pensando…' : stt.available ? 'Toque el micrófono para hablar' : 'Voz de entrada no disponible · Puede escribir';
}
/**
 * speak: Elige LiveAvatar conectado o TTS local y pausa escucha mientras habla para evitar eco.
 * Entrada (firma real): text.
 * Salida: Sin valor directo; onEnd permite continuar el turno automático.
 */
function speak(text) {
  if(document.hidden||suspendedCall)return;
  text=t(text);
  if (!sound) { autoConversation.replyEnded(); return; }
  autoConversation.speaking();
  stt.stop(); listening = false; $('mic').setAttribute('aria-pressed', 'false');
  const epoch = generation;
  const voiceProvider = liveAvatar.ready ? liveAvatar : tts;
  localSpeaking = voiceProvider === tts;
  voiceProvider.speak(text, {
    onStart: () => { if (epoch === generation) { avatar.setState('speaking'); $('input-status').textContent = 'Hablando…'; } },
    onEnd: () => { if (epoch === generation) { localSpeaking = false; avatar.setState(busy ? 'thinking' : 'idle'); autoConversation.replyEnded(); if(!autoConversation.enabled)renderBusy(busy); } },
    onError: message => { if (epoch === generation) { localSpeaking = false; autoConversation.pause(); notify(message); avatar.setState('idle'); } },
  });
}
function addMessage(role, text) {
  if(role==='assistant')text=t(text);
  $('messages').querySelector('.empty-chat')?.remove();
  const item = element('div', `message ${role}`);
  item.append(element('div', 'message-label', role === 'user' ? (config?.center?.addressStyle==='tu'?'TÚ':'USTED') : (config?.center?.assistantName||'Nexo').toUpperCase()+' · ASISTENTE VIRTUAL'));
  item.append(element('div', 'message-body', text));
  if (role === 'assistant') {
    const replay = element('button', 'replay', '▷ Escuchar'); replay.type = 'button';
    replay.disabled = !tts.available && !liveAvatar.ready;
    replay.addEventListener('click', () => { if (!busy) { sound = true; updateSound(); speak(text); } }); item.append(replay);
  }
  $('messages').append(item); $('messages').scrollTop = $('messages').scrollHeight;
  if (role === 'assistant') callView.caption(text);
  if ($('chat-view').hidden) $('chat-dot').hidden = false;
  return item;
}
/**
 * ensureSession: Muestra aviso y crea sesión solo al aceptar; comparte pendingSession si dos
 * acciones lo piden a la vez.
 * Entrada (firma real): { video = false, channel = 'text' } = {}.
 * Salida: Promise<boolean>; true deja api.token listo, false significa que no se inició.
 */
async function ensureSession({ video = false, channel = 'text' } = {}) {
  if (api.token) return true;
  if (!config) { notify('El centro todavía no está conectado. Recargue la página cuando el servidor esté disponible.'); return false; }
  if (pendingSession) return pendingSession;
  $('welcome-detail').textContent = config.demo
    ? 'Está en modo de prueba: Nexo usa respuestas preparadas, sin IA real. Puede explorar servicios y registrar turnos de demostración.'
    : 'Nexo utiliza IA de OpenAI. Al continuar, acepta enviar el texto de esta conversación y el catálogo a OpenAI para recibir respuestas. Los datos del formulario de turnos permanecen separados.';
  if (config.center && config.demo) $('welcome-detail').textContent = 'Nexo está en modo de prueba con respuestas preparadas sobre el negocio. La agenda en línea todavía no está disponible.';
  $('welcome-detail').textContent+=' Guardamos sus preguntas y las respuestas en un historial privado para seguimiento y estadísticas; no grabamos audio ni video.';
  if (video) $('welcome-detail').textContent += ' Esta videollamada utiliza LiveAvatar, recibe la voz de las respuestas y dura un máximo de 60 segundos.';
  else $('welcome-detail').textContent += ' Esta atención utiliza una imagen y voz generada en el servidor; no abre una sesión de LiveAvatar.';
  if(channel==='voice')$('welcome-detail').textContent += ' Al iniciar la llamada, el micrófono se activará después del saludo. El navegador puede enviar el audio a su proveedor de reconocimiento. En modo automático, sus frases se envían al terminar de hablar; puede pausar con el micrófono.';
  pendingSession = new Promise(resolve => {
    let accepted = false;
    const accept = async () => {
      $('accept-session').disabled = true;
      try {
        const epoch = generation;
        const result = await api.request('/api/sessions', { method: 'POST', body: { consent: true,channel,language } });
        if (epoch !== generation) {
          fetch('/api/session',{method:'DELETE',headers:{Authorization:'Bearer '+result.token},keepalive:true}).catch(()=>{});return;
        }
        api.token = result.token; lastActivity = lastTouch = Date.now();
        $('end-session').hidden = false; accepted = true; $('welcome-dialog').close();
      } catch (error) { notify(error.message); $('welcome-dialog').close(); }
      finally { $('accept-session').disabled = false; }
    };
    $('accept-session').addEventListener('click', accept);
    $('welcome-dialog').addEventListener('close', () => { $('accept-session').removeEventListener('click', accept); pendingSession = null; resolve(accepted); }, { once: true });
    $('welcome-dialog').showModal();
  });
  return pendingSession;
}
/**
 * sendMessage: Guarda generation antes de esperar, envía texto y solo muestra el resultado si
 * sigue siendo la misma conversación.
 * Entrada (firma real): text.
 * Salida: Promise<void>; actualiza chat, opciones y voz o muestra error.
 */
async function sendMessage(text) {
  text = text.trim();
  if (!text || busy || liveAvatar.connecting) return;
  const epoch = generation;
  if (!(await ensureSession({channel:callView.active?callView.mode:messageChannel})) || epoch !== generation || busy) return;
  autoConversation.thinking(); notify(); stopAudio(); switchView('chat'); if(!callView.active)kioskHome.open('chat'); renderBusy(true); avatar.setState('thinking');
  $('message').value = ''; lastActivity = Date.now();
  const userMessage = addMessage('user', text);
  chatAbort = new AbortController();
  try {
    const result = await api.request('/api/chat', { method: 'POST', body: { message: text,channel:callView.active?callView.mode:messageChannel }, signal: chatAbort.signal });
    if (epoch !== generation) return;
    const reply=addMessage('assistant',result.text);conversationStarted=true;
    if(result.agenda?.options?.length){const choices=element('div','agenda-options');for(const option of result.agenda.options){const button=element('button','secondary',option.label);button.type='button';button.onclick=()=>{if(epoch!==generation)return;const service=services.find(s=>s.id===result.agenda.serviceId);if(service)openBooking(service,{preferredSlot:option.slot});};choices.append(button);}reply.append(choices);if(callView.active)callView.openPanel();}

    if(result.catalogOnly)autoConversation.pause();
    renderBusy(false); avatar.setState('idle');
    if(result.agenda?.selectedSlot){const service=services.find(s=>s.id===result.agenda.serviceId);if(service)openBooking(service,{preferredSlot:result.agenda.selectedSlot});}
    else if(callView.connected&&callView.mode==='voice'&&result.bookingAction)openCallAgenda(result.bookingAction);else speak(result.text);
    if (result.catalogOnly) { if (callView.active) callView.openPanel(); switchView('services'); }
  } catch (error) {
    if (epoch !== generation) return;
    autoConversation.pause(); userMessage.remove(); $('message').value = text;
    if (error.status === 401) { resetSession(); notify('La sesión terminó. Inicia nuevamente para continuar.'); }
    else notify(error.message);
  } finally { if (epoch === generation) { renderBusy(false); if ($('avatar').dataset.state === 'thinking') avatar.setState('idle'); chatAbort = null; } }
}
/**
 * resetSession: Invalida generaciones antes de permitir nuevas respuestas; detiene
 * micrófono/audio/video, cierra diálogos y vacía datos visibles.
 * Entrada (firma real): message = '', { stopVideo = true, reason='ended' } = {}.
 * Salida: Sin valor; solicita cierre de sesión, no borra historial administrativo.
 */
function resetSession(message = '', { stopVideo = true, reason='ended' } = {}) {
  kioskHome.close();
  touchKeyboard.close();
  bookingResume = null;suspendedCall=null;
  autoConversation.pause(); automaticMode=config?.center?.experience?.automaticVoice!==false; updateCallMode(); callView.exit();
  generation++; bookingGeneration++; chatAbort?.abort(); chatAbort = null; busy = false; stopAudio();
  if (stopVideo && (liveAvatar.ready || liveAvatar.connecting || liveAvatar.ownerToken)) liveAvatar.stop().catch(error => notify(error.message));
  const token = api.token; api.token = null;
  if (token) fetch('/api/session?reason='+encodeURIComponent(reason), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  $('booking-content').replaceChildren(); $('message').value = ''; $('avatar-start-form').reset();
  lastActivity = lastTouch = Date.now();messageChannel='text';
  $('messages').replaceChildren(element('div', 'empty-chat', 'Su siguiente paso empieza con una pregunta.'));
  $('end-session').hidden = true; $('chat-dot').hidden = true; conversationStarted = false; voiceConsent = false;

  switchView('services'); renderBusy(false); notify(message); window.scrollTo({top:0,behavior:'instant'});
}
function updateSound() { $('sound').textContent = sound ? 'Voz activada' : 'Voz desactivada'; $('sound').setAttribute('aria-pressed', String(sound)); }
/**
 * startListening: Conecta callbacks parciales/finales del STT y descarta eventos de generaciones
 * antiguas.
 * Entrada (firma real): automatic = false.
 * Salida: Sin valor; en automático una frase final pasa al gestor de turnos.
 */
function startListening(automatic = false) {
  if(document.hidden||suspendedCall)return;
  if (busy || $('booking-dialog').open) return;
  stopAudio(); notify(); listening = true;
  $('mic').dataset.starting = 'true'; $('mic').setAttribute('aria-pressed', 'false'); $('input-status').textContent = 'Activando micrófono… revise si el navegador solicita permiso';
  avatar.setState('idle'); switchView('chat');
  const epoch = generation;
  stt.start({
    onStart: () => { if (epoch === generation) { delete $('mic').dataset.starting; $('mic').setAttribute('aria-pressed', 'true'); $('input-status').textContent = 'Escuchando… hable ahora'; avatar.setState('listening'); if(automatic)autoConversation.started(); } },
    onPartial: text => { if (epoch === generation) { if(text)messageChannel='voice'; $('message').value = text; if(text)lastActivity=Date.now(); if(automatic){autoConversation.partial();callView.caption(text);}else if(text&&!document.querySelector('.kiosk').classList.contains('panel-open'))callView.openPanel(); } },
    onFinal: text => { if (epoch === generation) { messageChannel='voice';$('message').value = text; lastActivity = Date.now(); if(automatic){callView.caption(text);autoConversation.final(text);}else{$('input-status').textContent = 'Revise la transcripción y pulse enviar ↑';callView.openPanel();} } },
    onError: message => { if (epoch === generation) { if(automatic)autoConversation.pause();notify(message); } },
    onEnd: () => { if (epoch === generation) { listening = false; delete $('mic').dataset.starting; $('mic').setAttribute('aria-pressed', 'false'); avatar.setState('idle'); if(automatic)autoConversation.ended();else $('input-status').textContent = $('message').value ? 'Revise la transcripción y pulse enviar ↑' : 'Toque el micrófono para hablar'; } },
  });
}
function activateMicrophone() {
  if(callView.connected&&automaticMode){autoConversation.enable();}
  else startListening();
}
const iconPaths = { compass: '<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4z"/>', document: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>', spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>' };
function renderServices() {
  callView.setBookingAvailable(!!config.center);
  $('services').replaceChildren();
  if (!services.length) { $('services').append(element('p', 'muted', 'No hay servicios disponibles. Consulte con el personal.')); return; }
  for (const service of services) {
    const card = element('button', 'service-card'); card.type = 'button';
    const icon = element('span', 'service-icon');
    // Markup is a local allowlist, never generated from service or user text.
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">${iconPaths[service.icon] || iconPaths.compass}</svg>`;
    const content = element('div', 'service-main');
    content.append(element('h3', '', service.name), element('p', '', (service.duration == null ? 'Duración por confirmar' : `${service.duration} min`) + ' · ' + (service.modality || (config.center ? 'Modalidad por confirmar' : 'Atención presencial'))));
    card.append(icon, content, element('span', 'service-price', price(service)), element('span', 'service-arrow', '↗'));
    card.addEventListener('click',()=>{if(config.center?.booking.enabled&&config.center.booking.serviceIds?.includes(service.id))showAgendaMenu(service);else openBooking(service);}); $('services').append(card);
  }
}
/**
 * openBooking: Construye selección de día/hora, datos, revisión y confirmación; bookingGeneration
 * protege respuestas de modales cerrados.
 * Entrada (firma real): service, {availabilityOnly=false,preferredSlot=null}={}.
 * Salida: Interfaz de reserva; la creación real sucede únicamente al confirmar el formulario.
 */
async function openBooking(service, {availabilityOnly=false,preferredSlot=null}={}) {
  pauseCallForBooking();
  const realBooking=!!(config.center?.booking.enabled&&config.center.booking.serviceIds?.includes(service.id));
  if (config.center && !realBooking) {
    stopAudio();
    $('booking-title').textContent = service.name;
    $('booking-dialog').querySelector('.eyebrow').textContent = 'INFORMACIÓN DEL SERVICIO';
    const close = element('button', 'primary full-width', 'Entendido');
    close.addEventListener('click', () => $('booking-dialog').close());
    $('booking-content').replaceChildren(
      element('p', '', service.description),
      element('p', 'muted', service.requirements || 'Requisitos por confirmar con el personal.'),
      element('p', 'muted', price(service)),
      element('p', 'muted', (service.duration == null ? 'Duración por confirmar' : service.duration + ' minutos') + ' · ' + (service.modality || 'Modalidad por confirmar')),
      element('p', '', config.center.hours),
      element('p', '', config.center.booking.message), close);
    if(config.center.booking.url){const a=element('a','primary full-width','Abrir agenda externa ↗');a.href=config.center.booking.url;a.target='_blank';a.rel='noopener noreferrer';$('booking-content').insertBefore(a,close);}
    $('booking-dialog').showModal();
    return;
  }
  $('booking-dialog').querySelector('.eyebrow').textContent='SU PRÓXIMO PASO';
  const epoch = generation;
  if (!(await ensureSession()) || epoch !== generation) return;
  stopAudio();
  const bookingId = ++bookingGeneration;
  const container = $('booking-content'); container.replaceChildren(element('p', '', 'Cargando horarios…'));
  $('booking-title').textContent = availabilityOnly?'Disponibilidad de citas.':'Reserve su turno.'; $('booking-dialog').showModal();
  const alive = () => bookingId === bookingGeneration && epoch === generation && $('booking-dialog').open;
  const draft = { service, slot: null, instructorId: null, customerName: '', email: '', consent: false, requestId: crypto.randomUUID() };
  let slots = [],instructors=[];
  const readSlots=data=>{instructors=data.instructors||[];slots=data.schedule||data.slots.map(slot=>({slot,available:true,reason:null}));};
  const showError = error => { if (!alive()) return; const old = container.querySelector('.notice'); old?.remove(); container.append(element('p', 'notice', error.message)); };
  function summary() {
    const box = element('div', 'booking-summary');
    box.append(element('strong', '', service.name), element('p', '', `${service.duration} minutos · ${price(service)}${realBooking ? ' · Sin cobro en el kiosco' : ' · Importe de ejemplo'}`));
    if (draft.slot) box.append(element('p', '', dateLabel(draft.slot)));
    const teacher=instructors.find(i=>i.id===draft.instructorId);if(teacher)box.append(privateText(t('Profesor: {0}').replace('{0}',teacher.name)));
    if(callView.connected)box.append(element('p','muted','Micrófono en pausa mientras completa su reserva.'));
    return box;
  }
  function chooseSlot() {
    if (!alive()) return;
    container.replaceChildren(element('p', 'step-label', '01 / 03 · Elija su horario'), summary(), element('p', '', service.requirements));
    if(availabilityOnly)container.append(element('p','','Consulte los horarios del día; los ocupados no se pueden seleccionar. Si desea reservar, seleccione uno y complete la confirmación.'));
    const scroll = element('div', 'slot-container');
    const grouped = Map.groupBy(slots, ({slot}) => new Intl.DateTimeFormat(language, { dateStyle: 'full', timeZone: config.timezone }).format(new Date(slot)));
    const dayField=element('label','booking-day','Día de su cita'),daySelect=element('select');daySelect.id='booking-day';
    for(const day of grouped.keys()){const option=element('option','',day);option.value=day;daySelect.append(option);}dayField.append(daySelect);
    const renderTimes=()=>{
      scroll.replaceChildren();const times=grouped.get(daySelect.value)||[];
      scroll.append(element('h3', 'date-heading', 'Horarios del día')); const grid = element('div', 'slot-grid');
      for (const {slot,available,reason,remaining} of times) {
        const button = element('button', 'slot', new Intl.DateTimeFormat(language, { timeStyle: 'short', timeZone: config.timezone }).format(new Date(slot)));
        const state=available?(instructors.length?t(remaining===1?'1 cupo disponible':remaining+' cupos disponibles'):'Disponible'):reason==='occupied'?'Ocupado':reason==='past'?'Pasado':'Fuera de anticipación';
        button.type='button';button.disabled=!available;button.dataset.availability=available?'available':reason;button.append(element('small','slot-state',state));button.setAttribute('aria-label',dateLabel(slot)+' · '+state);
        button.addEventListener('click', () => { draft.slot = slot; draft.instructorId=null; details(); }); grid.append(button);
      }
      scroll.append(grid);if(!times.some(s=>s.available))scroll.append(element('p','notice','No quedan horarios disponibles en este día. Elija otra fecha.'));
    };
    daySelect.addEventListener('change',renderTimes);if(slots.length){container.append(dayField);renderTimes();}
    if (!slots.length) scroll.append(element('p', '', 'No quedan horarios. Consulte con el personal.'));
    container.append(scroll, element('p', 'muted', `Horarios del centro · ${config.timezone}`));
  }
  function details() {
    // An explicit edit starts a new logical request; simple network retries retain the key.
    draft.requestId = crypto.randomUUID();
    container.replaceChildren(element('p', 'step-label', '02 / 03 · Sus datos'), summary());
    const form = element('form', 'booking-form');
    if(instructors.length){
      const allowed=slots.find(s=>s.slot===draft.slot)?.instructorIds||[],teachers=instructors.filter(i=>allowed.includes(i.id));
      const label=element('label'),caption=element('span','','Elija su profesor'),select=element('select');caption.id='booking-instructor-label';label.append(caption);select.name='instructorId';select.id='booking-instructor';select.setAttribute('aria-labelledby',caption.id);select.required=true;
      const placeholder=element('option','','Seleccione un profesor disponible');placeholder.value='';select.append(placeholder);
      for(const teacher of teachers){const option=element('option','',teacher.name);option.dataset.noTranslate='';option.value=teacher.id;select.append(option);}
      if(!allowed.includes(draft.instructorId))draft.instructorId=teachers.length===1?teachers[0].id:null;
      select.value=draft.instructorId||'';select.onchange=()=>{draft.instructorId=select.value||null;};label.append(select);form.append(label,element('p','muted','Solo aparecen los profesores libres para este horario.'));
    }

    for (const [name, label, type, max] of [['customerName', 'Nombre y apellido', 'text', 80], ['email', 'Correo electrónico', 'email', 120]]) {
      const wrapper = element('label', '', label); const input = element('input'); input.name = name; input.type = type; input.required = true;
      if(type==='email'){input.inputMode='email';input.setAttribute('autocapitalize','none');input.spellcheck=false;}
      input.maxLength = max; input.minLength = name === 'customerName' ? 2 : 3; input.autocomplete = 'off'; input.value = draft[name];
      input.addEventListener('input', () => { draft[name] = input.value; }); wrapper.append(input); form.append(wrapper);
    }
    const consentLabel = element('label', 'checkbox-label'); const consent = element('input'); consent.type = 'checkbox'; consent.required = true; consent.checked = draft.consent; consent.name = 'consent';
    consent.addEventListener('change', () => { draft.consent = consent.checked; });
    consentLabel.append(consent, element('span', '', realBooking ? 'Acepto guardar mi nombre y correo en Nexo y en el calendario de Google del negocio para gestionar mi cita. El personal autorizado podrá verlos; no se envían a la IA. Puedo solicitar al personal la eliminación de mis datos.' : 'Acepto guardar estos datos en esta PC para gestionar mi turno. El personal autorizado podrá verlos; no se envían a la IA. Se eliminan mediante la limpieza del servidor a partir de 7 días después de la cita.'));
    form.append(consentLabel, element('p', 'muted', realBooking ? 'Enviaremos la confirmación a este correo. Revíselo antes de continuar. No se realizará un cobro.' : 'Demo: utiliza datos ficticios. No se enviará un correo ni se realizará un cobro.'));
    const actions = element('div', 'form-actions'); const back = element('button', 'secondary', 'Volver'); back.type = 'button'; back.addEventListener('click', chooseSlot);
    const next = element('button', 'primary', 'Revisar turno →'); next.type = 'submit'; actions.append(back, next); form.append(actions);
    form.addEventListener('submit', event => { event.preventDefault(); review(); }); container.append(form); form.querySelector('input').focus();
  }
  function review() {
    container.replaceChildren(element('p', 'step-label', '03 / 03 · Revise y confirme'), summary(), privateText(draft.customerName), privateText(draft.email), element('p', 'muted', realBooking ? 'Al confirmar se registrará su cita en la agenda del negocio. No se cobrará ningún importe.' : 'Está reservando un turno de demostración. No se cobrará ningún importe.'));
    const actions = element('div', 'form-actions'); const back = element('button', 'secondary', 'Editar'); back.addEventListener('click', details);
    const confirm = element('button', 'primary', 'Confirmar turno →');
    confirm.addEventListener('click', async () => {
      confirm.disabled = true; back.disabled = true; confirm.textContent = 'Confirmando…';
      try {
        const result = await api.request('/api/appointments', { method: 'POST', body: { requestId: draft.requestId, serviceId: service.id, slot: draft.slot, instructorId:draft.instructorId, customerName: draft.customerName, email: draft.email, consent: draft.consent, expectedPriceCents: service.priceCents } });
        if (!alive()) return;
        if(result.status==='pending'){
          $('booking-title').textContent='Estamos verificando su reserva.';
          container.replaceChildren(summary(),element('p','notice','Google no ha confirmado el registro. No haga otra reserva; consulte al personal con este código.'),element('div','receipt-code',result.code||result.id));
          const done=element('button','primary full-width','Finalizar atención');done.onclick=()=>resetSession();container.append(done);return;
        }
        if(result.status==='cancelled')throw new Error('La reserva fue cancelada. Consulte al personal.');
        $('booking-title').textContent = 'Su turno está reservado.';
        container.replaceChildren(element('div', 'receipt-symbol', '✓'), summary(), element('p', '', realBooking ? 'Su código de reserva' : 'Su comprobante de demostración'), element('div', 'receipt-code', realBooking?(result.code||result.id):result.id.slice(0,8).toUpperCase()), element('p', 'muted', realBooking ? 'Cita registrada en Google Calendar, en la agenda del negocio. No se añade automáticamente a su calendario personal. Conserve este código.' : 'Reserva guardada en esta PC. No se enviaron correos ni se realizaron cobros. Anote el código y preséntelo al personal.'));
        if(realBooking)container.append(element('p',result.mailStatus==='sent'?'muted':'notice',result.mailStatus==='sent'?'Confirmación enviada a '+draft.email+'. Revise también Spam.':'Su cita está confirmada, pero no pudimos confirmar el envío del correo. Conserve el código y consulte al personal; no repita la reserva.'));
        if(callView.connected){const backToCall=element('button','secondary full-width','Volver a la llamada');backToCall.onclick=()=>$('booking-dialog').close();container.append(backToCall);}
        const done = element('button', 'primary full-width', 'Finalizar atención ↗'); done.addEventListener('click', () => resetSession()); container.append(done);
      } catch (error) {
        if (!alive()) return;
        if (error.status === 401) { resetSession(); notify('La sesión terminó. Inicie otra para consultar el turno con el personal.'); return; }
        showError(error); confirm.textContent = 'Reintentar confirmación'; confirm.disabled = false; back.disabled = realBooking && (!error.status || error.status >= 500);
        if (error.status === 409) {
          confirm.disabled = true;
          const refresh = element('button', 'secondary full-width', 'Elegir otro horario');
          refresh.addEventListener('click', async () => {
            refresh.disabled = true;
            try { readSlots(await api.request(`/api/services/${service.id}/slots`)); if (!alive()) return; draft.slot = null; draft.instructorId=null; draft.requestId = crypto.randomUUID(); chooseSlot(); }
            catch (e) { showError(e); refresh.disabled = false; }
          }); container.append(refresh);
        }
      }
    });
    actions.append(back, confirm); container.append(actions);
  }
  try { readSlots(await api.request(`/api/services/${service.id}/slots`));if(!alive())return;if(preferredSlot&&slots.some(s=>s.slot===preferredSlot&&s.available)){draft.slot=preferredSlot;details();}else{chooseSlot();if(preferredSlot)showError({message:'Ese horario ya no está disponible. Elija otra opción.'});} } catch (error) { if (alive()) { container.replaceChildren(); showError(error); } }
}
/**
 * pauseCallForBooking: Pausa escucha mientras el visitante introduce datos en pantalla.
 * Entrada (firma real): (sin parámetros).
 * Salida: Estado de reanudación conservado para volver a la llamada.
 */
function pauseCallForBooking(){
  if(!callView.connected)return;
  bookingResume ||= {generation,automatic:autoConversation.enabled};
  autoConversation.pause();stopAudio();
}
function openCallAgenda(action='menu'){
  if(!callView.connected||busy||startingCall||$('booking-dialog').open)return;
  pauseCallForBooking();
  if(action==='menu'){showAgendaMenu();return;}
  if(action==='lookup'){openAppointmentLookup();return;}
  chooseCallService(action);
}
/**
 * showAgendaMenu: Presenta reservar, consultar cita o disponibilidad desde inicio/llamada.
 * Entrada (firma real): service=null.
 * Salida: Modal con acciones; abrirlo no reserva.
 */
function showAgendaMenu(service=null){
  pauseCallForBooking();stopAudio();bookingGeneration++;
  $('booking-title').textContent='Mi cita y horarios';$('booking-dialog').querySelector('.eyebrow').textContent=service?'AGENDA DEL SERVICIO':'SU PRÓXIMA CITA';
  const content=$('booking-content');content.replaceChildren();
  if(service)content.append(element('h3','',service.name));
  content.append(element('p','','Puede reservar, consultar su cita o ver los horarios.'+(callView.connected?' El micrófono permanece pausado mientras escribe.':'')));
  for(const [key,label] of [['reserve','Reservar y confirmar cita'],['lookup','Consultar mi cita'],['availability','Ver disponibilidad']]){
    const button=element('button','secondary full-width',label);button.onclick=()=>{if(key==='lookup')openAppointmentLookup();else if(service)openBooking(service,{availabilityOnly:key==='availability'});else chooseCallService(key);};content.append(button);
  }
  $('booking-dialog').showModal();
}
function chooseCallService(action){
  const available=services.filter(s=>config.center?.booking.enabled&&config.center.booking.serviceIds?.includes(s.id));
  if(!available.length){$('booking-title').textContent='Agenda no disponible';$('booking-content').replaceChildren(element('p','','No hay servicios con reserva en línea. Consulte al personal.'));$('booking-dialog').showModal();return;}
  if(available.length===1){openBooking(available[0],{availabilityOnly:action==='availability'});return;}
  $('booking-title').textContent='¿Qué desea reservar?';$('booking-dialog').querySelector('.eyebrow').textContent='SU PRÓXIMA CITA';
  const content=$('booking-content');content.replaceChildren(element('p','','Elija el servicio. El micrófono queda pausado mientras completa sus datos.'));
  for(const service of available){const button=element('button','secondary full-width',service.name+' · '+service.duration+' min');button.onclick=()=>openBooking(service,{availabilityOnly:action==='availability'});content.append(button);}
  $('booking-dialog').showModal();
}
async function openAppointmentLookup(){
  const epoch=generation,view=++bookingGeneration;
  if(!(await ensureSession())||epoch!==generation||view!==bookingGeneration)return;
  const content=$('booking-content');$('booking-title').textContent='Consulte su cita.';
  content.replaceChildren(element('p','','Escriba su correo y las 8 letras de su código. Puede usar mayúsculas o minúsculas, con o sin guion. Si no tiene el código, solicítelo al personal.'));
  const form=element('form','booking-form');
  for(const [name,label,type] of [['email','Correo electrónico','email'],['id','Código de reserva','text']]){const wrap=element('label','',label),input=element('input');input.name=name;input.type=type;input.required=true;input.maxLength=name==='id'?50:120;input.autocomplete='off';input.spellcheck=false;input.setAttribute('autocapitalize','none');if(name==='email')input.inputMode='email';else{input.placeholder='ABCD-EFGH';input.setAttribute('autocapitalize','characters');}wrap.append(input);form.append(wrap);}
  const notice=element('p','notice');notice.hidden=true;notice.setAttribute('role','status');const submit=element('button','primary full-width','Consultar cita');submit.type='submit';form.append(notice,submit);content.append(form);$('booking-dialog').showModal();
  form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;notice.hidden=true;try{
    const result=await api.request('/api/appointments/lookup',{method:'POST',body:{email:form.elements.email.value.trim(),id:form.elements.id.value.trim()}});
    if(epoch!==generation||view!==bookingGeneration||!$('booking-dialog').open)return;
    const format=new Intl.DateTimeFormat(language,{dateStyle:'full',timeStyle:'short',timeZone:result.timezone});
    const labels={reserved:'Cita confirmada en Google Calendar',pending:'Cita pendiente de verificación',cancelled:'Cita cancelada'};
    content.replaceChildren(element('h3','',labels[result.status]||'Consulte al personal'),element('p','',result.serviceName),element('p','',format.format(new Date(result.slot))),element('p','muted',result.timezone),element('div','receipt-code',result.code||result.id));
    if(result.instructorName)content.append(privateText(t('Profesor: {0}').replace('{0}',result.instructorName)));
    const back=element('button','secondary full-width',callView.connected?'Volver a la llamada':'Volver al inicio');back.onclick=()=>$('booking-dialog').close();content.append(back);
  }catch(error){if(epoch===generation&&view===bookingGeneration&&$('booking-dialog').open){notice.textContent=error.message;notice.hidden=false;}}finally{submit.disabled=false;}};
}
$('call-booking').addEventListener('click',()=>openCallAgenda());
$('services-tab').addEventListener('click', () => switchView('services'));
$('chat-tab').addEventListener('click', () => switchView('chat'));
$('chat-form').addEventListener('submit', event => { event.preventDefault(); autoConversation.pause(); sendMessage($('message').value); });
$('message').addEventListener('input',()=>{messageChannel='text';autoConversation.pause();});
$('call-chat').addEventListener('click',()=>autoConversation.pause());
$('call-auto').addEventListener('click',()=>{autoConversation.pause();automaticMode=!automaticMode;updateCallMode();notify(automaticMode?'Modo automático: pulse el micrófono una vez para conversar.':'Modo manual: hable, revise el texto y pulse Enviar.');});
updateCallMode();
/**
 * beginCall: Prepara consentimiento, interfaz y canal seleccionado; habilita micrófono automático
 * al finalizar el saludo.
 * Entrada (firma real): mode.
 * Salida: Promise<void>; voz y video usan proveedores distintos.
 */
async function beginCall(mode) {
  if (startingCall || busy || callView.active || liveAvatar.connecting) return;
  if(config?.center?.experience?.[mode==='voice'?'voiceEnabled':'videoEnabled']===false){notify('Este canal está desactivado. Puede escribir su consulta.');return;}
  if (mode === 'voice' && !tts.available) { notify('La voz no está disponible en este dispositivo. Puede escribir su consulta o consultar con el personal.'); switchView('chat'); return; }
  startingCall = true; renderBusy(busy);
  const epoch = generation;
  try {
    // Unlock local playback in the original user gesture, before network/consent awaits.
    if (mode === 'voice') await tts.prepare();
    if (epoch !== generation || !(await ensureSession({ video: mode === 'video',channel:mode })) || epoch !== generation) return;
    stopAudio(); notify();
    if (mode === 'voice') {
      callView.status('connecting', 'voice'); callView.status('ready', 'voice');
      sound = true; updateSound(); $('sound').disabled = false;
      if (!stt.available) notify('Este navegador no permite hablar por micrófono. Puede escribir en el panel y escuchar las respuestas.');
    } else {
      liveAvatarConfig = await api.request('/api/avatar/config');
      if (epoch !== generation) return;
      const ready = liveAvatarConfig.configured && liveAvatarConfig.paidEnabled && (liveAvatarConfig.mode !== 'LITE' || liveAvatarConfig.localVoiceReady);
      if (!ready || liveAvatarConfig.occupied) { notify('El video no está disponible en este momento. Puede elegir la llamada por voz.'); return; }
      await liveAvatar.start({ mode: 'receptionist', consent: true });
      if (epoch !== generation || !liveAvatar.ready) return;
      sound = true; updateSound();
    }
    // A voice-call gesture opts into listening; wait for the greeting so it is
    // never captured as the visitor's first utterance. Browser permission still applies.
    if(mode==='voice'&&stt.available&&automaticMode){
      voiceConsent=true;
      autoConversation.enable({waitForReply:!conversationStarted});
    }
    if (conversationStarted) { switchView('chat'); }
    else if(config.center){conversationStarted=true;addMessage('assistant',config.center.greeting);api.request('/api/session/greeting',{method:'POST',body:{channel:mode}}).catch(()=>{});speak(config.center.greeting);}
    else await sendMessage('Hola, ¿puede ayudarme?');
  } catch (error) { if (epoch === generation) notify(error.message || 'No se pudo iniciar la llamada. Puede escribir su consulta.'); }
  finally { startingCall = false; renderBusy(busy); }
}
$('start').addEventListener('click', () => beginCall('voice'));
$('start-video').addEventListener('click', () => beginCall('video'));

document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {messageChannel='text';sendMessage(t(button.dataset.prompt));}));
$('mic').addEventListener('click', async () => {
  if (autoConversation.enabled) { autoConversation.pause(); notify('Escucha automática en pausa. Pulse el micrófono para continuar.'); return; }
  if (listening) { stopAudio(); $('input-status').textContent = 'Micrófono detenido · Revise su texto antes de enviar'; return; }
  const epoch = generation;
  if (!(await ensureSession()) || epoch !== generation) return;
  $('voice-send-detail').textContent = callView.connected&&automaticMode ? 'En esta llamada, sus frases se enviarán automáticamente cuando termine de hablar. Pulse el micrófono para pausar. Mientras Nexo responde, la escucha se detiene.' : 'Revise la transcripción antes de enviarla. También puede escribir su consulta.';
  if (!voiceConsent) $('voice-dialog').showModal(); else activateMicrophone();
});
$('accept-voice').addEventListener('click', () => { voiceConsent = true; $('voice-dialog').close(); activateMicrophone(); });
$('sound').addEventListener('click', () => { sound = !sound; updateSound(); if (!sound) { localSpeaking = false; tts.stop(); liveAvatar.stopSpeech(); if (!listening) avatar.setState(busy ? 'thinking' : 'idle'); if(!busy)autoConversation.replyEnded(); } });
$('end-session').addEventListener('click', () => resetSession('Sesión finalizada. Gracias por visitarnos.'));
function startNewConversation() { resetSession('', {reason:'new_conversation'}); $('new-conversation').focus(); }
$('new-conversation').addEventListener('click', startNewConversation);
$('idle-new-conversation').addEventListener('click', startNewConversation);
$('privacy').addEventListener('click', () => $('privacy-dialog').showModal());
$('booking-dialog').addEventListener('close', () => {
  if($('booking-dialog').open)return;
  bookingGeneration++;$('booking-content').replaceChildren();const resume=bookingResume;bookingResume=null;
  if(resume?.generation===generation&&resume.automatic&&callView.connected&&api.token&&automaticMode&&!busy){autoConversation.enable();}
});
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { notify('En iPad, abra Nexo desde la pantalla de inicio o utilice Acceso guiado. En una PC puede usar F11.'); }
});
$('continue-session').addEventListener('click', () => { $('idle-dialog').close(); lastActivity = Date.now(); lastTouch = 0; });
for (const event of ['pointerdown', 'keydown', 'input']) document.addEventListener(event, () => { if (!$('idle-dialog').open) lastActivity = Date.now(); }, { passive: true });
/**
 * checkInactivity: Evalúa tiempos/estado para avisar o limpiar datos del visitante.
 * Entrada (firma real): (sin parámetros).
 * Salida: Sin valor; puede pausar/cerrar atención y regresar al inicio.
 */
function checkInactivity() {
  if (!config || document.hidden || suspendedCall) return;
  // Actual responses keep an attended conversation alive; a silent microphone does not.
  if (localSpeaking || liveAvatar.pendingSpeech || liveAvatar.connecting || busy) lastActivity = Date.now();
  const idle = Date.now() - lastActivity;
  const home = !callView.active && !liveAvatar.connecting;
  if (home && idle >= homeIdleMs) {
    if (api.token || pendingSession || $('message').value || document.querySelector('.message, dialog[open]') || !$('chat-view').hidden || !$('notice').hidden) resetSession();
    return;
  }
  if (!api.token) return;
  if (callView.connected && idle >= ($('booking-dialog').open?homeIdleMs:45_000)) { resetSession(); return; }
  if (idle >= config.sessionTtlMs) { resetSession(); return; }
  if (!home && idle >= config.sessionTtlMs - 60_000 && !$('idle-dialog').open) { stopAudio(); $('idle-dialog').showModal(); }
  if (idle < homeIdleMs && Date.now() - lastTouch > 60_000) {
    lastTouch = Date.now(); const epoch = generation;
    api.request('/api/session/touch', { method: 'POST' }).catch(error => { if (epoch === generation && error.status === 401) resetSession('La sesión venció. Inicia nuevamente.'); });
  }
}
setInterval(checkInactivity, 1000);
/** Pausa voz al ocultar; video se cierra para detener consumo. Retorno breve verifica sesión.
 * Epoch impide reactivar micrófono de una atención cerrada mientras esperaba la red.
 */
function suspendAttention(){
  if(suspendedCall)return;
  if(callView.connected&&callView.mode==='voice'){
    suspendedCall={generation,at:Date.now(),automatic:autoConversation.enabled};
    autoConversation.pause();stopAudio();notify('Llamada en pausa. Al volver comprobaremos su micrófono.');
  }else if(callView.active||startingCall||liveAvatar.ready||liveAvatar.connecting)resetSession('La atención se cerró al salir de la pantalla.');
  else {autoConversation.pause();stopAudio();}
}
async function resumeAttention(){
  if(document.hidden)return;
  const pending=suspendedCall;
  if(!pending){checkInactivity();return;}
  if(pending.resuming)return;
  if(Date.now()-pending.at>=45_000){resetSession('La atención terminó por inactividad. Puede iniciar una nueva llamada.');return;}
  pending.resuming=true;
  try{
    await api.request('/api/session/touch',{method:'POST'});
    if(suspendedCall!==pending||pending.generation!==generation||document.hidden){pending.resuming=false;return;}
    suspendedCall=null;lastActivity=lastTouch=Date.now();notify();
    if(pending.automatic&&automaticMode&&!$('booking-dialog').open){autoConversation.enable({waitForReply:busy});}
    else notify('Pulse el micrófono cuando desee continuar.');
  }catch(error){
    if(suspendedCall!==pending||pending.generation!==generation)return;
    suspendedCall=null;
    if(error.status===401)resetSession('La sesión terminó. Puede iniciar una nueva llamada.');
    else notify('No se pudo retomar la conexión. Pulse el micrófono para volver a intentar.');
  }
}
window.addEventListener('focus', resumeAttention);
window.addEventListener('pageshow', resumeAttention);
window.addEventListener('pagehide', event => {if(event.persisted)suspendAttention();else resetSession();});
document.addEventListener('visibilitychange', () => {if(document.hidden)suspendAttention();else resumeAttention();});
function renderAvatarOptions() {
  if (!liveAvatarConfig) return;
  const mode = $('avatar-start-form').elements['avatar-mode'].value;
  const available = (mode === 'sandbox' ? liveAvatarConfig.sandboxReady : liveAvatarConfig.configured && liveAvatarConfig.paidEnabled) && (liveAvatarConfig.mode !== 'LITE' || liveAvatarConfig.localVoiceReady);
  $('avatar-connect').disabled = !available || liveAvatarConfig.occupied;
  $('avatar-connect').textContent = mode === 'sandbox' ? 'Iniciar prueba técnica ↗' : 'Conectar recepcionista ↗';
  const missing = [];
  if (!liveAvatarConfig.requirements.key) missing.push('cuenta y clave de LiveAvatar');
  if (liveAvatarConfig.requirements.voiceRequired && !liveAvatarConfig.requirements.voice) missing.push('voz en español');
  if (mode !== 'sandbox' && !liveAvatarConfig.requirements.avatar) missing.push('avatar de recepcionista');
  if (liveAvatarConfig.mode === 'LITE' && !liveAvatarConfig.localVoiceReady) missing.push('voz local en el servidor');
  if (mode !== 'sandbox' && !liveAvatarConfig.paidEnabled) missing.push('habilitación de consumo por el responsable');
  $('avatar-config-status').textContent = liveAvatarConfig.occupied ? 'Hay una prueba activa o pendiente de cierre. Espere antes de iniciar otra.'
    : available ? 'Configuración local completa. El video se comprobará al conectar.'
    : `Falta configurar: ${missing.join(', ')}. Puede seguir utilizando Nexo con su imagen actual.`;
  $('avatar-setup').open = !available;
}
$('avatar-local').addEventListener('click', () => {
  if (!avatar.ready) { notify('No se pudo cargar el modelo 3D. Recargue para reintentar.'); return; }
  avatar.setEnabled(!avatar.enabled); $('avatar-local').textContent = avatar.enabled ? 'Ver imagen' : 'Ver recepcionista 3D';
});
$('avatar').addEventListener('avatar-error', event => notify(event.detail));

$('avatar-live').addEventListener('click', async () => {
  if (liveAvatar.ready || liveAvatar.connecting) { try { await liveAvatar.stop(); } catch (error) { notify(error.message); } return; }
  stopAudio(); $('avatar-start-form').reset(); liveAvatarConfig = null;
  $('avatar-config-status').textContent = 'Comprobando configuración…'; $('avatar-connect').disabled = true;
  $('avatar-dialog').showModal();
  try { liveAvatarConfig = await api.request('/api/avatar/config'); renderAvatarOptions(); }
  catch (error) { $('avatar-config-status').textContent = error.message; }
});
$('avatar-start-form').addEventListener('change', renderAvatarOptions);
$('avatar-start-form').addEventListener('submit', async event => {
  event.preventDefault();
  const mode = $('avatar-start-form').elements['avatar-mode'].value;
  const consent = $('avatar-data-consent').checked;
  $('avatar-dialog').close();
  const epoch = generation;
  if (!(await ensureSession({ video: true })) || epoch !== generation) return;
  stopAudio(); notify();
  try {
    const result = await liveAvatar.start({ mode, consent });
    if (!result || epoch !== generation) return;
    sound = true; updateSound(); switchView('chat');
    const greeting = mode === 'sandbox'
      ? 'Hola. Soy el avatar de prueba de LiveAvatar. Esta prueba sirve para comprobar la sincronización de labios y los movimientos del rostro.'
      : config.center?.greeting || 'Hola, soy Nexo, su recepcionista virtual. Puedo orientarle sobre nuestros servicios y ayudarle a preparar su próximo turno.';
    addMessage('assistant', greeting); speak(greeting);
  } catch (error) { if (epoch === generation) notify(error.message); }
});
$('avatar-audio-enable').addEventListener('click', async () => {
  try { await liveAvatar.resumeAudio(); $('avatar-audio-enable').hidden = true; notify(); }
  catch { notify('No se pudo activar el sonido. Revise el volumen y los permisos del navegador.'); }
});
setInterval(() => {
  if (liveAvatar.ready && avatarDeadline) {
    const seconds = Math.max(0, Math.ceil((avatarDeadline - Date.now()) / 1000));
    $('avatar-live').textContent = `Detener video · ${seconds} s`; callView.time(seconds);
  }
}, 1000);
renderBusy(false); $('start').disabled = $('start-video').disabled = true;
try {
  [config, services, liveAvatarConfig] = await Promise.all([api.request('/api/config'), api.request('/api/services'), api.request('/api/avatar/config')]);
  renderRelease(config.release);
  document.getElementById('pilot-access-link').hidden=!config.pilot;
  if (config.avatarProvider === 'local3d' || new URLSearchParams(location.search).get('avatar') === 'anterior') await loadLocalAvatar().catch(() => {});
  $('mode').textContent = config.demo ? 'DEMO · Sin IA real' : 'IA · OpenAI';
  $('mode').title = config.demo ? 'Respuestas preparadas para probar el recorrido' : 'Conversación conectada a OpenAI';
  renderCenter();
  applyVoiceLanguage();
  $('local-voice-status').textContent = tts.available ? 'Voz disponible · Puede escribir su consulta' : 'Puede escribir su consulta';
  renderServices(); renderBusy(false);
  if (!tts.available) { sound = false; updateSound(); $('sound').disabled = true; }
} catch (error) { $('mode').textContent = 'Sin conexión'; $('services').replaceChildren(element('p', 'muted', 'No se pudo cargar el catálogo. Recargue la página para reintentar.')); notify(error.message); }

// Versión y fecha pertenecen a la publicación; reiniciar o editar el negocio no las cambia.
function renderRelease(release){
 const valid=typeof release?.version==='string'&&/^\d+\.\d+\.\d+$/.test(release.version)&&/^\d{4}-\d{2}-\d{2}$/.test(release.updatedAt||'');
 $('home-release').hidden=!valid;if(!valid)return;
 $('home-release-version').textContent=release.version;$('home-release-date').dateTime=release.updatedAt;$('home-release-date').textContent=release.updatedAt;
}
function renderCenter(){
 $('home-agenda').disabled=!config?.center?.booking.enabled;
 $('home-agenda').title=config?.center?.booking.enabled?'Reservar, consultar su cita y ver disponibilidad':'Las citas en línea aún no están habilitadas';
 touchKeyboard.setEnabled(config?.center?.experience?.touchKeyboard===true);
 if(!config?.center)return;
 const c=config.center,e=c.experience||{};
 document.body.dataset.accent=e.accent||'lime';
 $('agent-heading').replaceChildren(document.createTextNode('Hola, soy '+(c.assistantName||'Nexo')),element('span','','.'));
 $('avatar').setAttribute('aria-label',(c.assistantName||'Nexo')+', asistente virtual');
 $('messages').setAttribute('aria-label','Conversación con '+(c.assistantName||'Nexo'));
 $('start').hidden=e.voiceEnabled===false;$('start-video').hidden=e.videoEnabled===false;$('avatar-live').hidden=e.videoEnabled===false;
 $('mic').hidden=e.voiceEnabled===false&&e.videoEnabled===false;
 $('channel-hint').textContent=e.voiceEnabled===false?(e.videoEnabled===false?'Escriba su consulta o elija un servicio.':'Elija video o escriba su consulta.'):e.videoEnabled===false?'Converse por voz o escriba su consulta.':'Elija voz con imagen o video en directo.';
 $('session-retention-copy').textContent='El inicio se limpia después de un minuto sin actividad. También puede pulsar Nueva conversación. Las llamadas se cierran tras 45 segundos sin actividad. El texto se conserva en el historial privado para seguimiento.';
 if(!api.token){automaticMode=e.automaticVoice!==false;updateCallMode();}
 applyVoiceLanguage();
 $('sound').disabled=!tts.available&&!liveAvatar.ready;if($('sound').disabled){sound=false;updateSound();}
 $('mode').textContent=config.demo?'Respuestas locales':'IA · OpenAI';
 document.title=config.center.name+' · Nexo';
 document.querySelector('.center-label').textContent=config.center.name;
 document.querySelector('.agent-intro p').textContent=(c.addressStyle==='tu'?'Tu':'Su')+' asistente de '+config.center.name;
 document.querySelector('.services-view .eyebrow').textContent=config.center.name;
 document.querySelector('.section-description').textContent='Consulte nuestros servicios o converse con la asesora.';
 document.querySelector('.assistance-note strong').textContent='Horario de atención';
 document.querySelector('.assistance-note p').textContent=config.center.hours;
 document.querySelector('.footer > span').textContent=config.center.name;
 document.querySelector('.footer > span:nth-child(2)').textContent=config.center.booking.enabled?'Reservas en línea · Sin cobros en el kiosco':'Turnos con el personal · Sin cobros en el kiosco';
 document.querySelector('#welcome-dialog .muted').textContent=config.center.booking.message;
 document.querySelectorAll('#privacy-dialog > p')[3].textContent=c.booking.enabled?'Las reservas confirmadas guardan el nombre y correo en Nexo y Google Calendar para gestionar la cita. No se procesan pagos.':c.booking.message+' Este kiosco no consulta disponibilidad ni confirma reservas. No se procesan pagos.';
}
let refreshingCatalog=false;
async function refreshCatalog(){
 if(!config?.center||refreshingCatalog||document.hidden||busy||$('booking-dialog').open)return;
 refreshingCatalog=true;
 try{const [nextConfig,nextServices]=await Promise.all([api.request('/api/config'),api.request('/api/services')]);
   renderRelease(nextConfig.release);
   if(JSON.stringify(nextConfig.center)!==JSON.stringify(config.center)||JSON.stringify(nextServices)!==JSON.stringify(services)){const changed=nextConfig.center?.configurationRevision!==config.center?.configurationRevision;config=nextConfig;services=nextServices;if(changed&&api.token)resetSession('La configuración cambió. Inicie una nueva atención.');renderCenter();renderServices();renderBusy(busy);}
 }catch{}finally{refreshingCatalog=false;}
}
setInterval(refreshCatalog,15000);
window.addEventListener('focus',refreshCatalog);
$('services-tab').addEventListener('click',refreshCatalog);
