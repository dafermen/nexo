/**
 * NEXO · GUÍA DEL MÓDULO: server/app.js
 * Coordinar rutas HTTP y las reglas de conversación de Nexo.
 * Entrada: Dependencias de createApp: config, repository, ai y adaptadores opcionales inyectables.
 * Salida: Objeto Server de Node; cada ruta responde JSON, archivo o redirección según su contrato.
 * Estado importante: sessions conserva contexto temporal por token; limits controla frecuencia por
 * IP; runtime lee configuración vigente; controller cancela trabajo pendiente.
 * Efectos y límites: Orquesta SQLite, IA, correo, agenda y voz. Las rutas administrativas
 * verifican acceso antes de leer o escribir datos privados.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {PilotAccess} from './pilot-access.js';
import packageInfo from '../package.json' with {type:'json'};
// Metadatos de la versión publicada; no usar la hora de arranque ni datos privados de instalación.
const releaseInfo={version:packageInfo.version,updatedAt:packageInfo.releaseDate||null};
import {BookingNotifications} from './booking-notifications.js';
import {reportFilters,reportCsv} from './admin-reports.js';
import {validateBackupPassword} from './database-backup.js';
import {createReadStream} from 'node:fs';
import {pipeline as streamPipeline} from 'node:stream/promises';
import {requestContext} from './http-security.js';
import {AudioLibrary} from './audio-library.js';
import {audioScope,rememberReusable,canReuseAudio} from './audio-policy.js';
import {translate,validLanguage,visitorMessage} from './languages.js';
import {agendaCandidate,parseAgenda,buildAgendaRequest,resolveAgenda} from './agenda-conversation.js';
import {guideService} from './service-guidance.js';
import {isBookingCode} from './booking-code.js';
import {GoogleCalendarService} from './providers/google-calendar.js';
import {BookingService} from './booking.js';
import {BookingTransfers} from './booking-transfers.js';
import {agendaFilters,cancellationReason} from './admin-agenda.js';
import {BookingMailer} from './providers/booking-mail.js';
import {bookingIntent} from './booking-intent.js';
import {Readable,pipeline} from 'node:stream';
import {AdminAuth} from './admin-auth.js';
import {AdminMailer} from './providers/admin-mail.js';
import {compileFaq,parseFaq} from './faq.js';
import {serializeFaq,previewFaq} from './faq-editor.js';
import {businessText} from './business-settings.js';
import {createDocumentation} from './documentation.js';
import {buildIntentRequest,resolveIntent} from './school-intent.js';
import { defaultAiLimits, filterSchoolMessage, schoolDay, requestTopicRisk } from './school-filter.js';
import { buildAiRequest } from './providers/ai.js';
import { centerRepository } from './center.js';
import { createServer } from 'node:http';
import { readFile,realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname, dirname } from 'node:path';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { HttpError, textField } from './errors.js';
import { LocalTtsService } from './providers/local-tts.js';
import { LiveAvatarService } from './providers/live-avatar.js';

const webRoot = fileURLToPath(new URL('../public/', import.meta.url));
const hash = s => createHash('sha256').update(s).digest('hex');
const logChannel=value=>['text','voice','video'].includes(value)?value:'text';
const tokenCount=value=>Number.isSafeInteger(value)&&value>0?value:0;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.glb': 'model/gltf-binary' };

/**
 * body: Consume el stream HTTP y exige un objeto JSON dentro del límite en bytes; falla antes de
 * procesar entradas demasiado grandes.
 * Entrada (firma real): req, maxBytes=16_384.
 * Salida: Promise<object>; HttpError 415/413/400 si el cuerpo no cumple.
 */
async function body(req, maxBytes=16_384) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Se requiere JSON.');
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'Solicitud demasiado grande.');
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new HttpError(400, 'JSON inválido.'); }
}

/**
 * createApp: Compone dependencias y registra el manejador HTTP; los parámetros permiten usar
 * dobles de IA, correo, voz y agenda en pruebas.
 * Entrada (firma real): { config, repository, ai, calendar = null, bookingMailer = new
 * BookingMailer(config.installation?.mail), liveAvatar = new LiveAvatarService(config.liveAvatar),
 * localTts = new LocalTtsService(config.localTts), faq = null, documentation = createDocumentation(), adminMailer
 * = new AdminMailer(config.installation?.mail) }.
 * Salida: Server de Node listo para listen; el llamador controla arranque y cierre.
 */
