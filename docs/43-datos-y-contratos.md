# Datos, variables y contratos del desarrollador

Un contrato explica qué recibe una función/API, qué devuelve, qué cambia y cómo comunica errores. Aquí se resumen los contratos actuales; la validación ejecutable permanece en los módulos indicados.

## Convenciones de datos y unidades

| Campo/variable | Tipo y unidad | Uso y cuidado |
| --- | --- | --- |
| serviceId | string | ID estable; no identificar reserva por nombre traducido |
| priceCents | entero o null, centavos | 2500 es 25.00; cero gratis y null pendiente |
| duration de servicio | entero o null, minutos | Audio usa duration en segundos |
| slot / end | string ISO con zona/UTC | Presentar con timezone del negocio |
| timezone | nombre IANA | America/New_York incluye cambios estacionales |
| weeklyHours | siete objetos | day 0 es lunes; open/close HH:mm o ambos null |
| after | entero o null, minutos desde medianoche | Preferencia de hora local en agenda |
| expiresAt / now | número, milisegundos de época | Caducidad; revisar contrato del almacén |
| createdAt | string ISO o número según almacén | No asumir un formato global |
| revision | entero | Versión optimista que se reenvía al editar |
| generation / epoch | entero temporal | Invalida tareas viejas; no es revisión SQLite |
| requestId | UUID | Un intento de reserva y sus reintentos idénticos |
| id de reserva | UUID interno | Deriva el ID del evento Google |
| code | ocho letras, formato AAAA-BBBB | Referencia visible; consulta exige además correo |
| owner / token visitante | string aleatorio | Vincula recursos a sesión; no registrar en logs |
| signal | AbortSignal | Permite cancelar tareas |
| reason / outcome | categorías | Describen procesamiento, no prueba de escucha humana |

## Objetos que cruzan el chat

`/api/chat` recibe `message` de 1–1000 caracteres y `channel` text/voice/video; canales desconocidos se registran como text. El token va en Authorization y el idioma se fijó al crear sesión.

Ejemplo conceptual de decisión local antes de serializar HTTP:

```json
{
  "kind": "local",
  "reason": "catalog",
  "text": "Precio pendiente de confirmar con el personal."
}
```

`kind: "ai"` permite continuar a orientación; `interpret: true` solicita interpretar ambigüedad si configuración/presupuesto lo permiten; `catalogOnly` limita a opciones locales. No toda decisión tiene todos los campos.

La respuesta HTTP final contiene `text`, `provider`, `reason`, `catalogOnly` y opcionalmente `bookingAction` o `agenda`. `provider: "openai"` puede indicar que solo la interpretación usó IA y la frase final se armó localmente.

`schoolState` conserva servicio, último hecho, hechos pendientes, desvíos, orientación y aclaración cuando corresponden. `agendaState` conserva fecha, franja, hora mínima y opciones. Son temporales, no fichas de alumnos.

## Rutas principales del visitante

| Método y ruta | Entrada | Salida / efecto |
| --- | --- | --- |
| GET /api/health | Sin cuerpo | Estado y proveedor |
| GET /api/config | Sin cuerpo | Configuración pública y canales |
| GET /api/services | Sin cuerpo | Servicios activos |
| POST /api/sessions | consent=true, channel, language | 201 con token; crea sesión e historial |
| POST /api/chat | Bearer, message, channel | Texto y acciones opcionales |
| POST /api/tts | Bearer, text de 1–3000 caracteres | WAV base64, duration en segundos, provider |
| POST /api/session/greeting | Bearer, channel | Registra saludo una vez |
| POST /api/session/touch | Bearer | Renueva atención vigente |
| DELETE /api/session | Bearer, reason opcional en URL | Cierra y cancela recursos |
| GET /api/avatar/config | Sin cuerpo | Estado seguro de video y voz |
| POST /api/avatar/session | Bearer y opciones | Sesión de video; puede consumir créditos |
| DELETE /api/avatar/session | Bearer | Intenta detener video remoto |
| GET /api/services/:id/slots | Bearer en agenda real | slots, schedule, timezone |
| POST /api/appointments | Formulario revisado y consentimiento | 201 confirmada o 202 pending |
| POST /api/appointments/lookup | Bearer, id (código/ID antiguo), email | Resultado verificado o error |

Crear cita requiere `customerName`, `email`, `serviceId`, `slot`, `requestId`, `expectedPriceCents` y `consent`. El servidor aporta moneda, duración, estado, sessionHash e idioma desde fuentes propias. No confía en la disponibilidad mostrada previamente por el navegador.

## Administración y documentación

| Familia | Responsabilidad | Acceso |
| --- | --- | --- |
| /api/auth/config, request, verify, session, logout | Código y cookie | Reglas específicas de autenticación |
| /api/admin/overview | Negocio, servicios, citas, conocimiento | Administración |
| /api/admin/configuration | Parámetros con revision | Administración |
| /api/admin/center y services | Perfil y catálogo | Administración |
| /api/admin/knowledge | FAQ activa | Administración |
| /api/admin/reviews | Cola y revisión | Administración |
| /api/admin/conversations | Páginas, métricas y exportación | Administración |
| /api/admin/calendar | OAuth, selección, pruebas, reglas y verificación | Administración |
| /api/admin/audio-library | GET estado; DELETE vaciado | Administración |
| /api/docs/catalog, document, assets | Contenido permitido | Lectura pública GET |
| /api/calendar/oauth/callback | Retorno Google | state, binding y PKCE |

Para parámetros/métodos particulares lea `server/app.js`: esta tabla agrupa familias, no autoriza cualquier método. El portal no sirve archivos privados elegidos por el cliente.

