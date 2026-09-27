# Filtro escolar y control de consultas

Versión 0.10.0 · 18 de septiembre de 2026

## Flujo vigente

El perfil MetodoMogollon aplica el filtro dentro de POST /api/chat, después de autenticar la sesión y antes de cualquier consulta al proveedor. Afecta por igual al texto, voz y videollamada. El navegador no puede suministrar el historial, número de intentos, servicio actual ni límites.

1. Normalizar acentos, mayúsculas, variantes Unicode y caracteres invisibles.
2. Detectar peticiones claramente ajenas o de cambio de rol antes de examinar palabras escolares. Por ejemplo, «programe un videojuego para la escuela» se rechaza localmente.
3. Identificar el servicio por nombre o alias y consultar el catálogo publicado vigente. Si un servicio fue pausado, pierde el contexto.
4. Resolver saludos, cortesía, servicios, precios, requisitos, duración, modalidad, horario general, agenda pendiente y pagos con plantillas locales.
5. Si falta un servicio, pedir una aclaración breve; si falta comprender la intención, se puede consultar a OpenAI para interpretarla y responder con el catálogo. Un dato nulo queda pendiente, y precio cero significa sin costo.
6. Permitir IA para orientación pertinente sobre conducción o un servicio identificado. Los seguimientos reconocidos incluyen «explíqueme mejor». Se añade el ID de servicio como contexto separado.
7. Comprobar tamaño del contexto y cuotas antes de reservar y realizar la consulta. Si no hay cupo, continuar con las fichas y respuestas locales.

Se interpreta con el mismo proveedor y modelo configurado cuando las reglas no bastan. [Flujo de interpretación, ejemplos y límites](22-interpretacion-intencion.md). Las reglas no garantizan detectar todos los desvíos: frases desconocidas pueden pedir aclaración aunque sean legítimas, y una solicitud engañosa puede pasar. Las instrucciones del modelo refuerzan el ámbito escolar, y los límites del servidor acotan las solicitudes permitidas.

## Contexto temporal y restricciones

Cada sesión conserva servicio actual, último tipo de dato, consulta pendiente de identificar servicio, última aclaración, desvíos locales claros acumulados y solicitudes a OpenAI. Se elimina al finalizar/vencer la sesión y no se archiva la conversación. Un visitante no hereda el contexto de otro.

Tras dos desvíos claros, esa sesión continúa solo con respuestas locales. La pantalla presenta Servicios (también en el panel de la llamada); aún se pueden consultar datos del catálogo por texto o voz. Los rechazos locales claros no se envían a OpenAI. Las dudas y la última aclaración sí pueden enviarse al intérprete, separadas del historial de orientación. Un rechazo del modelo no sanciona al visitante; solo los desvíos locales claros incrementan ese contador. Las consultas de orientación autorizadas conservan un historial acotado, con los cuatro mensajes anteriores como máximo enviados al modelo.

## Límites iniciales

| Control | Valor |
|---|---|
| Solicitudes a OpenAI por sesión | 6 |
| Solicitudes a OpenAI por día, compartidas por esta base de datos | 100 |
| Tamaño máximo del cuerpo preparado para OpenAI | 12000 bytes UTF-8 |
| Máximo de salida por consulta escolar a OpenAI | 300 tokens; interpretación hasta 250 |
| Desvíos antes de restringir a catálogo local | 2 |

AI_SESSION_MAX_CALLS y AI_DAILY_MAX_CALLS en .env permiten ajustar los dos cupos y requieren reiniciar el servidor. Si se omiten, rigen 6 y 100. Se validan enteros positivos; no existe un valor ilimitado. Las claves no se modificaron.

El día se calcula en America/New_York, incluidos cambios de horario de verano. ai_daily_usage guarda fecha, solicitudes reservadas y tokens de entrada/salida informados en respuestas exitosas. La reserva del cupo es una operación SQLite atómica antes de llamar al proveedor. Reiniciar Nexo o crear una sesión nueva no borra el contador diario. Un fallo, desconexión o cancelación no devuelve el cupo: el proveedor podría haber procesado la solicitud. Los totales de tokens pueden estar incompletos si no se recibió usage; no equivalen a la factura.

