# Manual del desarrollador junior

Aprenda a leer, ejecutar y modificar Nexo siguiendo una conversación completa, desde el botón del kiosco hasta SQLite y los proveedores. Esta guía describe el código actual; los documentos históricos 01–15 conservan decisiones de etapas anteriores.

## 1. Qué está construyendo

Nexo es una aplicación web para atender visitantes de un negocio. La pantalla permite conversar por texto, voz o video, consultar servicios y completar reservas. El navegador presenta la experiencia; un servidor local valida las solicitudes y controla los datos y las integraciones.

Una instalación corresponde a un negocio. La configuración permite adaptarlo a otro cliente, pero todavía no existe aislamiento de múltiples negocios dentro de una misma instalación.

| Capa | Tecnología del proyecto | Responsabilidad |
| --- | --- | --- |
| Interfaz | HTML, CSS y JavaScript con módulos | Pantallas, micrófono, reproducción, formularios y accesibilidad |
| Servidor | Node.js 24+, HTTP nativo | Sesiones, validación, reglas y coordinación de proveedores |
| Datos | SQLite con `node:sqlite` | Configuración, catálogo, FAQ, reservas, historial y métricas |
| IA | Adaptador demo u OpenAI | Interpretar ambigüedad u orientar dentro del alcance permitido |
| Voz | Web Speech para entrada; Piper local para salida | Transcribir y reproducir respuestas |
| Video | LiveAvatar; alternativa de avatar local | Representación visual del asistente |
| Agenda/correo | Google Calendar y SMTP con Nodemailer | Eventos de citas y mensajes de confirmación/acceso |

No hay React, Express ni un proceso obligatorio de compilación de interfaz. El servidor entrega los archivos de `public/`. Que el sitio funcione en localhost no significa que todas sus funciones sean sin internet: reconocimiento del navegador, IA, Calendar, SMTP y LiveAvatar pueden depender de red.

## 2. Ruta de aprendizaje

Lea en este orden y mantenga abierto el archivo real en su editor:

1. Esta guía: vocabulario, ejecución y un cambio pequeño.
2. [Mapa del código fuente](41-mapa-codigo-fuente.md): dónde vive cada responsabilidad.
3. [Recorridos de ejecución](42-recorridos-ejecucion.md): conversación, voz, reserva, autenticación y audio.
4. [Datos y contratos](43-datos-y-contratos.md): entradas/salidas, unidades, API y persistencia.
5. [Prácticas y mantenimiento](44-practicas-desarrollo.md): ejercicios, depuración y pruebas.
6. Referencia de cada archivo desde el mapa: propósito, estado, efectos y firmas de sus funciones.

No empiece intentando memorizar `public/app.js` o `server/app.js`. Son los coordinadores más grandes. Primero comprenda `public/api.js`, `public/call-conversation.js` y una función pequeña como `normalizeBookingCode`.

## 3. Preparar el entorno

La ubicación activa es `C:\Projects\Nexo`. Las copias anteriores son respaldos; ejecutar una copia antigua puede mostrar otra interfaz o leer otra configuración.

En una terminal del proyecto:

```powershell
cd C:\Projects\Nexo
node --version
npm ci
npm run check
npm test
npm start
```

`npm ci` instala las versiones fijadas por `package-lock.json` y requiere acceso al registro si no están en caché. `npm start` carga `.env` y ejecuta `server/index.js`. Si Nexo ya ocupa el puerto 3000, utilice esa instancia o deténgala de forma controlada antes de iniciar otra. `INICIAR.cmd` es el acceso de Windows para el mismo arranque.

En una instalación nueva, copie `.env.example` a `.env` **solo si `.env` no existe** y complete los ajustes necesarios. No sobrescriba la configuración activa para hacer ejercicios. Para pruebas automatizadas use las bases temporales y los proveedores inyectados que ya incluyen los tests.

