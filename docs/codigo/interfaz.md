# Referencia: Interfaz y coordinación del navegador

Contratos del código propio de Nexo. Consulte primero el [mapa de código](../41-mapa-codigo-fuente.md) y el [manual junior](../23-manual-desarrollador-junior.md). Las firmas orientan la lectura; el cuerpo y sus validaciones son la autoridad ejecutable.

## public/admin-access.js

Mostrar acceso por correo/código o token y gestionar vencimiento.

- **Entrada:** Nodo de acceso, callbacks y respuestas de /api/auth.
- **Salida:** Estado autenticado para la página y cierre por inactividad.
- **Estado importante:** Los callbacks onAuthenticated/onExpired/onActivity desacoplan acceso del panel que lo usa.
- **Efectos y límites:** No confundir cookie administrativa con token visitante; el servidor verifica autoridad en cada petición.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
installAdminAccess({onAuthenticated,onExpired,onActivity=()=>{}})
el(tag, text)
message(text)
async request(path, method='GET', body)
signed()
reset()
logout()
```

## public/admin.js

Administrar catálogo, perfil y biblioteca de audio.

- **Entrada:** Formularios del administrador y respuestas autorizadas de API.
- **Salida:** Listas, editores, estados de carga y estadísticas de audio.
- **Estado importante:** revision protege ediciones; generaciones invalidan cargas tras cerrar sesión; loadAudioLibrary consulta bajo demanda.
- **Efectos y límites:** Guardar cambia SQLite mediante API; vaciar biblioteca elimina audios derivados, no servicios ni historial.

**Dependencias directas:** `./admin-access.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
$(id)
node(tag, text)
money(s)
message(id, text='')
showError(text)
logout(remote=false)
async request(path, options={})
discard()
renderSchool(settings)
openEditor(service)
closeEditor()
async load()
onAuthenticated(credential)
onExpired()
onActivity()
async loadAudioLibrary()
```

## public/api.js

Centralizar peticiones del kiosco al servidor Nexo.

- **Entrada:** path y opciones method/body/signal.
- **Salida:** Promesa del JSON recibido o Error con status HTTP.
- **Estado importante:** token es el Bearer del visitante; el timeout limita espera a 30 segundos.
- **Efectos y límites:** fetch al mismo servidor; no contiene claves de proveedores. JSON.stringify serializa el body, no ejecuta instrucciones.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
ApiClient.constructor()
async ApiClient.request(path, { method = 'GET', body, signal } = {})
```

### Contratos centrales

- **request:** Serializa body y agrega Bearer visitante; combina cancelación del llamador con timeout. **Salida:** Promise del JSON; Error.status permite distinguir sesión vencida, conflicto o límite.

## public/app.js

Coordinar la experiencia del visitante: texto, voz, video y formularios.

- **Entrada:** Eventos de interfaz; config, servicios y respuestas de la API.
- **Salida:** DOM actualizado, reproducción, llamadas HTTP y formularios de agenda.
- **Estado importante:** generation invalida respuestas antiguas; bookingGeneration protege modales; busy evita envíos simultáneos; pendingSession reúne inicios concurrentes.
- **Efectos y límites:** No accede a SQLite. resetSession detiene trabajo y limpia pantalla; iniciar otra conversación no borra el historial administrativo.

**Dependencias directas:** `./i18n.js`, `./language-ui.js`, `./touch-keyboard.js`, `./kiosk-home.js`, `./api.js`, `./providers/avatar.js`, `./providers/local-speech.js`, `./providers/speech.js`, `./providers/live-avatar.js`, `./call-conversation.js`, `./call-view.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
$(id)
async loadLocalAvatar()
onFrame(frame)
onClose()
openAgenda()
selectLanguage(locale)
applyVoiceLanguage()
stopListeningOnly()
updateCallMode()
listen()
send(text)
paused(message)
changed({enabled,phase})
onOpen()
onStatus(state, detail = {})
onError(message)
onAudioBlocked()
price(s)
dateLabel(slot)
element(tag, className, text)
privateText(value)
notify(message = '')
switchView(view)
stopAudio()
renderBusy(value)
speak(text)
onStart()
onEnd()
onError(message)
addMessage(role, text)
async ensureSession({ video = false, channel = 'text' } = {})
async accept()
async sendMessage(text)
resetSession(message = '', { stopVideo = true, reason='ended' } = {})
updateSound()
startListening(automatic = false)
onStart()
onPartial(text)
onFinal(text)
onError(message)
onEnd()
activateMicrophone()
renderServices()
async openBooking(service, {availabilityOnly=false,preferredSlot=null}={})
alive()
readSlots(data)
showError(error)
summary()
chooseSlot()
renderTimes()
details()
review()
pauseCallForBooking()
openCallAgenda(action='menu')
showAgendaMenu(service=null)
chooseCallService(action)
async openAppointmentLookup()
async beginCall(mode)
startNewConversation()
checkInactivity()
renderAvatarOptions()
renderCenter()
async refreshCatalog()
```

