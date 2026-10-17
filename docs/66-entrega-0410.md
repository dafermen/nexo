# Entrega 0.41 — Administración y evolución por negocio

17 de octubre de 2026.

## Implementación

- Portada administrativa por tareas, pestañas y presentación adaptable a móvil.
- Perfiles iniciales: capacidades comunes y extensión escolar; APIs de expedientes bloqueadas en negocio general.
- Borradores de catálogo/FAQ, fuente, diferencia, aprobación, publicación transaccional, retiro y recuperación como nueva propuesta.
- Componentes por paquete, instantáneas al asignar, entregas limitadas, reintentos idempotentes y reversos auditados. Clases y entregas no se descuentan dos veces.
- Proceso inicial ES/EN/FR por permiso y experiencia; derivación a recepción con servicio mínimo editable.
- Propuesta conservadora de los manuales de octubre: libro/permiso US$35; demás precios sin aprobación confirmada quedan pendientes; cinco horas solo informativo hasta confirmar condiciones. No se reescriben precios de reservas existentes.

## Evidencia local

354 pruebas unitarias/API aprobadas el 17/10/2026 en Windows con Node 24. Sintaxis validada en 179 archivos JavaScript; cobertura documental de 220 archivos propios, 10 referencias y 98 enlaces educativos. Se probaron publicaciones en navegador real, edición de FAQ, recuperación, escritorio/móvil y limpieza al salir. Expedientes incluye entrega/reverso de componentes, clases, grupos e informe. La agenda por voz existente se probó con datos sintéticos. No se consumieron proveedores de IA/video ni se enviaron correos reales.

El flujo CI incorpora `tests/publications.e2e.js`. La evidencia remota se consulta por commit en [GitHub Actions de Nexo](https://github.com/dafermen/nexo/actions). Las cifras de este documento corresponden a las ejecuciones verificadas en Windows y VPS Linux; no sustituyen el resultado del commit concreto en GitHub.

## Publicación y recuperación

El 17/10/2026 se publicó **0.41.0** en https://nexo.metodomogollon.com/ desde la versión 0.40.0. El manifiesto por archivo y SHA256 del paquete fueron comprobados al instalar. Las **354 pruebas también pasaron en Linux**, con Node 24.21.0. El preflight confirmó configuración, permisos, voces y versión de Node.

Se publicaron código y contenido conservador una sola vez. La segunda ejecución del actualizador local comprobó idempotencia. Se verificó que configuración de proveedores y reglas de agenda permanecieran idénticas; las reservas existentes conservan sus importes históricos.

La comprobación HTTPS autenticada como participante verificó versión, igualdad de archivos, catálogo, voz masculina y pantalla de sala sin datos personales. La sesión de participante no puede acceder a publicaciones, expedientes, personal, grupos privados ni documentación. Cinco horas queda informativo y excluido de nuevas reservas autónomas.

Se crearon respaldos cifrados antes y después. Ambos se copiaron a la carpeta privada local `.local/recovery` y se verificó igualdad SHA256 con el servidor. SQLite devolvió `integrity_check: ok` y el servicio y temporizador diario de respaldo están activos. La copia externa automática sigue pendiente. La nueva prueba de descifrado/restauración local no pudo ejecutarse porque el motor de Docker no estuvo disponible; la comprobación de integridad de SQLite y las firmas de los archivos sí se completaron. No se iniciaron sesiones pagadas ni se crearon citas o enviaron correos reales para esta entrega.

Las nuevas tablas son aditivas. No restaurar SQLite completa para revertir contenido: desde Publicaciones se recupera una versión comercial como borrador. Conservar las entregas y citas registradas después del respaldo. Al revertir código, la vuelta a 0.40.0 exige revisar contenido y cerrar sesiones; esa versión no conoce publicación informativa ni seguimiento de componentes. No volver a 0.38.0 con sesiones de personal vigentes.

## Trabajo dependiente de decisiones

- Vehículos de Héctor y Darío: falta saber si son propios o compartidos; no se afirma disponibilidad conjunta de profesor y vehículo.
- Plazos comerciales exactos, precios y políticas del curso/paquetes/Road Test; ver matriz de manuales.
- Editor configurable de procesos y traducciones comerciales, segunda instalación real y migración completa de editores directos al ciclo editorial.
- Aceptación física de voz/idiomas en kiosco/teléfono; respaldo externo automático y controles de retención/identidad.

Pagos, caja, créditos, telefonía y SMS no se implementaron. La clave del piloto permanece en el archivo de entorno protegido, fuera de la configuración comercial.

[Uso administrativo](65-administracion-publicaciones.md) · [Recorrido junior](codigo/publicaciones.md) · [Fases](64-fases-multinegocio.md).

## Revisión final 0.41.1

La revisión final refuerza la validación de respuestas propias del perfil general, muestra cambios de duración/visibilidad en la comparación y adapta las pruebas al menú «Más herramientas». La prueba inicial de CI detectó dos recorridos con selectores de la navegación anterior; se corrigieron sin reducir comprobaciones.

**355 pruebas unitarias/API aprobadas localmente.** También pasaron los once recorridos de navegador del flujo CI: acceso, FAQ visual, administración, configuración, kiosco, recepción, expedientes, publicaciones, voz, agenda por voz y documentación. Se repitieron las pruebas afectadas tras la corrección de validación. Los resultados remotos definitivos se consultan en GitHub Actions por commit. La activación de esta revisión conserva el contenido ya publicado y sus versiones recuperables.
