/**
 * NEXO · GUÍA DEL MÓDULO: scripts/check.js
 * Comprobar sintaxis de archivos JavaScript sin ejecutar su lógica.
 * Entrada: Carpetas de código explícitas; nunca recorre credenciales, datos ni respaldos.
 * Salida: Resultado node --check por archivo y código de salida.
 * Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
 * ejecutar.
 * Efectos y límites: No valida comportamiento: complementar con pruebas.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import { readdirSync } from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import { spawnSync } from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
// Filtrar ANTES de descender: una carpeta privada no debe enumerarse para excluirla después.
function sources(folder){const files=[];for(const entry of readdirSync(folder,{withFileTypes:true})){
  if(entry.name.startsWith('.')||entry.name==='node_modules'||entry.isSymbolicLink())continue;
  const path=join(folder,entry.name);
  if(entry.isDirectory())files.push(...sources(path));else if(/\.m?js$/.test(entry.name))files.push(path);
}return files;}
const files=['server','public','scripts','tests','deploy'].flatMap(folder=>sources(join(root,folder)));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`${files.length} archivos JavaScript válidos.`);
