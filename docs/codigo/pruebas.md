# Referencia: Pruebas automatizadas y fixtures

Contratos del código propio de Nexo. Consulte primero el [mapa de código](../41-mapa-codigo-fuente.md) y el [manual junior](../23-manual-desarrollador-junior.md). Las firmas orientan la lectura; el cuerpo y sus validaciones son la autoridad ejecutable.

## tests/admin-access.e2e.js

E2E de navegador de admin access.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `node:path`, `../server/db.js`, `../server/app.js`, `../server/sqlite-faq.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
async sendCode(v)
close()
status()
stop()
close()
status()
async stop()
async close()
```

## tests/admin-access.test.js

Pruebas unitarias y de integración de admin access.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `node:fs`, `node:os`, `node:path`, `node:sqlite`, `../server/db.js`, `../server/admin-auth.js`, `../server/providers/admin-mail.js`, `../server/installation.js`, `../server/sqlite-faq.js`, `../server/app.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
directory(t)
fixture(t, options={})
async sendCode(message)
close()
now()
advance(ms)
now()
async code(address=email)
async sendMail(v)
close()
async apiFixture(t)
async reply()
async sendCode(v)
close()
status()
close()
stop()
status()
async close()
async stop()
async request(path, method='GET', body, cookie='', headers={})
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- correo válido produce un código de un uso y sesión protegida
- dirección ajena no envía correo ni revela si existe
- cinco fallos bloquean incluso el código correcto
- código vencido a los diez minutos no autentica
- nuevo código invalida el anterior y limita reenvíos
- dos verificaciones simultáneas consumen el código solo una vez
- sesión vence por inactividad y logout revoca inmediatamente
- sesión tiene vencimiento absoluto aunque haya actividad
- fallo de SMTP no crea código verificable ni anuncia entrega
- SQLite guarda verificadores, conserva sesión y límites al reiniciar
- cambiar administrador invalida accesos anteriores
- límite de cinco correos por hora persiste
- configuración y correo no exponen credenciales ni permiten direcciones inválidas
- SMTP requiere TLS, desactiva logs y rechaza entrega no aceptada
- FAQ importa una sola vez y SQLite conserva edición sin archivo original
- API: cookie autoriza, Bearer anterior se rechaza, logout revoca
- API: FAQ exige acceso, valida formato y evita conflictos de revisión

## tests/admin.e2e.js

E2E de navegador de admin.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `node:path`, `../server/db.js`, `../server/app.js`, `../server/center.js`, `../server/providers/ai.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
status()
stop()
close()
```

## tests/agenda-conversation.test.js

Pruebas unitarias y de integración de agenda conversation.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `../server/agenda-conversation.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
parse(message, state={})
resolve(plan, state, availability=async()=>({slots}))
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- fecha local y preferencias: mañana día, mañana franja y hora ambigua
- agenda recuerda día/servicio, ofrece tres horas reales y revalida la segunda sin reservar
- hora ambigua conserva el umbral al aclarar tarde; no confunde cambiar de día con resolver hora
- servicio no reservable, fecha pasada, sin cupos, error y memoria aislada
- esquema rechaza IDs/fechas/horas/opciones falsos; no acepta campos arbitrarios

## tests/api.test.js

Pruebas unitarias y de integración de api.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:crypto`, `node:events`, `../server/app.js`, `../server/db.js`, `../server/providers/ai.js`, `../server/config.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async fixture(t, overrides = {})
async request(path, { method = 'GET', body, token, headers = {} } = {})
async session()
booking(slot = repository.slots('orientacion')[0])
status(headers)
status()
async start(owner, options)
async stop(owner)
async close()
async reply(input)
async fetchImpl(url, options)
async json()
async fetchImpl()
async fetchImpl()
async json()
async reply(input)
async fetchImpl(_url, options)
async json()
editable(s)
async reply(input)
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- catálogo y configuración pública no exponen secretos
- proxy HTTPS acepta solo el origen configurado y conserva protección de Host
- API de avatar exige sesión y no publica credenciales
- voz local exige sesión, limita texto y protege runtime
- API de avatar transmite propietario y finalización local solicita cierre remoto
- la página usa CSP y el servidor no publica archivos privados
- rechaza origen y Host ajenos
- sesión exige consentimiento y conversación exige token
- modo demo es explícito y el chat no genera reservas
- sesiones aisladas e historial controlado por el servidor
- finalizar revoca el token y no permite reutilizar historial
- una sesión vencida no puede renovarse
- validación de mensajes y tamaño de solicitud
- reserva exige consentimiento, correo válido y precio del catálogo
- reserva persiste, cobra cero y reintento es idempotente
- reutilizar una clave de reserva con otros datos falla
- dos reservas concurrentes no ocupan el mismo horario
- horarios inventados y servicios pausados no aceptan reservas
- admin protege datos, cancela y libera horario
- admin desactivada sin secreto configurado
- reintentar una reserva cancelada no la presenta como activa
- reservas sobreviven al cierre y reapertura de una base en disco
- limita ráfagas de creación de sesión
- purga elimina reservas después de la fecha más retención
- IA real usa Responses, no almacena y extrae solo texto del asistente
- errores del proveedor no filtran credenciales ni simulan éxito
- configuración rechaza IA real incompleta y proveedor inválido
- perfil de escuela publica datos reales y nunca horarios de la agenda demo
- escuela pasa identidad y catálogo a la IA y no inventa turnos en modo demo
- OpenAI recibe límites comerciales y trato de usted, sin reglas contradictorias de demo
- administración persiste precio y requisitos; kiosco y siguiente respuesta reciben cambios
- horarios guardados se reflejan en la IA; rechaza valores inválidos y cambios en la conexión
- nuevo servicio conserva precio pendiente y dos editores no se sobrescriben
- configuración de escuela sobrevive al cierre de SQLite sin modificar la demo histórica

