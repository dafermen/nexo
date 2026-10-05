# Temas visuales del kiosco · v0.36.0

## Para el administrador

Entre a **Administración → Configuración → Experiencia → Tema del kiosco**.

- **Nexo:** diseño actual y color de acento configurable.
- **Método Mogollón:** fondo oscuro, amarillo de marca, identidad tipográfica y controles coordinados en inicio, paneles y llamadas.

El selector actualiza primero la vista previa; pulse **Guardar configuración** para publicar la elección. Se guarda en SQLite para toda la instalación y sobrevive al reinicio. Las pestañas del kiosco la reciben al actualizar su configuración o recuperar el foco. Como otros cambios de configuración, cierra las atenciones abiertas: conviene hacerlo sin alumnos usando el kiosco.

Para volver al diseño anterior elija **Nexo** y guarde. El color de acento Nexo se conserva mientras utiliza Método Mogollón. Dejar la instalación sin el nuevo campo conserva Nexo; no se fuerza un cambio visual al actualizar el código.

## Alcance

El tema cambia la apariencia, no el catálogo, los precios, profesores, reservas, idiomas, voz ni credenciales. Desde 0.36.0 Método Mogollón incluye una distribución propia y una asesora estática con traje negro y pañuelo amarillo. El video conserva el avatar configurado en LiveAvatar: una imagen estática no lo convierte en un avatar animado. Esta entrega no replica el gabinete físico ni sustituye la validación de alcance táctil en el equipo real.

## Diseño inspirado en el kiosco del cliente

- Marca centrada; asesora a la izquierda y saludo con cinco accesos a la derecha.
- **Conozca nuestros cursos:** abre el catálogo administrable de servicios.
- **Precios y paquetes:** abre el mismo catálogo con precios destacados, también en teléfono. No existe una segunda lista de precios que mantener.
- **Agende su clase:** reutiliza el menú de reserva, consulta y disponibilidad. Si la agenda está deshabilitada, el acceso también lo está.
- **Prepárese para el examen:** abre el Libro de Preguntas y Respuestas y sus enlaces configurados. Si ese servicio no existe o está inactivo, muestra el catálogo disponible.
- **Más información:** abre Ayuda y opciones, con recursos, privacidad y acceso administrativo.
- Español, English y Français permanecen visibles. Voz, video, nueva conversación y escritura se agrupan debajo.
- En pantallas de poca altura se oculta la decoración inferior; en horizontal compacto el menú se organiza en dos columnas. Los botones mantienen al menos 44 píxeles de alto.

### Imagen y mantenimiento

La imagen `public/assets/asesora-mogollon-v1.png` es una creación generada inspirada en la referencia, no una extracción del rostro original del cliente. Se creó con la herramienta integrada de generación de imágenes, en formato PNG con transparencia, 1024 × 1536. La imagen anterior continúa en el tema Nexo. El dibujo de ciudad y camino es un SVG propio: `public/assets/mogollon-skyline.svg`.

Instrucción final de generación: retrato fotográfico de una asesora adulta, cabello oscuro recogido en moño bajo, traje negro, pañuelo amarillo dorado, pendientes discretos; sonrisa natural y mirada ligeramente a la derecha; cuerpo completo desde la cabeza hasta medio muslo, brazos y manos dentro del encuadre; luz suave, fondo transparente, sin texto ni interfaz. Referencia: la asesora dentro del kiosco presentado por el cliente. No se solicitó replicar su identidad exacta.

Para reemplazarla, guarde una nueva imagen versionada con transparencia y cambie la ruta permitida en `renderCenter()` de `public/app.js`. Revise el inicio, la llamada por voz y el cambio de tema. No cambie credenciales ni el ID de LiveAvatar para reemplazar una imagen estática. Para una pantalla física de 55 pulgadas queda pendiente comprobar nitidez y altura de los controles a distancia real.

La selección administrativa permanece protegida. El visitante no puede cambiar la identidad de toda la instalación. Los colores de ocupado, error y colgar conservan su significado.

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
