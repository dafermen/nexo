# Deshabilitar profesores y reasignar citas — v0.30.0

Héctor usa el calendario **MetodoMogollonHector** y Darío **MetodoMogollonDario**. Ambos calendarios fueron localizados por nombre exacto y se comprobaron permisos de escritura y zona `America/New_York`. Los identificadores de Google permanecen en la configuración privada; el alumno ve el nombre del profesor.

## Deshabilitar sin mover citas

Administración → Configuración → Conexiones → Reservas desde el kiosco → profesor: desmarque **Disponible para nuevas reservas** y guarde. Las citas existentes conservan profesor, fecha, hora y calendario. Para habilitarlo nuevamente, marque la misma opción. Si se deshabilita el último profesor de un servicio reservable, primero debe asignar otro profesor o deshabilitar las reservas de ese servicio.

## Deshabilitar y trasladar citas

1. Entre a Administración → Agenda y citas → **Deshabilitar profesor / reasignar citas**.
2. Elija el profesor de origen, el destino y un motivo. También puede elegir «Sin profesor asignado · agenda única» para asignar reservas antiguas de Nexo, sin modificar eventos ajenos.
3. Marque si desea deshabilitar al origen para nuevas reservas. Es opcional: también puede mover algunas citas sin deshabilitarlo.
4. Pulse **Revisar citas futuras**. No se mueve nada en este paso.
5. Revise alumno, código, servicio, fecha/hora y conflictos. Seleccione entre una y diez citas disponibles. La vista previa admite hasta cien citas futuras; para volúmenes mayores se requiere operación asistida.
6. Confirme el destino y la cantidad. Nexo vuelve a verificar cada cita antes de moverla. El procesamiento es secuencial; no es una transacción única para todo el lote.
7. Revise el resultado de **cada cita**. Las conflictivas, pendientes, no seleccionadas y las posteriores a un error siguen en origen. Si marcó deshabilitar, el profesor permanece deshabilitado aunque algún traslado falle; revise las citas que quedaron a su cargo.

Se conserva día, hora y código de reserva. No se cancela ni recrea la cita, no hay cobros ni reembolsos. **No se envían correos automáticos por esta reasignación:** avise a los alumnos del cambio de profesor. Los comprobantes que ya recibieron no se modifican en sus buzones.

## Condiciones y estados

- Solo citas futuras confirmadas de Nexo. Una cita que ya comenzó, no confirmada, cancelada o con traslado pendiente no es elegible.
- El destino debe estar activo, impartir el servicio y tener todo el intervalo libre. Se consideran sus eventos de Google y los bloqueos locales, incluso de otros servicios.
- Los calendarios deben permitir escritura. Eventos alterados, recurrentes, de tipo especial, con invitados o sin propiedad/verificación suficiente requieren revisión manual; no se trasladan automáticamente.
- **Trasladada:** origen retirado, destino verificado y asignación SQLite actualizada.
- **Rechazada:** Google rechazó definitivamente el traslado; la cita permanece en origen y se libera el bloqueo adicional del destino.
- **Por verificar:** resultado remoto incierto. Ambos horarios quedan protegidos. No se puede cancelar ni enviar otra confirmación mientras se aclara.

Para un traslado por verificar, abra **Ver detalle → Historial de reasignaciones → Verificar traslado**. Se consultan ambos calendarios y se completa la comprobación, sin repetir el movimiento. Si Google todavía no permite determinar el resultado, se mantienen ambos bloqueos. Si el evento sigue solo en origen tras un fallo de red, necesita revisión técnica; esta versión no fuerza liberación ni reenvía automáticamente una operación incierta. No borre registros SQLite para liberar el cupo.

No se trasladan clases históricas al configurar nuevos calendarios. Las citas previas siguen en «Mogollon Method» hasta que el administrador elija cuáles reasignar.

## Para el desarrollador junior

### Persistencia antes de efectos externos

`server/booking-transfers-store.js` crea `booking_transfers`. Cada fila conserva ID de operación, ID de cita, destino, intervalo, estado y documento privado con origen, profesor destino, iCalUID, actor, motivo y fechas. Un índice único impide dos traslados pendientes de la misma cita. El documento no sale íntegro por API.

