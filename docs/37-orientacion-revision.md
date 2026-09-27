# Orientación y revisión supervisada — v0.21.0

## Para el visitante

Por texto o voz, «Quiero sacar mi licencia, pero no sé por dónde empezar» inicia una orientación breve. Nexo pregunta si ya tiene permiso de aprendizaje y después qué preparación busca. Hace una pregunta a la vez. Si no tiene permiso, indica que los requisitos del trámite deben confirmarse con el personal: no deduce requisitos legales ni promete que pueda tomar una clase.

La sugerencia utiliza únicamente nombres y descripciones de servicios activos del catálogo. Si hay varias opciones, pide elegir; si no existe un servicio que confirme la preparación, deriva al personal. Después recuerda el servicio para preguntas como «¿Cuánto cuesta?». Precios y requisitos vacíos siguen pendientes, nunca se convierten en gratuitos o inexistentes.

Este recorrido es local, sin llamadas adicionales a OpenAI. La interpretación y orientación de preguntas fuera de estas reglas conserva las cuotas y el filtro existentes. Las reservas mantienen su propio flujo, validación en Calendar y confirmación explícita. No se crean citas durante esta orientación.

## Para el administrador

Abra **Administración → Mejorar respuestas** (`/reviews`) e ingrese con el acceso administrativo habitual.

1. Revise las consultas pendientes. Se muestran el texto original, la respuesta, el motivo de revisión y cuántas aclaraciones hubo en esa atención.
2. Escriba una **pregunta general sin datos personales** y una respuesta confirmada. No se copian automáticamente nombres, correos ni datos de citas al editor.
3. **Guardar borrador** conserva la propuesta en SQLite. No cambia ninguna respuesta del asistente.
4. Revise el contenido y marque la autorización. **Aprobar y publicar** agrega la respuesta a la base activa de preguntas frecuentes. Si edita el contenido, debe marcar nuevamente la aprobación.
5. Use **Descartar revisión** cuando no corresponda agregar una respuesta. El registro original permanece en el historial.

Las revisiones cerradas se pueden consultar en la lista. Para corregir o desactivar una respuesta publicada, use **Respuestas frecuentes**. Una pregunta duplicada no se agrega: se pide corregir la existente. Las distintas variantes pueden incorporarse con el editor de preguntas frecuentes.

La publicación de esta primera versión está disponible para la base SQLite de la escuela en modo archivo. Si se usa otro tipo de negocio o respuestas propias, el panel permite revisar/guardar borradores; la edición activa continúa en **Configuración → Respuestas**. El panel informa esta limitación y no publica respuestas escolares en otro negocio.

## Qué señalan las listas

- Aclaraciones del filtro/intérprete y agenda: son candidatas para revisión, no errores confirmados.
- Información no disponible o pendiente del catálogo.
- Fallos de interpretación, IA o generación: pueden requerir una corrección técnica, no una nueva respuesta frecuente.
- Temas consultados: conteos del historial conservado por servicio identificado, incluyendo general/sin identificar. No son visitantes únicos ni una clasificación semántica de temas.

Las preguntas normales de orientación (por ejemplo «¿Tiene permiso?») no se marcan automáticamente como fallos. La lista permite ver pendientes/borradores, cerradas o todas, en páginas de 30. Incluye registros anteriores que cumplen las señales, sin pedirle a una IA que los analice.

## Desarrollo y datos

- `server/service-guidance.js`: conversación local acotada, sobre el catálogo vigente. Memoria `schoolState.guidance` por sesión; se pierde al terminar la atención.
- `server/review-store.js`: tabla SQLite `answer_reviews`, ligada a `conversation_turns` mediante clave foránea con borrado en cascada. Guarda estado, pregunta, respuesta, revisión y fecha.
- `/api/admin/reviews`: lista, conteos y disponibilidad de publicación. `/api/admin/reviews/:id`: guardar borrador, descartar o publicar. Requieren autenticación administrativa, límites y las protecciones de origen existentes.
- La aprobación modifica FAQ y revisión en una misma transacción. Verifica versiones de ambas para impedir sobrescrituras desde dos ventanas. Registra una entrada de auditoría sin copiar el contenido en el evento.
- El texto de visitantes se presenta como texto, sin ejecutar HTML. Borradores y revisiones siguen la retención del historial; las respuestas publicadas permanecen como conocimiento aprobado hasta editarlas o desactivarlas.
- No hay aprendizaje automático ni se envía el historial a un proveedor para generar propuestas. La aprobación editorial no sustituye la comprobación del contenido por parte del administrador.

## Validación y siguientes pasos

Pruebas en `tests/guidance-review.test.js` y recorrido `tests/guidance-review.e2e.js`: voz/texto, memoria, ausencia de reservas, servicios inactivos, requisitos desconocidos, acceso protegido, borradores, aprobación, duplicados, conflicto entre versiones, reversión, retención, texto HTML y pantalla móvil. Proveedores simulados; sin gastos de OpenAI o LiveAvatar, citas o correos reales.

Pendientes: editor de recorridos de orientación para cualquier negocio, agrupación semántica de preguntas similares, publicación directa en respuestas propias, evaluación con expresiones regionales y métricas de conversión. Este paso no habilita reprogramación o cancelación por voz.
