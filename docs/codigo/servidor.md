# Referencia: Servidor y reglas de negocio

Contratos del código propio de Nexo. Consulte primero el [mapa de código](../41-mapa-codigo-fuente.md) y el [manual junior](../23-manual-desarrollador-junior.md). Las firmas orientan la lectura; el cuerpo y sus validaciones son la autoridad ejecutable.

## server/admin-auth.js

Implementar el acceso administrativo mediante código enviado por correo.

- **Entrada:** repository, installation, mailer, reloj inyectable; correo/código y dirección IP del solicitante.
- **Salida:** Estado público de acceso, challenge o token de sesión; HttpError al fallar.
- **Estado importante:** pending sigue envíos en curso; idleMs y absoluteMs limitan sesión; salt y codeHash verifican sin guardar el código en claro.
- **Efectos y límites:** Envía correo y modifica registros de autenticación. La respuesta de solicitud no revela si el correo coincide; la cookie es HttpOnly.

**Dependencias directas:** `node:crypto`, `node:util`, `./errors.js`, `./installation.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
hash(text)
AdminAuth.constructor({repository,installation={},mailer,now=Date.now})
AdminAuth.status()
async AdminAuth.requestCode(email, ip)
async AdminAuth.verify(id, code, ip)
AdminAuth.token(req)
AdminAuth.authenticated(req)
AdminAuth.cookie(token, secure=false)
AdminAuth.logout(req)
async AdminAuth.close()
```

### Contratos centrales

- **requestCode:** Aplica límites por IP y por correo; deriva hash con salt y envía en segundo plano si coincide el administrador. **Salida:** Promise<{challenge,message,resendSeconds}> indistinguible para correos no autorizados.
- **verify:** Consume un intento, compara hash en tiempo constante y canjea un código válido de un solo uso. **Salida:** Promise<string> con token nuevo; el HTTP lo coloca en cookie protegida.
- **authenticated:** Extrae una única cookie válida y verifica su hash/vencimiento en SQLite. **Salida:** Booleano; si procede prolonga únicamente el vencimiento por inactividad.
- **cookie:** Construye la cabecera de sesión; con token vacío indica borrado. **Salida:** String Set-Cookie con HttpOnly, SameSite y Secure cuando corresponde.

## server/admin-store.js

Persistir verificadores de acceso, límites y la base editable de FAQ.