Abra `http://localhost:3000/` y el [portal de documentación](00-inicio.md). Administración está en `/admin`; configuración en `/settings`; las respuestas frecuentes en `/knowledge`. El servidor escucha en la máquina local. El despliegue para otro dispositivo requiere el trabajo de red/HTTPS descrito en [operación](26-manual-operacion.md).

## 4. Aprender a leer JavaScript en este proyecto

### Objetos y desestructuración

```js
const { token, session } = getSession(req);
```

`getSession` devuelve un objeto. Las llaves extraen dos propiedades: el identificador temporal y el estado de esa atención. No son credenciales de OpenAI ni acceso administrativo.

```js
const next = { ...current, active: false };
```

`...current` copia propiedades a un objeto nuevo; `active` reemplaza esa propiedad. Es una copia superficial: los objetos internos continúan compartidos salvo que también se copien. Para recordar un contexto sin mutarlo por accidente, el chat utiliza `structuredClone`.

### Funciones, métodos y callbacks

Una función transforma datos o produce un efecto. Un método es una función dentro de un objeto/clase. Un callback es una función que otro componente ejecutará al ocurrir un evento.

```js
const api = new ApiClient();
const result = await api.request('/api/services');
```

`new` crea una instancia. `request` es un método. `result` contiene el JSON del catálogo, no el objeto HTTP crudo.

`onFinal`, `onEnd` y `onError` son callbacks. El proveedor de voz decide cuándo llamarlos; la interfaz decide qué hacer cuando ocurren. Así se puede cambiar el proveedor sin reescribir todo el kiosco.

### Promesas, await y cancelación

Una función `async` devuelve una promesa. `await` permite continuar cuando llega su resultado; mientras tanto pueden ocurrir otros eventos, como cerrar la llamada. Por eso se comprueba la generación después de esperar:

```js
const epoch = generation;
const result = await api.request('/api/chat', options);
if (epoch !== generation) return;
```

Este fragmento ilustra el patrón de `sendMessage`: si inició otra conversación, el resultado viejo no debe aparecer. `AbortController` intenta detener el trabajo; la comparación de generaciones además impide usar resultados que llegaron tarde.

`try/catch/finally` separa éxito, error y limpieza. `finally` libera `busy`, temporizadores o listeners aunque haya un fallo. No quite esa limpieza para ocultar un error.

### DOM y datos externos

El DOM es el árbol de elementos de la página. `document.getElementById('message')` encuentra un control. `textContent` muestra texto; `innerHTML` interpreta etiquetas. Nexo usa nodos y `textContent` para datos del visitante. Los pocos fragmentos HTML de iconos provienen de una lista local controlada.

`data-*` guarda estado de presentación; `aria-*` comunica ese estado a tecnologías de asistencia. Una opción deshabilitada visualmente sigue necesitando validación en servidor.

### Valores que no son equivalentes

| Valor | Significado en Nexo |
| --- | --- |
| `null` en precio | No se confirmó ese precio |
| `0` en precio | Servicio sin costo |
| `undefined` | Propiedad no proporcionada; depende del contrato si es admisible |
| `false` | Opción explícitamente desactivada |
| `[]` | Lista vacía; no demuestra por sí misma una consulta de red exitosa |
| `pending` | Resultado todavía no confirmado; no presentar como reserva exitosa |

Los comentarios de módulo incluyen entradas, salidas, estado y efectos. Los contratos de las funciones centrales añaden la firma real y el resultado esperado. Los ayudantes pequeños también aparecen por firma en la referencia de su archivo; lea su cuerpo junto al contrato del módulo.

## 5. Seguir el arranque

1. `server/index.js` llama `readConfig`: valida variables y lee instalación administrativa.
2. `createRepository` abre SQLite y crea tablas que falten; no borra la base para arrancar.
3. Se recuperan conversaciones interrumpidas y se aplican limpiezas configuradas.
4. `SqliteFaqRepository.refresh` importa la semilla únicamente si falta la base de conocimiento.
5. `createAiProvider` elige demo u OpenAI.
6. `createApp` conecta repositorio, proveedores y rutas HTTP.
7. El servidor escucha; la página carga módulos y solicita configuración pública/catálogo.

