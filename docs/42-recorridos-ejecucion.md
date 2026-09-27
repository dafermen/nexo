# Recorridos de ejecución: cómo interactúan las piezas

Siga un dato de entrada hasta su resultado y observe dónde cambia de forma. Los ejemplos son didácticos; no son instrucciones para crear citas reales ni generar consumo.

## 1. Mensaje escrito: del botón a una respuesta

```text
visitante escribe
  -> sendMessage(text)
  -> ensureSession / consentimiento / POST /api/sessions
  -> ApiClient.request(POST /api/chat)
  -> body + getSession + rateLimit
  -> startConversationTurn (pending)
  -> catálogo actual + FAQ + filtro + orientación
  -> [si corresponde] agenda o interpretación estructurada
  -> [si corresponde] orientación IA con presupuesto
  -> completeConversationTurn
  -> JSON {text, reason, provider, ...}
  -> comprobar generation -> DOM -> speak
```

La primera vez se crea una sesión; las siguientes preguntas reutilizan su token. `originalMessage` conserva la frase del visitante para historial/interpretación; `visitorMessage` adapta expresiones del idioma para reglas locales. No se reemplaza la transcripción visible por texto normalizado.

El registro del turno empieza antes de la respuesta. Si se cancela o falla, se actualiza su `outcome`. Una conversación interrumpida puede aparecer en administración sin respuesta terminada.

## 2. Decisiones ante una pregunta

| Entrada de ejemplo | Camino posible | Resultado esperado |
| --- | --- | --- |
| «Buenos días» | Saludo local | Saludo breve y pregunta útil |
| «¿Cuánto cuesta el curso de cinco horas?» | FAQ/catálogo | Precio vigente o pendiente de confirmar |
| «Lo del cursito de sinco oras» | Interpretación si reglas no bastan | JSON con intención/servicio; respuesta desde catálogo |
| «¿Y cuánto dura?» | Contexto serviceId y hecho duration | Duración del servicio actual o aclaración |
| «El papelito ese» | Aclaración | No adivinar un curso concreto |
| «Programe un videojuego para la escuela» | Desvío de tarea | Redirección local; mencionar escuela no autoriza cualquier tarea |

El filtro modifica `schoolState`; antes de interpretar se conserva `stateBefore` para no arrastrar una selección local errónea. El esquema del modelo restringe IDs e intenciones, y `validateIntent` vuelve a validarlo. La orientación generativa usa instrucciones de alcance y catálogo; no confirma hechos de agenda.

### Presupuesto antes de red

`reserveRequest` comprueba bytes del prompt, consultas de la sesión y contador del día comercial. El cupo se reserva antes de llamar: un fallo de red puede consumir un intento local. Las métricas de tokens dependen del uso devuelto por el proveedor; no representan una factura exacta.

Si se agota el presupuesto, las respuestas locales y fichas siguen disponibles. Una nueva sesión no reinicia el contador diario compartido por la instalación.

## 3. Una llamada por voz

```text
pulsar voz -> preparar AudioContext -> consentimiento
 -> mostrar llamada -> reproducir saludo
 -> CallConversation.startTurn -> BrowserSttProvider.start
 -> onPartial: mostrar texto provisional
 -> onFinal: esperar 900 ms, detener escucha, enviar
 -> respuesta -> speaking -> audio termina
 -> esperar 650 ms -> escuchar otra vez
```

`phase` expresa el paso; `enabled` permite detener automatismo; `revision` invalida un timer viejo. Evitan dobles envíos y escuchas reabiertas después de colgar.

Mientras escribe datos personales, el micrófono queda pausado. Si el reconocimiento no produce una frase final, Nexo pide reactivar o revisar texto; no debe entrar en un ciclo infinito de micrófono.

El modo actual alterna escuchar y hablar. Detectar interrupciones durante la reproducción sería una mejora distinta que exige controlar eco y cancelación.

## 4. De texto a audio reutilizable

1. El chat prepara una respuesta aprobada y `rememberReusable` registra su hash y scope temporalmente.
2. El navegador pide `/api/tts`; el idioma proviene de la sesión.
3. `canReuseAudio` verifica si ese texto puede compartirse.
4. `cacheIdentity` aporta idioma, voz, hablante, modelo, configuración y motor con huellas.
5. `AudioLibrary` combina texto exacto, scope e identidad en una clave.
6. Si hay WAV válido y checksum correcto, lo devuelve y cuenta un hit.
7. Si falta, Piper genera la voz; se guarda temporal, se renombra y se registran metadatos.
8. El navegador decodifica WAV y reproduce; puede calcular amplitud/formas para avatar local.

```text
misma respuesta + mismo idioma + misma voz + contenido vigente
                         -> puede reutilizar WAV
cambio de idioma/voz/modelo/contenido
                         -> clave diferente
```

No se reutiliza audio solo porque dos preguntas se parezcan. Se exige texto autorizado compatible. No se guardan grabaciones del micrófono en esta biblioteca. Datos de citas, códigos y texto libre del modelo no forman parte de la lista aprobada.

