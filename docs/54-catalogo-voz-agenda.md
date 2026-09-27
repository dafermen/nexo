# Catálogo del cliente, micrófono móvil y agenda por voz

Entrega v0.32.0. Fuente comercial: afiche de Método Mogollón NYC entregado por el responsable el 27 de septiembre de 2026. La duración de la clase individual (60 minutos) se conserva de la configuración previamente aprobada; el afiche no especifica su duración.

## Servicios y precios publicados

| Servicio | USD |
| --- | ---: |
| Cuaderno de Preguntas y Respuestas | 35 |
| Clase práctica de manejo, 60 minutos | 60 |
| Curso de Pre-Licencia de 5 Horas (Video) | 80 |
| Manual Práctico Método Mogollón | 80 |
| Road Test: carro + cita | 150 |
| Paquete completo, 5 clases | 585 |
| Paquete completo, 10 clases | 845 |
| Paquete completo, 15 clases | 1065 |
| Paquete completo, 20 clases | 1260 |

El cuaderno incluye como obsequio cita para el DMV y acceso al App; el afiche no indica qué trámite cubre esa cita. Cuaderno y manual están disponibles en inglés, español y francés.

Todos los paquetes incluyen Curso de Pre-Licencia de 5 Horas (Video), Manual Práctico Método Mogollón, sus clases prácticas, carro y cita para Road Test. No se agrega el cuaderno a esos paquetes ni se promete aprobación del examen, exención de requisitos, certificación, descuentos adicionales o entrega inmediata. Requisitos, pagos, vigencia, reembolsos, impuestos y condiciones no indicados se consultan con el personal.

Solo la clase práctica continúa con reserva en línea; sus IDs, profesores, calendarios y citas se conservan. El carro para Road Test se coordina con el personal: no se reserva como si fuera una clase individual. La ficha genérica antigua «Clases presenciales y virtuales» queda inactiva; no se borra su historial.

Los precios se guardan en centavos en el catálogo SQLite. Las FAQ usan `{{servicio.precio}}` y otros parámetros: actualizar el precio desde Administración cambia la respuesta sin editar todas las preguntas. El modelo de IA recibe el catálogo vigente. La huella de la biblioteca de audio cambia con el catálogo y evita reutilizar un audio que contenga precios anteriores.

## Probar la conversación

- «¿Cuánto cuesta la clase práctica?» → 60 USD.
- «¿Cuánto cuesta el road test?» → 150 USD por carro + cita, separado de la clase.
- «¿Qué incluye el paquete de 10 clases?» → componentes del afiche, precio 845 USD.
- «¿Hay disponibilidad el viernes?» → busca en Calendar; si solo hay un servicio reservable, utiliza ese servicio. Con varios pide elegir.
- «Quiero una clase práctica el viernes a las 9 am» → comprueba esa hora; si está libre abre el formulario con el horario seleccionado. Se elige profesor disponible, nombre, correo y consentimiento, luego se revisa y confirma.
- «El 2 de octubre de 2026 a las 3 pm» en contexto de agenda → misma búsqueda por fecha concreta.
- Si la hora es ambigua, pregunta mañana/tarde. Solo infiere AM/PM si exactamente una alternativa cabe en el horario publicado. No transforma una hora ocupada en otra diferente sin que el visitante elija.

Hablar nunca crea una cita. Al abrir el formulario se vuelve a comprobar disponibilidad, y la confirmación vuelve a comprobar profesor/horario para evitar dobles reservas. El nombre y el correo se escriben en pantalla; no se envían al modelo de IA.

## Cambiar de aplicación en el teléfono

En llamada por voz, ocultar Nexo pausa el micrófono y la reproducción; no se escucha en segundo plano. Si vuelve antes de 45 segundos, Nexo valida la sesión y reanuda la escucha automática si estaba activada. No reactiva una pausa manual ni escucha mientras está abierto el formulario de reserva. Al permanecer más tiempo fuera, limpia la atención por privacidad y permite iniciar otra.

Los navegadores móviles pueden exigir un nuevo gesto o permiso: en ese caso utilice el botón del micrófono. No se repiten solicitudes de permisos en bucle. Las videollamadas se cierran al salir para detener consumo; no se reconectan automáticamente con LiveAvatar.

La prueba automatizada simula eventos de suspensión del navegador. La comprobación final con el teléfono y navegador reales del cliente requiere repetir el cambio de aplicación y revisar los permisos del micrófono.

## Recorrido del código para el desarrollador junior

- `server/mogollon-offer.js`: función pura que construye el catálogo y FAQ desde el estado actual. Conserva IDs, usa precios del afiche, no consulta Calendar ni toca reservas.
- `scripts/apply-mogollon-offer.js`: calcula propuesta por defecto; `--apply` escribe con revisiones optimistas. Se usa explícitamente en esta instalación, nunca en cada arranque ni en otros negocios. Respaldar primero y aplicarlo con el servicio detenido. Catálogo y FAQ tienen transacciones separadas; si se interrumpe, repetir la carga antes de arrancar.
- `server/school-filter.js`: identifica clase práctica, productos y paquetes sin confundir curso de cinco horas con paquete de cinco clases. FAQ/hechos se resuelven sin OpenAI.
- `server/agenda-conversation.js`: `at` representa una hora exacta en minutos del día; `after` un umbral. El esquema de interpretación los distingue y valida. La disponibilidad real siempre es la fuente de los horarios ofrecidos.
- `server/app.js`: conserva el flujo de agenda por encima de una orientación comercial pendiente, sin eludir el filtro de temas ni los presupuestos.
- `public/app.js`: `suspendedCall` recuerda generación, momento de salida y automatismo. Solo la sesión vigente puede reanudar; pausa timers/STT/TTS y verifica sesión antes de escuchar.
- `public/providers/speech.js`: crea otra instancia de reconocimiento al retomar, descarta callbacks antiguos y da errores aplicables al dispositivo.
- `public/i18n.js` y `server/languages.js`: traducciones de textos comerciales conocidos y vocabulario de consulta; las frases libres fuera del vocabulario local siguen por interpretación limitada.

## Validación

Pruebas de precios/FAQ, ambigüedad de hora, fecha/día, disponibilidad ocupada, sesión y presupuesto; navegador con voz y calendario simulados hasta confirmar una cita y correo ficticios. La prueba de regreso móvil comprueba que el micrófono se detiene al ocultar la aplicación y se reabre una sola vez al regresar. No se utilizan cuentas ni sesiones pagadas en esos tests.

[Agenda y arquitectura](36-agenda-conversacional.md) · [Manual junior](23-manual-desarrollador-junior.md) · [Profesores](50-calendarios-por-profesor.md)
