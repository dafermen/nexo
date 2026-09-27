/**
 * NEXO · GUÍA DEL MÓDULO: server/sqlite-faq.js
 * Mantener compilada la versión activa de preguntas frecuentes.
 * Entrada: repository y seedPath del archivo de carga inicial.
 * Salida: lookup y status; refresh actualiza la compilación cuando cambia revision.
 * Estado importante: compiled es el índice en memoria; pending reúne refrescos simultáneos;
 * revision es la versión guardada.
 * Efectos y límites: Solo importa seedPath si falta la base school. Después, editar el archivo
 * inicial no reemplaza las FAQ de SQLite.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {readFile} from 'node:fs/promises';
import {parseFaq,compileFaq} from './faq.js';
export class SqliteFaqRepository{
 constructor(repository,seedPath){this.repository=repository;this.seedPath=seedPath;this.compiled=compileFaq([]);this.revision=null;this.info={loaded:false,entries:0,error:null,source:'sqlite'};this.pending=null;}
 async refresh(){
  if(this.pending)return this.pending;
  this.pending=(async()=>{
    try{let stored=this.repository.readKnowledge('school');
      if(!stored){const source=await readFile(this.seedPath,'utf8');parseFaq(source);stored=this.repository.seedKnowledge('school',source);}
      if(stored.revision===this.revision)return;
      const entries=parseFaq(stored.source);this.compiled=compileFaq(entries);this.revision=stored.revision;this.info={loaded:true,entries:entries.filter(e=>e.active).length,error:null,updatedAt:stored.updatedAt,source:'sqlite',revision:stored.revision};
    }catch{this.info={...this.info,error:'No se pudo cargar la base de respuestas. Revise su configuración.'};}
  })();try{await this.pending;}finally{this.pending=null;}
 }
 lookup(input){return this.compiled.lookup(input);}
 status(){return {...this.info};}
}
