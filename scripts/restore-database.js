/**
 * NEXO · GUÍA DEL MÓDULO: scripts/restore-database.js
 * Recuperación offline de una descarga .nexo a un NUEVO archivo SQLite.
 * Entrada: rutas de entrada/salida y contraseña oculta por terminal, nunca argumento ni log.
 * Salida: SQLite con integridad verificada. No cambia el servidor ni reemplaza la base activa.
 */
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {resolve} from 'node:path';
import {decryptSnapshot} from '../server/database-backup.js';
import {DatabaseSync} from 'node:sqlite';
const [input,output]=process.argv.slice(2);
if(!input||!output||!process.stdin.isTTY){console.error('Uso en terminal interactiva: node scripts/restore-database.js archivo.nexo NUEVO-archivo.sqlite');process.exitCode=1;}
else{
 let password='';const silent=new Writable({write(chunk,encoding,callback){callback();}}),rl=createInterface({input:process.stdin,output:silent,terminal:true});
 try{process.stdout.write('Contraseña del respaldo (oculta): ');password=await rl.question('');rl.close();process.stdout.write('\n');await decryptSnapshot(resolve(input),resolve(output),password);
  const db=new DatabaseSync(resolve(output));try{db.exec("BEGIN IMMEDIATE; DELETE FROM admin_sessions; DELETE FROM admin_challenges; UPDATE booking_notifications SET status='uncertain' WHERE status IN ('queued','sending'); COMMIT;");}finally{db.close();}
  console.log('SQLite recuperado y verificado. Sesiones revocadas y avisos pendientes requieren revisión. No se ha cambiado la base activa.');}
 catch{console.error('No se pudo recuperar. Revise contraseña, archivo y que la salida no exista.');process.exitCode=1;}
 finally{password='';rl.close();}
}