## tests/audio-library.e2e.js

E2E de navegador de audio library.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs/promises`, `node:os`, `node:path`, `../server/db.js`, `../server/app.js`, `../server/center.js`, `../server/providers/local-tts.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
async cacheIdentity(language)
async synthesize()
stop()
close()
status()
async start()
async stop()
async close()
start()
abort()
```

## tests/audio-library.test.js

Pruebas unitarias y de integración de audio library.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:fs/promises`, `node:os`, `node:path`, `node:events`, `../server/db.js`, `../server/audio-library.js`, `../server/audio-policy.js`, `../server/providers/local-tts.js`, `../server/app.js`, `../server/center.js`, `../server/config.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async fixture(t, options={})
status()
async cacheIdentity(lang)
async synthesize()
stop()
close()
now()
closeFirst(fn)
calls()
setVoice(v)
advance(ms)
now()
now()
async cacheIdentity()
async reply()
status()
async stop()
async close()
async req(path, body, token, method=body?'POST':'GET')
async session()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- audio compartido persiste en SQLite y WAV sin guardar el texto ni el visitante
- texto, idioma, voz y revisión comercial nunca reutilizan el audio anterior
- presupuesto elimina primero el menos usado y caducidad elimina audios antiguos
- archivo corrupto o perdido se regenera, huérfanos se limpian al iniciar
- política no confía en texto arbitrario, IA libre, citas o identificadores personales
- bypass, falta de identidad, disco no utilizable y desactivación mantienen la voz
- cancelación y vaciado durante generación no guardan resultados tardíos
- API solo comparte respuestas aprobadas por el servidor y protege administración y archivos
- configuración acota tamaño, caducidad y activación sin modificar credenciales

## tests/auto-call.e2e.js

E2E de navegador de auto call.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `../server/app.js`, `../server/db.js`, `../server/center.js`, `../server/providers/local-tts.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
stop()
close()
async synthesize()
status()
start()
async stop()
async close()
Recognition.start()
Recognition.abort()
async begin()
listening()
```

## tests/auto-conversation.test.js

Pruebas unitarias y de integración de auto conversation.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `../public/call-conversation.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
setup()
listen()
stopListening()
async send(text)
paused(text)
setTimeout(fn, ms)
clearTimeout(id)
async tick()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- al iniciar llamada espera el saludo y escucha sin pulsar el micrófono
- pausar o colgar durante el saludo impide la primera escucha
- envía solo texto final una vez y espera al fin de la respuesta para reabrir
- seguir hablando cancela la frase pendiente, y pausa evita envíos tardíos
- cerrar mientras habla o espera cancela la reapertura automática
- sin una frase completa se pausa y no gasta consultas
- texto o replay interrumpen una transcripción pendiente

## tests/booking-code.test.js

Pruebas unitarias y de integración de booking code.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:sqlite`, `../server/booking-store.js`, `../server/booking-code.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
record(id, slot='2026-09-28T12:00:00Z')
generateCode()
generateCode()
generateCode()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- códigos aleatorios de ocho letras sin caracteres ambiguos; normalización flexible
- migración de reservas anteriores es persistente, mantiene UUID y datos y resuelve colisiones
- reserva nueva recibe código único; agotamiento de colisiones revierte la reserva

## tests/booking.e2e.js

E2E de navegador de booking.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `../server/providers/local-tts.js`, `node:module`, `node:fs`, `node:path`, `../server/app.js`, `../server/booking.js`, `../server/center.js`, `./calendar-fixture.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async sendConfirmation(value)
close()
async reply()
status()
stop()
close()
async synthesize()
status()
async start()
async stop()
async close()
Recognition.start()
Recognition.abort()
key(char)
Socket.constructor()
Socket.addEventListener(n, fn)
Socket.emit(e)
Socket.send(text)
Socket.close()
Room.on(n, fn)
async Room.connect()
Room.attach(el)
Room.attach()
async Room.startAudio()
async Room.disconnect()
async say(text)
```

## tests/booking.test.js