- **Entrada:** Conexión SQLite; hashes, revisiones, tiempos en milisegundos y texto FAQ validado por el llamador.
- **Salida:** Métodos del almacén; filas, booleanos de éxito y revisiones actualizadas.
- **Estado importante:** admin_challenges almacena hash/salt; admin_sessions guarda tokenHash; knowledge_bases conserva source y revision.
- **Efectos y límites:** Transacciones impiden reutilizar un código. Cambiar el administrador revoca sesiones; nunca guardar códigos ni cookies en claro aquí.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
createAdminStore(db)
audit(action)
transaction(fn)
synchronizeAdministrator(email, now) // compatibilidad
synchronizeAdministrators(emails, now)
takeAuthLimit(bucket, max, duration, now)
createAdminChallenge({id,email,codeHash,salt,now,expiresAt})
adminCodeDelivery(id, success)
claimAdminAttempt(id, now)
failAdminAttempt(id)
consumeAdminChallenge({id,tokenHash,now,idleMs,absoluteMs})
authenticateAdministrator(tokenHash, now, idleMs)
revokeAdminSession(tokenHash)
purgeAdministratorData(now)
readKnowledge(id)
seedKnowledge(id, source)
saveKnowledge(id, revision, source)
```

### Contratos centrales

- **transaction:** Agrupa el callback síncrono bajo BEGIN IMMEDIATE; siempre COMMIT o ROLLBACK. **Salida:** El valor de fn; propaga el error tras revertir.
- **consumeAdminChallenge:** Canjea código vigente por sesión dentro de una única transacción. **Salida:** Booleano; un segundo canje no vuelve a crear acceso.
- **seedKnowledge:** Inserta la semilla una sola vez mediante INSERT OR IGNORE. **Salida:** Base existente o recién creada; nunca reemplaza contenido vigente.
- **saveKnowledge:** Actualiza FAQ solo si coincide revision; no pisa cambios de otra ventana. **Salida:** Fila actualizada o null ante conflicto.

## server/agenda-conversation.js

Convertir preferencias habladas en una búsqueda verificable de horarios.

- **Entrada:** message, catálogo, center, state y función availability; opcional interpretación estructurada.
- **Salida:** Plan validado o respuesta local con agenda para mostrar opciones/formulario.
- **Estado importante:** state recuerda serviceId/date/period/after/options; selection es 1, 2 o 3, no una reserva.
- **Efectos y límites:** Actualiza contexto temporal y consulta disponibilidad; jamás crea citas. Una selección vuelve a comprobar el horario antes de ofrecer el formulario.

**Dependencias directas:** `./school-filter.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
addDays(date, n)
blank()
agendaCandidate(message, state)
parseAgenda(message, {services,center,state={},now=Date.now()})
buildAgendaRequest({model,message,services,center,state,now=Date.now(),maxOutputTokens=300})
validateAgenda(p, services)
async resolveAgenda({plan,state,services,center,availability,now=Date.now(),language='es'})
answer(text, agenda)
```

### Contratos centrales

- **agendaCandidate:** Decide si merece entrar al flujo de preferencias de agenda, conservando preguntas de precio/requisitos en su flujo. **Salida:** Booleano, no disponibilidad.
- **parseAgenda:** Extrae fechas, franja, servicio u ordinal con vocabulario acotado; delega lo no representable. **Salida:** Plan local o null si necesita interpretación/aclaración.
- **buildAgendaRequest:** Pide extraer preferencias en un esquema cerrado; nombres y correos se completan en pantalla. **Salida:** Petición estructurada; no eventos ni confirmaciones.
- **validateAgenda:** Comprueba estructura, IDs activos, minutos, ordinales y fechas reales. **Salida:** Plan válido o Error.
- **resolveAgenda:** Actualiza contexto, pide availability y limita opciones; verifica otra vez una opción elegida. **Salida:** Promise de respuesta local con agenda opcional, o null para otro tema. No reserva.

## server/app.js

Coordinar rutas HTTP y las reglas de conversación de Nexo.

- **Entrada:** Dependencias de createApp: config, repository, ai y adaptadores opcionales inyectables.
- **Salida:** Objeto Server de Node; cada ruta responde JSON, archivo o redirección según su contrato.
- **Estado importante:** sessions conserva contexto temporal por token; limits controla frecuencia por IP; runtime lee configuración vigente; controller cancela trabajo pendiente.
- **Efectos y límites:** Orquesta SQLite, IA, correo, agenda y voz. Las rutas administrativas verifican acceso antes de leer o escribir datos privados.

**Dependencias directas:** `./audio-library.js`, `./audio-policy.js`, `./languages.js`, `./agenda-conversation.js`, `./service-guidance.js`, `./booking-code.js`, `./providers/google-calendar.js`, `./booking.js`, `./providers/booking-mail.js`, `./booking-intent.js`, `node:stream`, `./admin-auth.js`, `./providers/admin-mail.js`, `./faq.js`, `./business-settings.js`, `./documentation.js`, `./school-intent.js`, `./school-filter.js`, `./providers/ai.js`, `./center.js`, `node:http`, `node:fs/promises`, `node:url`, `node:path`, `node:crypto`, `./errors.js`, `./providers/local-tts.js`, `./providers/live-avatar.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
hash(s)
logChannel(value)
tokenCount(value)
async body(req, maxBytes=16_384)
createApp({ config, repository, ai, calendar = null, bookingMailer = new BookingMailer(config.installation?.mail), liveAvatar = new LiveAvatarService(config.liveAvatar), localTts = new LocalTtsService(), faq = null, documentation = createDocumentation(), adminMailer = new AdminMailer(config.installation?.mail) })
getCenter()
runtime()
sessionTtl()
knowledge()
currentAudioScope()
json(res, status, data)
rateLimit(req, bucket, max)
getSession(req)
requireAdmin(req)
cancel()
onClose()
recordUsage(usage)
onClose()
reserveRequest(preparedRequest)
async availability(serviceId)
```

### Contratos centrales

- **body:** Consume el stream HTTP y exige un objeto JSON dentro del límite en bytes; falla antes de procesar entradas demasiado grandes. **Salida:** Promise<object>; HttpError 415/413/400 si el cuerpo no cumple.
- **createApp:** Compone dependencias y registra el manejador HTTP; los parámetros permiten usar dobles de IA, correo, voz y agenda en pruebas. **Salida:** Server de Node listo para listen; el llamador controla arranque y cierre.
- **knowledge:** Selecciona la base activa y recompila las respuestas propias cuando cambia su texto. **Salida:** Repositorio FAQ, compilación local o null si se desactivó.
- **currentAudioScope:** Calcula la huella del negocio, catálogo y conocimiento vigentes. **Salida:** Hash; cualquier cambio relevante separa los audios reutilizables.
- **rateLimit:** Incrementa un contador por dirección IP y bucket dentro de una ventana de un minuto. **Salida:** Sin valor; HttpError 429 si excede max.
- **getSession:** Busca el Bearer visitante, verifica caducidad y renueva su vencimiento; una sesión expirada cancela tareas y proveedores. **Salida:** {token, session}; HttpError 401 si no existe una sesión vigente.
- **requireAdmin:** Verifica cookie de correo o hash del token de administración; nunca acepta el token visitante como permiso administrativo. **Salida:** Sin valor; lanza HttpError 401/503 cuando no hay acceso.
- **reserveRequest:** Comprueba tamaño del prompt y reserva presupuesto antes de llamar al modelo, incluso si luego falla la red. **Salida:** Decisión local de límite alcanzado o null si puede continuar.

## server/audio-library.js

Reutilizar WAV válidos antes de generar otra vez la misma voz.

- **Entrada:** repository, provider, directory, límites; texto y opciones autorizadas desde el servidor.
- **Salida:** Mismo contrato TTS: audioBase64, duration y provider; status y clear para administración.
- **Estado importante:** queue serializa archivos; epoch invalida escrituras al vaciar; ttl y maxBytes limitan disco; checksum detecta corrupción.
- **Efectos y límites:** Lee/escribe solo archivos propios con nombres hash. Si falla la caché intenta la síntesis normal; no vuelve gratuita una sesión de LiveAvatar.

**Dependencias directas:** `node:crypto`, `node:fs/promises`, `node:path`, `./errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
digest(data)
isKey(key)
validWav(data)
AudioLibrary.constructor({repository,provider,directory,maxBytes=128*1024*1024,ttlDays=30,enabled=true,now=Date.now})
AudioLibrary.serial(work)
AudioLibrary.path(key)
async AudioLibrary.init()
async AudioLibrary.checkRoot()
async AudioLibrary.remove(row)
async AudioLibrary.prune(extraBytes=0)
AudioLibrary.metric(name, saved=0)
async AudioLibrary.synthesize(text, options)
AudioLibrary.cancelled()
async AudioLibrary.status()
async AudioLibrary.clear()
```

### Contratos centrales

- **serial:** Encadena acceso a archivos/índice sin dejar la cola bloqueada si una operación falla. **Salida:** Promesa de work; los trabajos siguientes siguen siendo ejecutables.
- **init:** Crea/verifica carpeta privada, limpia huérfanos propios y aplica retención. **Salida:** Promise<void>; no sigue una carpeta simbólica.
- **prune:** Elimina entradas vencidas/corruptas y después las menos usadas hasta dejar capacidad. **Salida:** Promise<void>; extraBytes reserva espacio para un audio nuevo.
- **synthesize:** Consulta caché autorizada, valida WAV y checksum; si no sirve, genera y guarda de forma atómica. **Salida:** Promise<{audioBase64,duration,provider}>; abort puede cancelar incluso tras un acierto.
- **status:** Verifica mantenimiento y reúne límites, bytes y métricas para administración. **Salida:** Promise de estado; available=false si no puede usar la carpeta.
- **clear:** Incrementa epoch antes de encolar borrado para que una síntesis antigua no repueble lo recién vaciado. **Salida:** Promise<{cleared:true}>; no elimina catálogo ni historial.

## server/audio-policy.js

Decidir qué respuestas aprobadas pueden reutilizar audio.

- **Entrada:** Texto, reason del servidor, session y scope del contenido vigente.
- **Salida:** Hash de contexto, booleano de elegibilidad y memoria acotada de respuestas aprobadas.
- **Estado importante:** reusableReasons es una lista cerrada; reusableAudio recuerda hashes; scope cambia con catálogo/configuración.
- **Efectos y límites:** Solo muta memoria de sesión. No aceptar cacheable del navegador; datos personales y respuestas dinámicas se excluyen.

**Dependencias directas:** `node:crypto`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
audioScope(center, services, knowledge)
textDigest(text)
reusableText(text)
rememberReusable(session, text, reason, scope)
canReuseAudio(session, text, scope, greeting)
```

