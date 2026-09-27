/**
 * NEXO · GUÍA DEL MÓDULO: scripts/validate-faq.js
 * Validar el archivo semilla de preguntas frecuentes.
 * Entrada: conocimiento/preguntas-frecuentes.txt y catálogo de referencia.
 * Salida: Conteo o errores de formato.
 * Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
 * ejecutar.
 * Efectos y límites: No publica cambios en la base SQLite activa.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {parseFaq} from '../server/faq.js';
try {
 try{process.loadEnvFile();}catch(error){if(error.code!=='ENOENT')throw error;}
 let source,label='Archivo inicial';const path=resolve(process.env.DB_PATH||'./data/kiosk.sqlite');
 if(!process.argv.includes('--seed')&&existsSync(path)){
  const db=new DatabaseSync(path,{readOnly:true});try{
   if(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='knowledge_bases'").get()){
    const record=db.prepare("SELECT source FROM knowledge_bases WHERE id='school'").get();if(record){source=record.source;label='Base SQLite';}
   }
  }finally{db.close();}
 }
 source??=await readFile(new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url),'utf8');
 const entries=parseFaq(source);console.log(label+' válida: '+entries.filter(e=>e.active).length+' temas activos, '+entries.reduce((n,e)=>n+e.questions.length,0)+' preguntas.');
}catch(error){console.error(error.message);process.exitCode=1;}

