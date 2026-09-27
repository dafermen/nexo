# Reservas de clases prácticas con Google Calendar

## Piloto de reservas — v0.17.1

El responsable confirmó clases prácticas individuales de **60 minutos entre semana**. Se utiliza el horario ya registrado del negocio: lunes a viernes, **08:00–18:00, America/New_York**. El piloto admite una cita a la vez en el calendario **Mogollon Method**. No representa múltiples instructores, vehículos ni cursos grupales.

Parámetros iniciales elegidos para la prueba: ofrecer los próximos 14 días, al menos 60 minutos de anticipación y opciones de inicio cada 60 minutos. Se pueden cambiar en Configuración → Conexiones → Reservas desde el kiosco. El precio permanece por confirmar; Nexo no lo interpreta como gratuito ni cobra importes.

## Uso del alumno

1. En el inicio pulse **Servicios → Clase práctica**: aparece **Mi cita y horarios**, con Reservar y confirmar cita, Consultar mi cita y Ver disponibilidad. Reserva y disponibilidad conservan el servicio elegido. Durante la llamada por voz o video abra **Mi cita y horarios**; si hay varios servicios habilitados, elija uno al reservar o ver horarios.
2. Acepte el aviso de inicio de atención si se solicita.
3. Elija el día en la lista y luego una hora disponible. Nexo consulta los intervalos ocupados en el calendario seleccionado y marca como ocupadas sus reservas pendientes y confirmadas.
4. Complete nombre y correo. Acepte expresamente guardar estos datos en Nexo y en Google Calendar para gestionar la cita.
5. Revise servicio, horario, precio informado y datos. Pulse **Confirmar turno**.
6. Cuando Google confirma el evento, Nexo muestra un código de reserva. Conserve el código de ocho letras. Nexo intenta enviar una confirmación al correo indicado mediante el SMTP de la instalación. La pantalla distingue la cita confirmada del resultado del correo. No se envían invitaciones de Google ni se realizan cobros.

Durante el formulario se pausan la escucha automática y la respuesta de voz para que nombre y correo se escriban sin transcribirlos. El correo usa teclado de email en dispositivos táctiles, sin mayúsculas automáticas, y requiere formato válido. Esto no comprueba que el buzón exista: revíselo en la pantalla de confirmación. Al cerrar el formulario o pulsar **Volver a la llamada** después de reservar, se reanuda la escucha si estaba activa; si estaba pausada, permanece pausada. **Finalizar atención** cierra la llamada y limpia los datos de pantalla. Un minuto sin actividad durante el formulario también limpia la atención.

En la llamada puede decir «Quiero reservar una cita», «Quiero consultar mi cita» o «Quiero ver disponibilidad». Las reglas locales abren el formulario correspondiente después del filtro. No se crean citas solo por pronunciar una frase: la confirmación final se hace en el formulario. Las expresiones no reconocidas conservan la orientación del chat. Esta entrada directa se ofrece en llamadas por voz y video. La videollamada conserva su límite de 60 segundos; si termina mientras el formulario está abierto, puede completarlo sin mantener el video conectado.

## Administración

- **Administración → Servicios**: duración, precio, modalidad, requisitos y estado del servicio.
- **Configuración → Negocio**: días, apertura/cierre y zona horaria. Estos horarios también definen las opciones de reserva. Una cita debe terminar antes del cierre. Marque un día cerrado para quitar sus opciones recurrentes.
- **Configuración → Conexiones → Reservas**: habilitar/deshabilitar, elegir servicios, horizonte de 1–30 días, anticipación de 60–10080 minutos e inicios cada 15, 30 o 60 minutos. El botón **Guardar reglas de reservas** guarda únicamente estas reglas y usa revisión para evitar sobrescrituras de otra ventana.
- Para bloquear vacaciones, descansos o feriados concretos, agregue un evento ocupado en Google Calendar. Los eventos de todo el día también bloquean. Los eventos marcados «Disponible» no bloquean.
- **Administración → Turnos**: revisar código de ocho letras, alumno y horario; **Enviar confirmación** permite enviar el primer correo de una reserva anterior tras verificar Google; **Verificar con Google** actualiza el estado; **Cancelar** borra únicamente el evento propio después de revisar su marcador y horario. No modifica citas ajenas.

