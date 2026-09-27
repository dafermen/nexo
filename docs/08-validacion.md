# 08 · Validación de la entrega

## Activación de correo real · 19/09/2026

- Credencial SMTP configurada localmente; servidor reiniciado y modo de acceso email activo.
- Conexión segura y autenticación con Gmail verificadas sin mostrar la credencial.
- Auditoría de la instalación: un evento admin.mail.accepted a las 10:33:51 UTC y un evento admin.login a las 10:34:00 UTC. Esto confirma aceptación del correo por SMTP y un ingreso correcto con el código; no se inspeccionó la bandeja del usuario.
- Manual ampliado con creación de contraseña de aplicación, guardado local, reinicio, ingreso y solución de problemas. No se enviaron mensajes adicionales para actualizar esta documentación.

## Entrega anterior: SQLite y correo v0.13.0 · 18/09/2026

- 170 pruebas unitarias/API aprobadas; 76 archivos JavaScript válidos.
- Nuevas pruebas: expiración, cinco intentos, consumo único y concurrente, reenvíos, fallos SMTP, persistencia de sesiones/límites, cambio de administrador, cookie y revocación, importación única de FAQs, validación y conflictos.
- Recorridos Edge/Playwright de acceso por correo, editor SQLite, Administración, Configuración y Documentación aprobados; vistas de escritorio y móvil revisadas.
- Reinicio real completado después de un respaldo consistente. Huella del perfil/catálogo idéntica antes y después. 24 temas y 62 preguntas importados sin cambios. Archivos privados no accesibles por HTTP.
- SMTP sin credencial: acceso de instalación conservado. Correos simulados; entrega real en Gmail pendiente. Sin llamadas a OpenAI ni sesiones LiveAvatar.
- Nuevas dependencias instaladas: Nodemailer 10.0.10, versión fijada en package-lock.json.

## Validaciones históricas

**Fecha:** 16 de septiembre de 2026. **Entorno:** Windows, Node.js 24.18.0, Microsoft Edge mediante Playwright. Base de datos en memoria para las pruebas automáticas; sin contactos ni turnos reales.

## Evidencia automática

### API y componentes de voz

Comando: `npm.cmd test`. **62 pruebas aprobadas**, incluidas las regresiones de reserva cancelada y persistencia después de reabrir la base en disco.

Cobertura:

- Catálogo y configuración públicos sin credenciales; política CSP y archivos privados no servidos.
- Rechazo de origen/host ajenos y creación de sesión sin consentimiento.
- Sesión necesaria, expiración, revocación y aislamiento entre visitantes.
- Historial controlado por servidor y ausencia de efectos de reserva desde el chat.
- Validación de mensaje, límite de cuerpo, datos de formulario y precio.
- Reserva, reintento idempotente, requestId reutilizado y conflicto concurrente de horario.
- Horarios inventados, servicios pausados y acceso administrativo no autorizado.
- Cancelación y liberación de horario; límites de solicitudes; purga por retención.
- Contrato de OpenAI mediante respuesta simulada: configuración, `store:false`, extracción de texto y errores.
- STT: parciales, finales, permiso denegado y callbacks antiguos descartados.
- TTS: selección de voz española, cancelación y fallback cuando faltan APIs.
- Video: autenticación HTTP, secretos no expuestos, modo/consentimiento, límite de duración, aislamiento, cancelación durante inicio, recuperación ante errores y cierre pendiente.
- Reproductor con sala simulada: espera medios, envía `avatar.speak_text`, correlaciona eventos y descarta respuestas antiguas.

### Navegador

Comando: `npm.cmd run test:browser` con Playwright y Edge. **10 recorridos aprobados**:

1. Inicio, carga del retrato de recepcionista, tres servicios y modo demo explícito.
2. Aviso, creación de sesión, respuesta de demo y llamada al adaptador de voz.
3. Transcripción simulada editable, envío y respuesta.
4. Texto malicioso visible como texto, sin interpretar HTML.
5. Reserva en tres pasos, persistencia y limpieza al finalizar.
6. Inactividad con reloj de prueba, aviso y eliminación de borrador.
7. Administración, cancelación, pausa y limpieza al salir.
8. Móvil 390 × 844 y vertical 1080 × 1920 sin desbordamiento horizontal; alternativa sin reconocimiento.
9. Sin errores JavaScript en el recorrido principal.
10. Video informa requisitos faltantes, impide conectar sin configuración y carga el SDK local bajo la CSP real, sin crear sesiones externas.

