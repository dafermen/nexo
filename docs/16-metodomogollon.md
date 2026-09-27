# Perfil de MetodoMogollon

> **Administración editable disponible (v0.5.0).** Abra ABRIR-ADMIN.cmd para editar servicios, precios, requisitos, modalidades y horarios. Los datos se conservan en SQLite y se usan en la siguiente respuesta de la asesora. [Guía de acceso y funcionamiento](17-administracion.md).


Actualizado el 16 de septiembre de 2026 con información proporcionada por el responsable de la escuela.

## Datos confirmados

- Nombre: Escuela de Conducción "MetodoMogollon". Nexo sigue siendo el nombre del asistente y del software.
- Atención: lunes a viernes, de 08:00 a 18:00. Se utiliza America/New_York por el contexto del DMV de Nueva York; confirmar si la escuela opera en otra zona.
- Trato: usted, cordial, claro y breve, tanto en la interfaz como en las respuestas del agente.
- Servicios: preparación para el road test o examen práctico del DMV de Nueva York; clases presenciales y virtuales; curso de las 5 horas.
- Requisitos: pendientes. Precios: pendientes. No se muestran importes gratuitos ni inventados.
- Turnos: Google Calendar. El responsable aún no tiene el enlace y lo aportará próximamente.

La respuesta sobre clases presenciales y virtuales no especifica la modalidad de cada curso ni confirma el alcance de la preparación teórica. El agente debe remitir esos detalles al personal. No se añaden servicios a partir de «entre otros».

## Implementación actual

El perfil se activa con CENTER_PROFILE=metodomogollon en la configuración del servidor. server/center.js concentra identidad, horarios, servicios y estado de agenda. La API y ambos proveedores de conversación consumen estos mismos datos. Los precios desconocidos y las duraciones no confirmadas usan null. Las cinco horas describen el curso, no una duración de reserva configurada.

El adaptador del catálogo conserva la base SQLite anterior: no sustituye ni borra reservas históricas. Administración permite editar el catálogo y los horarios, persistidos en SQLite. server/center.js aporta únicamente los valores iniciales y las reglas; las ediciones guardadas tienen prioridad. Se conserva la gestión de registros locales anteriores.

Con la agenda pendiente, las fichas muestran información y remiten al personal. No recogen datos personales ni ofrecen horarios generados. La API devuelve cero horarios y rechaza toda reserva local, incluso solicitudes antiguas o fabricadas. El agente no puede afirmar que consultó Google Calendar ni que reservó o cobró.

## Siguiente paso: Google Calendar

1. Recibir el enlace de reservas o definir el calendario y el tipo de integración autorizado por su propietario.
2. Confirmar precios, requisitos, duraciones por servicio, modalidad, instructores/recursos, cupos, días no laborables y política de cambios.
3. Elegir entre acceso a una página de reservas existente y una integración de API con autorización desde el servidor. No se ha conectado una cuenta ni creado eventos.
4. Implementar consulta de disponibilidad y confirmación explícita; probar ocupación concurrente, zona horaria/cambio de hora, cancelaciones y fallos de conexión.
5. En iPad compartido, probar cierre y limpieza de la sesión, y actualizar el aviso de privacidad antes de recoger datos para reservas reales.

El horario comercial no equivale a cupos disponibles. Google Calendar será la fuente de la agenda cuando se conecte. No se abrirá automáticamente una sesión de video al consultar las fichas. LiveAvatar mantiene el límite de 60 segundos.
