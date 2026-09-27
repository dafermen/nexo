/**
 * NEXO · GUÍA DEL MÓDULO: server/providers/google-calendar.js
 * Encapsular OAuth, cifrado de credenciales y operaciones de Calendar.
 * Entrada: repository, config, fetchImpl/reloj/clave inyectables; IDs de calendarios y eventos.
 * Salida: Estado seguro, URL de autorización, calendarios, eventos y comprobaciones.
 * Estado importante: states guarda intentos OAuth; binding une navegador e intento; refreshing
 * comparte renovación; busy excluye operaciones concurrentes.
 * Efectos y límites: Red Google y clave AES local. Tokens cifrados en SQLite; nunca enviarlos al
 * navegador. Pruebas de escritura solo eliminan eventos con marcador propio.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';
import {HttpError} from '../errors.js';

export const calendarScopes=['https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events'];
const base='https://www.googleapis.com/calendar/v3',digest=value=>createHash('sha256').update(value).digest('hex');
const safeCalendar=c=>({id:c.id,name:c.summaryOverride||c.summary||c.id,timeZone:c.timeZone||'UTC',accessRole:c.accessRole,primary:!!c.primary,writable:['owner','writer'].includes(c.accessRole)});

export class GoogleCalendarService{
 constructor({repository,config={},fetchImpl=fetch,now=Date.now,key=null}){this.repo=repository;this.config=config;this.fetch=fetchImpl;this.now=now;this.key=key;this.states=new Map();this.busy=false;this.refreshing=null;}
 get configured(){return !!(this.config.clientId&&this.config.clientSecret&&this.config.redirectUri&&this.config.keyPath);}
 keyBytes(){
  if(this.key)return this.key;
  try{if(!existsSync(this.config.keyPath)){
   if(this.repo.readCalendarConnection().tokens)throw Error('Missing existing key');
   mkdirSync(dirname(this.config.keyPath),{recursive:true});writeFileSync(this.config.keyPath,randomBytes(32),{flag:'wx',mode:0o600});
  }const key=readFileSync(this.config.keyPath);if(key.length!==32)throw Error('Invalid key');return this.key=key;
  }catch{throw new HttpError(503,'No se puede abrir la clave local de Calendar. Restaure su respaldo o contacte al administrador.');}
 }
 /**
  * seal: Cifra un objeto JSON con AES-256-GCM y vector aleatorio.
  * Entrada (firma real): value.
  * Salida: Texto cifrado con IV y etiqueta; necesita la misma clave local para leerlo.
  */
 seal(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.keyBytes(),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(v=>v.toString('base64')).join('.');}
 /**
  * unseal: Verifica y descifra el estado OAuth guardado.
  * Entrada (firma real): value.
  * Salida: Objeto privado o HttpError si cambió/se perdió la clave.
  */
 unseal(value){try{const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64'));const cipher=createDecipheriv('aes-256-gcm',this.keyBytes(),iv);cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8'));}catch{throw new HttpError(503,'No se puede leer la conexión guardada. Revise la clave local de Calendar.');}}
 status(){const r=this.repo.readCalendarConnection();let connected=false,needsReconnect=false;
  if(r.tokens&&this.configured){try{const t=this.unseal(r.tokens);connected=t.client===digest(this.config.clientId)&&!!t.refresh_token&&!t.needsAuthorization;needsReconnect=!connected;}catch{needsReconnect=true;}}
  return {configured:this.configured,connected,needsReconnect,selected:r.selected,lastCheck:r.lastCheck,pendingTests:this.repo.pendingCalendarTests().map(t=>({id:t.id,calendarId:t.calendarId,createdAt:t.createdAt})),redirectUri:this.config.redirectUri||'',busy:this.busy};
 }
 requireConfigured(){if(!this.configured)throw new HttpError(503,'Configure GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor y reinicie Nexo. Consulte la guía de Google Calendar.');}
 /**
  * exclusive: Impide operaciones de agenda concurrentes durante este trabajo; finally siempre
  * libera busy.
  * Entrada (firma real): work.
  * Salida: Promise con resultado de work; HttpError 409 si ya hay otra operación.
  */
 async exclusive(work){if(this.busy)throw new HttpError(409,'Hay otra operación de Calendar en curso. Espere a que termine.');this.busy=true;try{return await work();}finally{this.busy=false;}}
 /**
  * begin: Genera state, binding y PKCE con caducidad para autorizar en Google.
  * Entrada (firma real): (sin parámetros).
  * Salida: {url,binding}; el binding se entrega como cookie protegida desde app.js.
  */
 begin(){this.requireConfigured();if(this.busy)throw new HttpError(409,'Espere a que termine la prueba de Calendar.');
  // Reauthorization must remain possible if a token expired during cleanup.
  for(const [k,v]of this.states)if(v.expires<this.now())this.states.delete(k);
  if(this.states.size>=10)throw new HttpError(429,'Hay demasiados intentos de conexión. Espere cinco minutos.');
  const state=randomBytes(32).toString('hex'),binding=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url');
  this.states.set(state,{binding:digest(binding),verifier,expires:this.now()+300000});
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:this.config.clientId,redirect_uri:this.config.redirectUri,response_type:'code',scope:calendarScopes.join(' '),access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
  return {url:url.href,binding};
 }
 async tokenRequest(params){let response;try{response=await this.fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:this.config.clientId,client_secret:this.config.clientSecret}),signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new HttpError(502,'No se pudo comunicar con Google. Revise la conexión e intente de nuevo.');}
  let data;try{data=await response.json();}catch{throw new HttpError(502,'Google devolvió una respuesta no válida.');}
  if(!response.ok){if(data.error==='invalid_grant')throw new HttpError(409,'La autorización de Google venció o fue retirada. Vuelva a conectar su cuenta.');throw new HttpError(502,'Google rechazó la autorización. Revise el cliente OAuth y la dirección de retorno.');}
  if(typeof data.access_token!=='string'||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw new HttpError(502,'Google no devolvió una autorización válida.');return data;
 }
 /**
  * complete: Verifica estado y navegador antes de canjear código; exige permisos y refresh_token.
  * Entrada (firma real): {state,code,error}, binding.
  * Salida: Promise del estado conectado; guarda tokens cifrados y reinicia selección.
  */
 async complete({state,code,error},binding){
  const pending=this.states.get(state);if(!pending||pending.expires<this.now()||!binding||pending.binding!==digest(binding))throw new HttpError(400,'El intento de conexión venció o pertenece a otro navegador. Vuelva a empezar.');this.states.delete(state);
  if(error)throw new HttpError(400,'No se autorizó la conexión con Google Calendar.');
  if(typeof code!=='string'||!code||code.length>4096)throw new HttpError(400,'Falta el código de autorización.');
  return this.exclusive(async()=>{const t=await this.tokenRequest({grant_type:'authorization_code',code,redirect_uri:this.config.redirectUri,code_verifier:pending.verifier});
   if(!t.refresh_token||!calendarScopes.every(s=>(t.scope||'').split(' ').includes(s)))throw new HttpError(403,'Debe conceder los permisos de lista y eventos de Calendar. Vuelva a conectar y autorice ambos.');
   this.repo.saveCalendarTokens(this.seal({refresh_token:t.refresh_token,access_token:t.access_token,expiresAt:this.now()+t.expires_in*1000,scope:t.scope,client:digest(this.config.clientId)}));this.repo.selectCalendar(null);this.states.clear();return this.status();
  });
 }
 /**
  * accessToken: Usa token vigente o comparte una única renovación entre peticiones simultáneas.
  * Entrada (firma real): force=false.
  * Salida: Promise del access_token privado; nunca enviarlo al visitante.
  */
 async accessToken(force=false){this.requireConfigured();const raw=this.repo.readCalendarConnection().tokens;if(!raw)throw new HttpError(409,'Conecte primero Google Calendar.');const t=this.unseal(raw);if(t.client!==digest(this.config.clientId))throw new HttpError(409,'El cliente de Google cambió. Vuelva a conectar su cuenta.');
  if(t.needsAuthorization)throw new HttpError(409,'La autorización venció. Vuelva a conectar Google Calendar.');
  if(!force&&t.access_token&&t.expiresAt>this.now()+60000)return t.access_token;
  if(!this.refreshing)this.refreshing=(async()=>{let n;try{n=await this.tokenRequest({grant_type:'refresh_token',refresh_token:t.refresh_token});}catch(e){if(e.status===409&&this.repo.readCalendarConnection().tokens===raw)this.repo.saveCalendarTokens(this.seal({...t,needsAuthorization:true}));throw e;}const latest=this.repo.readCalendarConnection().tokens;if(latest!==raw)throw new HttpError(409,'La conexión cambió durante la consulta. Reintente.');this.repo.saveCalendarTokens(this.seal({...t,refresh_token:n.refresh_token||t.refresh_token,access_token:n.access_token,expiresAt:this.now()+n.expires_in*1000}));return n.access_token;})().finally(()=>this.refreshing=null);
  return this.refreshing;
 }
 /**
  * request: Hace una petición autenticada con timeout y una renovación ante 401; no reintenta
  * escrituras inciertas indiscriminadamente.
  * Entrada (firma real): path, {method='GET',body,allowMissing=false}={}.
  * Salida: Promise de JSON, null para 204/ausencia permitida o HttpError.
  */
 async request(path,{method='GET',body,allowMissing=false,ifMatch}={}){
  if(ifMatch!==undefined&&(typeof ifMatch!=='string'||!ifMatch||ifMatch.length>2048||/[\r\n]/.test(ifMatch)))throw new HttpError(409,'No se pudo verificar la versión del evento.');
  for(let attempt=0;attempt<2;attempt++){const token=await this.accessToken(attempt===1);let r;try{r=await this.fetch(base+path,{method,headers:{Authorization:'Bearer '+token,...(ifMatch?{'If-Match':ifMatch}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new HttpError(502,'No se pudo confirmar la operación con Google. Revise el estado antes de repetirla.');}
   if(r.status===401&&attempt===0)continue;if(allowMissing&&[404,410].includes(r.status))return null;
   if(r.status===412){const e=new HttpError(409,'El evento cambió en Google durante la operación. Verifique la cita antes de reintentar.');e.googleStatus=412;throw e;}
   if(!r.ok){const message=r.status===403?'Google no permite esta operación. Compruebe permisos y que Calendar API esté habilitada.':r.status===404?'Google no encuentra ese calendario o evento. Actualice la lista.':r.status===429?'Google limitó temporalmente las consultas. Espere y reintente.':'No se pudo completar la operación con Google Calendar.';const e=new HttpError(r.status===403?403:502,message);e.googleStatus=r.status;throw e;}
   if(r.status===204)return null;try{return await r.json();}catch{throw new HttpError(502,'Google devolvió una respuesta no válida.');}
  }throw new HttpError(409,'Vuelva a conectar Google Calendar.');
 }
 async calendars(){const calendars=[];let page='';const seen=new Set();do{if(seen.has(page)||seen.size>=100)throw new HttpError(502,'La lista de calendarios está incompleta. Reintente.');seen.add(page);
  const query=new URLSearchParams({maxResults:'250',showHidden:'true',fields:'items(id,summary,summaryOverride,timeZone,accessRole,primary),nextPageToken',...(page?{pageToken:page}:{})});const data=await this.request('/users/me/calendarList?'+query);for(const c of data.items||[])if(c.id)calendars.push(safeCalendar(c));page=data.nextPageToken||'';
 }while(page);return calendars;}
 async calendar(id){if(typeof id!=='string'||!id||id.length>1024)throw new HttpError(400,'Seleccione un calendario válido.');return safeCalendar(await this.request('/users/me/calendarList/'+encodeURIComponent(id)));}
 async select(id){return this.exclusive(async()=>{if(this.repo.pendingCalendarTests().length)throw new HttpError(409,'Limpie los eventos de prueba pendientes antes de cambiar de calendario.');const c=await this.calendar(id);if(!c.writable)throw new HttpError(403,'Este calendario es de solo lectura. Elija uno donde pueda crear eventos.');this.repo.selectCalendar(c);return this.status();});}
 selected(id){const c=this.repo.readCalendarConnection().selected;if(!c||c.id!==id)throw new HttpError(409,'El calendario cambió. Actualice el panel y confirme cuál desea probar.');return c;}
 async check(id){return this.exclusive(async()=>{this.selected(id);const c=await this.calendar(id);if(!c.writable)throw new HttpError(403,'Ya no tiene permiso para crear eventos en este calendario.');
  const start=new Date(this.now()).toISOString(),end=new Date(this.now()+7*86400000).toISOString();let page='',count=0;const seen=new Set();
  do{if(seen.has(page)||seen.size>=100)throw new HttpError(502,'La comprobación está incompleta. Reintente.');seen.add(page);const query=new URLSearchParams({timeMin:start,timeMax:end,singleEvents:'true',maxResults:'2500',fields:'items(id),nextPageToken',...(page?{pageToken:page}:{})});const data=await this.request('/calendars/'+encodeURIComponent(id)+'/events?'+query);count+=(data.items||[]).length;page=data.nextPageToken||'';}while(page);
  const result={kind:'read',ok:true,at:new Date(this.now()).toISOString(),calendarId:id,calendarName:c.name,timeZone:c.timeZone,eventsNext7Days:count};this.repo.selectCalendar(c);this.repo.recordCalendarCheck(result);return result;
 });}
 /**
  * bookingEvents: Recorre todas las páginas de eventos dentro del intervalo solicitado.
  * Entrada (firma real): id, start, end.
  * Salida: Promise de eventos con start/end; incompletitud es error, no disponibilidad libre.
  */
 async bookingEvents(id,start,end){
  const events=[],seen=new Set();let page='';
  do{if(seen.has(page)||seen.size>=100)throw new HttpError(502,'La disponibilidad está incompleta. Intente más tarde.');seen.add(page);
   const query=new URLSearchParams({timeMin:start,timeMax:end,singleEvents:'true',maxResults:'2500',fields:'items(id,status,transparency,start,end),nextPageToken',...(page?{pageToken:page}:{})});
   const result=await this.request('/calendars/'+encodeURIComponent(id)+'/events?'+query);if(!Array.isArray(result.items))throw new HttpError(502,'No se pudo comprobar la disponibilidad.');events.push(...result.items);page=result.nextPageToken||'';
  }while(page);return events;
 }
 /**
  * cleanupRecord: Elimina solo el evento técnico que coincide con el marcador de la prueba
  * guardada.
  * Entrada (firma real): test.
  * Salida: Promise<void>; conserva pendiente cuando todavía no puede confirmar la limpieza.
  */
 async cleanupRecord(test){const path='/calendars/'+encodeURIComponent(test.calendarId)+'/events/'+test.id;const found=await this.request(path,{allowMissing:true});if(!found&&this.now()-Date.parse(test.createdAt)<120000)throw new HttpError(409,'Google aún no confirma si creó la prueba. Espere dos minutos y vuelva a limpiar.');if(found&&found.status!=='cancelled'){
  if(found.extendedProperties?.private?.nexoTest!==test.marker)throw new HttpError(409,'El evento no coincide con la prueba de Nexo. No se ha eliminado. Revíselo en Google Calendar.');
  await this.request(path+'?sendUpdates=none',{method:'DELETE',allowMissing:true});
 }this.repo.removeCalendarTest(test.id);}
 async test(id){return this.exclusive(async()=>{this.selected(id);if(this.repo.pendingCalendarTests().length)throw new HttpError(409,'Hay una prueba pendiente de limpieza. Resuélvala antes de iniciar otra.');const c=await this.calendar(id);if(!c.writable)throw new HttpError(403,'No tiene permiso para crear eventos en ese calendario.');
  const test={id:randomBytes(16).toString('hex'),calendarId:id,marker:randomBytes(24).toString('hex'),createdAt:new Date(this.now()).toISOString()};this.repo.addCalendarTest(test);
  const event={id:test.id,summary:'[PRUEBA NEXO] Verificación de conexión',description:'Evento técnico de prueba. Nexo lo elimina al completar la verificación. No es una cita.',start:{dateTime:new Date(this.now()+86400000).toISOString()},end:{dateTime:new Date(this.now()+86460000).toISOString()},transparency:'transparent',visibility:'private',reminders:{useDefault:false},extendedProperties:{private:{nexoTest:test.marker}}};
  try{await this.request('/calendars/'+encodeURIComponent(id)+'/events?sendUpdates=none',{method:'POST',body:event});}
  catch{throw new HttpError(502,'No se pudo confirmar la creación. La prueba quedó registrada para verificar y limpiar; no la repita todavía.');}
  try{const created=await this.request('/calendars/'+encodeURIComponent(id)+'/events/'+test.id);if(created?.extendedProperties?.private?.nexoTest!==test.marker)throw Error('Mismatch');await this.cleanupRecord(test);}
  catch{throw new HttpError(502,'La prueba no terminó de limpiarse. Use «Limpiar prueba pendiente»; no se borrarán otros eventos.');}
  const result={kind:'write',ok:true,cleaned:true,at:new Date(this.now()).toISOString(),calendarId:id,calendarName:c.name,timeZone:c.timeZone};this.repo.recordCalendarCheck(result);return result;
 });}
 async cleanup(){return this.exclusive(async()=>{for(const t of this.repo.pendingCalendarTests())await this.cleanupRecord(t);return this.status();});}
 /**
  * disconnect: Exige limpiar pruebas pendientes, intenta revocar Google y borra la conexión local.
  * Entrada (firma real): (sin parámetros).
  * Salida: Promise de estado con revoked, que indica si Google confirmó revocación.
  */
 async disconnect(){return this.exclusive(async()=>{if(this.repo.pendingCalendarTests().length)throw new HttpError(409,'Limpie primero la prueba pendiente para no dejar eventos de prueba sin seguimiento.');let revoked=true;const raw=this.repo.readCalendarConnection().tokens;
  if(raw){let token;try{token=this.unseal(raw).refresh_token;}catch{revoked=false;}if(token)try{const r=await this.fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token}),signal:AbortSignal.timeout(15000),redirect:'error'});revoked=r.ok;}catch{revoked=false;}}
  this.repo.clearCalendarConnection();this.states.clear();return {...this.status(),revoked};
 });}
 close(){this.states.clear();}
}