Se conserva el calendario original de cada reserva: cambiar el calendario seleccionado no traslada las citas existentes. Las reservas se administran desde Nexo; una edición manual de horario en Google exige revisión y no se sobrescribe silenciosamente. La sincronización es bajo demanda, sin notificaciones automáticas ni webhooks.

## Si Google no confirma

La pantalla dice **Estamos verificando su reserva** y muestra un código. El alumno debe consultar al personal sin crear otra solicitud. El intervalo queda protegido en SQLite incluso tras reiniciar el servidor.

El administrador puede pulsar **Verificar con Google**. Si encuentra el evento propio, la reserva pasa a confirmada. Si Google sigue sin mostrarlo, queda pendiente: el sistema no vuelve a insertar ni libera automáticamente ese intervalo. Una solicitud permanentemente ausente requiere investigación del administrador/desarrollador; no elimine filas de la base sin comprobar el calendario. La recuperación automática de estos casos está pendiente.

Si una cancelación pierde la conexión, vuelva a verificar o cancelar la misma reserva. Un evento ya cancelado puede reconocerse sin crear otro. Si el horario o marcador no coincide, Nexo exige revisión manual.

## Datos, límites y operación

Nexo guarda nombre, correo, consentimiento, servicio, horario, precio informado y estado en SQLite. El evento es privado y contiene nombre/correo para el personal con acceso al calendario. No tiene invitados ni recordatorios; las solicitudes usan `sendUpdates=none`. Los datos del formulario no se envían a OpenAI ni LiveAvatar. El administrador debe definir retención y atender solicitudes de eliminación antes del piloto público: la purga histórica de turnos de demostración no elimina estas reservas de Calendar ni sus eventos.

La reserva utiliza una consulta y una inserción separadas. Nexo protege las solicitudes concurrentes de esta instalación con exclusión de operaciones y una comprobación transaccional de solapamientos en SQLite. **Google Calendar no ofrece una transacción que reserve exclusivamente un horario**: otra persona o aplicación que escriba directamente en Google entre esos pasos podría generar un conflicto. Para el piloto, concentre la asignación de clases en Nexo y revise cambios externos. No se garantiza exclusión entre instalaciones independientes ni entre otros programas de reservas.

La consulta utiliza `events.list` con los permisos ya concedidos, expande recurrencias y recorre las páginas. Solicita únicamente identificador, estado, transparencia e inicio/fin, sin títulos, descripciones ni alumnos de otras citas. Si no puede interpretar o completar la consulta, no ofrece horarios inventados.

## Guía para el desarrollador

- `server/booking.js`: reglas, cálculo por zona IANA y cambios de hora, disponibilidad, confirmación, verificación y cancelación.
- `server/booking-store.js`: `booking_settings`, `calendar_bookings` y `booking_receipts` (estado del correo, sin duplicar el destinatario). La intención y el ID estable se guardan antes de insertar en Google. Las repeticiones de la misma solicitud deben coincidir en sesión y datos.
- `server/providers/booking-mail.js`: correo de confirmación con el SMTP existente, fechas en la zona de la reserva y código de ocho letras.
- `server/booking-intent.js`: detecta acciones de agenda para abrir formularios; no concede permisos ni crea reservas.
- `server/providers/google-calendar.js`: transporte autenticado y lectura paginada de intervalos.
- `GET /api/services/:id/slots`: exige sesión cuando las reservas están habilitadas; devuelve `slots` disponibles, `schedule` con estados de todos los inicios de cita permitidos y zona horaria.
- `POST /api/appointments`: valida consentimiento, datos y precio vigente; 201 confirmado o 202 en verificación. Nunca debe presentarse 202 como cita confirmada.
- `POST /api/appointments/lookup`: sesión de visitante, correo y código de ocho letras (o UUID anterior). Límite de seis consultas por IP/minuto. Verifica Google y devuelve solo servicio, horario, estado y código, sin nombre/correo/calendario privado.
- `POST /api/admin/calendar/bookings/:id/receipt`: acceso administrativo, verificación previa en Google y límite de tres solicitudes por IP/minuto.
- `GET/PUT /api/admin/calendar/booking-settings`: reglas protegidas por acceso administrativo.
- `POST /api/admin/calendar/bookings/:id/verify`: reconciliación administrativa.
- `PATCH /api/admin/appointments/:id`: cancelación administrativa, con el calendario original y marcador propio.
- `public/booking-settings.js`, `public/app.js`, `public/admin.js`: reglas, formulario y seguimiento.