Evidencia histórica de v0.3.3, no reejecutada en esta entrega: `tests/local-avatar.e2e.js`: modelo 3D y voz Piper reales, cambios de pose, boca activa con energía de audio, silencio, repetición y cierre; sin peticiones externas de la página. Ver [detalle local](12-avatar-local.md).

Capturas generadas e inspeccionadas:

- [Configuración de video](capturas/avatar-configuracion.png)
- [Inicio horizontal](capturas/inicio.png)
- [Conversación](capturas/conversacion.png)
- [Comprobante de turno](capturas/turno.png)
- [Administración](capturas/administracion.png)
- [Móvil](capturas/movil.png)
- [Pantalla vertical](capturas/vertical.png)

Los tamaños son de navegador, no pruebas de ergonomía sobre un mueble real. Algunas capturas posteriores a la administración muestran un servicio pausado como parte de la prueba.

## Límites de lo verificado

**No hubo conexión real a LiveAvatar:** faltaban clave, voz y avatar configurados. Se validaron contratos y controles con dobles; no se observó ni evaluó video, sincronización labial o gestos reales. El guion pendiente está en la [guía de video](11-video-tiempo-real.md).

**No hubo una llamada real a OpenAI:** el entorno no tenía `OPENAI_API_KEY` ni `OPENAI_MODEL` configurados. La implementación HTTP y su manejo de respuestas se probaron con dobles, no con consumo de una cuenta real.

**No se grabó ni escuchó audio físico durante las pruebas:** STT se ejercitó con simulaciones. La prueba adicional de v0.3.0 sí generó y reprodujo audio Piper real dentro de Edge; no se evaluó con oído humano. La calidad de voz, permisos, dispositivos y procesamiento remoto del navegador deben validarse en la PC objetivo.

No se han probado carga de múltiples kioscos, accesibilidad con usuarios, cobros, emails, hardware especial ni operación desatendida. La demo no declara esos componentes como listos para producción.

## Guion manual de aceptación en la PC objetivo

| Caso | Acción | Resultado esperado |
|---|---|---|
| Arranque | Abrir INICIAR.cmd y localhost | Catálogo visible, modo y servidor identificables |
| Pantalla completa | Tocar icono o F11 | Pantalla usable, sin ocultar controles principales |
| Micrófono autorizado | Activar voz y hablar español | Texto aparece; se puede editar antes de enviar |
| Permiso rechazado | Denegar micrófono | Explicación y entrada por teclado |
| TTS | Enviar consulta y pulsar Escuchar | Voz inteligible; silencio y Finalizar la interrumpen |
| Ruido y eco | Probar desde distancia real | Entendimiento suficiente sin bucle entre altavoz y micrófono |
| IA real | Configurar clave/modelo y consultar catálogo | Respuesta útil y etiqueta de IA real |
| IA caída | Cortar conexión o usar configuración inválida | Error claro; servicios y reserva local siguen disponibles |
| Doble confirmación | Repetir una reserva con mismo intento | Un único registro |
| Abandono | Dejar formulario abierto 5 minutos | Datos invisibles y sesión revocada |
| Reinicio | Reservar, cerrar servidor y volver a iniciar | Turno sigue presente; chat anterior no se restaura |
| Administración | Entrar, cancelar, salir | Horario liberado y datos administrativos ocultos |

## Criterio de piloto

El piloto supervisado requiere completar el guion manual, sustituir el catálogo, definir agenda/privacidad e incorporar la autenticación administrativa adecuada. No confundir los resultados automáticos de esta demo con la aprobación operativa de un centro real.

## v0.4.0: etapa LiveAvatar LITE

Se verificaron conversión de audio (duración, amplitud y formatos inválidos), espera de canal conectado, bloques de voz y fin de intervención, cancelación durante síntesis, correlación de habla/interrupción, protección de créditos y secretos, rechazo de endpoint ajeno y origen HTTPS configurado.

`npm.cmd run test:avatar`: cuatro comprobaciones adicionales en Edge, tamaño 1024 × 1366, con dobles explícitos de LiveAvatar, WebSocket, reproducción y voz:

