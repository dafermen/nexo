# Administración de MetodoMogollon

> **Vigente desde v0.13.0:** las respuestas activas se guardan en SQLite y se editan en Administración → Respuestas frecuentes. El archivo inicial se importa una vez. El acceso admite códigos por correo tras configurar SMTP. [Guía de SQLite y acceso](31-sqlite-acceso-correo.md).

## Agenda actual (v0.26.0)

Use **Agenda y citas** para listar, filtrar por fechas/cliente/servicio, ver día o semana, consultar disponibilidad y cancelar con motivo. [Manual completo de agenda](48-agenda-administrativa.md).

El piloto usa acceso por correo para los administradores autorizados. La información siguiente documenta la versión histórica 0.5.0; no representa las restricciones actuales de Calendar ni del acceso. Para autenticación vigente consulte la [guía de acceso](31-sqlite-acceso-correo.md).

## Referencia histórica: versión 0.5.0 · 16 de septiembre de 2026

## Abrir el panel

1. Inicie Nexo desde C:\Projects\Nexo\INICIAR.cmd si el servidor está apagado.
2. Abra C:\Projects\Nexo\ABRIR-ADMIN.cmd. El acceso copia la clave administrativa al portapapeles y abre http://localhost:3000/admin.
3. Pegue la clave en el campo de acceso y pulse Entrar. Esta clave es ADMIN_TOKEN en la configuración local; no es la clave de OpenAI ni de LiveAvatar.
4. Al terminar, cierre la sesión y copie otro texto para retirar la clave del portapapeles. No utilice este acceso en un kiosco de visitantes sin supervisión.

La credencial solo vive en memoria en el navegador. No se guarda en localStorage, cookies ni en la URL. El panel limpia sus datos al salir o tras cinco minutos sin actividad. La copia al portapapeles ocurre únicamente al ejecutar el acceso local; la app no lo modifica automáticamente. La autenticación actual sigue siendo una clave compartida de piloto, no usuarios/roles individuales.

## Servicios

Permite añadir, editar y pausar servicios. Campos: nombre, descripción, precio en USD, duración en minutos, modalidad y requisitos. Para pausar, desmarque Mostrar este servicio en el kiosco. Los registros no se eliminan.

- Precio vacío: pendiente de confirmación. Cero: gratuito. Se conservan céntimos enteros, sin aproximar en el servidor.
- Duración vacía: pendiente; si se completa, entre 1 y 1440 minutos.
- Modalidad: pendiente, presencial, virtual o presencial y virtual.
- Requisitos vacíos: pendientes de confirmación; no significa ausencia de requisitos.
- Al guardar se publica la información. No hay un paso de borrador separado.

Los valores iniciales siguen siendo los proporcionados por el responsable: no se añadieron precios ni requisitos de prueba a la base real. Los ensayos de edición se ejecutaron sobre bases aisladas.

## Escuela y horarios

Puede cambiar el nombre de la escuela, apertura y cierre por cada día, y marcar días cerrados. Un intervalo diario; el cierre debe ser posterior a la apertura. La zona sigue siendo America/New_York. No incluye intervalos partidos, feriados ni horarios que crucen medianoche.

El horario de atención no representa cupos disponibles. Google Calendar continúa pendiente; guardar aquí no crea eventos ni habilita reservas.

## Actualización y conservación

La tabla SQLite center_settings contiene el perfil y catálogo en un documento JSON, con revisión y fecha de actualización. La creación inicial usa INSERT OR IGNORE, por lo que reiniciar no sobrescribe las ediciones. Las tablas anteriores de servicios y turnos permanecen intactas. audit_events registra center.updated, sin incluir secretos ni contenido editado.

Cada guardado exige la revisión que abrió el editor. Si otra ventana cambió los datos, devuelve 409 y conserva lo guardado; cierre el editor y actualice antes de volver a editar. La transacción BEGIN IMMEDIATE protege escrituras concurrentes. Los campos editables se validan en el servidor; el panel no puede habilitar pagos ni Google Calendar.

La siguiente consulta a la IA toma el catálogo vigente, sin servicios pausados. Una respuesta ya en curso utiliza los datos con los que comenzó. La pantalla del kiosco actualiza su catálogo cada 15 segundos cuando está inactiva, o al recuperar el foco/pulsar Servicios; no interrumpe video, respuestas en curso ni fichas abiertas. Cierre una ficha para permitir la actualización.

## API y pruebas

- GET /api/admin/overview: datos administrativos y revisión, requiere credencial.
- PUT /api/admin/center: revisión y perfil (nombre, siete días).
- POST /api/admin/services: revisión y nuevo servicio.
- PUT /api/admin/services/:id: revisión y servicio editado.
- La agenda local sigue bloqueada para este perfil.

Validación: 69 pruebas API/componentes aprobadas; edición, persistencia tras reabrir SQLite, desconocido frente a cero, pausa, rechazo de precios/horarios inválidos, autenticación y conflictos concurrentes. El recorrido npm run test:admin verifica edición desde Edge, actualización de un kiosco ya abierto, alta pausada, horarios, vista móvil y cierre de sesión con datos aislados, sin OpenAI ni LiveAvatar. Requiere Playwright y navegador instalados (PLAYWRIGHT_MODULE y BROWSER_CHANNEL permiten indicar los del entorno).

## Reportes, avisos y respaldo (v0.27.0)

Consulte la [guía de estadísticas, avisos y recuperación](49-reportes-avisos-respaldos.md), con flujos, contratos, estados de correo, alcance de las métricas y restauración paso a paso.

## Ayuda y opciones: versión y accesos (v0.27.1)

El menú del kiosco muestra versión y fecha de actualización de esa versión, también en inglés y francés. Los valores proceden de `package.json` (`version` y `releaseDate`), publicados por `/api/config` sin datos privados. Se muestran en fecha ISO año-mes-día. Reiniciar el servidor, guardar configuración o editar un servicio no cambia esa fecha. Al preparar una publicación, actualizar ambos campos y la versión del lockfile; la interfaz vuelve a consultar metadatos al refrescar catálogo.

**Administración** reúne la operación diaria: citas, catálogo de servicios, reportes, preguntas y respaldos. **Configuración** parametriza el negocio y el comportamiento de Nexo: idiomas, voz, IA, presupuestos y conexiones como Calendar. Son áreas del mismo sistema, con el mismo acceso administrativo; desde Administración se puede abrir Configuración. Desde v0.28.0, Ayuda y opciones muestra un único acceso «Administración». Configuración y Documentación se abren desde esa área. Consulte [Calendarios por profesor](50-calendarios-por-profesor.md).