Validación: `node --test tests/booking.test.js`, suite general y `node tests/booking.e2e.js`. Las pruebas automatizadas usan SQLite aislado y Google simulado, sin correo, OpenAI o LiveAvatar. No deben usar `.env` ni crear citas reales. Las comprobaciones reales deben registrarse por separado.

## Pendientes

- Precio, requisitos y política de cancelación comercial definitivos.
- Recuperación administrativa de solicitudes cuya creación quede permanentemente incierta.
- Retención, borrado y sincronización de modificaciones externas.
- Varios instructores/vehículos, grupos y capacidad mayor a uno.
- Recordatorios, notificaciones de cancelación y reprogramación. La confirmación inicial por correo ya está implementada.
- Herramientas administrativas de recuperación de envíos inciertos.
- Validación en iPad y piloto supervisado antes de atender público.

## Referencias

- [Google: listar eventos y expandir recurrencias](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).
- [Google: crear eventos e identificadores propios](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

### Verificación de reserva durante la llamada — 26/09/2026

Recorrido automatizado con voz y Google simulados: apertura dentro de la llamada, elección de día/hora, correo mal formado rechazado, pausa al escribir, datos ausentes de /api/chat, confirmación explícita, recibo, vuelta a la llamada, respeto de pausa manual, varios servicios y limpieza por inactividad. Verificación móvil a 390 px y regresiones de voz y conversación automática. Sin eventos reales ni consumo de IA, correo o LiveAvatar.

## Consultar una cita durante la llamada

Abra **Mi cita y horarios → Consultar mi cita**, o diga «Quiero consultar mi cita». Escriba el correo de la reserva y su código de ocho letras, por ejemplo ABCD-EFGH. La escucha se pausa mientras escribe. Nexo comprueba la reserva en Google y muestra si está confirmada, cancelada o aún en verificación. No muestra un listado de alumnos ni busca todas las citas de un correo. Un código o correo incorrectos producen el mismo aviso genérico.

El código de ocho letras funciona como dato privado de acceso junto al correo: no lo comparta. Puede escribir mayúsculas o minúsculas, con o sin guion o espacios. Los UUID completos anteriores siguen funcionando. Los antiguos comprobantes truncados de ocho caracteres de un UUID no sirven para consultar: el personal puede obtener el nuevo código desde Administración → Turnos.

## Correo y calendario: estados separados

La cita se crea en el calendario **del negocio** seleccionado; no aparece automáticamente en el calendario personal del alumno. Para localizarla, active Mogollon Method y revise el día/hora de la reserva. El evento se titula «Nexo · Clase práctica» para el piloto.

El correo usa la configuración SMTP del acceso administrativo, sin nuevas credenciales. Incluye servicio, inicio, fin, zona horaria y código de ocho letras. `sent` significa que el servidor SMTP aceptó el destinatario; no garantiza recepción en bandeja principal. Revise Spam. No incluye invitación ICS ni recordatorios.

Una reserva `pending` no genera correo. Una reserva confirmada sigue confirmada si falla el correo. `booking_receipts` registra `sending`, `sent` o `uncertain`; sin registro es `not_sent`. Si falta SMTP, la respuesta informa `unavailable`. El envío se reclama en SQLite antes de llamar al SMTP para evitar duplicados por doble clic o repetición. Un timeout o reinicio puede dejar `sending`/`uncertain`: no se reenvía automáticamente, porque el proveedor pudo haberlo aceptado. El administrador/desarrollador debe investigar antes de habilitar otro intento. La interfaz administrativa bloquea los reenvíos inciertos o ya aceptados.

El envío forma parte de la respuesta de confirmación. Si la conexión se demora, conserve el código y consulte al personal; nunca cree otra reserva para conseguir el correo. La cancelación posterior no retira un correo ya enviado ni genera todavía una notificación de cancelación.

### Comprobación real — 26/09/2026

Se consultó la reserva existente del usuario: Google la devolvió confirmada en Mogollon Method para el lunes 28 de septiembre, 08:00–09:00, America/New_York. No se creó otra cita. El transporte SMTP pasó su comprobación de conexión. Esa comprobación no envía mensajes ni demuestra entrega; el envío real de la confirmación anterior requiere autorización expresa y se registra por separado.

## Códigos cortos — v0.17.1

El comprobante, la consulta, Administración y los nuevos correos muestran ocho letras mayúsculas agrupadas en dos bloques: **ABCD-EFGH** (ejemplo). Se excluyen I, L y O para evitar confusiones con números. No es necesario memorizarlo: se puede copiar del comprobante o correo. La consulta sigue exigiendo también el correo y conserva el límite de intentos.

`server/booking-code.js` genera ocho letras con aleatoriedad criptográfica. `booking_codes` asocia cada UUID interno con un código único, sin reutilizarlo al cancelar. Una colisión genera otro candidato; si no se consigue un código, se revierte la operación completa. El código no contiene información del alumno ni es secuencial.

Al arrancar, una migración transaccional asigna códigos a todas las reservas existentes. Reiniciar no cambia los códigos asignados. Los UUID internos, las referencias de Google, los correos ya enviados y los eventos permanecen intactos. La API añade `code`; mantiene `id` como identificador interno y acepta el UUID anterior para consultas. No se envían nuevos correos automáticamente por esta migración.

## Horarios visibles y teclado manual — v0.19.0

El selector conserva todos los inicios de cita permitidos por el horario del negocio, la duración y el intervalo configurados, dentro del horizonte de reservas. No son todas las horas del reloj: excluye días cerrados y citas que terminarían después del cierre. Los días completamente ocupados siguen visibles con un aviso para elegir otra fecha.

- **Disponible, verde**: permite seleccionar.
- **Ocupado, rosa claro**: deshabilitado; considera Google y reservas locales confirmadas o pendientes. No muestra nombre, título ni datos de otros alumnos.
- **Pasado / Fuera de anticipación, gris**: deshabilitado. No se presenta como ocupado cuando el motivo es una regla de tiempo.

El servidor sigue comprobando disponibilidad al confirmar: una hora puede ocuparse mientras el formulario está abierto. `availability()` conserva `slots` con horas reservables y añade `schedule` con `slot`, `available` y `reason`; no expone información del evento. Las reglas de zona horaria y cambios de hora permanecen vigentes.

El nombre, correo y código ofrecen un icono para expandir/ocultar el teclado, siempre que esté habilitado en Configuración → Experiencia. Escribir físicamente no abre el teclado de Nexo. [Uso del teclado](35-teclado-pantalla.md).

## Menú de citas desde el inicio — v0.19.1

Las tarjetas de servicios habilitados para reservas abren el mismo menú que la llamada. No es necesario iniciar voz o video. Las tarjetas informativas de servicios aún no reservables conservan su información. El menú indica el servicio elegido y no repite el selector al reservar o ver disponibilidad.

Consultar mi cita mantiene la comprobación por correo/código y solicita consentimiento de sesión si aún no existe. La consulta recupera la reserva correspondiente al código, aunque sea de otro servicio: no confunde la selección del inicio con los datos reales de la cita. Al terminar, el botón dice **Volver al inicio**; durante una llamada dice **Volver a la llamada**.

Implementación: `showAgendaMenu(service)` comparte las opciones entre tarjetas y llamada. `openAppointmentLookup()` asegura sesión antes de consultar y descarta aperturas si la atención cambió. No se crean sesiones de LiveAvatar al usar este menú desde el inicio.

## Agenda conversacional

Desde v0.20.0, texto y voz permiten consultar horarios por servicio, día y franja, recordar cambios de preferencia y elegir una de las opciones ofrecidas para abrir el formulario. No crea citas sin revisar y confirmar. [Manual, límites y pruebas](36-agenda-conversacional.md).


## Calendarios por profesor — v0.28.0

[Elección del alumno, cupos, configuración y recorrido del código](50-calendarios-por-profesor.md). Incluye compatibilidad con la agenda única y conservación del calendario de cada cita. El acceso del personal se reúne en Administración.