1. Espera sin sesión remota ni descarga GLB.
2. Iniciar conecta LITE y transmite audio de la respuesta del chat.
3. Inactividad cierra, limpia y no reconecta automáticamente.
4. Salir de pantalla termina el video sin errores JavaScript.

No se abrió ninguna sesión de pago en estas pruebas. No demuestran sincronización labial real, calidad de voz o compatibilidad física del iPad. Pendientes: credenciales LiveAvatar/OpenAI, selección de asesora, despliegue HTTPS, permisos/autoplay/STT en Safari, latencia y consumo reales.

## v0.4.1: corrección y prueba externa real (16 de septiembre de 2026)

- La API autenticada aceptó clave y avatar. Devolvió `webrtc-signaling.heygen.io` para el canal LITE, bloqueado por nuestra lista de hosts. Se autorizó ese host exacto en el backend y CSP, manteniendo WSS y rechazo de imitaciones/puertos ajenos.
- LiveKit pausaba la suscripción por tener oculto el video mientras se esperaba el primer fotograma. Se deshabilitó `adaptiveStream` para este reproductor único; se conserva el retrato hasta recibir medios.
- El servidor iniciado en el entorno restringido no podía acceder al proveedor. Se reinició con acceso de red y escucha local; no se abrió el servidor a otras máquinas.
- Prueba real en Edge: video 1280 × 720, `readyState=4`, pista de video activa; evento `agent.speak_started` recibido, pista de audio activa y reproductor sin pausa ni silencio. No hubo errores JavaScript. La prueba se interrumpió después de confirmar habla, antes del evento de fin de intervención, para ahorrar consumo.
- Se solicitó cierre al terminar; una consulta posterior confirmó `occupied=false` y `stopPending=false`. No se mantuvo una sesión remota abierta.
- Máximo de 60 segundos solicitado al proveedor y protegido en configuración, servicio e instalador. La cuenta continúa autorizada para pruebas con créditos. El consumo exacto se consulta en LiveAvatar; no se infiere del número de solicitudes.
- 62 pruebas unitarias/API aprobadas. La audición física, valoración de naturalidad labial y prueba en iPad siguen pendientes.

[Captura de la conexión real](capturas/liveavatar-real.png). Las pruebas externas utilizaron la cuenta configurada y sesiones acotadas; las pruebas automatizadas habituales continúan utilizando dobles sin consumo.

## v0.4.2: llamada inmersiva sin modificar el inicio

62 pruebas API/componentes y 10 recorridos generales aprobados. El recorrido de LiveAvatar comprende ahora 6 comprobaciones e incluye video de prueba generado en canvas, encuadres vertical/horizontal sin nueva sesión, controles de 44 px dentro del viewport, panel con retorno del foco, silencio, limpieza al colgar, abandono y retorno automático al inicio al llegar al minuto aunque haya actividad. Tamaños: 1024 × 1366, 1366 × 1024, 390 × 844 y 844 × 390. Capturas inspeccionadas. No se consumieron créditos para esta modificación; la fuente visual de las capturas es simulada. [Detalle](15-vista-llamada.md).

## Activación local de OpenAI (16 de septiembre de 2026)

Configuración activa en `C:\Projects\Nexo\.env`: `AI_PROVIDER=openai` y `OPENAI_MODEL=gpt-4.1-mini`. La clave permanece exclusivamente en el servidor. Se eligió GPT-4.1 mini por su baja latencia sin fase de razonamiento y su seguimiento de instrucciones para consultas breves de atención y catálogo. Referencia: https://developers.openai.com/api/docs/models/gpt-4.1-mini

Validación con la cuenta configurada: modelo disponible (HTTP 200); dos respuestas reales con el adaptador de producción, sobre catálogo y una solicitud de confirmar reserva/pago sin completar el formulario. La segunda respuesta rechazó confirmar acciones que no había realizado. Tras reiniciar el servidor desde la ubicación activa, `/api/health` indicó `openai` y una consulta completa a `/api/chat` respondió correctamente sobre orientación general, en aproximadamente 4,7 segundos. La sesión de texto se cerró al finalizar. Estas comprobaciones no iniciaron sesiones de LiveAvatar; su límite sigue siendo 60 segundos.

