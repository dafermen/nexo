# Configuración de Nexo para distintos negocios

> **Vigente desde v0.13.0:** las respuestas activas se guardan en SQLite y se editan en Administración → Respuestas frecuentes. El archivo inicial se importa una vez. El acceso admite códigos por correo tras configurar SMTP. [Guía de SQLite y acceso](31-sqlite-acceso-correo.md).

## Abrir el módulo

En **Administración → Configuración**, o directamente en `/settings`. Use la misma clave administrativa. La clave se mantiene en memoria durante la sesión y el acceso se cierra tras cinco minutos sin actividad.

La configuración inicial conserva MetodoMogollon, su catálogo, horarios, voz y límite de un minuto de video. No se reemplazan las claves del servidor. Las pruebas con otros negocios se realizan en bases aisladas.

## Qué puede parametrizar

| Sección | Ajustes |
|---|---|
| Negocio | Nombre, tipo de atención, descripción, zona horaria, moneda, dirección, teléfono, correo, sitio web y horarios semanales |
| Asistente | Nombre, trato de usted o tú, saludo inicial, alcance, temas, redirección de consultas ajenas y mensaje de atención humana |
| Experiencia | Teclado en pantalla opcional, disponibilidad de voz y video, conversación automática inicial, inactividad de 2 a 30 minutos y acento verde, azul o violeta |
| Inteligencia artificial | Activar IA, habilitar interpretación, modelo, cuota por atención, cuota diaria y máximo de salida |
| Respuestas | Base SQLite de la escuela, respuestas propias del negocio o solo catálogo y reglas |
| Conexiones | Mensaje de agenda, enlace externo, ID de avatar, ID de voz FULL, límite de video entre 30 y 60 segundos y estado de proveedores |

Los servicios se crean y editan en Administración. Al guardar, el kiosco actualiza su configuración al recuperar el foco o en su revisión periódica. Si hay una consulta en curso, se cancela; una atención previa ya no puede continuar usando datos anteriores.

## Guardar sin mezclar información

**Guardar configuración cierra las atenciones abiertas** y cancela consultas pendientes. Conviene guardar cuando el kiosco no esté atendiendo a alguien. Un cierre remoto de video pendiente mantiene las protecciones existentes del proveedor.

- Cambiar de escuela de conducción a otro negocio pausa todos los servicios. Revise o cree el catálogo antes de publicarlos.
- Cambiar la moneda deja los precios por confirmar. Nexo no convierte importes con un tipo de cambio supuesto.
- Dos ventanas comparten una versión de datos. Si otra guardó primero, se rechaza la sobrescritura; actualice y vuelva a revisar.
- Las claves de API y de Administración no se muestran ni se cambian desde este formulario.

Modificar únicamente el nombre es una edición de identidad y conserva servicios. Para otro cliente se debe preparar una instalación y base separadas, no reutilizar datos operativos de la escuela.

## Asistente y filtro por negocio

El nombre configurado aparece en el saludo y en la conversación. El saludo completo se utiliza al iniciar la llamada; «buenos días» durante la conversación conserva una respuesta breve.

Los horarios usan la zona seleccionada. El contador diario de consultas también usa el día de esa zona; evite modificarla para alterar la política de consumo. Las monedas disponibles en esta versión se almacenan con dos decimales, incluidos COP y CLP: confirme la presentación comercial antes de un piloto en otra región.

Para una escuela siguen disponibles sus reglas y ejemplos específicos. En modo **Otro negocio**, el filtro y la interpretación toman el catálogo, descripción, alcance y temas configurados. Ya no incluyen los ejemplos del DMV ni la base de respuestas de MetodoMogollon. Las frases ambiguas pueden usar IA si está habilitada y hay cupo; un filtro basado en reglas y modelos puede equivocarse, por lo que cada negocio necesita sus casos de prueba.

El alcance escrito no autoriza acciones externas ni modifica las reglas básicas: no inventar datos, no confirmar reservas o cobros y no revelar información privada. El catálogo publicado prevalece sobre el historial. Las opciones de trato ajustan textos preparados y las instrucciones de IA; revise también el tono de las respuestas personalizadas que redacte.

## Respuestas propias

En **Respuestas**, seleccione «Respuestas propias de este negocio». El campo admite hasta 8.000 caracteres y utiliza el mismo formato y parámetros del [manual de preguntas frecuentes](21-preguntas-frecuentes.md).

```text
[horario]
pregunta: ¿A qué hora abren?
pregunta: ¿Cuál es el horario?
respuesta: Nuestro horario es {{centro.horario}}.

[contacto-humano]
pregunta: Quiero hablar con una persona
respuesta: Consulte al personal de {{centro.nombre}} para continuar su atención.
```

Las respuestas se validan antes de guardar. Una versión inválida no reemplaza la configuración anterior. Para preguntas sobre un servicio puede usar `servicio: ID` y parámetros `{{servicio.precio}}`, `{{servicio.requisitos}}`, etc.; los IDs se muestran debajo del editor. No escriba claves ni información personal en este campo.

La biblioteca escolar se guarda en SQLite y se edita como texto en /knowledge, hasta 5.000 temas y cuatro MB. El archivo original se importa una vez. El editor por temas y la importación masiva siguen pendientes.

