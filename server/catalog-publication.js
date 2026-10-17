/** NEXO · GUÍA DEL MÓDULO: server/catalog-publication.js
 * Entrada: SQLite, catálogo propuesto y actor autenticado. Salida: borradores y versiones.
 * Mantiene borradores privados; publicar valida revisiones y escribe catálogo/FAQ atómicamente.
 * Las versiones guardan datos comerciales, nunca secretos ni expedientes. Restaurar crea borrador.
 */
import {randomUUID} from 'node:crypto';
import {HttpError} from './errors.js';
import {validateService} from './center.js';
import {parseFaq} from './faq.js';
const fail=(code,message)=>{throw new HttpError(code,message);};
const text=(v,max,required=true)=>typeof v==='string'&&v.length<=max&&(!required||v.trim())?v.trim():fail(400,'Revise el texto y su longitud.');
const manager=actor=>{if(!['owner','manager'].includes(actor?.role))fail(403,'Se requiere permiso de gerencia.');};
const rev=(r,n)=>{if(!Number.isSafeInteger(n)||r.revision!==n)fail(409,'Los datos cambiaron. Actualice antes de continuar.');};
export function validateComponents(value=[]){
 if(!Array.isArray(value)||value.length>20)fail(400,'Se permiten hasta 20 componentes.');
 return value.map(c=>{
  if(!c||Object.keys(c).some(k=>!['name','units','serviceId','allocatedCents'].includes(k)))fail(400,'Componente inválido.');
  if(!Number.isSafeInteger(c.units)||c.units<1||c.units>500)fail(400,'Unidades inválidas.');
  if(c.allocatedCents!=null&&(!Number.isSafeInteger(c.allocatedCents)||c.allocatedCents<0))fail(400,'Importe del componente inválido.');
  return {name:text(c.name,120),units:c.units,serviceId:c.serviceId?text(c.serviceId,100):null,allocatedCents:c.allocatedCents??null};
 });
}
export function createPublicationStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS catalog_drafts(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,status TEXT NOT NULL,document TEXT NOT NULL,baseRevision INTEGER NOT NULL,knowledgeRevision INTEGER NOT NULL,businessType TEXT NOT NULL,source TEXT NOT NULL,actor TEXT NOT NULL,approvedBy TEXT,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS catalog_versions(id TEXT PRIMARY KEY,draftId TEXT NOT NULL,document TEXT NOT NULL,actor TEXT NOT NULL,source TEXT NOT NULL,createdAt TEXT NOT NULL,businessType TEXT NOT NULL) STRICT;`);
 const state=()=>{const r=db.prepare('SELECT * FROM center_settings WHERE id=1').get();if(!r)fail(409,'Configure primero el negocio.');return {...JSON.parse(r.document),revision:r.revision};};
 const knowledge=()=>db.prepare("SELECT * FROM knowledge_bases WHERE id='school'").get();
 const payload=()=>{const s=state(),k=knowledge();return {services:s.services,knowledgeSource:s.configuration.assistant.knowledgeMode==='file'?(k?.source||''):s.configuration.assistant.knowledgeText||'',knowledgeMode:s.configuration.assistant.knowledgeMode};};
 const read=id=>{const r=db.prepare('SELECT * FROM catalog_drafts WHERE id=?').get(id);if(!r||r.businessType!==state().configuration.business.type)fail(404,'Borrador no encontrado.');const document=JSON.parse(r.document);return {...r,document,entries:document.knowledgeMode==='file'?parseFaq(document.knowledgeSource):[]};};
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 const validate=(input,s)=>{
  if(!input||Object.keys(input).some(k=>!['services','knowledgeSource','knowledgeMode'].includes(k)))fail(400,'Documento inválido.');
  if(!Array.isArray(input.services)||input.services.length>50)fail(400,'Catálogo inválido.');
  if(input.knowledgeMode!==s.configuration.assistant.knowledgeMode)fail(409,'Cambió el modo de respuestas. Cree otro borrador.');
  const ids=new Set();
  const services=input.services.map(item=>{
   if(typeof item.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(item.id)||ids.has(item.id))fail(400,'Identificador de servicio inválido o repetido.');ids.add(item.id);
   const prior=s.services.find(v=>v.id===item.id)||{id:item.id};
   const fields=['name','description','duration','priceCents','requirements','modality','active','schedule','inclusions','conditions'];
   const clean=validateService(Object.fromEntries(fields.map(k=>[k,item[k]??(k==='active'?false:null)])),prior,s.configuration.business.currency);
   const components=validateComponents(item.components||[]);const linked=components.filter(c=>c.serviceId).map(c=>c.serviceId);if(new Set(linked).size!==linked.length)fail(400,'Agrupe las unidades de cada servicio en un solo componente.');
   const publication=item.publication||'published';if(!['published','information','withdrawn'].includes(publication))fail(400,'Estado comercial inválido.');
   const componentTotal=components.reduce((n,c)=>n+(c.allocatedCents||0),0);if(clean.priceCents!==null&&componentTotal>clean.priceCents)fail(400,'Los componentes superan el precio del paquete.');
   return {...clean,components,publication,sourceRef:item.sourceRef?text(item.sourceRef,200):null,contentVersion:(prior.contentVersion||0)+1,active:publication==='withdrawn'?false:clean.active};
  });
  for(const v of services)for(const c of v.components)if(c.serviceId&&!ids.has(c.serviceId))fail(400,'Un componente referencia un servicio inexistente.');
  const source=text(input.knowledgeSource,4*1024*1024,false);let entries;try{entries=input.knowledgeMode==='file'?parseFaq(source):[];}catch(e){fail(400,e.message);}
  for(const e of entries)if(e.serviceId&&!ids.has(e.serviceId))fail(400,'Una respuesta referencia un servicio inexistente.');
  if(input.knowledgeMode==='custom'&&source.length>8000)fail(400,'Las respuestas propias admiten 8.000 caracteres.');
  return {services,knowledgeSource:source,knowledgeMode:input.knowledgeMode};
 };
 return {
  publicationOverview(actor){manager(actor);const s=state();return {current:payload(),businessType:s.configuration.business.type,revision:s.revision,drafts:db.prepare('SELECT id,revision,status,source,actor,approvedBy,createdAt,updatedAt FROM catalog_drafts WHERE businessType=? ORDER BY updatedAt DESC LIMIT 100').all(s.configuration.business.type),versions:db.prepare('SELECT id,draftId,actor,source,createdAt FROM catalog_versions WHERE businessType=? ORDER BY rowid DESC LIMIT 100').all(s.configuration.business.type)};},
  publicationRead(id,actor){manager(actor);return read(id);},
  publicationCreate(input,actor){manager(actor);return transaction(()=>{const s=state();if(input.revision!==s.revision)fail(409,'Actualice el catálogo antes de crear el borrador.');const id=randomUUID(),now=new Date().toISOString(),document=validate(input.document||payload(),s);db.prepare('INSERT INTO catalog_drafts VALUES(?,1,?,?,?,?,?,?,?,NULL,?,?)').run(id,'draft',JSON.stringify(document),s.revision,knowledge()?.revision||0,s.configuration.business.type,text(input.source,500),actor.email,now,now);return read(id);});},
  publicationSave(id,input,actor){manager(actor);return transaction(()=>{const d=read(id);rev(d,input.revision);if(d.status==='published')fail(409,'Cree otro borrador para editar una publicación.');const document=validate(input.document,state());db.prepare("UPDATE catalog_drafts SET document=?,source=?,revision=revision+1,status='draft',approvedBy=NULL,actor=?,updatedAt=? WHERE id=?").run(JSON.stringify(document),text(input.source,500),actor.email,new Date().toISOString(),id);return read(id);});},
  publicationApprove(id,input,actor){manager(actor);return transaction(()=>{const d=read(id);rev(d,input.revision);if(d.status!=='draft')fail(409,'Solo se aprueban borradores.');validate(d.document,state());db.prepare("UPDATE catalog_drafts SET status='approved',approvedBy=?,revision=revision+1,updatedAt=? WHERE id=?").run(actor.email,new Date().toISOString(),id);return read(id);});},
  publicationPublish(id,input,actor){manager(actor);return transaction(()=>{
   const d=read(id);rev(d,input.revision);if(d.status!=='approved')fail(409,'Revise y apruebe el borrador antes de publicar.');const s=state(),k=knowledge();
   if(s.revision!==d.baseRevision||(k?.revision||0)!==d.knowledgeRevision||s.configuration.business.type!==d.businessType)fail(409,'El contenido activo cambió. Cree un nuevo borrador para no sobrescribir cambios.');
   const document=validate(d.document,s),now=new Date().toISOString();
   // También conserva la versión previa para recuperación sin restaurar expedientes.
   db.prepare('INSERT INTO catalog_versions VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,JSON.stringify(payload()),actor.email,'Antes de publicar: '+d.source,now,d.businessType);
   s.services=document.services;s.configurationRevision=(s.configurationRevision||0)+1;
   if(document.knowledgeMode==='file'){if(!k)fail(409,'Inicialice las respuestas escolares.');db.prepare("UPDATE knowledge_bases SET source=?,revision=revision+1,updatedAt=? WHERE id='school'").run(document.knowledgeSource,now);}
   else if(document.knowledgeMode==='custom')s.configuration.assistant.knowledgeText=document.knowledgeSource;
   delete s.revision;db.prepare('UPDATE center_settings SET document=?,revision=revision+1,updatedAt=? WHERE id=1').run(JSON.stringify(s),now);
   db.prepare('INSERT INTO catalog_versions VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,JSON.stringify(document),actor.email,d.source,now,d.businessType);
   db.prepare("UPDATE catalog_drafts SET status='published',revision=revision+1,updatedAt=? WHERE id=?").run(now,id);
   db.prepare('INSERT INTO audit_events(action,entityId,createdAt) VALUES(?,?,?)').run('catalog.published',id+':'+actor.email,now);return read(id);
  });},
  publicationRestore(id,input,actor){manager(actor);const v=db.prepare('SELECT * FROM catalog_versions WHERE id=?').get(id);if(!v||v.businessType!==state().configuration.business.type)fail(404,'Versión no encontrada.');return this.publicationCreate({revision:input.revision,source:'Restauración propuesta: '+v.source,document:JSON.parse(v.document)},actor);}
 };
}
