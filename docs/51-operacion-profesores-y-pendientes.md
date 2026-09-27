# Profesores: configuración sencilla, filtros y pendientes — v0.29.0

Esta entrega facilita nombrar profesores desde Google Calendar y consultar su agenda. No crea calendarios ni activa automáticamente profesores reales. Complementa la [guía de calendarios por profesor](50-calendarios-por-profesor.md).

## Nombre desde el calendario

En Administración → Configuración → Conexiones → Reservas desde el kiosco, seleccione el calendario del profesor. Si el campo de nombre está vacío, Nexo propone el nombre del calendario:

| Nombre de calendario | Nombre sugerido al alumno |
|---|---|
| Clases · Héctor Mogollón | Héctor Mogollón |
| Clases - Anne-Marie Dupont | Anne-Marie Dupont |
| Ana Pérez | Ana Pérez |

Solo se elimina el prefijo «Clases» seguido de un separador. No se adivina identidad desde correos o identificadores. Revise nombres de calendarios genéricos como «Personal» antes de guardar.

Puede corregir el nombre. Un nombre guardado o editado no se reemplaza al refrescar calendarios ni al seleccionar otro. El botón **Usar nombre del calendario** permite solicitar de nuevo la sugerencia; pide confirmación si reemplaza un nombre distinto. Cuando aún es una sugerencia sin edición, sigue la nueva selección del calendario. Los cambios solo se guardan al pulsar **Guardar reglas de reservas**.

Renombrar el calendario en Google no renombra automáticamente al profesor de Nexo ni sus citas anteriores. Pulse Actualizar calendarios, revise la sugerencia y guarde si desea adoptar el nuevo nombre. La relación siempre utiliza el ID del calendario, no el texto del nombre.

## Filtrar la agenda

En Administración → Agenda y citas aparece **Profesor**:

- Todos los profesores: comportamiento general anterior.
- Un profesor concreto: solo sus citas, combinables con servicio, estado, fechas y búsqueda. Se aplica también a la paginación y las vistas de día/semana.
- Sin profesor asignado · agenda única: citas antiguas o de la modalidad única que no tienen profesor guardado. No se atribuyen retroactivamente a una persona.
- Pausado: profesor configurado que no recibe nuevas reservas.
- Historial: profesor retirado de configuración que todavía tiene citas registradas.

Pulse **Aplicar filtros** después de elegir. **Consultar horarios del servicio** consulta el servicio y profesor seleccionados. Si selecciona uno retirado, pausado o no habilitado para ese servicio, Nexo informa que no ofrece horarios en la configuración actual. «Sin profesor asignado» clasifica citas históricas; para consultar la disponibilidad general actual seleccione Todos los profesores.

Dos profesores con el mismo nombre se distinguen con un sufijo corto de referencia en el selector administrativo. No es el código de reserva ni el correo del calendario. El nombre mostrado en cada cita es el guardado al reservar; el nombre actual del selector puede ser diferente si se renombró al profesor.

## Recorrido para el desarrollador junior

1. `public/instructor-settings.js::calendarInstructorName` recibe el título de Calendar y devuelve una sugerencia limpia de hasta 80 caracteres. No modifica SQLite ni Google.
2. La variable local `manual` distingue nombre guardado/editado de una sugerencia. Las listas remotas actualizan las opciones, sin sobrescribir el campo de nombre.
3. `server/admin-agenda.js::agendaFilters` valida `instructorId`: vacío, `unassigned` o ID hexadecimal de 24 caracteres. No interpola texto del usuario en SQL.
4. `agendaList` filtra el documento de cada cita **antes** de contar y paginar. `agendaInstructors(configured)` combina los profesores actuales con el último nombre registrado de cada profesor histórico, mediante SQLite. No llama a Google para listar citas.
5. `GET /api/admin/agenda` añade `instructors: [{id,name,state}]`. Esta lista exige autenticación administrativa y no contiene IDs de Calendar ni credenciales.
6. `GET /api/admin/agenda-availability` acepta el mismo filtro opcional. Parte de la disponibilidad comprobada y devuelve capacidad 1 para el profesor elegido; no presenta los cupos de otros profesores como propios. Si falla una lectura necesaria, conserva el rechazo seguro del servicio de reservas.
7. `public/admin-agenda.js` conserva la selección al actualizar, distingue nombres repetidos y elimina opciones privadas al cerrar sesión. Un cambio de filtros invalida la respuesta pendiente de disponibilidad.

El editor no agrega eventos, no manda correos y no cambia reservas. No se ha añadido reprogramación: cancelar y crear otra cita siguen siendo operaciones separadas.

## Pruebas

- Pruebas SQLite/API: más de 50 citas por profesor, filtro previo a paginación, nombres iguales, agenda única, profesores retirados, valores inválidos y acceso restringido.
- Prueba de disponibilidad: un profesor ocupado devuelve cero, mientras otro libre conserva su cupo a la misma hora.
- Navegador: nombre automático con acentos, corrección preservada, sustitución explícita, filtros, semana, historial y cierre de sesión; interfaz móvil, español/inglés/francés en reservas.
- Regresión: reservas por voz/video con proveedores simulados y agenda administrativa existente.

No se crean citas reales ni se utilizan servicios de IA o video de pago para estas validaciones.

## Prioridades operativas pendientes

| Prioridad | Pendiente | Qué se necesita |
|---|---|---|
| Alta | Prueba con dos profesores reales | Nombres/calendarios confirmados, ambos con permisos; fecha, hora y datos acordados para una reserva de prueba. Verificar evento, cupos y recepción en los buzones del alumno y administradores. |
| Alta | Información comercial definitiva | Precios, requisitos, modalidades y detalles aprobados por la escuela. No inventar estos datos. |
| Alta | Validar el equipo del kiosco | Dispositivo disponible, micrófono/ruido, permisos, teclado y orientaciones. Una prueba de navegador simulada no valida el hardware. |
| Alta | Copia externa automática y retención | Destino externo y política de conservación acordados. Ya existen respaldo diario cifrado en VPS y copias manuales externas; la automatización externa sigue pendiente. |
| Alta | Política de datos | Plazos para citas, conversaciones y respaldos; procedimiento de eliminación acordado con el responsable. |
| Media | Mantenimiento | Repositorio privado GitHub, validación continua y alertas de fallos operativos. |
| Media | Agenda avanzada | Reprogramación segura, horarios propios por profesor y restricciones por vehículos compartidos. |

El tablero se corrigió: HTTPS ya está desplegado; respaldos programados y recuperación ya tienen evidencia. Lo pendiente no debe volver a describirse como «falta instalar el servidor» o «falta crear respaldos».

Consulte [Piloto desplegado](47-piloto-metodomogollon.md), [Agenda](48-agenda-administrativa.md), [Reportes y respaldos](49-reportes-avisos-respaldos.md) y [Manual junior](23-manual-desarrollador-junior.md).


## Deshabilitar y reasignar — v0.30.0

[Manual de traslado de citas entre profesores](52-deshabilitar-y-reasignar-profesores.md): vista previa, conflictos, pausa opcional, historial y recuperación. Mantiene día/hora/código; no mueve citas existentes al configurar profesores.
