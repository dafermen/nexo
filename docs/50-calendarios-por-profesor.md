# Agenda con elección de profesor — v0.28.0

El alumno elige entre los profesores disponibles para su horario. Cada profesor representa un cupo y tiene un calendario de Google independiente. El piloto puede seguir usando el calendario único «Mogollon Method» hasta que se configuren los calendarios reales.

## Acceso del personal

En el kiosco, abra **Ayuda y opciones → Acceso del personal → Administración**. Desde Administración se accede a Configuración y Documentación. La operación diaria y los parámetros siguen separados dentro del mismo acceso protegido; los enlaces antiguos `/settings` y `/docs` continúan funcionando.

## Preparación y configuración

1. Cree en Google Calendar un calendario por profesor. Si pertenece a otra cuenta, compártalo con la cuenta conectada a Nexo, con permiso para modificar eventos, y añádalo a su lista de calendarios. Esta versión utiliza una conexión Google común; no necesita iniciar una sesión OAuth por profesor.
2. Entre a **Administración → Configuración → Conexiones → Reservas desde el kiosco**.
3. Mantenga los servicios reservables y su duración correcta. El horario general se configura en Negocio.
4. En «Organización de la agenda» elija **Calendarios por profesor · el alumno elige**.
5. Añada nombre público, calendario, servicios que imparte y disponibilidad para nuevas reservas. Máximo diez profesores; no se permite repetir un calendario. Cada servicio habilitado debe tener al menos un profesor activo que lo imparta.
6. Pulse «Guardar reglas de reservas». Se comprueban permisos sin crear eventos. Recargue el kiosco o espere su actualización cuando esté inactivo.

El calendario base se conserva para el modo de agenda única. En modo profesores las nuevas citas se guardan exclusivamente en el calendario del profesor elegido. No se duplican en el calendario base.

Para ausencias, descansos o vacaciones, cree eventos **ocupados** en el calendario correspondiente, incluso de día completo. Los eventos marcados como libres no bloquean clases. Todos los profesores utilizan el horario general del negocio; los horarios individuales recurrentes, sedes, vehículos y equipos compartidos quedan para otra etapa.

## Experiencia del alumno

1. Elige servicio, día y hora. La hora muestra cuántos cupos quedan; las horas sin cupos permanecen deshabilitadas.
2. Selecciona profesor entre los disponibles en esa hora. Si solo hay uno, aparece preseleccionado para su revisión; si hay varios, debe elegir.
3. Escribe nombre y correo, acepta el tratamiento de datos, revisa y confirma.
4. Nexo vuelve a consultar disponibilidad. Si el profesor dejó de estar libre, solicita elegir de nuevo; nunca cambia a otro silenciosamente.
5. La confirmación, la consulta posterior, el correo y la agenda administrativa muestran el profesor elegido.

En voz o video se utiliza el mismo formulario. La conversación puede preparar servicio/día/hora; el alumno selecciona al profesor y escribe sus datos en pantalla mientras el micrófono está pausado. No se envían estos datos del formulario al modelo.

### Ejemplo de capacidad

| Situación a las 9:00 | Cupos ofrecidos |
|---|---:|
| Cinco profesores activos, libres y habilitados para la clase | 5 |
| Cuatro reservas, una en cada profesor | 1 |
| Reserva del último profesor libre | 0 |
| Cancelación confirmada de una de esas citas | 1 |

El cálculo revisa el intervalo completo de la clase. Una ocupación de 9:30 a 10:30 impide ofrecer una clase de 9:00 a 10:00 para ese profesor. El mismo profesor tampoco puede recibir simultáneamente reservas de servicios diferentes.

## Cambios y citas existentes

- Pausar o quitar un profesor evita nuevas reservas; no cancela ni mueve las anteriores.
- Renombrarlo cambia el nombre para nuevas citas. Cada reserva conserva el nombre y calendario originales para seguimiento.
- Volver al modo único tampoco mueve eventos antiguos. Conserve acceso a todos los calendarios con citas pendientes: consultar/cancelar usa el calendario guardado en cada reserva.
- Cancelar mantiene el historial y solo libera el cupo cuando se confirma la cancelación. Una inserción incierta permanece «En verificación» y protege ese profesor.
- Si uno de los calendarios necesarios no se puede leer, no se presenta como libre. El administrador debe restaurar acceso o pausar ese profesor.

## Para el desarrollador junior

### Datos y contratos

`booking_settings.document` conserva las reglas anteriores y añade `assignment` (`single` o `instructors`) e `instructors[]`. Cada profesor guarda `id`, `name`, `calendarId`, `active`, `serviceIds`. Si una instalación antigua no tiene estos campos, se interpreta como agenda única. No hay una migración destructiva de datos.

