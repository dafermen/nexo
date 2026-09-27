# Referencia: Adaptadores de proveedores

Contratos del código propio de Nexo. Consulte primero el [mapa de código](../41-mapa-codigo-fuente.md) y el [manual junior](../23-manual-desarrollador-junior.md). Las firmas orientan la lectura; el cuerpo y sus validaciones son la autoridad ejecutable.

## public/providers/avatar-3d.js

Cargar y animar la alternativa local de avatar 3D.

- **Entrada:** Contenedor, estado y datos de boca procedentes del audio.
- **Salida:** Escena renderizada; fallback cuando no puede cargar el modelo.
- **Estado importante:** renderer/scene/camera forman la escena; morph targets cambian boca; loop actualiza movimientos.
- **Efectos y límites:** Carga modelos y usa GPU del navegador. No es MetaHuman ni video LiveAvatar; es una alternativa local.

**Dependencias directas:** `../vendor/three/three.module.js`, `../vendor/three/GLTFLoader.js`, `./executive-wardrobe.js`, `./avatar.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
LocalAvatarProvider.constructor(element, label)
async LocalAvatarProvider.load()
LocalAvatarProvider.resize()
LocalAvatarProvider.setEnabled(enabled)
LocalAvatarProvider.setMouth(frame)
LocalAvatarProvider.fallback(message)
LocalAvatarProvider.loop(time)
```

## public/providers/avatar-audio.js

Adaptar WAV a muestras PCM para el canal de LiveAvatar LITE.

- **Entrada:** Bytes WAV válidos y bloques PCM.
- **Salida:** PCM mono a 24 kHz y bloques base64.
- **Estado importante:** sampleRate convierte tiempos/muestras; tag comprueba cabeceras del contenedor.
- **Efectos y límites:** Cálculo local sin red. No confundir el WAV completo con el PCM crudo que espera LITE.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
wavToPcm24k(base64)
tag(offset)
pcmChunkBase64(bytes)
```

## public/providers/avatar.js

Proveer avatar estático y estados visuales básicos.

- **Entrada:** Elementos de avatar/etiqueta y estado del asistente.
- **Salida:** Clases y atributos del retrato; texto de estado. El retrato estático no mueve labios.
- **Estado importante:** El estado idle/listening/thinking/speaking comunica actividad.
- **Efectos y límites:** No conecta video ni sintetiza audio; implementa la interfaz visual mínima.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
SvgAvatarProvider.constructor(element, label)
SvgAvatarProvider.setState(state)
PortraitAvatarProvider.constructor(element, label)
PortraitAvatarProvider.update()
```

## public/providers/executive-style.js

Aplicar materiales y detalles visuales al modelo local.

- **Entrada:** Escena o mallas del avatar cargado.
- **Salida:** Mallas procedurales de accesorios añadidas al modelo; surface devuelve una Mesh y patch construye geometría.
- **Estado importante:** surface/patch trabajan con materiales y zonas del modelo.
- **Efectos y límites:** Muta la escena 3D en memoria; no cambia el archivo GLB original.

**Dependencias directas:** `../vendor/three/three.module.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
surface(rows, columns, point, material)
patch(points, material)
dressExecutive(model, head, spine)
```

## public/providers/executive-wardrobe.js

Aplicar una variante de vestuario al avatar 3D.

- **Entrada:** Modelo/escena cargado y materiales asociados.
- **Salida:** Aspecto modificado del avatar local.
- **Estado importante:** Las mallas seleccionadas delimitan qué partes se colorean.
- **Efectos y límites:** Carga asesora-ejecutiva.glb, adapta la piel cubierta y añade vestuario/cabello. No modifica los archivos originales ni el video remoto.

**Dependencias directas:** `../vendor/three/three.module.js`, `../vendor/three/GLTFLoader.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async applyExecutiveWardrobe(model)
```

## public/providers/live-avatar-lite.js

Transmitir audio al canal de control LITE.