`epoch` evita que una generación anterior a «vaciar biblioteca» vuelva a guardar después. La cola serializa índice/archivos; la síntesis ocurre fuera de ella. Piper admite un trabajo simultáneo por instancia y puede devolver ocupado; no existe una granja de síntesis paralela.

## 5. Videollamada

El navegador pide sesión al backend; este usa la clave privada LiveAvatar y devuelve datos temporales de conexión. LiveKit transporta medios. En LITE, Nexo convierte su audio a PCM de 24 kHz y lo transmite por el canal de control. FULL usa otro camino del proveedor.

Colgar o vencer el máximo de 60 segundos debe liberar sesión y medios. `owner` vincula recursos a una sesión; las generaciones descartan eventos atrasados. Documentar o revisar UI no requiere sesiones pagadas.

## 6. Preferencia de agenda versus reserva

Ejemplo: «Quiero clase práctica el martes por la tarde».

1. `agendaCandidate` detecta búsqueda.
2. `parseAgenda` obtiene servicio, fecha y franja; si no basta y hay presupuesto puede interpretar.
3. `validateAgenda` revisa el plan; fechas relativas usan la zona del negocio.
4. `resolveAgenda` pide `BookingService.availability`.
5. `candidateSlots` genera candidatos; eventos Google y bloqueos SQLite descartan ocupados.
6. Se ofrecen hasta tres opciones, recordadas en `state.options`.
7. «La segunda» vuelve a comprobar disponibilidad.
8. Se abre el formulario; todavía no existe reserva.

`weeklyHours` es horario de atención, no garantía de cupos. `schedule` conserva horarios con `available` y `reason`; `slots` contiene solo reservables. Así pueden mostrarse los ocupados deshabilitados.

## 7. Confirmación, incertidumbre y correo

```text
formulario revisado + confirmar
 -> POST /api/appointments con requestId
 -> validar datos/sesión/consentimiento
 -> comprobar servicio, precio y disponibilidad
 -> SQLite: claimBooking -> pending + código
 -> Google: insertar evento con ID y marker propios
 -> comprobar evento -> SQLite: reserved
 -> enviar correo reclamado una sola vez
 -> mostrar cita y mailStatus por separado
```

Si se pierde la respuesta de Google, no se sabe automáticamente si creó el evento. `pending` protege horario e ID. Un reintento con el mismo `requestId` consulta la intención existente. Crear otro identificador para «forzar» éxito puede duplicar citas.

El marcador privado y los extremos del horario se comparan antes de confirmar o eliminar. No borrar un evento sustituido o modificado fuera de Nexo como si aún fuera el original.

Nombre/correo del formulario van a la API de reserva y no se agregan deliberadamente al prompt. Si un visitante escribe datos personales en el chat, forman parte del texto enviado: separar formularios no constituye anonimización general.

## 8. Acceso administrativo

1. `/api/auth/config` informa modo sin secretos.
2. Se solicita código para un correo; `requestCode` aplica límites.
3. Se genera código y salt; se guarda verificador derivado, no código claro.
4. El mailer intenta enviar; HTTP responde de forma genérica para no revelar coincidencia del correo.
5. Al verificar se consume un intento y se compara el verificador.
6. Un código válido se canjea una sola vez por token aleatorio.
7. El servidor entrega cookie HttpOnly y verifica hash/caducidad en rutas administrativas.
8. Salir revoca sesión y limpia pantalla.

La contraseña SMTP permite enviar correo. No es el código temporal de Administración. Vea [configuración de correo](31-sqlite-acceso-correo.md).

## 9. Actualización de conocimiento

Editor FAQ -> leer base/revision -> editar -> guardar con revision -> validar -> persistir nueva revision -> recompilar en siguiente consulta.

La revisión evita sobrescrituras entre ventanas. La cola de consultas permite borrador y publicación aprobada; no entrena automáticamente un modelo, sino que añade conocimiento controlado.

## 10. Cerrar una conversación

`resetSession` limpia campos/DOM, detiene proveedores y aumenta `generation`/`bookingGeneration`. El servidor cierra y cancela trabajo. El historial sigue en SQLite.

Hay relojes distintos: inicio al minuto de inactividad, llamada según silencio, sesión HTTP configurable, video máximo de 60 segundos y acceso administrativo. No trate todas las duraciones como una variable.

## 11. Leer documentación

`docs.js` obtiene catálogo y navega con `#doc=ID`. `documentation.js` resuelve solo archivos permitidos. `docs-renderer.js` convierte Markdown a nodos seguros y enlaces internos. Mermaid se muestra como fuente; estos recorridos usan diagramas de texto legibles sin herramientas adicionales.

El portal no solicita IA, TTS ni video. Sus documentos son públicos para quien pueda abrir la aplicación; no coloque secretos ni conversaciones personales en ellos.
