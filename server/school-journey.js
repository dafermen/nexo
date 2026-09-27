/** NEXO · GUÍA DEL MÓDULO: server/school-journey.js
 * Entrada: consulta normalizada, contexto temporal y conocimiento aprobado.
 * Salida: respuesta local solo si existe la FAQ esperada y su servicio activo.
 * No contiene precios ni requisitos; los textos se mantienen en el editor de FAQ.
 */
export function schoolJourney({q,services,center,state,faq}){
 const course=/\b(5|cinco) horas?|pre licencia|\bel curso\b/.test(q),book=/\b(libro|cuaderno|app)\b/.test(q);
 let id,query,serviceId=null;
 if(/\b(no tengo|sin|todavia no tengo|aun no tengo)\b.{0,30}\b(permiso|permit)\b/.test(q)&&!(/\b(precio|cuesta|horarios)\b/.test(q))){id='curso-sin-permiso';query='No tengo permiso, ¿puedo hacer el curso?';serviceId='cinco-horas';}
 else if(/\b(ya |si )?tengo\b.{0,20}\b(permiso|permit)\b/.test(q)&&!/\b(no|sin)\b/.test(q)&&/\b(ahora|sigue|hago|siguiente)\b/.test(q)){id='proceso-con-permiso';query='Ya tengo mi permiso, ¿qué hago ahora?';}
 else if(course&&/\b(ya|termine|complete|hice|acabe)\b/.test(q)&&/\b(termine|complete|hice|acabe)\b/.test(q)&&!/\b(no|sin)\b/.test(q)){id='proceso-curso-completo';query='Ya terminé las 5 horas, ¿qué sigue?';}
 else if((course||state.serviceId==='cinco-horas')&&/\b(horarios?|que dias?|a que hora|cuando|miercoles|sabados?)\b/.test(q)&&!/\b(clase practica|road test|libro|cuaderno|atencion|abren|cierran|oficina|termina|certificado)\b/.test(q)){id='cinco-horas-horarios';query='Horarios del curso de las 5 horas';serviceId='cinco-horas';}
 else if((book||state.serviceId==='cuaderno-preguntas')&&/\b(incluye|incluido|gratis|asistencia|ayudan con la cita)\b/.test(q)){id='libro-incluye';query='¿Qué incluye el libro?';serviceId='cuaderno-preguntas';}
 else if((book||state.serviceId==='cuaderno-preguntas'||/dmv/.test(q))&&/\b(garantiza|garantizan|tarifas|fecha especifica)\b/.test(q)){id='libro-alcance';query='¿Qué cubre la asistencia para la cita?';serviceId='cuaderno-preguntas';}
 if(!id)return null;
 if(serviceId&&!services.some(s=>s.id===serviceId&&s.active!==false))return null;
 const answer=faq?.lookup({query,services,center,state:{...state,serviceId:serviceId||state.serviceId}});
 if(answer?.id!==id)return null;
 state.serviceId=serviceId;
 // Cambiar de etapa invalida una orientación antigua; no deja preguntas pendientes.
 delete state.guidance;state.pendingFacts=null;state.lastIntent=null;
 return answer;
}