- **Entrada:** URL/autorización temporal, audio PCM y callbacks de eventos.
- **Salida:** Conexión, comandos y eventos de habla/cierre.
- **Estado importante:** socket mantiene transporte; ready indica confirmación; eventId correlaciona órdenes; bufferedAmount limita el envío por congestión.
- **Efectos y límites:** Usa WebSocket del proveedor; disconnect debe liberar transporte y esperas.

**Dependencias directas:** `./avatar-audio.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
LiteAvatarTransport.constructor({ createSocket = url => new WebSocket(url), onEvent = () => {}, onFailure = () => {} } = {})
LiteAvatarTransport.connect(url)
LiteAvatarTransport.fail(message)
LiteAvatarTransport.command(type, extra = {}, eventId = crypto.randomUUID())
async LiteAvatarTransport.speak(wav, eventId, signal)
LiteAvatarTransport.disconnect()
```

## public/providers/live-avatar.js

Conectar video/audio remoto y coordinar habla del avatar.

- **Entrada:** api, stage, video, audio y callbacks; texto a reproducir.
- **Salida:** Estado de conexión y reproducción; stop libera sesión y recursos.
- **Estado importante:** generation invalida eventos antiguos; mode distingue FULL/LITE; deadlines limitan duración.
- **Efectos y límites:** Pide sesión al backend; LiveKit lleva medios y LITE lleva PCM. No poner la clave privada LiveAvatar en este archivo público.

**Dependencias directas:** `./live-avatar-lite.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
loadLiveKit()
LiveAvatarProvider.constructor({ api, stage, video, audio, loadSdk = loadLiveKit, cleanupFetch = fetch, createSocket, onStatus = () => {}, onError = () => {}, onAudioBlocked = () => {} })
async LiveAvatarProvider.start(options)
LiveAvatarProvider.current()
LiveAvatarProvider.maybeReady()
LiveAvatarProvider.handleEvent(event)
LiveAvatarProvider.onEvent(event)
LiveAvatarProvider.onFailure(message)
async LiveAvatarProvider.command(type, extra = {}, eventId = crypto.randomUUID())
LiveAvatarProvider.speak(text, callbacks = {})
LiveAvatarProvider.failed(message)
LiveAvatarProvider.stopSpeech()
async LiveAvatarProvider.resumeAudio()
async LiveAvatarProvider.stop()
```

## public/providers/local-speech.js

Reproducir WAV local y producir señales de movimiento de boca.