### Contratos centrales

- **reusableText:** Rechaza texto vacío/largo y patrones de correo, códigos, UUID, fechas o teléfono. **Salida:** Booleano; es una defensa adicional, no detección perfecta de todo dato personal.
- **rememberReusable:** Autoriza reutilización solo para respuestas locales elegibles y guarda hasta 24 hashes por sesión. **Salida:** Sin valor; cambia session.reusableAudio sin guardar el texto.
- **canReuseAudio:** Exige texto genérico y saludo vigente o hash aprobado en el mismo scope. **Salida:** Booleano de permiso decidido en servidor.

## server/audio-store.js

Persistir metadatos y métricas de la biblioteca de audio.

- **Entrada:** db; clave hash, checksum, bytes, duración, idioma y marcas temporales.
- **Salida:** Entradas ordenadas por uso y contadores de aciertos/fallos/tiempo evitado.
- **Estado importante:** key identifica audio; lastUsed permite expulsión LRU; audio_library_metrics conserva totales.
- **Efectos y límites:** Guarda metadatos en SQLite, no texto de respuestas ni audio binario; los WAV viven en disco privado.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
createAudioStore(db)
audioEntry(key)
audioEntries()
saveAudio(r)
deleteAudio(key)
touchAudio(key, now)
audioMetric(name, savedMs=0)
audioMetrics()
```

## server/booking-code.js

Generar y normalizar códigos de reserva legibles.

- **Entrada:** Texto introducido por el visitante, o ninguna entrada para generar.
- **Salida:** Código aleatorio, normalizado o formateado; booleano de formato válido.
- **Estado importante:** El alfabeto evita caracteres confusos; el guion es presentación, no parte de la identidad.
- **Efectos y límites:** Usa azar criptográfico; la unicidad se verifica en SQLite, no se presupone por ser aleatorio.

**Dependencias directas:** `node:crypto`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
normalizeBookingCode(value)
isBookingCode(value)
formatBookingCode(value)
newBookingCode()
```

## server/booking-intent.js

Reconocer pedidos sencillos de abrir la agenda o consultar citas.

