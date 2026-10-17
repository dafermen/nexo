/** NEXO · GUÍA DEL MÓDULO: server/mogollon-current.js
 * Entrada: borrador comercial de la escuela. Salida: propuesta basada en MM-03 a MM-08.
 * Función pura; no publica ni cambia agenda. Reemplaza respuestas escolares históricas
 * por una base conservadora, conservando los originales en versiones de publicación.
 */
import {serializeFaq} from './faq-editor.js';
export function currentMogollon(document){
 const services=structuredClone(document.services);
 const practice=services.find(s=>s.duration===60&&/clase|pr[aá]ctica/i.test(s.name));
 for(const s of services){
  s.priceCents=null;s.components=[];s.sourceRef='MM-20261017';
  if(s.id==='cinco-horas')Object.assign(s,{name:'Curso de Prelicencia de Cinco Horas',modality:null,publication:'information',description:'Orientación sobre el curso de seguridad vial previo al Road Test. El curso es teórico y no sustituye las clases prácticas.',requirements:'Contar con permiso de aprendizaje de Nueva York. Los casos particulares requieren verificación por el personal.',schedule:'Días, horarios, modalidad y lugar pendientes de confirmación.',conditions:'Precio, inscripción, asistencia, cancelación y certificación deben confirmarse con un asesor.',inclusions:null});
  else if(s.id==='cuaderno-preguntas')Object.assign(s,{name:'Paquete de preparación para el permiso de aprendizaje',publication:'information',priceCents:3500,description:'Preparación y acompañamiento para el permiso. Incluye un cuadernillo en el idioma elegido, formulario MV-44, apoyo con la cita del DMV y simulador de estudio web.',inclusions:'Un cuadernillo en español, inglés o francés; formulario MV-44 en ese idioma; apoyo para programar la cita DMV; acceso al simulador web en tres idiomas.',conditions:'Un solo cuadernillo por paquete. La escuela orienta; el DMV decide la elegibilidad y emite el permiso. Consulte al personal la disponibilidad del material. No se garantiza fecha ni aprobación.',schedule:null,components:['Cuadernillo en un idioma','Formulario MV-44','Apoyo para cita DMV','Simulador web'].map(name=>({name,units:1,serviceId:null,allocatedCents:null}))});
  else if(/^paquete-(5|10|15|20)$/.test(s.id)){const units=Number(s.id.split('-')[1]);Object.assign(s,{name:'Paquete de '+units+' clases',publication:'information',duration:null,modality:null,description:units+' clases de 60 minutos. La preparación se adapta al ritmo y necesidades del estudiante; la cantidad no garantiza aprobar.',inclusions:units+' clases prácticas. Otros beneficios integrales requieren aprobación.',conditions:'Precio por confirmar. Puede elegir libremente; un asesor puede orientar sin imponer una compra.',schedule:null,components:[{name:'Clase práctica de 60 minutos',units,serviceId:practice?.id||null,allocatedCents:null}]});}
  else if(s.id==='road-test')Object.assign(s,{publication:'information',description:'Orientación sobre preparación, vehículo y acompañamiento para el Road Test.',inclusions:'Alcance del servicio por confirmar con el personal.',schedule:null,conditions:'Tarifas, disponibilidad y políticas por confirmar. Solicite al personal cualquier cambio de un servicio del Road Test gestionado por la escuela.'});
  else if(s.duration===60&&/clase|pr[aá]ctica/i.test(s.name))Object.assign(s,{publication:'published',description:'Clase práctica de 60 minutos adaptada a su experiencia y necesidades. Trabajamos habilidades y conducción segura; no se garantiza una cantidad suficiente de clases ni aprobar.',conditions:'Precio por confirmar. Con permiso y sin licencia se utiliza vehículo escolar. Vehículo particular sujeto a licencia y revisión de seguridad y cobertura.',inclusions:'Práctica guiada según sus necesidades.',modality:'Presencial'});
  else Object.assign(s,{publication:'information',conditions:'Precio y condiciones vigentes por confirmar con un asesor.'});
 }
 const entries=[
 ['curso-orientacion','cinco-horas',['Información del curso de cinco horas','Me interesa el curso de las 5 horas'],'{{servicio.descripcion}} ¿Ya tiene su permiso de aprendizaje de Nueva York?'],
 ['curso-horarios','cinco-horas',['Horarios del curso de las 5 horas','¿Qué días tienen el curso?'],'{{servicio.horarios}}'],
 ['curso-precio','cinco-horas',['¿Cuánto cuesta el curso de las cinco horas?'],'El precio del curso está pendiente de confirmación. Puede consultar al personal.'],
 ['curso-permiso','cinco-horas',['No tengo permiso, ¿puedo hacer el curso?'],'Para inscribirse primero necesita el permiso de aprendizaje de Nueva York. Podemos orientarle sobre el paquete de preparación y el simulador web.'],
 ['paquete-preparacion','cuaderno-preguntas',['¿Qué incluye el libro?','¿Qué incluye el paquete de 35?'],'{{servicio.incluye}} El precio es {{servicio.precio}}.'],
 ['paquete-idiomas','cuaderno-preguntas',['¿Incluye tres libros?','¿En qué idiomas está el libro?'],'Incluye un solo cuadernillo en el idioma elegido: español, inglés o francés, con el formulario correspondiente. Consulte al personal la disponibilidad.'],
 ['simulador-web',null,['¿Tienen simulador?','¿Cuál es la app?'],'El simulador de estudio está disponible desde el sitio web: {{centro.simulador}}. El simulador de conducción es una propuesta pendiente.'],
 ['sitio-web',null,['¿Cuál es la página web?'],'Puede consultar el sitio del negocio: {{centro.web}}.'],
 ['adicionales',null,['¿Puedo comprar clases adicionales?','¿Y si no me alcanzan las clases?'],'Puede adquirir clases adicionales con la tarifa de clases de su paquete dentro de los 30 días posteriores a su última clase del paquete. Cada adicional se utiliza dentro de los 30 días de su compra. Un asesor confirma el valor; no se divide el precio integral del paquete.'],
 ['opciones-paquetes',null,['¿Qué paquetes tienen?','¿Cuál paquete debo elegir?'],'Hay opciones de 5, 10, 15 y 20 clases de una hora. La elección depende de su experiencia y ritmo; los precios y beneficios integrales deben confirmarse. ¿Ha conducido en Estados Unidos, en su país o está comenzando?'],
 ['road-cambios','road-test',['Quiero cancelar mi Road Test','Quiero cambiar mi Road Test'],'Los cambios de servicios del Road Test gestionados por la escuela deben solicitarse al personal. Nexo no cancela automáticamente citas del DMV.'],
 ];
 // No asociar preguntas a IDs que no existen en una instalación antigua.
 const ids=new Set(services.map(s=>s.id));
 return {...document,services,knowledgeSource:serializeFaq(entries.filter(e=>!e[1]||ids.has(e[1])).map(([id,serviceId,questions,answer])=>({id,serviceId,questions,answer,active:true,category:'Manual octubre 2026'})))};
}
