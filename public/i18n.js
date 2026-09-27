/**
 * NEXO · GUÍA DEL MÓDULO: public/i18n.js
 * Definir idiomas y traducciones de interfaz y frases conocidas.
 * Entrada: Clave/frase original, idioma elegido y valores de plantillas.
 * Salida: Texto traducido o frase original cuando no hay equivalencia.
 * Estado importante: language es idioma activo del módulo; languages define códigos de voz; tablas
 * contienen equivalencias revisadas.
 * Efectos y límites: No hace red; comparte reglas con el servidor. No insertar datos personales en
 * la tabla de traducciones.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Shared, reviewed translations. No visitor data is sent to a translation service.
export const languages={es:{name:'Español',speech:'es-US'},en:{name:'English',speech:'en-US'},fr:{name:'Français',speech:'fr-FR'}};
export const validLanguage=value=>typeof value==='string'&&Object.hasOwn(languages,value);
export let language='es';
export function setLanguage(value){if(!validLanguage(value))throw Error('Unsupported language');language=value;}
const rows=`
Curso de Pre-Licencia de 5 Horas|5-Hour Pre-Licensing Course|Cours préalable au permis de 5 heures
Libro de Preguntas y Respuestas|Questions and Answers Book|Livre de questions et réponses
Conocimientos esenciales sobre conducción segura, normas de tránsito, prevención de accidentes, responsabilidades al volante y riesgos del alcohol o las drogas. Forma parte del proceso previo al Road Test en Nueva York.|Essential knowledge about safe driving, traffic rules, accident prevention, responsibilities behind the wheel and the risks of alcohol or drugs. It is part of the process before the Road Test in New York.|Connaissances essentielles sur la conduite sécuritaire, les règles de circulation, la prévention des accidents, les responsabilités au volant et les risques liés à l’alcool ou aux drogues. Il fait partie des étapes précédant l’examen de conduite à New York.
Tener un Learner Permit válido del Estado de Nueva York, completar satisfactoriamente el curso y cumplir los requisitos de identificación y participación establecidos para la modalidad del curso.|Have a valid New York State Learner Permit, successfully complete the course, and meet the identification and participation requirements for the course format.|Avoir un Learner Permit valide de l’État de New York, terminer le cours avec succès et respecter les exigences d’identification et de participation propres à la formule du cours.
Miércoles a las 6:00 PM y sábados a las 10:00 AM, hora de Nueva York.|Wednesdays at 6:00 PM and Saturdays at 10:00 AM, New York time.|Les mercredis à 18 h et les samedis à 10 h, heure de New York.
Consulte con el personal los requisitos de identificación y participación de la modalidad, los cupos y la inscripción. No se garantiza la aprobación del Road Test.|Ask staff about identification and participation requirements for the format, available places and enrollment. Passing the Road Test is not guaranteed.|Consultez le personnel sur les conditions d’identification et de participation, les places disponibles et l’inscription. La réussite de l’examen de conduite n’est pas garantie.
Herramienta de estudio para preparar el examen escrito de conducir del Estado de Nueva York. Permite practicar, repasar e identificar temas por reforzar, a su propio ritmo. Disponible en español, inglés y francés.|A study tool to prepare for the New York State written driving knowledge test. Practice, review and identify topics to strengthen at your own pace. Available in Spanish, English and French.|Un outil d’étude pour préparer l’examen écrit de conduite de l’État de New York. Il permet de pratiquer, réviser et repérer les sujets à approfondir à votre rythme. Disponible en espagnol, anglais et français.
Libro + acceso gratis a la App de Método Mogollón + asistencia gratis para agendar su cita a través de los canales oficiales correspondientes. Puede practicar desde celular, tablet o computador.|Book + free access to the Método Mogollón App + free assistance scheduling your appointment through the appropriate official channels. Practice on your phone, tablet or computer.|Livre + accès gratuit à l’application Método Mogollón + aide gratuite à la prise de rendez-vous par les canaux officiels appropriés. Vous pouvez pratiquer sur téléphone, tablette ou ordinateur.
La asistencia se limita al proceso de programación de la cita. La disponibilidad depende del DMV; no incluye tarifas del DMV ni garantiza una fecha específica o la aprobación del examen.|Assistance is limited to the appointment scheduling process. Availability depends on the DMV; DMV fees are not included and no specific date or exam success is guaranteed.|L’assistance se limite à la procédure de prise de rendez-vous. Les disponibilités dépendent du DMV ; ses frais ne sont pas inclus et aucune date précise ni réussite à l’examen n’est garantie.
Consulte con el personal los cupos y la inscripción.|Ask staff about available places and enrollment.|Consultez le personnel pour les places disponibles et l’inscription.
¿Desea conocer los requisitos, el precio o los horarios?|Would you like to know the requirements, price or schedule?|Souhaitez-vous connaître les conditions, le tarif ou les horaires ?
El curso cuesta {0}.|The course costs {0}.|Le cours coûte {0}.
El libro cuesta {0} e incluye acceso a la App y asistencia para agendar su cita.|The book costs {0} and includes App access and appointment scheduling assistance.|Le livre coûte {0} et comprend l’accès à l’application et l’aide à la prise de rendez-vous.
Estos son horarios informativos; confirme cupos e inscripción con el personal.|This is an informational schedule; confirm available places and enrollment with staff.|Ces horaires sont informatifs ; confirmez les places disponibles et l’inscription auprès du personnel.
Para tomar el curso necesita un Learner Permit válido de Nueva York. Si todavía no lo tiene, su primer paso es obtenerlo. Puede prepararse para el examen teórico; los requisitos actuales del DMV deben confirmarse por sus canales oficiales. ¿Desea información sobre el Libro de Preguntas y Respuestas?|You need a valid New York Learner Permit to take the course. If you do not have one yet, obtaining it is your first step. You can prepare for the knowledge test; current DMV requirements must be confirmed through its official channels. Would you like information about the Questions and Answers Book?|Pour suivre le cours, vous devez avoir un Learner Permit valide de New York. Si vous ne l’avez pas encore, l’obtenir est la première étape. Vous pouvez préparer l’examen théorique ; les exigences actuelles du DMV doivent être confirmées par ses canaux officiels. Souhaitez-vous des informations sur le Livre de questions et réponses ?
Si ya tiene su Learner Permit, puede comenzar su preparación práctica de manejo y completar el Curso de Pre-Licencia de 5 Horas. ¿Desea información sobre clases prácticas o sobre el curso?|If you already have your Learner Permit, you can start practical driving preparation and complete the 5-Hour Pre-Licensing Course. Would you like information about driving lessons or the course?|Si vous avez déjà votre Learner Permit, vous pouvez commencer votre préparation pratique et suivre le cours préalable au permis de 5 heures. Souhaitez-vous des informations sur les leçons de conduite ou sur le cours ?
El siguiente objetivo es prepararse para presentar su Road Test. Puede consultar nuestras clases prácticas y el servicio de carro y cita para el Road Test. No se garantiza la aprobación del examen.|The next goal is to prepare for your Road Test. You can ask about our driving lessons and the car and Road Test appointment service. Passing the exam is not guaranteed.|L’objectif suivant est de vous préparer à l’examen de conduite. Vous pouvez consulter nos leçons pratiques et le service de voiture et rendez-vous pour l’examen. La réussite à l’examen n’est pas garantie.
El proceso general es obtener el Learner Permit, aprender y practicar manejo, completar el Curso de Pre-Licencia, presentar el Road Test y obtener la licencia al aprobar y cumplir los requisitos correspondientes. Los requisitos específicos vigentes deben confirmarse con el DMV.|The general process is to obtain a Learner Permit, learn and practice driving, complete the Pre-Licensing Course, take the Road Test, and obtain a license after passing and meeting the applicable requirements. Current specific requirements must be confirmed with the DMV.|Le parcours général consiste à obtenir le Learner Permit, apprendre et pratiquer la conduite, suivre le cours préalable au permis, passer l’examen de conduite, puis obtenir le permis après réussite et respect des conditions applicables. Les exigences précises en vigueur doivent être confirmées auprès du DMV.
Podemos orientarle sobre las etapas del proceso y explicarle los servicios publicados de Método Mogollón para prepararse. No garantizamos la aprobación del examen teórico ni del Road Test.|We can guide you through the stages and explain Método Mogollón’s published services to help you prepare. We do not guarantee passing the knowledge test or the Road Test.|Nous pouvons vous orienter dans les différentes étapes et vous expliquer les services publiés de Método Mogollón pour vous préparer. Nous ne garantissons pas la réussite à l’examen théorique ni à l’examen de conduite.
El Libro de Preguntas y Respuestas está disponible en español, inglés y francés.|The Questions and Answers Book is available in Spanish, English and French.|Le Livre de questions et réponses est disponible en espagnol, anglais et français.
El Libro de Preguntas y Respuestas le ayuda a preparar el examen escrito.|The Questions and Answers Book helps you prepare for the written test.|Le Livre de questions et réponses vous aide à préparer l’examen écrit.
Cuaderno de Preguntas y Respuestas|Questions and Answers Workbook|Cahier de questions et réponses
Clase práctica de manejo|Practical driving lesson|Leçon pratique de conduite
Curso de Pre-Licencia de 5 Horas (Video)|5-Hour Pre-Licensing Course (Video)|Cours préalable au permis de 5 heures (vidéo)
Manual Práctico Método Mogollón|Método Mogollón Practical Manual|Manuel pratique Método Mogollón
Road Test: carro + cita|Road Test: car + appointment|Examen de conduite : voiture + rendez-vous
Paquete completo de {0} clases|Complete package of {0} lessons|Forfait complet de {0} leçons
Cuaderno disponible en inglés, español y francés. Obsequio: cita para el DMV y acceso al App. Consulte al personal qué trámite cubre la cita y cómo recibe el acceso.|Workbook available in English, Spanish and French. Gift: a DMV appointment and app access. Ask staff which procedure the appointment covers and how to receive access.|Cahier disponible en anglais, espagnol et français. Cadeau : rendez-vous au DMV et accès à l’application. Demandez au personnel quelle démarche concerne le rendez-vous et comment obtenir l’accès.
Clase individual de conducción de 60 minutos. Elija día, hora y profesor disponible; confirme sus datos antes de reservar.|Individual 60-minute driving lesson. Choose a day, time and available instructor; confirm your details before booking.|Leçon individuelle de conduite de 60 minutes. Choisissez le jour, l’heure et un moniteur disponible ; confirmez vos coordonnées avant de réserver.
Curso de Pre-Licencia de 5 Horas en formato video, según el catálogo de la escuela. Consulte al personal los requisitos y cómo acceder.|5-Hour Pre-Licensing Course in video format, according to the school’s catalog. Ask staff about requirements and access.|Cours préalable au permis de 5 heures en vidéo, selon le catalogue de l’école. Renseignez-vous auprès du personnel sur les conditions et l’accès.
Manual Práctico Método Mogollón disponible en inglés, español y francés.|Método Mogollón Practical Manual available in English, Spanish and French.|Manuel pratique Método Mogollón disponible en anglais, espagnol et français.
Incluye carro y cita para el Road Test. Este servicio es distinto de la clase práctica de manejo. Coordine fecha y condiciones con el personal.|Includes a car and an appointment for the Road Test. This service is separate from a practical driving lesson. Arrange the date and terms with staff.|Comprend une voiture et un rendez-vous pour l’examen de conduite. Ce service est distinct de la leçon pratique. Convenez de la date et des conditions avec le personnel.
Incluye {0} clases prácticas, Curso de Pre-Licencia de 5 Horas (Video), Manual Práctico Método Mogollón, carro y cita para Road Test. Consulte al personal las condiciones del paquete.|Includes {0} practical lessons, the 5-Hour Pre-Licensing Course (Video), the Método Mogollón Practical Manual, a car and a Road Test appointment. Ask staff about package terms.|Comprend {0} leçons pratiques, le cours préalable au permis de 5 heures (vidéo), le manuel pratique Método Mogollón, une voiture et un rendez-vous pour l’examen de conduite. Consultez le personnel pour les conditions du forfait.
Llamada en pausa. Al volver comprobaremos su micrófono.|Call paused. We will check your microphone when you return.|Appel en pause. Nous vérifierons votre microphone à votre retour.
Pulse el micrófono cuando desee continuar.|Tap the microphone when you wish to continue.|Appuyez sur le microphone pour continuer.
No se pudo retomar la conexión. Pulse el micrófono para volver a intentar.|Could not resume the connection. Tap the microphone to try again.|Impossible de reprendre la connexion. Appuyez sur le microphone pour réessayer.
La atención terminó por inactividad. Puede iniciar una nueva llamada.|The session ended due to inactivity. You can start a new call.|La session a pris fin pour inactivité. Vous pouvez démarrer un nouvel appel.
Hay disponibilidad para {0}, {1}. Complete sus datos y elija su profesor disponible en pantalla. Todavía no está reservada.|There is availability for {0}, {1}. Complete your details and choose an available instructor on screen. It is not booked yet.|Une place est disponible pour {0}, {1}. Saisissez vos coordonnées et choisissez un moniteur disponible à l’écran. La réservation n’est pas encore confirmée.
¿A qué hora desea su cita? Indique si es por la mañana o por la tarde.|What time would you like your appointment? Please specify AM or PM.|À quelle heure souhaitez-vous votre rendez-vous ? Précisez le matin ou l’après-midi.
Citas, servicios, reportes, configuración y documentación.|Appointments, services, reports, settings and documentation.|Rendez-vous, services, rapports, paramètres et documentation.
Profesor: {0}|Instructor: {0}|Moniteur : {0}
{0} cupos disponibles|{0} places available|{0} places disponibles
1 cupo disponible|1 place available|1 place disponible
Elija su profesor|Choose your instructor|Choisissez votre moniteur
Seleccione un profesor disponible|Select an available instructor|Sélectionnez un moniteur disponible
Solo aparecen los profesores libres para este horario.|Only instructors available at this time are shown.|Seuls les moniteurs disponibles à cet horaire sont affichés.
Ese profesor u horario ya no está disponible. Elija otro.|That instructor or time is no longer available. Please choose another.|Ce moniteur ou cet horaire n’est plus disponible. Choisissez-en un autre.
Elija un profesor habilitado para este servicio.|Choose an instructor for this service.|Choisissez un moniteur pour ce service.
Versión|Version|Version
Última actualización|Last updated|Dernière mise à jour
Gestión diaria: citas, servicios, reportes y respaldos.|Daily management: appointments, services, reports and backups.|Gestion quotidienne : rendez-vous, services, rapports et sauvegardes.
Ajustes de Nexo: negocio, idiomas, voz, IA y conexiones.|Nexo settings: business, languages, voice, AI and connections.|Paramètres de Nexo : établissement, langues, voix, IA et connexions.
Hola, soy {0}|Hello, I’m {0}|Bonjour, je suis {0}
Hola, soy {0}, su asistente virtual de {1}. ¿En qué puedo ayudarle?|Hello, I’m {0}, your virtual assistant at {1}. How can I help you?|Bonjour, je suis {0}, votre assistant virtuel chez {1}. Comment puis-je vous aider ?
Puedo ayudarle con los servicios de {0}. ¿Qué desea consultar?|I can help with the services at {0}. What would you like to know?|Je peux vous renseigner sur les services de {0}. Que souhaitez-vous savoir ?
Lunes a Viernes|Monday to Friday|Du lundi au vendredi
Consulte con el personal del negocio para continuar su atención.|Please contact staff to continue.|Veuillez vous adresser au personnel pour continuer.
▷ Escuchar|▷ Listen|▷ Écouter
ASISTENTE VIRTUAL|VIRTUAL ASSISTANT|ASSISTANT VIRTUEL
USTED|YOU|VOUS
Mayúsculas|Uppercase|Majuscules
Borrar carácter|Delete character|Effacer un caractère
Su asistente de {0}|Your assistant at {0}|Votre assistant chez {0}
A su disposición|Here to help|À votre service
¿Cómo podemos ayudarle hoy?|How can we help you today?|Comment pouvons-nous vous aider ?
Llamada por voz|Voice call|Appel vocal
Videollamada|Video call|Appel vidéo
Nueva conversación|New conversation|Nouvelle conversation
Servicios|Services|Services
Mi cita y horarios|Appointments & times|Rendez-vous et horaires
Escribir consulta|Type a question|Écrire un message
Atención a su ritmo|Here to help, at your pace|À votre écoute, à votre rythme
Ayuda y opciones|Help & options|Aide et options
Cerrar y volver al inicio|Close and return home|Fermer et revenir à l’accueil
Cerrar|Close|Fermer
Conversación|Conversation|Conversation
Conversemos.|Let’s talk.|Discutons.
Su consulta|Your question|Votre question
Escriba su consulta aquí…|Type your question here…|Écrivez votre question ici…
Enviar consulta|Send question|Envoyer le message
Voz activada|Voice on|Voix activée
Voz desactivada|Voice off|Voix désactivée
Finalizar|End|Terminer
Finalizar atención|End conversation|Terminer la conversation
Activar pantalla completa|Enter full screen|Passer en plein écran
Salir de pantalla completa|Exit full screen|Quitter le plein écran
Pantalla completa|Full screen|Plein écran
¿Qué necesita hacer hoy?|What would you like to do today?|Que souhaitez-vous faire aujourd’hui ?
¿Qué necesita|What would you like|Que souhaitez-vous
hacer hoy?|to do today?|faire aujourd’hui ?
Consulte nuestros servicios o converse con la asesora.|Explore our services or talk to the assistant.|Découvrez nos services ou parlez à l’assistante.
Horario de atención|Opening hours|Horaires d’accueil
Evite compartir documentos o información sensible.|Please avoid sharing documents or sensitive information.|Évitez de communiquer des documents ou des informations sensibles.
LE ESCUCHAMOS|WE’RE LISTENING|À VOTRE ÉCOUTE
ESTAMOS PARA AYUDARLE|WE’RE HERE TO HELP|NOUS SOMMES LÀ POUR VOUS
Su siguiente paso empieza con una pregunta.|Your next step starts with a question.|La prochaine étape commence par une question.
Su siguiente paso empieza|Your next step starts|La prochaine étape commence
con una pregunta.|with a question.|par une question.
Reservar un turno|Book an appointment|Prendre rendez-vous
Ver opciones|View options|Voir les options
Reservar y confirmar cita|Book and confirm|Réserver et confirmer
Consultar mi cita|Find my appointment|Consulter mon rendez-vous
Ver disponibilidad|Check availability|Voir les disponibilités
Reserve su turno.|Book your appointment.|Prenez rendez-vous.
Disponibilidad de citas.|Available appointments.|Rendez-vous disponibles.
Consulte su cita.|Find your appointment.|Consultez votre rendez-vous.
Consultar cita|Find appointment|Consulter le rendez-vous
Volver al inicio|Return home|Retour à l’accueil
Volver a la llamada|Return to the call|Retour à l’appel
Volver|Back|Retour
Editar|Edit|Modifier
Confirmar turno|Confirm appointment|Confirmer le rendez-vous
Revisar turno|Review appointment|Vérifier le rendez-vous
Confirmando…|Confirming…|Confirmation en cours…
Cargando horarios…|Loading available times…|Chargement des horaires…
Nombre y apellido|Full name|Prénom et nom
Correo electrónico|Email address|Adresse e-mail
Código de reserva|Booking code|Code de réservation
Día de su cita|Appointment date|Date du rendez-vous
01 / 03 · Elija su horario|01 / 03 · Choose a time|01 / 03 · Choisissez un horaire
02 / 03 · Sus datos|02 / 03 · Your details|02 / 03 · Vos coordonnées
03 / 03 · Revise y confirme|03 / 03 · Review and confirm|03 / 03 · Vérifiez et confirmez
Disponible|Available|Disponible
Ocupado|Unavailable|Indisponible
Hora pasada|Past time|Horaire passé
Sin anticipación suficiente|Too soon to book|Délai de réservation insuffisant
No quedan horarios disponibles en este día. Elija otra fecha.|No times are available on this day. Choose another date.|Aucun horaire disponible ce jour-là. Choisissez une autre date.
Ese horario ya no está disponible. Elija otra opción.|That time is no longer available. Please choose another.|Cet horaire n’est plus disponible. Choisissez une autre option.
No quedan horarios. Consulte con el personal.|No times are available. Please contact staff.|Aucun horaire disponible. Veuillez contacter le personnel.
Horarios del centro|Business time zone|Fuseau horaire du centre
Sin cobro en el kiosco|No payment at the kiosk|Aucun paiement à la borne
Sin cobros en el kiosco|No payments at the kiosk|Aucun paiement à la borne
Reservas en línea|Online appointments|Rendez-vous en ligne
Turnos con el personal|Appointments with staff|Rendez-vous auprès du personnel
SU PRÓXIMO PASO|YOUR NEXT STEP|VOTRE PROCHAINE ÉTAPE
SU PRÓXIMA CITA|YOUR NEXT APPOINTMENT|VOTRE PROCHAIN RENDEZ-VOUS
AGENDA DEL SERVICIO|SERVICE APPOINTMENTS|RENDEZ-VOUS DU SERVICE
INFORMACIÓN DEL SERVICIO|SERVICE INFORMATION|INFORMATIONS SUR LE SERVICE
¿Qué desea reservar?|What would you like to book?|Que souhaitez-vous réserver ?
Elija el servicio. El micrófono queda pausado mientras completa sus datos.|Choose a service. The microphone is paused while you enter your details.|Choisissez un service. Le microphone reste en pause pendant la saisie de vos coordonnées.
Puede reservar, consultar su cita o ver los horarios libres. El micrófono permanece pausado mientras escribe.|Book, find your appointment or check available times. The microphone stays paused while you type.|Réservez, consultez votre rendez-vous ou les horaires disponibles. Le microphone reste en pause pendant la saisie.
Puede reservar, consultar su cita o ver los horarios libres.|Book, find your appointment or check available times.|Réservez, consultez votre rendez-vous ou les horaires disponibles.
Agenda no disponible|Appointments unavailable|Agenda indisponible
No hay servicios con reserva en línea. Consulte al personal.|No services can currently be booked online. Please contact staff.|Aucun service n’est réservable en ligne actuellement. Contactez le personnel.
Acepto guardar mi nombre y correo en Nexo y en el calendario de Google del negocio para gestionar mi cita. El personal autorizado podrá verlos; no se envían a la IA. Puedo solicitar al personal la eliminación de mis datos.|I agree to store my name and email in Nexo and the business’s Google Calendar to manage my appointment. Authorized staff can view them; they are not sent to the AI. I may ask staff to delete my data.|J’accepte l’enregistrement de mon nom et de mon adresse e-mail dans Nexo et dans l’agenda Google de l’établissement pour gérer mon rendez-vous. Le personnel autorisé peut les consulter ; ces données ne sont pas envoyées à l’IA. Je peux demander au personnel de les supprimer.
Enviaremos la confirmación a este correo. Revíselo antes de continuar. No se realizará un cobro.|We will send confirmation to this email. Check it before continuing. No payment will be taken.|La confirmation sera envoyée à cette adresse e-mail. Vérifiez-la avant de continuer. Aucun paiement ne sera effectué.
Al confirmar se registrará su cita en la agenda del negocio. No se cobrará ningún importe.|Confirming will add your appointment to the business calendar. No payment will be taken.|La confirmation enregistrera votre rendez-vous dans l’agenda de l’établissement. Aucun montant ne sera facturé.
Su turno está reservado.|Your appointment is booked.|Votre rendez-vous est réservé.
Estamos verificando su reserva.|We are checking your booking.|Nous vérifions votre réservation.
Cita confirmada en Google Calendar|Appointment confirmed in Google Calendar|Rendez-vous confirmé dans Google Calendar
Cita cancelada|Appointment cancelled|Rendez-vous annulé
Confirmación enviada a {0}|Confirmation sent to {0}|Confirmation envoyée à {0}
No encontramos una cita con esos datos.|No appointment matches those details.|Aucun rendez-vous ne correspond à ces informations.
Escriba las 8 letras de su código de reserva. También aceptamos códigos anteriores.|Enter the 8 letters of your booking code. Older codes are also accepted.|Saisissez les 8 lettres de votre code de réservation. Les anciens codes sont également acceptés.
ANTES DE EMPEZAR|BEFORE YOU START|AVANT DE COMMENCER
Un espacio para ayudarle.|Here to help you.|Un espace pour vous aider.
Entendido, continuar|I understand, continue|J’ai compris, continuer
Nexo utiliza IA de OpenAI. Al continuar, acepta enviar el texto de esta conversación y el catálogo a OpenAI para recibir respuestas. Los datos del formulario de turnos permanecen separados.|Nexo uses OpenAI’s AI. By continuing, you agree to send this conversation’s text and the catalog to OpenAI for responses. Appointment form details are kept separate.|Nexo utilise l’IA d’OpenAI. En continuant, vous acceptez l’envoi du texte de cette conversation et du catalogue à OpenAI pour obtenir des réponses. Les données du formulaire de rendez-vous restent séparées.
Guardamos sus preguntas y las respuestas en un historial privado para seguimiento y estadísticas; no grabamos audio ni video.|We keep questions and responses in a private history for follow-up and statistics; we do not record audio or video.|Nous conservons les questions et réponses dans un historique privé pour le suivi et les statistiques ; nous n’enregistrons ni audio ni vidéo.
Esta videollamada utiliza LiveAvatar, recibe la voz de las respuestas y dura un máximo de 60 segundos.|This video call uses LiveAvatar, receives the spoken responses and lasts up to 60 seconds.|Cet appel vidéo utilise LiveAvatar, reçoit les réponses vocales et dure au maximum 60 secondes.
Esta atención utiliza una imagen y voz generada en el servidor; no abre una sesión de LiveAvatar.|This conversation uses an image and speech generated on the server; it does not open a LiveAvatar session.|Cette conversation utilise une image et une voix générée sur le serveur ; elle n’ouvre pas de session LiveAvatar.
Al iniciar la llamada, el micrófono se activará después del saludo. El navegador puede enviar el audio a su proveedor de reconocimiento. En modo automático, sus frases se envían al terminar de hablar; puede pausar con el micrófono.|The microphone starts after the greeting. Your browser may send audio to its speech recognition provider. In automatic mode, your words are sent when you finish speaking; you can pause using the microphone button.|Le microphone s’active après le message d’accueil. Le navigateur peut envoyer l’audio à son fournisseur de reconnaissance vocale. En mode automatique, vos phrases sont envoyées lorsque vous avez fini de parler ; vous pouvez mettre en pause avec le bouton du microphone.
El inicio se limpia después de un minuto sin actividad. También puede pulsar Nueva conversación. Las llamadas se cierran tras 45 segundos sin actividad. El texto se conserva en el historial privado para seguimiento.|The home screen resets after one minute without activity. You can also select New conversation. Calls end after 45 seconds without activity. Text remains in the private history for follow-up.|L’accueil est réinitialisé après une minute d’inactivité. Vous pouvez aussi choisir Nouvelle conversation. Les appels se terminent après 45 secondes d’inactivité. Le texte est conservé dans l’historique privé pour le suivi.
No escriba datos sensibles.|Do not enter sensitive information.|Ne saisissez pas de données sensibles.
¿Sigue aquí?|Are you still here?|Êtes-vous toujours là ?
¿Desea continuar esta conversación? Si usted es otra persona, inicie una nueva para limpiar la pantalla.|Would you like to continue? If you are a different person, start a new conversation to clear the screen.|Souhaitez-vous continuer ? Si vous êtes une autre personne, démarrez une nouvelle conversation pour effacer l’écran.
Sí, continuar|Yes, continue|Oui, continuer
No, nueva conversación|No, new conversation|Non, nouvelle conversation
Sesión finalizada. Gracias por visitarnos.|Conversation ended. Thank you for visiting.|Conversation terminée. Merci de votre visite.
La sesión terminó. Inicia una conversación nueva.|Your session has ended. Start a new conversation.|Votre session est terminée. Commencez une nouvelle conversation.
CONVERSACIÓN POR VOZ|VOICE CONVERSATION|CONVERSATION VOCALE
Active su micrófono.|Enable your microphone.|Activez votre microphone.
Continuar con micrófono|Continue with microphone|Continuer avec le microphone
El navegador puede enviar su audio a su proveedor de reconocimiento de voz. Puede necesitar internet. Esta aplicación no guarda grabaciones.|Your browser may send audio to its speech recognition provider. An internet connection may be needed. This app does not store recordings.|Le navigateur peut envoyer votre audio à son fournisseur de reconnaissance vocale. Une connexion internet peut être nécessaire. Cette application ne conserve pas d’enregistrements.
Revise la transcripción antes de enviarla. También puede escribir su consulta.|Review the transcript before sending it. You can also type your question.|Vérifiez la transcription avant de l’envoyer. Vous pouvez aussi écrire votre question.
En esta llamada, sus frases se enviarán automáticamente cuando termine de hablar. Pulse el micrófono para pausar. Mientras Nexo responde, la escucha se detiene.|In this call, your words are sent automatically when you finish speaking. Press the microphone to pause. Listening stops while Nexo responds.|Pendant cet appel, vos phrases sont envoyées automatiquement lorsque vous avez fini de parler. Appuyez sur le microphone pour mettre en pause. L’écoute s’arrête pendant la réponse de Nexo.
Teclado en pantalla|On-screen keyboard|Clavier à l’écran
Teclado para {0}|Keyboard for {0}|Clavier pour {0}
Listo ✓|Done ✓|Terminé ✓
Escriba|Type|Écrivez
Espacio|Space|Espace
Listo cierra el teclado. No envía la consulta ni confirma la cita.|Done closes the keyboard. It does not send your question or confirm an appointment.|Terminé ferme le clavier. Cela n’envoie pas votre question et ne confirme pas le rendez-vous.
Preparando la llamada por voz…|Preparing your voice call…|Préparation de votre appel vocal…
Conectando con su asesora…|Connecting to your assistant…|Connexion avec votre assistante…
Le escucho. Hable ahora.|I’m listening. Please speak.|Je vous écoute. Vous pouvez parler.
Le escucho. ¿En qué puedo ayudarle?|I’m listening. How can I help?|Je vous écoute. Comment puis-je vous aider ?
Su asistente está disponible.|Your assistant is available.|Votre assistante est disponible.
Activando el micrófono…|Starting the microphone…|Activation du microphone…
Pensando…|Thinking…|Réflexion en cours…
Hablando…|Speaking…|Réponse en cours…
Hablando… después volveré a escuchar|Speaking… I’ll listen again afterwards|Réponse en cours… l’écoute reprendra ensuite
Preparándome para escuchar…|Getting ready to listen…|Préparation de l’écoute…
Micrófono en pausa · Pulse para hablar|Microphone paused · Press to talk|Microphone en pause · Appuyez pour parler
Toque el micrófono para hablar|Press the microphone to speak|Appuyez sur le microphone pour parler
Pausar escucha automática|Pause automatic listening|Suspendre l’écoute automatique
Hablar con Nexo|Speak to Nexo|Parler à Nexo
Activar micrófono|Enable microphone|Activer le microphone
Silenciar respuesta|Mute response|Couper la voix
Activar voz|Enable voice|Activer la voix
Abrir conversación por texto|Open text conversation|Ouvrir la conversation écrite
Colgar y volver al inicio|Hang up and return home|Raccrocher et revenir à l’accueil
Cerrar panel y volver a la llamada|Close panel and return to call|Fermer et revenir à l’appel
Cambiar a envío manual|Switch to manual sending|Passer à l’envoi manuel
Cambiar a conversación automática|Switch to automatic conversation|Passer à la conversation automatique
Ver video horizontal completo|Show full landscape video|Afficher la vidéo horizontale complète
Llenar pantalla con encuadre vertical|Fill screen with a portrait crop|Remplir l’écran avec un cadrage vertical
Llamada por voz · Puede pausar con el micrófono|Voice call · Press the microphone to pause|Appel vocal · Appuyez sur le microphone pour mettre en pause
Puede colgar en cualquier momento.|You may hang up at any time.|Vous pouvez raccrocher à tout moment.
No se detectó voz. Compruebe que su micrófono no esté silenciado y vuelva a intentarlo.|No speech detected. Check that your microphone is not muted and try again.|Aucune voix détectée. Vérifiez que le microphone n’est pas coupé et réessayez.
No se autorizó el micrófono. Permita el acceso para este sitio en su navegador y revise los permisos de micrófono de Windows.|Microphone access was denied. Allow access for this site in your browser and check the microphone permissions in Windows.|L’accès au microphone a été refusé. Autorisez-le pour ce site dans le navigateur et vérifiez les permissions de Windows.
Este servicio no admite el idioma seleccionado.|This service does not support the selected language.|Ce service ne prend pas en charge la langue choisie.
La voz no está disponible en este dispositivo. Puede escribir su consulta o consultar con el personal.|Voice is not available on this device. You can type your question or contact staff.|La voix n’est pas disponible sur cet appareil. Vous pouvez écrire votre question ou contacter le personnel.
PRIVACIDAD Y USO|PRIVACY AND USE|CONFIDENTIALITÉ ET UTILISATION
Privacidad y uso|Privacy and use|Confidentialité et utilisation
Usted decide qué compartir.|You decide what to share.|Vous décidez de ce que vous partagez.
A SU DISPOSICIÓN|HERE TO HELP|À VOTRE SERVICE
Puede hablar con la asesora, escribir o consultar los servicios y citas desde el inicio.|You can speak to the assistant, type or view services and appointments from the home screen.|Depuis l’accueil, vous pouvez parler à l’assistante, écrire ou consulter les services et les rendez-vous.
Acceso del personal|Staff access|Accès du personnel
Administración|Administration|Administration
Configuración|Settings|Paramètres
Documentación del proyecto|Project documentation|Documentation du projet
Opciones de video|Video options|Options vidéo
Ver imagen|Show image|Afficher l’image
Activar sonido|Enable sound|Activer le son
Preparación para el road test|Road test preparation|Préparation à l’examen pratique
Clases presenciales y virtuales|In-person and online lessons|Cours en présentiel et en ligne
Curso de las 5 horas|5-hour course|Cours de 5 heures
Clase práctica|Driving lesson|Leçon de conduite
Preparación para presentar el examen práctico de manejo del DMV de Nueva York. Consulte con el personal el contenido de la preparación.|Preparation for the New York DMV road test. Ask staff about the preparation content.|Préparation à l’examen pratique de conduite du DMV de New York. Renseignez-vous auprès du personnel sur le contenu de la préparation.
La escuela ofrece clases presenciales y virtuales. Consulte qué modalidad corresponde a la preparación que necesita.|The school offers in-person and online lessons. Ask which format applies to the preparation you need.|L’école propose des cours en présentiel et en ligne. Renseignez-vous sur la formule adaptée à la préparation souhaitée.
Información sobre el curso de las 5 horas. Consulte con el personal la modalidad y las próximas fechas.|Information about the 5-hour course. Ask staff about the format and upcoming dates.|Informations sur le cours de 5 heures. Renseignez-vous auprès du personnel sur la formule et les prochaines dates.
Clase individual de conducción de 60 minutos. Elija un horario disponible para reservar su clase.|A 60-minute individual driving lesson. Choose an available time to book.|Leçon individuelle de conduite de 60 minutes. Choisissez un horaire disponible pour réserver.
Consultar precio|Ask about price|Se renseigner sur le tarif
Precio pendiente de confirmar con la escuela.|Price to be confirmed with the school.|Tarif à confirmer auprès de l’école.
Precio pendiente de confirmar con el personal.|Price to be confirmed with staff.|Tarif à confirmer auprès du personnel.
Precio por confirmar|Price to be confirmed|Tarif à confirmer
Requisitos pendientes de confirmar con la escuela.|Requirements to be confirmed with the school.|Conditions à confirmer auprès de l’école.
Requisitos por confirmar con el personal.|Requirements to be confirmed with staff.|Conditions à confirmer auprès du personnel.
Duración pendiente de confirmar.|Duration to be confirmed.|Durée à confirmer.
Duración por confirmar|Duration to be confirmed|Durée à confirmer
Modalidad pendiente de confirmar para este servicio.|The format for this service is to be confirmed.|La formule de ce service reste à confirmer.
Modalidad por confirmar|Format to be confirmed|Formule à confirmer
Este servicio es sin costo.|This service is free of charge.|Ce service est gratuit.
Sin costo|Free of charge|Gratuit
Presencial|In person|En présentiel
Virtual|Online|En ligne
Híbrida|Hybrid|Hybride
Con gusto.|Of course.|Avec plaisir.
Buenos días|Good morning|Bonjour
Buenas tardes|Good afternoon|Bonjour
Buenas noches|Good evening|Bonsoir
Hola|Hello|Bonjour
¿Qué desea consultar?|What would you like to know?|Que souhaitez-vous savoir ?
¿Desea conocer el precio, los requisitos o la modalidad?|Would you like to know the price, requirements or format?|Souhaitez-vous connaître le tarif, les conditions ou la formule ?
¿Desea conocer los requisitos o el precio?|Would you like to know the requirements or price?|Souhaitez-vous connaître les conditions ou le tarif ?
Nuestros servicios publicados:|Our available services:|Nos services proposés :
¿Sobre cuál desea información?|Which would you like to know more about?|Sur lequel souhaitez-vous des informations ?
¿Sobre qué servicio desea información?|Which service would you like to know about?|Sur quel service souhaitez-vous des informations ?
¿Sobre qué servicio desea consultar?|Which service are you asking about?|Sur quel service porte votre question ?
¿Su consulta se refiere a un servicio de la escuela? Puede preguntar por|Is your question about a school service? You can ask about|Votre question concerne-t-elle un service de l’école ? Vous pouvez vous renseigner sur
Con gusto le ayudo a elegir un servicio. ¿Ya tiene su permiso de aprendizaje?|I can help you choose a service. Do you already have your learner permit?|Je peux vous aider à choisir un service. Avez-vous déjà votre permis d’apprentissage ?
Gracias. ¿Desea practicar manejo o prepararse para un examen?|Thank you. Would you like driving practice or exam preparation?|Merci. Souhaitez-vous pratiquer la conduite ou préparer un examen ?
Gracias. Los requisitos para iniciar su trámite debe confirmarlos con el personal; no tengo esa información aprobada. ¿Desea información sobre clases o preparación para un examen?|Thank you. Please confirm the application requirements with staff; I do not have approved information about them. Would you like information about lessons or exam preparation?|Merci. Veuillez confirmer les conditions de votre démarche auprès du personnel ; je ne dispose pas d’informations approuvées à ce sujet. Souhaitez-vous des informations sur les cours ou la préparation à un examen ?
Por lo que me comenta, puede considerar|Based on what you’ve told me, you could consider|D’après ce que vous me dites, vous pouvez envisager
Puede considerar estos servicios:|You could consider these services:|Vous pouvez envisager ces services :
¿Desea aprender a manejar, practicar para el examen o información sobre un curso?|Would you like to learn to drive, practice for the test or learn about a course?|Souhaitez-vous apprendre à conduire, vous entraîner pour l’examen ou vous renseigner sur un cours ?
No tengo información confirmada sobre esa consulta. Puede consultarla con el personal de la escuela. ¿Desea información sobre nuestras clases o cursos?|I do not have confirmed information about that question. Please check with school staff. Would you like information about our lessons or courses?|Je n’ai pas d’informations confirmées sur cette question. Veuillez vous renseigner auprès du personnel de l’école. Souhaitez-vous des informations sur nos cours ?
No tengo un servicio publicado que confirme esa preparación. Consulte con el personal para que le oriente; no quiero ofrecerle algo que aún no está confirmado.|I do not have a published service confirming that preparation. Please ask staff for guidance; I don’t want to offer something that has not been confirmed.|Aucun service publié ne confirme cette préparation. Veuillez demander conseil au personnel ; je ne souhaite pas vous proposer une prestation non confirmée.
Con gusto. Puede consultar nuestros servicios o finalizar la atención.|You’re welcome. You can explore our services or end the conversation.|Avec plaisir. Vous pouvez consulter nos services ou terminer la conversation.
Nuestro horario general de atención es:|Our general opening hours are:|Nos horaires généraux d’accueil sont :
Las fechas de clases, feriados y cupos se confirman con el personal; este horario no indica disponibilidad de turnos.|Lesson dates, holidays and places must be confirmed with staff; opening hours do not indicate appointment availability.|Les dates des cours, jours fériés et places sont à confirmer auprès du personnel ; ces horaires n’indiquent pas les disponibilités des rendez-vous.
Lunes a viernes|Monday to Friday|Du lundi au vendredi
Sábado y Domingo: cerrado|Saturday and Sunday: closed|Samedi et dimanche : fermé
Sábado a Domingo: cerrado|Saturday and Sunday: closed|Samedi et dimanche : fermé
hora de Nueva York|New York time|heure de New York
Puedo ayudarle únicamente con los servicios y turnos de {0}.|I can only help with services and appointments at {0}.|Je peux uniquement vous aider concernant les services et rendez-vous de {0}.
¿Desea consultar clases, preparación para el examen o nuestros horarios?|Would you like to ask about lessons, exam preparation or opening hours?|Souhaitez-vous des informations sur les cours, la préparation à l’examen ou nos horaires ?
Puede continuar consultando las fichas de Servicios.|You can continue browsing the service cards.|Vous pouvez continuer à consulter les fiches des services.
Este kiosco no procesa pagos. Consulte con el personal las formas de pago disponibles.|This kiosk does not process payments. Ask staff about available payment methods.|Cette borne ne traite pas les paiements. Renseignez-vous auprès du personnel sur les modes de paiement acceptés.
Puede continuar consultando precios, requisitos, duración y modalidad en las fichas de Servicios. Para orientación adicional, consulte al personal de la escuela.|You can continue checking prices, requirements, duration and format in Services. For further guidance, please contact school staff.|Vous pouvez consulter les tarifs, conditions, durées et formules dans Services. Pour plus de conseils, contactez le personnel de l’école.
Puede continuar consultando las fichas de Servicios o acercarse al personal de la escuela.|You can browse Services or contact school staff.|Vous pouvez consulter Services ou vous adresser au personnel de l’école.
¿Qué servicio desea reservar?|Which service would you like to book?|Quel service souhaitez-vous réserver ?
Puede elegirlo en Servicios.|You can choose it in Services.|Vous pouvez le choisir dans Services.
¿Para qué fecha desea consultar?|Which date would you like to check?|Pour quelle date souhaitez-vous consulter les disponibilités ?
¿Para qué día desea su cita de {0}?|Which day would you like your {0} appointment?|Pour quel jour souhaitez-vous votre rendez-vous pour {0} ?
¿A partir de qué hora? Indique si es por la mañana o por la tarde.|From what time? Please specify morning or afternoon.|À partir de quelle heure ? Précisez le matin ou l’après-midi.
Esa fecha ya pasó. ¿Qué fecha futura prefiere?|That date has passed. Which future date would you prefer?|Cette date est passée. Quelle date future préférez-vous ?
No pude comprobar la agenda en este momento. Inténtelo de nuevo desde Mi cita y horarios o consulte al personal.|I could not check the calendar right now. Try again from Appointments & times or contact staff.|Je n’ai pas pu vérifier l’agenda. Réessayez depuis Rendez-vous et horaires ou contactez le personnel.
Elija una de las opciones que le acabo de ofrecer, o indique otra fecha.|Choose one of the options I just offered, or give another date.|Choisissez l’une des options proposées ou indiquez une autre date.
Ese horario ya no está disponible. Pida nuevamente los horarios o elija otra fecha.|That time is no longer available. Ask for times again or choose another date.|Cet horaire n’est plus disponible. Demandez à nouveau les horaires ou choisissez une autre date.
Complete su nombre y correo en pantalla y revise los datos antes de confirmar. Todavía no está reservada.|Enter your name and email on screen and review the details before confirming. It is not booked yet.|Saisissez votre nom et votre adresse e-mail à l’écran et vérifiez les informations avant de confirmer. Le rendez-vous n’est pas encore réservé.
No encontré horarios disponibles de {0} para {1} con esa preferencia dentro del período habilitado para reservas. ¿Prefiere otro día o franja horaria?|No available times matched {0} on {1} with that preference within the booking period. Would you prefer another day or time of day?|Aucun horaire ne correspond à {0} le {1} avec cette préférence dans la période de réservation. Préférez-vous un autre jour ou une autre plage horaire ?
Para {0} encontré: {1}. Horarios de {2}. ¿Cuál prefiere? Puede decir «la segunda» o «mejor por la mañana».|For {0}, I found: {1}. Times in {2}. Which do you prefer? You can say “the second” or “morning instead”.|Pour {0}, j’ai trouvé : {1}. Horaires en {2}. Que préférez-vous ? Vous pouvez dire « la deuxième » ou « plutôt le matin ».
Seleccionó {0}, {1}. {2}|You selected {0}, {1}. {2}|Vous avez choisi {0}, {1}. {2}
Para buscar su cita, indique el servicio, el día y si prefiere mañana o tarde. También puede usar Mi cita y horarios.|To find an appointment, tell me the service, day, and whether you prefer morning or afternoon. You can also use Appointments & times.|Pour chercher un rendez-vous, indiquez le service, le jour et votre préférence pour le matin ou l’après-midi. Vous pouvez aussi utiliser Rendez-vous et horaires.
De acuerdo. Dejamos esta búsqueda. Sus citas existentes no se han cancelado.|Okay, we’ll stop this search. Your existing appointments have not been cancelled.|D’accord, nous arrêtons cette recherche. Vos rendez-vous existants n’ont pas été annulés.
no admite reservas en línea. Consulte con el personal.|cannot be booked online. Please contact staff.|ne peut pas être réservé en ligne. Contactez le personnel.
En la llamada por voz, pulse «Mi cita y horarios» para reservar, ver disponibilidad o consultar una cita con su correo y código. También puede reservar desde Servicios. Revise y confirme el formulario; las frases por voz no registran citas.|During a voice call, select “Appointments & times” to book, check availability or find an appointment using your email and code. You can also book from Services. Review and confirm the form; spoken requests do not create bookings.|Pendant un appel vocal, sélectionnez « Rendez-vous et horaires » pour réserver, voir les disponibilités ou consulter un rendez-vous avec votre e-mail et votre code. Vous pouvez aussi réserver depuis Services. Vérifiez et confirmez le formulaire ; les demandes vocales ne créent pas de réservation.
Para coordinar su turno, consulte con el personal de la escuela. La agenda en línea estará disponible próximamente.|Please contact school staff to arrange your appointment. Online booking will be available later.|Contactez le personnel de l’école pour organiser votre rendez-vous. La réservation en ligne sera disponible prochainement.
Hola, soy Nexo, su asistente virtual de MetodoMogollon. Puedo orientarle sobre la preparación para el road test, las clases y el curso de las 5 horas. ¿En qué puedo ayudarle?|Hello, I’m Nexo, your MetodoMogollon virtual assistant. I can help with road test preparation, lessons and the 5-hour course. How can I help you?|Bonjour, je suis Nexo, votre assistant virtuel MetodoMogollon. Je peux vous renseigner sur la préparation à l’examen pratique, les leçons et le cours de 5 heures. Comment puis-je vous aider ?
¿En qué puedo ayudarle?|How can I help you?|Comment puis-je vous aider ?
Hola. ¿Qué desea consultar?|Hello. What would you like to know?|Bonjour. Que souhaitez-vous savoir ?
Hola.|Hello.|Bonjour.
Nuestro horario de atención es {0}. Los horarios de clases y cupos deben confirmarse con el personal.|Our opening hours are {0}. Lesson times and places must be confirmed with staff.|Nos horaires d’accueil sont {0}. Les horaires des cours et les places doivent être confirmés auprès du personnel.
Nuestros servicios publicados son:|Our available services are:|Nos services proposés sont :
¿Sobre cuál desea más información?|Which would you like to know more about?|Sur lequel souhaitez-vous davantage d’informations ?
Con gusto, puedo orientarle sobre|Of course, I can help you with|Avec plaisir, je peux vous renseigner sur
Las condiciones para cancelar o cambiar un turno deben confirmarse con el personal de la escuela. Este kiosco todavía no modifica reservas.|Please confirm cancellation or rescheduling conditions with school staff. This kiosk does not yet modify bookings.|Veuillez confirmer les conditions d’annulation ou de modification auprès du personnel. Cette borne ne modifie pas encore les réservations.
Este kiosco no procesa pagos. Consulte con el personal los medios de pago disponibles.|This kiosk does not process payments. Ask staff about available payment methods.|Cette borne ne traite pas les paiements. Renseignez-vous auprès du personnel sur les moyens de paiement disponibles.
El teléfono y los medios de contacto están pendientes de incorporar. Consulte con el personal de la escuela.|Contact details have not been added yet. Please contact school staff.|Les coordonnées ne sont pas encore renseignées. Veuillez vous adresser au personnel de l’école.
La dirección está pendiente de incorporar. Consulte con el personal de la escuela.|The address has not been added yet. Please contact school staff.|L’adresse n’est pas encore renseignée. Veuillez vous adresser au personnel de l’école.
Modalidad publicada para este servicio:|Published format for this service:|Formule publiée pour ce service :
La preparación para el examen teórico debe confirmarse con el personal. La información publicada incluye clases, preparación para el road test y el curso de las 5 horas.|Please confirm written test preparation with staff. Published information includes lessons, road test preparation and the 5-hour course.|Veuillez confirmer la préparation à l’examen théorique auprès du personnel. Les informations publiées comprennent les leçons, la préparation à l’examen pratique et le cours de 5 heures.
No puedo garantizar el resultado de un examen. La escuela ofrece preparación para el road test; consulte con el personal cómo puede ayudarle a prepararse.|I cannot guarantee an exam result. The school offers road test preparation; ask staff how they can help you prepare.|Je ne peux pas garantir le résultat d’un examen. L’école propose une préparation à l’examen pratique ; demandez au personnel comment vous préparer.
Con gusto. Acérquese al personal de la escuela para recibir atención. Este kiosco no transfiere llamadas a una persona.|Of course. Please contact school staff for assistance. This kiosk does not transfer calls to a person.|Avec plaisir. Veuillez vous adresser au personnel de l’école. Cette borne ne transfère pas les appels à une personne.
¿Se refiere al curso de las 5 horas o a otro documento?|Do you mean the 5-hour course or another document?|Parlez-vous du cours de 5 heures ou d’un autre document ?
¿Qué documento necesita o para qué trámite se lo piden?|Which document do you need, or what is it needed for?|De quel document avez-vous besoin, ou pour quelle démarche vous le demande-t-on ?
¿Qué desea saber: el precio, los requisitos o cómo coordinar su atención?|Would you like the price, requirements or help arranging your visit?|Souhaitez-vous connaître le tarif, les conditions ou la façon d’organiser votre visite ?
¿Desea aprender a manejar o prepararse para un examen?|Would you like to learn to drive or prepare for an exam?|Souhaitez-vous apprendre à conduire ou préparer un examen ?
¿Busca clases para aprender a manejar o preparación para el examen práctico?|Are you looking for driving lessons or road test preparation?|Recherchez-vous des leçons de conduite ou une préparation à l’examen pratique ?
La orientación personalizada no está disponible en este momento. Puede consultar los servicios, precios y requisitos o acercarse al personal.|Personalized guidance is unavailable right now. You can check services, prices and requirements or contact staff.|Les conseils personnalisés ne sont pas disponibles pour le moment. Consultez les services, tarifs et conditions ou adressez-vous au personnel.
Puede consultar nuestros servicios, precios, requisitos y horarios.|You can check our services, prices, requirements and opening hours.|Vous pouvez consulter nos services, tarifs, conditions et horaires.
También puede elegir una opción en Servicios.|You can also choose an option in Services.|Vous pouvez aussi choisir une option dans Services.
Horarios del día|Times for this day|Horaires de la journée
Pasado|Past time|Horaire passé
Fuera de anticipación|Too soon to book|Délai de réservation insuffisant
Micrófono en pausa mientras completa su reserva.|Microphone paused while you complete your booking.|Microphone en pause pendant la réservation.
Consulte los horarios del día; los ocupados no se pueden seleccionar. Si desea reservar, seleccione uno y complete la confirmación.|View the day’s times; unavailable times cannot be selected. To book, select a time and complete the confirmation.|Consultez les horaires ; les créneaux occupés ne peuvent pas être sélectionnés. Pour réserver, choisissez un horaire et confirmez.
Puede reservar, consultar su cita o ver los horarios.|Book, find your appointment or check the times.|Réservez, consultez votre rendez-vous ou les horaires.
El micrófono permanece pausado mientras escribe.|The microphone stays paused while you type.|Le microphone reste en pause pendant la saisie.
Google no ha confirmado el registro. No haga otra reserva; consulte al personal con este código.|Google has not confirmed the booking. Do not book again; contact staff with this code.|Google n’a pas confirmé la réservation. Ne réservez pas à nouveau ; contactez le personnel avec ce code.
Su código de reserva|Your booking code|Votre code de réservation
Cita registrada en Google Calendar, en la agenda del negocio. No se añade automáticamente a su calendario personal. Conserve este código.|Appointment registered in the business’s Google Calendar. It is not automatically added to your personal calendar. Keep this code.|Rendez-vous enregistré dans l’agenda Google de l’établissement. Il n’est pas ajouté automatiquement à votre agenda personnel. Conservez ce code.
Revise también Spam.|Please also check your spam folder.|Vérifiez également les courriers indésirables.
Su cita está confirmada, pero no pudimos confirmar el envío del correo. Conserve el código y consulte al personal; no repita la reserva.|Your appointment is confirmed, but we could not confirm email delivery. Keep the code and contact staff; do not book again.|Votre rendez-vous est confirmé, mais l’envoi de l’e-mail n’a pas pu être confirmé. Conservez le code et contactez le personnel ; ne réservez pas à nouveau.
La reserva fue cancelada. Consulte al personal.|The booking was cancelled. Please contact staff.|La réservation a été annulée. Veuillez contacter le personnel.
Reintentar confirmación|Retry confirmation|Réessayer la confirmation
Elegir otro horario|Choose another time|Choisir un autre horaire
Cita pendiente de verificación|Appointment pending verification|Rendez-vous en cours de vérification
Consulte al personal|Please contact staff|Veuillez contacter le personnel
Escriba su correo y las 8 letras de su código. Puede usar mayúsculas o minúsculas, con o sin guion. Si no tiene el código, solicítelo al personal.|Enter your email and the 8 letters of your code. Uppercase or lowercase is accepted, with or without a hyphen. If you do not have your code, ask staff.|Saisissez votre e-mail et les 8 lettres de votre code. Majuscules ou minuscules sont acceptées, avec ou sans tiret. Si vous n’avez pas le code, demandez-le au personnel.
Confirmación enviada a {0}. Revise también Spam.|Confirmation sent to {0}. Please also check your spam folder.|Confirmation envoyée à {0}. Vérifiez également les courriers indésirables.
Activando micrófono…|Starting microphone…|Activation du microphone…
Escuchando… hable con naturalidad|Listening… speak naturally|À votre écoute… parlez naturellement
Escuchando… hable ahora|Listening… please speak|À votre écoute… vous pouvez parler
Preparando el envío… pulse el micrófono para cancelar|Preparing to send… press the microphone to cancel|Préparation de l’envoi… appuyez sur le microphone pour annuler
Activando micrófono… revise si el navegador solicita permiso|Starting microphone… check if your browser asks for permission|Activation du microphone… vérifiez si le navigateur demande une autorisation
Revise la transcripción y pulse enviar ↑|Review the transcript and press send ↑|Vérifiez la transcription puis appuyez sur envoyer ↑
Cancelar activación del micrófono|Cancel microphone activation|Annuler l’activation du microphone
Detener micrófono y revisar texto|Stop microphone and review text|Arrêter le microphone et vérifier le texte
Micrófono|Microphone|Microphone
Controles de llamada|Call controls|Commandes de l’appel
Conversación con {0}|Conversation with {0}|Conversation avec {0}
Modo automático: pulse el micrófono una vez para conversar.|Automatic mode: press the microphone once to start talking.|Mode automatique : appuyez une fois sur le microphone pour parler.
Modo manual: hable, revise el texto y pulse Enviar.|Manual mode: speak, review the text and press Send.|Mode manuel : parlez, vérifiez le texte et appuyez sur Envoyer.
EXAMEN PRÁCTICO|ROAD TEST|EXAMEN PRATIQUE
APRENDIZAJE|LEARNING|APPRENTISSAGE
FORMACIÓN|TRAINING|FORMATION
SERVICIOS|SERVICES|SERVICES
Reservar, consultar su cita y ver disponibilidad|Book, find your appointment and check availability|Réserver, consulter votre rendez-vous et voir les disponibilités
Las citas en línea aún no están habilitadas|Online booking is not yet enabled|La réservation en ligne n’est pas encore activée
Nexo es un asistente virtual. En modo de prueba usa respuestas preparadas. En modo IA envía el texto de la conversación y el catálogo a OpenAI.|Nexo is a virtual assistant. Demo mode uses prepared responses. AI mode sends the conversation text and catalog to OpenAI.|Nexo est un assistant virtuel. Le mode de démonstration utilise des réponses préparées. Le mode IA envoie le texte de la conversation et le catalogue à OpenAI.
La voz de respuesta se genera en el servidor del centro. El reconocimiento del micrófono utiliza los servicios del navegador y puede enviar audio fuera de la PC. No guardamos grabaciones de audio o video. Conservamos en la base de datos el texto enviado y las respuestas generadas, con fecha, canal y datos de funcionamiento, para seguimiento y estadísticas. Solo Administración puede consultar y descargar ese historial.|Response speech is generated on the business server. Microphone recognition uses browser services and may send audio outside this computer. We do not store audio or video recordings. Sent text and generated responses are stored in the database with dates, channels and operating data for follow-up and statistics. Only Administration can view and download that history.|La voix des réponses est générée sur le serveur du centre. La reconnaissance du microphone utilise les services du navigateur et peut envoyer l’audio hors de cet ordinateur. Nous ne conservons pas d’enregistrements audio ou vidéo. Les textes envoyés et les réponses sont enregistrés avec la date, le canal et les données de fonctionnement pour le suivi et les statistiques. Seule l’administration peut consulter et télécharger cet historique.
Si activa el video, LiveAvatar recibe la voz sintetizada de las respuestas para animar el video; en el modo alternativo FULL recibe el texto. Su tratamiento de datos depende de las políticas de ese proveedor.|If you enable video, LiveAvatar receives synthesized speech to animate it; in the alternative FULL mode it receives text. Its data processing is subject to the provider’s policies.|Si vous activez la vidéo, LiveAvatar reçoit la voix synthétisée des réponses pour l’animer ; dans le mode alternatif FULL, il reçoit le texte. Le traitement des données dépend des politiques de ce fournisseur.
Las reservas confirmadas guardan el nombre y correo en Nexo y Google Calendar para gestionar la cita. No se procesan pagos.|Confirmed bookings store your name and email in Nexo and Google Calendar to manage the appointment. No payments are processed.|Les réservations confirmées enregistrent votre nom et votre e-mail dans Nexo et Google Calendar pour gérer le rendez-vous. Aucun paiement n’est traité.
Terminar la atención limpia la pantalla; el historial privado permanece para seguimiento. Evite escribir información sensible. El uso público requiere adaptar los avisos y las políticas al centro.|Ending the conversation clears the screen; the private history remains for follow-up. Avoid entering sensitive information. Public use requires adapting notices and policies to the business.|Terminer la conversation efface l’écran ; l’historique privé est conservé pour le suivi. Évitez de saisir des informations sensibles. L’utilisation publique nécessite d’adapter les avis et politiques à l’établissement.
Nexo está en modo de prueba con respuestas preparadas sobre el negocio. La agenda en línea todavía no está disponible.|Nexo is in demo mode with prepared responses about the business. Online booking is not yet available.|Nexo est en mode de démonstration avec des réponses préparées sur l’établissement. La réservation en ligne n’est pas encore disponible.
Acepto enviar la voz sintetizada de las respuestas a LiveAvatar para animar el video (en modo FULL se envía el texto). Se aplican las políticas de ese proveedor. Los datos del formulario de turnos quedan separados.|I agree to send synthesized responses to LiveAvatar to animate the video (FULL mode sends text). The provider’s policies apply. Appointment form data is kept separate.|J’accepte l’envoi des réponses vocales synthétisées à LiveAvatar pour animer la vidéo (le mode FULL envoie le texte). Les politiques du fournisseur s’appliquent. Les données du formulaire de rendez-vous restent séparées.
Respuestas locales|Local responses|Réponses locales
Entendido|Understood|Compris
Sin conexión|Offline|Hors connexion
Conectando…|Connecting…|Connexion…
Reservar turno|Book appointment|Prendre rendez-vous
¿Cómo reservo un turno?|How do I book an appointment?|Comment prendre rendez-vous ?
¿Qué servicios ofrecen?|What services do you offer?|Quels services proposez-vous ?
No encontramos una cita con ese correo y código. Revise ambos datos o consulte al personal.|No appointment matches that email and code. Check both or contact staff.|Aucun rendez-vous ne correspond à cet e-mail et à ce code. Vérifiez-les ou contactez le personnel.
Ese horario ya no está disponible. Elija otro.|That time is no longer available. Choose another.|Cet horaire n’est plus disponible. Choisissez-en un autre.
La información del servicio cambió. Vuelva a abrirlo.|The service details have changed. Open it again.|Les informations du service ont changé. Ouvrez-le à nouveau.
La sesión terminó. Inicie otra para consultar el turno con el personal.|Your session ended. Start another to ask staff about your appointment.|Votre session est terminée. Commencez-en une autre pour consulter votre rendez-vous auprès du personnel.
La sesión terminó. Inicia nuevamente para continuar.|Your session ended. Start again to continue.|Votre session est terminée. Recommencez pour continuer.
Demasiados intentos. Espera un minuto.|Too many attempts. Please wait a minute.|Trop de tentatives. Veuillez patienter une minute.
No se pudo interpretar la disponibilidad de Google. Consulte al personal.|Google availability could not be read. Please contact staff.|Les disponibilités Google n’ont pas pu être lues. Contactez le personnel.
Por confirmar|To be confirmed|À confirmer
La voz no está disponible. Puede escribir su consulta.|Voice is unavailable. You can type your question.|La voix n’est pas disponible. Vous pouvez écrire votre question.
Compruebe el micrófono y sus permisos.|Check the microphone and its permissions.|Vérifiez le microphone et ses autorisations.
Puedo ayudarle únicamente con los servicios y turnos de {0}. {1}|I can only help with services and appointments at {0}. {1}|Je peux uniquement vous aider concernant les services et rendez-vous de {0}. {1}
¿Desea información sobre clases, cursos o turnos de la escuela?|Would you like information about the school’s lessons, courses or appointments?|Souhaitez-vous des informations sur les leçons, les cours ou les rendez-vous de l’école ?
Puede continuar con el catálogo: {0}. Consulte las fichas o pregunte por precio, requisitos, duración y modalidad.|You can continue with the catalog: {0}. View the service cards or ask about price, requirements, duration and format.|Vous pouvez continuer avec le catalogue : {0}. Consultez les fiches ou renseignez-vous sur le tarif, les conditions, la durée et la formule.
Podemos guardar y reutilizar audios genéricos de respuestas aprobadas para responder más rápido. No grabamos su voz para esta biblioteca.|We may save and reuse generic audio of approved responses to reply faster. We do not record your voice for this library.|Nous pouvons enregistrer et réutiliser des fichiers audio génériques de réponses approuvées pour répondre plus vite. Nous n’enregistrons pas votre voix pour cette bibliothèque.
Sitio web de la escuela|School website|Site web de l’école
Practicar examen teórico|Practice the written test|S’entraîner à l’examen théorique
Se abre en otra pestaña. Puede regresar a Nexo al cerrarla.|Opens in another tab. Close it to return to Nexo.|S’ouvre dans un autre onglet. Fermez-le pour revenir à Nexo.
Nuestro sitio web es {0}. Puede abrirlo desde Ayuda y opciones → Sitio web de la escuela.|Our website is {0}. Open Help and options → School website.|Notre site web est {0}. Ouvrez Aide et options → Site web de l’école.
Puede acceder al simulador de práctica en {0}. Abra Ayuda y opciones → Practicar examen teórico. Es una herramienta de estudio, no el examen oficial del DMV.|Access the practice simulator at {0}. Open Help and options → Practice the written test. It is a study tool, not the official DMV test.|Accédez au simulateur d’entraînement sur {0}. Ouvrez Aide et options → S’entraîner à l’examen théorique. C’est un outil d’étude, pas l’examen officiel du DMV.
Enlace pendiente de confirmar con el personal.|Please confirm the link with staff.|Veuillez confirmer le lien auprès du personnel.
`;
export const translations=rows.trim().split('\n').map(row=>row.split('|'));
const exact=new Map(translations.map(([es,en,fr])=>[es,{en,fr}]));
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates=translations.filter(([s])=>s.includes('{0}')).sort((a,b)=>b[0].length-a[0].length).map(([es,en,fr])=>({re:new RegExp('^'+es.split(/\{\d+\}/).map(escape).join('(.+?)')+'$'),en,fr}));
const fragments=translations.filter(([s])=>!s.includes('{0}')&&(s.length>=8||s==='Hola.')).sort((a,b)=>b[0].length-a[0].length);
const pattern=new RegExp(fragments.map(([s])=>escape(s)).join('|'),'g');
export function translate(value,locale=language,depth=0){
 if(locale==='es'||!validLanguage(locale)||typeof value!=='string'||!value.trim())return value;
 const text=value.trim();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))return value;const match=exact.get(text);if(match)return value.replace(text,match[locale]);
 if(/[.?!]$/.test(text)&&exact.has(text.slice(0,-1)))return value.replace(text,exact.get(text.slice(0,-1))[locale]+text.at(-1));
 if(depth<3)for(const entry of templates){const m=text.match(entry.re);if(m)return value.replace(text,entry[locale].replace(/\{(\d+)\}/g,(_,n)=>translate(m[Number(n)+1],locale,depth+1)));}
 let result=value.replace(pattern,s=>exact.get(s)[locale]);
 const words={en:{'minutos':'minutes','Precio:':'Price:','Duración:':'Duration:','Modalidad:':'Format:'},fr:{'minutos':'minutes','Precio:':'Tarif :','Duración:':'Durée :','Modalidad:':'Formule :'}};
 for(const [a,b] of Object.entries(words[locale]))result=result.replaceAll(a,b);
 return result.replace(/, de (\d{2}:\d{2}) a (\d{2}:\d{2})/g,locale==='en'?', from $1 to $2':', de $1 à $2');
}
