# Interpretación de consultas con OpenAI

**Evolución v0.38.0:** [Conversación con contexto](58-conversacion-contextual.md). El intérprete recibe hasta tres intercambios recientes, comprende inclusiones/condiciones y puede dirigir orientación o agenda. Una intención indirecta puede consumir dos consultas del mismo presupuesto. Las restricciones de una única consulta descritas abajo corresponden a la versión inicial.

Versión 0.10.0 · 18 de septiembre de 2026

## Objetivo

Comprender consultas informales, regionalismos, errores escritos o posibles errores de transcripción sin exigir palabras exactas. La interpretación ayuda a identificar la petición; los precios, requisitos, duración, modalidades y condiciones siguen procediendo del catálogo de la escuela.

## Flujo

1. Las peticiones claramente ajenas o de cambio de instrucciones se redirigen localmente. Una palabra incidental, como pizza o Python en la descripción del trabajo del visitante, no basta para rechazar la consulta.
2. Saludos, FAQs y datos claramente identificados se resuelven con respuestas locales. Una aclaración evidente, como preguntar por el precio sin identificar servicio, también puede resolverse localmente.
3. Si falta comprender la intención, el servidor solicita una interpretación estructurada a OpenAI con el modelo configurado en OPENAI_MODEL. Se envían la frase, nombres y descripciones breves de los servicios activos, servicio actual, último dato consultado y, cuando existe, la última aclaración.
4. La salida solo puede identificar una intención, un ID de servicio activo, los datos solicitados o el tipo de aclaración. Se valida de nuevo en el servidor: no acepta campos adicionales, IDs ajenos, combinaciones incoherentes ni respuestas libres del modelo.
5. El servidor prepara la respuesta a partir del catálogo o una pregunta breve. No se hace una segunda llamada generativa después de interpretar. La orientación escolar que ya existía conserva su ruta separada y acotada.

| Ejemplo | Comportamiento esperado |
|---|---|
| A cómo sale lo de las cinco horas | Interpretar precio y consultar el dato vigente |
| Quiero aprender a guiar | Orientar hacia clases |
| Trabajo repartiendo pizza y necesito clases | Atender la consulta escolar |
| Soy programador Python y quiero clases de manejo | Atender la consulta escolar |
| Necesito el papelito ese | Preguntar si se refiere al curso de cinco horas o a otro documento |
| Sí, el de sinco oras | Usar la aclaración previa y presentar el curso |
| Cuánta plata tengo que llevar… | Interpretar la consulta económica sin confundir llevar dinero con documentos |
| Cuánto cuesta un seguro de automóvil | Indicar información no confirmada, sin heredar el precio del curso |
| Escríbame una receta de pizza | Redirigir localmente hacia la escuela |

## Trato al visitante

- Trato de usted, respuestas breves y una pregunta concreta cuando falta información.
- No se infieren educación, nacionalidad u otras características personales.
- La duda no incrementa el contador de desvíos. Un rechazo decidido únicamente por el modelo tampoco lo incrementa, porque puede equivocarse. La interpretación sigue sujeta al cupo de solicitudes.
- Dos desvíos claros detectados localmente mantienen la restricción existente a fichas y respuestas locales.
- La IA puede equivocarse y no comprende todas las expresiones. Estas pruebas no equivalen a una garantía sobre cualquier frase. Nuevas expresiones observadas deberán incorporarse a las evaluaciones.

## Consumo y fallos

La interpretación y la orientación comparten AI_SESSION_MAX_CALLS y AI_DAILY_MAX_CALLS: por defecto, 6 solicitudes por atención y 100 al día en America/New_York. No se agregan cupos independientes. La reserva diaria es atómica y ocurre antes de enviar la consulta. Cancelaciones y fallos no devuelven el cupo.

La interpretación solicita como máximo 250 tokens de salida, o el máximo escolar si fuese menor. El cuerpo completo, incluidos ejemplos y catálogo, conserva el límite de 12.000 bytes. No hay reintentos automáticos ni llamadas encadenadas para interpretar. El contador y los tokens informados por respuestas exitosas se registran en ai_daily_usage; no constituyen una factura ni incluyen necesariamente consumo sin respuesta recibida.