- **Entrada:** Texto de la consulta.
- **Salida:** Intención de interfaz reconocida o ausencia de coincidencia.
- **Estado importante:** Expresiones regulares distinguen consulta, disponibilidad y reserva.
- **Efectos y límites:** No consulta Google ni confirma citas; orienta qué opción mostrar.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
bookingIntent(message)
```

## server/booking-store.js

Persistir reservas de Google, códigos cortos y estado de correo.

- **Entrada:** db y generateCode opcional; registro de reserva y revisión de reglas.
- **Salida:** Reservas, códigos, bloqueos de horarios y estado de comprobante.
- **Estado importante:** requestId es único; pending protege un horario incierto; booking_codes separa código visible e ID interno.
- **Efectos y límites:** Una transacción verifica solapamientos y guarda intención antes de llamar a Google. No enviar correos ni crear eventos desde este almacén.

**Dependencias directas:** `./errors.js`, `./booking-code.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
createBookingStore(db, {generateCode=newBookingCode}={})
assignCode(id)
unpack(r)
bookingSettings()
saveBookingSettings(revision, document)
bookingByRequest(id)
calendarBooking(id)
bookingByCode(code)
bookingReceipt(id)
claimBookingReceipt(id)
finishBookingReceipt(id, status)
calendarBookings()
bookingBlocks(calendarId)
claimBooking(record)
setBookingStatus(id, status)
```

### Contratos centrales

- **assignCode:** Reintenta una colisión de código hasta un límite; no cambia el identificador del evento Google. **Salida:** Sin valor; Error si no consigue un código válido y único.
- **claimBookingReceipt:** Reclama el envío mediante escritura atómica, evitando dos comprobantes simultáneos. **Salida:** Booleano que indica si este llamador puede enviar.
- **bookingBlocks:** Devuelve intervalos que deben protegerse aunque Google todavía no confirme la escritura. **Salida:** Filas {slot,end} para pending y reserved de ese calendario.
- **claimBooking:** Dentro de una transacción detecta solapamiento, inserta pending y asigna código único. **Salida:** Registro persistido; HttpError 409 si el horario está ocupado.

## server/booking.js

Aplicar reglas de disponibilidad y confirmar reservas contra Google.

- **Entrada:** repository, calendar, mailer y reloj; servicio, horario y datos del formulario.
- **Salida:** Slots disponibles, schedule completo, resultado de reserva o error controlado.
- **Estado importante:** rules fija anticipación y horizonte; slot/end son instantes ISO; fingerprint detecta cambios de configuración; marker vincula el evento.
- **Efectos y límites:** Consulta y escribe eventos mediante Calendar. Un resultado incierto queda pending; solo un evento verificado permite reserved. El correo tiene estado independiente.

**Dependencias directas:** `node:crypto`, `./errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
overlap(a, b, c, d)
formatter(zone)
parts(fmt, time)
dateKey(p)
minutes(s)
candidateSlots({now,timezone,weeklyHours,duration,horizonDays,noticeMinutes,stepMinutes,includeUnavailable=false})
eventBusy(event, timeZone)
convert(point)
BookingService.constructor({repository,calendar,mailer=null,now=Date.now})
BookingService.publicStatus()
async BookingService.configure(input)
BookingService.context(serviceId)
async BookingService.availability(serviceId)
BookingService.result(row)
async BookingService.sendConfirmation(id)
async BookingService.lookup({id,email})
async BookingService.reserve(input)
BookingService.path(row, item=false)
BookingService.match(row, event)
async BookingService.verifyRecord(row)
async BookingService.verify(id)
async BookingService.cancel(id)
```

### Contratos centrales

- **candidateSlots:** Recorre instantes y compara hora comercial en su zona; excluye cierres y saltos de reloj que alteran la duración. **Salida:** Array {slot,end}; son candidatos, todavía no disponibilidad confirmada.
- **eventBusy:** Convierte evento horario o de día completo a un intervalo; ignora eventos cancelados/transparentes. **Salida:** {start,end} en milisegundos, null si no bloquea; HttpError si no puede interpretarlo.
- **configure:** Valida reglas, servicios y permisos antes de habilitar agenda. **Salida:** Promise de reglas guardadas con nueva revision.
- **availability:** Combina candidatos, eventos reales y bloqueos locales pending/reserved; conserva horas ocupadas en schedule. **Salida:** Promise<{slots,schedule,timezone}>; slots contiene solo opciones elegibles.
- **sendConfirmation:** Reclama un único envío y solo envía para reserved; un fallo de red deja uncertain. **Salida:** Promise del estado de correo; no cambia la existencia del evento.
- **lookup:** Exige coincidencia de correo y código/ID antes de verificar el evento. **Salida:** Promise del resultado público; HttpError 404 si no coinciden los datos.
- **reserve:** Reutiliza requestId, comprueba precio/agenda y persiste pending antes de insertar en Google. **Salida:** Promise de resultado con status pending o reserved; pending no debe presentarse como éxito.
- **match:** Comprueba el marcador privado y ambos extremos del horario del evento. **Salida:** Sin valor; HttpError 409 si un evento fue alterado fuera de Nexo.
- **verifyRecord:** Consulta el ID Google conocido y compara su marcador y horario con SQLite. **Salida:** Registro reconciliado; ausencia de un evento pending no autoriza insertar uno nuevo.
- **verify:** Serializa la verificación de una reserva existente. **Salida:** Promise del resultado público de la reserva.
- **cancel:** Verifica propiedad del evento antes de eliminarlo; un pending no confirmado mantiene el bloqueo. **Salida:** Promise del resultado cancelado o error controlado.

## server/business-settings.js

Definir y validar los parámetros reutilizables de cada negocio.

- **Entrada:** center/config para valores iniciales; objeto input completo al guardar.
- **Salida:** Configuración normalizada, textos de negocio o HttpError 400 por valores inválidos.
- **Estado importante:** business, assistant, experience, ai, booking y video son secciones; knowledgeMode elige la fuente de respuestas.
- **Efectos y límites:** Funciones locales: no llaman proveedores ni guardan. Las plantillas solo permiten los campos autorizados, no ejecutan código.

**Dependencias directas:** `./errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
isSchool(center)
settingsDefaults(center, config={})
fail(text)
keys(obj, list)
text(value, label, max, empty=false)
choice(value, list, label)
number(value, min, max, label)
bool(value)
https(value, label)
template(value, label, max)
validateSettings(input)
fillTemplate(text, center)
businessText(text, center)
```

## server/calendar-store.js

Guardar la conexión de Calendar y las pruebas pendientes.

- **Entrada:** db; tokens ya cifrados, calendario seleccionado y comprobaciones.
- **Salida:** Métodos de lectura/escritura del estado de conexión y pruebas.
- **Estado importante:** selected identifica la agenda; pendingCalendarTests permite recuperar una prueba interrumpida.
- **Efectos y límites:** Almacena datos; el cifrado y las peticiones OAuth pertenecen al proveedor google-calendar.js.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
createCalendarStore(db)
readCalendarConnection()
saveCalendarTokens(tokens)
selectCalendar(selected)
recordCalendarCheck(result)
clearCalendarConnection()
pendingCalendarTests()
addCalendarTest(test)
removeCalendarTest(id)
```

## server/center.js