### Contratos centrales

- **selectLanguage:** Cierra la sesión anterior y aplica idioma a UI, STT y disponibilidad de voz. **Salida:** Sin valor; siguiente sesión se crea con el nuevo idioma.
- **privateText:** Crea un nodo marcado noTranslate para mantener nombres/códigos sin modificación. **Salida:** Elemento p con textContent, no HTML interpretado.
- **speak:** Elige LiveAvatar conectado o TTS local y pausa escucha mientras habla para evitar eco. **Salida:** Sin valor directo; onEnd permite continuar el turno automático.
- **ensureSession:** Muestra aviso y crea sesión solo al aceptar; comparte pendingSession si dos acciones lo piden a la vez. **Salida:** Promise<boolean>; true deja api.token listo, false significa que no se inició.
- **sendMessage:** Guarda generation antes de esperar, envía texto y solo muestra el resultado si sigue siendo la misma conversación. **Salida:** Promise<void>; actualiza chat, opciones y voz o muestra error.
- **resetSession:** Invalida generaciones antes de permitir nuevas respuestas; detiene micrófono/audio/video, cierra diálogos y vacía datos visibles. **Salida:** Sin valor; solicita cierre de sesión, no borra historial administrativo.
- **startListening:** Conecta callbacks parciales/finales del STT y descarta eventos de generaciones antiguas. **Salida:** Sin valor; en automático una frase final pasa al gestor de turnos.
- **openBooking:** Construye selección de día/hora, datos, revisión y confirmación; bookingGeneration protege respuestas de modales cerrados. **Salida:** Interfaz de reserva; la creación real sucede únicamente al confirmar el formulario.
- **pauseCallForBooking:** Pausa escucha mientras el visitante introduce datos en pantalla. **Salida:** Estado de reanudación conservado para volver a la llamada.
- **showAgendaMenu:** Presenta reservar, consultar cita o disponibilidad desde inicio/llamada. **Salida:** Modal con acciones; abrirlo no reserva.
- **beginCall:** Prepara consentimiento, interfaz y canal seleccionado; habilita micrófono automático al finalizar el saludo. **Salida:** Promise<void>; voz y video usan proveedores distintos.
- **checkInactivity:** Evalúa tiempos/estado para avisar o limpiar datos del visitante. **Salida:** Sin valor; puede pausar/cerrar atención y regresar al inicio.

## public/booking-settings.js

Editar reglas de agenda para servicios publicados.

- **Entrada:** request, catálogo y configuración de reservas.
- **Salida:** Formulario de reglas y resultado de guardado.
- **Estado importante:** revision detecta edición simultánea; serviceIds restringe qué servicios admiten reserva.
- **Efectos y límites:** No fabrica slots en el navegador; disponibilidad real la calcula el servidor.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
el(tag, text)
bookingSettings({request})
render(data)
destroy()
```

## public/calendar-settings.js

Mostrar conexión, selección y prueba de Google Calendar.

- **Entrada:** Funciones request/estado y clics del administrador.
- **Salida:** UI de autorización y resultado de comprobación; destroy descarta vista.
- **Estado importante:** render presenta el estado seguro; IDs identifican calendario seleccionado, no credenciales.
- **Efectos y límites:** Las acciones de conectar, probar o desconectar van a API autenticada; una prueba de escritura sí crea y elimina un evento técnico.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
node(tag, text)
calendarSettings({initial,request,beforeConnect=()=>true})
button(text, id, work)
renderDisabled()
render()
destroy()
```

