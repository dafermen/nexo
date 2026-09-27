# Google Calendar: conexión, selección y pruebas

## Alcance de esta entrega — v0.15.0

Configuración → Conexiones incluye un panel de Google Calendar con autorización de cuenta, lista de calendarios, selección persistente y pruebas de lectura y escritura. El calendario previsto para el piloto es **Mogollon Method**. El nombre no identifica de forma única un calendario: Nexo guarda el identificador que devuelve Google, junto con su nombre y zona horaria.

La integración está implementada y **la conexión real fue autorizada y verificada el 26/09/2026**. Se creó e instaló el cliente OAuth web de Nexo, el responsable autorizó los permisos y quedó seleccionado **Mogollon Method**, con zona horaria **America/New_York**. La comprobación real de lectura fue satisfactoria. También se creó, leyó y eliminó correctamente un evento temporal identificado como prueba de Nexo. Las pruebas automatizadas con Google simulado se mantienen separadas de esta verificación real.

La v0.15.0 preparó la conexión administrativa. La v0.16.0 añade el piloto de reservas individuales de clases prácticas de 60 minutos, con disponibilidad, formulario de confirmación y cancelación administrativa. Consulte [Reservas de clases prácticas](34-reservas-calendar.md) para las reglas, comprobaciones y límites. Varios instructores, cursos grupales y sincronización automática siguen pendientes.

## 1. Preparar Google Cloud una sola vez

Realice esta configuración en un navegador normal, como Chrome o Edge. La autenticación de Google puede rechazar navegadores integrados.