Adaptar el repositorio base al negocio configurado y su catálogo editable.

- **Entrada:** repository, center inicial y config; perfiles y servicios enviados por administración.
- **Salida:** Repositorio decorado con getCenter, saveConfiguration, saveService y lecturas de catálogo.
- **Estado importante:** state lee center_settings; configurationRevision cambia al guardar configuración; null es dato pendiente, 0 es precio gratuito.
- **Efectos y límites:** Guarda mediante updateCenterSettings. Cambiar moneda pone precios pendientes y cambiar tipo de negocio desactiva el catálogo anterior; no convierte importes.

**Dependencias directas:** `./business-settings.js`, `./faq.js`, `node:crypto`, `./errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
clean(value, label, max, optional = false)
exactKeys(value, allowed)
validateProfile(input)
valid(time)
validateService(input, prior, currency)
centerRepository(repository, center, config={})
state()
getCenter()
saveConfiguration(revision, input)
listServices(all=false)
getService(id)
slots()
reserve()
saveProfile(revision, input)
saveService(revision, id, input)
setServiceActive()
```

### Contratos centrales

- **validateProfile:** Valida nombre y siete filas de horario ordenadas de lunes a domingo. **Salida:** Perfil normalizado; lanza HttpError 400 ante horario inválido.
- **validateService:** Valida hechos comerciales; conserva id al editar y genera uno para un servicio nuevo. **Salida:** Servicio normalizado; null conserva explícitamente datos pendientes.
- **centerRepository:** Decora el repositorio con el perfil comercial persistente; sin center devuelve el repositorio original. **Salida:** Objeto con catálogo/configuración específicos del negocio.
- **saveConfiguration:** Valida todas las secciones antes de guardar y protege cambios de moneda/tipo. **Salida:** Configuración persistida; los errores dejan la versión anterior.
- **saveService:** Edita o agrega un servicio usando revisión optimista y el límite de catálogo. **Salida:** Estado actualizado que devuelve updateCenterSettings.

## server/config.js

Convertir variables del entorno en configuración tipada y validada.

- **Entrada:** env (por defecto process.env) y installationPath opcional para pruebas.
- **Salida:** Objeto config; lanza Error si hay proveedor, puerto, límites o dirección de retorno inválidos.
- **Estado importante:** aiLimits limita consultas; audioCache convierte MB a bytes y días a TTL; publicOrigin define el origen HTTPS permitido.
- **Efectos y límites:** Lee configuración de instalación; no inicia red. apiKey, adminToken y clientSecret son privados: nunca devolver config completo al navegador.

**Dependencias directas:** `./installation.js`, `./school-filter.js`, `./center.js`, `node:path`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
readConfig(env = process.env, {installationPath}={})
```

## server/conversation-store.js

Registrar atención y turnos de conversación para seguimiento.

- **Entrada:** db; canal text/voice/video; mensajes y resultado de cada turno.
- **Salida:** IDs, páginas del historial, métricas y un generador de texto para exportar.
- **Estado importante:** conversationId agrupa turnos; outcome distingue pending/completed/interrupted; reason explica de dónde salió la respuesta.
- **Efectos y límites:** Guarda texto, no grabaciones de micrófono. recoverConversations marca interrupciones tras reinicio; retención 0 no elimina automáticamente el historial.

**Dependencias directas:** `node:crypto`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
createConversationStore(db)
transaction(fn)
startConversation(channel='text')
startConversationTurn(id, {message='',channel='text',kind='message'}={})
completeConversationTurn(id, {text=null,outcome='completed',provider=null,reason=null,serviceId=null,aiCalls=0,inputTokens=0,outputTokens=0,durationMs=0}={})
endConversation(id, reason='ended')
recoverConversations()
purgeConversations(days, now=new Date())
listConversations(offset=0)
conversation(id)
conversationTurns(id, offset=0)
conversationMetrics()
exportConversation(id)
```

## server/db.js

Abrir SQLite y componer el repositorio de persistencia.

- **Entrada:** path de la base o :memory: en pruebas.
- **Salida:** repo con métodos de catálogo, configuración, auditoría y almacenes especializados; close libera la conexión.
- **Estado importante:** db es DatabaseSync; revision evita sobrescribir cambios ajenos; priceCents expresa centavos; requestId identifica reintentos.
- **Efectos y límites:** Crea tablas si faltan. BEGIN IMMEDIATE/COMMIT/ROLLBACK hacen atómicas las operaciones locales. El catálogo inicial y appointments pertenecen a la demo base; centerRepository adapta el negocio activo.

**Dependencias directas:** `./audio-store.js`, `./calendar-store.js`, `./booking-store.js`, `./conversation-store.js`, `./review-store.js`, `./admin-store.js`, `node:sqlite`, `node:fs`, `node:path`, `node:crypto`, `./errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
serviceRow(r)
createRepository(path)
audit(action, id)
reserveAiCall(day, limit)
aiUsage(day)
recordAiTokens(day, usage)
ensureCenterSettings(initial)
readCenterSettings()
updateCenterSettings(revision, transform)
listServices(all = false)
getService(id)
slots(serviceId, now = new Date())
reserve({ requestId, sessionHash, serviceId, customerName, email, slot, expectedPriceCents })
listAppointments()
cancel(id)
setServiceActive(id, active)
purge(retentionDays = 7, now = new Date())
close()
```

### Contratos centrales