La configuración privada completa nunca se entrega al navegador. `/api/config` construye una respuesta pública específica.

## 6. Seguir una pregunta completa

Ejemplo: «¿Cuánto cuesta el curso de las cinco horas?».

1. Texto escrito y voz transcrita terminan en `sendMessage`.
2. `ensureSession` garantiza consentimiento y un token visitante vigente.
3. `ApiClient.request` envía `/api/chat` con mensaje y canal.
4. El servidor valida JSON, longitud, sesión y límite de frecuencia.
5. Registra el inicio del turno y obtiene el catálogo actual.
6. `filterSchoolMessage` intenta reconocer el servicio/hecho; las FAQ pueden responder con parámetros vigentes.
7. Si falta un precio, responde que está pendiente; no interpreta `null` como gratuito.
8. Si debe interpretar una frase ambigua, solicita JSON al modelo y valida el resultado antes de resolverlo con hechos locales.
9. Guarda respuesta, motivo, uso y duración; devuelve texto y posibles acciones de interfaz.
10. El navegador verifica que la sesión siga vigente, muestra la respuesta y puede reproducirla.

La orientación generativa es otra rama con sus propios límites. No todas las respuestas consumen IA, y una interpretación consumida puede terminar en una respuesta redactada localmente. Vea el [recorrido detallado](42-recorridos-ejecucion.md).

## 7. Memoria, persistencia y fuentes de verdad

| Dato | Dónde vive | Qué ocurre al terminar una atención |
| --- | --- | --- |
| Texto del formulario, estado visual | Memoria/DOM del navegador | Se limpia al reiniciar atención |
| Token y contexto conversacional | Memoria del servidor | Se invalidan al cerrar o vencer |
| Historial de preguntas/respuestas | SQLite | Permanece según política de retención |
| Negocio, catálogo y FAQ activas | SQLite | Permanecen para siguientes visitantes |
| Evento confirmado | Google Calendar y registro local | Terminar la conversación no lo cancela |
| Contraseñas de proveedor | Entorno privado del servidor | No aparecen en UI ni documentación pública |
| Audio genérico reutilizable | WAV privado + índice SQLite | Puede servir a otra sesión compatible |

Con perfil comercial activo, `centerRepository` obtiene catálogo desde `center_settings`; el catálogo de demostración base no es la fuente comercial vigente. Hay dos caminos históricos de reservas: `appointments` de la demo y `calendar_bookings` para Google. No mezcle sus métodos.

### Preguntas frecuentes: dónde editar hoy

Use **Administración → Respuestas frecuentes**. El contenido activo se guarda en `knowledge_bases` de SQLite y se recompila cuando cambia la revisión. `conocimiento/preguntas-frecuentes.txt` es la semilla de una instalación nueva; editarla después no reemplaza la base activa.

También existe el modo de respuestas propias en Configuración. `knowledgeMode` decide si se usa la base de la escuela, texto propio o ninguna. El nombre interno `file` se conserva por compatibilidad, aunque el arranque actual entrega un repositorio SQLite para esa base.

Los parámetros `{{servicio.precio}}` se resuelven con datos del catálogo; no ponga importes contradictorios en texto fijo. Revise [la guía FAQ](21-preguntas-frecuentes.md) y [SQLite/acceso](31-sqlite-acceso-correo.md).

## 8. Entender las llamadas y los idiomas

`CallConversation` tiene fases de escucha, espera, envío, respuesta y pausa. Solo envía una transcripción final. Detiene el micrófono mientras suena la respuesta y al abrir el formulario de reserva. El modo automático es conversación por turnos: no promete escuchar interrupciones simultáneas como una llamada humana de doble vía.