`beginBookingTransfer` abre una transacción SQLite, vuelve a comprobar la cita y los bloqueos del destino, rechaza un correo en curso y registra `pending` **antes** de llamar a Google. `bookingBlocks` suma citas normales y traslados pendientes. El origen sigue bloqueado por su reserva original; el destino por la nueva intención durable.

`finishBookingTransfer('moved')` actualiza en una sola transacción el calendario y profesor de la reserva y el estado del traslado. Conserva ID, código, alumno, horario y estado reservado. `failed` conserva la asignación original. Los avisos en cola esperan mientras existe un traslado pendiente; no se crea un aviso de «nueva cita» al moverla.

### Google y recuperación

`server/booking-transfers.js` valida elección, disponibilidad, permisos, propiedad y versión antes de usar [Events.move](https://developers.google.com/workspace/calendar/api/v3/reference/events/move), con `sendUpdates=none`, sin cuerpo y con `If-Match`. Este método cambia el organizador del evento. Consulte también [modificaciones condicionales](https://developers.google.com/workspace/calendar/api/guides/version-resources).

La prueba técnica real comprobó que Google conserva ID, iCalUID e intervalo, pero elimina las propiedades privadas al mover entre estos calendarios. Por eso Nexo guarda el iCalUID antes de mover. Cuando el origen ya no está activo y el destino coincide en ID, iCalUID y extremos del intervalo, restaura **solo su marca privada**, conservando otras propiedades privadas, mediante PATCH condicionado al etag del destino. Comprueba el resultado antes de actualizar SQLite. Un marcador distinto, horario cambiado, invitado añadido o UID diferente impide adoptar el evento.

Un timeout o respuesta perdida deja pending. Repetir el mismo ID de operación solo consulta/reconcilia; nunca vuelve a invocar move. Un fallo durante la restauración de marca también deja ambos horarios protegidos. `BookingService.verify`, `cancel`, `sendConfirmation` y los reintentos de reserva rechazan operaciones sobre una cita con traslado pendiente.

Google y SQLite no forman una transacción conjunta. La exclusión de Calendar y los bloqueos locales protegen esta instalación; una persona que edite directamente Google puede generar cambios concurrentes. No se garantiza exclusión entre instalaciones independientes.

### API e interfaz

| Ruta administrativa | Entrada | Resultado |
|---|---|---|
| POST `/api/admin/transfers/preview` | sourceId, targetId | Citas futuras, elegibilidad, conflictos y revisión de reglas. No mueve eventos. |
| POST `/api/admin/transfers` | id UUID, bookingId, sourceId, targetId, reason | moved, failed o pending. Actor tomado de la sesión, nunca del formulario. |
| POST `/api/admin/transfers/:id/verify` | Cuerpo vacío | Consulta ambos calendarios y reconcilia si hay evidencia suficiente. |

`public/booking-transfers.js` construye la vista previa con texto seguro y controles táctiles. Procesa como máximo diez solicitudes confirmadas; un error detiene el lote y pide revisar resultados. Cerrar sesión invalida los callbacks y detiene solicitudes siguientes, aunque una solicitud ya enviada puede terminar en el servidor. El detalle de agenda conserva origen, destino, motivo, responsable y estado para recuperar ese resultado.

## Pruebas y operación

- SQLite/API: movimiento idempotente, conflictos, servicios incompatibles, profesor pausado, agenda única, carreras, rechazo definitivo, respuesta perdida, restauración de marca, marcador/UID alterado y autorización/origen.
- Navegador con dobles: vista previa, conflictos deshabilitados, pausa del origen, selección, resultados por cita, fallo al restaurar marca, recuperación, móvil y cierre de sesión.
- Google real: pruebas con eventos técnicos sin alumnos ni invitados; movimiento, restauración de marca y ausencia comprobada tras limpieza en ambos calendarios. No se movieron citas de alumnos durante estas pruebas.
- Mantenga respaldo cifrado antes de cambios operativos. Tras restaurar una copia, reconcilie traslados pendientes con Google antes de abrir reservas. No vuelva a una versión anterior sin soporte de traslados mientras haya operaciones pendientes, porque no interpretaría el bloqueo del destino.

La entrega no incluye avisos automáticos de cambio, traslado masivo de eventos externos, cambio de hora ni eliminación definitiva de un profesor con historial.