export function createApp({ config, repository, ai, calendar = null, bookingMailer = new BookingMailer(config.installation?.mail), liveAvatar = new LiveAvatarService(config.liveAvatar), localTts = new LocalTtsService(config.localTts), faq = null, documentation = createDocumentation(), adminMailer = new AdminMailer(config.installation?.mail) }) {
  repository = centerRepository(repository, config.center, config);
  calendar ||= new GoogleCalendarService({repository,config:config.googleCalendar});
  const bookings=new BookingService({repository,calendar,mailer:bookingMailer});
  const transfers=new BookingTransfers({repository,calendar,bookings});
  // La barrera de participantes se puede quitar sin quitar las protecciones del VPS.
  const deployed=config.deploymentMode==='pilot';
  const pilot=(config.pilotPrivateEnabled??deployed)?new PilotAccess({passwordHash:config.pilotPasswordHash,repository}):null;
  const adminAuth=new AdminAuth({repository,installation:config.installation,mailer:adminMailer});
  const notifications=new BookingNotifications({repository,mailer:bookingMailer,recipients:adminAuth.emails});
  const notificationTimer=setInterval(()=>notifications.run().catch(()=>{}),15000);notificationTimer.unref();
  let backupBusy=false;
  const getCenter = () => {const center=repository.getCenter?.()||config.center||null;if(!center)return null;const status=bookings.publicStatus();return {...center,booking:{...center.booking,...status,...(status.enabled?{provider:'google-calendar',message:'En la llamada por voz, pulse «Mi cita y horarios» para reservar, ver disponibilidad o consultar una cita con su correo y código. También puede reservar desde Servicios. Revise y confirme el formulario; las frases por voz no registran citas.'}:{})}};};
  const baseAiLimits = {...defaultAiLimits,...config.aiLimits};
  const runtime=()=>repository.getCenterSettings?.()?.configuration;
  const sessionTtl=()=>runtime()?.experience.inactivityMinutes*60000||config.sessionTtlMs;
  let knowledgeCache=null,knowledgeSource=null;
  /**
   * knowledge: Selecciona la base activa y recompila las respuestas propias cuando cambia su texto.
   * Entrada (firma real): (sin parámetros).
   * Salida: Repositorio FAQ, compilación local o null si se desactivó.
   */
  const knowledge=()=>{
    const a=runtime()?.assistant;if(!a||a.knowledgeMode==='file')return faq;
    if(a.knowledgeMode==='none')return null;
    if(knowledgeSource!==a.knowledgeText){knowledgeSource=a.knowledgeText;knowledgeCache=compileFaq(parseFaq(a.knowledgeText));knowledgeCache.status=()=>({loaded:true,entries:knowledgeCache.entries.filter(e=>e.active).length,error:null});}
    return knowledgeCache;
  };
  const audioLibrary=config.audioCache&&config.dbPath&&config.dbPath!==':memory:'?new AudioLibrary({repository,provider:localTts,directory:resolve(dirname(config.dbPath),'audio-cache'),...config.audioCache}):null;
  /**
   * currentAudioScope: Calcula la huella del negocio, catálogo y conocimiento vigentes.
   * Entrada (firma real): (sin parámetros).
   * Salida: Hash; cualquier cambio relevante separa los audios reutilizables.
   */
  const currentAudioScope=()=>audioScope(getCenter(),repository.listServices(),{configuration:runtime()?.assistant,faq:knowledge()?.status?.()});
  // Memoria por visitante: token -> idioma, logId, mensajes/contexto y controlador.
  // No es SQLite: al reiniciar el proceso estas sesiones dejan de ser utilizables.
  // logId enlaza con el historial persistido sin publicar el Bearer en los registros.
  const sessions = new Map();
  const limits = new Map();
  const cleanup = setInterval(() => {
    const now = Date.now();
    repository.purgeAdministratorData(now);
    for (const [id, s] of sessions) if (s.expiresAt < now) { s.controller?.abort(); repository.endConversation(s.logId,'expired'); sessions.delete(id); localTts.stop(id); liveAvatar.stop(id).catch(() => {}); }
    for (const [key, v] of limits) if (v.reset < now) limits.delete(key);
  }, 30_000);
  cleanup.unref();
  const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  /**
   * rateLimit: Incrementa un contador por dirección IP y bucket dentro de una ventana de un minuto.
   * Entrada (firma real): req, bucket, max.
   * Salida: Sin valor; HttpError 429 si excede max.
   */
  const rateLimit = (req, bucket, max) => {
    const key = `${req.clientIp}:${bucket}`;
    const current = limits.get(key);
    const value = current && current.reset > Date.now() ? current : { count: 0, reset: Date.now() + 60_000 };
    if(!current&&limits.size>=5000)throw new HttpError(429,'Intente más tarde.');
    value.count++; limits.set(key, value);
    if (value.count > max) throw new HttpError(429, 'Demasiados intentos. Espera un minuto.');
  };
  /**
   * getSession: Busca el Bearer visitante, verifica caducidad y renueva su vencimiento; una sesión
   * expirada cancela tareas y proveedores.
   * Entrada (firma real): req.
   * Salida: {token, session}; HttpError 401 si no existe una sesión vigente.
   */
  const getSession = req => {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      session?.controller?.abort(); if(session)repository.endConversation(session.logId,'expired'); sessions.delete(token); localTts.stop(token); liveAvatar.stop(token).catch(() => {});
      throw new HttpError(401, 'La sesión terminó. Inicia una conversación nueva.');
    }
    session.expiresAt = Date.now() + sessionTtl();
    return { token, session };
  };
  /**
   * requireAdmin: Verifica cookie de correo o hash del token de administración; nunca acepta el
   * token visitante como permiso administrativo.
   * Entrada (firma real): req.
   * Salida: Sin valor; lanza HttpError 401/503 cuando no hay acceso.
   */
  const requireAdmin = req => {
    if(adminAuth.mode==='email'){
      if(!adminAuth.authenticated(req))throw new HttpError(401,'Su acceso terminó. Solicite un nuevo código.');
      return;
    }
    if (!config.adminToken) throw new HttpError(503, 'Administración desactivada. Configura ADMIN_TOKEN en el servidor.');
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!timingSafeEqual(Buffer.from(hash(token)), Buffer.from(hash(config.adminToken)))) throw new HttpError(401, 'Credencial de administración incorrecta.');
  };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(deployed||pilot)res.setHeader('Strict-Transport-Security','max-age=31536000');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' blob: wss://*.livekit.cloud https://*.livekit.cloud wss://*.liveavatar.com https://*.liveavatar.com wss://webrtc-signaling.heygen.io; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()');
    try {
      const {authority,clientIp}=requestContext(req,config);req.clientIp=clientIp;
      const url = new URL(req.url, authority);
      let path;try{path=decodeURIComponent(url.pathname);}catch{throw new HttpError(400,'Ruta inválida.');}
      if(!pilot){
        if(['/pilot','/pilot.html'].includes(path)){res.writeHead(303,{Location:'/'});res.end();return;}
        if(path==='/api/pilot/status'&&req.method==='GET')return json(res,200,{enabled:false,authenticated:false});
        if(path==='/api/pilot/logout'&&req.method==='POST'){
          adminAuth.logout(req);res.setHeader('Set-Cookie',['__Host-nexo_pilot=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',adminAuth.cookie('',authority.protocol==='https:')]);return json(res,200,{ended:true});
        }
        if(path.startsWith('/api/pilot/'))throw new HttpError(404,'El acceso privado del piloto está deshabilitado.');
      }
      if(pilot){
        if(path==='/api/pilot/status'&&req.method==='GET')return json(res,200,{enabled:true,authenticated:pilot.authenticated(req)});
        if(path==='/api/pilot/login'&&req.method==='POST'){
          const input=await body(req,4096);
          res.setHeader('Set-Cookie',await pilot.login(input.password,clientIp));
          return json(res,200,{authenticated:true});
        }
        if(path==='/api/pilot/logout'&&req.method==='POST'){
          adminAuth.logout(req);res.setHeader('Set-Cookie',[pilot.logout(req),adminAuth.cookie('',true)]);return json(res,200,{ended:true});
        }
        if(!['/pilot','/pilot.html','/pilot.css','/pilot.js'].includes(path)&&!pilot.authenticated(req)){
          if(path.startsWith('/api/'))return json(res,401,{error:'Ingrese con el acceso privado del piloto.',pilotRequired:true});
          res.writeHead(303,{Location:'/pilot'});res.end();return;
        }
      }
      const settings=runtime();
      const aiLimits={...baseAiLimits,...(settings?{sessionCalls:settings.ai.sessionCalls,dailyCalls:settings.ai.dailyCalls,outputTokens:settings.ai.outputTokens}:{})};
      if(deployed){aiLimits.sessionCalls=Math.min(aiLimits.sessionCalls,baseAiLimits.sessionCalls);aiLimits.dailyCalls=Math.min(aiLimits.dailyCalls,baseAiLimits.dailyCalls);aiLimits.outputTokens=Math.min(aiLimits.outputTokens,baseAiLimits.outputTokens);}
      const aiEnabled=settings?.ai.enabled!==false;
      const model=settings?.ai.model||config.model;
      if(settings&&liveAvatar.settings&&!liveAvatar.active){liveAvatar.settings={...liveAvatar.settings,avatarId:settings.video.avatarId,voiceId:settings.video.voiceId};liveAvatar.duration=settings.video.maxSeconds;}
      if (path.startsWith('/api/')) {
        rateLimit(req, 'api', 180);
        if(req.method==='GET'&&path==='/api/calendar/oauth/callback'){
          const binding=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('nexo_google_oauth='))?.slice(18)||'';
          res.setHeader('Set-Cookie','nexo_google_oauth=; HttpOnly; SameSite=Lax; Path=/api/calendar/oauth/callback; Max-Age=0'+(authority.protocol==='https:'?'; Secure':''));
          let outcome='connected';try{await calendar.complete({state:url.searchParams.get('state'),code:url.searchParams.get('code'),error:url.searchParams.get('error')},binding);}catch{outcome='failed';}
          res.writeHead(303,{Location:'/settings#calendar='+outcome});res.end();return;
        }
        if(path.startsWith('/api/auth/')){
          if(req.method==='GET'&&path==='/api/auth/config')return json(res,200,adminAuth.status());
          if(req.method==='POST'&&path==='/api/auth/request'){
            const input=await body(req);const email=textField(input.email,'Correo',3,254);
            return json(res,202,await adminAuth.requestCode(email,req.clientIp));
          }
          if(req.method==='POST'&&path==='/api/auth/verify'){
            const input=await body(req);const token=await adminAuth.verify(input.challenge,input.code,req.clientIp);
            res.setHeader('Set-Cookie',adminAuth.cookie(token,authority.protocol==='https:'));return json(res,200,{authenticated:true});
          }
          if(req.method==='GET'&&path==='/api/auth/session'){
            if(!adminAuth.authenticated(req))throw new HttpError(401,'Acceso no disponible.');return json(res,200,{authenticated:true});
          }
          if(req.method==='POST'&&path==='/api/auth/logout'){
            adminAuth.logout(req);res.setHeader('Set-Cookie',adminAuth.cookie('',authority.protocol==='https:'));return json(res,200,{ended:true});
          }
          throw new HttpError(404,'Ruta no encontrada.');
        }
        if (path.startsWith('/api/docs/')) {
          if(deployed||pilot)requireAdmin(req);
          if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.');
          if (path === '/api/docs/catalog') return json(res, 200, await documentation.catalog());
          if (path === '/api/docs/document') return json(res, 200, await documentation.document(url.searchParams.get('id')));
          if (path === '/api/docs/assets') {
            const asset = await documentation.asset(url.searchParams.get('id'));
            res.writeHead(200, { 'Content-Type': asset.mime }); return res.end(asset.contents);
          }
          throw new HttpError(404, 'Documento no encontrado.');
        }
        if (req.method === 'GET' && path === '/api/health') return json(res, 200, { status: 'ok', provider: config.provider });
        if (req.method === 'POST' && path === '/api/tts') {
          if(settings?.experience.voiceEnabled===false&&settings?.experience.videoEnabled===false)throw new HttpError(403,'El audio está desactivado.');
          rateLimit(req, 'tts', 20); const { token, session } = getSession(req);
          const input = await body(req); const text = textField(input.text, 'Texto', 1, 3000);
          const controller = new AbortController();
          const cancel = () => { if (!res.writableEnded) controller.abort(); }; res.once('close', cancel);
          try {
            if(audioLibrary&&knowledge()?.refresh)await knowledge().refresh();
            const scope=audioLibrary?currentAudioScope():null;
            const cacheable=!!audioLibrary&&canReuseAudio(session,text,scope,translate(getCenter()?.greeting||'',session.language));
            return json(res, 200, await (audioLibrary||localTts).synthesize(text, { owner: token, signal: controller.signal, language:session.language,cacheable,scope }));
          }
          finally { res.off('close', cancel); }
        }
        if (req.method === 'GET' && path === '/api/avatar/config') return json(res, 200, { ...liveAvatar.status(), localVoiceReady: localTts.status().available, enabled:settings?.experience.videoEnabled!==false });
        if (req.method === 'POST' && path === '/api/avatar/session') {
          if(settings?.experience.videoEnabled===false)throw new HttpError(403,'El video está desactivado para este negocio.');
          if(settings && liveAvatar.settings){liveAvatar.settings={...liveAvatar.settings,avatarId:settings.video.avatarId,voiceId:settings.video.voiceId};liveAvatar.duration=settings.video.maxSeconds;}
          rateLimit(req, 'avatar-start', 3);
          const { token, session } = getSession(req); const input = await body(req);
          if (liveAvatar.status().mode === 'LITE' && !localTts.status(session.language).available) throw new HttpError(503, 'Instala la voz en el servidor antes de conectar LiveAvatar LITE.');
          const onClose = () => { if (!res.writableEnded) liveAvatar.stop(token).catch(() => {}); };
          res.once('close', onClose);
          try {
            if(!repository.reserveProviderCall('liveavatar',new Date().toISOString().slice(0,10),config.videoDailyLimit??100))throw new HttpError(429,'Se alcanzó el límite diario de video. Utilice la llamada por voz.');
            const result = await liveAvatar.start(token, {...input,language:session.language});
            if (!sessions.has(token) || res.destroyed) { await liveAvatar.stop(token); return; }
            return json(res, 201, result);
          } finally { res.off('close', onClose); }
        }
        if (req.method === 'DELETE' && path === '/api/avatar/session') {
          const { token } = getSession(req); return json(res, 200, await liveAvatar.stop(token));
        }
        if (req.method === 'GET' && path === '/api/config') return json(res, 200, { release:releaseInfo, pilot:!!pilot, avatarProvider: config.avatarProvider || 'liveavatar', localVoice: localTts.status(), provider: config.provider, demo: config.provider === 'demo'||!aiEnabled, aiEnabled, sessionTtlMs: sessionTtl(), retentionDays: config.retentionDays, conversationLogging:{enabled:true,retentionDays:config.conversationRetentionDays||0}, center: getCenter(), centerName: getCenter()?.name || 'Centro de atención', timezone: getCenter()?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone });
        if (req.method === 'GET' && path === '/api/services') return json(res, 200, repository.listServices());
        if (req.method === 'GET' && path.match(/^\/api\/services\/[^/]+\/slots$/)) {
          const serviceId = path.split('/')[3];
          if (!repository.getService(serviceId)?.active) throw new HttpError(404, 'Servicio no disponible.');
          if(config.center){if(!bookings.publicStatus().enabled)return json(res,200,{slots:[]});getSession(req);rateLimit(req,'availability',20);return json(res,200,await bookings.availability(serviceId));}
          return json(res, 200, { slots: repository.slots(serviceId) });
        }
        if (req.method === 'POST' && path === '/api/sessions') {
          rateLimit(req, 'new-session', 20);
          if(sessions.size>=(config.maxActiveSessions||50))throw new HttpError(429,'Hay varias atenciones en curso. Intente en un momento.');
          const input = await body(req);
          if (input.consent !== true) throw new HttpError(400, 'Debes aceptar el aviso de uso.');
          if(!validLanguage(input.language??'es'))throw new HttpError(400,'Idioma no disponible.');
          const token = randomBytes(32).toString('hex');
          sessions.set(token, { language:input.language??'es', logId:repository.startConversation(logChannel(input.channel)), greetingLogged:false, messages: [], schoolState: {serviceId:null,deviations:0,lastIntent:null}, aiCalls:0, expiresAt: Date.now() + sessionTtl(), busy: false });
          return json(res, 201, { token });
        }
        if (req.method === 'DELETE' && path === '/api/session') {
          const { token, session } = getSession(req); session.controller?.abort();
          const closeReason=['inactivity','new_conversation','pagehide'].includes(url.searchParams.get('reason'))?url.searchParams.get('reason'):'ended';
          repository.endConversation(session.logId,closeReason);sessions.delete(token);
          localTts.stop(token); liveAvatar.stop(token).catch(() => {});
          return json(res, 200, { ended: true });
        }
        if (req.method === 'POST' && path === '/api/session/touch') {
          getSession(req); return json(res, 200, { active: true });
        }
        if(req.method==='POST' && path==='/api/session/greeting'){
          const {session}=getSession(req),input=await body(req),center=getCenter();
          if(!session.greetingLogged&&center){session.greetingLogged=true;const turn=repository.startConversationTurn(session.logId,{kind:'greeting',channel:logChannel(input.channel)});repository.completeConversationTurn(turn,{text:translate(center.greeting,session.language),provider:'local',reason:'session_greeting'});}
          return json(res,200,{recorded:true});
        }
        if (req.method === 'POST' && path === '/api/chat') {
          rateLimit(req, 'chat', 20);
          const { token, session } = getSession(req);
          const input = await body(req);
          const originalMessage = textField(input.message, 'Mensaje', 1, 1000);
          const message=visitorMessage(originalMessage,session.language);
          if (session.busy) throw new HttpError(409, 'Espera la respuesta anterior.');
          const started=Date.now(),callsBefore=session.aiCalls,turnId=repository.startConversationTurn(session.logId,{message:originalMessage,channel:logChannel(input.channel)});
          let inputTokens=0,outputTokens=0;
          const recordUsage=usage=>{inputTokens+=tokenCount(usage?.input_tokens);outputTokens+=tokenCount(usage?.output_tokens);};
          session.busy = true; session.controller = new AbortController();
          const onClose = () => { if (!res.writableEnded) session.controller?.abort(); };
          res.once('close', onClose);
          try {
            const center=getCenter(), services=repository.listServices();
            const messages = [...session.messages, { role: 'user', content: originalMessage }];
            let result, provider=config.provider, reason='ai', catalogOnly=false;
            const activeFaq=knowledge();
            if(center && activeFaq?.refresh)await activeFaq.refresh();
            // El filtro puede mutar contexto; la copia permite interpretar desde el estado
            // anterior si la primera coincidencia local no fue suficientemente fiable.
            const stateBefore=structuredClone(session.schoolState);
            let decision=center ? filterSchoolMessage({message,services,center,state:session.schoolState,faq:activeFaq}) : {kind:'ai'};
            const guided=agendaCandidate(message,session.agendaState)?null:guideService({message,center,services,state:session.schoolState,decision,faq:activeFaq});
            if(guided)decision=guided;
            const day=schoolDay(new Date(),center?.timezone);
            /**
             * reserveRequest: Comprueba tamaño del prompt y reserva presupuesto antes de llamar al modelo,
             * incluso si luego falla la red.
             * Entrada (firma real): preparedRequest.
             * Salida: Decisión local de límite alcanzado o null si puede continuar.
             */
            const reserveRequest=preparedRequest=>{
              let blocked=null;
              if(Buffer.byteLength(JSON.stringify(preparedRequest),'utf8')>aiLimits.maxPromptBytes)blocked='context_limit';
              else if(config.provider==='openai' && session.aiCalls>=aiLimits.sessionCalls)blocked='session_limit';
              else if(config.provider==='openai' && !repository.reserveAiCall(day,aiLimits.dailyCalls))blocked='daily_limit';
              if(blocked)return {kind:'local',reason:blocked,catalogOnly:true,text:'Puede continuar consultando precios, requisitos, duración y modalidad en las fichas de Servicios. Para orientación adicional, consulte al personal de la escuela.'};
              if(config.provider==='openai')session.aiCalls++;
              return null;
            };
            let agendaInterpreted=false;
            if(!guided&&!decision.knowledgeAnswer&&center?.booking.enabled&&!decision.catalogOnly&&(stateBefore.deviations||0)<2&&!requestTopicRisk(message,center)&&!['greeting','courtesy','off_topic','restricted'].includes(decision.reason)&&agendaCandidate(message,session.agendaState)){
              const agendaState=structuredClone(session.agendaState||{});
              if(!agendaState.serviceId&&stateBefore.serviceId&&center.booking.serviceIds.includes(stateBefore.serviceId))agendaState.serviceId=stateBefore.serviceId;
              let plan=parseAgenda(message,{services,center,state:agendaState});
              if(!plan&&aiEnabled&&settings?.ai.interpretationEnabled!==false&&config.provider==='openai'&&typeof ai.interpret==='function'){
                const preparedRequest=buildAgendaRequest({model,message:originalMessage,services,center,state:agendaState,maxOutputTokens:Math.min(300,aiLimits.outputTokens)}),blocked=reserveRequest(preparedRequest);
                if(blocked)decision=blocked;
                else try{const interpreted=await ai.interpret({preparedRequest,signal:session.controller.signal});repository.recordAiTokens(day,interpreted.usage);recordUsage(interpreted.usage);plan=interpreted.interpretation;agendaInterpreted=true;}
                catch(error){if(session.controller.signal.aborted)throw error;}
              }
              if(!decision.catalogOnly){
                let agendaResult=null;
                try{if(plan)agendaResult=await resolveAgenda({language:session.language,plan,state:agendaState,services,center,availability:async serviceId=>{rateLimit(req,'availability',20);return bookings.availability(serviceId);}});}catch{}
                if(!sessions.has(token)||session.controller.signal.aborted)throw new HttpError(401,'La sesión terminó.');
                if(agendaResult){session.agendaState=agendaState;decision={...agendaResult,interpreted:agendaInterpreted};}
                else if(plan?.status==='other'&&decision.kind==='local')decision={...decision,interpret:false};
                else decision={kind:'local',reason:'agenda_clarify',text:'Para buscar su cita, indique el servicio, el día y si prefiere mañana o tarde. También puede usar Mi cita y horarios.',interpreted:agendaInterpreted};
              }
            }
            if(decision.interpret && aiEnabled && settings?.ai.interpretationEnabled!==false && config.provider==='openai' && typeof ai.interpret==='function'){
              session.schoolState=stateBefore;
              if((stateBefore.deviations||0)>=2)decision={kind:'local',reason:'restricted',catalogOnly:true,text:'Puede continuar consultando las fichas de Servicios o acercarse al personal de la escuela.'};
              else {
                const preparedRequest=buildIntentRequest({model,message:originalMessage,services,center,state:stateBefore,maxOutputTokens:Math.min(250,aiLimits.outputTokens)});
                const blocked=reserveRequest(preparedRequest);
                if(blocked)decision=blocked;
                else try {
                  const interpreted=await ai.interpret({preparedRequest,signal:session.controller.signal});
                  repository.recordAiTokens(day,interpreted.usage);recordUsage(interpreted.usage);
                  if(!sessions.has(token)||session.controller.signal.aborted)throw new HttpError(401,'La sesión terminó.');
                  decision=resolveIntent({interpretation:interpreted.interpretation,services,center,state:session.schoolState,faq});
                }catch(error){
                  if(session.controller.signal.aborted)throw error;
                  decision={kind:'local',reason:'interpretation_unavailable',text:'¿Sobre qué servicio desea información? También puede elegir una opción en Servicios.'};
                }
              }
            }
            if(!aiEnabled&&decision.kind!=='local')decision={kind:'local',reason:'ai_disabled',text:'Puede consultar nuestros servicios, precios, requisitos y horarios. '+(center?.handoff||'Consulte con el personal para orientación adicional.')};
            if(decision.kind==='local') {
              result={text:decision.text};provider=decision.interpreted?'openai':'local';reason=decision.reason;catalogOnly=!!decision.catalogOnly;
            } else if(center) {
              const aiMessages=[...session.messages.slice(-4),{role:'user',content:originalMessage}];
              const preparedRequest=buildAiRequest({language:session.language,model,messages:aiMessages,services,center,serviceContext:session.schoolState.serviceId,maxOutputTokens:aiLimits.outputTokens});
              const blocked=reserveRequest(preparedRequest);
              if(blocked){provider='local';reason=blocked.reason;catalogOnly=true;result={text:blocked.text};}
              else {
                try {
                  result=await ai.reply({messages:aiMessages,services,center,signal:session.controller.signal,maxOutputTokens:aiLimits.outputTokens,preparedRequest});
                  if(config.provider==='openai'){repository.recordAiTokens(day,result.usage);recordUsage(result.usage);}
                } catch(error) {
                  if(session.controller.signal.aborted)throw error;
                  provider='local';reason='ai_unavailable';result={text:'La orientación personalizada no está disponible en este momento. Puede consultar los servicios, precios y requisitos o acercarse al personal.'};
                }
              }
            } else {if(config.provider==='openai')session.aiCalls++;result=await ai.reply({messages,services,center,signal:session.controller.signal});if(config.provider==='openai')recordUsage(result.usage);}
            if (!sessions.has(token) || session.controller.signal.aborted) throw new HttpError(401, 'La sesión terminó.');
            if(center){
              // Keep only the latest clarification in session memory, separate from guidance history.
              if(['clarify','intent_clarify'].includes(reason))session.schoolState.clarificationContext={message:message.slice(0,1000),question:result.text.slice(0,350)};
              else if(!['greeting','courtesy','off_topic','intent_off_topic','interpretation_unavailable'].includes(reason))delete session.schoolState.clarificationContext;
            }
            // Rejected/ambiguous user text never enters the guidance model history.
            if(!center || reason==='ai')session.messages=[...messages,{role:'assistant',content:result.text}].slice(-12);
            // La respuesta visible se adapta al negocio/idioma antes de autorizar su audio.
            // Guardar el turno mide generación; no demuestra que el visitante lo escuchó.
            const replyText=translate(center?businessText(result.text,center):result.text,session.language);
            if(audioLibrary)rememberReusable(session,replyText,reason,currentAudioScope());
            repository.completeConversationTurn(turnId,{text:replyText,provider,reason,serviceId:session.schoolState.serviceId,aiCalls:session.aiCalls-callsBefore,inputTokens,outputTokens,durationMs:Date.now()-started});
            const bookingAction=logChannel(input.channel)==='voice'&&center?.booking.enabled&&!catalogOnly&&['booking','hours'].includes(reason)?bookingIntent(message):null;
            return json(res, 200, {text:replyText,provider,reason,catalogOnly,...(bookingAction?{bookingAction}:{}),...(decision.agenda?{agenda:decision.agenda}:{})});
          } catch(error) {
            repository.completeConversationTurn(turnId,{outcome:session.controller?.signal.aborted?'cancelled':'error',reason:session.controller?.signal.aborted?'cancelled':'response_error',aiCalls:session.aiCalls-callsBefore,inputTokens,outputTokens,durationMs:Date.now()-started});
            throw error;
          } finally { session.busy = false; session.controller = null; res.off('close', onClose); }
        }
        if(req.method==='POST'&&path==='/api/appointments/lookup'){
          getSession(req);rateLimit(req,'booking-lookup',6);const input=await body(req);
          const email=textField(input.email,'Correo',3,120).toLowerCase(),id=textField(input.id,'Código de reserva',8,50).trim();
          if(!isBookingCode(id)&&!uuidPattern.test(id))throw new HttpError(400,'Escriba las 8 letras de su código de reserva. También aceptamos códigos anteriores.');
          return json(res,200,await bookings.lookup({id,email}));
        }
        if (req.method === 'POST' && path === '/api/appointments') {
          rateLimit(req, 'reserve', 10);
          const { token, session } = getSession(req);
          const input = await body(req);
          if (input.consent !== true) throw new HttpError(400, 'Acepta el uso de tus datos para registrar el turno.');
          const customerName = textField(input.customerName, 'Nombre', 2, 80);
          const email = textField(input.email, 'Correo', 3, 120).toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Ingresa un correo válido.');
          if (!uuidPattern.test(input.requestId || '')) throw new HttpError(400, 'Identificador de solicitud inválido.');
          const serviceId = textField(input.serviceId, 'Servicio', 1, 60);
          const slot = textField(input.slot, 'Horario', 20, 30);
          if(input.instructorId!=null&&(typeof input.instructorId!=='string'||! /^[a-f0-9]{24}$/.test(input.instructorId)))throw new HttpError(400,'Seleccione un profesor válido.');
          if(config.center){if(input.expectedPriceCents!==null&&(!Number.isSafeInteger(input.expectedPriceCents)||input.expectedPriceCents<0))throw new HttpError(400,'Precio inválido.');const result=await bookings.reserve({language:session.language,requestId:input.requestId,customerName,email,serviceId,slot,priceCents:input.expectedPriceCents,sessionHash:hash(token),instructorId:input.instructorId||null});if(result.status==='reserved')result.mailStatus=await bookings.sendConfirmation(result.id);return json(res,result.status==='pending'?202:201,result);}
          if (!Number.isSafeInteger(input.expectedPriceCents) || input.expectedPriceCents < 0) throw new HttpError(400, 'Precio inválido.');
          const appointment = repository.reserve({ ...input, customerName, email, serviceId, slot, sessionHash: hash(token) });
          return json(res, 201, { id: appointment.id, serviceName: appointment.serviceName, slot: appointment.slot, priceCents: appointment.priceCents, currency: appointment.currency, status: appointment.status });
        }
        if (path.startsWith('/api/admin/')) {
          rateLimit(req, 'admin', 60); requireAdmin(req);
          if(req.method==='GET'&&['/api/admin/reports','/api/admin/reports/summary','/api/admin/reports/export'].includes(path)){
            const timezone=getCenter()?.timezone||'UTC',filters=reportFilters(url.searchParams,timezone);
            if(path.endsWith('/summary'))return json(res,200,{...repository.reportSummary(filters),from:filters.from,to:filters.to,timezone,services:repository.listServices(true).map(s=>({id:s.id,name:s.name})),mailReady:!!bookingMailer.ready,adminRecipients:adminAuth.emails});
            if(path.endsWith('/export')){rateLimit(req,'report-export',5);const report=repository.reportRows(filters,{exportAll:true});res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="nexo-'+filters.type+'-'+filters.from+'-'+filters.to+'.csv"'});res.end(reportCsv(report));return;}
            return json(res,200,{...repository.reportRows(filters),filters,timezone});
          }
          if(req.method==='POST'&&/^\/api\/admin\/notifications\/\d+\/retry$/.test(path)){
            rateLimit(req,'notification-retry',5);const input=await body(req);
            if(input.confirm!==true)throw new HttpError(400,'Confirme el reintento: un correo incierto podría haberse entregado.');
            repository.retryBookingNotification(Number(path.split('/')[4]),adminAuth.emails,adminAuth.actor(req));
            notifications.run().catch(()=>{});return json(res,200,{queued:true});
          }
          if(req.method==='POST'&&path==='/api/admin/backups'){
            rateLimit(req,'database-backup',2);const input=await body(req,4096);validateBackupPassword(input.password);
            if(backupBusy)throw new HttpError(409,'Ya se está preparando un respaldo. Espere a que termine.');
            backupBusy=true;let snapshot;
            try{snapshot=await repository.encryptedBackup(input.password);input.password='';
              if(res.destroyed)return;
              res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="nexo-base-'+new Date().toISOString().slice(0,10)+'.nexo"'});
              await streamPipeline(createReadStream(snapshot.path),res);
            }finally{input.password='';await snapshot?.cleanup();backupBusy=false;}return;
          }
          if(req.method==='GET'&&path==='/api/admin/agenda'){
            const timezone=getCenter()?.timezone||'UTC';
            return json(res,200,{...repository.agendaList(agendaFilters(url.searchParams,timezone)),instructors:repository.agendaInstructors(repository.bookingSettings().instructors||[]),timezone,booking:bookings.publicStatus(),calendar:calendar.status(),services:repository.listServices(true).map(s=>({id:s.id,name:s.name}))});
          }
          if(req.method==='POST'&&path==='/api/admin/transfers/preview'){rateLimit(req,'transfer-preview',10);return json(res,200,await transfers.preview(await body(req)));}
          if(req.method==='POST'&&path==='/api/admin/transfers'){rateLimit(req,'transfer-write',30);return json(res,200,await transfers.move(await body(req),adminAuth.actor(req)));}
          if(req.method==='POST'&&/^\/api\/admin\/transfers\/[0-9a-f-]{36}\/verify$/.test(path)){rateLimit(req,'transfer-verify',30);await body(req);return json(res,200,await transfers.reconcile(path.split('/')[4]));}
          if(req.method==='GET'&&/^\/api\/admin\/agenda\/[0-9a-f-]{36}$/.test(path))return json(res,200,repository.agendaDetail(path.split('/').at(-1)));
          if(req.method==='GET'&&path==='/api/admin/agenda-availability'){
            rateLimit(req,'admin-availability',10);
            const {instructorId}=agendaFilters(url.searchParams,getCenter()?.timezone||'UTC');
            const result=await bookings.availability(textField(url.searchParams.get('serviceId'),'Servicio',1,60));
            if(instructorId){
              const teacher=result.instructors?.find(i=>i.id===instructorId);
              if(!teacher)throw new HttpError(409,'Este profesor no ofrece horarios para el servicio en la configuración actual. Para consultar la agenda general, seleccione Todos los profesores.');
              result.schedule=result.schedule.map(s=>{const free=s.instructorIds.includes(instructorId);return {...s,available:free,remaining:free?1:0,capacity:1,instructorIds:free?[instructorId]:[],reason:free?null:s.reason||'occupied'};});
              result.slots=result.schedule.filter(s=>s.available).map(s=>s.slot);result.instructors=[teacher];
            }
            return json(res,200,result);
          }
          if(path==='/api/admin/audio-library'){
            if(req.method==='GET')return json(res,200,audioLibrary?await audioLibrary.status():{enabled:false,available:false});
            if(req.method==='DELETE'){await body(req);return json(res,200,audioLibrary?await audioLibrary.clear():{cleared:true});}
            throw new HttpError(405,'Método no permitido.');
          }
          if(path==='/api/admin/reviews'&&req.method==='GET'){
            const offset=Number(url.searchParams.get('offset')||0),status=url.searchParams.get('status')||'pending';
            if(!Number.isSafeInteger(offset)||offset<0||!['pending','closed','all'].includes(status))throw new HttpError(400,'Filtro inválido.');
            return json(res,200,{...repository.reviewQueue(offset,status),services:repository.listServices(true).map(s=>({id:s.id,name:s.name})),knowledgeRevision:repository.readKnowledge('school')?.revision||null,canPublish:!!getCenter()&&getCenter().businessType!=='general'&&runtime()?.assistant.knowledgeMode==='file'&&!!repository.readKnowledge('school')});
          }
          if(req.method==='PUT'&&/^\/api\/admin\/reviews\/\d+$/.test(path)){
            const input=await body(req);
            if(input.action==='publish'&&(!getCenter()||getCenter().businessType==='general'||runtime()?.assistant.knowledgeMode!=='file'))throw new HttpError(409,'La base de la escuela no está activa. Use las respuestas del negocio en Configuración.');
            const saved=repository.updateReview(Number(path.split('/').at(-1)),input);
            await faq?.refresh?.();return json(res,200,saved);
          }
          if(path==='/api/admin/calendar'||path.startsWith('/api/admin/calendar/')){
            if(path==='/api/admin/calendar/booking-settings'){
              if(req.method==='GET')return json(res,200,{rules:repository.bookingSettings(),services:repository.listServices(true),center:repository.getCenter()});
              if(req.method==='PUT')return json(res,200,{rules:await bookings.configure(await body(req))});
            }
            if(req.method==='POST'&&path.match(/^\/api\/admin\/calendar\/bookings\/[0-9a-f-]+\/verify$/))return json(res,200,await bookings.verify(path.split('/')[5]));
            if(req.method==='POST'&&path.match(/^\/api\/admin\/calendar\/bookings\/[0-9a-f-]+\/receipt$/)){
              rateLimit(req,'booking-mail',3);await body(req);const id=path.split('/')[5],current=await bookings.verify(id);
              if(current.status!=='reserved')throw new HttpError(409,'Verifique primero que la cita esté confirmada.');
              return json(res,200,{mailStatus:await bookings.sendConfirmation(id)});
            }
            if(req.method==='GET'&&path==='/api/admin/calendar')return json(res,200,calendar.status());
            if(req.method==='POST'&&path==='/api/admin/calendar/connect'){
              rateLimit(req,'calendar-connect',5);await body(req);
              if(authority.origin!==new URL(config.googleCalendar?.redirectUri||'http://localhost:3000').origin)throw new HttpError(409,'Abra Configuración desde el mismo origen registrado para Google Calendar.');
              const started=calendar.begin();res.setHeader('Set-Cookie','nexo_google_oauth='+started.binding+'; HttpOnly; SameSite=Lax; Path=/api/calendar/oauth/callback; Max-Age=300'+(authority.protocol==='https:'?'; Secure':''));return json(res,200,{url:started.url});
            }
            if(req.method==='GET'&&path==='/api/admin/calendar/calendars')return json(res,200,{items:await calendar.calendars()});
            if(req.method==='PUT'&&path==='/api/admin/calendar/selection'){const input=await body(req);return json(res,200,await calendar.select(input.calendarId));}
            if(req.method==='POST'&&['/api/admin/calendar/check','/api/admin/calendar/test','/api/admin/calendar/cleanup'].includes(path)){
              rateLimit(req,'calendar-test',5);const input=await body(req);const result=path.endsWith('/check')?await calendar.check(input.calendarId):path.endsWith('/test')?await calendar.test(input.calendarId):await calendar.cleanup();return json(res,200,result);
            }
            if(req.method==='DELETE'&&path==='/api/admin/calendar')return json(res,200,await calendar.disconnect());
            throw new HttpError(405,'Operación de calendario no disponible.');
          }
          if(req.method==='GET' && path.startsWith('/api/admin/conversations')){
            const offset=Number(url.searchParams.get('offset')||0);
            if(!Number.isSafeInteger(offset)||offset<0||offset>10000000)throw new HttpError(400,'Página inválida.');
            if(path==='/api/admin/conversations')return json(res,200,{items:repository.listConversations(offset),metrics:repository.conversationMetrics(),retentionDays:config.conversationRetentionDays||0});
            const match=path.match(/^\/api\/admin\/conversations\/([a-f0-9-]{36})(\/export)?$/);
            if(!match||!uuidPattern.test(match[1]))throw new HttpError(404,'Conversación no encontrada.');
            const conversation=repository.conversation(match[1]);if(!conversation)throw new HttpError(404,'Conversación no encontrada.');
            if(match[2]){
              res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Content-Disposition':'attachment; filename="nexo-conversacion-'+conversation.id+'.txt"'});
              pipeline(Readable.from(repository.exportConversation(conversation.id)),res,()=>{});return;
            }
            return json(res,200,{conversation,turns:repository.conversationTurns(conversation.id,offset)});
          }
          if (req.method === 'GET' && path === '/api/admin/overview' && knowledge()?.refresh) await knowledge().refresh();
          if (req.method === 'GET' && path === '/api/admin/overview') return json(res, 200, { knowledge:knowledge()?.status?.()||null, catalogReadOnly: false, aiProtection: config.center ? {limits:aiLimits,usage:repository.aiUsage(schoolDay(new Date(),getCenter()?.timezone))} : null, centerSettings: repository.getCenterSettings?.() || null, services: repository.listServices(true), appointments: [...repository.calendarBookings().map(r=>({...bookings.result(r),customerName:r.customerName,email:r.email,provider:'google-calendar',timezone:r.timezone})),...repository.listAppointments()] });
          if(['/api/admin/knowledge/parse','/api/admin/knowledge/preview'].includes(path)){
            if(req.method!=='POST')throw new HttpError(405,'Método no permitido.');
            if(!getCenter()||getCenter().businessType==='general')throw new HttpError(409,'Esta base corresponde a la escuela.');
            const input=await body(req,8*1024*1024);rateLimit(req,'knowledge-preview',60);
            try{
              if(path.endsWith('/parse')){
                const source=typeof input.source==='string'?input.source:serializeFaq(input.entries);
                return json(res,200,{source,entries:parseFaq(source)});
              }
              return json(res,200,previewFaq(input.entry,repository.listServices(true),getCenter()));
            }catch(error){throw new HttpError(400,error.message);}
          }
          if(path==='/api/admin/knowledge'){
            if(!getCenter()||getCenter().businessType==='general')throw new HttpError(409,'Esta base corresponde a la escuela. Use las respuestas propias del negocio en Configuración.');
            if(req.method==='GET'){
              const stored=repository.readKnowledge('school');if(!stored)throw new HttpError(404,'La base de respuestas no está disponible.');return json(res,200,{...stored,entries:parseFaq(stored.source),services:repository.listServices(true),activeMode:runtime()?.assistant.knowledgeMode||'file'});
            }
            if(req.method==='PUT'){
              const input=await body(req,8*1024*1024);
              if((typeof input.source!=='string'&&!Array.isArray(input.entries))||!Number.isSafeInteger(input.revision))throw new HttpError(400,'Base de respuestas inválida.');
              let entries;try{if(Array.isArray(input.entries))input.source=serializeFaq(input.entries);entries=parseFaq(input.source);}catch(error){throw new HttpError(400,error.message);}
              const saved=repository.saveKnowledge('school',input.revision,input.source);
              if(!saved)throw new HttpError(409,'Otra ventana modificó las respuestas. Actualice antes de guardar.');
              await faq?.refresh?.();return json(res,200,{...saved,entries:entries.filter(e=>e.active).length});
            }
            throw new HttpError(405,'Método no permitido.');
          }
          if(path==='/api/admin/configuration'){
            if(!config.center)throw new HttpError(409,'Active CENTER_PROFILE=general o metodomogollon para usar la configuración comercial.');
            if(req.method==='GET')return json(res,200,{...repository.getCenterSettings(),integrations:{access:{...adminAuth.status(),administratorEmail:config.installation?.email||''},ai:{provider:config.provider,keyConfigured:!!config.apiKey},video:{provider:'liveavatar',keyConfigured:!!config.liveAvatar?.apiKey,paidEnabled:!!config.liveAvatar?.allowPaid,mode:config.liveAvatar?.mode||'LITE'},voice:{provider:'Piper + reconocimiento del navegador',available:localTts.status().available},calendar:calendar.status(),payments:{connected:false}}});
            if(req.method==='PUT'){
              const input=await body(req,65536);
              const saved=repository.saveConfiguration(input.revision,{profile:input.profile,configuration:input.configuration});
              const active=[...sessions.entries()];for(const [,session] of active)repository.endConversation(session.logId,'settings_changed');sessions.clear();
              for(const [,session] of active)session.controller?.abort();
              await Promise.allSettled(active.map(async([token])=>{localTts.stop(token);await liveAvatar.stop(token);}));
              return json(res,200,saved);
            }
            throw new HttpError(405,'Método no permitido.');
          }
          if (config.center && req.method === 'PUT' && path === '/api/admin/center') {
            const input = await body(req);
            return json(res, 200, repository.saveProfile(input.revision, input.profile));
          }
          if (config.center && req.method === 'POST' && path === '/api/admin/services') {
            const input = await body(req);
            return json(res, 201, repository.saveService(input.revision, null, input.service));
          }
          if (config.center && req.method === 'PUT' && path.match(/^\/api\/admin\/services\/[^/]+$/)) {
            const input = await body(req);
            return json(res, 200, repository.saveService(input.revision, path.split('/').at(-1), input.service));
          }
          if (req.method === 'PATCH' && path.match(/^\/api\/admin\/services\/[^/]+$/)) {
            const input = await body(req);
            if (typeof input.active !== 'boolean') throw new HttpError(400, 'active debe ser booleano.');
            repository.setServiceActive(path.split('/').at(-1), input.active);
            return json(res, 200, { updated: true });
          }
          if (req.method === 'PATCH' && path.match(/^\/api\/admin\/appointments\/[0-9a-f-]+$/)) {
            const input = await body(req);
            if (input.status !== 'cancelled') throw new HttpError(400, 'Solo se permite cancelar.');
            const reason=cancellationReason(input),actor=adminAuth.actor(req);
            const id=path.split('/').at(-1);if(repository.calendarBooking(id))await bookings.cancel(id,{reason,actor});else {
              const row=repository.agendaDetail(id);if(row.status!=='cancelled'){
                const attempt=repository.beginCancellation(id,reason,actor);
                try{repository.cancel(id);repository.finishCancellation(attempt,'confirmed');}catch(error){repository.finishCancellation(attempt,'uncertain');throw error;}
              }
            }
            return json(res, 200, { updated: true });
          }
        }
        throw new HttpError(404, 'Ruta no encontrada.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'Método no permitido.');
      const filePath = resolve(webRoot, '.' + (path === '/pilot' ? '/pilot.html' : path === '/' ? '/index.html' : path === '/admin' ? '/admin.html' : ['/docs', '/docs/'].includes(path) ? '/docs.html' : path === '/settings' ? '/settings.html' : path === '/knowledge' ? '/knowledge.html' : path === '/reviews' ? '/reviews.html' : path === '/conversations' ? '/conversations.html' : path));
      if (!filePath.startsWith(resolve(webRoot) + sep) || !mime[extname(filePath)]) throw new HttpError(404, 'Archivo no encontrado.');
      let contents;
      try { const physicalPath=await realpath(filePath);const physicalRoot=await realpath(webRoot);if(!physicalPath.startsWith(physicalRoot+sep))throw new Error();contents = await readFile(physicalPath); } catch { throw new HttpError(404, 'Archivo no encontrado.'); }
      res.writeHead(200, { 'Content-Type': mime[extname(filePath)] }); res.end(req.method === 'HEAD' ? undefined : contents);
    } catch (error) {
      if (res.destroyed || res.headersSent) return;
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error('Error interno:', error.name); // Never log prompts, credentials or personal data.
      json(res, status, { error: status === 500 ? 'Ocurrió un error. Intenta nuevamente.' : error.message });
    }
  });
  server.closeAdminAuth=async()=>{await notifications.close();bookingMailer.close?.();await adminAuth.close();};
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.maxRequestsPerSocket=200;
  server.keepAliveTimeout=5000;
  server.on('close', () => { clearInterval(notificationTimer);notifications.close().then(()=>bookingMailer.close?.()).catch(()=>{});calendar.close();adminAuth.close().catch(()=>{});clearInterval(cleanup); for (const session of sessions.values()){ session.controller?.abort(); repository.endConversation(session.logId,'server_shutdown'); } sessions.clear(); localTts.close(); liveAvatar.close().catch(() => {}); });
  return server;
}