`instructorId(calendarId)` genera un identificador estable abreviado con SHA-256. Sirve para referenciar la elección, no como credencial ni como anonimización criptográfica de un correo conocido. La respuesta pública solo incluye ID y nombre del profesor, nunca el ID/correo del calendario, OAuth o datos de otras citas.

`GET /api/services/:id/slots` mantiene `slots[]`, `schedule[]` y `timezone`. Cada horario añade `remaining`, `capacity` y, en modo profesores, `instructorIds[]` disponibles. La respuesta incluye `instructors: [{id,name}]`; cuando no hay horarios candidatos puede omitirse este catálogo. La voz continúa usando el contrato existente de horarios.

`POST /api/appointments` añade `instructorId`. El servidor lo contrasta con reglas y disponibilidad; no acepta del cliente un nombre/calendario que cambie la asignación. En modo profesores omitir o falsificar la elección produce error. `requestId` también vincula la elección: repetir la petición no crea otra cita ni permite cambiar de profesor.

La reserva almacena `calendarId`, `instructorId` e `instructorName` como fotografía de la asignación. El resultado público añade `instructorName`; verificar y cancelar siguen usando el `calendarId` de esa reserva, nunca el calendario seleccionado actualmente.

### Recorrido del código

1. `public/instructor-settings.js` construye el editor privado; `value()` devuelve los datos sin guardarlos.
2. `public/booking-settings.js` envía las reglas con revisión; deshabilita el formulario mientras guarda.
3. `server/booking.js::configure` valida duplicados, límites, servicios y permisos; SQLite rechaza una revisión desactualizada.
4. `availability` genera horarios con zona del negocio, consulta cada calendario y suma profesores libres. Combina eventos de Google y bloqueos SQLite por calendario, incluidos pendientes.
5. `public/app.js::openBooking` muestra cupos y limita el selector a profesores del horario. El selector no decide la disponibilidad; es el servidor quien la vuelve a comprobar al confirmar.
6. `reserve` valida contexto vigente, reclama el intervalo en SQLite y escribe en Google. `verify` y `cancel` mantienen las comprobaciones de propiedad y versión del evento.
7. Agenda, reportes y correo usan la fotografía de `instructorName` de la reserva.

### Concurrencia y límites

La exclusión de operaciones de Calendar y la comprobación transaccional de solapamientos en SQLite evitan vender dos veces el mismo profesor dentro de esta instalación. Una petición concurrente puede recibir conflicto y deberá consultar nuevamente. Google no proporciona una transacción conjunta con SQLite: cambios externos entre consultar e insertar pueden entrar en conflicto. Para el piloto, centralice las reservas en Nexo y revise modificaciones manuales. No desplegar varias instalaciones independientes reservando los mismos profesores.

No se infiere capacidad por contar calendarios sin verificar intervalos ni se trata un fallo remoto como disponibilidad. Cinco profesores no garantizan cinco vehículos: si comparten coches, esa restricción todavía requiere operación manual o un desarrollo adicional.

## Validación y activación

- `tests/instructors.test.js`: capacidad 5→1→0, cancelación, elección obligatoria, idempotencia, carreras, estado incierto, solapamientos, permisos, compatibilidad y API protegida.
- `tests/instructors.e2e.js`: formulario real, cupos, profesor elegido, consulta, configuración, duplicados, pausa y vista móvil con calendarios simulados.
- Las pruebas de reservas existentes cubren voz, video simulado, micrófono pausado, correo escrito, consulta, cancelación y teclado táctil.
- No se crean citas reales ni se consumen sesiones LiveAvatar durante estos recorridos.

La publicación del código no activa automáticamente el modo profesores. Deben configurarse nombres y calendarios reales desde Administración. Antes de ofrecerlo al público, realizar una reserva acordada con el responsable y comprobar el calendario del profesor y el correo recibido.

Consulte también [Reservas](34-reservas-calendar.md), [Agenda administrativa](48-agenda-administrativa.md), [Reportes y respaldos](49-reportes-avisos-respaldos.md) y [Manual junior](23-manual-desarrollador-junior.md).


## Operación de profesores — v0.29.0

[Nombre sugerido desde Calendar, filtro por profesor e historial, pruebas y pendientes vigentes](51-operacion-profesores-y-pendientes.md). El nombre puede corregirse; las citas conservan su asignación original.


## Deshabilitar y reasignar — v0.30.0

[Manual de traslado de citas entre profesores](52-deshabilitar-y-reasignar-profesores.md): vista previa, conflictos, pausa opcional, historial y recuperación. Mantiene día/hora/código; no mueve citas existentes al configurar profesores.
