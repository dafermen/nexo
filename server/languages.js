/**
 * NEXO · GUÍA DEL MÓDULO: server/languages.js
 * Adaptar frases del visitante a reglas locales y compartir traducciones.
 * Entrada: Mensaje y código de idioma es/en/fr.
 * Salida: Mensaje equivalente para clasificación; exportaciones de traducción compartida.
 * Estado importante: Las equivalencias ayudan al filtro; el texto original se conserva en el flujo
 * HTTP.
 * Efectos y límites: No es un traductor general ni hace red. Los textos comerciales nuevos
 * necesitan traducción revisada.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {translate,validLanguage} from '../public/i18n.js';
import {normalize} from './school-filter.js';
export {translate,validLanguage};
// Only complete, recognizable phrases use local aliases. Unknown language stays intact for the bounded interpreter.
export function visitorMessage(source,locale){
 if(locale==='es')return source;
 const q=normalize(source);
 if(/\b(ignore|disregard|oublie|ignorez|ignorer)\b.*\b(instructions|rules|regles|system)\b|\b(write|ecris|ecrivez|donne|donnez)\b.*\b(recipe|recette|poem|poeme|code|joke|blague)\b/.test(q))return 'Escriba una receta de pizza';
 const pairs=[
 ['^(what is your website|do you have a website|quel est votre site web|avez vous un site web)$','¿Cuál es la página web?'],
 ['^(do you have a simulator|where can i practice the (written|learner) test|avez vous un simulateur|ou puis je (pratiquer|preparer) l examen theorique)$','¿Tienen simulador?'],
 ['^(i (do not|don t) have (a |my )?(learner )?permit( can i take the course)?|je n ai pas (de |mon )?(learner )?permis( puis je suivre le cours)?)$','No tengo permiso, ¿puedo hacer el curso?'],
 ['^(i (already )?have my (learner )?permit what (is next|should i do now)|j ai deja mon permis (que faire maintenant|quelle est la suite))$','Ya tengo mi permiso, ¿qué hago ahora?'],
 ['^(i (have )?(finished|completed) (the )?(5|five) hours? (course )?what (is )?next|j ai termine (le cours de |les )?5 heures (quelle est la suite|et maintenant))$','Ya terminé las 5 horas, ¿qué sigue?'],
 ['^(what days (is the course|do you offer the course)|when is the (5 hour |five hour )?course|quels jours (proposez vous le cours|a lieu le cours)|horaires du cours de 5 heures)$','¿Qué días tienen el curso?'],
 ['^(what does the book include|what is included with the book|que comprend le livre)$','¿Qué incluye el libro?'],
 ['^(is the app free|l application est elle gratuite)$','¿La app es gratis?'],
 ['^(hello|hi|bonjour|salut)$','Hola'],['^good morning$','Buenos días'],['^good afternoon$','Buenas tardes'],['^(good evening|bonsoir)$','Buenas noches'],['^(thank you|thanks|merci|merci beaucoup)$','gracias'],
 ['^(yes|oui|yes i do|oui je l ai|i have my learner permit|yes i have my learner permit)$','sí'],['^(no|non|not yet|pas encore)$','no'],
 ['^(i (want|would like) to (get|obtain) my (driver s |driving )?licen[cs]e|je (veux|voudrais) (obtenir|passer) mon permis)( but i don t know where to start)?$','Quiero sacar mi licencia'],
 ['^(i want to learn to drive|je veux apprendre a conduire|learn to drive|apprendre a conduire)$','Quiero aprender a manejar'],
 ['^(what (services|courses) do you (offer|have)|what are your services|quels (services|cours) (proposez vous|offrez vous)|vos services)$','qué servicios ofrecen'],
 ['^(what are your (opening )?hours|when (are you open|do you open|do you close)|quels sont vos horaires|vos horaires|horaires)$','horarios'],
 ['^(how (much is it|much does it cost)|what is the price|combien ca coute|combien coute t il|quel est le prix|le prix)$','precio'],
 ['^(how long (is it|does it last)|what is the duration|combien de temps ca dure|quelle est la duree)$','duración'],
 ['^(what are the requirements|what do i need to bring|quelles sont les conditions|quels documents faut il)$','requisitos'],
 ['^(is it online|is it in person|est ce en ligne|est ce en presentiel)$','modalidad'],
 ['^(check availability|available times|voir les disponibilites|disponibilites)$','ver disponibilidad'],
 ['^(find my appointment|check my appointment|consulter mon rendez vous|mon rendez vous)$','consultar mi cita'],
 ['^(book an appointment|how do i book an appointment|i want to book an appointment|prendre rendez vous|comment prendre rendez vous|je veux prendre rendez vous)$','reservar cita'],
 ['^(morning instead|in the morning|rather in the morning|plutot le matin|le matin)$','mejor por la mañana'],['^(afternoon instead|in the afternoon|plutot l apres midi|l apres midi)$','mejor por la tarde'],
 ['^(the first|first|la premiere|le premier)$','la primera'],['^(the second|second|la deuxieme|le deuxieme)$','la segunda'],['^(the third|third|la troisieme|le troisieme)$','la tercera']
 ];
 for(const [pattern,replacement] of pairs)if(new RegExp(pattern).test(q))return replacement;
 const packageMatch=q.match(/^(?:(?:how much is|price of|what is included in|combien coute|prix du|que comprend) )?(?:the |le |a |un )?(5|five|10|ten|15|fifteen|20|twenty|cinq|dix|quinze|vingt)(?: lesson| lessons| lecons)? (?:package|forfait)$/);
 if(packageMatch){const number=({five:5,ten:10,fifteen:15,twenty:20,cinq:5,dix:10,quinze:15,vingt:20})[packageMatch[1]]||Number(packageMatch[1]);return (/included|comprend/.test(q)?'Qué incluye ':'precio ')+'paquete de '+number+' clases';}
 const serviceAliases=[['5 hour course|five hour course|cours (de |des )?5 heures|cours de cinq heures','curso de las cinco horas'],['driving lesson|practical lesson|lecon de conduite|cours de conduite','clase práctica'],['questions and answers (workbook|book)|workbook|book|cahier de questions et reponses|livre de questions et reponses|cahier|livre','cuaderno'],['practical manual|manuel pratique','manual práctico'],['road test preparation|preparation a l examen pratique','preparación para el road test']];
 let phrase=q;for(const [pattern,replacement] of serviceAliases)phrase=phrase.replace(new RegExp(pattern,'g'),replacement);
 if(phrase!==q){
  const price=phrase.match(/^(how much (is|does) (the |a )?|what is the price (of |for )(the |a )?|combien coute (le |la |un |une )?|quel est le prix (du |de la ))(.+?)( cost)?$/);if(price)return 'precio '+price[8];
  if(/^(i (want|would like|am interested in)|je (veux|voudrais)|je suis interesse par)?\s*(the |a |an |le |la |un |une |les )?(curso de las cinco horas|clase práctica|preparación para el road test)$/.test(phrase))return phrase.replace(/^(i (want|would like|am interested in)|je (veux|voudrais)|je suis interesse par)?\s*(the |a |an |le |la |un |une |les )?/,'');
  phrase=phrase.replace(/\b(\d{4}) (\d{2}) (\d{2})\b/g,'$1-$2-$3');
  // Finite booking grammar, no partial removal of unrecognized instructions.
  const days='monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|aujourd hui|\\d{4}-\\d{2}-\\d{2}';
  const m=phrase.match(new RegExp('^(?:(?:i want|i would like|book|je veux|je voudrais|reserver) )?(?:a |une |un |la |the )?clase práctica (?:on |for |pour |le )?('+days+')(?: (in the morning|in the afternoon|morning|afternoon|le matin|l apres midi))?$'));
  if(m){const names={'monday':'lunes','tuesday':'martes','wednesday':'miércoles','thursday':'jueves','friday':'viernes','saturday':'sábado','sunday':'domingo','tomorrow':'mañana','today':'hoy','lundi':'lunes','mardi':'martes','mercredi':'miércoles','jeudi':'jueves','vendredi':'viernes','samedi':'sábado','dimanche':'domingo','demain':'mañana','aujourd hui':'hoy'};return 'quiero clase práctica '+(names[m[1]]||m[1])+(m[2]?/morning|matin/.test(m[2])?' por la mañana':' por la tarde':'');}
 }
 return source;
}