El catálogo y la agenda siguen siendo de demostración. Estos resultados verifican la conexión y ejemplos concretos de comportamiento; no garantizan exactitud para todas las consultas ni representan una validación del centro real.
## Perfil MetodoMogollon (16 de septiembre de 2026)

Se activó CENTER_PROFILE=metodomogollon en el proyecto vigente y se reinició el servidor. La información del responsable sustituye al catálogo de ejemplo en la interfaz y en el contexto del agente. Los datos originales permanecen en SQLite. Precios y requisitos de la escuela siguen pendientes, con agenda Google Calendar aún sin conectar.

Validación: 65 pruebas API/componentes aprobadas, incluidas tres nuevas sobre catálogo sin precios ficticios, rechazo de reservas locales, contexto comercial del agente y conservación de datos anteriores. Revisión de la interfaz en Edge a 1366 × 1024, 1024 × 1366 y 390 × 844: fichas informativas, cierre correcto, sin formulario ni horarios ficticios, sin desbordamiento horizontal ni errores JavaScript. Se inspeccionó visualmente la captura horizontal. Las seis comprobaciones de llamada inmersiva con dobles también pasaron, incluido el cierre a los 60 segundos.

Una consulta real por texto a OpenAI identificó MetodoMogollon, enumeró los servicios, informó 08:00–18:00 de lunes a viernes en Nueva York, mantuvo los precios pendientes y remitió al personal para reservar. Se cerró la sesión de texto. No se iniciaron sesiones reales de LiveAvatar ni eventos de Google Calendar. El modelo sigue siendo gpt-4.1-mini; no se modificó la clave.
## Panel de administración v0.5.0

69 pruebas API/componentes aprobadas, incluidas edición y persistencia, validación de precios/horarios, autenticación, catálogo dinámico, pausa y conflictos. Recorrido en Edge con base aislada: modificar servicio, actualizar kiosco abierto, editar horarios, crear servicio pausado, editor móvil y limpieza al cerrar sesión. Capturas de escritorio y móvil inspeccionadas. Sin solicitudes a OpenAI ni sesiones de LiveAvatar. Ver [guía](17-administracion.md).

## Modalidades de llamada v0.6.0

69 pruebas API/componentes, cuatro recorridos nuevos de voz, seis recorridos de video y diez recorridos generales aprobados. Voz verificada con cero solicitudes de sesión a LiveAvatar ni carga de LiveKit, incluso con proveedor configurado. Retrato y controles inspeccionados en capturas. Sin consumo de proveedores externos. La prueba general detectó y permitió corregir un texto antiguo «Reviser turno»; se actualizó su acceso a registros locales colapsados en Administración. Detalle: [Voz y video](18-voz-y-video.md).

## Filtro escolar v0.7.0

78 pruebas API/componentes aprobadas. Nueva prueba de navegador: precios/duración locales con contexto, cuota por sesión, dos desvíos y regreso al catálogo. Pruebas de voz aprobadas sin solicitudes de sesión de LiveAvatar. Todos los proveedores utilizados en la validación automatizada fueron simulados. Ver [filtro y consumo](19-filtro-y-consumo.md).

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

## Diagnóstico del micrófono · 17 de septiembre de 2026

La captura del usuario mostró el mensaje asociado a SpeechRecognition.onerror(network): falla la conexión con el servicio de reconocimiento del navegador antes de obtener texto. No demuestra una falla de OpenAI, del filtro ni que toda la conexión a internet esté caída. Se abrió Nexo en Chrome externo para aislar el navegador integrado. Confirmación física del usuario pendiente.

Correcciones: el estado «Escuchando» espera al evento onstart; activación pendiente diferenciada; plazos de 12 segundos para inicio y 20 segundos sin resultados; errores terminan y limpian inmediatamente el reconocimiento aun si no llega onend; avisos específicos de conexión/permisos/dispositivo; texto parcial visible en el panel y revisión conservada antes de enviar. La aplicación no abre el micrófono automáticamente ni cambia permisos.

102 pruebas de API/componentes aprobadas, incluidas cuatro nuevas de ciclo de vida, error de conexión, temporizadores y callbacks tardíos. No se consumió OpenAI ni LiveAvatar en esta corrección. Requiere recargar las pestañas abiertas para recibir el JavaScript actualizado.

## Conversación automática v0.8.0 · 18 de septiembre de 2026

