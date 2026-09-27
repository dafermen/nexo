/** NEXO · GUÍA DEL MÓDULO: deploy/preflight.mjs */
/** Comprobación local de instalación Linux, sin llamadas a proveedores ni impresión de secretos. */
import {readConfig} from '../server/config.js';
import {LocalTtsService} from '../server/providers/local-tts.js';
import {stat,access} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname} from 'node:path';
const config=readConfig();
if(config.deploymentMode!=='pilot'||process.platform!=='linux')throw Error('Este preflight es para el piloto Linux.');
const [major,minor]=process.versions.node.split('.').map(Number);
if(major!==24||minor<21)throw Error('Use la versión LTS Node 24.21.0 o una actualización 24.x posterior revisada.');
if(process.getuid()===0)throw Error('Ejecute como usuario nexo, no como root.');
const state=dirname(config.dbPath),info=await stat(state);
if(info.mode&0o077)throw Error('El directorio de datos debe ser privado (0700).');
await access(state,constants.W_OK);
const voice=new LocalTtsService(config.localTts);
for(const lang of ['es','en','fr'])if(!voice.status(lang).available)throw Error('Falta voz local: '+lang);
for(const path of [process.env.INSTALLATION_PATH,'/etc/nexo/nexo.env']){
  const entry=await stat(path);if(entry.mode&0o007||entry.mode&0o020)throw Error('Configuración debe impedir lectura pública y escritura del grupo.');
}
console.log('Configuración, permisos, voz y Node válidos. Correo/OAuth/DNS requieren prueba real aparte.');
