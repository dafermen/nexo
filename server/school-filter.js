/**
 * NEXO · GUÍA DEL MÓDULO: server/school-filter.js
 * Resolver hechos y saludos localmente y delimitar cuándo interpretar con IA.
 * Entrada: message, servicios activos, center, state mutable y FAQ opcional.
 * Salida: Decisión kind local/ai con reason, text y banderas como interpret/catalogOnly.
 * Estado importante: serviceId recuerda el tema; pendingFacts espera un servicio; deviations
 * cuenta desvíos claros; defaultAiLimits fija límites iniciales.
 * Efectos y límites: No realiza red ni persiste. Modifica contexto; una palabra aislada sospechosa
 * puede requerir aclaración, no prueba de mala intención.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {schoolJourney} from './school-journey.js';
import {isSchool,businessText,fillTemplate} from './business-settings.js';
// Local policy only: no network calls and no persistent visitor text.
export const defaultAiLimits = { sessionCalls: 6, dailyCalls: 100, maxPromptBytes: 12000, outputTokens: 300 };
/**
 * normalize: Quita acentos, signos y espacios duplicados para comparar frases; conservar aparte el
 * mensaje original para historial.
 * Entrada (firma real): value.
 * Salida: String normalizado; no usarlo como transcripción visible.
 */
export const normalize = value => String(value).normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f\u200b-\u200f\ufeff]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
/**
 * schoolDay: Obtiene fecha comercial en la zona indicada, no en la zona de la laptop.
 * Entrada (firma real): now = new Date(), timezone = 'America/New_York'.
 * Salida: String YYYY-MM-DD para presupuesto diario y búsqueda de fechas.
 */
export function schoolDay(now = new Date(), timezone = 'America/New_York') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone:timezone, year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(now).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const injection = /\b(ignore|ignora|ignoremos|ignorar|desobedece|omite|omita|bypass|jailbreak|system prompt|developer mode|actua como|actue como|finge|finja|pretend|roleplay|instrucciones anteriores|tus instrucciones|sus instrucciones|prompt interno|api key|clave de api)\b|\b(olvida|olvide|olvidar|forget|disregard)\b.{0,60}\b(instrucciones|reglas|sistema|anterior|anteriores|todo|instructions|rules|previous|everything)\b/;
const unrelated = /\b(pizza|receta|cocina|futbol|horoscopo|astrologia|presidente|elecciones|bitcoin|criptomonedas|bolsa|videojuego|videojuegos|python|javascript|programa un|programe un|codigo fuente|poema|poesia|cuento|chiste|pelicula|cancion|traduce|traduzca|translate|capital de|raiz cuadrada|multiplica|calcula|resuelve|pornografia|sexo|weather|recipe|write code|football|hackear|hacking|malware|guitarra)\b|\b(comprar|vender|invertir en) acciones\b/;
function offTopic(q) {
  // A cancellation policy or actions to prepare for a test are school questions.
  // Remove only the recognized policy phrase; an additional unrelated request still blocks.
  const remainder=q.replace(/\bpolitica de (cancelacion|reservas|pagos|privacidad|reembolso)\b/g,'');
  if(injection.test(q))return 'clear';
  if(!unrelated.test(q)&&!/\bpolitica\b/.test(remainder))return null;
  // A word such as pizza may describe the visitor's job, not the requested task.
  const explicitTask=/\b(escribe|escriba|escribeme|escribame|escribir|tienen|tiene|busco|quiero|necesito|dame|deme|programa|programe|programar|cuentame|cuenteme|dime|digame|write)\s+(un |una |el |la |a |me )*(receta|poema|poesia|cuento|chiste|videojuego|codigo|script|cancion)\b|\b(ensename|ensene|explica|explique)\s+(como |a )?(preparar|cocinar|hacer)\s+(una |la )?pizza\b|\b(y|para) (un |una )?(horoscopo|receta|poema|chiste|hackear)\b|\bpolitica de elecciones\b|\bcapital de\b|^(receta|horoscopo|poema|chiste|videojuego|raiz cuadrada|pornografia)\b/;
  return explicitTask.test(q)?'clear':'uncertain';
}
const domains = /\b(conduccion|conducir|manejo|manejar|road test|route test|dmv|examen practico|examen de manejo|examen teorico|licencia|permiso de aprendiz|driving|driver|driving test)\b/;
const guidance = /\b(elegir|elijo|escojo|conviene|recomienda|recomiende|recomendar|recomendacion|diferencia|diferencias|preparar|prepararme|preparacion|nervios|miedo|aprender|necesito ayuda|no se|orientar|orientacion|ayuda|explicar|explique|explicame|aconseja|aconseje|comparar|compare|choose|help|prepare)\b/;
const followup = /^(y |pero |entonces |tambien )?(eso|ese|esa|el mismo|la misma|me explica mejor|expliqueme mejor|puede explicar mas|quiero saber mas|cuenteme mas)$/;
/**
 * selectedServices: Relaciona nombres/IDs y alias escolares con servicios publicados.
 * Entrada (firma real): q, services, school=true.
 * Salida: Array de coincidencias; más de una requiere aclarar.
 */
