/** NEXO · GUÍA DEL MÓDULO: server/faq-editor.js
 * Entrada: borradores estructurados sin confianza del editor administrativo.
 * Salida: formato FAQ validado y vista previa usando el catálogo vigente.
 * No guarda ni llama proveedores; rechaza inyección de bloques por saltos de línea.
 */
import {parseFaq,compileFaq} from './faq.js';
export function serializeFaq(entries){
 if(!Array.isArray(entries)||entries.length<1||entries.length>5000)throw Error('Mantenga entre 1 y 5.000 temas. Puede desactivarlos sin eliminarlos.');
 const line=(value,label,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\r\n\0]/.test(value))throw Error(label+' inválido.');return value.trim();};
 const source=entries.map(e=>{
  if(!e||typeof e!=='object'||typeof e.active!=='boolean')throw Error('Tema inválido.');
  const id=line(e.id,'Identificador',80);if(!/^[a-z0-9][a-z0-9-]*$/.test(id))throw Error('El identificador usa letras minúsculas, números y guiones.');
  if(!Array.isArray(e.questions)||!e.questions.length||e.questions.length>20)throw Error('Incluya entre 1 y 20 preguntas por tema.');
  const category=line(e.category||'General','Categoría',60);
  const service=e.serviceId==null||e.serviceId===''?'':line(e.serviceId,'Servicio',80);
  const answer=line(e.answer,'Respuesta',1500);
  return '['+id+']\nactivo: '+(e.active?'sí':'no')+'\ncategoria: '+category+'\n'+(service?'servicio: '+service+'\n':'')+e.questions.map(q=>'pregunta: '+line(q,'Pregunta',250)).join('\n')+'\nrespuesta: '+answer;
 }).join('\n\n')+'\n';parseFaq(source);return source;
}
export function previewFaq(entry,services,center){
 const [parsed]=parseFaq(serializeFaq([entry]));
 if(parsed.serviceId&&!services.some(s=>s.id===parsed.serviceId))throw Error('Seleccione un servicio existente.');
 const selected=services.find(s=>s.id===parsed.serviceId);
 const result=compileFaq([{...parsed,active:true}]).lookup({query:parsed.questions[0],services:services.map(s=>({...s,active:true})),center,state:{serviceId:parsed.serviceId}});
 if(!result?.text)throw Error('No se pudo preparar la vista previa.');
 return {text:result.text,warning:!parsed.active?'Este tema está pausado y no responderá a visitantes.':selected?.active===false?'El servicio está inactivo; esta respuesta no se ofrece a visitantes.':null};
}
