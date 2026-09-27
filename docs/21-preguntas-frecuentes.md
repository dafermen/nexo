# Base de preguntas y respuestas frecuentes

> **Vigente desde v0.13.0:** las respuestas activas se guardan en SQLite y se editan en Administración → Respuestas frecuentes. El archivo inicial se importa una vez. El acceso admite códigos por correo tras configurar SMTP. [Guía de SQLite y acceso](31-sqlite-acceso-correo.md).

Versión 0.13.0 · 18 de septiembre de 2026

## Dónde editar las respuestas

Abra Administración → Respuestas frecuentes e ingrese con su acceso administrativo. Edite el texto y guarde; se valida antes de persistir en SQLite y se utiliza en la siguiente consulta sin reiniciar. El TXT original solo sirve para la importación inicial.

Se incluyen 24 temas y 62 variantes iniciales. Puede añadir hasta 5.000 temas, con 20 preguntas por tema. El archivo admite hasta 4 MB; cada pregunta hasta 250 caracteres y cada respuesta hasta 1.500. Identifique cada bloque con un nombre único entre corchetes, en minúsculas, sin espacios ni tildes.

## Ejemplo de respuesta parametrizada

```text
[precio-cinco-horas]
activo: sí
servicio: cinco-horas
pregunta: ¿Cuánto cuesta el curso de cinco horas?
pregunta: ¿Qué precio tiene el curso de las 5 horas?
respuesta: {{servicio.nombre}}. {{servicio.precio}}
```

Este tema ya existe con el identificador cinco-horas-precio. Edite ese bloque o añada preguntas allí, en lugar de duplicarlo. Varias entradas con la misma pregunta pueden producir una solicitud de aclaración.

Para una respuesta libre, no hace falta campo servicio ni parámetros. Por ejemplo, puede preparar una respuesta aún no publicada:

```text
[estacionamiento]
activo: no
pregunta: ¿Hay estacionamiento para alumnos?
pregunta: ¿Dónde puedo estacionar?
respuesta: Información pendiente de confirmar con el personal.
```

Cambie activo a sí cuando la información esté lista. Use una sola respuesta por tema. Puede continuar una respuesta en la siguiente línea dejando al menos dos espacios al comienzo. Las líneas que empiezan por # son comentarios. No se acepta HTML, código ejecutable ni expresiones dentro de los parámetros: las respuestas se muestran como texto.

## Parámetros disponibles

| Parámetro | Información usada al responder |
|---|---|
| {{centro.nombre}} | Nombre vigente de la escuela |
| {{centro.horario}} | Horario de atención, con zona horaria |
| {{centro.saludo}} | Presentación del centro |
| {{centro.turnos}} | Estado y orientación de la agenda |
| {{centro.servicios}} | Servicios activos publicados |
| {{servicio.nombre}} | Nombre del servicio indicado en el bloque |
| {{servicio.descripcion}} | Descripción vigente |
| {{servicio.precio}} | Precio, sin costo si es cero, o pendiente si no se conoce |
| {{servicio.duracion}} | Duración en minutos o dato pendiente |
| {{servicio.modalidad}} | Modalidad publicada o pendiente |
| {{servicio.requisitos}} | Requisitos registrados o pendientes |

Los parámetros servicio requieren una línea servicio con su identificador. Identificadores iniciales: cinco-horas, road-test y clases. Los servicios nuevos tienen el ID asignado por el catálogo. Un servicio pausado no devuelve respuestas específicas de sus fichas.

**Los precios y horarios siguen teniendo una única fuente: el catálogo y el perfil del centro, editables en Administración y guardados en SQLite.** Use parámetros para incluirlos en muchas respuestas sin repetir importes ni horarios en el archivo. El archivo permite editar las preguntas, redacción y detalles propios de cada respuesta. Una cifra escrita literalmente no se sincroniza con el catálogo.

No rellene con suposiciones precios, dirección, teléfono, requisitos ni condiciones del DMV. Las entradas iniciales los dejan pendientes cuando no se han proporcionado. Las respuestas redactadas por el responsable se consideran información publicada: deben revisarse antes de activarlas.

## Cómo encuentra una respuesta

1. El filtro escolar revisa primero intentos de desviar la conversación o cambiar instrucciones.
2. Los saludos se reconocen con variantes, nombre del asistente y cortesía. «Hola, muy buenos días, ¿cómo está usted?» recibe un saludo; «Buenos días, ¿cuánto cuesta…?» conserva la consulta comercial.
3. Se buscan variantes registradas, sin distinguir tildes o mayúsculas. También se admiten ciertos cambios de orden y fórmulas de cortesía con coincidencia suficiente de palabras. No se utilizan coincidencias amplias por una sola palabra ni se omite la negación no.
4. Una coincidencia clara se responde localmente, sustituyendo parámetros con datos actuales. No llama a OpenAI. Si varias respuestas coinciden, se aprovechan primero el servicio reconocido y los datos del catálogo. Solo cuando falta información se pide una aclaración concreta, sin mostrar mensajes internos sobre coincidencias.
5. Sin coincidencia, sigue el filtro y la conversación existentes: datos de catálogo, aclaración u orientación de IA permitida, con los mismos límites de consumo.

