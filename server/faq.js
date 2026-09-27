/**
 * NEXO · GUÍA DEL MÓDULO: server/faq.js
 * Leer el formato de preguntas frecuentes y preparar búsquedas locales.
 * Entrada: Texto por bloques [id], entradas parseadas y consulta con catálogo/contexto.
 * Salida: Entradas, índice con lookup, coincidencia resuelta, ambiguous o null.
 * Estado importante: exact busca frases; index relaciona palabras; fields limita parámetros;
 * signature evita recompilar un archivo sin cambios.
 * Efectos y límites: parseFaq valida y compileFaq no hace red. FileFaqRepository lee disco; el
 * arranque actual utiliza la variante SQLite.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {stat,readFile} from 'node:fs/promises';
import {normalize} from './school-filter.js';

const fields=new Set(['centro.nombre','centro.horario','centro.saludo','centro.turnos','centro.servicios','servicio.nombre','servicio.descripcion','servicio.precio','servicio.duracion','servicio.modalidad','servicio.requisitos','servicio.horarios','servicio.incluye','servicio.condiciones']);
const cleanQuery=text=>normalize(text).replace(/^(por favor |me puede decir |puede decirme |quisiera saber |quiero saber )/,'').replace(/ (por favor|gracias)$/,'').trim();
const noise=new Set('a al con cual cuales cuando cuanto de del el en es esta este la las lo los me mi para por que se su un una y saber puede decirme tienen tiene'.split(' '));
const tokens=q=>[...new Set(cleanQuery(q).split(' ').filter(w=>!noise.has(w)).map(w=>w==='5'?'cinco':w==='route'?'road':w))];
const bad=(line,message)=>{throw new Error(`Línea ${line}: ${message}`);};

/**
 * parseFaq: Recorre bloques del formato FAQ y rechaza campos, identificadores o plantillas no
 * permitidos.
 * Entrada (firma real): source.
 * Salida: Array de entradas con preguntas, respuesta, servicio y número de línea.
 */
export function parseFaq(source) {
 if(Buffer.byteLength(source,'utf8')>4*1024*1024)throw new Error('El archivo supera 4 MB.');
 const entries=[],ids=new Set();let entry=null,lastField=null;
 function finish(){
  if(!entry)return;
  if(!entry.questions.length||!entry.answer)bad(entry.line,'cada tema necesita una pregunta y una respuesta.');
  if(entry.answer.length>1500)bad(entry.line,'la respuesta supera 1500 caracteres.');
  const remaining=entry.answer.replace(/\{\{([^{}]+)\}\}/g,(_,key)=>{
   key=key.trim();if(!fields.has(key))bad(entry.line,'parámetro desconocido: '+key);
   if(key.startsWith('servicio.')&&!entry.serviceId)bad(entry.line,'los parámetros de servicio requieren el campo servicio.');
   return '';
  });
  if(/[{}]/.test(remaining))bad(entry.line,'revise las llaves de los parámetros.');
  entries.push(entry);if(entries.length>5000)bad(entry.line,'se permiten hasta 5000 temas.');entry=null;
 }
 for(const [offset,raw] of source.replace(/^\ufeff/,'').split(/\r?\n/).entries()){
  const line=offset+1,text=raw.trim();if(!text||text.startsWith('#'))continue;
  const header=text.match(/^\[([a-z0-9][a-z0-9-]{0,79})\]$/);
  if(header){finish();if(ids.has(header[1]))bad(line,'identificador repetido.');ids.add(header[1]);entry={id:header[1],questions:[],answer:'',active:true,serviceId:null,line};lastField=null;continue;}
  if(!entry)bad(line,'empiece el tema con [identificador].');
  const field=text.match(/^(pregunta|respuesta|servicio|activo|categoria):\s*(.*)$/i);
  if(!field){if(/^\s{2,}/.test(raw)&&lastField==='respuesta'){entry.answer+=' '+text;continue;}bad(line,'campo desconocido; use pregunta, respuesta, servicio, categoria o activo.');}
  const [,name,value]=field,key=name.toLowerCase();
  if(!value)bad(line,'el campo no puede estar vacío.');
  if(key==='pregunta'){if(value.length>250||entry.questions.length>=20)bad(line,'máximo 20 preguntas de 250 caracteres por tema.');entry.questions.push(value);}
  if(key==='respuesta'){if(entry.answer)bad(line,'use una sola respuesta por tema.');entry.answer=value;}
  if(key==='servicio'){if(entry.serviceId||!/^[a-zA-Z0-9-]{1,80}$/.test(value))bad(line,'servicio inválido o repetido.');entry.serviceId=value;}
  if(key==='categoria'){if(entry.category||value.length>60)bad(line,'categoría inválida: máximo 60 caracteres, una vez por tema.');entry.category=value;}
  if(key==='activo'){if(entry.hasActive||!['si','no'].includes(normalize(value)))bad(line,'activo debe ser sí o no, una sola vez.');entry.hasActive=true;entry.active=normalize(value)==='si';}
  lastField=key;
 }
 finish();if(!entries.length)bad(1,'el archivo debe incluir al menos un tema; para desactivar use activo: no.');return entries;
}

