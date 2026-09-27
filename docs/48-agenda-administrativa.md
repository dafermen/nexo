# Agenda y citas: manual de administración y desarrollo

Versión 0.26.0 · 26 de septiembre de 2026

## Acceso y uso

Entre a Administración y pulse **Agenda y citas** en la cabecera. En el piloto use `/admin#admin-agenda` después de entrar al piloto y autenticarse con el código de su correo autorizado.

- **Listado:** busca nombre, correo o código; filtra servicio, estado y fechas. Sin fechas muestra todo el historial, en páginas de 50. No se limita a los últimos 200 registros.
- **Día / semana:** parte de la fecha «Desde» y muestra uno o siete días. «Hoy» utiliza la zona horaria del negocio; las flechas avanzan ese período. Los días sin tarjetas no certifican disponibilidad de Google. Si hay más de 50 citas, recorra las páginas.
- **Consultar horarios del servicio:** seleccione un servicio y fecha «Desde». Consulta Google en ese momento; verde significa disponible, rosado ocupado o no reservable. También distingue horas pasadas y anticipación insuficiente. Solo funciona dentro del horizonte de reservas configurado y con Calendar conectado.
- **Ver detalle:** cliente, código, servicio, horario, precio, correo, última comprobación e historial de cancelaciones.
- **Verificar con Google:** comprueba de nuevo una cita. «Confirmada en última comprobación» indica lo observado en esa fecha, no sincronización permanente.

La lista incluye citas creadas por Nexo y los registros identificados como demo local. No importa la agenda personal ni muestra los títulos/clientes de eventos externos: esos eventos sí bloquean disponibilidad. Esta primera etapa no crea ni reprograma citas desde Administración y no registra pagos. «Falta de pago» es un motivo manual, no una verificación de cobro.

## Cancelación con motivo

1. Abra una cita o pulse **Cancelar**.
2. Seleccione error, falta de pago, solicitud del cliente, cambio de horario u otro motivo. Para «Otro», escriba de 3 a 300 caracteres. Evite información sensible innecesaria.
3. Pulse **Confirmar cancelación** y revise cliente, código, fecha y motivo en la confirmación.
4. Nexo comprueba que el evento Google corresponde a esa reserva y conserva su horario. Solo lo elimina si su versión sigue siendo la misma.
5. Si Google confirma, queda **Cancelado** y se libera el horario. Se conserva el registro local y el motivo; no hay borrado definitivo en este módulo.

La cancelación no manda correo al cliente ni procesa reembolsos. «Enviar confirmación» se refiere al comprobante de una reserva vigente y requiere una confirmación separada.

### Si hay un error

Un fallo de red, autorización o cambio externo deja **Revisión pendiente con Google**. El registro no se presenta como cancelado y el horario permanece protegido. Pulse **Verificar con Google** antes de repetir: si Google sí había eliminado el evento pero se perdió la respuesta, la verificación lo reconcilia sin volver a crearlo. Una reserva cuya creación sigue incierta no libera cupo por falta de respuesta.

## Recorrido para desarrolladores junior