function selectedServices(q,services,school=true) {
  const packageCount=q.match(/\bpaquete(?: completo)?(?: de)? (5|cinco|10|diez|15|quince|20|veinte) clases\b/);
  if(school&&packageCount){const count=({cinco:5,diez:10,quince:15,veinte:20})[packageCount[1]]||Number(packageCount[1]);return services.filter(s=>new RegExp('\\b'+count+' clases\\b').test(normalize(s.name))&&/paquete/.test(normalize(s.name)));}
  return services.filter(s=>{
    const name=normalize(s.name), id=normalize(s.id);
    if(q.includes(name)||q===id)return true;
    if(school&&/^clase practica/.test(name)&&/\bclases? practicas?\b/.test(q))return true;
    if(school&&s.id==='cuaderno-preguntas'&&/\b(cuaderno|libro de preguntas|libro de preguntas y respuestas|libro)\b/.test(q)&&!/\bmanual\b/.test(q))return true;
    if(school&&/^manual practico/.test(name)&&/\bmanual(?: practico)?\b/.test(q))return true;
    if(school && s.id==='cinco-horas' && /\b(5|cinco) horas?\b/.test(q))return true;
    if(school && s.id==='road-test' && /\b(road test|route test|examen practico|examen de manejo)\b/.test(q))return true;
    if(school && s.id==='clases' && /\bclases\b/.test(q))return true;
    const words=name.split(' ').filter(w=>w.length>3&&!['para','como','sobre','servicio','servicios'].includes(w));
    return words.length>=2 && words.every(w=>q.split(' ').includes(w));
  });
}
/**
 * factContinuation: Permite heredar el servicio solo cuando todas las palabras corresponden a una
 * continuación factual reconocida.
 * Entrada (firma real): q.
 * Salida: Booleano; evita aplicar el precio anterior a un objeto nuevo.
 */
function factContinuation(q) {
  // Reuse a service only for a short fact follow-up. A new, unrecognized object
  // (e.g. an insurance policy) must never inherit another service's price.
  const words=new Set(('y tambien pero entonces eso ese esa este esta el la los las un una del de para en es son se lo al que cual cuales cuanto cuanto tiempo por favor me usted puede podria decir decirme saber gustaria necesito necesita necesitamos llevar inscribirme inscribirse documentos documentacion requisitos requisito precio precios cuesta cuestan sale salen costo costos vale valor dura duran duracion virtual virtuales presencial presenciales modalidad incluye incluyen incluido incluidos inclusiones condiciones politicas online linea curso servicio mismo misma price cost duration how long requirements').split(' '));
  return q.split(' ').every(word=>words.has(word));
}
/**
 * filterSchoolMessage: Prioriza saludos, FAQ y hechos; distingue desvíos claros de ambigüedad y
 * actualiza contexto del servicio.
 * Entrada (firma real): {message,services,center,state,faq=null}.
 * Salida: Decisión local o ai, con reason y banderas que app.js procesa.
 */
