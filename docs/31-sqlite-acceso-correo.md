# SQLite y acceso administrativo por correo

## Qué cambia en v0.13.0

SQLite es la fuente de datos operativos: catálogo, perfil y configuración del negocio, respuestas frecuentes, reservas de la demo, consumo agregado de IA, auditoría y acceso administrativo. La escuela conserva sus datos. Google Calendar y pagos continúan pendientes.

El archivo de instalación define quién administra y qué servidor envía los correos. Las claves de OpenAI, LiveAvatar y SMTP permanecen en el archivo local .env. El código, imágenes y documentación siguen como archivos. Desde v0.14.0 las preguntas y respuestas también se conservan en SQLite en un historial privado. El contexto utilizado por el agente sigue siendo temporal y separado por visitante. Consulte el [manual de historial](32-historial-conversaciones.md).

## Configurar al administrador

Archivo local: C:\Projects\Nexo\config\installation.json. No se publica por HTTP ni debe subirse a GitHub. Para otra instalación copie config/installation.example.json y complete sus propios valores.

- administratorEmails: lista completa de administradores autorizados (hasta 10). administratorEmail se conserva como formato anterior cuando no existe la lista.
- administratorLogin: auto, email o token.
- mail.host, port, secure: servidor SMTP. Gmail usa smtp.gmail.com, 465 y secure true.
- mail.from y mail.user: remitente y cuenta que autentica el envío.
- SMTP_PASSWORD en .env: contraseña de aplicación del remitente. Nunca se muestra en el panel.

En modo auto se mantiene ADMIN_TOKEN mientras falte configuración de correo. Al completar correo y contraseña, tras reiniciar se activa el código por correo y ADMIN_TOKEN deja de autorizar el panel. Esta detección comprueba que hay configuración, no que Gmail acepte la credencial.

El modo email exige códigos aunque falte configurar el envío. El modo token permite recuperación local con la clave anterior; solo una persona con acceso a los archivos del servidor puede cambiarlo. Cambiar el correo administrador y reiniciar invalida códigos y sesiones anteriores.

## Activar Gmail en esta PC

### Qué contraseña se necesita

Para entrar a Nexo no necesita crear una contraseña permanente: recibirá un código temporal por correo. La contraseña de aplicación de Google sirve únicamente para que el servidor de Nexo pueda enviar esos mensajes. Se configura una vez y no se introduce en la pantalla de Administración.

### 1. Crear la contraseña de aplicación en Google

