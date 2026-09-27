/**
 * NEXO · GUÍA DEL MÓDULO: server/installation.js
 * Leer la identidad administrativa y los ajustes SMTP de esta instalación.
 * Entrada: env y archivo JSON de instalación; SMTP_PASSWORD se toma del entorno.
 * Salida: email normalizado, mode y mail; Error si el archivo tiene formato inválido.
 * Estado importante: installationFile apunta a config/installation.json; password no pertenece a
 * ese JSON.
 * Efectos y límites: Lee disco sin enviar correo. Es configuración del despliegue, no el perfil
 * comercial editable del negocio.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {readFileSync} from 'node:fs';
export const installationFile=new URL('../config/installation.json',import.meta.url);
const emailPattern=/^[^\s<>@\r\n]+@[^\s<>@\r\n]+\.[^\s<>@\r\n]+$/;
export const normalizeEmail=value=>typeof value==='string'?value.trim().toLowerCase():'';
export function readInstallation(env={},path=installationFile){
 let settings={};try{const source=readFileSync(path,'utf8');if(Buffer.byteLength(source)>16384)throw new Error();settings=JSON.parse(source.replace(/^\uFEFF/,''));}catch(error){if(error.code!=='ENOENT')throw new Error('Revise config/installation.json: debe contener configuración JSON válida.');}
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||settings.mail&&(typeof settings.mail!=='object'||Array.isArray(settings.mail)))throw new Error('Configuración de instalación inválida.');
 const configured=settings.administratorEmails??(settings.administratorEmail?[settings.administratorEmail]:[]);
 if(!Array.isArray(configured)||configured.length>10||configured.some(e=>typeof e!=='string'||!emailPattern.test(normalizeEmail(e))||normalizeEmail(e).length>254))throw new Error('administratorEmails debe contener hasta 10 correos válidos.');
 const emails=[...new Set(configured.map(normalizeEmail))],email=emails[0]||'';
 const mode=settings.administratorLogin||'auto';if(!['auto','email','token'].includes(mode))throw new Error('administratorLogin debe ser auto, email o token.');
 const m=settings.mail||{},port=Number(m.port||465),host=m.host||'smtp.gmail.com',secure=m.secure??(port===465),from=normalizeEmail(m.from||email),user=m.user||email;
 if(!Number.isInteger(port)||port<1||port>65535||typeof host!=='string'||!host||/[\s\r\n/]/.test(host)||typeof secure!=='boolean'||(from&&!emailPattern.test(from))||typeof user!=='string'||/[\r\n]/.test(user))throw new Error('Revise la configuración de correo en config/installation.json.');
 return {email,emails,mode,mail:{host,port,secure,from,user,password:env.SMTP_PASSWORD||''}};
}
