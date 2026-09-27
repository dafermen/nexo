/**
 * NEXO · GUÍA DEL MÓDULO: server/pilot-access.js
 * Entrada: contraseña del piloto, repositorio de límites y reloj inyectable.
 * Salida: cookie opaca temporal; acceso del piloto distinto del administrador.
 * Estado: sessions contiene hashes, nunca cookies claras; pending limita scrypt.
 * Efectos: contabiliza intentos en SQLite; reiniciar revoca todas las entradas.
 */
import {randomBytes,createHash,scrypt,scryptSync,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {HttpError} from './errors.js';
const derive=promisify(scrypt),hash=s=>createHash('sha256').update(s).digest('hex');
export const validPilotHash=value=>typeof value==='string'&&/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value);

/** Solo al leer .env durante el arranque: clave en claro -> verificador con salt.
 * El trabajo síncrono nunca se ejecuta por petición HTTP. No devuelve la clave.
 */
export function configuredPilotHash(password){
  if(typeof password!=='string'||password.length<16||password.length>256||/[\r\n\0]/.test(password))throw Error('PILOT_PASSWORD debe tener entre 16 y 256 caracteres en una sola línea.');
  const salt=randomBytes(16).toString('hex');
  return 'scrypt:'+salt+':'+scryptSync(password,salt,64).toString('hex');
}

/** Password in -> salted verifier out. Used by the offline setup tool, not HTTP. */
export async function makePilotHash(password){
  if(typeof password!=='string'||password.length<16||password.length>256)throw Error('La clave del piloto debe tener entre 16 y 256 caracteres.');
  const salt=randomBytes(16).toString('hex');
  return 'scrypt:'+salt+':'+(await derive(password,salt,64)).toString('hex');
}
export class PilotAccess{
  constructor({passwordHash,repository,now=Date.now}){this.passwordHash=passwordHash;this.repo=repository;this.now=now;this.sessions=new Map();this.pending=0;}
  prune(){for(const [key,expires]of this.sessions)if(expires<=this.now())this.sessions.delete(key);}
  token(req){const values=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('__Host-nexo_pilot='));return values.length===1&&/^[a-f0-9]{64}$/.test(values[0].slice(18))?values[0].slice(18):null;}
  authenticated(req){this.prune();const token=this.token(req);return !!token&&this.sessions.has(hash(token));}
  async login(password,ip){
    this.prune();
    if(!this.repo.takeAuthLimit('pilot:'+hash(ip),5,15*60000,this.now())||!this.repo.takeAuthLimit('pilot:global',60,15*60000,this.now()))throw new HttpError(429,'Demasiados intentos. Espere 15 minutos.');
    if(this.pending>=2||this.sessions.size>=50)throw new HttpError(429,'El piloto está ocupado. Intente más tarde.');
    if(typeof password!=='string'||password.length<16||password.length>256)throw new HttpError(401,'Clave de acceso incorrecta.');
    this.pending++;
    try{
      const [,salt,expected]=this.passwordHash.split(':');
      const value=await derive(password,salt,64);
      if(!timingSafeEqual(value,Buffer.from(expected,'hex')))throw new HttpError(401,'Clave de acceso incorrecta.');
      // Reservations above limit concurrent memory-hard derivations; recheck after await.
      if(this.sessions.size>=50)throw new HttpError(429,'El piloto está ocupado.');
      const token=randomBytes(32).toString('hex');this.sessions.set(hash(token),this.now()+8*3600000);return this.cookie(token);
    }finally{this.pending--;}
  }
  cookie(token){return '__Host-nexo_pilot='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+(token?8*3600:0);}
  logout(req){const token=this.token(req);if(token)this.sessions.delete(hash(token));return this.cookie('');}
}