Si se agota el cupo, Nexo ofrece el catálogo. Si la API falla, rechaza la petición, trunca la salida o devuelve datos inválidos, pide una aclaración local. El visitante puede seguir consultando datos conocidos. El estado de una sesión cerrada no puede recibir una respuesta tardía.

El contexto de aclaración solo guarda en memoria la última frase (hasta 1.000 caracteres) y la pregunta del asistente (hasta 350); se elimina al resolverla o terminar la atención. Se separa del historial usado para orientación. No se guardan conversaciones en SQLite ni grabaciones por esta función. Las consultas a la API utilizan store:false; esto no sustituye las políticas de tratamiento de datos del proveedor.

## Arquitectura y configuración

- server/school-filter.js identifica respuestas locales, peticiones claras y candidatos a interpretación.
- server/school-intent.js construye el esquema, valida la interpretación y prepara respuestas con datos publicados.
- OpenAiProvider.interpret usa la API Responses; otros proveedores pueden implementar ese contrato sin modificar voz ni avatar.
- server/app.js conserva autenticación, aislamiento, cancelación y presupuesto compartido. El navegador no decide cuotas, contexto o proveedor.
- No se necesita otra clave ni se cambia el modelo. Usa OPENAI_API_KEY y OPENAI_MODEL ya configurados en el servidor.
- Las llamadas por voz, el texto y la videollamada comparten POST /api/chat. La interpretación no abre sesiones de LiveAvatar; el video conserva el máximo de 60 segundos cuando el visitante lo elige.

Contrato y formato basados en la [documentación oficial de Structured Outputs](https://developers.openai.com/es-419/api/docs/guides/structured-outputs). El esquema controla la forma de la salida, no garantiza que su significado sea correcto.

## Pruebas

- `npm test`: regresiones locales y pruebas de API sin proveedores de pago. Incluye catálogo vigente, datos pendientes, varios hechos, aislamiento, aclaraciones, mensajes incidentales, IDs inválidos, cuotas compartidas, concurrencia, fallos y cierre durante interpretación.
- `npm run test:intent`: recorrido de navegador con reconocimiento, TTS e interpretación simulados. Comprueba voz automática, seguimiento local, texto, audio, cierre y ausencia de solicitudes a LiveAvatar. Requiere Playwright y Edge; PLAYWRIGHT_MODULE y BROWSER_CHANNEL permiten usar instalaciones existentes.
- `npm run test:intent:live`: prueba opcional que consume OpenAI, exige NEXO_RUN_LIVE_INTENT_TEST=1, servidor iniciado y ADMIN_TOKEN configurado. No abre video. Compara contadores compartidos: ejecutar sin atención simultánea. No valida captura física ni audición.

La prueba real inicial detectó respuestas con datos no pedidos y una clasificación demasiado estricta para seguros de automóvil. Se ajustaron ejemplos, instrucciones, respuesta de información no confirmada y la política de no sancionar por decisiones del modelo. Los casos corregidos se repitieron antes de entregar.

## Validación de entrega v0.10.0

137 pruebas unitarias/API aprobadas, 57 archivos JavaScript válidos y archivo de FAQ válido (24 temas, 62 preguntas). El recorrido de navegador de interpretación por voz automática y texto pasa con reconocimiento y audio simulados, cuatro reproducciones y cierre sin errores ni solicitudes a LiveAvatar.

Se realizaron 16 solicitudes reales a OpenAI durante la evaluación y los ajustes: 15.778 tokens de entrada y 416 de salida informados. Incluye dos iteraciones que detectaron errores antes de la entrega; no son 16 clasificaciones perfectas. La repetición final de los casos corregidos y dos frases nuevas que no estaban en los ejemplos del prompt pasó: «Cuánta plata tengo que llevar…» se resolvió como precio y «Yo no sé mover un carro, ¿ustedes me enseñan?» como clases. No se abrió ninguna sesión de LiveAvatar. La captura física del micrófono y el iPad no se probaron en esta entrega.
