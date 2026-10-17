# Publicación de contenido y perfiles: recorrido para desarrollo

## Flujo completo

El navegador solicita el catálogo privado con la sesión del personal. `app.js` comprueba autenticación y cargo; `catalog-publication.js` valida cada campo y registra un borrador en SQLite. El borrador no participa en `listServices()` ni en el conocimiento público. Aprobar cambia su estado. Publicar comprueba nuevamente revisiones y escribe catálogo, FAQ, versiones y auditoría en una transacción. Después `app.js` invalida conversaciones abiertas.

`baseRevision` es la revisión del negocio que se copió al crear el borrador; `knowledgeRevision` identifica la FAQ original. `revision` cuenta cambios del propio borrador. Son controles distintos: el primero evita sobrescribir contenido publicado por otra persona y el último evita perder ediciones simultáneas del mismo borrador.

La biblioteca de audio identifica texto, idioma, voz y contexto. Publicar no convierte audios antiguos en respuestas nuevas; las conversaciones se invalidan y la configuración cambia de revisión. No se borran masivamente audios ni expedientes.

[Manual de uso](../65-administracion-publicaciones.md) · [Modelo de datos](../04-modelo-datos.md) · [Plan por fases](../64-fases-multinegocio.md).

## server/business-profile.js

`businessProfile(center)` recibe el centro persistido y devuelve ID de perfil, etiquetas y capacidades. Es una función sin efectos externos. Escuela se determina por el tipo configurado, con compatibilidad para instalaciones antiguas. `app.js` bloquea las rutas de expedientes/grupos en un negocio general. La separación actual es por instalación y base de datos; no ofrece varios clientes compartiendo una SQLite.

## server/catalog-publication.js

`createPublicationStore(db)` devuelve métodos de lectura, creación, edición, aprobación, publicación y recuperación. Requiere actor owner/manager. `validateComponents` devuelve una lista normalizada o un error 400. `publicationPublish` solo acepta un borrador aprobado y revisiones coincidentes. `BEGIN IMMEDIATE` agrupa los cambios; un error revierte toda la transacción. Las versiones contienen datos comerciales, nunca claves de proveedores ni fichas de estudiantes. `businessType` limita la lectura de borradores e historial al perfil vigente. `publicationRestore` crea una propuesta, no modifica el catálogo vigente.

## server/mogollon-current.js

`currentMogollon(document)` recibe una copia del catálogo y devuelve una propuesta comercial a partir de los manuales consolidados. Es pura: no abre SQLite ni llama proveedores. `sourceRef` identifica la procedencia y `publication` limita reservas de servicios pendientes. La propuesta reemplaza las FAQ del borrador y conserva en el historial las anteriores solo cuando se publica. No se ejecuta automáticamente en cada arranque.

## server/conversation-process.js

`conversationProcess(input)` recibe mensaje original, idioma, centro, servicios y estado de sesión. Devuelve una respuesta local o `null` para continuar por el filtro existente. `registry` selecciona el proceso del perfil; `state.process` guarda paso y datos temporales, nunca identidad o pagos. El filtro de riesgo se evalúa antes del proceso. Los textos de la revisión inicial solo se usan bajo sus condiciones esperadas: cambios comerciales deben pasar por catálogo/FAQ, evitando congelar un precio anterior. Los procesos son módulos de código; todavía no existe un editor gráfico de procesos arbitrarios.

## public/admin-workspace.js

`installAdminWorkspace()` reorganiza nodos del panel existente en Inicio, Agenda, Servicios y Reportes. Mantener IDs y manejadores evita duplicar formularios y consultas. Devuelve `update(data,role)` y `reset()`. La navegación usa fragmentos de URL y conserva `#audio-library`. La portada muestra tareas y cantidades; no sustituye autorización del servidor.

## public/admin-workspace.css

Estilos de tarjetas, navegación y formularios. Dos columnas pasan a una en pantallas pequeñas; las tarjetas administrativas pasan de tres a dos y una. Las reglas `[hidden]` del estilo base siguen ocultando elementos. No contiene lógica de acceso ni datos.

## public/publications.html

Estructura de la página privada, selección de servicios, editor visual de respuestas y botones del ciclo editorial. Los labels vinculan cada entrada con su propósito. Guardar, aprobar y publicar están separados para que la revisión sea explícita. El formato avanzado permite conservar el flujo anterior de archivo de texto. Tanto las FAQ escolares como las respuestas propias se validan con el mismo formato; el modo sin conocimiento desactiva su edición.

## public/publications.js

`token` vive en memoria, `epoch` descarta respuestas posteriores a salir y `busy` evita duplicar solicitudes simultáneas. `draft` conserva el borrador abierto y `dirty` exige guardarlo antes de aprobar/publicar. `collect` copia formularios al documento; `collectFaq` actualiza una respuesta; `compare` muestra diferencias mediante `textContent`, sin ejecutar HTML del negocio. `clear` elimina datos visibles de formularios y listas. El servidor siempre vuelve a validar: los botones deshabilitados no son una barrera de seguridad.

## tests/catalog-publication.test.js

SQLite en memoria y proveedores ficticios. Cubre privacidad de borradores, estados, restauración, conflictos catálogo/FAQ, permisos, perfiles independientes, publicación HTTP, invalidación de visitante, orientación ES/EN/FR, instantáneas y entregas con reverso y límite. No usa credenciales reales ni genera citas.

## tests/publications.e2e.js

Recorrido en navegador real: crear propuesta, editar servicio y FAQ visual, guardar, aprobar, publicar, recuperar, navegar administración, comprobar 390/1440 px y limpiar al salir. Las capturas usan una base sintética. `PLAYWRIGHT_MODULE` permite usar la instalación de pruebas; `BROWSER_CHANNEL` selecciona Edge local o Chromium en CI.

## Relación con expedientes

`student-store.js` conserva `catalogSnapshot` al asignar. `componentProgress` calcula pendientes a partir de eventos no revertidos; para componentes asociados a la clase utiliza `student_lessons`. `studentComponent` registra una entrega dentro de la transacción idempotente `mutate`; `studentComponentReverse` exige gerencia, revisión y motivo. Los instructores no reciben los importes de la instantánea. Los módulos completos se describen en [Expedientes](expedientes.md).