Pruebas unitarias y de integración de booking.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:crypto`, `node:events`, `../server/booking.js`, `../server/center.js`, `./calendar-fixture.js`, `../server/app.js`, `../server/providers/booking-mail.js`, `../server/booking-intent.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async fixture(t)
now()
input(slot)
make(now)
async reply()
status()
stop()
close()
status()
async stop()
async close()
async req(path, method='GET', body, token)
async sendConfirmation(value)
async sendConfirmation()
async sendMail(value)
async reply()
status()
stop()
close()
status()
async stop()
async close()
async request(path, data, token)
async interpret({preparedRequest})
async reply()
status()
stop()
close()
status()
async stop()
async close()
async request(path, data, token)
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- horarios respetan duración, semana, anticipación, cierre y DST Nueva York
- eventos de todo el día y cambios DST bloquean su intervalo completo; transparentes/cancelados no
- disponibilidad excluye intervalos solapados, días completos y no expone citas
- reserva confirmada es idempotente, privada, sin correos y bloquea la hora
- dos reservas simultáneas nunca insertan dos eventos en la misma hora
- creación incierta mantiene el horario protegido y verificar no vuelve a insertar
- no inventa disponibilidad ni acepta precio, horario o servicio alterado
- cancelación no borra eventos modificados ni crea copias
- API de reservas exige sesión, consentimiento y administración; no revela PII ni secretos
- correo de confirmación se envía solo una vez, después de confirmar y separado del estado de la cita
- fallo o envío SMTP incierto no cancela la cita ni se reenvía automáticamente
- consulta exige correo y referencia completos y consulta el evento real del proveedor
- plantilla de correo incluye fecha local y código corto, sin invitaciones ni credenciales
- intenciones de voz abren formularios sin crear citas y respetan negación
- horarios visibles incluyen pasados y anticipación pero nunca se ofrecen para reservar
- API agenda: texto/voz comparten preferencias, sesiones aisladas y no crea eventos por conversar
- agenda semántica reutiliza la cuota de OpenAI y valida el plan antes de consultar

## tests/browser.e2e.js

E2E de navegador de browser.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:fs/promises`, `node:module`, `../server/app.js`, `../server/db.js`, `../server/providers/ai.js`, `../server/providers/local-tts.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
status()
stop()
close()
async synthesize(text)
pass(label)
MockUtterance.constructor(text)
cancel()
getVoices()
speak(u)
MockRecognition.start()
MockRecognition.abort()
```

## tests/calendar-fixture.js

Crear un servidor y repositorio de pruebas de Calendar compartidos.

- **Entrada:** Dependencias y respuestas simuladas definidas en el fixture.
- **Salida:** Entorno aislado reutilizable por pruebas de interfaz.
- **Estado importante:** El fixture registra peticiones para comprobar efectos sin crear citas reales.
- **Efectos y límites:** No representa una conexión OAuth real; cerrar recursos al terminar la prueba.

**Dependencias directas:** `node:crypto`, `../server/db.js`, `../server/providers/google-calendar.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
calendarFixture({repo=createRepository(':memory:'),key=randomBytes(32)}={})
result(data, status=200)
async fetchImpl(url, options={})
now()
async authorize()
advance(ms)
```

## tests/calendar.e2e.js

E2E de navegador de calendar.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `node:path`, `../server/app.js`, `../server/center.js`, `./calendar-fixture.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
stop()
close()
status()
async stop()
async close()
```

## tests/conversations.e2e.js

E2E de navegador de conversations.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `node:path`, `../server/db.js`, `../server/app.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
stop()
close()
status()
async stop()
async close()
```

## tests/conversations.test.js

Pruebas unitarias y de integración de conversations.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `node:fs`, `node:path`, `node:os`, `../server/db.js`, `../server/app.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async fixture(t, {center=schoolCenter,ai}={})
async reply()
status()
stop()
close()
status()
async stop()
async close()
async req(path, {method='GET',token='',body}={})
async session(channel='text')
chat(token, message, channel='text')
async reply()
async reply()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- historial conserva texto y voz tras limpiar sesión; token visitante nunca permite leerlo
- métricas registran IA y tokens reportados; dos visitantes quedan separados
- saludo por voz se registra una vez y no acepta texto inventado del cliente
- errores quedan registrados sin exponer diagnósticos ni inventar respuesta
- exportación protegida descarga texto íntegro a través de páginas de registros
- SQLite conserva historial al reabrir y marca interrupciones del servidor
- conservación es indefinida por defecto y purga configurada elimina también sus mensajes
- cancelar una consulta en curso registra cancelación y no añade respuesta tardía

## tests/dialogue.test.js

Pruebas unitarias y de integración de dialogue.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:fs`, `node:events`, `../server/faq.js`, `../server/school-filter.js`, `../server/center.js`, `../server/app.js`, `../server/db.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
decide(message, state={}, knowledge=faq)
noInternal(text)
tie(question)
async reply()
async start()
async stop()
async close()
async request(path, method, body, token)
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- interés y nombre del curso orientan y mantienen el servicio sin IA
- saludos breves con o sin FAQ no repiten presentación ni pierden contexto
- empates de FAQ conservan datos y ofrecen aclaraciones útiles
- una ficha FAQ no interrumpe la aclaración de precio o duración
- API resuelve el recorrido saludo, interés y seguimiento sin llamadas a IA ni avatar

