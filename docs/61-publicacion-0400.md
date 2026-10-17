# Publicación de Nexo 0.40.0

13 de octubre de 2026 · https://nexo.metodomogollon.com/

## Alcance publicado

Actualización desde 0.38.0 a 0.40.0: contenido del manual, cuentas por cargo, recepción presencial, pantalla de sala, expedientes internos, seguimiento de clases y paquetes, grupos con solicitudes e informes diagnósticos imprimibles.

Acceso: Administración → Personal y recepción → Expedientes y servicios. El acceso privado del piloto y la autenticación del personal siguen siendo independientes. No se crearon cuentas de empleados ni estudiantes ficticios en el VPS.

## Validaciones

- Paquete formado desde una lista de archivos permitidos, sin `.env`, SQLite, sesiones, audios privados ni claves. Verificado por SHA256 y manifiesto por archivo al instalar.
- 343 pruebas unitarias y de API aprobadas tanto en Windows como en el VPS Linux, sin proveedores pagados. Sintaxis de 171 archivos JavaScript comprobada.
- Navegador local: expedientes en escritorio/móvil, recepción, portal documental y agenda por voz con datos sintéticos.
- Preflight Linux: Node, permisos, configuración privada y voces ES/EN/FR válidos.
- Respaldos cifrados previo y posterior, copiados fuera del servidor a la PC. La agenda, conexiones y otros servicios se comprobaron antes/después de aplicar el contenido del manual.
- HTTPS público: certificado aceptado sin excepciones, barrera de participantes, cabeceras, rechazo de origen ajeno, rutas sensibles y API administrativas protegidas.
- Acceso de participante: versión 0.40.0, archivos de personal/expedientes/sala, precios aprobados, modalidad presencial y horarios por confirmar verificados. El acceso del participante no permite leer expedientes, grupos privados, cuentas ni documentación administrativa.

No se iniciaron llamadas a OpenAI o LiveAvatar, no se crearon/cancelaron citas reales ni se enviaron correos de prueba en esta publicación. Las comprobaciones administrativas completas se ejecutaron con dobles de correo; no sustituyen la entrada real del cliente con su propio código.

## Preservación y recuperación

El VPS conserva su configuración, OAuth y base de datos. La actualización comercial `mogollon-manual-fases123-20261013-v1` se aplicó una sola vez: dos servicios y once temas de conocimiento. No se vuelve a aplicar al reiniciar y no sobrescribe futuras ediciones.

Los respaldos cifrados de esta entrega están en `/var/backups/nexo` y en la carpeta privada local `.local/recovery`. La clave de recuperación se conserva por separado. La copia externa automática periódica sigue pendiente; las copias de esta entrega fueron manuales.

El primer intento de activación encontró el script auxiliar dentro de un directorio privado inaccesible al usuario del servicio; la reversión restauró 0.38.0 sin modificar el contenido comercial. Se corrigió la ubicación del script sin abrir ese directorio y la activación siguiente terminó correctamente.

No regresar a 0.38.0 con cuentas nuevas de personal activas: esa versión no conoce cargos. Se deben revocar sesiones/códigos del personal y revisar los cambios de datos antes de revertir. El procedimiento usado conserva el estado comercial anterior sin reemplazar reservas posteriores.

## Pendientes que permanecen

- Cuentas y escritorios reales; aceptación física de voz, idiomas, pantalla de sala y flujo de atención.
- Política de retención/eliminación y procedimiento de comprobación de identidad antes de incorporar expedientes reales.
- Autenticación propia del estudiante para futura consulta autónoma; el chat público no lee expedientes.
- Mejora visual de la pantalla de turnos, solicitada para el siguiente trabajo.
- Pagos, inscripción definitiva pagada, crédito de evaluación, telefonía y SMS permanecen en pausa o pendientes.
- Publicación del código de esta entrega en GitHub y ejecución remota del flujo CI se verifican por separado; aprobar pruebas en el VPS no equivale a una ejecución de GitHub Actions.

Manuales: [Personal y recepción](59-personal-recepcion.md), [Expedientes y servicios](60-expedientes-servicios.md), [Desarrollador junior](23-manual-desarrollador-junior.md).
