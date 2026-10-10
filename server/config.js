/**
 * NEXO · GUÍA DEL MÓDULO: server/config.js
 * Convertir variables del entorno en configuración tipada y validada.
 * Entrada: env (por defecto process.env) y installationPath opcional para pruebas.
 * Salida: Objeto config; lanza Error si hay proveedor, puerto, límites o dirección de retorno
 * inválidos.
 * Estado importante: aiLimits limita consultas; audioCache convierte MB a bytes y días a TTL;
 * publicOrigin define el origen HTTPS permitido.
 * Efectos y límites: Lee configuración de instalación; no inicia red. apiKey, adminToken y
 * clientSecret son privados: nunca devolver config completo al navegador.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {validPilotHash,configuredPilotHash} from './pilot-access.js';
import {readInstallation} from './installation.js';
import { defaultAiLimits } from './school-filter.js';
import { schoolCenter } from './center.js';
import { resolve } from 'node:path';

export function readConfig(env = process.env, {installationPath}={}) {
  const deploymentMode=env.DEPLOYMENT_MODE||'local';
  if(!['local','pilot'].includes(deploymentMode))throw new Error('DEPLOYMENT_MODE inválido.');
  const pilot=deploymentMode==='pilot';
  // Ausente conserva el comportamiento anterior. Un error de escritura nunca abre el acceso.
  if(env.PILOT_PRIVATE_ENABLED!==undefined&&!['true','false'].includes(env.PILOT_PRIVATE_ENABLED))throw new Error('PILOT_PRIVATE_ENABLED debe ser true o false.');
  const pilotPrivateEnabled=env.PILOT_PRIVATE_ENABLED===undefined?pilot:env.PILOT_PRIVATE_ENABLED==='true';
  const installation=readInstallation(env,installationPath||env.INSTALLATION_PATH);
  if (env.CENTER_PROFILE && !['metodomogollon','general'].includes(env.CENTER_PROFILE)) throw new Error('CENTER_PROFILE inválido.');
  const provider = env.AI_PROVIDER || 'demo';
  if (!['demo', 'openai'].includes(provider)) throw new Error('AI_PROVIDER debe ser demo u openai.');
  if (provider === 'openai' && (!env.OPENAI_API_KEY || !env.OPENAI_MODEL)) {
    throw new Error('Para IA real configura OPENAI_API_KEY y OPENAI_MODEL en .env.');
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválido.');
  const avatarProvider = env.AVATAR_PROVIDER || 'liveavatar';
  if (!['liveavatar', 'local3d', 'portrait'].includes(avatarProvider)) throw new Error('AVATAR_PROVIDER inválido.');
  const avatarMode = env.LIVEAVATAR_MODE || 'LITE';
  if (!['LITE', 'FULL'].includes(avatarMode)) throw new Error('LIVEAVATAR_MODE debe ser LITE o FULL.');
  const durationSeconds = Number(env.LIVEAVATAR_MAX_SECONDS || 60);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 30 || durationSeconds > 60) throw new Error('LIVEAVATAR_MAX_SECONDS debe estar entre 30 y 60.');
  const publicOrigin = env.PUBLIC_ORIGIN || '';
  if (publicOrigin) {
    let parsed; try { parsed = new URL(publicOrigin); } catch { throw new Error('PUBLIC_ORIGIN inválido.'); }
    if (parsed.protocol !== 'https:' || parsed.origin !== publicOrigin) throw new Error('PUBLIC_ORIGIN debe ser un origen HTTPS sin ruta.');
  }
  const aiLimits = {...defaultAiLimits};
  for (const [key, variable, max] of [['sessionCalls','AI_SESSION_MAX_CALLS',30],['dailyCalls','AI_DAILY_MAX_CALLS',10000]]) {
    if (env[variable] !== undefined) {
      const value=Number(env[variable]);
      if(!Number.isInteger(value)||value<1||value>max)throw new Error(variable+' inválido.');
      aiLimits[key]=value;
    }
  }
  const conversationRetentionDays=Number(env.CONVERSATION_RETENTION_DAYS??(pilot?7:0));
  if(!Number.isInteger(conversationRetentionDays)||conversationRetentionDays<0||conversationRetentionDays>3650)throw new Error("CONVERSATION_RETENTION_DAYS debe ser de 0 a 3650.");
  if(env.AUDIO_CACHE_ENABLED!==undefined&&!['true','false'].includes(env.AUDIO_CACHE_ENABLED))throw new Error('AUDIO_CACHE_ENABLED debe ser true o false.');
  const audioCacheMb=Number(env.AUDIO_CACHE_MAX_MB||128),audioCacheDays=Number(env.AUDIO_CACHE_TTL_DAYS||30);
  if(!Number.isInteger(audioCacheMb)||audioCacheMb<8||audioCacheMb>1024)throw new Error('AUDIO_CACHE_MAX_MB debe ser de 8 a 1024.');
  if(!Number.isInteger(audioCacheDays)||audioCacheDays<1||audioCacheDays>365)throw new Error('AUDIO_CACHE_TTL_DAYS debe ser de 1 a 365.');
  const audioCache={enabled:env.AUDIO_CACHE_ENABLED!=='false',maxBytes:audioCacheMb*1024*1024,ttlDays:audioCacheDays};
  const calendarOrigin=publicOrigin||'http://localhost:'+port;
  const redirectUri=env.GOOGLE_REDIRECT_URI||calendarOrigin+'/api/calendar/oauth/callback';
  if(redirectUri!==calendarOrigin+'/api/calendar/oauth/callback')throw new Error('GOOGLE_REDIRECT_URI debe coincidir con el origen de Nexo y /api/calendar/oauth/callback.');
  const googleCalendar={clientId:env.GOOGLE_CLIENT_ID||'',clientSecret:env.GOOGLE_CLIENT_SECRET||'',redirectUri,keyPath:resolve(env.GOOGLE_TOKEN_KEY_PATH||'.local/google-calendar.key')};
  // La clave directa no vacía prevalece sobre el hash anterior, para facilitar su cambio.
  // Solo el verificador sale de readConfig; nunca enviar config completo al navegador.
  const pilotPasswordHash=env.PILOT_PASSWORD?configuredPilotHash(env.PILOT_PASSWORD):env.PILOT_PASSWORD_HASH||'';
  if(pilotPrivateEnabled){
    if(!publicOrigin)throw new Error('El acceso privado requiere PUBLIC_ORIGIN HTTPS para su cookie segura.');
    if(!validPilotHash(pilotPasswordHash))throw new Error('Configure PILOT_PASSWORD (16–256 caracteres) o PILOT_PASSWORD_HASH con el generador del piloto.');
  }
  const videoDailyLimit=Number(env.LIVEAVATAR_DAILY_MAX_SESSIONS??(pilot?5:100));
  const maxActiveSessions=Number(env.MAX_ACTIVE_SESSIONS||50);
  if(!Number.isInteger(videoDailyLimit)||videoDailyLimit<0||videoDailyLimit>100)throw new Error('LIVEAVATAR_DAILY_MAX_SESSIONS debe ser de 0 a 100.');
  if(!Number.isInteger(maxActiveSessions)||maxActiveSessions<1||maxActiveSessions>500)throw new Error('MAX_ACTIVE_SESSIONS debe ser de 1 a 500.');
  if(pilot){
    if(avatarMode!=='LITE')throw new Error('El piloto usa LIVEAVATAR_MODE=LITE para mantener la conversación bajo los límites de Nexo.');
    if(!publicOrigin||['localhost','127.0.0.1','[::1]'].includes(new URL(publicOrigin).hostname))throw new Error('El piloto requiere PUBLIC_ORIGIN HTTPS público.');
    if(!env.CENTER_PROFILE)throw new Error('El piloto requiere CENTER_PROFILE.');
    if(installation.mode!=='email'||!installation.email||!installation.mail.password)throw new Error('El piloto requiere administración por correo y SMTP configurado.');
    if(env.ADMIN_TOKEN)throw new Error('Quite ADMIN_TOKEN en el piloto; utilice acceso por correo.');
    if(conversationRetentionDays<1||conversationRetentionDays>30)throw new Error('El piloto requiere retención de conversaciones entre 1 y 30 días.');
  }
  if(env.PIPER_EXECUTABLE&&!env.PIPER_ENGINE_VERSION)throw new Error('PIPER_ENGINE_VERSION es obligatorio con un ejecutable personalizado.');
  const voiceProfile=env.PIPER_VOICE_PROFILE||'male';
  if(!['male','female'].includes(voiceProfile))throw new Error('PIPER_VOICE_PROFILE debe ser male o female.');
  const localTts={...(env.PIPER_EXECUTABLE?{executable:resolve(env.PIPER_EXECUTABLE)}:{}),...(env.PIPER_VOICES_DIR?{voicesDirectory:resolve(env.PIPER_VOICES_DIR)}:{}),engineVersion:env.PIPER_ENGINE_VERSION||'bundled',voiceProfile};
  return {
    deploymentMode,pilotPrivateEnabled,pilotPasswordHash,videoDailyLimit,maxActiveSessions,localTts,
    googleCalendar,audioCache,
    conversationRetentionDays,
    port, provider, avatarProvider, publicOrigin, aiLimits,
    installation,
    center: env.CENTER_PROFILE === 'metodomogollon' ? schoolCenter : env.CENTER_PROFILE === 'general' ? {...schoolCenter,id:'business',name:'Mi negocio',businessType:'general',booking:{provider:'manual',enabled:false,message:'Para coordinar su atención, consulte con el personal.'}} : null,
    apiKey: env.OPENAI_API_KEY || '', model: env.OPENAI_MODEL || '',
    liveAvatar: { apiKey: env.LIVEAVATAR_API_KEY || '', avatarId: env.LIVEAVATAR_AVATAR_ID || '', voiceId: env.LIVEAVATAR_VOICE_ID || '', mode: avatarMode, durationSeconds, allowPaid: env.LIVEAVATAR_ALLOW_PAID === 'true' },
    adminToken: (env.ADMIN_TOKEN || '').length >= 24 ? env.ADMIN_TOKEN : '',
    dbPath: resolve(env.DB_PATH || './data/kiosk.sqlite'),
    sessionTtlMs: 5 * 60_000, retentionDays: 7,
  };
}
