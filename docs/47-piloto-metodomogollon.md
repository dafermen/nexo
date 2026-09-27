# Piloto de Nexo: MetodoMogollon

## Destino y aislamiento

Dirección principal: https://nexo.metodomogollon.com/ . VPS Ubuntu 24.04 x86_64 existente con Nginx. Nexo usa 127.0.0.1:3300, usuario de servicio propio, Node dedicado y SQLite privado. No se reemplaza el proxy de otras aplicaciones ni se usa el puerto 3000, ya ocupado.

El único dominio del piloto es `nexo.metodomogollon.com`, confirmado por el usuario. No hay un alias adicional pendiente de configurar.

## Administradores

Las instalaciones local y del VPS tienen dos administradores autorizados: el propietario y Héctor. Los correos están guardados en su configuración privada. Cada uno solicita un código enviado exclusivamente a su dirección; no recibe el código del otro. Agregar una dirección no envía un mensaje automáticamente.

El acceso compartido del piloto sigue separado del administrador. La contraseña de participante se entrega mediante archivo privado local, nunca se incluye en el paquete público ni en los logs.

## Datos e integraciones

El usuario autorizó expresamente la transferencia y se trasladaron la configuración comercial, el catálogo, la base de preguntas frecuentes y las claves de OpenAI, LiveAvatar, SMTP y cliente OAuth de Google. Se usó SSH y archivos privados fuera del código. No se trasladaron conversaciones, datos de alumnos, reservas ni sesiones de administración.

Google Calendar requiere registrar en el cliente OAuth el retorno `https://nexo.metodomogollon.com/api/calendar/oauth/callback` y completar la conexión desde Configuración en el piloto; los tokens locales no se copiaron. La selección prevista sigue siendo «Mogollon Method». Las reservas están desactivadas en el VPS hasta conectar Calendar. Después, habilitar la clase práctica de 60 minutos y revisar disponibilidad, registro del evento y correo antes de aceptar reservas reales.

## Validación y operación

El piloto está habilitado para validar la interfaz y la conversación. Las validaciones de micrófono/video en dispositivos físicos del cliente requieren su participación. El código tiene 253 pruebas automatizadas aprobadas, incluidos códigos independientes y migración del esquema administrativo. Estas comprobaciones reducen riesgos; no equivalen a una garantía de seguridad absoluta ni a una auditoría externa.

## Acta de comprobaciones del 26/09/2026

- Acceso SSH verificado con la clave indicada y host conocido; autenticación por contraseña deshabilitada.
- Firewall activo, puertos 22/80/443 accesibles desde fuera; 3000/3300/2019/5432 sin respuesta externa.
- Certificado emitido para el dominio principal, vence el 25/12/2026; renovación simulada con Certbot aprobada y recarga de Nginx preparada tras futuras renovaciones. HTTPS validado desde el VPS y la PC, sin desactivar comprobaciones TLS. HTTP redirige a HTTPS.
- Node 24.21.0 propio en `/opt/node`; código en `/opt/nexo/current`; Nginx y otros sitios existentes conservados.
- 253 pruebas aprobadas también en el VPS; WAV español, inglés y francés generados como usuario nexo.
- Servicio de Nexo activo y habilitado al reiniciar. Entrada privada al piloto por contraseña, distinta del código de administrador por correo. Variables y configuración: root:nexo, permisos 0640; directorio de datos privado 0700; aplicación en 127.0.0.1:3300.
- Comprobaciones públicas HTTPS aprobadas: entrada protegida, API privada, bloqueo de peticiones de otros sitios y cabeceras de seguridad. Navegador real con certificado válido: acceso, home sin desbordamiento horizontal a 390/768/1920 píxeles, administración/documentación protegidas y cierre de acceso.
- Saludo respondido localmente y audio sintetizado por Piper mediante HTTPS en el servicio desplegado. No se iniciaron sesiones LiveAvatar ni se realizaron consultas pagadas a OpenAI durante estas validaciones.
- SMTP: conexión TLS y autenticación reales aprobadas desde el VPS. No se enviaron correos; entrega al buzón y acceso administrativo completo en producción quedan pendientes de la prueba del usuario. Los códigos independientes de los dos administradores ya tienen pruebas automatizadas con correo simulado.
- Respaldo inicial cifrado creado y copiado a la PC; restauración real comprobada en contenedor local sin red y con descifrado temporal en memoria: SQLite íntegro, relaciones válidas, dos administradores, catálogo, FAQs y configuración presentes. Clave privada de recuperación conservada en la PC con permisos limitados; solo su destinatario público está en el servidor. Respaldo diario habilitado.
- Pendientes: entrega real de correo/acceso administrativo, autorización Calendar y prueba de reserva, micrófono en dispositivos del cliente y video LiveAvatar (máximo 60 segundos). El envío automatizado de un correo de prueba sigue pendiente de la autorización solicitada por separado.

No se modificaron DNS ni accesos de otros proyectos. El piloto permite pruebas de atención, pero todavía no debe aceptar reservas reales hasta completar Calendar.

Los recorridos de navegador del acceso por correo y del piloto HTTPS también aprobaron con dobles (sin envío real). El verificador de sintaxis solo enumera carpetas de código y evita acceder a datos, respaldos o claves de recuperación.

## Primera entrada y recuperación

1. Abrir la dirección HTTPS del piloto e introducir la contraseña entregada al propietario mediante el archivo privado local `C:\Projects\Nexo\.local\recovery\ACCESO-PILOTO.txt`. No publicar ni agregar ese archivo al código.
2. Para administrar, entrar a `/admin`, indicar uno de los correos autorizados y solicitar su código. La contraseña del piloto no sustituye ese código.
3. Completar Calendar desde `/settings` antes de habilitar reservas. El cliente OAuth debe conservar también el retorno local si se sigue usando la PC para desarrollo.
4. Los respaldos cifrados se guardan en `/var/backups/nexo` diariamente; el primero también está en la carpeta privada `recovery` de la PC. La copia externa automática de futuros respaldos aún debe configurarse. Conservar la clave de recuperación en un lugar seguro separado del VPS: sin ella no se puede recuperar el respaldo.

## Actualización v0.26.0: agenda administrativa

Google OAuth fue autorizado por el usuario en el dominio HTTPS. Se seleccionó el calendario único y escribible «Mogollon Method», se verificó lectura y se habilitó Clase práctica de 60 minutos con las reglas existentes. La disponibilidad real respondió correctamente; las reservas ya no están suspendidas por falta de conexión. Esta actualización sustituye las notas de Calendar pendiente del acta inicial.

Se añade [Agenda y citas](48-agenda-administrativa.md) con 260 pruebas unitarias/API aprobadas y recorridos de navegador con proveedores simulados. No se crearon ni cancelaron citas reales. La entrega real de correo al buzón y las pruebas físicas del cliente siguen pendientes. No se transfirieron nuevamente credenciales ni se reemplazaron datos de negocio durante esta actualización.


## Actualización preparada v0.29.0

Nombres sugeridos desde Calendar y filtro por profesor, con compatibilidad para agenda única e historial. [Operación y validación](51-operacion-profesores-y-pendientes.md). La activación conserva la configuración vigente; no habilita profesores ficticios. El despliegue usa respaldo cifrado previo, verificación del paquete, pruebas Linux y retorno a la versión anterior si falla el arranque.

## Acceso privado configurable — v0.31.0

[Activar o desactivar el piloto y asignar su clave](53-configurar-acceso-piloto.md). El VPS conserva `DEPLOYMENT_MODE=pilot`; `PILOT_PRIVATE_ENABLED` controla solamente la entrada de participantes.
