/** NEXO · GUÍA DEL MÓDULO: server/attention.js
 * Protocolos breves antes del intérprete. Entrada: frase e idioma, sin datos personales.
 * Salida: respuesta local y opción de recepción, nunca una asignación automática de turno.
 * Solo situaciones explícitas; preguntas comerciales combinadas continúan al catálogo/IA.
 */
export function attentionDecision(message,language='es',center=null){
 const q=message.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
 let type=null;
 if(/^(adios|hasta luego|eso es todo|no necesito nada mas|goodbye|bye|that is all|au revoir|c est tout)[.!\s]*$/.test(q))type='bye';
 else if(/\b(hablar con (una persona|un asesor|alguien del equipo)|atencion humana|quiero reclamar|tengo una queja|talk to (a person|an advisor|someone)|speak to (a person|an advisor)|parler a (une personne|un conseiller)|reclamation)\b/.test(q))type='human';
 else if(/^(estoy (molesto|molesta|enojado|enojada)|i am upset|je suis (mecontent|mecontente))[.!\s]*$/.test(q))type='upset';
 else if(/^(tengo prisa|estoy apurado|estoy apurada|i am in a hurry|je suis presse)[.!\s]*$/.test(q))type='hurry';
 else if(/^(no entiendo|estoy confundido|estoy confundida|i am confused|i do not understand|je ne comprends pas)[.!\s]*$/.test(q))type='confused';
 else if(/^(no estoy seguro|no estoy segura|quiero pensarlo|i need to think|je veux reflechir)[.!\s]*$/.test(q))type='unsure';
 if(!type)return null;
 if(type==='bye'&&center?.businessType==='general')return {kind:'local',reason:'attention_bye',text:language==='en'?'Thank you for visiting. Have a good day.':language==='fr'?'Merci de votre visite. Bonne journée.':'Gracias por visitarnos. Que tenga un buen día.'};
 const texts={
  bye:['Gracias por visitarnos. La mejor ruta para llegar a tu destino es educándote.','Thank you for visiting. The best route to your destination is through education.','Merci de votre visite. La meilleure route vers votre destination passe par l’éducation.'],
  human:['Puede solicitar atención presencial con el botón «Atención con un asesor». Elija el motivo o «Prefiero no indicarlo». No se ha creado ningún turno todavía.','Use “Speak with an advisor” to request in-person assistance. Choose a reason or “Prefer not to say”. No queue ticket has been created yet.','Utilisez « Parler à un conseiller » pour demander une aide sur place. Choisissez un motif ou « Je préfère ne pas préciser ». Aucun ticket n’a encore été créé.'],
  upset:['Lamento que haya tenido una mala experiencia. Si lo desea, puede solicitar atención con un asesor sin tener que explicar aquí los detalles.','I am sorry you had a bad experience. You can request an advisor without sharing the details here.','Je suis désolé de cette mauvaise expérience. Vous pouvez demander un conseiller sans expliquer les détails ici.'],
  hurry:['Vamos a lo esencial. ¿Qué necesita resolver hoy?','Let us focus on the essentials. What do you need help with today?','Allons à l’essentiel. Que souhaitez-vous régler aujourd’hui ?'],
  confused:['Vamos paso a paso. ¿Qué desea conseguir y en qué parte necesita ayuda?','Let us take it step by step. What would you like to achieve, and where do you need help?','Avançons étape par étape. Quel est votre objectif et à quelle étape avez-vous besoin d’aide ?'],
  unsure:['Puede pensarlo con tranquilidad, sin compromiso. ¿Qué duda le ayudaría a resolver para decidir?','You can take your time, with no obligation. What would you like to clarify before deciding?','Prenez votre temps, sans engagement. Quel point souhaitez-vous éclaircir avant de décider ?'],
 };
 return {kind:'local',reason:'attention_'+type,text:texts[type][{es:0,en:1,fr:2}[language]??0],knowledgeAnswer:true,reception:['human','upset'].includes(type)};
}