## tests/docs.e2e.js

E2E de navegador de docs.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `node:path`, `../server/db.js`, `../server/app.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
reply()
status()
stop()
close()
async close()
```

## tests/documentation.test.js

Pruebas unitarias y de integración de documentation.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:fs/promises`, `node:os`, `node:path`, `node:events`, `../server/documentation.js`, `../server/app.js`, `../server/db.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async fixture(t)
reply()
stop()
close()
async close()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- Documentation discovers only supported project documentation and safe images
- Documentation rejects paths, malformed IDs and unknown IDs
- Documentation refreshes additions and handles removed documents
- Documentation does not traverse directory links to another project
- Documentation rejects a docs root that points outside Nexo
- Documentation HTTP routes are read-only and do not call paid providers
- Nexo project board has valid phases, unique tasks and document evidence

## tests/faq.test.js

Pruebas unitarias y de integración de faq.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:fs`, `node:os`, `node:path`, `node:events`, `../server/faq.js`, `../server/school-filter.js`, `../server/center.js`, `../server/app.js`, `../server/db.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
decide(message, state={}, services=catalog, k=faq)
async reply()
async call(path, method, token, body)
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- base inicial válida y saludos naturales no consumen IA ni alteran contexto
- plantillas consultan precios actuales y mantienen nulo, cero y contexto
- sin coincidencia suficiente no inventa equivalencias y nunca omite negaciones
- respuestas desactivadas y servicios pausados no se publican
- coincidencias ambiguas piden aclaración
- valida IDs, campos, parámetros y líneas sin ejecutar plantillas
- archivo se recarga y conserva la última versión válida ante errores o desaparición
- permite 5000 temas con índice y rechaza 5001
- API integra FAQ antes de IA, mantiene filtro y devuelve estado solo al administrador

## tests/filter-live.e2e.js

E2E de navegador de filter live.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Esta prueba es optativa y puede llamar una API real: leer sus condiciones antes de ejecutarla. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:module`, `node:process`, `node:fs`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async metrics()
Recognition.start()
Recognition.abort()
async ask(question, expected, {first=false,voice=false}={})
```

## tests/filter-regressions.test.js

Pruebas unitarias y de integración de filter regressions.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `../server/school-filter.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
ask(message, state={})
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- continúa precio al cambiar explícitamente de servicio
- recuerda la pregunta pendiente después de pedir qué servicio
- no hereda el precio de un servicio para un seguro ajeno al catálogo
- atiende preguntas con dos datos conocidos
- variantes habladas consultan datos, no repiten la descripción
- entrada adversaria con mayúsculas, tildes, unicode y tema mezclado no llega a IA
- rechazo no cambia el servicio; servicios simultáneos piden aclaración
- precios, requisitos, horario, agenda y pago siguen disponibles tras dos desvíos

## tests/filter.e2e.js

E2E de navegador de filter.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `../server/app.js`, `../server/db.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply(input)
status()
stop()
close()
async ask(text, first=false)
```

## tests/filter.test.js

Pruebas unitarias y de integración de filter.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `node:fs`, `node:os`, `node:path`, `../server/school-filter.js`, `../server/center.js`, `../server/db.js`, `../server/app.js`, `../server/config.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
decide(message, state={}, services=catalog)
async fixture(t, {limits={},fail=false}={})
async reply(input)
async request(path, body, token)
async session()
chat(token, message)
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- preguntas de catálogo, contexto y datos desconocidos no necesitan IA
- saludos, agenda, pagos y horario son respuestas locales sin prometer reservas
- detecta desvíos e instrucciones engañosas incluso con vocabulario de la escuela
- orientación pertinente permite IA, preguntas desconocidas piden aclaración
- API filtra antes del proveedor y aísla contexto por visitante
- tope por atención no bloquea catálogo; nuevas sesiones comparten el límite diario
- solicitudes simultáneas y fallos no eluden el cupo
- contexto excesivo no llega al proveedor ni consume el contador
- contador persiste al reabrir y el día usa Nueva York incluido cambio de hora

## tests/google-calendar.test.js

