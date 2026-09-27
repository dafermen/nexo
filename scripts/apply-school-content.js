/** NEXO · GUÍA DEL MÓDULO: scripts/apply-school-content.js
 * Entrada: paquete JSON aprobado y entorno de la instalación; --apply confirma aplicación.
 * Salida: resumen sin claves ni datos de visitantes. Sin --apply no escribe.
 * Ejecutar con respaldo y servidor detenido. Es atómico y no se repite al arrancar.
 */
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {readConfig} from '../server/config.js';
import {applyContentUpdate} from '../server/content-update.js';
const config=readConfig();if(config.center?.id!=='metodomogollon')throw Error('Paquete exclusivo de Método Mogollón.');
const path=process.argv.slice(2).find(v=>!v.startsWith('--'));
if(!path)throw Error('Indique el archivo JSON autorizado. Agregue --apply para aplicar.');
const bundle=JSON.parse(readFileSync(path,'utf8')),db=new DatabaseSync(config.dbPath);db.exec('PRAGMA busy_timeout=5000');
try{console.log(JSON.stringify(applyContentUpdate(db,bundle,{apply:process.argv.includes('--apply')})));}finally{db.close();}
