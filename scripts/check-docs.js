/**
 * NEXO · GUÍA DEL MÓDULO: scripts/check-docs.js
 * Comprueba cobertura del código propio y enlaces de la ruta educativa.
 * Entrada: archivos de server/public/scripts/tests, lanzadores CMD y guías Markdown.
 * Salida: resumen y exitCode 1 si falta una ficha, cabecera o documento enlazado.
 * Estado importante: sources es el inventario; failures reúne diagnósticos sin abortar
 * al primer problema. No se leen .env, bases ni contenido de terceros.
 * Efectos y límites: solo lectura. No valida la exactitud semántica de comentarios.
 * Ruta de aprendizaje: docs/41-mapa-codigo-fuente.md.
 */
import {readdir, readFile, access} from 'node:fs/promises';
import {resolve, extname, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const extensions = new Set(['.js', '.mjs', '.css', '.html', '.ps1', '.py', '.sh']);
const failures = [];
const slash = value => value.split(sep).join('/');

/** Recibe directorio relativo; devuelve archivos propios sin seguir enlaces simbólicos. */
async function walk(directory) {
  const out = [];
  for (const entry of await readdir(resolve(root, directory), {withFileTypes:true})) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink() || ['vendor','assets','node_modules'].includes(entry.name)) continue;
    const path = directory + '/' + entry.name;
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

const references = (await walk('docs/codigo')).filter(p => p.endsWith('.md'));
const referenceText = (await Promise.all(references.map(p => readFile(resolve(root,p),'utf8')))).join('\n').replace(/\r\n/g,'\n');
const sources = (await Promise.all(['server','public','scripts','tests','deploy'].map(walk))).flat().filter(p => extensions.has(extname(p)));
for (const entry of await readdir(root,{withFileTypes:true})) if (entry.isFile() && entry.name.endsWith('.cmd')) sources.push(entry.name);
for (const file of sources) {
  const source = await readFile(resolve(root,file),'utf8');
  if (!source.slice(0,2500).includes('MODULO: '+file) && !source.slice(0,2500).includes('MÓDULO: '+file)) failures.push('Falta cabecera: '+file);
  if (!referenceText.includes('## '+file+'\n')) failures.push('Falta ficha: '+file);
}

const guides = ['23-manual-desarrollador-junior.md','41-mapa-codigo-fuente.md','42-recorridos-ejecucion.md','43-datos-y-contratos.md','44-practicas-desarrollo.md'].map(p=>'docs/'+p).concat(references);
let links = 0;
for (const file of guides) {
  const source = await readFile(resolve(root,file),'utf8');
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1];
    if (/^(?:https?:|#)/.test(href)) continue;
    const target = resolve(root, file, '..', href.split('#')[0]);
    const rel = slash(relative(root,target));
    if (!rel.startsWith('docs/') || !target.endsWith('.md')) {failures.push('Enlace fuera de documentación: '+file+' -> '+href);continue;}
    try {await access(target);links++;} catch {failures.push('Enlace roto: '+file+' -> '+href);}
  }
}
if (failures.length) {console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`Documentación verificada: ${sources.length} archivos propios, ${references.length} referencias y ${links} enlaces internos.`);