Pruebas unitarias y de integración de google calendar.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `node:fs`, `node:os`, `node:path`, `../server/app.js`, `../server/db.js`, `../server/providers/google-calendar.js`, `../server/center.js`, `../server/config.js`, `./calendar-fixture.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
fixture(t)
async reply()
status()
close()
stop()
status()
async stop()
async close()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- Calendar sin credenciales informa pendiente y nunca consulta Google
- OAuth usa estado, PKCE, permisos limitados, vinculación de navegador y un único uso
- OAuth vencido, cancelado o con permisos parciales no conecta
- calendarios paginados y nombres repetidos conservan ID; solo lectura rechazado
- lectura usa exclusivamente calendario seleccionado y no devuelve datos de citas
- prueba crea, lee y elimina solo evento propio; sin invitados ni bloqueo
- fallo de limpieza queda persistido y se puede recuperar sin crear duplicados
- respuesta incierta después de insertar mantiene identificación para limpiar
- nunca elimina un evento cuyo marcador no corresponde a Nexo
- renueva token caducado, reintenta 401 una vez y no filtra errores de Google
- desconectar revoca autorización y elimina tokens locales incluso si Google falla
- autorización retirada exige reconectar y conserva prueba pendiente para recuperación
- creación incierta ausente espera antes de confirmar limpieza
- no permite cambiar calendario ni desconectar durante una prueba en curso
- cifrado y calendario seleccionado sobreviven reinicio con clave local; otra clave falla
- configuración deriva retorno local y rechaza otro origen o ruta
- API protege operaciones, callback requiere cookie vinculada y público no ve credenciales

## tests/guidance-review.e2e.js

E2E de navegador de guidance review.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `../server/app.js`, `../server/db.js`, `../server/center.js`, `../server/sqlite-faq.js`, `../server/providers/local-tts.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
stop()
close()
async synthesize()
status()
async stop()
async close()
Recognition.start()
Recognition.abort()
listen()
```

## tests/guidance-review.test.js

Pruebas unitarias y de integración de guidance review.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `../server/db.js`, `../server/app.js`, `../server/center.js`, `../server/sqlite-faq.js`, `../server/service-guidance.js`, `../server/faq.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async fixture(t)
async reply()
status()
stop()
close()
status()
async stop()
async close()
async req(path, token='', method='GET', body)
async session()
chat(token, message, channel='text')
run(message, services=schoolServices, center=schoolCenter)
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- orientación por voz conserva respuesta, usa catálogo y no crea reservas
- orientación no inventa requisitos ni recomienda servicios inactivos o de otro negocio
- revisión requiere administrador y conserva borrador sin publicarlo
- publicación rechaza formato inyectado, pregunta duplicada y conserva transacción
- señales distinguen orientación normal, dudas, datos pendientes y repetición

## tests/home-reset.e2e.js

E2E de navegador de home reset.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `node:path`, `../server/db.js`, `../server/app.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
close()
stop()
status()
async stop()
async close()
async send(text)
```

## tests/intent-live.e2e.js

E2E de navegador de intent live.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Esta prueba es optativa y puede llamar una API real: leer sus condiciones antes de ejecutarla. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:process`, `node:fs`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async request(path, method='GET', body, token)
```

## tests/intent.e2e.js

E2E de navegador de intent.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `../server/app.js`, `../server/db.js`, `../server/center.js`, `../server/faq.js`, `../server/providers/local-tts.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
async interpret({preparedRequest})
status()
stop()
close()
async synthesize(text)
status()
async start()
async stop()
async close()
Recognition.start()
Recognition.abort()
listening()
```

## tests/intent.test.js

Pruebas unitarias y de integración de intent.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `../server/school-filter.js`, `../server/school-intent.js`, `../server/providers/ai.js`, `../server/app.js`, `../server/db.js`, `../server/faq.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
school(intent, serviceId=null, facts=[])
unclear(clarification)
ask(interpretation)
provider(payload)
async fetchImpl(_url, options)
async json()
payload(text)
async fixture(t, {interpret=()=>unclear('service'),limits={},fail=false}={})
async interpret(input)
async reply(input)
async request(path, method, body, token)
async session()
chat(token, message)
close(token)
interpret()
interpret(input)
interpret()
interpret()
interpret(input)
async interpret(_input, {signal})
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- expresiones regionales y palabras incidentales son candidatas, no desvíos
- petición estructurada solo permite IDs activos e intenciones limitadas
- valida estructura, coherencia e IDs antes de utilizar la interpretación
- respuesta usa catálogo vigente y no inventa precio, modalidad ni turnos
- documento ambiguo pide aclaración sin sanción ni heredar un precio anterior
- adaptador usa Responses estructurado y maneja rechazo, truncado y JSON inválido
- API interpreta una vez, responde precio local y conserva seguimiento y saludos
- aclaración y su respuesta usan contexto temporal aislado por visitante
- interpretación y orientación comparten límite por sesión, catálogo sigue disponible
- límite diario reserva antes de llamadas concurrentes y fallos no devuelven cupo
- payload grande no consume y salida inválida no modifica contexto ni expone texto
- dudas y rechazos del modelo no sancionan; dos desvíos locales claros restringen IA
- servicio no publicado no deja un precio heredado ni sanciona al visitante
- el nombre de un servicio no agrega hechos que el visitante no pidió
- cancelación interrumpe la interpretación y no entrega una respuesta tardía

## tests/kiosk-home.e2e.js

E2E de navegador de kiosk home.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `../server/app.js`, `../server/center.js`, `../server/booking.js`, `./calendar-fixture.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
stop()
close()
status()
async stop()
async close()
```

## tests/languages.e2e.js

E2E de navegador de languages.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `../server/providers/local-tts.js`, `../server/faq.js`, `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `../server/app.js`, `../server/center.js`, `../server/booking.js`, `./calendar-fixture.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
async synthesize(text, opts)
stop()
close()
status()
async start()
async stop()
async close()
start()
abort()
```

