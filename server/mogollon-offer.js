/**
 * NEXO · GUÍA DEL MÓDULO: server/mogollon-offer.js
 * Entrada: catálogo actual, ID de clase práctica y FAQ aprobadas del negocio.
 * Salida: catálogo/FAQ propuestos según el afiche entregado el 27-09-2026.
 * Función pura: conserva IDs existentes y no cambia agendas, citas o credenciales.
 * No se ejecuta al arrancar ni afecta otras instalaciones. Aplicación explícita por script.
 */
import {parseFaq} from './faq.js';
export function mogollonOffer(current,practiceId,source){
 if(['road-test','cinco-horas','cuaderno-preguntas','manual-practico'].includes(practiceId))throw Error('La clase práctica necesita un ID distinto de los demás servicios.');
 if(!current.some(s=>s.id===practiceId&&s.duration===60))throw Error('Revise el servicio de clase práctica de 60 minutos.');
 const base={active:true,currency:'USD',requirements:null,modality:null,duration:null,icon:'document',category:'SERVICIOS INDIVIDUALES'};
 const items=[
  {id:'cuaderno-preguntas',name:'Cuaderno de Preguntas y Respuestas',priceCents:3500,description:'Cuaderno disponible en inglés, español y francés. Obsequio: cita para el DMV y acceso al App. Consulte al personal qué trámite cubre la cita y cómo recibe el acceso.'},
  {id:practiceId,name:'Clase práctica de manejo',priceCents:6000,duration:60,modality:'Presencial',description:'Clase individual de conducción de 60 minutos. Elija día, hora y profesor disponible; confirme sus datos antes de reservar.'},
  {id:'cinco-horas',name:'Curso de Pre-Licencia de 5 Horas (Video)',priceCents:8000,duration:300,modality:'Virtual',description:'Curso de Pre-Licencia de 5 Horas en formato video, según el catálogo de la escuela. Consulte al personal los requisitos y cómo acceder.'},
  {id:'manual-practico',name:'Manual Práctico Método Mogollón',priceCents:8000,description:'Manual Práctico Método Mogollón disponible en inglés, español y francés.'},
  {id:'road-test',name:'Road Test: carro + cita',priceCents:15000,description:'Incluye carro y cita para el Road Test. Este servicio es distinto de la clase práctica de manejo. Coordine fecha y condiciones con el personal.'},
  ...[[5,58500],[10,84500],[15,106500],[20,126000]].map(([count,priceCents])=>({id:'paquete-'+count,name:'Paquete completo de '+count+' clases',category:'PAQUETES COMPLETOS',priceCents,description:'Incluye '+count+' clases prácticas, Curso de Pre-Licencia de 5 Horas (Video), Manual Práctico Método Mogollón, carro y cita para Road Test. Consulte al personal las condiciones del paquete.'}))
 ];
 const ids=new Set(items.map(s=>s.id));
 const services=[...items.map(item=>({...base,...current.find(s=>s.id===item.id),...item,active:true,currency:'USD'})),...current.filter(s=>!ids.has(s.id)).map(s=>s.id==='clases'?{...s,active:false}:s)];
 const entries=parseFaq(source),upsert=entry=>{const index=entries.findIndex(e=>e.id===entry.id);if(index<0)entries.push(entry);else entries[index]=entry;};
 for(const item of items){
  const alias=item.id===practiceId?'clase práctica':item.id==='road-test'?'road test':item.id==='cinco-horas'?'curso de las 5 horas':item.id==='cuaderno-preguntas'?'cuaderno':item.id==='manual-practico'?'manual práctico':item.name.replace(' completo','');
  upsert({id:item.id===practiceId?'practica-precio':item.id+'-precio',active:true,serviceId:item.id,questions:['¿Cuánto cuesta '+alias+'?','Precio '+alias],answer:'{{servicio.nombre}}. {{servicio.precio}}'});
  upsert({id:item.id===practiceId?'practica-detalles':item.id+'-detalles',active:true,serviceId:item.id,questions:[alias,'Información sobre '+alias,'¿Qué incluye '+alias+'?','Me interesa '+alias],answer:'{{servicio.nombre}}. {{servicio.descripcion}} Precio: {{servicio.precio}}'});
 }
 upsert({id:'paquetes-completos',active:true,questions:['¿Qué paquetes tienen?','¿Cuáles son los paquetes completos?','Paquetes','Precios de los paquetes'],answer:'Los paquetes completos incluyen el Curso de Pre-Licencia de 5 Horas (Video), Manual Práctico Método Mogollón, clases prácticas, carro y cita para Road Test. Puede elegir el paquete de 5, 10, 15 o 20 clases. ¿De cuál desea conocer el precio?'});
 upsert({id:'cancelaciones',active:true,questions:['¿Cuál es la política de cancelación?','¿Cómo cancelo mi cita?'],answer:'Solicite al personal la cancelación o el cambio de su cita. Los administradores pueden gestionarla desde Nexo. Consulte con la escuela las condiciones y los plazos; no hay una política de reembolso publicada.'});
 const knowledge=entries.map(e=>'['+e.id+']\nactivo: '+(e.active?'sí':'no')+'\n'+(e.serviceId?'servicio: '+e.serviceId+'\n':'')+e.questions.map(q=>'pregunta: '+q).join('\n')+'\nrespuesta: '+e.answer).join('\n\n')+'\n';
 parseFaq(knowledge);return {services,knowledge};
}