- **createRepository:** Abre la conexión, asegura el esquema y reúne los almacenes bajo una interfaz compartida. **Salida:** Repositorio; llamar close al terminar.
- **reserveAiCall:** Incrementa atómicamente el contador diario solo si queda presupuesto. **Salida:** Booleano: true significa que la consulta ya fue contabilizada.
- **recordAiTokens:** Suma uso reportado por el proveedor únicamente si ambos contadores son enteros no negativos. **Salida:** Sin valor; modifica ai_daily_usage.
- **updateCenterSettings:** Exige la revision que leyó el editor y aplica transform dentro de una transacción; un error revierte todo. **Salida:** Nueva configuración con revision incrementada; HttpError 409 si hubo edición concurrente.
- **slots:** Genera horarios del catálogo de demostración base y descarta los ocupados en appointments. **Salida:** Array de instantes ISO; no es la agenda real de Google.
- **reserve:** Registra el turno de la demo base con precio y disponibilidad verificados; el mismo requestId no crea otra reserva. **Salida:** Fila de appointments; no usar este método como confirmación Google.
- **purge:** Elimina datos antiguos de la demo y limpia autenticación; no borra reservas futuras por haber sido creadas hace tiempo. **Salida:** Cantidad de appointments eliminados.

## server/documentation.js

Publicar únicamente la documentación permitida del proyecto.

- **Entrada:** projectRoot; identificador de documento/imagen generado desde una ruta permitida.
- **Salida:** catalog, document y asset; HttpError 404 si no se permite el archivo.
- **Estado importante:** files/assets mapean IDs a rutas; catalogPromise reúne lecturas simultáneas; checked verifica realpath.
- **Efectos y límites:** Lectura de docs, README y UBICACION. No convierte /docs en un explorador de .env, bases, logs o fuentes privadas.

**Dependencias directas:** `node:fs/promises`, `node:url`, `node:path`, `node:crypto`, `./errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
idFor(path)
cleanTitle(text)
cleanSummary(text)
category(path)
createDocumentation({projectRoot=root}={})
slash(path)
async checked(path, kind)
async walk(dir)
async catalog()
async document(id)
async asset(id)
```

### Contratos centrales

- **checked:** Resuelve la ruta real y exige ubicación/extensión/tamaño permitidos; frena recorridos y enlaces a otros proyectos. **Salida:** Promise<{full,info}> o HttpError 404.
- **catalog:** Enumera documentos, crea IDs estables y lee el tablero de tareas; comparte lecturas concurrentes. **Salida:** Promise<{documents,assets,status}>; no devuelve archivos de configuración privada.
- **document:** Busca el ID conocido y vuelve a verificar el archivo antes de leerlo. **Salida:** Promise<{id,path,text}>.
- **asset:** Busca y verifica una imagen documentada. **Salida:** Promise<{contents,mime}>; nunca acepta una ruta arbitraria del cliente.

## server/errors.js

Representar errores HTTP controlados y validar campos de texto.

- **Entrada:** status/message al construir HttpError; value, label, min, max en textField.
- **Salida:** Error con status o texto recortado válido.
- **Estado importante:** status será convertido a respuesta HTTP por app.js.
- **Efectos y límites:** Lanza HttpError en vez de aceptar entradas inválidas; no registra secretos.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
HttpError.constructor(status, message)
textField(value, name, min, max)
```

## server/faq.js

Leer el formato de preguntas frecuentes y preparar búsquedas locales.

- **Entrada:** Texto por bloques [id], entradas parseadas y consulta con catálogo/contexto.
- **Salida:** Entradas, índice con lookup, coincidencia resuelta, ambiguous o null.
- **Estado importante:** exact busca frases; index relaciona palabras; fields limita parámetros; signature evita recompilar un archivo sin cambios.
- **Efectos y límites:** parseFaq valida y compileFaq no hace red. FileFaqRepository lee disco; el arranque actual utiliza la variante SQLite.

**Dependencias directas:** `node:fs/promises`, `./school-filter.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
cleanQuery(text)
tokens(q)
bad(line, message)
parseFaq(source)
finish()
compileFaq(entries)
lookup({query,services,center,state,matchedServiceIds=[]})
FileFaqRepository.constructor(path)
async FileFaqRepository.refresh()
FileFaqRepository.lookup(input)
FileFaqRepository.status()
```

### Contratos centrales

- **parseFaq:** Recorre bloques del formato FAQ y rechaza campos, identificadores o plantillas no permitidos. **Salida:** Array de entradas con preguntas, respuesta, servicio y número de línea.
- **compileFaq:** Construye mapas de frases y palabras para evitar recorrer todo el catálogo por consulta. **Salida:** {entries, lookup}; no modifica la base de datos.
- **lookup:** Compara consulta y contexto con entradas activas, resuelve parámetros usando hechos vigentes y evita elegir empates. **Salida:** {text,id,serviceId}, {ambiguous:true} o null; no invoca IA.

## server/index.js

Arrancar Nexo y cerrar sus recursos ordenadamente.

- **Entrada:** Configuración validada, ruta SQLite y base inicial de preguntas frecuentes.
- **Salida:** Servidor HTTP escuchando en 127.0.0.1; código de salida si falla el arranque.
- **Estado importante:** config contiene ajustes privados; repository reúne almacenes; purgeTimer limpia datos vencidos; stopping evita cerrar dos veces.
- **Efectos y límites:** Abre SQLite, carga FAQ, programa limpieza y atiende SIGINT/SIGTERM. No importar este archivo en una prueba unitaria: arranca la aplicación.

**Dependencias directas:** `./sqlite-faq.js`, `node:url`, `./config.js`, `./db.js`, `./providers/ai.js`, `./app.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
stop()
```

## server/installation.js

Leer la identidad administrativa y los ajustes SMTP de esta instalación.

- **Entrada:** env y archivo JSON de instalación; SMTP_PASSWORD se toma del entorno.
- **Salida:** email normalizado, mode y mail; Error si el archivo tiene formato inválido.
- **Estado importante:** installationFile apunta a config/installation.json; password no pertenece a ese JSON.
- **Efectos y límites:** Lee disco sin enviar correo. Es configuración del despliegue, no el perfil comercial editable del negocio.

**Dependencias directas:** `node:fs`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
normalizeEmail(value)
readInstallation(env={}, path=installationFile)
```

