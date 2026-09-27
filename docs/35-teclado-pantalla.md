# Teclado en pantalla opcional — v0.19.0

## Activar o desactivar

1. Abra Administración → Configuración → **Experiencia**.
2. Marque **Teclado en pantalla del kiosco** y pulse **Guardar configuración**.
3. Vuelva al inicio del kiosco y recargue para aplicarlo inmediatamente. La revisión periódica también recupera los cambios; guardar configuración cierra atenciones existentes.
4. Pulse el icono de teclado junto al campo de chat, nombre, correo o código de reserva. Se despliega debajo del campo. Tocar el campo por sí solo no lo abre.

El ajuste del administrador permite mostrar u ocultar los iconos. En la instalación actual se habilita para ofrecer la elección a cada visitante. El teclado permanece cerrado hasta pulsar un icono. En una laptop puede usar el teclado físico. En un iPad puede mantenerlo desactivado y usar el teclado del dispositivo. Para una pantalla táctil Windows sin teclado, active la opción y compruebe su comodidad en el equipo final.

## Uso

- Letras españolas, ñ, acentos, números, mayúsculas, espacio y borrado.
- El correo muestra accesos directos a @, punto, guion, guion bajo y +. El botón **@ #** ofrece más símbolos; **ABC** vuelve a letras.
- El código de reserva comienza con mayúsculas. Puede tocar el texto para situar el cursor o seleccionar y reemplazar una parte.
- **Listo** o el mismo icono ocultan el teclado conservando lo escrito. No envía mensajes ni confirma citas. Después pulse Enviar, Revisar turno, Consultar cita o Confirmar turno según el formulario.
- El teclado físico y el del dispositivo siguen funcionando al tocar el campo original. Escape desde el editor del teclado lo oculta; lo escrito permanece en el campo. Listo no cancela la edición.
- El micrófono se pausa para escribir. Durante una reserva, el retorno a la llamada conserva las reglas de reanudación del formulario. Editar el chat deja la voz automática pausada para revisar el texto.

## Datos y límites

El teclado no guarda textos en almacenamiento del navegador ni hace llamadas a proveedores. Mantiene una copia de edición temporal que se limpia al cerrar, terminar la atención o vencer el minuto de inactividad. La interacción con las teclas cuenta como actividad del visitante. Al enviar un formulario o mensaje se aplican las mismas reglas de persistencia y validación que con teclado físico.

Disponible solo en los campos públicos de chat y reservas, no en claves o configuración administrativa. Fechas y horarios conservan sus selectores. No sustituye un teclado del sistema fuera de Nexo. Solo el editor del teclado de Nexo solicita `inputmode=none`; los campos originales conservan su modo de entrada del dispositivo. Cada navegador decide si respeta esa indicación. Falta validación física en el iPad y kiosco definitivos.

## Desarrollo

- `experience.touchKeyboard`: booleano guardado en la configuración SQLite, con valor anterior ausente interpretado como `false`.
- `public/touch-keyboard.js`: componente desacoplado con `setEnabled`, `close` y `destroy`. Un panel dentro del formulario se expande y colapsa mediante botones con `aria-expanded`. Se ofrece durante llamadas por voz o video.
- El editor usa texto para permitir selección y cursor incluso cuando el campo original es `email`. Se sincroniza mediante eventos `input` y `change`; el campo original conserva su tipo, validación y longitud máxima.
- Solo se habilita para `#message` y entradas de texto/correo/teléfono/búsqueda de `#booking-content`. Rechaza campos deshabilitados o de solo lectura.
- `public/app.js` pausa escucha al abrir y limpia al finalizar. Se eliminan referencias a campos retirados del formulario.
- `tests/booking.e2e.js`: activación en Configuración, apertura/cierre manual por icono, escritura real pulsando teclas, correo válido, mayúsculas y acentos, selección/borrado, longitud máxima, no envío al cerrar, móvil, inactividad y desactivación.