export function filterSchoolMessage({message,services,center,state,faq=null}) {
  let q=normalize(message);let welcome='';
  if(!services.some(s=>s.id===state.serviceId))state.serviceId=null;
  const menu=services.length?services.slice(0,8).map(s=>s.name).join('; '):'Por ahora no hay servicios publicados. Consulte al personal.';
  const local=(text,reason,extra={})=>({kind:'local',text:businessText(welcome+text,center),reason,...extra});
  const topic=isSchool(center)?offTopic(q):injection.test(q)?'clear':null;
  if(topic==='uncertain')return local('¿Desea información sobre clases, cursos o turnos de la escuela?','clarify',{interpret:true});
  if(topic==='clear') {
    state.deviations=(state.deviations||0)+1;
    if(center.offTopicMessage)return local(center.offTopicMessage,'off_topic',{catalogOnly:state.deviations>=2});
    return local(`Puedo ayudarle únicamente con los servicios y turnos de ${center.name}. ${state.deviations>=2?'Puede continuar consultando las fichas de Servicios.':'¿Desea consultar clases, preparación para el examen o nuestros horarios?'}`, 'off_topic', {catalogOnly:state.deviations>=2});
  }
  const assistant=normalize(center.assistantName||'Nexo');
  if(q.endsWith(' '+assistant))q=q.slice(0,-assistant.length).trim();
  const original=q;
  const hello=q.match(/^(?:(?:hola|(?:muy )?buenos dias|(?:muy )?buen dia|(?:muy )?buenas tardes|(?:muy )?buenas noches|buenas|hello)(?:\s+|$))+/);
  const social=/^(como esta|como estas|como le va|como te va|que tal|todo bien|como se encuentra|como te encuentras|puede ayudarme|puedes ayudarme|me puede ayudar|mucho gusto|un gusto|que gusto saludarle)(?: usted| nexo| senorita)?$/;
  if(hello)q=q.slice(hello[0].length).replace(/^(nexo|senorita|asesora|asistente|amiga)(?:\s+|$)/,'').trim();
  if(hello&&q.startsWith(assistant+' '))q=q.slice(assistant.length).trim();
  if((hello&&(!q||social.test(q)))||social.test(original)) {
    const greeting=hello?.[0].includes('buenos dias')||hello?.[0].includes('buen dia')?'buenos dias':hello?.[0].includes('buenas tardes')?'buenas tardes':hello?.[0].includes('buenas noches')?'buenas noches':'hola';
    const answer=faq?.lookup({query:greeting,services,center,state});
    return local(answer?.text||(({'hola':'Hola','buenos dias':'Buenos días','buenas tardes':'Buenas tardes','buenas noches':'Buenas noches'}[greeting])+'. ¿Qué desea consultar?'),'greeting');
  }
  if(hello)welcome=(hello[0].includes('buenos dias')||hello[0].includes('buen dia')?'Buenos días':hello[0].includes('buenas tardes')?'Buenas tardes':hello[0].includes('buenas noches')?'Buenas noches':'Hola')+'. ';
  // "Llevar plata" asks about money; do not confuse it with required documents.
  if(/\b(plata|dinero|billetes?|pesos)\b/.test(q)&&/\bllevar\b/.test(q))return local('¿Desea consultar el precio o la forma de pago?','clarify',{interpret:true});
  const matches=selectedServices(q,services,isSchool(center));
  if(matches.length===1)state.serviceId=matches[0].id;
  if(matches.length>1)state.serviceId=null;
  const contextService=services.find(s=>s.id===state.serviceId);
  const service=matches.length===1?matches[0]:matches.length?null:(factContinuation(q)||followup.test(q))?contextService:null;
  const journey=isSchool(center)?schoolJourney({q,services,center,state,faq}):null;
  if(journey)return local(journey.text,'approved_guidance',{knowledgeAnswer:true});
  // Una corrección o comparación no se resuelve con la primera palabra coincidente.
  if(/\b(en vez|sino|diferencia|comparar|compare|no quiero|no necesito|no me interesa|no es ese)\b/.test(q)||matches.length>1&&/\b(no|mejor|pero)\b/.test(q))return local('¿Qué desea comparar o corregir?','clarify',{interpret:true});
  const facts=[];
  if(/\b(precio|precios|cuesta|cuestan|cuanto cuesta|cuanto sale|cuanto salen|costo|costos|vale|valor|price|cost)\b/.test(q))facts.push('price');
  if(/\b(requisitos|requisito|documentos|documentacion|llevar|que necesito|necesito llevar|requirements)\b/.test(q))facts.push('requirements');
  if(/\b(dura|duran|duracion|cuanto tiempo|duration|how long)\b/.test(q))facts.push('duration');
  if(/\b(virtual|virtuales|presencial|presenciales|modalidad|online|en linea)\b/.test(q))facts.push('modality');
  if(/\b(incluye|incluyen|incluido|incluidos|inclusiones)\b/.test(q))facts.push('inclusions');
  if(/\b(condiciones|politicas)\b/.test(q))facts.push('conditions');
  if(/\b(direccion|telefono|contacto|ubicacion|donde estan|donde queda)\b/.test(q)&&Object.values(center.contact||{}).some(Boolean))return local(Object.values(center.contact).filter(Boolean).join(' · '),'contact');
  const known=faq?.lookup({query:q,services,center,state,matchedServiceIds:matches.map(s=>s.id)});
  // A FAQ tie must not discard a recognized service or block catalog facts.
  const awaitingFact=matches.length===1&&!facts.length&&(state.pendingFacts?.length||(/^y (el |la |los |las )?/.test(q)&&state.lastIntent));
  if(known?.text&&!awaitingFact&&facts.length<=1){if(known.serviceId)state.serviceId=known.serviceId;state.lastIntent=facts.at(-1)||null;state.pendingFacts=null;return local(known.text,'faq',{knowledgeAnswer:true});}
  const hours=/\b(horario|horarios|abren|abre|cierran|cierra|atienden|atencion|abierto|cerrado|opening hours)\b/.test(q);
  const booking=/\b(reservar|reserva|reservas|reservacion|turno|turnos|cita|citas|cancelar|cancelacion|disponibilidad|agendar|agenda)\b/.test(q);
  const payment=/\b(pagar|pago|pagos|tarjeta|cobrar|cobro|pagado)\b/.test(q);
  const extras=[];
  if(hours&&contextService?.schedule&&(matches.length===1||/^(y )?(que dias|que horarios|horarios|cuando se ofrece|cuando es)( tienen| el curso)?$/.test(q)))return local(contextService.schedule+' Estos son horarios informativos; confirme cupos e inscripción con el personal.','service_schedule',{knowledgeAnswer:true});
  if(hours)extras.push(`Nuestro horario general de atención es: ${center.hours}. Las fechas de clases, feriados y cupos se confirman con el personal; este horario no indica disponibilidad de turnos.`);
  if(booking)extras.push(center.booking.message);
  if(payment)extras.push('Este kiosco no procesa pagos. Consulte con el personal las formas de pago disponibles.');
  if(!facts.length&&!extras.length&&matches.length===1&&!guidance.test(q)) {
    if(state.pendingFacts?.length)facts.push(...state.pendingFacts);
    else if(/^y (el |la |los |las )?/.test(q)&&state.lastIntent)facts.push(state.lastIntent);
  }
  state.pendingFacts=null;
  if(facts.length) {
    if(!service){state.pendingFacts=facts;return local([...extras,`¿Sobre qué servicio desea consultar? ${menu}.`].join(' '),'clarify',{interpret:matches.length>1||!factContinuation(q)});}
    const answer=[...extras,service.name+'.'];
    if(facts.includes('price'))answer.push(service.priceCents==null?'Precio pendiente de confirmar con la escuela.':service.priceCents===0?'Este servicio es sin costo.':`Precio: ${(service.priceCents/100).toFixed(2)} ${service.currency}.`);
    if(facts.includes('requirements'))answer.push(service.requirements||'Requisitos pendientes de confirmar con la escuela.');
    if(facts.includes('duration'))answer.push(service.duration==null?'Duración pendiente de confirmar.':`Duración: ${service.duration} minutos.`);
    if(facts.includes('modality'))answer.push(service.modality?`Modalidad: ${service.modality}.`:'Modalidad pendiente de confirmar para este servicio.');
    if(facts.includes('inclusions'))answer.push(service.inclusions||'Lo que incluye este servicio está pendiente de confirmar con el personal.');
    if(facts.includes('conditions'))answer.push(service.conditions||'Las condiciones de este servicio están pendientes de confirmar con el personal.');
    state.lastIntent=facts.at(-1);return local(answer.join(' '),'catalog');
  }
  state.lastIntent=null;
  if(extras.length)return local(extras.join(' '),hours?'hours':booking?'booking':'payment',{interpret:/\b(no|pero|mejor|en vez|diferencia|como|por que)\b/.test(q)});

  if(/^(gracias|muchas gracias|muchisimas gracias|gracias nexo|muy bien gracias|ok|entendido|perfecto|adios|hasta luego)$/.test(q))return local('Con gusto. Puede consultar nuestros servicios o finalizar la atención.','courtesy');
  if(/\b(que servicios|cuales servicios|que ofrecen|que cursos|ver opciones|ver servicios)\b/.test(q))return local(`Nuestros servicios publicados: ${menu}. ¿Sobre cuál desea información?`,'catalog');
  if(/\b(direccion|telefono|contacto|ubicacion|donde estan|donde queda)\b/.test(q))return local(Object.values(center.contact||{}).filter(Boolean).join(' · ')||center.handoff||'Esa información debe confirmarla con el personal de la escuela.','unknown_fact');
  if(matches.length===1&&!guidance.test(q))return local(`Con gusto. ${service.name}: ${service.description} ¿Desea conocer el precio, los requisitos o la modalidad?`,'catalog',{interpret:!/^((el |la )?(curso de (las )?)?(5|cinco) horas?|road test|route test|clases|clases presenciales y virtuales)$/.test(q)});
  if(known?.ambiguous)return local(contextService
    ? `Sobre ${contextService.name}, ¿desea conocer el precio, los requisitos, la duración o la modalidad?`
    : `¿Sobre qué servicio desea información? ${menu}.`,'clarify',{interpret:true});
  if((state.deviations||0)>=2)return local(`Puede continuar con el catálogo: ${menu}. Consulte las fichas o pregunte por precio, requisitos, duración y modalidad.`,'restricted',{catalogOnly:true});
  if((guidance.test(q)&&((isSchool(center)?domains.test(q):(center.topics||'').split(',').some(term=>normalize(term)&&(' '+q+' ').includes(' '+normalize(term)+' ')))||matches.length>0))||(service&&followup.test(q)))return {kind:'ai',reason:'school_guidance',serviceId:service?.id||null};
  return local(`¿Su consulta se refiere a un servicio de la escuela? Puede preguntar por ${menu}.`,'clarify',{interpret:true});
}

export const requestTopicRisk=(message,center)=>isSchool(center)?offTopic(normalize(message)):injection.test(normalize(message))?"clear":null;
