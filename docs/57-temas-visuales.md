# Temas visuales del kiosco · v0.35.0

## Para el administrador

Entre a **Administración → Configuración → Experiencia → Tema del kiosco**.

- **Nexo:** diseño actual y color de acento configurable.
- **Método Mogollón:** fondo oscuro, amarillo de marca, identidad tipográfica y controles coordinados en inicio, paneles y llamadas.

El selector actualiza primero la vista previa; pulse **Guardar configuración** para publicar la elección. Se guarda en SQLite para toda la instalación y sobrevive al reinicio. Las pestañas del kiosco la reciben al actualizar su configuración o recuperar el foco. Como otros cambios de configuración, cierra las atenciones abiertas: conviene hacerlo sin alumnos usando el kiosco.

Para volver al diseño anterior elija **Nexo** y guarde. El color de acento Nexo se conserva mientras utiliza Método Mogollón. Dejar la instalación sin el nuevo campo conserva Nexo; no se fuerza un cambio visual al actualizar el código.

## Alcance

El tema cambia la apariencia, no el catálogo, los precios, profesores, reservas, idiomas, voz ni credenciales. El avatar conserva su imagen/video configurado: una nueva asesora o uniforme requiere trabajo aparte. Esta entrega no replica el gabinete físico ni sustituye la validación de alcance táctil en el equipo real.

La selección administrativa permanece protegida. El visitante no puede cambiar la identidad de toda la instalación. Los colores de ocupado, error y colgar conservan su significado.

## Para el desarrollador junior

1. `server/business-settings.js` define `experience.theme` y admite únicamente `nexo` o `metodomogollon`.
2. `server/center.js` completa el valor de instalaciones antiguas y conserva el tema cuando un formulario anterior omite el campo. El guardado usa la revisión para evitar sobrescrituras entre editores.
3. La API pública entrega el tema como parte de `center.experience`. No expone claves.
4. `public/settings.js` mantiene el selector y la vista previa, y usa el guardado administrativo existente.
5. `public/app.js` aplica `body[data-theme]`. `public/kiosk-themes.css` contiene las variantes aisladas; las reglas originales de Nexo siguen disponibles.

Para agregar otro tema, amplíe explícitamente la lista del servidor y el selector; añada reglas bajo su identificador. No acepte CSS, URLs de hojas de estilo ni HTML arbitrarios enviados por un visitante.

## Etapa posterior: valor inicial desde .env

Todavía no se añadió una variable de entorno. El diseño previsto es: una selección explícita guardada en SQLite tiene prioridad; el futuro valor del entorno se usa solo como predeterminado cuando aún no haya elección. Así, un reinicio no reemplazará lo que el administrador escogió en la web. Esa precedencia necesitará su migración y pruebas cuando se implemente.

## Verificación

Pruebas de configuración para valores permitidos, conservación con clientes antiguos y persistencia. Navegador para elegir, previsualizar, guardar, volver a Nexo y recorrer los dos temas en tamaños verticales y horizontales. No se necesitan llamadas a OpenAI ni sesiones LiveAvatar para validar temas.
