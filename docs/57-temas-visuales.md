# Temas visuales del kiosco · v0.36.2

## Para el administrador

Entre a **Administración → Configuración → Experiencia → Tema del kiosco**.

- **Nexo:** diseño actual y color de acento configurable.
- **Método Mogollón:** fondo oscuro, amarillo de marca, identidad tipográfica y controles coordinados en inicio, paneles y llamadas.

El selector actualiza primero la vista previa; pulse **Guardar configuración** para publicar la elección. Se guarda en SQLite para toda la instalación y sobrevive al reinicio. Las pestañas del kiosco la reciben al actualizar su configuración o recuperar el foco. Como otros cambios de configuración, cierra las atenciones abiertas: conviene hacerlo sin alumnos usando el kiosco.

Para volver al diseño anterior elija **Nexo** y guarde. El color de acento Nexo se conserva mientras utiliza Método Mogollón. Dejar la instalación sin el nuevo campo conserva Nexo; no se fuerza un cambio visual al actualizar el código.

## Alcance

El tema cambia la apariencia, no el catálogo, los precios, profesores, reservas, idiomas, voz ni credenciales. Desde 0.36.2 Método Mogollón muestra el retrato de la fotografía entregada por el cliente, con polo negro y detalles amarillos, en el inicio y las llamadas por voz. Sustituye la asesora incorporada en 0.36.0. El video conserva el avatar configurado en LiveAvatar: una imagen estática no lo convierte en un avatar animado. Esta entrega no replica el gabinete físico ni sustituye la validación de alcance táctil en el equipo real.

## Diseño inspirado en el kiosco del cliente

- Marca centrada; retrato a la izquierda y saludo con cinco accesos a la derecha.
- **Conozca nuestros cursos:** abre el catálogo administrable de servicios.
- **Precios y paquetes:** abre el mismo catálogo con precios destacados, también en teléfono. No existe una segunda lista de precios que mantener.
- **Agende su clase:** reutiliza el menú de reserva, consulta y disponibilidad. Si la agenda está deshabilitada, el acceso también lo está.
- **Prepárese para el examen:** abre el Libro de Preguntas y Respuestas y sus enlaces configurados. Si ese servicio no existe o está inactivo, muestra el catálogo disponible.
- **Más información:** abre Ayuda y opciones, con recursos, privacidad y acceso administrativo.
- Español, English y Français permanecen visibles. Voz, video, nueva conversación y escritura se agrupan debajo.
- En pantallas de poca altura se oculta la decoración inferior; en horizontal compacto el menú se organiza en dos columnas. Los botones mantienen al menos 44 píxeles de alto.

### Imagen y mantenimiento

La imagen activa es `public/assets/hector-mogollon-v1.png`, PNG transparente de 1024 × 1536. Se adaptó con la herramienta integrada de edición de imágenes a partir de **Escuela Hector Mogollon.jpeg**, entregada por el cliente el 10 de octubre de 2026. Se retiró el fondo blanco y se preparó un encuadre de cabeza a medio muslo. Es una adaptación mediante IA, no un recorte garantizado píxel por píxel del original. El archivo original permanece sin modificar.

La imagen anterior `public/assets/asesora-mogollon-v1.png` se conserva como recurso histórico, pero el tema ya no la solicita. Nexo continúa usando `public/assets/recepcionista-v1.png`. El dibujo de ciudad y camino es un SVG propio: `public/assets/mogollon-skyline.svg`.

Instrucción final de edición utilizada con la herramienta integrada:

> Use case: background-extraction. Edit target: the supplied photograph. Remove ONLY the white background and ground shadow, producing genuine transparent alpha with clean edges including hair. Crop the composition to the SAME man's head through mid-thigh to make a portrait website asset. Preserve the exact original person, face, identity, expression, hairstyle, skin tone, lighting, crossed-arm pose, clothing, embroidered chest logo and its lettering, belt and proportions. Do not regenerate or beautify the person, change his features, turn his head, change his outfit or add anything. Keep all hair and both arms fully inside the frame with a modest transparent margin, no large empty side margins. Portrait orientation, sharp natural photographic detail. No backdrop, no halo, no checkerboard painted into image, no added text. This will be displayed on a dark navy kiosk background.

