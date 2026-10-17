/** NEXO · GUÍA DEL MÓDULO: server/conversation-process.js
 * Entrada: mensaje, idioma, perfil, catálogo y memoria temporal del visitante.
 * Salida: orientación local o null para continuar al filtro/agenda. Nunca reserva ni lee expedientes.
 * El registro por perfil separa los procesos escolares; solo opera sobre contenido versionado.
 */
import {businessProfile} from './business-profile.js';
import {requestTopicRisk} from './school-filter.js';
const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[¿?¡!.']/g,' ').replace(/\s+/g,' ').trim();
const say=(key,language)=>texts[key][language==='en'?1:language==='fr'?2:0];
const texts={
 permit:['¿Ya tiene su permiso de aprendizaje de Nueva York?','Do you already have your New York learner permit?','Avez-vous déjà votre permis d’apprentissage de New York ?'],
 course:['El curso ofrece orientación sobre seguridad vial. Precio, horarios, modalidad e inscripción están por confirmar con un asesor.','The course covers road safety. Price, schedule, format and enrollment need to be confirmed with an advisor.','Le cours porte sur la sécurité routière. Le prix, les horaires, la modalité et l’inscription doivent être confirmés avec un conseiller.'],
 noPermit:['El primer paso es obtener su permiso de aprendizaje. Podemos orientarle sobre el paquete de preparación y el simulador de estudio web. ¿Desea conocer qué incluye?','The first step is obtaining your learner permit. We can explain the preparation package and web study simulator. Would you like to know what is included?','La première étape est d’obtenir votre permis d’apprentissage. Nous pouvons présenter le forfait de préparation et le simulateur sur le site web. Souhaitez-vous connaître son contenu ?'],
 yesPermit:['Gracias. Un asesor puede ayudarle con la inscripción cuando estén confirmadas las condiciones del curso. También puede consultar las clases prácticas.','Thank you. An advisor can help with enrollment once the course conditions are confirmed. You can also ask about driving lessons.','Merci. Un conseiller pourra vous aider pour l’inscription lorsque les conditions du cours seront confirmées. Vous pouvez aussi vous renseigner sur les leçons pratiques.'],
 preparation:['El paquete cuesta US$35 e incluye un cuadernillo en un idioma (español, inglés o francés), el formulario MV-44 correspondiente, apoyo para programar la cita DMV y acceso al simulador web. El DMV decide la elegibilidad; no se garantiza fecha ni aprobación.','The US$35 package includes one booklet in Spanish, English or French, the corresponding MV-44 form, help scheduling a DMV appointment and access to the web study simulator. The DMV determines eligibility; no date or passing result is guaranteed.','Le forfait à 35 USD comprend un livret en espagnol, anglais ou français, le formulaire MV-44 correspondant, une aide pour le rendez-vous au DMV et l’accès au simulateur web. Le DMV décide de l’admissibilité ; aucune date ni réussite n’est garantie.'],
 packages:['Tenemos opciones de 5, 10, 15 y 20 clases de una hora. Todas trabajan habilidades fundamentales a su ritmo; el precio y los beneficios integrales deben confirmarse. ¿Ha conducido en Estados Unidos, en su país o está comenzando?','We offer 5, 10, 15 and 20 one-hour lessons. All cover essential skills at your pace; prices and additional benefits need confirmation. Have you driven in the United States, in your home country, or are you starting?','Nous proposons 5, 10, 15 ou 20 leçons d’une heure. Toutes travaillent les compétences essentielles à votre rythme ; les prix et avantages doivent être confirmés. Avez-vous conduit aux États-Unis, dans votre pays, ou débutez-vous ?'],
 additional:['Hay dos plazos distintos: puede comprar adicionales con la tarifa de clases de su paquete dentro de 30 días tras su última clase del paquete; cada adicional debe usarse dentro de 30 días de su compra. Un asesor confirma el valor correspondiente a las clases, separado de otros componentes.','There are two separate periods: buy additional lessons at your package lesson rate within 30 days after your last package lesson; use each additional lesson within 30 days of purchase. An advisor confirms the lesson rate separately from other package components.','Deux délais s’appliquent : acheter des leçons supplémentaires au tarif des leçons du forfait dans les 30 jours après la dernière leçon du forfait, puis utiliser chaque leçon dans les 30 jours de son achat. Un conseiller confirme le tarif des leçons séparément des autres composants.'],
 roadChange:['Para cambiar o cancelar un servicio del Road Test gestionado por la escuela, solicite atención del personal. No modifico automáticamente citas del DMV.','For changes or cancellation of a Road Test service arranged by the school, please ask a staff member. I do not automatically modify DMV appointments.','Pour modifier ou annuler un service Road Test organisé par l’école, veuillez contacter le personnel. Je ne modifie pas automatiquement les rendez-vous du DMV.'],
 options:['Podemos comparar las opciones según su experiencia. La cantidad de clases es orientativa; usted elige y el instructor evalúa su progreso. ¿Prefiere revisar un paquete o consultar una clase individual?','We can compare options based on your experience. Lesson counts are a guide; you choose and the instructor evaluates your progress. Would you prefer a package or an individual lesson?','Nous pouvons comparer les options selon votre expérience. Le nombre de leçons est indicatif ; vous choisissez et le moniteur évalue vos progrès. Préférez-vous un forfait ou une leçon individuelle ?']
};
function schoolProcess({message,language,services,state}){
 const q=normalize(message),course=services.find(s=>s.id==='cinco-horas'&&s.sourceRef==='MM-20261017'),book=services.find(s=>s.id==='cuaderno-preguntas'&&s.sourceRef==='MM-20261017'&&s.currency==='USD');
 if(!course&&!book)return null;
 // La edición del catálogo tiene prioridad sobre guiones conservadores del manual inicial.
 const approvedBook=book?.priceCents===3500&&book.inclusions==='Un cuadernillo en español, inglés o francés; formulario MV-44 en ese idioma; apoyo para programar la cita DMV; acceso al simulador web en tres idiomas.';
 const pendingCourse=course?.publication==='information'&&course.priceCents===null&&course.modality===null;
 const result=(key,step=null)=>{state.process={...state.process,step};return {kind:'local',reason:'approved_guidance',knowledgeAnswer:true,text:say(key,language),...(['roadChange','course','yesPermit'].includes(key)?{reception:true}:{})};};
 if(/^(empezar de nuevo|olvidelo|start over|recommencer|no gracias|no thanks|non merci)$/.test(q)){delete state.process;return null;}
 if(/\b(road test|examen practico)\b/.test(q)&&/\b(cancel|cancelar|cambiar|change|annuler|modifier)\b/.test(q))return result('roadChange');
 if(/\b(adicionales|additional lessons|lecons supplementaires)\b/.test(q))return result('additional');
 if(/\b(paquetes|packages|forfaits)\b/.test(q)&&!services.some(s=>/^paquete-/.test(s.id)&&s.priceCents!==null))return result('packages','experience');
 if(state.process?.step==='experience'&&/\b(nunca|comenzando|mi pais|estados unidos|starting|home country|united states|debute|mon pays|etats unis)\b/.test(q)){const units=/nunca|comenzando|starting|debute/.test(q)?20:/mi pais|home country|mon pays/.test(q)?10:5;const response=result('options');response.text=(language==='en'?'Based on what you shared, you could consider '+units+' lessons. ':language==='fr'?'Selon votre expérience, vous pourriez envisager '+units+' leçons. ':'Por lo que comenta, podría considerar '+units+' clases. ')+response.text;return response;}
 const courseTopic=/\b(cinco|5|five|cinq)\s*(horas?|hours?|heures?)\b/.test(q);
 if(courseTopic&&course&&pendingCourse){state.serviceId=course.id;
  if(/\b(no tengo|don t have|do not have|n ai pas)\b/.test(q)){state.process={permit:false};return result('noPermit','preparation');}
  if(/\b(tengo|i have|j ai)\b/.test(q)){state.process={permit:true};return result('yesPermit');}
  if(/\b(precio|cuesta|horario|sabado|miercoles|virtual|presencial|price|cost|when|schedule|online|prix|horaire|horaires|ligne)\b/.test(q))return result('course');
  if(state.process?.permit===true)return result('yesPermit');
  return result('permit','permit');
 }
 if(state.process?.step==='permit'&&pendingCourse){
  if(/^(si|yes|oui|ya lo tengo|si tengo|i have it)$/.test(q)){state.process.permit=true;return result('yesPermit');}
  if(/^(no|non|todavia no|aun no|not yet|pas encore)$/.test(q)){state.process.permit=false;return result('noPermit','preparation');}
 }
 if(state.process?.step==='preparation'&&/^(si|yes|oui)$/.test(q)&&approvedBook){state.serviceId=book.id;return result('preparation');}
 if(book&&/\b(cuadernillo|libro|booklet|book|livret|livre|mv 44|mv-44)\b/.test(q)){
  // Use live catalog rather than freezing a price after an administrator changes it.
  if(approvedBook){state.serviceId=book.id;return result('preparation');}
 }
 return null;
}
const registry={'driving-school':schoolProcess};
export function conversationProcess(input){
 if(requestTopicRisk(input.message,input.center))return null;
 const handler=registry[businessProfile(input.center).id];return handler?handler(input):null;
}