108 pruebas unitarias/API aprobadas y recorridos de conversación automática, voz manual y video simulado aprobados. Se comprobó además el servidor real con dos turnos automáticos locales y tres audios de Piper (incluido saludo), sin consultas a OpenAI ni sesiones de LiveAvatar. El reconocimiento se simuló; ajuste con la voz física pendiente. [Detalle y límites](20-conversacion-automatica.md).

## Preguntas frecuentes v0.9.0 · 18 de septiembre de 2026

117 pruebas unitarias/API y recorrido de administración aprobados. Seis consultas al servidor real respondidas localmente y dos turnos automáticos con Piper real y reconocimiento simulado. Cero consultas a OpenAI y cero sesiones de LiveAvatar para esta validación. [Formato, alcance y recuperación](21-preguntas-frecuentes.md).

## Interpretación de consultas v0.10.0 · 18 de septiembre de 2026

137 pruebas unitarias/API y recorrido de voz automática/texto con dobles aprobados. 57 archivos JavaScript válidos. Se usaron 16 consultas reales de OpenAI durante pruebas y refinamiento (15.778 tokens de entrada, 416 de salida), sin sesiones de LiveAvatar. La evaluación inicial detectó errores de intención que se corrigieron con ejemplos y una política más prudente; la repetición final de los casos afectados y dos expresiones nuevas pasó. [Flujo, límites y alcance](22-interpretacion-intencion.md). Servidor reiniciado con la versión final; no se modificaron credenciales ni límites.


## Portal de documentación v0.11.0 · 18 de septiembre de 2026

Portal `/docs`, con enlace desde Administración que abre una pestaña nueva. Contiene 36 documentos exclusivamente de Nexo, incluidos antecedentes, manuales junior/GitHub/operación, metodología, continuidad y mantenimiento del portal. Tablero de 9 fases y 24 tareas: 12 realizadas en el alcance de la demo y 12 pendientes. El estado se mantiene en `docs/project-status.json`.

Validación: 144 pruebas unitarias/API aprobadas y 63 archivos JavaScript válidos. El recorrido de navegador del portal comprobó apertura en otra pestaña sin acceso a la ventana de origen, búsqueda en el contenido, lectura e índice, descarga, activación de impresión, filtros del tablero, categorías, enlaces de documentación y vista móvil de 390 px. Se corrigió un desbordamiento móvil detectado durante la primera ejecución. Se analizó el Markdown de todos los documentos y se comprobó el rechazo de HTML ejecutable, enlaces de script e imágenes remotas. El recorrido existente de Administración también pasó.

Las siete pruebas nuevas de servidor comprueban el catálogo permitido, IDs inválidos, altas y eliminaciones, enlaces de carpetas hacia fuera del proyecto, rutas HTTP de lectura, protección de origen y coherencia del tablero. La búsqueda de patrones de credenciales comunes no encontró coincidencias en documentos; no sustituye la revisión de contenido antes de compartir nuevos archivos.

Se utilizaron servidores y datos aislados para las pruebas de navegador. No hubo llamadas a OpenAI, voz ni LiveAvatar. No se validaron en esta entrega micrófono, iPad físico, impresora ni la generación de un PDF por el diálogo del sistema. El portal usa el diálogo de impresión del navegador para esa última acción. No se creó ni publicó un repositorio GitHub.

[Funcionamiento y mantenimiento del portal](29-portal-documentacion.md).


## Configuración por negocio v0.12.0 · 18 de septiembre de 2026

153 pruebas unitarias/API aprobadas y 67 archivos JavaScript válidos. Nueve casos nuevos verifican acceso administrativo, ausencia de secretos en respuestas, validación, conservación de datos anteriores, persistencia al reiniciar, separación del archivo escolar, FAQ propia, moneda, catálogo pausado, cuotas y modelo, cierre de sesiones, canales desactivados y conflicto entre editores.

Recorridos de navegador aprobados: configuración, Administración, conversación automática, documentación y LiveAvatar simulado. La configuración se probó con un negocio ficticio de limpieza en una base independiente: nombre, asistente Luna, trato de tú, zona horaria, COP, respuestas propias, canales desactivados, vista previa, actualización de un kiosco abierto, móvil de 390 px, recarga y rechazo de sobrescritura. La configuración activa de MetodoMogollon no se sustituyó por esa prueba.