1. Inicie sesión en Google con la cuenta que enviará los mensajes, indicada en mail.user del archivo de instalación.
2. Active la verificación en dos pasos si aún no está activa.
3. Abra [Contraseñas de aplicación de Google](https://myaccount.google.com/apppasswords). Google puede solicitarle iniciar sesión otra vez.
4. Si solicita un nombre para la aplicación, escriba Nexo y pulse Crear.
5. Copie la clave de 16 caracteres que Google le muestre. Consulte la [guía oficial](https://support.google.com/accounts/answer/185833?hl=es) si necesita ayuda.

### 2. Guardarla en la PC de Nexo

1. Abra la carpeta C:\Projects\Nexo en el Explorador de archivos.
2. Haga doble clic en CONFIGURAR-CORREO.cmd.
3. Pegue allí la clave y presione Enter. No verá los caracteres mientras los introduce; es el comportamiento esperado. El configurador elimina los espacios de separación.
4. Espere el mensaje de confirmación. El archivo actualiza únicamente SMTP_PASSWORD en .env, conservando las demás claves.
5. Reinicie Nexo cuando no haya una atención activa. Si lo inició manualmente, detenga esa instancia y vuelva a abrir INICIAR.cmd; no abra dos servidores a la vez.

También puede editar SMTP_PASSWORD directamente en el .env local. No utilice la contraseña habitual de Google ni pegue credenciales en chats, capturas, documentación o GitHub.

### 3. Entrar como administrador

1. Abra Administración y actualice la página después del reinicio.
2. Escriba el correo del administrador configurado y pulse Recibir código.
3. Revise la bandeja de entrada y spam.
4. Introduzca los ocho dígitos en la misma pantalla donde solicitó el código. Vence en diez minutos y se utiliza una sola vez.
5. Administración, Configuración y Respuestas frecuentes comparten el acceso. Cerrar sesión revoca la sesión y avisa a las otras pestañas.

### Si encuentra un problema

| Situación | Qué hacer |
|---|---|
| Google no muestra Contraseñas de aplicación | Compruebe la verificación en dos pasos y las restricciones indicadas en su guía. Si su cuenta no admite esta opción, use otro SMTP o planifique OAuth; no desactive la protección. |
| Nexo todavía pide la clave anterior | Reinicie el servidor y actualice Administración. Compruebe que guardó la credencial en la instalación activa y que administratorLogin está en auto o email. |
| No llega el código | Revise correo configurado y spam. Espere al menos un minuto antes de solicitar otro; existen límites de envío. El mensaje de solicitud por sí solo no garantiza la entrega. |
| El código aparece inválido o vencido | Use el más reciente en la pantalla donde lo solicitó. Después de diez minutos o cinco fallos debe pedir otro. |
| Gmail dejó de aceptar la credencial | Revise si cambió la contraseña de Google o revocó la contraseña de aplicación. Genere una nueva si corresponde, guárdela localmente y reinicie. |

**Estado verificado el 19/09/2026:** credencial de Gmail guardada localmente, servidor reiniciado y acceso por correo activo. Se comprobó la autenticación SMTP y la auditoría registra un correo aceptado por el servidor de correo y un ingreso administrativo correcto con código. No se guardan aquí contraseñas, códigos ni direcciones privadas.

## Flujo y protección

1. El navegador solicita un código al servidor de Nexo.
2. El servidor solo envía al correo configurado. Responde con un mensaje condicional que no confirma si el correo ingresado existe.
3. Genera ocho dígitos aleatorios. SQLite guarda el verificador scrypt y una sal; no guarda el código original.
4. Nodemailer entrega el mensaje a SMTP con TLS y sin logs de contenido. La aceptación por SMTP no garantiza que llegue a la bandeja principal.
5. El código vence en diez minutos, permite cinco intentos y se consume una vez. Un código nuevo invalida el anterior.
6. El ingreso crea una cookie HttpOnly, SameSite Strict y ruta /api. Con el origen HTTPS configurado se añade Secure. SQLite guarda solo el hash del token.
7. La sesión vence después de cinco minutos sin actividad o, como máximo, ocho horas. Cerrar sesión revoca el acceso y avisa a las otras pestañas.

Reenvíos: uno por minuto, cinco por hora y veinte por día, por instalación. Solicitudes: diez por quince minutos por IP. Verificaciones: treinta por quince minutos por IP. Los límites sobreviven a reinicios. Detrás de un proxy se usa su IP de conexión; no se confía en cabeceras de IP enviadas por el navegador.

Los códigos vencidos pierden su verificador y los registros de desafíos se eliminan después de un día. Las sesiones y límites vencidos se depuran periódicamente; con el servidor apagado no hay depuración física. La auditoría conserva acciones, sin códigos ni mensajes de correo.

## Respuestas frecuentes en SQLite

En Administración → Respuestas frecuentes se abre /knowledge. El primer arranque importa conocimiento/preguntas-frecuentes.txt **una sola vez** si todavía no existe la base escolar. Las siguientes lecturas utilizan SQLite. Editar el archivo original después de la importación no cambia las respuestas activas.

El editor conserva el formato de texto documentado en [Preguntas frecuentes](21-preguntas-frecuentes.md): hasta 5.000 temas, veinte variantes por tema y cuatro MB. Valida antes de guardar; una revisión evita sobrescribir cambios de otra ventana. No hace falta reiniciar para aplicar respuestas válidas.

Para otros negocios, las respuestas propias del módulo Configuración ya se guardan en SQLite; ese editor conserva su límite de 8.000 caracteres. La base escolar no se habilita en negocios de otro tipo. Un editor visual por temas y un importador/exportador explícito siguen pendientes.

VALIDAR-RESPUESTAS.cmd valida las respuestas de SQLite cuando existe la base; en una instalación nueva valida el archivo inicial. Puede validar explícitamente ese archivo con node scripts/validate-faq.js --seed.

## Tablas y componentes

| Tabla | Contenido |
|---|---|
| center_settings | Perfil, catálogo comercial y configuración con revisión |
| services, appointments | Catálogo y reservas de la demo original |
| knowledge_bases | Texto de respuestas, versión y fecha |
| administrators | Correo administrador de la instalación |
| admin_challenges | Verificadores de códigos, estado, intentos y vencimiento |
| admin_sessions | Hash de sesión y vencimientos |
| auth_limits | Ventanas de límite persistentes |
| ai_daily_usage | Consumo agregado |
| audit_events | Acciones operativas sin secretos |

server/installation.js valida el archivo; admin-auth.js aplica reglas; admin-store.js persiste; providers/admin-mail.js encapsula SMTP. public/admin-access.js comparte el ingreso entre Administración, Configuración y Respuestas. sqlite-faq.js usa el mismo parser y buscador existentes.

Las rutas /api/auth/config, request y verify son parte del ingreso. Las rutas privadas /api/admin/* comprueban la sesión en el servidor. /api/auth/logout revoca la sesión. /api/admin/knowledge exige autenticación para leer y guardar.

## Instalación, respaldo y pruebas

En una PC nueva use Node 24 y ejecute npm ci antes de arrancar. package-lock.json fija Nodemailer; su [licencia](NODEMAILER-LICENSE.txt) se conserva en el proyecto. La interfaz sigue sin una cadena de compilación.

Respalde SQLite con el servidor detenido o con VACUUM INTO / la API de respaldo de SQLite. Copiar solo el archivo .sqlite mientras hay escritura WAL puede omitir datos. Guarde por separado los archivos privados de configuración y restrinja su acceso. La base no está cifrada; depende de los permisos del equipo y del respaldo. Antes de revertir una versión, conserve también la copia actual.

Pruebas: npm test y npm run check. El escenario de navegador es npm run test:access, con Playwright instalado. Los dobles de SMTP permiten comprobar ingreso, errores, persistencia, edición y cierre sin correo, OpenAI ni LiveAvatar reales.

Referencias: [SMTP de Nodemailer](https://nodemailer.com/smtp), [recomendaciones de OWASP para tokens de recuperación](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). Desde v0.25.1 admite varios administradores con iguales permisos, códigos independientes y revocación individual. Roles diferenciados y validación física del iPad siguen pendientes. El despliegue web se describe en la guía 47.


## Agregar otro administrador

Edite la configuración privada `config/installation.json` (local) o `/etc/nexo/installation.json` (VPS): agregue el correo en `administratorEmails`, conservando los existentes. No cambie `mail.user`, `mail.from` ni la contraseña SMTP para agregar usuarios. Reinicie Nexo. Cada administrador escribe su propio correo en la pantalla de acceso y recibe únicamente su código. Quitar un correo y reiniciar revoca sus códigos y sesiones sin cerrar los demás. La base anterior se migra conservando sus IDs y claves foráneas; respalde SQLite antes de actualizar.
