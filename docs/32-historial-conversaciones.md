# Historial de conversaciones y métricas

## Uso desde Administración

Desde v0.14.0, abra Administración → Conversaciones. Use el mismo acceso por código de correo. Seleccione una atención para leer sus mensajes y pulse Descargar .txt para obtener un archivo de texto con el registro. La lista muestra 50 atenciones por página; el detalle carga 100 registros por página. La descarga incluye todos los registros de esa atención existentes cuando se inicia la exportación.

El historial comienza al activar esta versión. Las conversaciones anteriores no se recuperan porque no se guardaban. No se crean automáticamente archivos de texto abiertos en la carpeta pública: SQLite es la fuente y el administrador descarga un TXT cuando lo necesita.

## Información registrada

- Identificador de atención independiente del token de acceso.
- Fecha de inicio y cierre, estado y motivo de cierre.
- Texto que el visitante envía al servidor y respuesta que genera el asistente, también cuando responde una regla local.
- Canal de atención: texto, voz o video. Si escribe en el panel de una llamada, se registra el canal de esa llamada.
- Saludo de apertura de la llamada, registrado una vez con el texto del servidor.
- Estado de cada consulta: en curso, respuesta generada, error, cancelación o interrupción.
- Origen de respuesta, motivo del filtro y servicio reconocido cuando está disponible.
- Tiempo de procesamiento, llamadas a IA y tokens de entrada/salida reportados.

No se registran audio, video, borradores no enviados, resultados parciales del micrófono, claves del servidor, tokens de sesión ni instrucciones internas del modelo. Un visitante puede escribir datos personales dentro de su consulta; por eso el aviso pide evitar información sensible y el historial está restringido a Administración.

Una respuesta generada no demuestra que el visitante la haya visto o escuchado por completo. Los fallos de reconocimiento que no producen texto y los mensajes que no llegan al servidor no pueden aparecer en este registro. La transcripción puede contener errores del reconocimiento de voz.

## Métricas iniciales

El panel muestra atenciones, consultas enviadas, solicitudes a IA, tokens reportados, tiempo medio de respuestas completadas y distribución de canales. La API protegida también devuelve recuentos por resultado y motivos del filtro para futuros informes.

Los saludos automáticos no cuentan como consultas del visitante. Las atenciones sin preguntas sí cuentan como atenciones. Una consulta puede consumir dos solicitudes a IA (interpretación y orientación); las respuestas locales pueden consumir cero.

Las métricas abarcan los registros conservados. No son una factura de OpenAI: una llamada fallida puede haber consumido tokens que no fueron reportados. No incluyen créditos ni costos de LiveAvatar. Fechas de almacenamiento y exportación en UTC; el panel las muestra según la zona del navegador del administrador.

## Limpieza del kiosco y privacidad

El aviso previo a iniciar informa de la conservación de texto para seguimiento y estadísticas. El aviso de privacidad detalla el acceso privado al historial.

Nueva conversación, colgar o la limpieza del inicio tras un minuto vacían la pantalla y revocan la sesión del visitante. El registro privado sigue disponible para seguimiento. Nunca se reutiliza ese registro como contexto de otra persona ni se devuelve mediante las rutas públicas del kiosco.

Las descargas son copias de texto en el equipo del administrador: deben guardarse donde solo acceda el personal autorizado. No se incluyen automáticamente en el portal público de documentación.

## Conservación y respaldo

La opción local CONVERSATION_RETENTION_DAYS en .env admite:

- 0: conservar sin eliminación automática; es el valor predeterminado.
- 1 a 3650: borrar atenciones cerradas o interrumpidas cuya última actividad sea anterior a ese número de días.

Reinicie para aplicar cambios. La limpieza se ejecuta al iniciar y cada hora; no se borran atenciones activas. Con 0 no se elimina historial automáticamente. Los respaldos y TXT descargados tienen conservación independiente y no se eliminan con esta opción.

La base habitual es data/kiosk.sqlite, salvo que DB_PATH indique otra ubicación. Haga respaldos consistentes de SQLite: con el servidor detenido o mediante la función de respaldo/VACUUM INTO; no copie únicamente el archivo principal mientras hay escritura WAL. El almacenamiento no está cifrado por la aplicación.

## Diseño y mantenimiento

Tablas nuevas:

| Tabla | Contenido |
|---|---|
| conversations | Identidad de atención, consentimiento del aviso, fechas, canal inicial y cierre |
| conversation_turns | Pregunta/respuesta, canal de cada interacción, estado, motivo y métricas |

server/conversation-store.js encapsula consultas y exportación. server/app.js registra cada consulta aceptada, incluso si falla o se cancela. Al reiniciar, las atenciones que quedaron abiertas se marcan interrumpidas; no se inventan respuestas para consultas incompletas.

Rutas protegidas: GET /api/admin/conversations, GET /api/admin/conversations/:id y GET /api/admin/conversations/:id/export. La exportación usa bloques de filas y respeta el flujo de descarga para no cargar todo el archivo en el servidor. Los mensajes se muestran como texto y no se interpretan como HTML.

Pruebas: tests/conversations.test.js y tests/conversations.e2e.js. Comprueban permisos, separación de visitantes, persistencia, exportación completa, cancelación, recuperación al reiniciar, conservación, métricas y presentación segura.

## Próximas mejoras

Filtros por fecha/servicio/canal, búsqueda de consultas, gráficos por día, porcentaje de preguntas no resueltas y exportación de conjuntos de atenciones. Los datos básicos ya quedan disponibles; estas pantallas adicionales todavía no están implementadas.



## Orientación y mejora de respuestas (v0.21.0)

Administración → Mejorar respuestas permite revisar dudas del historial, guardar borradores y aprobar respuestas para su publicación. La orientación inicial usa el catálogo activo. Consulte el [manual de orientación y revisión](37-orientacion-revision.md) para conocer operación, arquitectura, retención y límites.