La primera prueba de video simulado se detuvo porque intentaba guardar una captura histórica en una carpeta sin permiso de escritura. Se añadió la opción SCREENSHOT_DIR para guardar evidencia separada y se repitió el recorrido completo con éxito. No fue un fallo de conexión de LiveAvatar.

No se consumieron OpenAI ni LiveAvatar. La comprensión por IA para otros negocios se comprobó mediante contratos, instrucciones y dobles de proveedor, no mediante evaluación de respuestas reales. Cada negocio necesita un conjunto propio de consultas antes de publicarse. No se validaron iPad físico, micrófono real, acceso a un modelo nuevo, un ID de avatar nuevo ni reservas externas. El módulo muestra configuración, no certifica funcionamiento de esos servicios.

[Manual de configuración y límites de esta etapa](30-configuracion-negocio.md).

## Inicio limpio y nueva conversación · 19/09/2026

- El inicio se limpia tras 60 segundos sin actividad, incluyendo historial, borradores, avisos y formularios. El botón Nueva conversación permite hacerlo inmediatamente.
- Prueba dedicada con reloj simulado: umbral del minuto, actividad que renueva la espera, cierre de la sesión anterior en el servidor, nueva sesión independiente y respuesta tardía descartada tras reiniciar la atención.
- Diez recorridos generales de navegador aprobados, incluida limpieza del formulario; recorridos de voz, conversación automática y LiveAvatar con dobles aprobados. El límite de video de 60 segundos se mantiene.
- Revisada la presentación en móvil y comprobado que localhost sirve el botón y el temporizador nuevos. Sin consumo de OpenAI ni LiveAvatar real.
- Reproducir la prueba específica con node tests/home-reset.e2e.js (requiere Playwright).
## Validación del historial — v0.14.0

`tests/conversations.test.js` cubre persistencia, aislamiento, protección administrativa, saludo, consumo reportado, exportación de más de 200 turnos, cancelaciones y retención. `tests/conversations.e2e.js` verifica consulta desde el kiosco, limpieza del inicio, consulta privada, descarga real de texto, texto potencialmente malicioso y tamaños de escritorio/móvil. Son pruebas aisladas con proveedores simulados: no consumen OpenAI ni LiveAvatar.

## Calendar — 24/09/2026

Suite general: 195 pruebas aprobadas. La batería de Calendar cubre permisos, estado OAuth, cookies, PKCE, permisos parciales, cifrado, persistencia, renovación, selección por ID, nombres repetidos, calendario de solo lectura, errores y recuperación de eventos de prueba. El navegador valida selección, pruebas, recuperación, desconexión y móvil. No se usaron credenciales ni calendarios reales de Google. [Límite de esta validación](33-google-calendar.md).

## Calendar real — 26/09/2026

El responsable autorizó la cuenta en Google. Se guardó Mogollon Method (America/New_York) desde Configuración. El servicio de Calendar de Nexo comprobó el calendario real: lectura satisfactoria y creación, lectura y eliminación satisfactoria de su evento temporal. El resultado fue `read: true`, `write: true`, `cleaned: true`. La prueba fue ejecutada mediante el proveedor del servidor con la configuración activa; no se inició LiveAvatar. Esta comprobación complementa las 195 pruebas automatizadas registradas el 24/09, sin afirmar que se hayan repetido en esta activación. Las reservas automáticas de visitantes siguen pendientes.

## Reservas — 26/09/2026, v0.16.0

204 pruebas unitarias/API aprobadas. Incluyen semana laboral, duración y cierre, horario de verano/invierno de Nueva York, eventos de todo el día, bloqueos y fallos del proveedor, datos/consentimiento, autorización, precios, idempotencia, concurrencia, creación incierta y cancelación protegida. Recorridos de navegador de reservas, Calendar y Configuración aprobados, con Google simulado y revisión móvil. Consulta real de disponibilidad de Mogollon Method satisfactoria: 70 opciones libres en el horizonte configurado al comprobar. No se insertaron eventos reales para validar esta entrega. No se consumió OpenAI, correo ni LiveAvatar en estas pruebas.

## Agenda durante la llamada y correo — 26/09/2026 (v0.17.0)