1. `public/admin.js` instala `installAgenda({root,request})`. `request` utiliza la sesión administrativa existente y el control de origen del servidor.
2. `public/admin-agenda.js` transforma el formulario en parámetros de consulta. `version` y `detailVersion` descartan respuestas antiguas al cambiar filtros, cerrar el diálogo o salir. `actionBusy` evita repetir acciones mientras están en curso. Los datos del cliente se colocan con `textContent`, nunca como HTML.
3. `GET /api/admin/agenda` valida los filtros con `agendaFilters`. Fechas son días de la zona del negocio; se convierten a límites UTC, contemplando días de 23 o 25 horas. SQL usa parámetros vinculados; se devuelve una página de 50 más el total.
4. `createAgendaStore` combina las reservas Google y demo. Construye una respuesta explícita: excluye `sessionHash`, `requestId`, `calendarId`, el marcador privado y tokens. El detalle agrega hasta 50 intentos de cancelación recientes.
5. `PATCH /api/admin/appointments/:id` exige `{status:'cancelled',reason}`. El actor se obtiene de la sesión, nunca de un campo enviado por el navegador.
6. `BookingService.cancel` serializa la operación, guarda la intención antes de llamar a Google, verifica propietario/horario y usa `If-Match` con la versión `etag`. Un HTTP 412 significa que otro actor cambió el evento y se rechaza la cancelación. [Contrato de modificaciones condicionales de Google](https://developers.google.com/calendar/api/guides/version-resources).
7. `booking_cancellations` conserva motivo, actor, fechas y resultado (`pending`, `uncertain`, `confirmed`). `booking_sync` conserva el último estado comprobado y fecha. Ambas tablas se crean de forma aditiva: reiniciar no elimina citas anteriores.

## API privada

| Ruta | Entrada | Resultado |
|---|---|---|
| GET `/api/admin/agenda` | `q`, `status`, `serviceId`, `from`, `to`, `offset` | `items`, `total`, `offset`, `limit`, zona y estado de conexión |
| GET `/api/admin/agenda/:id` | UUID | Datos de la cita e historial de cancelación |
| GET `/api/admin/agenda-availability` | `serviceId` | Horarios comprobados con Google; máximo 10 consultas/minuto por IP |
| POST `/api/admin/calendar/bookings/:id/verify` | Sesión administrativa | Reconciliación de estado Google |
| PATCH `/api/admin/appointments/:id` | Estado cancelado y motivo | Confirmación solo después de completar la cancelación |

Estado permitido: `all`, `reserved`, `pending`, `cancelled`; búsqueda hasta 100 caracteres; rango máximo de 366 días entre extremos; `offset` entero no negativo. La lista y detalle no realizan llamadas de pago ni verificaciones masivas con Google.

## Validación y límites del piloto

- 260 pruebas automatizadas: permisos, origen, paginación más allá de 200, búsqueda, cambio horario, motivo obligatorio, actor de sesión, conservación del horario, eventos ajenos/modificados y conflicto de versión.
- Recorridos de navegador con Calendar y correo simulados: agenda, detalle y cancelación en móvil, error remoto, texto potencialmente malicioso, cierre de sesión, catálogo y reservas durante llamada de voz.
- Disponibilidad real del piloto comprobada en «Mogollon Method», clase práctica de 60 minutos, America/New_York. No se crearon ni cancelaron reservas reales durante las pruebas.
- Cancelaciones y verificación de conflictos reales se prueban con dobles para no afectar usuarios. Queda pendiente la validación operativa del cliente y la entrega real de comprobantes al buzón.
- Próxima etapa: reprogramación y seguimiento manual de pagos. No se agregan cobros automáticos ni eliminación definitiva.

## Despliegue y recuperación

El paquete excluye `.env`, SQLite, tokens y datos del cliente. Antes de activar, se ejecutan pruebas en Linux y se genera respaldo cifrado. Código en una carpeta nueva bajo `/opt/nexo/releases`; datos en `/var/lib/nexo`. La migración es aditiva y permite volver al código anterior conservando las tablas nuevas. Cerrar la sesión de administración al terminar, especialmente en equipos compartidos.


## Calendarios por profesor — v0.28.0

[Elección del alumno, cupos, configuración y recorrido del código](50-calendarios-por-profesor.md). Incluye compatibilidad con la agenda única y conservación del calendario de cada cita. El acceso del personal se reúne en Administración.


## Operación de profesores — v0.29.0

[Nombre sugerido desde Calendar, filtro por profesor e historial, pruebas y pendientes vigentes](51-operacion-profesores-y-pendientes.md). El nombre puede corregirse; las citas conservan su asignación original.


## Deshabilitar y reasignar — v0.30.0

[Manual de traslado de citas entre profesores](52-deshabilitar-y-reasignar-profesores.md): vista previa, conflictos, pausa opcional, historial y recuperación. Mantiene día/hora/código; no mueve citas existentes al configurar profesores.
