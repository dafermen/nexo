/**
 * NEXO · GUÍA DEL MÓDULO: server/service-guidance.js
 * Guiar la elección de servicio con preguntas breves del catálogo.
 * Entrada: message, center, servicios, state y decisión previa.
 * Salida: Decisión local de orientación o null para continuar con otros manejadores.
 * Estado importante: state.guidance.step indica permit/goal; candidatos se limitan a servicios
 * activos.
 * Efectos y límites: Actualiza contexto de la sesión sin IA ni red. No inventa requisitos del DMV
 * cuando no están aprobados.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {normalize,requestTopicRisk} from './school-filter.js';
import {isSchool} from './business-settings.js';

// A bounded conversation, based only on the currently published catalog.
export function guideService({message,center,services,state,decision,faq}) {
 if(!center||!isSchool(center)||decision.catalogOnly||requestTopicRisk(message,center))return null;
 const q=normalize(message),g=state.guidance||{};
 const local=(text,reason='service_guidance')=>({kind:'local',reason,text});
 if(/^(no gracias|olvidelo|no quiero|cancelar orientacion|empezar de nuevo)$/.test(q)){delete state.guidance;return null;}
 // Explicit facts, bookings and greetings keep their normal handlers.
 if(['approved_guidance','service_schedule','greeting','courtesy','faq','catalog','hours','booking','payment','contact','off_topic','restricted'].includes(decision.reason)&&!decision.interpret)return null;
 const starting=/\b(licencia|licence|license|permiso)\b/.test(q)&&/\b(sacar|obtener|conseguir|empezar|comenzar|no se|primera vez)\b/.test(q);
 const help=/\b(no se (que|cual)|que me recomienda|orienteme|por donde empiezo|por donde empezar)\b/.test(q);
 const practice=/\b(aprender a (manejar|conducir)|practicar (manejo|para|conduccion)|nunca he manejado)\b/.test(q);
 if(!g.step&&!starting&&!help&&!practice)return null;
 if(starting){state.guidance={step:'permit'};return local('Con gusto le ayudo a elegir un servicio. ¿Ya tiene su permiso de aprendizaje?','guidance_question');}
 if(g.step==='permit'){
  if(/^(no|todavia no|aun no|no tengo( el| mi)?( permiso)?( todavia| aun)?|no lo tengo)$/.test(q)){
   state.guidance={step:'goal',permit:false};
   const approved=faq?.lookup({query:'No tengo permiso, ¿puedo hacer el curso?',services,center,state:{serviceId:'cinco-horas'}});
   if(approved?.id==='curso-sin-permiso')return {...local(approved.text),knowledgeAnswer:true};
   return local('Gracias. Los requisitos para iniciar su trámite debe confirmarlos con el personal; no tengo esa información aprobada. ¿Desea información sobre clases o preparación para un examen?','guidance_unknown');
  }
  if(/^(si|si tengo|si lo tengo|ya lo tengo|(si )?(ya )?tengo( el| mi)? permiso( de aprendizaje)?)$/.test(q)){
   state.guidance={step:'goal',permit:true};return local('Gracias. ¿Desea practicar manejo o prepararse para un examen?','guidance_question');
  }
 }
 // Negated or comparative goals need interpretation, not a keyword recommendation.
 if(/\b(no|antes|despues|entre|comparar|diferencia)\b/.test(q)&&!help)return null;
 let candidates=[];
 if(/\b(5|cinco) horas\b/.test(q))candidates=services.filter(s=>/\b(5|cinco) horas\b/.test(normalize(s.name)));
 else if(/\b(teorico|escrito)\b/.test(q))candidates=services.filter(s=>/\b(teorico|escrito)\b/.test(normalize(s.name+' '+s.description)));
 else if(/\b(examen|road test|route test|practico)\b/.test(q))candidates=services.filter(s=>/\b(road test|examen|practica)\b/.test(normalize(s.name)));
 else if(practice||/\b(practicar|manejar|conducir|clases)\b/.test(q))candidates=services.filter(s=>/\b(clase|clases)\b/.test(normalize(s.name)));
 else if(help||!g.step){state.guidance={step:'goal'};return local('¿Desea aprender a manejar, practicar para el examen o información sobre un curso?','guidance_question');}
 else return null; // An unrelated follow-up must not silently become an answer to our question.
 candidates=candidates.filter(s=>s.active!==false);
 if(!candidates.length){delete state.guidance;return local('No tengo un servicio publicado que confirme esa preparación. Consulte con el personal para que le oriente; no quiero ofrecerle algo que aún no está confirmado.','guidance_unknown');}
 if(candidates.length>1){state.guidance={step:'goal'};return local('Puede considerar estos servicios: '+candidates.map(s=>s.name).join('; ')+'. ¿Sobre cuál desea información?','guidance_question');}
 const service=candidates[0];state.serviceId=service.id;delete state.guidance;
 return local('Por lo que me comenta, puede considerar '+service.name+'. '+service.description+' ¿Desea conocer los requisitos o el precio?');
}
