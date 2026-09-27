/**
 * NEXO · GUÍA DEL MÓDULO: scripts/create-pilot-access.js
 * Entrada: ruta de salida nueva. Salida: JSON privado con clave aleatoria y verificador.
 * No imprime secretos, no modifica .env y no sobreescribe archivos existentes.
 * En Linux crea el archivo con permiso 0600; comunicar la clave por canal privado.
 */
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {makePilotHash} from '../server/pilot-access.js';
if(!process.argv[2])throw Error('Indique una ruta privada nueva para el archivo JSON.');
const password=randomBytes(24).toString('base64url');
await writeFile(resolve(process.argv[2]),JSON.stringify({password,PILOT_PASSWORD_HASH:await makePilotHash(password)},null,2)+'\n',{flag:'wx',mode:0o600});
console.log('Acceso generado en el archivo privado indicado. No comparta el verificador ni este archivo.');