## tests/languages.test.js

Pruebas unitarias y de integración de languages.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `node:stream`, `../server/app.js`, `../server/db.js`, `../server/center.js`, `../server/languages.js`, `../public/i18n.js`, `../server/providers/ai.js`, `../server/providers/local-tts.js`, `../public/providers/speech.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply(input)
status()
async synthesize(text, opts)
stop()
close()
status()
async start(owner, opts)
async stop()
async close()
async request(path, body, token)
spawnImpl(...input)
constructor()
start()
abort()
onPartial()
onFinal()
onError()
onEnd()
async sendMail(value)
async availability()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- traducciones completas, nombres y cifras conservados
- alias reconocen frases completas sin ocultar instrucciones ajenas
- el prompt conserva límites comerciales y el idioma solicitado
- API conserva idioma de sesión, originales en historial y límites
- Piper y reconocimiento eligen el idioma sin mezclar voces
- confirmación por correo respeta idioma, dirección, código y zona sin enviar mensajes
- preferencias multilingües consultan fechas en su idioma sin confirmar citas

## tests/live-avatar-lite.test.js

Pruebas unitarias y de integración de live avatar lite.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `../public/providers/avatar-audio.js`, `../public/providers/live-avatar-lite.js`, `../public/providers/live-avatar.js`, `../server/providers/live-avatar.js`, `../server/providers/local-tts.js`, `../server/config.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
wav(rate = 22050, seconds = 1)
Socket.addEventListener(name, handler)
Socket.emit(event)
Socket.send(text)
Socket.close()
createSocket()
createSocket()
service(t, overrides = {}, ws = 'wss://control.liveavatar.com/session')
async fetchImpl(url, request)
async json()
client(t, tts)
Room.on(name, handler)
async Room.connect()
Room.attach()
Room.attach()
async Room.startAudio()
async Room.disconnect()
media()
async play()
pause()
async request(url, request)
add()
remove()
setAttribute()
async loadSdk()
createSocket()
async cleanupFetch()
tick()
onStart()
onEnd()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- PCM LITE conserva duración y amplitud al convertir 22050/44100 a 24000 Hz
- voz rechaza WAV truncado y formatos estéreo
- LITE espera estado conectado y transmite PCM en bloques más speak_end
- LITE cancelado no envía voz y desconectar resuelve una conexión pendiente
- servidor LITE no requiere voz remota y oculta credenciales permanentes
- visitante no puede habilitar créditos con parámetros del navegador
- LITE rechaza control externo y cierra la sesión asignada
- LITE acepta el host HeyGen observado y mantiene el máximo de un minuto
- LITE rechaza imitaciones del host HeyGen, puertos y conexiones sin TLS
- configuración permite origen HTTPS exacto y limita duración del piloto
- adaptador LITE sintetiza texto, correlaciona habla e interrupción y libera sesión
- cancelar TTS impide envío tardío de audio a LiveAvatar

## tests/live-avatar.e2e.js

E2E de navegador de live avatar.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:path`, `node:fs`, `node:assert/strict`, `node:events`, `node:module`, `node:url`, `../server/app.js`, `../server/db.js`, `../server/providers/ai.js`, `../server/providers/local-tts.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
status()
async start(owner, options)
async stop(owner)
async close()
status()
stop()
close()
async synthesize(text)
Socket.constructor()
Socket.addEventListener(name, fn)
Socket.emit(event)
Socket.send(text)
Socket.close()
Room.on(name, fn)
async Room.connect()
Room.paint()
Room.attach(el)
Room.attach()
async Room.startAudio()
async Room.disconnect()
async assertCallFits()
```

## tests/live-avatar.test.js

Pruebas unitarias y de integración de live avatar.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `../server/providers/live-avatar.js`, `../public/providers/live-avatar.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
ok(data)
async json()
serviceFixture(t, override)
async fetchImpl(url, request)
async fetchImpl()
clientFixture(t)
Room.constructor()
async Room.publishData(data, options)
Room.on(event, handler)
async Room.connect()
Room.attach()
Room.attach()
async Room.startAudio()
async Room.disconnect()
mediaElement()
async play()
pause()
async request()
add(name)
remove(name)
setAttribute()
async loadSdk()
async cleanupFetch(url, options)
onStatus(state)
emit(event)
onStart()
onEnd()
onStart()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- avatar sin cuenta informa requisitos y no llama servicios externos
- avatar exige consentimiento y modo válido
- sesión de recepcionista es acotada y solo devuelve token de sala
- sandbox es explícito y usa únicamente el avatar técnico documentado
- no abre dos sesiones y otra sesión local no puede detener el video
- error al iniciar intenta cerrar la sesión remota conocida
- cancelar durante creación no deja iniciar un video tardío
- no conecta a una URL ajena devuelta por el proveedor
- cierre remoto fallido mantiene bloqueo y reporta cierre pendiente
- reproductor espera medios y envía exactamente speak_text sin usar otro agente
- detener limpia medios, silencia y descarta eventos de habla antiguos