Estos son límites de solicitudes y tamaño, no un presupuesto monetario ni un cálculo exacto del importe. Solo aplican a las consultas escolares de esta instancia de Nexo, no a usos de la misma clave fuera de la aplicación. Las respuestas locales no consumen cupo ni tokens de OpenAI; si se pronuncian durante una videollamada, LiveAvatar sigue consumiendo tiempo de sesión. Se conserva su máximo de 60 segundos.

Administración muestra el número de solicitudes reservadas hoy y los límites al entrar o pulsar Actualizar datos. No muestra conversaciones ni credenciales.

## Verificación inicial v0.7.0

78 pruebas unitarias/API aprobadas. Cubren datos pendientes/cero, contexto, pausa de servicios, consultas ambiguas, desvíos mezclados con palabras escolares, inyección de instrucciones, aislamiento entre visitantes, cuotas por sesión/día, simultaneidad, fallos, tamaño del contexto, persistencia SQLite y fecha de Nueva York.

El recorrido test:filter verifica contexto, límite y retorno al catálogo en navegador, con proveedor simulado. Se verificó además la continuidad de la llamada por voz sin iniciar LiveAvatar. No se consultaron proveedores de pago en estas pruebas.

## Validación ampliada v0.7.1 · 17 de septiembre de 2026

- 98 pruebas unitarias/API aprobadas, incluidas 20 regresiones nuevas (algunas prueban varias frases). Las pruebas nuevas detectaron y permitieron corregir falsos bloqueos por «olvidé mis documentos», «política de cancelación» y «acciones para preparar el examen»; pérdida del dato consultado al cambiar de servicio; ausencia de continuidad después de pedir aclaración; mezcla de horario y precio; y atribución del precio del curso a un seguro ajeno al catálogo.
- Reconoce «cuánto sale» y «qué necesito». Conserva la consulta pendiente y reutiliza el contexto solo para seguimientos breves reconocidos. Refuerza los intentos de cambiar instrucciones en inglés y solicitudes ajenas mezcladas con vocabulario escolar. No cambia precios, requisitos, credenciales ni límites.
- Recorridos de navegador con dobles aprobados: filtro, cuota por sesión, dos desvíos, catálogo posterior; voz en cuatro tamaños, transcripción editable, silencio, cierre, inactividad y cambio de pestaña.
- Prueba en el servidor real y Edge: 15 consultas (8 por texto y 7 mediante transcripciones de voz simuladas). 4 respuestas reales de OpenAI; las demás se resolvieron localmente. Se verificaron 8 respuestas HTTP 200 de Piper y reproducción de audio decodificado con duración positiva, incluido el saludo.
- Uso incremental registrado: 4 solicitudes, 2816 tokens de entrada y 271 de salida (3087 en total). Son métricas informadas por OpenAI para esta ejecución, no una estimación de factura.
- Cero solicitudes de sesión de LiveAvatar y cero carga de LiveKit en el navegador. La ruta de inicio de video se bloqueó adicionalmente en la prueba para impedir consumo accidental. Cero errores JavaScript. Colgar limpió mensajes y entrada y regresó al inicio.
- Una solicitud mezclada sobre road test y asteroides pasó las reglas locales: OpenAI mantuvo el ámbito de la escuela y rechazó explicar el tema ajeno. Esto verifica la segunda protección en ese ejemplo y demuestra que esa protección sí consume tokens. El filtro no es una garantía semántica completa.

### Alcance y repetición

La prueba de voz inyecta el resultado del reconocimiento del navegador, pasa por su revisión y envío normales y utiliza OpenAI y Piper reales. No valida la captura física del micrófono, la precisión del reconocimiento en un ambiente ruidoso ni la audición humana. Esas comprobaciones quedan para una prueba presencial y en el iPad.

Las pruebas habituales no consumen OpenAI: `npm test`, `npm run test:filter` y `npm run test:voice`. Los recorridos de navegador requieren Playwright y Edge (o BROWSER_CHANNEL compatible en los recorridos simulados).

La prueba opcional de pago es `npm run test:filter:live`; exige `NEXO_RUN_LIVE_FILTER_TEST=1`, servidor local iniciado con el perfil escolar y OpenAI/Piper configurados. Consume normalmente cuatro consultas a OpenAI y no utiliza video. Requiere el catálogo escolar de esta validación y ADMIN_TOKEN local para comparar métricas. No ejecutarla simultáneamente con atención real: compara los contadores compartidos. PLAYWRIGHT_MODULE permite indicar la instalación de Playwright disponible. El resultado queda en `.local/filter-live-results.json` (excluido del control de versiones).