- Suite general: **211 pruebas aprobadas**, sin fallos. Sintaxis: 94 archivos JavaScript válidos.
- Reservas en navegador con Google, SMTP y reconocimiento simulados: alta desde inicio y llamada, apertura por petición de disponibilidad, día/hora, validación de correo, micrófono pausado al escribir, confirmación explícita y recibo de correo enviado. Sin datos personales en el chat.
- Consulta por correo y código completo: rechazo genérico de datos incorrectos, verificación del evento de Google, resultado confirmado y vuelta a la llamada; API exige sesión y el envío administrativo exige autenticación.
- Pruebas del correo: un único envío con peticiones concurrentes/repetidas, ningún correo para cita cancelada, fallo de SMTP separado del estado de la reserva y sin reintento automático. Plantilla con código completo y zona horaria correcta.
- El recorrido también cubre varios servicios, cancelación, formulario móvil e inactividad. No crea eventos ni envía correos reales, ni consume OpenAI o LiveAvatar.
- Comprobación real independiente: la cita existente del 28/09/2026, 08:00–09:00 America/New_York, está confirmada en Mogollon Method. SMTP verificado sin envío. La entrega de la confirmación real no se afirma con estas pruebas.

Regresiones adicionales aprobadas: `tests/voice-call.e2e.js` y `tests/auto-call.e2e.js` (voz en cuatro tamaños, turnos automáticos, errores, pausa, filtro y cierre). Servidor local reiniciado: inicio y documentación HTTP 200, menú actualizado y consulta sin sesión HTTP 401.

## Códigos cortos de reserva — v0.17.1 (26/09/2026)

214 pruebas unitarias/API aprobadas. Se verificaron migración de registros anteriores, estabilidad al reiniciar, colisiones forzadas, unicidad y reversión de la reserva si no se logra un código, normalización de mayúsculas/espacios/guiones, compatibilidad con UUID y rechazo de correo incorrecto. La plantilla SMTP muestra el código corto, sin UUID interno. El recorrido de reservas en navegador pasó con consulta mediante código corto en minúsculas, comprobante, correo simulado y formulario móvil. Sin Google, SMTP ni proveedores de pago reales en las pruebas.

Tras reiniciar el servidor, lectura de SQLite confirmó que todas las reservas existentes tienen un código corto y el inicio respondió HTTP 200. No se modificaron eventos de Google ni se enviaron correos por la migración.

## Teclado opcional — v0.18.0 (26/09/2026)

215 pruebas unitarias/API aprobadas; validación de opción booleana, compatibilidad con configuración anterior, persistencia y publicación al kiosco. Recorrido `tests/booking.e2e.js` aprobado: activación real en Configuración sobre SQLite aislado, escritura de nombre y correo pulsando teclas, acentos, mayúsculas, selección, borrado, límites de longitud, cierre con Listo/Escape sin envío, micrófono pausado, limpieza de la copia de edición por inactividad, chat y desactivación. Se inspeccionó captura a 390 × 844 y se comprobó ausencia de desbordamiento. Sin correos, Google, OpenAI o LiveAvatar reales en las pruebas. Pendiente validación táctil física del equipo final.

## Teclado manual y horarios visibles — v0.19.0

216 pruebas unitarias/API aprobadas; 97 archivos JavaScript con sintaxis válida. Se añadieron horarios ocupados, días completos ocupados, horas pasadas y anticipación, manteniendo únicamente horas reservables en `slots` y sin información privada de eventos en `schedule`.

El recorrido de reservas en navegador pasó: estados verde/rosa, botones ocupados deshabilitados, día completamente ocupado visible, apertura por icono sin apertura al enfocar, colapso conservando texto, correo y nombre, selección/borrado, móvil y limpieza por inactividad. Se añadió videollamada simulada con reserva, teclado y conservación del formulario al desconectar el proveedor. La regresión de LiveAvatar pasó incluyendo cierre al minuto, inactividad, texto, encuadre y regreso al inicio cuando no hay formulario. No se abrieron sesiones de pago ni se crearon citas o enviaron correos reales.

Se inspeccionaron capturas de los horarios y del teclado a 390 px. Los iconos quedaron habilitados en la configuración real de esta instalación; el teclado permanece colapsado hasta pulsarlo. Pendiente comprobar comodidad táctil en el equipo definitivo.

## Menú desde el inicio — v0.19.1