La llamada por voz usa una imagen y Piper local. La videollamada agrega LiveAvatar y su costo/tiempo de sesión. La biblioteca de audio puede evitar repetir síntesis compatible, pero no evita pagar tiempo de LiveAvatar ni una consulta de IA necesaria para una pregunta nueva.

Español, inglés y francés comparten reglas y datos comerciales. Cambiar idioma reinicia atención; el idioma queda asociado a la sesión del servidor. `i18n.js` y `language-ui.js` cubren interfaz/frases; `languages.js` adapta entradas para reglas locales. Un texto comercial nuevo no queda perfectamente traducido por el hecho de añadirlo al catálogo.

## 9. Reservar requiere confirmación

El asistente puede entender día/franja, consultar disponibilidad y ofrecer hasta tres opciones. Elegir «la segunda» abre el formulario con ese horario. El visitante escribe nombre/correo, revisa y confirma.

`BookingService` vuelve a comprobar disponibilidad y precio, registra `pending` y crea un evento identificable. Solo un resultado verificado cambia a `reserved`. Un fallo de red puede dejar una operación incierta: se consulta el mismo evento, no se crea otra reserva con un nuevo identificador.

El correo tiene estado separado (`sent`, `uncertain`, etc.). Una cita puede existir aunque no se reciba el correo. Consulte [reservas](34-reservas-calendar.md), [agenda conversacional](36-agenda-conversacional.md) y [contratos](43-datos-y-contratos.md).

## 10. Su primera mejora

Ejercicio recomendado: añadir una variante de pregunta frecuente en una instalación de prueba.

1. Localice el servicio y compruebe que los hechos están aprobados.
2. Abra el editor de respuestas frecuentes y agregue otra línea `pregunta:` al tema correspondiente.
3. Mantenga una sola respuesta y sus parámetros de catálogo.
4. Guarde; si otra ventana cambió la revisión, recargue antes de editar nuevamente.
5. Pregunte por texto y compruebe el resultado y motivo en historial.
6. Pruebe voz con el mismo texto; no necesita abrir LiveAvatar.
7. Anote el caso y agregue una prueba si introdujo una regla nueva en código.

Para aprender JavaScript sin tocar datos comerciales, practique primero con una función pura y datos inventados en los ejercicios de [mantenimiento](44-practicas-desarrollo.md).

## 11. Verificar y depurar

```powershell
npm run check
npm run docs:check
npm test
npm run test:docs
```

`check` revisa sintaxis; `docs:check` comprueba cobertura documental y enlaces de la ruta educativa; `test` ejecuta pruebas unitarias/integración. Los E2E requieren Playwright y un navegador instalado, y pueden configurarse mediante `PLAYWRIGHT_MODULE` y `BROWSER_CHANNEL` según su entorno. Consulte [pruebas](27-metodologia-y-plantillas.md).

No ejecute pruebas cuyo nombre incluye `live` pensando que son siempre simulaciones: lea primero sus variables de activación. Los E2E normales de video usan dobles; conserve el máximo de 60 segundos en pruebas reales autorizadas.

| Síntoma | Por dónde empezar |
| --- | --- |
| No aparece un cambio visual | Verificar carpeta activa, URL y servidor; recargar y revisar consola del navegador |
| Micrófono activo sin texto | Permisos, dispositivo y eventos/error de `BrowserSttProvider`; puede fallar su servicio de red |
| Responde sobre otro servicio | Revisar `schoolState.serviceId`, `pendingFacts`, decisión local y validación de intención |
| No oye una respuesta | Disponibilidad de Piper/idioma, `/api/tts`, desbloqueo de AudioContext y cancelación |
| FAQ nueva no aparece | Editor/base activa, revision, knowledgeMode y estado de compilación |
| Cita no aparece | Estado pending/reserved, calendario seleccionado y verificación del evento |
| Guardar devuelve 409 | Revisión antigua, horario ocupado u operación concurrente; leer mensaje antes de reintentar |

Nunca use un volcado completo de `.env`, cookies, tokens o filas personales como diagnóstico compartido. Registre estado/código y datos ficticios suficientes para reproducir.

