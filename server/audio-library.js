/**
 * NEXO · GUÍA DEL MÓDULO: server/audio-library.js
 * Reutilizar WAV válidos antes de generar otra vez la misma voz.
 * Entrada: repository, provider, directory, límites; texto y opciones autorizadas desde el
 * servidor.
 * Salida: Mismo contrato TTS: audioBase64, duration y provider; status y clear para
 * administración.
 * Estado importante: queue serializa archivos; epoch invalida escrituras al vaciar; ttl y maxBytes
 * limitan disco; checksum detecta corrupción.
 * Efectos y límites: Lee/escribe solo archivos propios con nombres hash. Si falla la caché intenta
 * la síntesis normal; no vuelve gratuita una sesión de LiveAvatar.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {createHash,randomBytes} from 'node:crypto';
import {mkdir,readdir,lstat,readFile,writeFile,rename,unlink,realpath} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {HttpError} from './errors.js';

const digest=data=>createHash('sha256').update(data).digest('hex');
const isKey=key=>typeof key==='string'&&/^[a-f0-9]{64}$/.test(key);
function validWav(data){
 return Buffer.isBuffer(data)&&data.length>44&&data.length<=5_000_044&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,16)==='WAVEfmt '
  &&data.readUInt32LE(4)===data.length-8&&data.readUInt32LE(16)===16&&data.readUInt16LE(20)===1&&data.readUInt16LE(22)===1
  &&data.readUInt32LE(24)===22050&&data.readUInt16LE(34)===16&&data.toString('ascii',36,40)==='data'&&data.readUInt32LE(40)===data.length-44&&(data.length-44)%2===0;
}
export class AudioLibrary {
 constructor({repository,provider,directory,maxBytes=128*1024*1024,ttlDays=30,enabled=true,now=Date.now}){
  this.repo=repository;this.provider=provider;this.directory=resolve(directory);this.maxBytes=maxBytes;this.ttl=ttlDays*86400000;this.enabled=enabled;this.now=now;this.queue=Promise.resolve();this.epoch=0;this.ready=false;
 }
 /**
  * serial: Encadena acceso a archivos/índice sin dejar la cola bloqueada si una operación falla.
  * Entrada (firma real): work.
  * Salida: Promesa de work; los trabajos siguientes siguen siendo ejecutables.
  */
 serial(work){const next=this.queue.then(work);this.queue=next.catch(()=>{});return next;}
 path(key){if(!isKey(key))throw Error('Invalid audio key');return join(this.directory,key+'.wav');}
 /**
  * init: Crea/verifica carpeta privada, limpia huérfanos propios y aplica retención.
  * Entrada (firma real): (sin parámetros).
  * Salida: Promise<void>; no sigue una carpeta simbólica.
  */
 async init(){
  if(this.ready)return;
  await mkdir(this.directory,{recursive:true});const info=await lstat(this.directory);
  if(!info.isDirectory()||info.isSymbolicLink())throw Error('Invalid audio directory');
  this.root=await realpath(this.directory);
  const entries=this.repo.audioEntries(),keys=new Set(entries.map(r=>r.key));
  for(const name of await readdir(this.directory)){
   if(/^[a-f0-9]{64}\.[a-f0-9]{16}\.tmp$/.test(name)||(/^[a-f0-9]{64}\.wav$/.test(name)&&!keys.has(name.slice(0,64))))await unlink(join(this.root,name));
  }
  this.ready=true;await this.prune();
 }
 async checkRoot(){if((await lstat(this.directory)).isSymbolicLink()||await realpath(this.directory)!==this.root)throw Error('Audio directory changed');}
 async remove(row){
  const path=this.path(row.key);try{await unlink(path);}catch(e){if(e.code!=='ENOENT')throw e;}this.repo.deleteAudio(row.key);
 }
 /**
  * prune: Elimina entradas vencidas/corruptas y después las menos usadas hasta dejar capacidad.
  * Entrada (firma real): extraBytes=0.
  * Salida: Promise<void>; extraBytes reserva espacio para un audio nuevo.
  */
 async prune(extraBytes=0){
  await this.checkRoot();let entries=this.repo.audioEntries();
  for(const row of entries){let info;try{info=await lstat(this.path(row.key));}catch(e){if(e.code!=='ENOENT')throw e;}
   if(!info||!info.isFile()||info.isSymbolicLink()||info.size!==row.bytes||this.now()-row.createdAt>=this.ttl)await this.remove(row);
  }
  entries=this.repo.audioEntries();let size=entries.reduce((sum,row)=>sum+row.bytes,0);
  for(const row of entries){if(size+extraBytes<=this.maxBytes)break;await this.remove(row);size-=row.bytes;}
 }
 metric(name,saved=0){try{this.repo.audioMetric(name,saved);}catch{/* Cache metrics must never break speech. */}}
 /**
  * synthesize: Consulta caché autorizada, valida WAV y checksum; si no sirve, genera y guarda de
  * forma atómica.
  * Entrada (firma real): text, options.
  * Salida: Promise<{audioBase64,duration,provider}>; abort puede cancelar incluso tras un acierto.
  */
 async synthesize(text,options){
  const {cacheable=false,scope,language='es',signal,...rest}=options;
  const cancelled=()=>{if(signal?.aborted)throw new HttpError(409,'Voz cancelada.');};cancelled();
  if(!this.enabled||!cacheable||!scope||typeof this.provider.cacheIdentity!=='function'){
   this.metric('bypasses');return this.provider.synthesize(text,{...rest,language,signal});
  }
  let key;const epoch=this.epoch;
  try{
   const identity=await this.provider.cacheIdentity(language);cancelled();
   if(identity)key=digest(JSON.stringify({schema:1,scope,text,language,identity}));
   if(key){const cached=await this.serial(async()=>{
    await this.init();await this.prune();const row=this.repo.audioEntry(key);if(!row)return null;
    const data=await readFile(this.path(key));if(!validWav(data)||digest(data)!==row.checksum){await this.remove(row);return null;}
    cancelled();this.repo.touchAudio(key,this.now());this.metric('hits',row.generationMs);
    return {audioBase64:data.toString('base64'),duration:row.duration,provider:'piper-local'};
   });if(cached){cancelled();return cached;}}
  }catch(error){cancelled();key=null;this.metric('errors');}
  this.metric(key?'misses':'bypasses');cancelled();const started=performance.now();
  const result=await this.provider.synthesize(text,{...rest,language,signal});cancelled();
  const generationMs=Math.max(0,Math.round(performance.now()-started));
  if(key&&epoch===this.epoch)try{await this.serial(async()=>{
   if(epoch!==this.epoch||signal?.aborted)return;
   const data=Buffer.from(result.audioBase64||'','base64');if(!validWav(data)||data.length>this.maxBytes)return;
   await this.init();await this.prune(data.length);if(epoch!==this.epoch||signal?.aborted)return;
   const temporary=join(this.directory,key+'.'+randomBytes(8).toString('hex')+'.tmp');
   try{
    await writeFile(temporary,data,{flag:'wx'});
    if(epoch!==this.epoch||signal?.aborted)return;
    await rename(temporary,this.path(key));
    try{this.repo.saveAudio({key,checksum:digest(data),bytes:data.length,duration:(data.length-44)/44100,generationMs,language,createdAt:this.now(),lastUsed:this.now()});}
    catch(error){await unlink(this.path(key)).catch(()=>{});throw error;}
   }finally{await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  });}catch{this.metric('errors');}
  cancelled();return result;
 }
 /**
  * status: Verifica mantenimiento y reúne límites, bytes y métricas para administración.
  * Entrada (firma real): (sin parámetros).
  * Salida: Promise de estado; available=false si no puede usar la carpeta.
  */
 async status(){return this.serial(async()=>{
  let available=true;try{await this.init();await this.prune();}catch{available=false;}
  const rows=this.repo.audioEntries();return {enabled:this.enabled,available,entries:rows.length,bytes:rows.reduce((n,r)=>n+r.bytes,0),maxBytes:this.maxBytes,ttlDays:this.ttl/86400000,...this.repo.audioMetrics()};
 });}
 /**
  * clear: Incrementa epoch antes de encolar borrado para que una síntesis antigua no repueble lo
  * recién vaciado.
  * Entrada (firma real): (sin parámetros).
  * Salida: Promise<{cleared:true}>; no elimina catálogo ni historial.
  */
 async clear(){this.epoch++;return this.serial(async()=>{await this.init();await this.checkRoot();for(const row of this.repo.audioEntries())await this.remove(row);return {cleared:true};});}
}
