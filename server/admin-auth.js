/**
 * NEXO · GUÍA DEL MÓDULO: server/admin-auth.js
 * Implementar el acceso administrativo mediante código enviado por correo.
 * Entrada: repository, installation, mailer, reloj inyectable; correo/código y dirección IP del
 * solicitante.
 * Salida: Estado público de acceso, challenge o token de sesión; HttpError al fallar.
 * Estado importante: pending sigue envíos en curso; idleMs y absoluteMs limitan sesión; salt y
 * codeHash verifican sin guardar el código en claro.
 * Efectos y límites: Envía correo y modifica registros de autenticación. La respuesta de solicitud
 * no revela si el correo coincide; la cookie es HttpOnly.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {randomBytes,randomInt,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {HttpError} from './errors.js';
import {normalizeEmail} from './installation.js';
const derive=promisify(scrypt),hash=text=>createHash('sha256').update(text).digest('hex');
const idleMs=5*60000,absoluteMs=8*3600000;
export class AdminAuth{
 constructor({repository,installation={},mailer,now=Date.now}){
  this.repository=repository;this.installation=installation;this.mailer=mailer;this.now=now;this.pending=new Set();
  this.emails=installation.emails|| (installation.email?[installation.email]:[]);this.email=this.emails[0]||'';this.ready=!!(this.email&&mailer?.ready);this.mode=installation.mode==='email'||(installation.mode!=='token'&&this.ready)?'email':'token';
  repository.synchronizeAdministrators(this.emails,this.now());repository.purgeAdministratorData(this.now());
 }
 status(){return {mode:this.mode,emailConfigured:!!this.email,mailConfigured:!!this.mailer?.ready,ready:this.ready,codeMinutes:10,resendSeconds:60};}
 /**
  * requestCode: Aplica límites por IP y por correo; deriva hash con salt y envía en segundo plano
  * si coincide el administrador.
  * Entrada (firma real): email, ip.
  * Salida: Promise<{challenge,message,resendSeconds}> indistinguible para correos no autorizados.
  */
 async requestCode(email,ip){
  if(this.mode!=='email'||!this.ready)throw new HttpError(503,'El envío por correo todavía no está configurado.');
  const now=this.now(),r=this.repository;
  if(!r.takeAuthLimit('request:'+hash(ip),10,15*60000,now))throw new HttpError(429,'Espere unos minutos antes de solicitar otro código.');
  const id=randomBytes(32).toString('hex'),salt=randomBytes(16).toString('hex'),code=String(randomInt(100000000)).padStart(8,'0');
  const codeHash=(await derive(code,salt,64)).toString('hex');
  const recipient=normalizeEmail(email),recipientHash=hash(recipient);
  const allowed=this.emails.map(address=>timingSafeEqual(Buffer.from(recipientHash),Buffer.from(hash(address)))).some(Boolean);
  if(allowed&&r.takeAuthLimit('mail:cooldown:'+recipientHash,1,60000,now)&&r.takeAuthLimit('mail:hour:'+recipientHash,5,3600000,now)&&r.takeAuthLimit('mail:day',20,86400000,now)){
    r.createAdminChallenge({id,email:recipient,codeHash,salt,now,expiresAt:now+10*60000});
    // The response does not reveal whether an address matches. Codes live only in memory until sent.
    const task=Promise.resolve().then(()=>this.mailer.sendCode({to:recipient,code})).then(()=>r.adminCodeDelivery(id,true),()=>r.adminCodeDelivery(id,false));
    this.pending.add(task);task.then(()=>this.pending.delete(task),()=>this.pending.delete(task));
  }
  return {challenge:id,message:'Si el correo corresponde al administrador y puede solicitar un nuevo envío, recibirá un código. Revise también la carpeta de spam.',resendSeconds:60};
 }
 /**
  * verify: Consume un intento, compara hash en tiempo constante y canjea un código válido de un
  * solo uso.
  * Entrada (firma real): id, code, ip.
  * Salida: Promise<string> con token nuevo; el HTTP lo coloca en cookie protegida.
  */
 async verify(id,code,ip){
  if(this.mode!=='email')throw new HttpError(401,'Código inválido o vencido. Solicite uno nuevo.');
  if(!this.repository.takeAuthLimit('verify:'+hash(ip),30,15*60000,this.now()))throw new HttpError(429,'Demasiados intentos. Espere antes de volver a intentar.');
  const record=typeof id==='string'&&/^[a-f0-9]{64}$/.test(id)?this.repository.claimAdminAttempt(id,this.now()):null;
  if(!record)throw new HttpError(401,'Código inválido o vencido. Solicite uno nuevo.');
  const candidate=typeof code==='string'?code.trim():'';
  const derived=await derive(candidate.slice(0,32),record.salt,64);
  if(!/^\d{8}$/.test(candidate)||!timingSafeEqual(derived,Buffer.from(record.codeHash,'hex'))){this.repository.failAdminAttempt(id);throw new HttpError(401,'Código inválido o vencido. Solicite uno nuevo.');}
  const token=randomBytes(32).toString('hex');
  if(!this.repository.consumeAdminChallenge({id,tokenHash:hash(token),now:this.now(),idleMs,absoluteMs}))throw new HttpError(401,'Código inválido o vencido. Solicite uno nuevo.');
  return token;
 }
 token(req){const matches=(req.headers.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith('nexo_admin='));const value=matches.length===1?matches[0].slice(11):'';return /^[a-f0-9]{64}$/.test(value)?value:null;}
 /**
  * authenticated: Extrae una única cookie válida y verifica su hash/vencimiento en SQLite.
  * Entrada (firma real): req.
  * Salida: Booleano; si procede prolonga únicamente el vencimiento por inactividad.
  */
 authenticated(req){const token=this.token(req);return this.mode==='email'&&!!token&&this.repository.authenticateAdministrator(hash(token),this.now(),idleMs);}
 // Solo después de requireAdmin: nunca tomar el actor del formulario enviado por el cliente.
 actor(req){const token=this.token(req);return token?this.repository.administratorIdentity(hash(token),this.now())||'Administración':'Acceso local por clave';}
 /**
  * cookie: Construye la cabecera de sesión; con token vacío indica borrado.
  * Entrada (firma real): token, secure=false.
  * Salida: String Set-Cookie con HttpOnly, SameSite y Secure cuando corresponde.
  */
 cookie(token,secure=false){return 'nexo_admin='+token+'; HttpOnly; SameSite=Strict; Path=/api; Max-Age='+(token?absoluteMs/1000:0)+(secure?'; Secure':'');}
 logout(req){const token=this.token(req);if(token)this.repository.revokeAdminSession(hash(token));}
 async close(){this.mailer?.close?.();await Promise.allSettled([...this.pending]);}
}