## server/languages.js

Adaptar frases del visitante a reglas locales y compartir traducciones.

- **Entrada:** Mensaje y código de idioma es/en/fr.
- **Salida:** Mensaje equivalente para clasificación; exportaciones de traducción compartida.
- **Estado importante:** Las equivalencias ayudan al filtro; el texto original se conserva en el flujo HTTP.
- **Efectos y límites:** No es un traductor general ni hace red. Los textos comerciales nuevos necesitan traducción revisada.

**Dependencias directas:** `../public/i18n.js`, `./school-filter.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
visitorMessage(source, locale)
```

## server/review-store.js

Revisar respuestas insuficientes y publicar mejoras aprobadas.

- **Entrada:** db; filtros de cola; acción draft/dismiss/publish con revision y aprobación.
- **Salida:** Cola, temas, conteos y revisión actualizada; HttpError ante conflicto.
- **Estado importante:** candidate selecciona turnos revisables; knowledgeRevision detecta cambios simultáneos en FAQ.
- **Efectos y límites:** Publicar escribe revisión y base FAQ dentro de una transacción. No aprende ni publica automáticamente lo que diga un visitante.

**Dependencias directas:** `./errors.js`, `./faq.js`, `./school-filter.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
createReviewStore(db)
get(id)
reviewQueue(offset=0, status='pending')
updateReview(id, input)
```

## server/school-filter.js

Resolver hechos y saludos localmente y delimitar cuándo interpretar con IA.

- **Entrada:** message, servicios activos, center, state mutable y FAQ opcional.
- **Salida:** Decisión kind local/ai con reason, text y banderas como interpret/catalogOnly.
- **Estado importante:** serviceId recuerda el tema; pendingFacts espera un servicio; deviations cuenta desvíos claros; defaultAiLimits fija límites iniciales.
- **Efectos y límites:** No realiza red ni persiste. Modifica contexto; una palabra aislada sospechosa puede requerir aclaración, no prueba de mala intención.

**Dependencias directas:** `./business-settings.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
normalize(value)
schoolDay(now = new Date(), timezone = 'America/New_York')
offTopic(q)
selectedServices(q, services, school=true)
factContinuation(q)
filterSchoolMessage({message,services,center,state,faq=null})
local(text, reason, extra={})
requestTopicRisk(message, center)
```

### Contratos centrales

- **normalize:** Quita acentos, signos y espacios duplicados para comparar frases; conservar aparte el mensaje original para historial. **Salida:** String normalizado; no usarlo como transcripción visible.
- **schoolDay:** Obtiene fecha comercial en la zona indicada, no en la zona de la laptop. **Salida:** String YYYY-MM-DD para presupuesto diario y búsqueda de fechas.
- **selectedServices:** Relaciona nombres/IDs y alias escolares con servicios publicados. **Salida:** Array de coincidencias; más de una requiere aclarar.
- **factContinuation:** Permite heredar el servicio solo cuando todas las palabras corresponden a una continuación factual reconocida. **Salida:** Booleano; evita aplicar el precio anterior a un objeto nuevo.
- **filterSchoolMessage:** Prioriza saludos, FAQ y hechos; distingue desvíos claros de ambigüedad y actualiza contexto del servicio. **Salida:** Decisión local o ai, con reason y banderas que app.js procesa.

## server/school-intent.js

Interpretar consultas ambiguas mediante un esquema cerrado y resolverlas con datos locales.

- **Entrada:** Mensaje/catálogo/contexto para construir petición; interpretation para validar y resolver.
- **Salida:** Petición JSON estructurada o respuesta local basada en intenciones enumeradas.
- **Estado importante:** status distingue school/unclear/off_topic; facts solo admite hechos conocidos; serviceId debe existir.
- **Efectos y límites:** No hace fetch por sí mismo. Validar la salida del modelo es obligatorio; no mostrar texto libre del clasificador como un precio o confirmación.

**Dependencias directas:** `./business-settings.js`, `./school-filter.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
active(services)
buildIntentRequest({model,message,services,center,state,maxOutputTokens=250})
example(message, interpretation)
validateIntent(value, services)
resolveIntent({interpretation,services,center,state,faq})
local(text, reason, extra={})
```

### Contratos centrales

- **buildIntentRequest:** Construye instrucciones, ejemplos y JSON Schema con IDs permitidos; no llama al modelo. **Salida:** Objeto para Responses API con salida estructurada y límite de tokens.
- **validateIntent:** Comprueba claves exactas, enumeraciones y coherencia entre status, facts y clarification. **Salida:** El objeto recibido si es válido; Error si contradice el contrato.
- **resolveIntent:** Traduce la clasificación validada a una pregunta o respuesta basada en catálogo/FAQ; nunca ejecuta instrucciones del modelo. **Salida:** Decisión local marcada interpreted; puede modificar state.

## server/service-guidance.js

Guiar la elección de servicio con preguntas breves del catálogo.

- **Entrada:** message, center, servicios, state y decisión previa.
- **Salida:** Decisión local de orientación o null para continuar con otros manejadores.
- **Estado importante:** state.guidance.step indica permit/goal; candidatos se limitan a servicios activos.
- **Efectos y límites:** Actualiza contexto de la sesión sin IA ni red. No inventa requisitos del DMV cuando no están aprobados.