/**
 * compileFaq: Construye mapas de frases y palabras para evitar recorrer todo el catálogo por
 * consulta.
 * Entrada (firma real): entries.
 * Salida: {entries, lookup}; no modifica la base de datos.
 */
export function compileFaq(entries) {
 const variants=[],exact=new Map(),index=new Map();
 for(const entry of entries.filter(e=>e.active))for(const question of entry.questions){
  const q=cleanQuery(question),words=new Set(tokens(q)),i=variants.length;variants.push({entry,words});
  if(!exact.has(q))exact.set(q,[]);exact.get(q).push(i);
  for(const word of words){if(!index.has(word))index.set(word,new Set());index.get(word).add(i);}
 }
 return {entries,
/**
 * lookup: Compara consulta y contexto con entradas activas, resuelve parámetros usando hechos
 * vigentes y evita elegir empates.
 * Entrada (firma real): {query,services,center,state,matchedServiceIds=[]}.
 * Salida: {text,id,serviceId}, {ambiguous:true} o null; no invoca IA.
 */
lookup({query,services,center,state,matchedServiceIds=[]}){
  const q=cleanQuery(query),words=tokens(q),exactHits=exact.get(q);
  let hits=exactHits?.map(i=>({i,score:2}))||[];
  if(!hits.length&&words.length>=2){
   const lists=words.map(w=>index.get(w));
   if(lists.every(Boolean))for(const i of [...lists.reduce((a,b)=>a.size<b.size?a:b)]){
    const v=variants[i];if(words.every(w=>v.words.has(w))&&words.length/v.words.size>=0.7)hits.push({i,score:words.length/v.words.size});
   }
  }
  const candidates=new Map();
  for(const hit of hits){const entry=variants[hit.i].entry;
   if(entry.serviceId){
    if(!services.some(s=>s.id===entry.serviceId&&s.active!==false))continue;
    if(matchedServiceIds.length&&!matchedServiceIds.includes(entry.serviceId))continue;
    if(words.length<2&&state.serviceId!==entry.serviceId)continue;
   }
   const previous=candidates.get(entry.id);if(!previous||previous.score<hit.score)candidates.set(entry.id,{...hit,entry});
  }
  const ranked=[...candidates.values()].sort((a,b)=>b.score-a.score);
  if(!ranked.length)return null;
  if(ranked[1]&&ranked[0].score-ranked[1].score<0.12)return {ambiguous:true};
  const {entry}=ranked[0],service=services.find(s=>s.id===entry.serviceId);
  const values={
   'centro.nombre':center.name,'centro.horario':center.hours,'centro.saludo':center.greeting,'centro.turnos':center.booking.message,
   'centro.servicios':services.map(s=>s.name).join('; '),
   'servicio.horarios':service?.schedule||'Horarios del servicio pendientes de confirmar con el personal.',
   'servicio.incluye':service?.inclusions||'Contenido del servicio pendiente de confirmar con el personal.',
   'servicio.condiciones':service?.conditions||'Condiciones pendientes de confirmar con el personal.',
   'servicio.nombre':service?.name,'servicio.descripcion':service?.description,
   'servicio.precio':service?.priceCents==null?'Precio pendiente de confirmar con el personal.':service.priceCents===0?'Este servicio es sin costo.':`${(service.priceCents/100).toFixed(2)} ${service.currency}`,
   'servicio.duracion':service?.duration==null?'Duración pendiente de confirmar.':`${service.duration} minutos`,
   'servicio.modalidad':service?.modality||'Modalidad pendiente de confirmar con la escuela.',
   'servicio.requisitos':service?.requirements||'Requisitos pendientes de confirmar con la escuela.',
  };
  const text=entry.answer.replace(/\{\{([^{}]+)\}\}/g,(_,key)=>values[key.trim()]??'Dato pendiente de confirmar.');
  if(text.length>2500)return null;
  return {text,id:entry.id,serviceId:entry.serviceId};
 }};
}

export class FileFaqRepository {
 constructor(path){this.path=path;this.compiled=compileFaq([]);this.signature=null;this.info={loaded:false,entries:0,error:null,updatedAt:null};this.pending=null;}
 async refresh(){
  if(this.pending)return this.pending;
  this.pending=(async()=>{try{
   const s=await stat(this.path),signature=`${s.mtimeMs}:${s.ctimeMs}:${s.size}`;
   if(signature===this.signature)return;
   this.signature=signature;
   if(s.size>4*1024*1024)throw new Error('El archivo supera 4 MB.');
   const parsed=parseFaq(await readFile(this.path,'utf8'));
   this.compiled=compileFaq(parsed);this.info={loaded:true,entries:parsed.filter(e=>e.active).length,error:null,updatedAt:new Date().toISOString()};
  }catch(error){this.info={...this.info,error:error.code==='ENOENT'?'No se encuentra preguntas-frecuentes.txt.':error.code?'No se pudo leer preguntas-frecuentes.txt.':error.message};}})();
  try{await this.pending;}finally{this.pending=null;}
 }
 /**
  * lookup: Compara consulta y contexto con entradas activas, resuelve parámetros usando hechos
  * vigentes y evita elegir empates.
  * Entrada (firma real): input.
  * Salida: {text,id,serviceId}, {ambiguous:true} o null; no invoca IA.
  */
 lookup(input){return this.compiled.lookup(input);}
 status(){return {...this.info};}
}