- **Entrada:** api, onFrame, texto y callbacks onStart/onEnd/onError.
- **Salida:** Audio del navegador y cuadros de animación con weights/level/elapsed.
- **Estado importante:** generation invalida trabajos cancelados; AudioContext decodifica; analyser calcula energía; timeline aproxima fonemas.
- **Efectos y límites:** Pide /api/tts y reproduce. La sincronía local es aproximada por letras, no alineación exacta de fonemas.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
mouthTimeline(text, duration)
mouthBlend(timeline, elapsed)
smoothSpeechLevel(previous, rms, dt)
LocalSpeechProvider.constructor({ api, onFrame = () => {}, scope = window })
LocalSpeechProvider.available()
async LocalSpeechProvider.prepare()
async LocalSpeechProvider.speak(text, { onStart = () => {}, onEnd = () => {}, onError = () => {} } = {})
LocalSpeechProvider.current()
LocalSpeechProvider.tick()
LocalSpeechProvider.stop()
```

### Contratos centrales

- **mouthTimeline:** Reparte duración entre letras y pausas para estimar posiciones de boca. **Salida:** Array de formas con start/end; aproximación, no marcas de fonemas del sintetizador.
- **mouthBlend:** Mezcla formas vecinas suavemente alrededor del tiempo actual. **Salida:** Mapa de pesos normalizados o {} fuera de la reproducción.
- **smoothSpeechLevel:** Suaviza energía RMS con tiempos diferentes de apertura y cierre. **Salida:** Número de amplitud visual; no cambia volumen del audio.
- **speak:** Pide WAV, verifica generation tras cada espera y conecta fuente/analyser al audio del navegador. **Salida:** Promise<void>; callbacks comunican inicio/fin/error y onFrame animación.
- **stop:** Invalida trabajo anterior y cancela petición, animación y fuente de audio. **Salida:** Sin valor; devuelve boca a silencio.

## public/providers/speech.js

Adaptar reconocimiento y voz disponibles en el navegador.

- **Entrada:** scope inyectable y callbacks; texto para BrowserTtsProvider.
- **Salida:** Transcripciones parciales/finales o eventos de síntesis y error.
- **Estado importante:** recognition identifica escucha vigente; timers detectan silencio/fallo; generation invalida síntesis vieja.
- **Efectos y límites:** El reconocimiento Web Speech puede necesitar un servicio de red del navegador; disponibilidad no garantiza permiso ni transcripción.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
BrowserSttProvider.constructor(scope = window)
BrowserSttProvider.available()
BrowserSttProvider.start({ onStart = () => {}, onPartial, onFinal, onError, onEnd })
BrowserSttProvider.isCurrent()
BrowserSttProvider.fail(message)
BrowserSttProvider.watch(delay, message)
BrowserSttProvider.stop()
BrowserTtsProvider.constructor(scope = window)
BrowserTtsProvider.available()
BrowserTtsProvider.speak(text, { onStart = () => {}, onEnd = () => {}, onError = () => {} } = {})
BrowserTtsProvider.current()
BrowserTtsProvider.stop()
```

### Contratos centrales

- **start:** Abre una instancia de reconocimiento, observa eventos vigentes y separa resultados provisionales de definitivos. **Salida:** Sin valor; onPartial/onFinal entregan texto, onError/onEnd informan fallos y cierre.

## server/providers/admin-mail.js

Enviar el código de acceso administrativo mediante SMTP.

- **Entrada:** Configuración mail; destinatario y código temporal.
- **Salida:** Promesa del envío; ready indica si existe configuración suficiente.
- **Estado importante:** Transport de Nodemailer mantiene la conexión; code no debe aparecer en logs.
- **Efectos y límites:** Envía correo real si se usa el proveedor real. En pruebas inyectar un mailer falso.

