# Expedientes y servicios académicos

Versión 0.40.0 · Publicada en el VPS · 13 de octubre de 2026.

Esta entrega continúa el manual del cliente después de personal y recepción. Añade expedientes internos, clases y paquetes, solicitudes de grupos e informes diagnósticos. No activa pagos, caja, crédito de 72 horas, llamadas telefónicas ni SMS. La pantalla de turnos se mejorará posteriormente.

## Acceso y primer recorrido

Entre en **Administración → Personal y recepción → Expedientes y servicios** (`/students`). Use la misma cuenta del personal. No hay un segundo usuario o contraseña para el estudiante en esta entrega.

1. Busque por nombre, correo o ID antes de crear una ficha. La lista muestra 20 resultados por página y permite incluir archivados.
2. Cree el expediente con autorización del estudiante. Nombre e idioma son necesarios; correo y teléfono son opcionales. Asigne un profesor si corresponde.
3. Registre el estado declarado o revisado del permiso, las cinco horas y el Road Test. Son anotaciones del personal, no consultas ni certificaciones del DMV. No guardar números ni fotografías de documentos, contraseñas ni datos financieros.
4. Antes de informar a un visitante, compruebe su identidad y registre el método. Nexo deja constancia del responsable y hora.
5. Gerencia puede asignar un servicio/paquete, la cantidad de clases autorizadas y el tipo de clase que consume esas unidades. Por ejemplo: paquete de cinco clases → cinco unidades de clase práctica. Registre el origen de esa autorización académica.
6. Una vez realizada una clase, regístrela con el código de reserva de Nexo. Debe corresponder al correo del expediente, tipo de clase, profesor autorizado y una reserva confirmada cuyo horario ya terminó.
7. Las clases externas solo las registra gerencia, indicando fecha y referencia. Las correcciones devuelven la unidad al servicio mediante un reverso auditado. Nunca se descuenta una misma reserva dos veces.
8. Consulte clases asignadas, realizadas y pendientes. Cerrar una asignación impide nuevos consumos, conservando su historial.

Las reservas antiguas no se convierten automáticamente en estudiantes. Un correo puede ser compartido por una familia: no es una prueba suficiente de identidad. El vínculo de una clase siempre es una acción explícita del personal. La escuela debe revisar casos de correo compartido antes de registrar una clase.

## Identificación y privacidad

La verificación actual es **presencial o por contacto registrado, realizada y atestiguada por el personal**. El botón registra esa acción; no comprueba documentos ni envía OTP. La marca tiene una referencia de atención de quince minutos y no autoriza acceso al kiosco. Una nueva atención requiere comprobar de nuevo a la persona según el procedimiento del local.

El asistente y el chat no tienen herramientas para leer estos expedientes. Decir un nombre, correo, número de turno o código de reserva no abre una ficha privada. Una futura consulta autónoma del estudiante necesita autenticación propia, consentimiento y controles de sesión antes de conectarla al asistente.

| Cargo | Facultades |
|---|---|
| Propietario / gerente | Fichas, archivo/reactivación, asignación/cierre de servicios, clases externas y correcciones, grupos e informes. |
| Asesor | Buscar/editar fichas activas, atestiguar identidad, registrar clases de reservas válidas y solicitudes de grupo. Sin asignar unidades, corregir consumos ni finalizar evaluaciones. |
| Instructor | Solo estudiantes vinculados a su profesor; sin correo/teléfono ni auditoría de oficina. Registra sus reservas terminadas e informes de alumnos asignados. |

Una reasignación quita inmediatamente el acceso del profesor anterior. Las API repiten el control aunque alguien cambie el HTML o escriba una URL. El panel limpia datos al salir o vencer la inactividad; no utiliza localStorage para fichas o credenciales. El informe de impresión se genera solo al solicitarlo y se limpia al finalizar la impresión o cerrar sesión.

El archivo lógico conserva el historial y bloquea nuevas operaciones; no es borrado ni anonimización. Antes de incorporar expedientes reales en producción, definir retención, eliminación y responsabilidad de tratamiento con el cliente. Las copias cifradas existentes de SQLite incluyen estas tablas. La base activa conserva el modelo de protección del servidor; no se promete cifrado de cada campo.

Archivar cancela sus solicitudes internas de grupo para liberar capacidad; no cancela citas de Calendar. La ficha muestra hasta las 100 clases más recientes, 50 informes y 100 eventos de auditoría. Los datos anteriores permanecen en SQLite; su consulta histórica ampliada queda para reportes futuros.

## Grupos del curso y solicitudes

Gerencia crea grupos con servicio del catálogo, inicio y fin, idioma, lugar y capacidad de solicitudes. Estados: borrador, solicitudes abiertas, cerrado o cancelado. No se crean grupos con horarios históricos por defecto ni se publican fechas inventadas.

Los formularios indican la zona horaria del computador al introducir fechas; las consultas se presentan en la zona del negocio. Compruebe ambas antes de guardar, especialmente si administra desde otro país.

