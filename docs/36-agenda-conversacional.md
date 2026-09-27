# Agenda conversacional y memoria de la atención — v0.20.0

## Uso del visitante

Por texto, voz o texto de la videollamada puede pedir, por ejemplo:

1. «Quiero una clase práctica el viernes por la tarde».
2. Nexo consulta la agenda y ofrece hasta tres horarios reales, con fecha completa y zona horaria. Aparecen botones; durante la llamada también se abre el panel de conversación para poder tocarlos.
3. «Mejor por la mañana»: conserva el servicio y el día, cambia la preferencia y consulta otra vez.
4. «La segunda»: verifica de nuevo esa opción y abre el formulario con el servicio y hora seleccionados.
5. Escriba nombre/correo en pantalla, revise y pulse Confirmar turno. **Una frase o la selección de un horario no crean la cita.**

También puede pulsar una opción. El formulario vuelve a consultar la disponibilidad antes de aceptar la selección; al confirmar el servidor aplica otra comprobación. Si se ocupó, se pide elegir otra.

## Fechas y aclaraciones

Se admiten días de la semana, hoy/mañana/pasado mañana, fechas ISO, mañana/tarde y después de una hora. «Mañana» como día se distingue de «por la mañana». La fecha relativa se calcula usando la zona del negocio. Los días de la semana sin más detalle se interpretan como la próxima ocurrencia, incluyendo hoy; la respuesta muestra la fecha completa para revisarla.

«Después de las tres» requiere aclarar mañana/tarde. La preferencia pendiente se conserva al aclarar. «Después de las 15:30» filtra a partir de esa hora. Mañana significa antes de las 12:00; tarde desde las 12:00. Siempre se intersecta con los horarios reservables, duración, ocupación y anticipación del negocio.

Si falta servicio o fecha, pregunta. Servicios no reservables no heredan otra clase. Fechas pasadas, falta de cupos y errores de Calendar tienen respuestas separadas; no se inventan horas. Fechas fuera del horizonte pueden no ofrecer resultados: se informa que la búsqueda está limitada al período habilitado. Expresiones complejas como intervalos entre horas o fechas ambiguas pueden pedir aclaración o requerir el selector visual en esta primera versión.

## Memoria y privacidad

En memoria del servidor y por sesión se conservan servicio, fecha, franja, umbral horario, aclaración pendiente y hasta tres opciones. Se descarta al terminar, reiniciar o caducar la atención; no se comparte entre personas ni constituye una reserva. «No quiero reservar» u «Olvídelo» abandonan la búsqueda, sin cancelar citas existentes.

El historial privado existente sigue registrando mensajes/respuestas y consumo. No se solicitan nombre ni correo al modelo: esos datos se escriben en el formulario separado. El intérprete recibe el texto de la consulta, catálogo y contexto de agenda; `store:false` no sustituye las políticas del proveedor.

## Arquitectura y consumo

- `server/agenda-conversation.js`: detección de petición, interpretación local acotada, esquema para interpretación semántica, validación y ejecución de consultas de disponibilidad.
- `server/app.js`: aplica filtro de temas y restricciones, comparte cuotas de OpenAI y límite de consultas de Calendar, guarda la memoria por sesión y descarta resultados después de cerrar la atención.
- `BookingService.availability`: única fuente de los horarios ofrecidos. El modelo no genera horarios ni puede llamar a crear/cancelar reservas.
- `public/app.js`: presenta opciones y abre el formulario existente con `preferredSlot`, que vuelve a validar el horario.

Las frases claras se resuelven localmente. Las ambiguas pueden usar una única interpretación estructurada de OpenAI (máximo 300 tokens de salida, sujeto al máximo configurado), con los mismos cupos por sesión/día y límite de tamaño de entrada. No se agregan bucles autónomos ni consultas de orientación después de esa interpretación. Si no hay IA/cuota o la respuesta es inválida, se ofrece una aclaración o el catálogo. El modelo y la clave ya configurados se reutilizan.

Esta versión usa el contrato `AiProvider.interpret` existente: recibe un plan validado y ejecuta la consulta en el servidor. No cambia de SDK ni habilita acceso libre del modelo a Calendar. [Referencia oficial: salida estructurada](https://developers.openai.com/api/docs/guides/structured-outputs).

Las pruebas de texto/voz no abren LiveAvatar. La videollamada conserva el máximo de 60 segundos; el formulario puede continuar después del video.

## Validación y pendientes

Pruebas de fechas, franja y aclaración de hora, opciones caducadas, fallos, IDs inválidos, aislamiento de sesiones y cuotas compartidas. Recorrido del navegador por texto y voz con elección ordinal y formulario, sin crear una reserva al hablar. Los proveedores se simulan en estas pruebas.

Pendientes: expresiones de intervalos complejos, buscar más de tres alternativas, evaluación ampliada de regionalismos con personas reales La orientación inicial y revisión supervisada están disponibles en [la versión 0.21.0](37-orientacion-revision.md). No se habilitan cambios o cancelaciones por voz.

## Actualización v0.32.0

[Catálogo aprobado, regreso desde otra aplicación y reserva por hora exacta](54-catalogo-voz-agenda.md).