## Conexiones y límites

El enlace de agenda abre una página HTTPS externa desde la ficha de un servicio. Nexo **no consulta cupos ni confirma una reserva por tener ese enlace**. Google Calendar por API y pagos siguen pendientes.

El ID de avatar se aplica al siguiente inicio de video. Guardar un ID o un modelo no hace una llamada de prueba ni certifica acceso al proveedor. La autorización de gastar créditos sigue siendo una opción protegida del servidor. Ningún ajuste del formulario permite superar 60 segundos de LiveAvatar.

En `.env` permanecen las credenciales, proveedor base de IA, modo LITE/FULL, permiso de gasto, origen HTTPS, puerto y ruta de base de datos. Piper y el retrato local dependen de los recursos instalados. El idioma conversacional y la voz local siguen siendo español; elegir otro idioma, subir logos/retratos y cambiar de proveedor requieren una ampliación de sus adaptadores.

Después del primer guardado en el módulo, sus valores persistidos prevalecen sobre los valores iniciales de modelo, cuotas, IDs de avatar y duración leídos de `.env`. Para esos campos use el módulo; los secretos siguen leyéndose solo desde el servidor al arrancar.

## Preparar otro cliente

1. Prepare una instalación limpia con su propia base, credenciales y acceso administrativo. No copie la base de alumnos, registros ni `.env` de MetodoMogollon.
2. Configure `CENTER_PROFILE=general` para iniciar con catálogo comercial vacío, o use la plantilla escolar si corresponde.
3. Complete identidad, horarios, asistente y contactos.
4. Cree sus servicios y respuestas; revise precios, moneda y requisitos.
5. Pruebe consultas habituales, ambiguas y ajenas por texto o voz antes de pagar sesiones de video.
6. Valide dispositivo, privacidad, agenda e infraestructura para ese negocio.

Esta versión soporta **un negocio por instalación**. Un panel central con múltiples clientes, usuarios por organización, facturación por cliente y selección de negocio en una misma base aún no existe.

## Notas para desarrollo

- `server/business-settings.js`: valores iniciales, validación, plantillas y textos según actividad.
- `server/center.js`: perfil, catálogo y proyección de datos usados por el agente.
- `center_settings.document`: `profile`, `services`, `configuration` y `configurationRevision`. Lectura compatible con el documento anterior sin configuración; no se reemplaza el catálogo existente al arrancar.
- `GET/PUT /api/admin/configuration`: autenticación administrativa, versión compartida y validación antes de guardar. `PUT` admite hasta 64 KB; el campo de respuestas tiene su propio límite.
- `public/settings.*`: formulario, vista previa, conflictos y limpieza al cerrar.
- `tests/settings.test.js`, `tests/settings.e2e.js`: persistencia, otro negocio, validación, cuotas, interfaz y aislamiento.

Los identificadores internos `schoolState` y `status: school` se conservan por compatibilidad; en el intérprete genérico ese estado significa «consulta pertinente al negocio». No condiciona la respuesta a una escuela.

## Seleccionar la zona horaria

Desde el 19/09/2026, Negocio → Zona horaria utiliza una lista desplegable con ciudades y regiones, por ejemplo Nueva York o Bogotá. Incluye zonas habituales y las que reconoce el navegador; conserva también la zona ya guardada aunque no aparezca en esa lista. Seleccione la correspondiente al negocio y pulse Guardar configuración. Los cambios de horario de verano se aplican según la zona elegida. La actualización de la interfaz no cambia por sí sola la configuración existente.

## Seleccionar el modelo de IA

Desde el 19/09/2026, Inteligencia artificial → Modelo configurado es una lista desplegable. Ofrece GPT-4.1 mini, GPT-4.1 y la opción de usar el modelo predeterminado de la instalación. Conserva cualquier identificador guardado previamente como una opción adicional; abrir el formulario no cambia el modelo.

La lista es una selección mantenida por Nexo, no el catálogo completo ni una consulta a los permisos de su cuenta. Las opciones se revisaron para el uso actual de Responses y salidas estructuradas: [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) y [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1). No se incorporan automáticamente modelos nuevos o de otras modalidades. La disponibilidad efectiva depende de la cuenta y debe comprobarse antes de usarlos en operación.

Seleccione y pulse Guardar configuración. Esta acción no llama a OpenAI ni consume tokens. La prueba de navegador comprobó selección, guardado y conservación después de recargar con proveedores simulados; no se hicieron consultas de pago por este cambio.

## Conexiones: Google Calendar

Desde v0.15.0 hay un panel dedicado para autorizar Google, seleccionar calendario y probar lectura y escritura. La selección se guarda al pulsar Usar este calendario. El acceso real depende del cliente OAuth y la autorización de Google. [Preparación y pruebas](33-google-calendar.md).

## Teclado para pantalla táctil

Active **Experiencia → Teclado en pantalla del kiosco** para mostrar iconos junto a los campos públicos. Cada visitante abre y oculta el teclado pulsando su icono. Los campos conservan el teclado del dispositivo si prefiere usarlo. [Manual de uso y pruebas](35-teclado-pantalla.md).