Desde la ficha se solicita revisión para un grupo o se usa lista de espera. Un grupo lleno rechaza nuevas solicitudes normales; no cambia automáticamente a lista de espera. La lista de espera tampoco se promueve sola. Oficina revisa y decide, con control de revisión para evitar cambios simultáneos.

**Una solicitud no es una inscripción confirmada ni un cupo pagado.** Mientras los pagos estén en pausa no existe transición a `confirmed`, cobro, recibo ni recordatorio automático. Abrir grupos organiza el trabajo interno. No modifica calendarios de los profesores ni envía mensajes al estudiante.

Con solicitudes activas no se cambia fecha, servicio, idioma o lugar silenciosamente. El personal debe cancelar/coordinar un nuevo grupo. Cancelar el grupo cancela sus solicitudes internas y conserva el historial; corresponde al personal comunicarlo por los medios autorizados.

## Evaluación diagnóstica

El instructor asignado o gerencia registra una evaluación ya realizada. Incluye doce competencias del manual, cada una con: satisfactorio, necesita mejorar, error crítico o no evaluada. No se rellenan logros que no se observaron.

Campos: fecha de finalización, fortalezas, habilidades por reforzar, incidentes, recomendación justificada, clases sugeridas, revisión de condiciones de participación, autorización para revisar un reporte aportado y constancia de entrega del informe.

- Revisar un reporte del DMV requiere registrar autorización. No se piden credenciales ni se accede a sistemas del DMV.
- Un error crítico exige una nota de seguridad para finalizar.
- El borrador es editable con revisión; el informe final es inmutable. Una nueva evaluación puede aclarar/corregir lo anterior sin borrar el original.
- El informe puede imprimirse o guardarse como PDF desde el navegador. No es un examen ni una certificación oficial.
- No se emite un diagnóstico automático con IA ni se vende un paquete a partir de una puntuación.

La tarifa de $25 y la posible bonificación dentro de 72 horas pertenecen al manual comercial; **no se calculan, aplican ni ofrecen como crédito activo en esta fase**. Reserva de evaluación, ruta, habilitación del instructor, condiciones legales/operativas, cobro y confirmación siguen sujetos al cierre de pendientes del cliente.

## Mantenimiento

El catálogo existente sigue siendo la fuente de nombres y precios. Asignar un servicio conserva una instantánea de su nombre y sus unidades; cambiar el catálogo mañana no reescribe el historial del estudiante. No hay una segunda lista de precios en el módulo de expedientes.

La tabla de grupos es independiente de las reservas individuales de Google Calendar. Cambiar la ficha no crea/cancela eventos ni envía correos. Las reservas por voz, video y texto mantienen su flujo actual.

## Pruebas y publicación

Pruebas: `npm test`, `npm run check`, `npm run docs:check`, `npm run test:students`. Los recorridos usan estudiantes ficticios, SQLite temporal y proveedores simulados. Revisan permisos por registro, reintentos, límite de unidades, cupos, revisiones simultáneas, privacidad e impresión.

Evidencia del 13 de octubre: recorrido de expedientes en navegador aprobado (escritorio y 390 px), recepción y agenda por voz sin regresiones, portal documental comprobado, respaldo local cifrado restaurado para comprobar integridad y servidor local verificado con versión 0.40.0. No se crearon estudiantes reales ni eventos de calendario. La nueva prueba de navegador está incorporada al flujo de GitHub Actions, cuya ejecución remota depende de publicar el código.

Esta entrega fue publicada en el VPS después de 343 pruebas aprobadas en Windows y Linux, respaldo cifrado, migración aditiva y comprobaciones HTTPS. No se copió la base local ni se cargaron expedientes de prueba en producción. La aceptación física y operativa del cliente sigue pendiente. Consulte el [acta de publicación](61-publicacion-0400.md).

## Recorrido para un desarrollador junior

1. `students.html` contiene la estructura vacía; `students-ui.js` autentica antes de pedir datos.
2. `app.js` exige sesión administrativa y permiso de ruta; toma el actor desde la sesión, nunca del formulario.
3. `student-store.js` aplica permisos por estudiante, valida entradas y ejecuta transacciones SQLite.
4. `requestId` identifica una intención de escritura. El mismo intento devuelve el resultado anterior; otros datos con ese ID se rechazan.
5. `revision` detecta una edición vieja. Un 409 exige actualizar y revisar, en lugar de sobrescribir.
6. El número pendiente se calcula con unidades asignadas menos clases no revertidas. La auditoría permite conocer quién hizo cada operación.

Consulte también [personal y recepción](59-personal-recepcion.md), el [manual junior](23-manual-desarrollador-junior.md) y la [referencia del código](codigo/expedientes.md).

## Componentes de paquetes — 0.41.0

Las nuevas asignaciones conservan una instantánea del catálogo. Oficina registra entregas limitadas a unidades pendientes, y gerencia puede revertir con motivo. Las clases asociadas usan exclusivamente el registro de clases. Se ocultan importes e historial de entregas de oficina al instructor. No se agregan componentes retroactivos a asignaciones antiguas. [Manual y límites](65-administracion-publicaciones.md).
