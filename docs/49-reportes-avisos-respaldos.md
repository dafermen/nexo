# Estadísticas, avisos de citas y respaldos — v0.27.0

## Guía para administración

Abra **Administración → Estadísticas y reportes**. El período inicial son los últimos 30 días en la zona horaria del negocio. Puede consultar hasta un año por vez.

- Las tarjetas muestran atenciones iniciadas, consultas, respuestas sin llamada a IA, preguntas pendientes de revisión, citas creadas y sus estados actuales, consultas a IA, tokens registrados y duración promedio de la respuesta.
- También se muestran canales usados, servicios más consultados y estados de avisos administrativos.
- Las tarjetas usan el período. Búsqueda, servicio, estado y canal afectan únicamente a la tabla.
- Elija **Citas**, **Preguntas por revisar** o **Avisos a administradores**. Busque, filtre, ordene desde el encabezado o selector y cambie el tamaño de página a 25, 50 o 100.
- **Descargar CSV filtrado** exporta todos los resultados del filtro, no solo la página. Si supera 10.000 filas, reduzca el período/filtros. El archivo usa UTF-8 y fechas UTC; la pantalla usa la zona del negocio.
- **Mejorar respuestas** abre la cola existente para revisar contexto, descartar o aprobar respuestas. Nexo nunca publica automáticamente una respuesta aprendida de un visitante.

### Cómo interpretar las cifras

Se usan los datos que aún conserva SQLite. La retención puede eliminar conversaciones antiguas y cambiar cifras históricas. “Atenciones” cuenta sesiones iniciadas; no identifica personas únicas. “Consultas” cuenta turnos de mensaje, no eventos de bienvenida. Los canales se cuentan por turno. Los servicios se clasifican por el servicio identificado en la conversación; “General” no implica error.

Las citas son reservas de Google creadas por Nexo; se agrupan por fecha de creación y estado actual, no por fecha de asistencia. Se excluyen citas de la antigua demo. No se calcula una conversión causal ni ingresos: reservar no significa pagar.

Una pregunta revisable es una señal de aclaración, dato pendiente o fallo, no una clasificación perfecta. El criterio es el mismo que utiliza la cola de revisión existente. El catálogo en otros idiomas puede necesitar ampliaciones de detección en futuras evaluaciones. Los tokens corresponden a lo registrado en los turnos; no equivalen a la factura completa de OpenAI/voz/video. La duración promedio usa turnos completados, no la duración total de una llamada.

## Avisos de nuevas citas

Al confirmar por primera vez una reserva contra Google, Nexo registra un aviso por cada correo de `administratorEmails` en la configuración de instalación. En esta instalación son los dos administradores ya configurados. El visitante continúa recibiendo su comprobante por la vía existente.

El aviso incluye servicio, nombre, correo del cliente, inicio/fin, zona horaria y código. No incluye conversación ni credenciales. Se envía un correo individual a cada administrador, sin exponer los demás destinatarios.

El trabajador revisa la cola cada 15 segundos, hasta 10 envíos por lote. No bloquea la respuesta de reserva. La confirmación y la inserción de avisos comparten transacción SQLite. Reintentar la misma reserva no duplica los avisos. No se envían retroactivamente los de citas antiguas ya confirmadas; una cita pendiente que se confirme después sí genera aviso.

| Estado | Significado |
|---|---|
| En cola | Esperando envío; si SMTP falta, permanece guardado. |
| Enviando | Un trabajador reclamó el envío. |
| Aceptado por correo | SMTP aceptó el destinatario; no prueba llegada a bandeja ni lectura. |
| Envío incierto | Falló la comunicación o hubo reinicio durante el envío. No se repite automáticamente. |
| Omitido | La cita ya no estaba confirmada o el destinatario dejó de ser administrador antes de enviar. |

Para un envío incierto, revise el buzón y use **Reintentar aviso**. Se exige confirmación porque el primer correo podría haberse entregado. El reintento queda auditado con la identidad de administración. No puede reintentarse una cita cancelada ni enviarse a un correo arbitrario del navegador. Los cambios en correos de instalación requieren reiniciar el servicio.

## Qué respaldo elegir

| Opción | Uso | Alcance |
|---|---|---|
| CSV | Excel, análisis y reportes | Solo las filas/columnas filtradas; no recupera la aplicación. |
| Descargar respaldo cifrado | Copia manual de datos antes de cambios o para guardar fuera del servidor | Snapshot completo y coherente de SQLite, cifrado con contraseña; extensión `.nexo`. |
| Respaldo diario del VPS | Recuperación completa de datos y conexiones | Proceso existente `nexo-backup.timer`: SQLite, entorno, configuración de instalación y clave externa de Google, cifrados con age. |

En **Respaldos y recuperación**, escriba una contraseña de al menos 12 caracteres dos veces. Guarde el archivo en una ubicación privada y la contraseña por separado. Nexo no conserva ni recupera esa contraseña. El respaldo incluye información personal e información de autenticación cifrada dentro del archivo.