## public/call-conversation.js

Organizar turnos automáticos entre escuchar, enviar y reproducir.

- **Entrada:** Callbacks listen/stopListening/send/changed/paused y reloj; transcripción final.
- **Salida:** Transiciones de phase y llamadas a callbacks; no respuesta HTTP propia.
- **Estado importante:** enabled activa automatismo; revision invalida timers; text espera 900 ms antes de envío; timer se cancela al pausar.
- **Efectos y límites:** No sabe qué proveedor hace STT/IA/TTS. Al terminar voz espera 650 ms y escucha; una transcripción parcial nunca se envía como final.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
CallConversation.constructor({listen, stopListening, send, changed = () => {}, paused = () => {}, clock = globalThis})
CallConversation.cancelTimer()
CallConversation.state(phase)
CallConversation.later(callback, ms)
CallConversation.enable({waitForReply=false}={})
CallConversation.startTurn()
CallConversation.started()
CallConversation.partial()
CallConversation.final(text)
CallConversation.ended()
CallConversation.thinking()
CallConversation.speaking()
CallConversation.replyEnded()
CallConversation.pause(message='')
```

### Contratos centrales

- **later:** Programa un callback protegido por revision y enabled. **Salida:** Sin valor; un pause posterior impide ejecutar el callback viejo.
- **partial:** Cancela envío en preparación porque el visitante continúa hablando. **Salida:** Sin valor; conserva fase listening y vacía texto pendiente.
- **final:** Recibe solo una transcripción final no vacía y espera 900 ms; otra frase parcial puede cancelar el envío. **Salida:** Sin valor; programa send y transición a thinking.
- **replyEnded:** Espera 650 ms tras la voz antes de abrir el próximo turno. **Salida:** Sin valor; transición waiting y luego starting.
- **pause:** Desactiva automatismo, invalida timers y detiene el micrófono. **Salida:** Sin valor; avisa al llamador si recibe un mensaje.

## public/call-view.js

Presentar la llamada a pantalla completa y sus controles.

- **Entrada:** Elementos existentes del DOM y cambios de estado, subtítulo o tiempo.
- **Salida:** Controlador con status/caption/time/exit y propiedades de conexión.
- **Estado importante:** mode distingue voice/video; active/connected diferencian pantalla abierta y sesión lista; framing ajusta encuadre.
- **Efectos y límites:** Mueve/presenta elementos visuales; la conexión real la controla el proveedor, no este componente.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
icon(name)
$(id)
createCallView()
closePanel({ focus = true } = {})
openPanel()
framing()
sync()
connected()
active()
mode()
setBookingAvailable(value)
status(state, requestedMode = 'video')
caption(text)
time(seconds)
exit()
```

## public/conversations.js

Consultar historial y métricas privadas de conversaciones.

- **Entrada:** Filtros/paginación, sesión administrativa y respuestas API.
- **Salida:** Detalle de turnos, contadores y descarga del registro de texto.
- **Estado importante:** IDs relacionan sesión/turnos; generaciones descartan peticiones al cerrar sesión.
- **Efectos y límites:** Lectura autenticada; logout elimina detalles de pantalla. El texto generado no prueba que el visitante haya oído el audio.

**Dependencias directas:** `./admin-access.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
$(id)
el(tag, text)
label(v)
date(v)
error(text='')
async request(path, {raw=false}={})
clearDetail()
logout(remote=false)
async detail(id, append=false)
async load()
onAuthenticated(value)
onExpired()
onActivity()
```

## public/docs-renderer.js

Convertir Markdown a nodos DOM con elementos permitidos.

- **Entrada:** Markdown y catálogo de documentos/imágenes para resolver enlaces.
- **Salida:** DocumentFragment y lista de encabezados para índice lateral.
- **Estado importante:** headingId genera anclas; target resuelve referencias internas; inline/blocks recorren tokens.
- **Efectos y límites:** No ejecutar HTML del Markdown. Los enlaces y recursos se construyen según reglas explícitas del renderizador.

**Dependencias directas:** `./vendor/marked.esm.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
el(tag, text)
decode(text)
headingId(text)
renderDocument(source, {path,documents,assets})
target(href, image=false)
inline(tokens, parent)
blocks(tokens, parent)
```