Las FAQs no entrenan el modelo ni se envían completas a OpenAI. La orientación de IA sigue recibiendo el catálogo y perfil habituales. Esta primera versión no comprende automáticamente todas las paráfrasis: añada variantes cuando detecte una forma de preguntar que no reconoce.

## Validación y recuperación

Abra VALIDAR-RESPUESTAS.cmd en la carpeta del proyecto para comprobar la base SQLite sin consultar proveedores; si aún no existe, se valida el archivo inicial. También puede usar npm run faq:check.

Administración muestra el número de temas activos y el estado de la base. Un texto inválido no se guarda: corrija la línea indicada. Si SQLite no puede leerse, el adaptador conserva la versión válida en memoria cuando existe y muestra un error. Mantenga respaldos consistentes de la base.

## Editor actual y siguiente etapa

SqliteFaqRepository mantiene refresh, lookup y status, por lo que voz y avatar no cambian. /knowledge permite editar la biblioteca escolar como texto validado. Un formulario visual por temas, importación masiva y revisión de publicaciones siguen pendientes.

## Pruebas históricas de las versiones anteriores

117 pruebas unitarias/API aprobadas, incluidas saludos compuestos, plantillas dinámicas, datos nulos y gratuitos, contexto por servicio, ambigüedad, temas desactivados, servicios pausados, validación de parámetros, recarga y recuperación, y un índice de 5.000 temas. El recorrido de administración existente también pasa.

Servidor real: seis consultas de saludos, contacto, precio, duración y desvío resueltas localmente; contador OpenAI sin cambios. Además, dos turnos automáticos con reconocimiento simulado y tres audios reales de Piper, sin consultas a OpenAI ni sesiones de LiveAvatar. La naturalidad con micrófono físico depende del reconocimiento del navegador y se prueba en Chrome.

## Ajuste de conversación: interés y saludos

- «Estoy interesado en el curso de las 5 horas» y «Curso de las 5 horas» reciben una orientación breve y una pregunta sobre precio, requisitos o modalidad. La duración se toma del catálogo.
- «Buenos días» recibe «Buenos días. ¿Qué desea consultar?», sin repetir la presentación de Nexo. Los saludos conservan el servicio y la última pregunta. Un saludo seguido de una consulta responde también la consulta.
- «¿Y cuánto cuesta?» y «¿También es virtual?» continúan sobre el curso indicado. Los datos pendientes se siguen señalando como pendientes.
- Una ficha general no sustituye una pregunta pendiente: «¿Cuánto cuesta?» → «Curso de las 5 horas» responde el precio.
- Si varias FAQs coinciden, el catálogo puede resolver la consulta. Si todavía falta precisión, Nexo pregunta qué dato o servicio desea conocer; nunca anuncia “más de una respuesta”.

Las respuestas de cortesía y del curso son editables en Administración → Respuestas frecuentes. Estas rutas son locales y se comparten entre texto y voz. No modifican la voz, el avatar ni los límites de consumo.

Validación del ajuste: 122 pruebas unitarias/API aprobadas, 53 archivos JavaScript válidos y archivo de conocimiento con 24 temas y 62 preguntas. Recorrido automático de voz verificado en navegador con reconocimiento y audio simulados. En el servidor activo se comprobaron ocho consultas de saludo, interés, duración, precio, modalidad y desvío, todas con respuesta local; el contador de OpenAI permaneció igual y no se abrió ninguna sesión de LiveAvatar.

## Comprensión adicional (v0.10.0)

Las consultas no reconocidas pueden usar el [intérprete de intención](22-interpretacion-intencion.md), con los mismos límites que la orientación. Las FAQs claras y saludos permanecen locales. El archivo completo de FAQs no se envía al modelo.

## Editor visual — v0.33.0

Entre a Administración → Respuestas frecuentes. La vista inicial permite crear y editar temas, categorías, variantes de preguntas, servicio, respuesta y estado. Busque, filtre o pase páginas de 30 temas. Use Vista previa antes de Guardar respuestas. Los parámetros se resuelven con el catálogo vigente. El modo Texto avanzado continúa disponible. [Manual ilustrado](55-editor-visual-github.md).