Para reemplazarla, guarde una nueva imagen versionada con transparencia y actualice **ambas referencias**: `renderCenter()` de `public/app.js` y la preparación del HTML inicial en `server/app.js`. Así no aparecerá la fotografía anterior mientras carga la configuración. Actualice las rutas esperadas en las pruebas de inicio y voz. Revise el inicio, la llamada por voz y el cambio de tema. No cambie credenciales ni el ID de LiveAvatar para reemplazar una imagen estática. Para una pantalla física de 55 pulgadas queda pendiente comprobar nitidez y altura de los controles a distancia real.

La selección administrativa permanece protegida. El visitante no puede cambiar la identidad de toda la instalación. Los colores de ocupado, error y colgar conservan su significado.

### Inicio sin destello de otro tema (0.36.1)

El servidor prepara el HTML inicial con el tema, acento y retrato guardados en SQLite. Así, Método Mogollón no muestra primero el fondo verde o la asesora de Nexo mientras espera la configuración. Tanto `/` como `/index.html` entregan la selección vigente con `Cache-Control: no-store`; no se depende de una preferencia antigua en el navegador. Solo se insertan valores de listas permitidas, sin texto libre ni credenciales. JavaScript continúa actualizando el tema cuando cambia la configuración durante el uso.

La prueba de navegador retiene la respuesta de `/api/config` y comprueba el tema visible y la única imagen solicitada antes de liberar la respuesta, para ambos temas.

## Para el desarrollador junior

1. `server/business-settings.js` define `experience.theme` y admite únicamente `nexo` o `metodomogollon`.
2. `server/center.js` completa el valor de instalaciones antiguas y conserva el tema cuando un formulario anterior omite el campo. El guardado usa la revisión para evitar sobrescrituras entre editores.
3. La API pública entrega el tema como parte de `center.experience`. No expone claves.
4. `public/settings.js` mantiene el selector y la vista previa, y usa el guardado administrativo existente.
5. `public/app.js` aplica `body[data-theme]` y selecciona la imagen local según una lista de dos rutas. `public/kiosk-themes.css` contiene las variantes aisladas; las reglas originales de Nexo siguen disponibles.
6. `public/kiosk-home.js` conecta los cinco botones con los controladores existentes; `catalogMode` solo indica si el catálogo debe destacar sus precios. No crea citas ni duplica datos comerciales.
7. `public/i18n.js` contiene las traducciones revisadas de saludo, menú y lema. Los contenidos comerciales siguen en su catálogo y base de conocimiento.

Para agregar otro tema, amplíe explícitamente la lista del servidor y el selector; añada reglas bajo su identificador. No acepte CSS, URLs de hojas de estilo ni HTML arbitrarios enviados por un visitante.

## Etapa posterior: valor inicial desde .env

Todavía no se añadió una variable de entorno. El diseño previsto es: una selección explícita guardada en SQLite tiene prioridad; el futuro valor del entorno se usa solo como predeterminado cuando aún no haya elección. Así, un reinicio no reemplazará lo que el administrador escogió en la web. Esa precedencia necesitará su migración y pruebas cuando se implemente.

## Verificación

Pruebas de configuración para valores permitidos, conservación con clientes antiguos y persistencia. Navegador para elegir, previsualizar, guardar, volver a Nexo y recorrer los dos temas en nueve tamaños verticales y horizontales. Se revisan foco al cerrar, botones dentro de pantalla, precios visibles en móvil, tres idiomas, enlaces del libro, canales deshabilitados y llamada de voz del nuevo tema. No se necesitan llamadas a OpenAI ni sesiones LiveAvatar para validar temas.