`tests/booking.e2e.js` aprobado: la tarjeta Clase práctica abre las tres opciones; cancelar el consentimiento al consultar no abre campos; disponibilidad conserva el servicio sin llamada; reserva y consulta por correo/código funcionan desde el inicio; la consulta ofrece Volver al inicio. Continúan aprobados los recorridos del mismo archivo de voz/video simulados, teclado, horarios ocupados, inactividad y móvil. Sin citas reales, correos ni proveedores de pago.

## Agenda conversacional y memoria — v0.20.0 (26/09/2026)

- Suite general: **223 pruebas aprobadas**, sin fallos. Tras los últimos ajustes, las 22 pruebas específicas de agenda y reservas también pasaron. Sintaxis: 99 archivos JavaScript válidos.
- Recorrido de navegador aprobado por texto y voz automática: petición de clase con fecha/franja, tres opciones, cambio a la mañana, selección ordinal y apertura del formulario. El micrófono se pausa al escribir; elegir una opción no crea una reserva. Incluye las regresiones del recorrido de reservas con proveedores simulados.
- Comprobación con la instalación real: una pregunta informal utilizó una interpretación de OpenAI y consultó disponibilidad de Google Calendar; «mejor por la mañana» y «la segunda» se resolvieron localmente, con nueva comprobación de disponibilidad. Se ofrecieron tres opciones y se devolvió la selección para abrir el formulario.
- La comprobación real no creó reservas ni envió correos ni inició LiveAvatar. La sesión temporal de prueba se cerró al finalizar. El servidor quedó reiniciado con la versión actual.

Detalles y límites: [Agenda conversacional](36-agenda-conversacional.md).


## Orientación y revisión supervisada — v0.21.0 (26/09/2026)

- Suite general: 228 pruebas aprobadas, sin fallos. Tras ampliar las respuestas naturales sobre el permiso y proteger objetivos negados, las cinco pruebas específicas volvieron a pasar. Sintaxis: 104 archivos JavaScript válidos.
- Recorrido de navegador aprobado: orientación por voz, consulta por texto, entrada administrativa, borrador conservado al recargar, aprobación obligatoria que se desmarca al editar, publicación, revisiones cerradas, descarte y texto HTML tratado como texto. Revisión visual a 390 px sin desbordamiento.
- La API comprueba acceso administrativo, versiones de revisión y FAQ, duplicados, formato, reversión transaccional y purga. No se publica un borrador ni se crea una reserva durante la orientación.
- Pruebas con SQLite aislado y proveedores simulados, sin consumir OpenAI o LiveAvatar, crear citas ni enviar correos reales.

[Manual y límites](37-orientacion-revision.md).


## Inicio responsive — v0.22.0 (26/09/2026)

- Nuevo recorrido de kiosco aprobado en nueve tamaños: acciones dentro del área visible, sin desplazamiento global, controles de al menos 44 px, paneles, regreso del foco, agenda, texto, teclado manual y rotación con borrador.
- Recorridos de reservas, voz, LiveAvatar simulado e inicio limpio aprobados. Conservan confirmación, teclado, disponibilidad, micrófono, límite de video e inactividad.
- Diez recorridos generales de navegador y recorrido del filtro aprobados; siete pruebas de documentación y sintaxis de 106 archivos JavaScript válidas. Se adaptaron los accesos de pruebas al nuevo inicio. No se repitió la suite general de servidor, ya que este cambio es de interfaz y documentación.
- Inspección visual de capturas a 390×844, 820×1180 y 1920×1080. Sin sesiones reales de LiveAvatar, consultas de pago a OpenAI, citas ni correos reales.
- Pendiente verificar alcance táctil, escala, permisos y comportamiento en el kiosco físico cuando se conozca el equipo. [Guía](38-kiosco-responsive.md).

## Preparación VPS privado — v0.25.0

250 pruebas de servidor/lógica aprobadas en Linux; se verificaron también Windows, entrada HTTPS en navegador, home responsive, portal documental, síntesis real ES/EN/FR sin red, Caddy 2.11.4, instalación nueva del paquete y respaldo/restauración cifrados con datos ficticios. No se consumieron APIs de pago ni se publicaron puertos del piloto. [Evidencia y límites](46-seguridad-piloto.md). La verificación del VPS final sigue pendiente.
