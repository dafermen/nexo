/**
 * NEXO · GUÍA DEL MÓDULO: server/database-backup.js
 * Snapshot SQLite coherente y cifrado AES-256-GCM. Entrada: db, contraseña del administrador.
 * Salida: archivo temporal NEXOBK01 + salt(16) + IV(12) + cifrado + tag(16).
 * scrypt deriva la clave; no se guarda contraseña. Nunca copiar directamente un SQLite con WAL.
 * El snapshot no incluye .env, claves externas de Calendar, código ni audios.
 */
import {backup,DatabaseSync} from 'node:sqlite';
import {randomBytes,scrypt,createCipheriv,createDecipheriv} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdtemp,chmod,open,rm,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {HttpError} from './errors.js';
const derive=promisify(scrypt),magic=Buffer.from('NEXOBK01');
export function validateBackupPassword(password){if(typeof password!=='string'||password.length<12||password.length>200)throw new HttpError(400,'Use una contraseña de respaldo de entre 12 y 200 caracteres.');}
export async function encryptedSnapshot(db,password){
 validateBackupPassword(password);const directory=await mkdtemp(join(tmpdir(),'nexo-backup-'));await chmod(directory,0o700);
 const clear=join(directory,'snapshot.sqlite'),path=join(directory,'backup.nexo');
 try{
  await backup(db,clear);await chmod(clear,0o600);
  const check=new DatabaseSync(clear,{readOnly:true});try{if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Integridad inválida');}finally{check.close();}
  const salt=randomBytes(16),iv=randomBytes(12),key=await derive(password,salt,32),cipher=createCipheriv('aes-256-gcm',key,iv),header=Buffer.concat([magic,salt,iv]);cipher.setAAD(header);
  const file=await open(path,'wx',0o600);try{await file.write(header);}finally{await file.close();}
  try{await pipeline(createReadStream(clear),cipher,createWriteStream(path,{flags:'a',mode:0o600}));}finally{key.fill(0);}
  const output=await open(path,'a');try{await output.write(cipher.getAuthTag());}finally{await output.close();}
  await rm(clear,{force:true});return {path,cleanup:()=>rm(directory,{recursive:true,force:true})};
 }catch(e){await rm(directory,{recursive:true,force:true});throw e;}
}
/** Recuperación técnica offline. Rechaza contraseña incorrecta/archivo alterado y borra salida. */
export async function decryptSnapshot(input,output,password){
 validateBackupPassword(password);const size=(await stat(input)).size;if(size<53)throw Error('Respaldo inválido');
 const file=await open(input,'r'),header=Buffer.alloc(36),tag=Buffer.alloc(16);
 try{await file.read(header,0,36,0);await file.read(tag,0,16,size-16);}finally{await file.close();}
 if(!header.subarray(0,8).equals(magic))throw Error('Formato de respaldo desconocido');
 const key=await derive(password,header.subarray(8,24),32),decipher=createDecipheriv('aes-256-gcm',key,header.subarray(24));decipher.setAAD(header);decipher.setAuthTag(tag);
 // Reservar con wx: jamás sobrescribir ni eliminar una base preexistente al fallar.
 const target=await open(output,'wx',0o600);await target.close();
 try{await pipeline(createReadStream(input,{start:36,end:size-17}),decipher,createWriteStream(output,{flags:'w',mode:0o600}));
  const db=new DatabaseSync(output,{readOnly:true});try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Integridad inválida');}finally{db.close();}
 }catch(e){await rm(output,{force:true});throw Error('No se pudo recuperar: contraseña incorrecta o archivo inválido.');}finally{key.fill(0);}
}