**Dependencias directas:** `nodemailer`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
AdminMailer.constructor(settings={}, factory=nodemailer.createTransport)
async AdminMailer.sendCode({to,code})
AdminMailer.close()
```

## server/providers/ai.js

Encapsular IA de demostración y OpenAI detrás de reply/interpret.

- **Entrada:** Configuración privada, mensajes, catálogo, señal de cancelación y petición preparada.
- **Salida:** Promise con text y usage; interpret agrega interpretation parseada.
- **Estado importante:** fetchImpl permite simular red; preparedRequest contiene límites e instrucciones; store:false forma parte de la petición.
- **Efectos y límites:** Solo OpenAiProvider llama /v1/responses. No crea reservas. Los errores externos se transforman en mensajes controlados sin exponer la clave.

**Dependencias directas:** `../business-settings.js`, `../errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
formatPrice(s)
async DemoAiProvider.reply({ messages, services, center })
buildAiRequest({model,messages,services,center,serviceContext=null,maxOutputTokens=700,language='es'})
OpenAiProvider.constructor({ apiKey, model, fetchImpl = fetch })
async OpenAiProvider.interpret({preparedRequest,signal})
async OpenAiProvider.reply({ messages, services, center, signal, maxOutputTokens=700, preparedRequest })
createAiProvider(config)
```

### Contratos centrales

- **buildAiRequest:** Separa instrucciones del catálogo/historial y aplica idioma y máximo de salida. **Salida:** Objeto de petición Responses API; construirlo no consume tokens.
- **interpret:** Reutiliza reply y exige que el texto pueda parsearse como JSON. **Salida:** Promise<{interpretation,usage}>; el dominio valida el esquema después.
- **createAiProvider:** Selecciona implementación según config.provider. **Salida:** OpenAiProvider o DemoAiProvider con interfaz reply.

## server/providers/booking-mail.js

Enviar comprobantes de citas en el idioma del visitante.

- **Entrada:** booking confirmado, centerName y configuración SMTP heredada.
- **Salida:** Promesa del envío del comprobante.
- **Estado importante:** slot/timezone determinan hora local; code es el identificador visible, language elige textos.
- **Efectos y límites:** Envía correo; no confirma ni modifica el evento Google. Fallar el correo no implica que se haya perdido la reserva.

**Dependencias directas:** `../languages.js`, `./admin-mail.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async BookingMailer.sendConfirmation({booking,centerName})
```

## server/providers/google-calendar.js

Encapsular OAuth, cifrado de credenciales y operaciones de Calendar.

- **Entrada:** repository, config, fetchImpl/reloj/clave inyectables; IDs de calendarios y eventos.
- **Salida:** Estado seguro, URL de autorización, calendarios, eventos y comprobaciones.
- **Estado importante:** states guarda intentos OAuth; binding une navegador e intento; refreshing comparte renovación; busy excluye operaciones concurrentes.
- **Efectos y límites:** Red Google y clave AES local. Tokens cifrados en SQLite; nunca enviarlos al navegador. Pruebas de escritura solo eliminan eventos con marcador propio.

**Dependencias directas:** `node:crypto`, `node:fs`, `node:path`, `../errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
digest(value)
safeCalendar(c)
GoogleCalendarService.constructor({repository,config={},fetchImpl=fetch,now=Date.now,key=null})
GoogleCalendarService.configured()
GoogleCalendarService.keyBytes()
GoogleCalendarService.seal(value)
GoogleCalendarService.unseal(value)
GoogleCalendarService.status()
GoogleCalendarService.requireConfigured()
async GoogleCalendarService.exclusive(work)
GoogleCalendarService.begin()
async GoogleCalendarService.tokenRequest(params)
async GoogleCalendarService.complete({state,code,error}, binding)
async GoogleCalendarService.accessToken(force=false)
async GoogleCalendarService.request(path, {method='GET',body,allowMissing=false}={})
async GoogleCalendarService.calendars()
async GoogleCalendarService.calendar(id)
async GoogleCalendarService.select(id)
GoogleCalendarService.selected(id)
async GoogleCalendarService.check(id)
async GoogleCalendarService.bookingEvents(id, start, end)
async GoogleCalendarService.cleanupRecord(test)
async GoogleCalendarService.test(id)
async GoogleCalendarService.cleanup()
async GoogleCalendarService.disconnect()
GoogleCalendarService.close()
```

### Contratos centrales

- **seal:** Cifra un objeto JSON con AES-256-GCM y vector aleatorio. **Salida:** Texto cifrado con IV y etiqueta; necesita la misma clave local para leerlo.
- **unseal:** Verifica y descifra el estado OAuth guardado. **Salida:** Objeto privado o HttpError si cambió/se perdió la clave.
- **exclusive:** Impide operaciones de agenda concurrentes durante este trabajo; finally siempre libera busy. **Salida:** Promise con resultado de work; HttpError 409 si ya hay otra operación.
- **begin:** Genera state, binding y PKCE con caducidad para autorizar en Google. **Salida:** {url,binding}; el binding se entrega como cookie protegida desde app.js.
- **complete:** Verifica estado y navegador antes de canjear código; exige permisos y refresh_token. **Salida:** Promise del estado conectado; guarda tokens cifrados y reinicia selección.
- **accessToken:** Usa token vigente o comparte una única renovación entre peticiones simultáneas. **Salida:** Promise del access_token privado; nunca enviarlo al visitante.
- **request:** Hace una petición autenticada con timeout y una renovación ante 401; no reintenta escrituras inciertas indiscriminadamente. **Salida:** Promise de JSON, null para 204/ausencia permitida o HttpError.
- **bookingEvents:** Recorre todas las páginas de eventos dentro del intervalo solicitado. **Salida:** Promise de eventos con start/end; incompletitud es error, no disponibilidad libre.
- **cleanupRecord:** Elimina solo el evento técnico que coincide con el marcador de la prueba guardada. **Salida:** Promise<void>; conserva pendiente cuando todavía no puede confirmar la limpieza.
- **disconnect:** Exige limpiar pruebas pendientes, intenta revocar Google y borra la conexión local. **Salida:** Promise de estado con revoked, que indica si Google confirmó revocación.

## server/providers/live-avatar.js

Controlar la sesión remota de video desde el servidor.

- **Entrada:** Ajustes LiveAvatar y owner de sesión visitante.
- **Salida:** Estado público y datos temporales para conectar video; errores controlados.
- **Estado importante:** active identifica propietario; duration limita a 60 segundos; stopPending evita crear otra sesión antes de cerrar.
- **Efectos y límites:** Puede consumir servicio de pago. Cancelación y cierre deben alcanzar al proveedor aunque el navegador ya no espere la respuesta.

**Dependencias directas:** `../errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
LiveAvatarService.constructor(settings = {}, { fetchImpl = fetch } = {})
LiveAvatarService.status()
async LiveAvatarService.request(path, { body, sessionToken } = {})
async LiveAvatarService.start(owner, { mode, consent, language='es' } = {})
async LiveAvatarService.closeRecord(record)
async LiveAvatarService.stop(owner)
async LiveAvatarService.close()
```

## server/providers/local-tts.js

Convertir texto a voz local Piper y describir su identidad de caché.

- **Entrada:** Texto, owner, language y AbortSignal; rutas locales de ejecutable/modelos.
- **Salida:** WAV en base64, duration y provider; status sin secretos; cacheIdentity con huellas.
- **Estado importante:** job guarda el único proceso en curso y su owner; fingerprints reutiliza huellas si los archivos no cambiaron; voiceSettings fija formato y frecuencia.
- **Efectos y límites:** Inicia un proceso sin shell, limita tamaño/tiempo y permite detenerlo. No llama una API de voz pagada.

**Dependencias directas:** `node:child_process`, `node:crypto`, `node:fs/promises`, `node:fs`, `node:url`, `../errors.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
modelPath(language)
async fingerprint(path)
pcmToWav(pcm, sampleRate = 22050)
LocalTtsService.constructor({ spawnImpl = spawn, available } = {})
LocalTtsService.status(language='es')
async LocalTtsService.cacheIdentity(language='es')
async LocalTtsService.synthesize(text, { owner, signal, language='es' } = {})
LocalTtsService.finish(error, value)
LocalTtsService.abort()
LocalTtsService.stop(owner)
LocalTtsService.close()
```

### Contratos centrales

- **fingerprint:** Calcula SHA256 del archivo y comparte el cálculo mientras tamaño y tiempos no cambien. **Salida:** Promise<string> con huella; un fallo quita la entrada para permitir reintento.
- **pcmToWav:** Prepara cabecera RIFF para PCM de 16 bits mono sin modificar muestras. **Salida:** Buffer WAV; sampleRate determina duración/velocidad de reproducción.
- **cacheIdentity:** Describe exactamente idioma, modelo, hablante, motor y parámetros de síntesis. **Salida:** Promise de objeto de identidad o null si esa voz no está disponible.
- **synthesize:** Inicia Piper con texto por stdin, recoge PCM y cancela por timeout/tamaño/AbortSignal. **Salida:** Promise<{audioBase64,duration,provider}>; un solo job simultáneo por instancia.
- **stop:** Cancela el proceso solo si pertenece al owner solicitado. **Salida:** Sin valor; no interrumpe la voz de otro propietario.
