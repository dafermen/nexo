# Continuidad del proyecto

> **Vigente desde v0.13.0:** las respuestas activas se guardan en SQLite y se editan en Administración → Respuestas frecuentes. El archivo inicial se importa una vez. El acceso admite códigos por correo tras configurar SMTP. [Guía de SQLite y acceso](31-sqlite-acceso-correo.md).

## Dónde continuar

- Proyecto activo: `C:\Projects\Nexo`.
- Configuración: `.env` de esta carpeta; no imprimir su contenido.
- Aplicación: `http://localhost:3000`.
- Administración: `/admin`.
- Documentación: `/docs`.
- Arranque: `INICIAR.cmd`.
- PID y registros locales del servidor iniciado por el asistente: `.local`.

## Decisiones vigentes

- Escuela MetodoMogollon, trato de usted y horario general de lunes a viernes de 08:00 a 18:00 en Nueva York.
- Primera etapa con LiveAvatar; MetaHuman es futura.
- Voz con retrato para atención y pruebas sin consumo de video.
- Video en pantalla completa, hasta 60 segundos por sesión.
- FAQs y catálogo para datos publicados; OpenAI para interpretación dudosa y orientación permitida.
- Cuotas compartidas de OpenAI y aclaraciones sin sancionar al visitante por decisiones inciertas del modelo.
- Google Calendar conectado y verificado; pagos y reservas automáticas desde el chat pendientes.
- El portal contiene solo documentación de Nexo.

## Últimas entregas

Conversación automática, preguntas frecuentes parametrizadas, respuestas breves a saludos, conservación de contexto, interpretación semántica y portal documental con manuales y tablero. Consulte [Validación](08-validacion.md) para resultados concretos y [Fases y tareas](25-fases-y-tareas.md) para pendientes.

## Retomar una sesión de desarrollo

1. Lea esta página y el tablero actual.
2. Verifique qué proceso atiende el puerto 3000 antes de reiniciar.
3. Identifique la tarea y el resultado esperado.
4. Revise solo la configuración necesaria sin mostrar secretos.
5. Use dobles para cambios de interfaz y filtro; una prueba de video puede consumir crédito.
6. Al terminar, actualice evidencia, tablero y esta continuidad si cambiaron decisiones.

## Pendientes externos

Información comercial confirmada, agenda de Google Calendar, prueba en iPad, presupuesto del piloto de video y decisión sobre repositorio GitHub e infraestructura de producción.

## Configuración por negocio v0.12.0

Nuevo módulo /settings, con la misma clave administrativa. Consulte [la guía](30-configuracion-negocio.md). MetodoMogollon conserva sus datos. La configuración admite un negocio por instalación; otros clientes requieren una base independiente. Las claves permanecen en el servidor. Guardar cierra las atenciones abiertas; cambiar actividad pausa servicios y cambiar moneda deja precios por confirmar.

## SQLite y correo v0.13.0

Administrador en config/installation.json; configuración privada fuera de Git. Correo activado el 19/09/2026: SMTP autenticado y primer envío e ingreso por código registrados. ADMIN_TOKEN ya no autoriza el panel en el modo de correo activo. Usar CONFIGURAR-CORREO.cmd para introducir la credencial local. Primer arranque importa FAQs a SQLite una vez; editar en /knowledge. Hay respaldo previo en .local/backups. 170 pruebas unitarias/API y recorridos de acceso, administración, configuración y documentación aprobados. Las pruebas del 18/09 usaron correo simulado y no consumieron OpenAI/LiveAvatar. El 19/09 se completó la activación de Gmail y se verificó el primer ingreso real.

## Historial privado — v0.14.0

La fuente de verdad es SQLite: tablas `conversations` y `conversation_turns`. `/conversations` y sus API administrativas usan el mismo acceso protegido por correo. No exponer archivos de la base ni exportaciones bajo `public/`. `CONVERSATION_RETENTION_DAYS=0` conserva indefinidamente; un valor entre 1 y 3650 purga atenciones no activas al arrancar y cada hora. Las pruebas usan bases aisladas y proveedores simulados. [Manual](32-historial-conversaciones.md).

## Google Calendar — v0.15.0

Integración en Configuración → Conexiones. Los tokens se cifran en SQLite con una clave local fuera de public; respalde la clave y la base juntas. Hay pruebas de lectura y escritura administrativa; el servidor solo borra eventos con un marcador de prueba conocido. La integración real está autorizada y verificada; el piloto de clases prácticas se añadió en v0.16.0 (ver abajo). No confundir datos simulados con el calendario real. [Guía](33-google-calendar.md).

### Activación de Google completada — 26/09/2026

Se creó un cliente OAuth web exclusivo de Nexo con retorno http://localhost:3000/api/calendar/oauth/callback. Credenciales instaladas en .env sin incluirlas en la documentación. Calendar API estaba habilitada y la cuenta responsable estaba en usuarios de prueba. Servidor reiniciado. El responsable completó el ingreso y el consentimiento de Google. Mogollon Method quedó guardado con zona America/New_York. El proveedor real comprobó lectura y creó, leyó y eliminó correctamente un evento de prueba. No repetir la creación del cliente ni sustituir credenciales de otras aplicaciones.

## Reservas — v0.16.0, 26/09/2026

Piloto activado en la base vigente para el servicio Clase práctica de 60 minutos, creado sin modificar los otros servicios. Calendario Mogollon Method; lunes a viernes 08:00–18:00 Nueva York; una cita simultánea, horizonte 14 días, anticipación 60 minutos e inicios cada hora. Respaldo SQLite previo en .local/backups. Disponibilidad real consultada satisfactoriamente (70 opciones al momento de la comprobación); no se crearon citas reales en esta activación. El flujo de reserva/cancelación se comprobó con Google simulado. Seguir [el manual](34-reservas-calendar.md) antes de operación pública.

## Continuidad v0.33.0

Editor visual probado y manual ilustrado incorporado. Repositorio vigente: https://github.com/dafermen/nexo (público), por elección del usuario. No subir bases reales, instalación, logs ni archivos .env. El flujo de GitHub Actions comprueba cada propuesta y subida a main. Revisar el resultado de Actions antes de desplegar.