**Dependencias directas:** `./school-filter.js`, `./business-settings.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
guideService({message,center,services,state,decision})
local(text, reason='service_guidance')
```

## server/sqlite-faq.js

Mantener compilada la versión activa de preguntas frecuentes.

- **Entrada:** repository y seedPath del archivo de carga inicial.
- **Salida:** lookup y status; refresh actualiza la compilación cuando cambia revision.
- **Estado importante:** compiled es el índice en memoria; pending reúne refrescos simultáneos; revision es la versión guardada.
- **Efectos y límites:** Solo importa seedPath si falta la base school. Después, editar el archivo inicial no reemplaza las FAQ de SQLite.

**Dependencias directas:** `node:fs/promises`, `./faq.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
SqliteFaqRepository.constructor(repository, seedPath)
async SqliteFaqRepository.refresh()
SqliteFaqRepository.lookup(input)
SqliteFaqRepository.status()
```

## server/pilot-access.js

**Propósito:** Validar la clave compartida del piloto y emitir una cookie opaca.

- **Entra:** passwordHash, repositorio de límites y reloj.
- **Sale:** Cookie Secure/HttpOnly o HttpError; no devuelve la clave.
- **Estado y efectos:** sessions conserva hashes con vencimiento; pending limita scrypt; reiniciar revoca accesos.

## server/http-security.js

**Propósito:** Obtener un origen y una IP verificables antes de atender rutas.

- **Entra:** Petición HTTP y configuración.
- **Sale:** authority/clientIp o rechazo 400/403.
- **Estado y efectos:** En piloto exige proxy local que sobrescribe cabeceras; en local mantiene compatibilidad.

### Migración de administradores en v0.25.1

`administrators` deja de restringir su ID a 1. La migración transaccional conserva filas, comprueba claves foráneas y restaura su validación. La sincronización agrega direcciones nuevas y borra únicamente códigos/sesiones de los usuarios retirados. `adminId` enlaza cada desafío y sesión con su propietario; solicitar un código no invalida el de otro administrador.

## server/admin-agenda.js

Almacén privado de agenda. `agendaFilters(params,timezone)` valida y convierte fechas a UTC; `cancellationReason(input)` exige motivo. `createAgendaStore(db)` devuelve listado paginado, detalle y bitácora. `unpack` selecciona datos permitidos y excluye secretos. `booking_sync` guarda última comprobación; `booking_cancellations` registra intención y resultado. El actor de sesión se consulta con `administratorIdentity`; no procede del navegador. Consulte [Agenda administrativa](../48-agenda-administrativa.md).

## server/admin-reports.js

Valida filtros y columnas. Consulta datos retenidos y devuelve métricas, páginas y CSV; usa períodos en zona del negocio y lista cerrada de ordenamiento. Consulte [Reportes y respaldos](../49-reportes-avisos-respaldos.md).

## server/booking-notifications.js

Cola de avisos y trabajador SMTP. Recibe correos del servidor, reclama envíos y guarda resultado por destinatario; no reintenta incertidumbre sin decisión humana. Consulte [Reportes y respaldos](../49-reportes-avisos-respaldos.md).

## server/database-backup.js

Recibe SQLite y contraseña. Genera snapshot coherente, verifica integridad y cifra AES-GCM con clave derivada por scrypt; limpia temporales. decryptSnapshot restaura a archivo nuevo. Consulte [Reportes y respaldos](../49-reportes-avisos-respaldos.md).

## server/booking-transfers-store.js

Diario SQLite de intención pendiente antes de Google. begin protege origen/destino; finish cambia asignación y estado atómicamente. Conserva actor, motivo e identidad del evento. Consulte [Reasignación](../52-deshabilitar-y-reasignar-profesores.md).

## server/booking-transfers.js

Servicio de vista previa, movimiento y reconciliación. Guarda iCalUID, usa events.move y restaura marca privada por PATCH con versión. Nunca repite move tras incertidumbre. Consulte [Reasignación](../52-deshabilitar-y-reasignar-profesores.md).

### Configuración y barrera — actualización v0.31.0

[Contrato y recorrido de PILOT_PRIVATE_ENABLED, PILOT_PASSWORD y PILOT_PASSWORD_HASH](../53-configurar-acceso-piloto.md). Incluye separación entre barrera y protecciones del VPS, prioridad de claves, pruebas aisladas y verificación pública sin consumo.

## server/mogollon-offer.js

Entrada, salida, propósito y límites en la cabecera del módulo. [Recorrido explicado, catálogo aprobado y validación](../54-catalogo-voz-agenda.md).

## server/faq-editor.js

Convierte borradores estructurados en el formato FAQ validado. `serializeFaq(entries)` rechaza campos multilínea y parámetros desconocidos. `previewFaq(entry, services, center)` resuelve parámetros con el catálogo vigente, avisa si la respuesta está pausada y no escribe SQLite ni llama IA. La categoría organiza el panel; no cambia la búsqueda conversacional.

## server/school-journey.js

Recibe consulta normalizada y contexto temporal. Reconoce etapas (sin permiso, con permiso, curso terminado), horarios del curso y alcance del libro. Solo devuelve texto de una FAQ aprobada con ID esperado y servicio activo. No contiene precios ni confirma cupos.

## server/content-update.js

Recibe SQLite y un paquete JSON autorizado. Previsualiza por defecto; con apply utiliza una transacción para catálogo, FAQ, auditoría y registro de versión. Conserva campos no incluidos, valida con el contrato del editor y rechaza repetir un ID con otro contenido. Repetir un paquete aplicado no reemplaza ediciones del administrador.