## Errores que debe tratar la interfaz

| Estado | Significado habitual | Respuesta útil |
| --- | --- | --- |
| 400 | Dato/esquema inválido | Corregir entrada |
| 401 | Sesión vencida/inexistente | Nueva atención o acceso |
| 403 | Origen/permiso no permitido | Revisar autorización |
| 404 | Recurso no encontrado/no permitido | No inventar resultado |
| 409 | Revisión, horario u operación en conflicto | Leer motivo; recargar o verificar |
| 413 / 415 | Tamaño/tipo de cuerpo incorrecto | Ajustar petición |
| 429 | Límite alcanzado | Esperar o seguir con opciones locales |
| 502 / 503 | Proveedor inválido/no disponible | Alternativa; conservar incertidumbre tras escritura |

Las rutas suelen devolver `{ "error": "mensaje" }` ante fallo controlado. Un error HTTP no prueba que Google no creó un evento: se reconcilia el ID persistido.

## SQLite por responsabilidad

| Tablas | Módulo | Datos |
| --- | --- | --- |
| center_settings | db + center | Perfil, catálogo activo, configuración y revisiones |
| services, appointments | db | Catálogo/turnos de demo base |
| ai_daily_usage | db | Consultas y tokens por día |
| audit_events | db y almacenes | Acción y entidad |
| administrators, admin_challenges, admin_sessions, auth_limits | admin-store | Identidad, verificadores y límites |
| knowledge_bases | admin-store + sqlite-faq | FAQ activa y revision |
| conversations, conversation_turns | conversation-store | Mensajes, canal, motivo, resultado y métricas |
| answer_reviews | review-store | Revisión humana de un turno |
| google_calendar_connection, google_calendar_tests | calendar-store | Tokens cifrados, selección y pruebas |
| booking_settings, calendar_bookings | booking-store | Reglas e intenciones/eventos |
| booking_codes, booking_receipts | booking-store | Código visible y envío |
| audio_library, audio_library_metrics | audio-store | Metadatos y uso de WAV |

`CREATE TABLE IF NOT EXISTS` permite arranques repetidos; no sustituye futuras migraciones complejas. Las columnas JSON contienen documentos estructurados; saltarse validadores puede romper reglas aunque SQLite acepte el texto.

### Transacciones y límites

`BEGIN IMMEDIATE` reserva escritura local; `COMMIT` confirma y `ROLLBACK` revierte. Los parámetros `?` separan SQL y valores. No concatene datos del visitante dentro de sentencias SQL.

Una transacción SQLite no incluye Google ni SMTP. Se guarda intención local y se verifica el resultado externo. `exclusive` evita simultaneidad dentro de una instancia Calendar; no es bloqueo distribuido entre varios servidores.

La limpieza de `appointments` de la demo y la retención del historial no implican borrado automático de `calendar_bookings`. Revise políticas antes de prometer conservación/borrado a un cliente.

## Configuración y recursos

| Archivo/carpeta | Uso | Edición |
| --- | --- | --- |
| .env | Claves, proveedor y límites del despliegue | Privada; reiniciar tras cambio |
| .env.example | Ajustes de ejemplo | Nunca incluir secretos |
| config/installation.json | administratorEmails (o administratorEmail anterior), administratorLogin, mail | SMTP_PASSWORD pertenece al entorno |
| conocimiento/preguntas-frecuentes.txt | Semilla FAQ | No reemplaza SQLite ya importada |
| scripts/multilingual-voices.json | file, url, sha256 | Mantener identidad y verificación juntas |
| package.json | Dependencias, scripts, versión | Sincronizar lock si cambian dependencias |
| docs/project-status.json | Fases/tareas/evidencia | Fuente del tablero |
| public/assets | Imágenes y modelos | Revisar procedencia/licencias |
| public/vendor | Bibliotecas externas | No tratarlas como código propio |
| data/kiosk.sqlite | Base activa por defecto | No editar manualmente la base del cliente |
| data/audio-cache | WAV privados por defecto | Vaciar biblioteca desde Administración |
| .local/google-calendar.key | Clave de cifrado por defecto | Necesaria con respaldo OAuth; no publicar |
| runtime | Piper y voces | Instaladores verifican descargas |

La configuración persistida de negocio prevalece sobre valores iniciales. Cambiar `OPENAI_MODEL` en entorno no sustituye necesariamente el modelo ya guardado: `app.js` usa primero el valor vigente de settings.

## Contrato de biblioteca de audio

La clave reúne schema, scope, texto exacto, idioma e identidad. La fila guarda key, checksum, bytes, duration, generationMs, language, createdAt y lastUsed. El formato actual es WAV mono PCM16 a 22050 Hz; cambiarlo exige adaptar validador e identidad.

`hits` son reutilizaciones, `misses` búsquedas elegibles sin audio, `bypasses` síntesis sin reutilización, `errors` problemas de caché y `savedMs` estima tiempo de generación evitado. No equivalen directamente a dólares ahorrados.

## Agenda administrativa (v0.26.0)

Las tablas aditivas `booking_sync` y `booking_cancellations` conservan la última comprobación y los intentos de cancelación con motivo, actor y resultado. La ruta PATCH de cancelación exige `reason`; no admite borrado definitivo. Filtros, límites y contrato están en el [manual de agenda](48-agenda-administrativa.md).

## Reportes, avisos y respaldo (v0.27.0)

Consulte la [guía de estadísticas, avisos y recuperación](49-reportes-avisos-respaldos.md), con flujos, contratos, estados de correo, alcance de las métricas y restauración paso a paso.
