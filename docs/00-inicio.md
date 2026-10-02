# Bienvenido a la documentación de Nexo

- [SQLite y acceso administrativo por correo](31-sqlite-acceso-correo.md)

Nexo es el asistente de la Escuela de Conducción «MetodoMogollon». Este portal reúne la documentación del proyecto: operación, desarrollo, decisiones, validaciones y trabajo pendiente.

## Empiece aquí

| Si necesita… | Abra… |
|---|---|
| Configurar identidad y atención de otro negocio | [Configuración por negocio](30-configuracion-negocio.md) |
| Entender qué funciona hoy | [Estado actual, fases y tareas](25-fases-y-tareas.md) |
| Aprender a desarrollar en Nexo | [Manual del desarrollador junior](23-manual-desarrollador-junior.md) |
| Entender Git, ramas y GitHub | [Manual de GitHub](24-manual-github.md) |
| Usar y mantener el kiosco | [Manual de operación](26-manual-operacion.md) |
| Preparar una nueva tarea | [Metodología y plantillas](27-metodologia-y-plantillas.md) |
| Retomar el trabajo en otra sesión | [Continuidad del proyecto](28-continuidad.md) |
| Entender cómo responde el agente | [Interpretación de consultas](22-interpretacion-intencion.md) |
| Añadir documentación al portal | [Mantenimiento de la biblioteca](29-portal-documentacion.md) |

## Estado de la aplicación

La aplicación funciona en la PC local desde `C:\Projects\Nexo`, en `http://localhost:3000`. Ofrece consulta escrita, llamada por voz con retrato y videollamada con LiveAvatar. El catálogo y los horarios de atención se administran localmente. El agente combina preguntas frecuentes, reglas y OpenAI.

Google Calendar está conectado para el piloto de reservas. El chat consulta disponibilidad y prepara la selección; solo el formulario confirmado registra la cita. No se realizan pagos. Precios, requisitos y modalidades que no han sido proporcionados permanecen por confirmar.

La etapa inicial usa LiveAvatar; MetaHuman es una etapa futura que necesita evaluar renderizado y transmisión desde una máquina adecuada. El iPad físico y el piloto presencial siguen pendientes.

## Cómo leer los documentos

Los documentos 01 a 15 conservan el diseño inicial y su evolución, incluidas reservas de demostración y experimentos de avatar. Sirven como antecedentes. Para conocer el comportamiento vigente, use las guías 16 en adelante y el tablero de fases.

Una capacidad de la demo histórica no equivale a una integración disponible para la escuela. Un test con un proveedor simulado tampoco equivale a haber probado micrófono, cámara o video reales.

## Cómo usar el portal

- Use el buscador para localizar contenido por palabra; también busca dentro de los documentos.
- Explore por tema o abra las rutas de lectura de la portada.
- «Fases y tareas» muestra trabajo realizado y pendiente con evidencia o criterio de aceptación.
- Cada documento permite descargar su archivo de texto, imprimirlo o copiar su enlace.
- Los documentos se leen de los archivos locales del proyecto. Al editarlos y actualizar el portal verá los cambios.

El enlace de entrada está en Administración y abre una pestaña nueva. La documentación no inicia llamadas ni consulta proveedores de IA. No publica `.env`, bases de datos, registros del servidor ni credenciales.

## Historial de atención

[Conversaciones, descarga en texto y métricas](32-historial-conversaciones.md): disponible desde Administración → Conversaciones.

## Conectar Google Calendar

[Guía de autorización y pruebas](33-google-calendar.md): entre a Configuración → Conexiones. La conexión del piloto está autorizada; consulte la guía para nuevas instalaciones y comprobaciones.


## Atención en tres idiomas — v0.23.0

NEXO-41: selector Español · English · Français en el inicio, voz y conversación por idioma, fechas y formularios localizados, y correo de nuevas reservas en el idioma elegido. [Operación, arquitectura, pruebas y límites](39-idiomas.md). Los textos comerciales nuevos requieren traducciones revisadas; queda pendiente su editor en Administración y la validación con hablantes nativos.


## Biblioteca de audio — v0.24.0

NEXO-42: audio generado reutilizable para respuestas aprobadas, con metadatos SQLite y archivos WAV privados. Administración permite consultar el uso y vaciar audios; presupuesto inicial de 128 MB y caducidad de 30 días. [Alcance, arquitectura, privacidad y pruebas](40-biblioteca-audio.md). La voz actual sigue siendo local; no supone ahorro por sesión de LiveAvatar.

