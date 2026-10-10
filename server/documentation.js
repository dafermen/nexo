/**
 * NEXO · GUÍA DEL MÓDULO: server/documentation.js
 * Publicar únicamente la documentación permitida del proyecto.
 * Entrada: projectRoot; identificador de documento/imagen generado desde una ruta permitida.
 * Salida: catalog, document y asset; HttpError 404 si no se permite el archivo.
 * Estado importante: files/assets mapean IDs a rutas; catalogPromise reúne lecturas simultáneas;
 * checked verifica realpath.
 * Efectos y límites: Lectura de docs, README y UBICACION. No convierte /docs en un explorador de
 * .env, bases, logs o fuentes privadas.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {readdir,readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,relative,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {HttpError} from './errors.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const textTypes=new Set(['.md','.txt']);
const imageTypes={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'};
const idFor=path=>createHash('sha256').update(path).digest('hex').slice(0,20);
const cleanTitle=text=>text.replace(/[`*_]/g,'').trim();
const cleanSummary=text=>cleanTitle(text.replace(/!?\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/^\d+\.\s*/,''));
function category(path){
  if(path.startsWith('docs/codigo/')||/^docs\/4[1-4]-/.test(path))return 'Aprender el código';
  if(/LICENSE|MODEL-CARD/i.test(path))return 'Licencias';
  if(/(?:00-|README|UBICACION|28-)/.test(path))return 'Empezar';
  if(/(?:23-|24-|26-|27-|29-|30-|31-|32-|33-|34-|17-|21-|45-|46-)/.test(path))return 'Manuales';
  if(/(?:06-|07-|08-|25-)/.test(path))return 'Fases y tareas';
  if(/(?:18-|19-|20-|22-|16-|58-)/.test(path))return 'Conversación';
  if(/(?:01-|02-|03-|04-|05-)/.test(path))return 'Diseño técnico';
  return 'Evolución';
}

export function createDocumentation({projectRoot=root}={}){
  const files=new Map(),assets=new Map();let catalogPromise;
  const slash=path=>path.split(sep).join('/');
  /**
   * checked: Resuelve la ruta real y exige ubicación/extensión/tamaño permitidos; frena recorridos y
   * enlaces a otros proyectos.
   * Entrada (firma real): path, kind.
   * Salida: Promise<{full,info}> o HttpError 404.
   */
  async function checked(path,kind){
    const base=await realpath(projectRoot);let full;
    try{full=await realpath(resolve(projectRoot,path));}catch(error){if(error.code==='ENOENT')throw new HttpError(404,'Documento no disponible.');throw error;}
    if(!full.startsWith(base+sep))throw new HttpError(404,'Documento no disponible.');
    const rel=slash(relative(base,full));
    const allowed=rel.startsWith('docs/')||(kind==='text'&&['README.md','UBICACION.md'].includes(rel));
    if(!allowed||(kind==='status'?rel!=='docs/project-status.json':kind==='text'?!textTypes.has(extname(full)):!imageTypes[extname(full)]))throw new HttpError(404,'Documento no disponible.');
    const info=await stat(full);if(!info.isFile()||info.size>(kind==='text'?2:10)*1024*1024)throw new HttpError(404,'Documento no disponible.');
    return {full,info};
  }
  async function walk(dir){
    const out=[];
    const base=await realpath(projectRoot),folder=await realpath(resolve(projectRoot,dir));
    if(!folder.startsWith(base+sep))throw new HttpError(404,'Documentación no disponible.');
    for(const entry of await readdir(resolve(projectRoot,dir),{withFileTypes:true})){
      if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;
      const path=dir+'/'+entry.name;
      if(entry.isDirectory())out.push(...await walk(path));
      else if(entry.isFile()&&(textTypes.has(extname(path))||imageTypes[extname(path)]))out.push(path);
    }
    return out;
  }
  /**
   * catalog: Enumera documentos, crea IDs estables y lee el tablero de tareas; comparte lecturas
   * concurrentes.
   * Entrada (firma real): (sin parámetros).
   * Salida: Promise<{documents,assets,status}>; no devuelve archivos de configuración privada.
   */
  async function catalog(){
    if(catalogPromise)return catalogPromise;
    catalogPromise=(async()=>{
      const paths=['README.md','UBICACION.md',...await walk('docs')];
      const documents=[],images=[];files.clear();assets.clear();
      for(const path of paths.sort()){
        const kind=textTypes.has(extname(path))?'text':'image';
        let verified;try{verified=await checked(path,kind);}catch{continue;}
        const id=idFor(path);
        if(kind==='image'){assets.set(id,path);images.push({id,path});continue;}
        const source=(await readFile(verified.full,'utf8')).replace(/^\uFEFF/,'');
        const title=cleanTitle(source.match(/^#\s+(.+)$/m)?.[1]||path.split('/').at(-1));
        const summary=source.split(/\r?\n/).find(line=>line.trim()&&!/^[#>|`\-]/.test(line.trim()))||'Documento del proyecto Nexo.';
        const plain=cleanSummary(summary),excerpt=plain.length>180?plain.slice(0,177).replace(/\s+\S*$/,'')+'…':plain;
        const entry={id,path,title,summary:excerpt,category:category(path),historical:/docs\/(0[1-9]|1[0-5])-/.test(path),updatedAt:verified.info.mtime.toISOString(),searchText:source};
        files.set(id,path);documents.push(entry);
      }
      const statusFile=await checked('docs/project-status.json','status');
      const status=JSON.parse(await readFile(statusFile.full,'utf8'));
      return {documents,assets:images,status};
    })();
    try{return await catalogPromise;}finally{catalogPromise=null;}
  }
  /**
   * document: Busca el ID conocido y vuelve a verificar el archivo antes de leerlo.
   * Entrada (firma real): id.
   * Salida: Promise<{id,path,text}>.
   */
  async function document(id){
    if(!/^[a-f0-9]{20}$/.test(id))throw new HttpError(404,'Documento no encontrado.');
    if(!files.has(id))await catalog();const path=files.get(id);if(!path)throw new HttpError(404,'Documento no encontrado.');
    const {full}=await checked(path,'text');return {id,path,text:(await readFile(full,'utf8')).replace(/^\uFEFF/,'')};
  }
  /**
   * asset: Busca y verifica una imagen documentada.
   * Entrada (firma real): id.
   * Salida: Promise<{contents,mime}>; nunca acepta una ruta arbitraria del cliente.
   */
  async function asset(id){
    if(!/^[a-f0-9]{20}$/.test(id))throw new HttpError(404,'Imagen no encontrada.');
    if(!assets.has(id))await catalog();const path=assets.get(id);if(!path)throw new HttpError(404,'Imagen no encontrada.');
    const {full}=await checked(path,'image');return {contents:await readFile(full),mime:imageTypes[extname(full)]};
  }
  return {catalog,document,asset};
}
