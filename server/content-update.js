/** NEXO · GUÍA DEL MÓDULO: server/content-update.js
 * Entrada: SQLite existente y paquete comercial autorizado con ID único.
 * Salida: propuesta o actualización atómica de catálogo y FAQs; sin contactos externos.
 * Un registro de aplicación impide sobrescribir ediciones posteriores al repetir el paquete.
 * Solo modifica servicios/temas expresamente nombrados; conserva agenda, alumnos y categorías.
 */
import {createHash} from 'node:crypto';
import {parseFaq} from './faq.js';
import {serializeFaq} from './faq-editor.js';
import {validateService} from './center.js';
export function applyContentUpdate(db,bundle,{apply=false}={}){
 if(bundle.businessId!=='metodomogollon'||!/^[a-z0-9-]{1,100}$/.test(bundle.id))throw Error('Paquete comercial inválido.');
 const hash=createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
 const hasTable=db.prepare("SELECT name FROM sqlite_master WHERE name='content_updates'").get();
 const previous=hasTable&&db.prepare('SELECT hash FROM content_updates WHERE id=?').get(bundle.id);
 if(previous){if(previous.hash!==hash)throw Error('El paquete aplicado cambió. Cree una nueva versión.');return {alreadyApplied:true,id:bundle.id};}
 db.exec('BEGIN IMMEDIATE');
 try{
  const row=db.prepare('SELECT * FROM center_settings WHERE id=1').get(),knowledge=db.prepare("SELECT * FROM knowledge_bases WHERE id='school'").get();
  if(!row||!knowledge)throw Error('Inicialice primero el catálogo y las FAQ escolares.');
  const document=JSON.parse(row.document);
  if(document.configuration?.assistant.knowledgeMode!=='file')throw Error('La base escolar no está activa.');
  const services=document.services.map(s=>({...s})),entries=parseFaq(knowledge.source);
  for(const change of bundle.services){const target=services.find(s=>s.id===change.id);if(!target)throw Error('Servicio inexistente: '+change.id);
   const allowed=['name','description','requirements','schedule','inclusions','conditions','priceCents','duration'];
   if(Object.keys(change.patch).some(k=>!allowed.includes(k)))throw Error('Campo comercial no permitido.');
   for(const [key,value] of Object.entries(change.patch)){if(['priceCents','duration'].includes(key)){if(!Number.isSafeInteger(value)||value<0)throw Error('Valor comercial inválido.');}else if(typeof value!=='string'||!value.trim()||value.length>1500)throw Error('Texto comercial inválido.');}
   const merged={...target,...change.patch};
   const input=Object.fromEntries(['name','description','requirements','schedule','inclusions','conditions','priceCents','duration','modality','active'].map(key=>[key,merged[key]??null]));
   Object.assign(target,validateService(input,target,target.currency));
  }
  for(const entry of bundle.faqs){if(entry.serviceId&&!services.some(s=>s.id===entry.serviceId))throw Error('FAQ sin servicio válido.');const index=entries.findIndex(e=>e.id===entry.id);if(index<0)entries.push(entry);else entries[index]={...entries[index],...entry};}
  const source=serializeFaq(entries),now=new Date().toISOString();
  if(apply){
   db.exec('CREATE TABLE IF NOT EXISTS content_updates(id TEXT PRIMARY KEY,hash TEXT NOT NULL,appliedAt TEXT NOT NULL) STRICT');
   db.prepare('UPDATE center_settings SET document=?,revision=revision+1,updatedAt=? WHERE id=1').run(JSON.stringify({...document,services}),now);
   db.prepare("UPDATE knowledge_bases SET source=?,revision=revision+1,updatedAt=? WHERE id='school'").run(source,now);
   db.prepare('INSERT INTO content_updates VALUES(?,?,?)').run(bundle.id,hash,now);
   db.prepare('INSERT INTO audit_events(action,entityId,createdAt) VALUES(?,?,?)').run('content.applied',bundle.id,now);
  }
  db.exec(apply?'COMMIT':'ROLLBACK');
  return {applied:apply,id:bundle.id,services:bundle.services.map(s=>s.id),topics:bundle.faqs.length,agendaUnchanged:true};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