La descarga SQLite no incluye `.env`, `installation.json`, clave externa de Google Calendar, código, modelos ni audios. No sustituye la copia completa del VPS. El respaldo automático completo ya existe; automatizar una segunda copia fuera del VPS y su política de retención continúa pendiente. Evite almacenar descargas solo en el mismo servidor que protege.

### Recuperar una descarga .nexo (técnico)

1. Use una estación privada con Node 24 y el código de Nexo. Conserve una copia de los datos actuales antes de cualquier sustitución.
2. Ejecute en una terminal interactiva: `node scripts/restore-database.js respaldo.nexo recuperado.sqlite`. La ruta de salida debe ser nueva; el script nunca sobrescribe la base activa.
3. Escriba la contraseña oculta. La autenticación GCM detecta archivos alterados y contraseña incorrecta; se verifica `PRAGMA integrity_check`.
4. El script revoca sesiones/códigos administrativos recuperados y marca avisos en cola/enviando como inciertos. Evita reutilizar accesos antiguos o reenviar avisos automáticamente desde un punto anterior.
5. Compruebe la versión de esquema, tablas, reglas y fechas en la base recuperada. Detenga Nexo antes de instalarla; nunca sustituya un SQLite con el proceso abierto ni conserve archivos WAL/SHM de otra base junto a la recuperada. Archive la base anterior y sus auxiliares de forma coordinada.
6. Restaure las claves/configuración externas del respaldo completo o vuelva a autorizar Calendar. Un SQLite anterior no revierte Google: reconcilie reservas con sus eventos antes de habilitar atención y revise avisos pendientes manualmente.
7. Compruebe integridad, claves foráneas, acceso administrativo, disponibilidad y una prueba operativa controlada. Conserve la copia anterior hasta validar.

No hay importación/restauración web sobre los datos activos, para evitar sobrescribir citas mientras el kiosco atiende.

## Recorrido para el desarrollador junior

**Reporte:** formulario → `public/admin-reports.js` → API privada → `reportFilters` valida tipo/rango/columnas → `createReportStore` consulta SQLite con parámetros → JSON/CSV → tabla construida con `textContent`. `generation` ignora respuestas obsoletas tras cambiar filtros o salir.

**Nueva cita:** `BookingService.reserve/verify` comprueba Google → `setBookingStatus` cambia pending a reserved e inserta avisos en la misma transacción → `BookingNotifications` reclama cada aviso → `BookingMailer.sendNewBooking` envía SMTP → estado independiente de la cita. UNIQUE(bookingId,recipient) evita duplicados. Una excepción SMTP nunca cancela la reserva.

**Respaldo:** POST autenticado, origen validado, límite de frecuencia y un respaldo concurrente → API de [backup SQLite de Node](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#sqlitebackupsource-db-path-options) → comprobación de integridad → scrypt con salt aleatorio de 16 bytes, AES-256-GCM con IV de 12 bytes → descarga privada sin caché → eliminación temporal. El encabezado `NEXOBK01` se autentica como AAD; el tag de 16 bytes detecta alteraciones. La contraseña se envía únicamente en el cuerpo por HTTPS en piloto, no en URL/logs/base.

### Contratos y archivos

- `GET /api/admin/reports/summary`: período, tarjetas, canales, temas, configuración de avisos.
- `GET /api/admin/reports`: `type`, `from`, `to`, `q`, `serviceId`, `status`, `channel`, `sort`, `direction`, `limit`, `offset`.
- `GET /api/admin/reports/export`: mismos filtros, CSV completo hasta 10.000 filas, protege celdas interpretables como fórmulas.
- `POST /api/admin/notifications/:id/retry`: `{confirm:true}`; destinatario y cita proceden del servidor.
- `POST /api/admin/backups`: `{password}`; respuesta binaria `.nexo`; máximo un trabajo simultáneo y dos solicitudes por minuto/IP.
- Tabla nueva `booking_notifications`: id, bookingId, recipient, status, attempts, createdAt, updatedAt. Sin contraseñas SMTP.
- `server/admin-reports.js`, `server/booking-notifications.js`, `server/database-backup.js`, `public/admin-reports.js`, `scripts/restore-database.js`.

## Validación y límites

Pruebas automatizadas con datos ficticios: filtros y orden, más de 200 reservas, paginación, conteos, DST, fórmulas CSV, ausencia de secretos en reportes, permisos/origen, idempotencia por destinatario, fallos y reinicios de correo, recuperación de SQLite con WAL, contraseña incorrecta y archivo manipulado. Navegador: móvil, XSS, descargas, filtros/páginas y limpieza al cerrar sesión.

Las pruebas simuladas no demuestran llegada de un correo al buzón real. La comprobación final de entrega se realiza al confirmar una nueva cita autorizada y revisar los buzones de los administradores. No se crean reservas ficticias en Google ni se usa LiveAvatar para validar estos cambios.
