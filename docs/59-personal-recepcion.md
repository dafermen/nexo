# Personal y recepción presencial

**Actualización documental 17/10/2026:** las fases 1–3 aquí descritas pertenecen al ciclo anterior y fueron publicadas dentro de 0.40.0. El nuevo [plan por negocio](64-fases-multinegocio.md) usa otra numeración; no implica rehacer recepción ni roles.

Versión 0.39.0 · 13 de octubre de 2026 · Fases 1, 2 y 3 del manual del cliente.

La versión 0.40.0 amplía los permisos académicos y el acceso de instructores: consulte [Expedientes y servicios](60-expedientes-servicios.md). Esta guía conserva el alcance de recepción de la entrega anterior.

Nexo incorpora contenido actualizado, cuentas del personal con permisos y una cola para recibir visitantes en la oficina. Las reservas de conducción siguen en Google Calendar. Un turno de recepción no reserva una clase. Pagos, caja, llamadas telefónicas, expedientes y servicios de las fases posteriores permanecen fuera de esta entrega.

## Primer recorrido

1. Entre en Administración y abra **Personal y recepción** (`/staff`).
2. Un propietario crea cuentas con nombre, correo y cargo. No se envían invitaciones automáticas. Cada empleado solicita un código en su propio correo al entrar.
3. Gerencia puede añadir escritorios y habilitarlos o deshabilitarlos cuando estén libres.
4. Abra `/lobby` en la pantalla de sala. Si el piloto es privado, esa pantalla también necesita entrar al piloto. Active el tono mediante el botón de la pantalla; el navegador exige un gesto del operador.
5. El visitante pulsa **Atención con un asesor**. En el tema Método Mogollón está dentro de **Atención y ayuda**. Completa primera visita/estudiante, motivo y nota opcional; confirma que está en la oficina.
6. Nexo entrega un número, por ejemplo A001. La persona debe anotarlo antes de cerrar. La ficha no incluye nombre, correo, teléfono ni documentos; no constituye identificación del alumno.
7. El asesor elige escritorio y pulsa **Llamar siguiente**. Solo entonces aparecen número y escritorio en las pantallas.
8. Puede repetir el llamado, iniciar atención y finalizarla, o marcar ausencia. Gerencia también puede cancelar o resolver una atención de otra cuenta.

Finalizar no llama automáticamente a otra persona. No se estima un tiempo de espera. Si el cliente no quiere describir su visita, elige **Prefiero no indicar el motivo**. Las personas que necesitan atención separada solicitan su turno desde una nueva conversación; repetir el envío de una misma ficha no crea otro turno.

## Permisos de esta entrega

| Cargo | Acceso |
|---|---|
| Propietario | Administración completa, cuentas del personal, configuración, conexiones y respaldos. |
| Gerente | Catálogo, conocimiento, agenda y reportes; recepción y escritorios. Sin gestión de cuentas, conexiones, secretos, respaldos ni configuración integral. |
| Asesor | Cola de recepción y acciones sobre su atención asignada. Sin historial de conversaciones, agenda de alumnos ni configuración. |
| Instructor | Su identidad de acceso. Puede quedar vinculado al profesor/calendario existente; el portal de clases y expedientes se desarrollará después. |

Los administradores definidos en la instalación siguen como propietarios de recuperación. Se mantienen desde la configuración privada de instalación, no desde la pantalla de personal. Nadie modifica su propia cuenta desde este editor. Cambiar una cuenta gestionada revoca sus sesiones y códigos pendientes, incluso al deshabilitarla. La sincronización de propietarios al arrancar no elimina las cuentas gestionadas.

En el modo local heredado, la clave administrativa representa al propietario local. Para atribuir acciones a cada empleado se debe usar acceso por correo. Los avisos ya existentes de nuevas citas siguen dirigidos a los administradores de instalación, no a todos los empleados.

## Contenido y decisiones

- Curso: presencial, $80, con grupos/horarios/idiomas por confirmar. No se ofrece todavía una inscripción de curso grupal en Nexo.
- Preparación del permiso: $35, cuaderno de 105 preguntas, 20 simulacros de 20 preguntas y asistencia para gestionar cita DMV. Recogida presencial, sin envíos; únicamente efectivo en caja, gestionado por el personal fuera de Nexo.
- Se mantienen **usted** y las preferencias administrativas vigentes. No se introduce detección automática tú/usted sin un acuerdo adicional.
- Atención breve ante confusión, prisa, indecisión, queja o petición humana. Una petición humana ofrece un formulario; no genera un turno automáticamente.
- Despedida explícita con el lema aprobado; traducción equivalente en inglés/francés. No se repite después de cada respuesta.
- ID-44, edades/regiones, disponibilidad impresa, políticas finales y grupos siguen pendientes de verificación. SMS, evaluación diagnóstica y programa de estudio no se anuncian como integraciones activas.

La fuente de entrega es `conocimiento/actualizaciones/manual-fases123-20261013.json`. Su aplicación es atómica y se registra una sola vez; no se vuelve a aplicar al arrancar ni sobrescribe ediciones futuras. La fuente activa sigue siendo SQLite. El panel de personal muestra origen, fecha y listas de aprobado/pendiente/futuro en **Contenido aprobado y pendientes**. Cambios futuros habituales se hacen en Servicios y Respuestas frecuentes, con revisión de traducciones.