## 12. Cómo continuar sin romper la separación

Una mejora debe tener un lugar claro: presentación en `public/`, regla de negocio en `server/`, persistencia en un almacén y conexión externa en `providers/`. Mantenga los contratos aunque cambie la implementación.

Antes de entregar, compruebe la función solicitada, errores y cancelación relevantes; actualice comentarios y referencias afectadas; registre la tarea en `docs/project-status.json` con evidencia. El [manual GitHub](24-manual-github.md) explica ramas, revisiones y entrega. No publique credenciales, datos locales ni modelos/runtime generados.

## Del desarrollo local al VPS (v0.25.0)

`DEPLOYMENT_MODE=pilot` activa barreras antes del router. Siga una solicitud así: Caddy valida HTTPS y sobrescribe IP/protocolo → `requestContext` valida host, proxy y origen → `PilotAccess` comprueba la cookie del participante → la ruta exige sesión visitante o administrador según corresponda → el proveedor se ejecuta dentro de sus límites. El acceso privado no reemplaza los permisos de administración.

`readConfig` falla al iniciar si faltan dominio, hash del piloto, correo o retención; no degrada silenciosamente a una instalación pública. `provider_daily_usage` reserva intentos de video en SQLite; reiniciar no recupera ese cupo. La voz usa rutas inyectables para Windows/Linux y el caché distingue `engineVersion`. Los secretos no pertenecen al frontend ni al paquete.

Para practicar: ejecute `tests/pilot-security.test.js`, observe los rechazos antes de llamar al proveedor y lea `deploy/nexo.service`. El sistema operativo también protege la aplicación: el proceso nexo no es root y solo puede escribir sus datos. [Instalación, prueba y recuperación](45-despliegue-piloto-linux.md) · [Alcance de seguridad](46-seguridad-piloto.md).

## Reportes, avisos y respaldo (v0.27.0)

Consulte la [guía de estadísticas, avisos y recuperación](49-reportes-avisos-respaldos.md), con flujos, contratos, estados de correo, alcance de las métricas y restauración paso a paso.


## Calendarios por profesor — v0.28.0

[Elección del alumno, cupos, configuración y recorrido del código](50-calendarios-por-profesor.md). Incluye compatibilidad con la agenda única y conservación del calendario de cada cita. El acceso del personal se reúne en Administración.


## Operación de profesores — v0.29.0

[Nombre sugerido desde Calendar, filtro por profesor e historial, pruebas y pendientes vigentes](51-operacion-profesores-y-pendientes.md). El nombre puede corregirse; las citas conservan su asignación original.


## Deshabilitar y reasignar — v0.30.0

[Manual de traslado de citas entre profesores](52-deshabilitar-y-reasignar-profesores.md): vista previa, conflictos, pausa opcional, historial y recuperación. Mantiene día/hora/código; no mueve citas existentes al configurar profesores.

## Acceso privado configurable — v0.31.0

[Activar o desactivar el piloto y asignar su clave](53-configurar-acceso-piloto.md). El VPS conserva `DEPLOYMENT_MODE=pilot`; `PILOT_PRIVATE_ENABLED` controla solamente la entrada de participantes.

## Actualización v0.32.0

[Catálogo aprobado, regreso desde otra aplicación y reserva por hora exacta](54-catalogo-voz-agenda.md).

## Recorrido nuevo: editar una respuesta

Consulte la [guía ilustrada del editor visual y GitHub](55-editor-visual-github.md). Explica desde el formulario hasta SQLite, cómo se resuelven los precios y cómo validar un cambio antes de publicarlo.

## Actualizaciones comerciales

La [guía del curso y libro](56-curso-libro-contenido.md) muestra cómo separar datos comerciales, FAQ y código. Evite constantes de precios/horarios en el agente: utilice campos del catálogo y parámetros. Los despliegues no deben volver a sembrar ni sobrescribir SQLite.