### Contratos centrales

- **renderDocument:** Recorre tokens Markdown construyendo nodos permitidos y resolviendo enlaces del catálogo. **Salida:** {fragment,headings}; el llamador inserta fragment y usa headings para navegación.

## public/docs.js

Navegar la biblioteca, manuales y tablero de tareas.

- **Entrada:** Catálogo público y hash de URL con doc/view/category/q.
- **Salida:** Tarjetas, documentos renderizados, búsqueda, descarga e impresión.
- **Estado importante:** revision descarta documentos llegados tarde; searchTimer limita búsquedas; taskFilter selecciona estado.
- **Efectos y límites:** Solo solicita rutas de documentación; crear un enlace no concede acceso a archivos fuera del catálogo.

**Dependencias directas:** `./docs-renderer.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
$(selector)
node(tag, text, className)
link(text, href, className)
normalize(text)
notice(text)
docHref(path)
card(doc)
section(title, description)
home()
library(params)
tasks()
async readDocument(id, heading, version)
paramsForRoute()
async route()
async load()
search()
```

### Contratos centrales

- **home:** Construye la portada del portal con acceso al recorrido de aprendizaje y al tablero. **Salida:** DocumentFragment que route inserta en la vista.
- **readDocument:** Solicita un documento y verifica la revisión de navegación antes de mostrarlo. **Salida:** Promise<void>; dibuja contenido, herramientas e índice lateral.
- **route:** Interpreta hash y cancela visualmente resultados antiguos incrementando revision. **Salida:** Promise<void>; la URL permite compartir un documento concreto.

## public/i18n.js

Definir idiomas y traducciones de interfaz y frases conocidas.

- **Entrada:** Clave/frase original, idioma elegido y valores de plantillas.
- **Salida:** Texto traducido o frase original cuando no hay equivalencia.
- **Estado importante:** language es idioma activo del módulo; languages define códigos de voz; tablas contienen equivalencias revisadas.
- **Efectos y límites:** No hace red; comparte reglas con el servidor. No insertar datos personales en la tabla de traducciones.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
validLanguage(value)
setLanguage(value)
escape(value)
translate(value, locale=language, depth=0)
```

## public/kiosk-home.js

Abrir paneles compactos sin abandonar la pantalla del kiosco.

- **Entrada:** Callbacks switchView/onClose/openAgenda y acciones del visitante.
- **Salida:** Controlador open/close sobre paneles del inicio.
- **Estado importante:** El panel activo determina contenido y foco; data/ARIA comunican estado.
- **Efectos y límites:** Modifica DOM y foco. No inicia servicios pagados.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
createKioskHome({switchView,onClose,openAgenda})
$(id)
open(view)
close()
```

## public/knowledge.js

Editar la base activa de preguntas y respuestas.

- **Entrada:** Texto FAQ y revisión recibidos tras autenticar.
- **Salida:** Validación/guardado y mensajes de estado.
- **Estado importante:** revision acompaña cada guardado; logout limpia contenido privado.
- **Efectos y límites:** Escribe la base SQLite por API; no modifica el archivo semilla ni llama a IA para publicar.

**Dependencias directas:** `./admin-access.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
$(id)
message(id, text='')
async request(method='GET', body)
async load()
logout(remote=false)
onAuthenticated(value)
onExpired()
onActivity()
```

## public/language-ui.js

Aplicar el selector de idioma sobre DOM y contenido añadido.

- **Entrada:** Callback al elegir idioma y nodos observados.
- **Salida:** Etiquetas/textos actualizados y controlador apply.
- **Estado importante:** skip excluye campos sensibles o marcados noTranslate; observador procesa cambios del DOM.
- **Efectos y límites:** Modifica presentación, no traduce datos privados ni cambia hechos del catálogo; app.js inicia una sesión nueva al cambiar idioma.

**Dependencias directas:** `./i18n.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
installLanguageUI(onChange)
skip(node)
render(root=document.body)
visit(node)
apply(locale)
```

## public/reviews.js

Revisar consultas no resueltas y publicar respuestas aprobadas.