## Privacidad y contingencia

- La nota de recepción se escribe en el formulario, separado de la IA, con máximo 240 caracteres y dos líneas. El teclado opcional existente funciona en este campo.
- La pantalla pública solo muestra números y escritorios. No muestra correos, nombres, notas ni categorías. No lee la conversación en voz alta.
- El tono se reproduce únicamente en la pantalla de sala, al llamar o repetir. Es inmediato: el retraso relacionado con SMS no aplica porque no hay SMS en esta fase.
- Fichas y eventos de recepción se conservan siete días. Al consultar la cola/tablero se eliminan los vencidos; si no hay consultas, se eliminan en la siguiente. Turnos abiertos de un día anterior expiran al siguiente uso según la zona del negocio.
- Terminar una conversación limpia la pantalla, pero no cancela su turno presencial. El visitante puede cancelar su propio turno mientras espera. El personal puede resolverlo si pierde su sesión.
- Si falla la conexión, la sala oculta llamados antiguos y muestra aviso. El personal debe continuar con una lista manual; al regresar debe reconciliarla, sin prometer sincronización automática de anotaciones en papel.
- El botón presencial requiere declarar que se está en la oficina. No es una prueba física de ubicación. Antes de abrirlo masivamente en Internet, valorar una credencial de dispositivo para aceptar turnos solo en kioscos autorizados.

## Pruebas y aceptación

Las pruebas automatizadas usan SQLite temporal, correo simulado y ningún proveedor pagado. Incluyen permisos HTTP, revocación, migración de cuentas anteriores, reintentos, dos asesores, escritorios ocupados, revisión concurrente, estados, privacidad, contenido y pantallas móviles ES/EN/FR.

Comandos: `npm test`, `npm run check`, `npm run docs:check`, `npm run test:reception`, `npm run test:kiosk`, `npm run test:access` y `npm run test:agenda:voice`.

Validación local del 13 de octubre de 2026: 327 pruebas automatizadas aprobadas, 167 archivos JavaScript comprobados y recorridos de navegador aprobados para recepción, acceso del personal, reserva conversacional por voz y ambos temas en nueve tamaños de pantalla. La carga de contenido se aplicó a la base local después de comprobar un respaldo cifrado recuperable; la agenda se conservó. La versión 0.39.0 se validó localmente. Sus cambios fueron incluidos en la publicación 0.40.0 del 13/10/2026; la ejecución remota de CI de esta entrega sigue pendiente.

Antes de operación con público faltan cuentas reales y escritorios del local, prueba física de audio/pantalla/micrófono y aceptación del procedimiento de recepción. Desarrollo local y publicación del VPS son estados separados; no confundir una prueba simulada con atención real.

## Despliegue y reversión

Con respaldo cifrado y servidor detenido, ejecutar primero la vista previa:

```text
node --env-file=.env scripts/apply-school-content.js conocimiento/actualizaciones/manual-fases123-20261013.json
```

Luego repetir con `--apply`. En Linux usar el entorno privado y usuario del servicio. Nunca copiar SQLite local encima de la base del VPS. Actualizar código y contenido como una entrega coordinada y comprobar los tres idiomas. El cambio de esquema es aditivo; la carga comercial es única. Para revertir, conservar los servicios/FAQ anteriores y el registro de carga, sin borrar reservas nuevas.

**No volver al código anterior con cuentas de personal activas:** no reconoce cargos. Antes de un rollback, revocar sesiones/códigos y deshabilitar cuentas gestionadas, con procedimiento supervisado. Los propietarios de instalación mantienen el mecanismo de recuperación.

## Ruta para el desarrollador junior

1. `admin-store.js`: columnas de cargo/estado/origen y operaciones con revisión. `admin-auth.js`: códigos de un uso y principal autenticado.
2. `staff.js`: lista de permisos por ruta; `app.js` la exige antes de cualquier ruta administrativa.
3. `reception.js`: operaciones síncronas dentro de `BEGIN IMMEDIATE`. Los índices únicos impiden dos atenciones activas por asesor, escritorio o sesión.
4. `reception-visitor.js`: formulario, petición idempotente y seguimiento dentro del modal; se pausa el micrófono existente.
5. `staff-ui.js`: panel privado. `lobby.js`: consulta pública de datos mínimos y tono por secuencia nueva.
6. `attention.js`: situaciones explícitas resueltas localmente. Las consultas comerciales combinadas conservan el intérprete y los límites previos.

Estados: `waiting → called → serving → completed`. Desde llamado puede marcarse ausencia; gerencia puede cancelar; el cambio de día expira estados activos. Cada actualización exige la revisión leída. Una ficha que cambia en otra pantalla devuelve 409 y obliga a actualizar.

API: `/api/admin/me`, `/api/admin/staff`, `/api/admin/content-releases`, `/api/admin/reception`, `/api/admin/reception/next`, `/api/admin/reception/desks`, `/api/admin/reception/tickets/:id`, `/api/reception/ticket` y `/api/reception/board`. Las mutaciones usan las protecciones existentes de origen, sesión y frecuencia. No existe endpoint para crear pagos ni realizar llamadas.