## tests/local-avatar.e2e.js

E2E de navegador de local avatar.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:module`, `node:url`, `node:events`, `../server/app.js`, `../server/db.js`, `../server/providers/ai.js`, `../server/providers/local-tts.js`.

## tests/local-tts.test.js

Pruebas unitarias y de integración de local tts.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `node:stream`, `../server/providers/local-tts.js`, `../public/providers/local-speech.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
fixture()
spawnImpl(...args)
child()
args()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- PCM local contiene cabecera WAV y duración correctas
- Piper recibe texto solo por stdin, usa voz femenina y no abre un shell
- cancelar voz mata el proceso, descarta resultado tardío y aísla propietario
- voz limita concurrencia y comunica instalación ausente
- fallo de Piper no devuelve audio ni filtra diagnósticos internos
- formas españolas cubren vocales y cierre de labios con tiempos monotónicos
- labios mezclan formas continuas en lugar de saltar al cambiar de sonido
- un pico de volumen se suaviza y una pausa termina con boca en reposo

## tests/microphone.test.js

Pruebas unitarias y de integración de microphone.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `../public/providers/speech.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
fixture()
Recognition.constructor()
Recognition.start()
Recognition.abort()
setTimeout(fn, delay)
clearTimeout(id)
onStart()
onEnd()
onError(message)
onPartial()
onFinal()
instance()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- micrófono solo confirma escucha cuando el navegador confirma inicio
- fallo network aborta escucha inmediatamente aunque no llegue onend
- silencio del proveedor termina con un aviso y no deja micrófono activo
- finalización del navegador y cierre manual limpian temporizadores

## tests/settings.e2e.js

E2E de navegador de settings.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `node:path`, `../server/app.js`, `../server/db.js`, `../server/center.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async reply()
status()
stop()
close()
status()
async start()
async stop()
async close()
```

## tests/settings.test.js

Pruebas unitarias y de integración de settings.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `node:events`, `node:fs`, `node:os`, `node:path`, `../server/app.js`, `../server/db.js`, `../server/center.js`, `../server/business-settings.js`, `../server/config.js`, `../server/faq.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
async fixture(t)
async reply(input)
async interpret(input)
status()
close()
stop(id)
status()
async start()
async stop()
async close()
async request(path, method='GET', body, token=admin)
async get()
async save(state)
async session()
chat(token, message)
generic(state)
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- configuración protegida: no expone claves y rechaza cambios no autorizados
- validación rechaza límites, URLs, zonas, plantillas y FAQ de otra actividad
- migración conserva datos y configuración sobrevive al reinicio y ediciones de catálogo
- cambiar de actividad pausa catálogo, cambia moneda sin convertir y evita respuestas escolares
- FAQ propias y catálogo genérico responden localmente y conservan parámetros
- guardado invalida sesiones, aplica inactividad y bloquea video desde API
- configuración impide sobrescritura desde dos editores
- IA genérica usa modelo, alcance y cuota configurados sin instrucciones escolares
- desactivar interpretación evita llamadas ambiguas sin desactivar catálogo
- teclado táctil opcional conserva configuración anterior y valida booleanos

## tests/speech.test.js

Pruebas unitarias y de integración de speech.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:test`, `node:assert/strict`, `../public/providers/speech.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
Recognition.constructor()
Recognition.start()
Recognition.abort()
onPartial(x)
onFinal(x)
onError(x)
onEnd()
Recognition.constructor()
Recognition.start()
Recognition.abort()
onPartial()
onFinal()
onEnd()
onError(x)
constructor(text)
getVoices()
cancel()
speak(value)
onStart()
onEnd()
onError(e)
Recognition.constructor()
Recognition.start()
Recognition.abort()
onPartial(text)
onFinal(text)
onError()
onEnd()
```

### Escenarios comprobados

Los nombres se conservan como aparecen en la suite para poder encontrarlos en su salida:

- STT transcribe parciales y finales y descarta callbacks de sesiones anteriores
- STT traduce permiso denegado a un error utilizable
- TTS selecciona voz española y cancela callbacks al terminar sesión
- sin APIs de voz conserva fallback explícito
- STT no confirma una frase mientras todavía contiene un fragmento parcial

## tests/voice-call.e2e.js

E2E de navegador de voice call.

- **Entrada:** Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
- **Salida:** Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
- **Estado importante:** fixture prepara escenario; assert compara resultado esperado; limpieza de recursos evita contaminación entre casos.
- **Efectos y límites:** Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles aíslan servicios externos. No usar la base de producción como fixture.

**Dependencias directas:** `node:assert/strict`, `node:events`, `node:module`, `node:fs`, `node:path`, `../server/app.js`, `../server/db.js`, `../server/center.js`, `../server/providers/ai.js`, `../server/providers/local-tts.js`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
status()
async start()
async stop()
async close()
status()
stop()
close()
async synthesize(text)
Recognition.start()
Recognition.abort()
```