- **Entrada:** Cola autenticada, selección y formulario de revisión.
- **Salida:** Borrador, descarte o publicación y vista actualizada.
- **Estado importante:** revision y knowledgeRevision protegen cambios; approved expresa revisión humana.
- **Efectos y límites:** Publicar es una escritura explícita. No reutilizar datos personales del historial como respuesta pública.

**Dependencias directas:** `./admin-access.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
$(id)
el(tag, text)
notice(id, text='')
clear()
logout(remote=false)
async request(path='', method='GET', body)
controls()
select(item)
async load()
async save(action)
navigate(fn)
onAuthenticated(value)
onExpired()
onActivity()
```

## public/settings.js

Editar parámetros del negocio desde secciones de configuración.

- **Entrada:** Configuración guardada, valores del formulario y estado de integraciones.
- **Salida:** Objeto de configuración validado en servidor y vista previa local.
- **Estado importante:** data contiene configuración; dirty marca cambios; saving evita doble guardado; generation descarta cargas antiguas; active elige sección.
- **Efectos y límites:** No guarda claves privadas en navegador. Elegir modelo no demuestra disponibilidad ni dispara una llamada pagada.

**Dependencias directas:** `./booking-settings.js`, `./calendar-settings.js`, `./admin-access.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
$(id)
el(tag, text)
async calendarRequest(method, path, body)
timezoneOptions(current)
modelOptions(current)
valueAt(object, path)
setAt(object, path, value)
msg(id, text='')
async request(method='GET', body)
show(id)
field(path, label, type, options={})
hours()
integration(label, ready, description)
render()
beforeConnect()
collect()
preview()
logout(remote=false)
async load()
onAuthenticated(credential)
onExpired()
onActivity()
```

## public/touch-keyboard.js

Ofrecer teclado táctil desplegable para campos permitidos.

- **Entrada:** Eventos de foco/puntero, input activo y callbacks de apertura.
- **Salida:** Texto editado con selección conservada; eventos input y controlador enable/open/close/destroy.
- **Estado importante:** target identifica campo; selección delimita inserción; layout diferencia texto y correo.
- **Efectos y límites:** No almacena ni envía lo escrito. Se omiten campos no elegibles; al abrirlo el llamador pausa el micrófono.

**Dependencias directas:** `./i18n.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
createTouchKeyboard({onOpen=()=>{}}={})
eligible(node)
prepare()
close(restoreFocus=true)
render()
sync()
edit(text, backspace=false)
open(input)
setEnabled(value)
destroy()
```

## public/pilot.js

**Propósito:** Enviar la clave y cerrar el acceso desde el formulario.

- **Entra:** Eventos del participante.
- **Sale:** Peticiones de login/logout y mensajes accesibles.
- **Estado y efectos:** No usa almacenamiento del navegador; el servidor otorga el permiso.

## public/admin-agenda.js

`installAgenda({root,request})` recibe el contenedor DOM y la petición autenticada; devuelve `load` y `reset`. Mantiene filtros, offset, zona horaria y generaciones que descartan respuestas antiguas. `open` construye el detalle con textContent; `act` serializa acciones de la interfaz. Cancelar exige selección de motivo y confirmación; errores conservan estado sin anunciar éxito. `reset` vacía datos al salir. Consulte [Agenda administrativa](../48-agenda-administrativa.md).

## public/admin-reports.js

Recibe request/download autenticados. Renderiza métricas y tablas con textContent, controla filtros/páginas/descargas, y limpia datos al salir. Las tarjetas solo usan el período. Consulte [Reportes y respaldos](../49-reportes-avisos-respaldos.md).

## public/instructor-settings.js

Editor privado de hasta diez profesores. Recibe reglas, servicios y request autenticado; devuelve element/value/destroy. value no persiste: booking-settings envía revisión y el servidor verifica permisos. alive evita actualizaciones después de desmontar. No cambia citas existentes. Consulte [Calendarios por profesor](../50-calendarios-por-profesor.md).

## public/booking-transfers.js

Asistente por lotes de hasta diez citas seleccionadas. Vista previa, pausa opcional, motivos y resultados. epoch invalida respuestas tras logout; incertidumbre se resuelve desde detalle de agenda. Consulte [Reasignación](../52-deshabilitar-y-reasignar-profesores.md).