## Aprender el código de Nexo

[Manual junior](23-manual-desarrollador-junior.md) · [Mapa y referencia por archivo](41-mapa-codigo-fuente.md) · [Recorridos de ejecución](42-recorridos-ejecucion.md) · [Datos y contratos](43-datos-y-contratos.md) · [Prácticas y mantenimiento](44-practicas-desarrollo.md).

## Piloto web en Linux

- [Instalar y operar el VPS](45-despliegue-piloto-linux.md).
- [Controles, evidencia y aceptación de seguridad](46-seguridad-piloto.md).


## Calendarios por profesor — v0.28.0

[Elección del alumno, cupos, configuración y recorrido del código](50-calendarios-por-profesor.md). Incluye compatibilidad con la agenda única y conservación del calendario de cada cita. El acceso del personal se reúne en Administración.


## Operación de profesores — v0.29.0

[Nombre sugerido desde Calendar, filtro por profesor e historial, pruebas y pendientes vigentes](51-operacion-profesores-y-pendientes.md). El nombre puede corregirse; las citas conservan su asignación original.


## Deshabilitar y reasignar — v0.30.0

[Manual de traslado de citas entre profesores](52-deshabilitar-y-reasignar-profesores.md): vista previa, conflictos, pausa opcional, historial y recuperación. Mantiene día/hora/código; no mueve citas existentes al configurar profesores.

## Nuevas guías ilustradas

[Editor visual de respuestas y pruebas automáticas](55-editor-visual-github.md): captura del editor, flujo de publicación de conocimiento y recorrido GitHub.

[Contenido aprobado del curso y libro; cómo actualizarlo](56-curso-libro-contenido.md).

## DOC-STD-20261002 — Fuentes canónicas

Estándar documental v1.0 · revisión 2026-10-02. Idioma principal: español.

Asistente y administración para un negocio con piloto protegido.

Conservar la documentación numerada. El acceso inicial al piloto y el acceso administrativo por correo son controles diferentes. La configuración del negocio, agenda, respaldos y SQLite se documentan en sus capítulos propios; no trasladar credenciales ni datos del negocio a las guías públicas.

| Necesidad | Fuente oficial |
| --- | --- |
| Presentación | [README.md](../README.md) |
| Estado vigente | [docs/28-continuidad.md](28-continuidad.md) |
| Desarrollo | [docs/23-manual-desarrollador-junior.md](23-manual-desarrollador-junior.md) |
| Arquitectura | [docs/03-arquitectura.md](03-arquitectura.md) |
| Uso | [docs/05-flujos-usuario.md](05-flujos-usuario.md) |
| Pruebas | [docs/08-validacion.md](08-validacion.md) |
| Seguridad | [docs/46-seguridad-piloto.md](46-seguridad-piloto.md) |
| Despliegue | [docs/45-despliegue-piloto-linux.md](45-despliegue-piloto-linux.md) |
| Operación | [docs/26-manual-operacion.md](26-manual-operacion.md) |
| Acceso piloto | [docs/53-configurar-acceso-piloto.md](53-configurar-acceso-piloto.md) |
| Datos | [docs/04-modelo-datos.md](04-modelo-datos.md) |
| Portal | [docs/29-portal-documentacion.md](29-portal-documentacion.md) |

Para probar el producto, comenzar por presentación, estado y uso. Para desarrollar, continuar con instalación, arquitectura y pruebas. Para operar, consultar despliegue, seguridad y recuperación. El índice detallado existente conserva su validez.

### Evidencia y actualización

Separar estado vigente, historia y decisiones. Los resultados de pruebas fechados conservan su valor histórico. Este mapa no vuelve a ejecutar todos los comandos documentados ni cierra la aceptación pendiente del producto. Registrar las comprobaciones realmente ejecutadas, su entorno y sus límites antes de publicar.

Actualizar la guía de origen al cambiar comandos, configuración, comportamiento, permisos o despliegue. Mantener enlaces y rutas del portal. Usar capturas reales con datos sintéticos; nunca publicar valores de .env, claves, datos de usuarios ni logs operativos. Un commit local, un commit remoto y un artefacto desplegado son estados diferentes.