## tests/pilot-security.test.js

**Propósito:** Probar acceso, cuotas, proxy y configuración segura.

- **Entra:** SQLite temporal, HTTP local y dobles.
- **Sale:** Aserciones automáticas y limpieza de fixtures.
- **Estado y efectos:** No envía correo ni consume servicios de pago.

## tests/pilot.e2e.js

**Propósito:** validar el flujo de acceso en navegador HTTPS.

- **Entra:** certificado temporal de QA y Playwright; SQLite y correo simulados.
- **Sale:** aserciones y capturas desktop/móvil.
- **Efectos:** proxy local efímero, ingreso, administrador, documentos privados y cierre; no carga credenciales reales ni llama proveedores pagados.

## tests/admin-agenda.test.js

SQLite en memoria y Google simulado: permisos/origen, búsqueda literal, paginación, DST, motivo, auditoría y rechazo de eventos modificados o versiones concurrentes. Verifica que un fallo no libera horarios ni expone tokens/marcadores.

## tests/admin-agenda.e2e.js

Playwright con fixture Calendar: listado/día/semana, filtros, detalle, disponibilidad, motivo obligatorio, error remoto, móvil, texto no ejecutable y vaciado al salir. Genera capturas locales `.local/agenda-qa`; no modifica datos de producción.

## tests/admin-reports.test.js

Pruebas de reportes, cola SMTP simulada, seguridad y recuperación cifrada con SQLite real. No llama proveedores externos. Consulte [Reportes y respaldos](../49-reportes-avisos-respaldos.md).

## tests/admin-reports.e2e.js

Prueba navegador aislado: orden, filtros, paginación, CSV, respaldo, móvil, XSS y cierre de sesión. Consulte [Reportes y respaldos](../49-reportes-avisos-respaldos.md).

## tests/instructors-fixture.js

Construye cinco calendarios, cuenta autorizada simulada, SQLite y BookingService. now permite reloj fijo o real para navegador. Cada evento se aísla por calendario; flags permite fallo de lectura. close libera recursos. No usa datos reales. Consulte [Calendarios por profesor](../50-calendarios-por-profesor.md).

## tests/instructors.test.js

Comprueba capacidad, elección explícita, conflictos, permisos, solapamientos, idempotencia y citas antiguas. API real contra Google simulado y SQLite aislado. No produce correo ni eventos externos. Consulte [Calendarios por profesor](../50-calendarios-por-profesor.md).

## tests/instructors.e2e.js

Navegador con proveedores simulados: cupos, profesor obligatorio, confirmación/consulta, configuración, duplicados y móvil. Capturas en .local/instructors-screenshots. PLAYWRIGHT_MODULE y BROWSER_CHANNEL permiten elegir navegador instalado. Consulte [Calendarios por profesor](../50-calendarios-por-profesor.md).

## tests/booking-transfers.test.js

Verifica restricciones SQLite, permisos, idempotencia, carreras, cambios externos y fallos de red/marca. Calendar simulado, sin citas reales. Consulte [Reasignación](../52-deshabilitar-y-reasignar-profesores.md).

## tests/booking-transfers.e2e.js

Navegador con calendarios simulados: conflictos, pausa, selección, traslado, recuperación y privacidad al salir. Capturas locales en .local/transfers-qa. Consulte [Reasignación](../52-deshabilitar-y-reasignar-profesores.md).

### Pruebas del piloto — actualización v0.31.0

[Contrato y recorrido de PILOT_PRIVATE_ENABLED, PILOT_PASSWORD y PILOT_PASSWORD_HASH](../53-configurar-acceso-piloto.md). Incluye separación entre barrera y protecciones del VPS, prioridad de claves, pruebas aisladas y verificación pública sin consumo.

## tests/mogollon-offer.test.js

Entrada, salida, propósito y límites en la cabecera del módulo. [Recorrido explicado, catálogo aprobado y validación](../54-catalogo-voz-agenda.md).

## tests/agenda-voice.e2e.js

Entrada, salida, propósito y límites en la cabecera del módulo. [Recorrido explicado, catálogo aprobado y validación](../54-catalogo-voz-agenda.md).

## tests/faq-editor.test.js

Casos de categorías, compatibilidad con texto, inyección de bloques, datos dinámicos, autorización, ausencia de escrituras durante vista previa y conflictos de revisión. API real sobre SQLite en memoria.

## tests/faq-editor.e2e.js

Navegador con escuela ficticia: crear, buscar por categoría, previsualizar, guardar, pausar, alternar texto, conflicto entre administradores, XSS, ancho móvil y limpieza al cerrar. No correos, citas ni proveedores reales. SCREENSHOT_DIR opcional genera una captura didáctica.