1. Abra [Google Cloud Console](https://console.cloud.google.com/) con la cuenta responsable de la escuela y cree o seleccione un proyecto de Nexo.
2. En la biblioteca de APIs, habilite **Google Calendar API**.
3. Abra **Google Auth Platform** y configure la información de la aplicación. Para una cuenta personal de Gmail, configure audiencia externa y deje el proyecto en pruebas durante esta etapa.
4. Agregue como usuario de prueba el correo con el que abrirá el calendario **Mogollon Method**.
5. En acceso a datos, incluya estos dos permisos:
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
6. Cree un cliente OAuth de tipo **Aplicación web**.
7. Registre exactamente esta URI de redirección autorizada para la instalación local:

```text
http://localhost:3000/api/calendar/oauth/callback
```

No agregue una barra al final. `localhost` y `127.0.0.1` no son intercambiables para esta configuración. Abra también Nexo mediante `http://localhost:3000`.

8. Guarde el ID y el secreto del cliente en `C:\Projects\Nexo\.env`:

```dotenv
GOOGLE_CLIENT_ID=su_id_de_cliente.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=su_secreto_de_cliente
```

Estos valores son del cliente OAuth creado en Google Cloud. No son la contraseña de Gmail, la contraseña de aplicación de SMTP ni una API key de OpenAI. No los pegue en conversaciones, capturas, documentación ni repositorios.

9. Reinicie Nexo para cargar los cambios. Los campos no deben introducirse en el formulario comercial ni en la base de preguntas frecuentes.

La dirección de retorno se deriva automáticamente del puerto local o de `PUBLIC_ORIGIN`. Si define `GOOGLE_REDIRECT_URI`, debe coincidir exactamente con ese origen y `/api/calendar/oauth/callback`. Para una instalación publicada, configure HTTPS y registre la URI pública correspondiente en Google Cloud. Un iPad no puede usar `localhost` para llegar a la PC: requiere la dirección HTTPS del servidor.

## 2. Autorizar y elegir el calendario

1. Entre en Administración con su código por correo y abra **Configuración → Conexiones**.
2. Pulse **Conectar con Google**. Guarde antes cualquier edición comercial pendiente.
3. Elija la cuenta que contiene el calendario de pruebas y autorice ambos permisos solicitados. Google puede mostrar un aviso de aplicación en pruebas. Verifique que sea su proyecto de Nexo.
4. Al regresar a Nexo, abra Conexiones si fuera necesario. La autorización debe iniciarse y terminar en el mismo navegador en menos de cinco minutos. Si la sesión administrativa venció, solicite otro código.
5. En la lista, seleccione **Mogollon Method**. Compruebe también el identificador y la zona horaria, sobre todo si existen nombres repetidos.
6. Pulse **Usar este calendario**. La selección se guarda inmediatamente; no requiere el botón general Guardar configuración.

Los calendarios de solo lectura aparecen identificados y no pueden seleccionarse para escritura. La lista incluye calendarios ocultos y recorre las páginas de resultados. No se selecciona automáticamente el calendario principal ni uno por coincidencia de nombre.

## 3. Comprobar lectura y escritura

### Comprobar lectura

Consulta únicamente el calendario seleccionado, verifica el permiso vigente y cuenta sus eventos en los próximos siete días. Muestra la zona horaria del calendario y la fecha de la comprobación. Esta prueba no crea ni modifica eventos. Nexo no descarga títulos, asistentes ni descripciones de las citas para esta comprobación.

### Probar creación y limpieza

El botón describe la operación y pide confirmación sobre el calendario guardado. Después:

1. Registra localmente el identificador de la prueba antes de enviarla a Google.
2. Crea un evento de un minuto para el día siguiente, con el título **[PRUEBA NEXO] Verificación de conexión**.
3. El evento es privado, no tiene invitados ni recordatorios y está marcado como transparente: no bloquea disponibilidad.
4. Lee el evento creado y comprueba su marcador privado de Nexo.
5. Elimina exclusivamente ese evento y muestra que la prueba terminó.

La aplicación usa `sendUpdates=none` y no proporciona invitados. No envía invitaciones a clientes. La prueba no equivale a una cita comercial.

### Si se corta internet o falla la limpieza

Nexo conserva el identificador del evento y su calendario en SQLite, incluso si se reinicia el servidor. Aparece **Limpiar prueba pendiente** y se bloquean nuevas pruebas y cambios de calendario hasta resolverlo.

La limpieza verifica el marcador privado antes de borrar. Si el evento no coincide, no lo elimina. Si la creación quedó incierta y el evento todavía no aparece, espere dos minutos antes de volver a limpiar: una operación remota puede tardar en reflejarse. Si necesita autorizar de nuevo Google para limpiar, use la misma cuenta que creó la prueba.

La recuperación es manual mediante el botón: no hay un proceso periódico de limpieza. Consulte Google Calendar si persiste un error y conserve el identificador mostrado en el panel o en la base privada; no borre eventos reales para resolver la prueba.

## 4. Conexión y seguridad

- Solo el administrador puede iniciar la autorización, listar calendarios, guardar la selección, probar o desconectar.
- Google recibe la autorización directamente; Nexo nunca pide la contraseña de Google.
- Se solicitan permisos sobre la lista de calendarios y los eventos. Google no limita este consentimiento a un solo calendario: **la restricción al calendario seleccionado la aplica Nexo en su servidor**. No se solicita acceso a Gmail, Drive, compartir calendarios ni eliminarlos.
- El retorno OAuth usa estado aleatorio de un solo uso, PKCE, vencimiento y una cookie HttpOnly propia del navegador. La cookie de acceso administrativo conserva su política original.
- Los tokens se guardan cifrados con AES-256-GCM en SQLite. La clave de cifrado se crea al autorizar y se guarda en `.local/google-calendar.key`, fuera de la carpeta pública.
- `.env`, SQLite y la clave local no se incluyen en el portal de documentación. Proteja también los permisos de archivos de la PC: el cifrado no protege frente a alguien que pueda leer simultáneamente la base y la clave.
- Los errores que se muestran son mensajes controlados, sin tokens ni diagnósticos privados de Google.
- El navegador recibe el estado de conexión y los calendarios, nunca el secreto OAuth ni los tokens de Google.
- La renovación de acceso ocurre en el servidor. Si Google retira o vence la autorización, debe reconectar.
- Desconectar elimina la conexión local y solicita a Google retirar el permiso. Si Google no confirma la retirada, Nexo lo informa para que pueda hacerlo desde la seguridad de su cuenta. Los eventos existentes se conservan.

En proyectos externos con estado **Testing**, Google limita normalmente a siete días el token de renovación para estos permisos. Planifique volver a autorizar durante el piloto. Antes de ofrecer la aplicación a clientes, revise publicación, consentimiento y verificación del proyecto según los requisitos de Google.

## 5. Respaldos y restauración

Realice un respaldo consistente de SQLite y guarde también `.local/google-calendar.key` y la configuración de instalación en un lugar protegido. Si configura `GOOGLE_TOKEN_KEY_PATH`, respalde esa ruta. Nunca publique la clave de cifrado.

Restaurar SQLite sin su clave impide leer los tokens. Nexo muestra un error y no los sustituye silenciosamente. Cambiar de cliente OAuth requiere autorizar de nuevo. Las pruebas pendientes permanecen registradas para recuperar su limpieza.

## 6. Arquitectura y pruebas para el desarrollador

- `server/providers/google-calendar.js`: autorización, cifrado, renovación, selección y pruebas. El transporte y el reloj son inyectables para pruebas sin Google real.
- `server/calendar-store.js`: tablas `google_calendar_connection` y `google_calendar_tests`.
- `public/calendar-settings.js`: panel integrado en Configuración. La selección del calendario es independiente del formulario comercial.
- `POST /api/admin/calendar/connect`: inicia autorización protegida.
- `GET /api/calendar/oauth/callback`: recibe autorización con validación de estado y cookie; retorna a Configuración.
- `GET /api/admin/calendar`: estado sin secretos.
- `GET /api/admin/calendar/calendars`: lista paginada resuelta en el servidor.
- `PUT /api/admin/calendar/selection`: selección validada por ID y permiso.
- `POST /api/admin/calendar/check`: comprobación de lectura del calendario guardado.
- `POST /api/admin/calendar/test`: crea, lee y elimina una prueba identificada.
- `POST /api/admin/calendar/cleanup`: recupera pruebas pendientes.
- `DELETE /api/admin/calendar`: desconecta.

Las escrituras se serializan para evitar cambios de calendario durante una prueba. Los eventos reciben IDs aleatorios generados antes de insertarlos para poder localizar una creación cuya respuesta se pierda. No se permite al cliente enviar títulos, invitados, cuerpos de eventos ni IDs arbitrarios para borrar.

`npm test` incluye las pruebas aisladas de Calendar. `npm run test:calendar` verifica selección, botones, recuperación, desconexión y pantalla móvil en navegador. Estos tests no consumen Google real, OpenAI, correo ni LiveAvatar. Los resultados simulados no prueban que la cuenta real ya esté autorizada.

## Referencias oficiales

- [OAuth para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server).
- [Permisos de Google Calendar](https://developers.google.com/workspace/calendar/api/auth).
- [Lista de calendarios](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list).
- [Crear eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).
- [Vencimiento y renovación de autorizaciones](https://developers.google.com/identity/protocols/oauth2).
