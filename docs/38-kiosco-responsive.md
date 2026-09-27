# Inicio responsive de kiosco — v0.22.0

## Distribución

El inicio ocupa el espacio visible de la pantalla en una sola tarjeta, sin desplazar la página. El avatar, saludo, acciones y ayuda quedan dentro de ese marco.

- **Vertical:** saludo arriba, imagen en el espacio flexible central y acciones abajo.
- **Horizontal:** imagen a la izquierda; saludo y acciones a la derecha.
- **Acciones:** llamada por voz, videollamada, nueva conversación, servicios, mi cita y horarios, escribir consulta.
- **Ayuda y opciones:** privacidad, opciones de video y acceso del personal a Administración, Configuración y Documentación. Mover los enlaces no cambia sus requisitos de autenticación.

Se usan iconos acompañados de etiquetas breves. Los botones mantienen al menos 44 píxeles de alto en los tamaños comprobados. La imagen cede espacio antes que las acciones. No se reduce toda la aplicación mediante una escala que vuelva pequeños los controles.

## Paneles dentro de la experiencia

Servicios y conversación se abren sobre el inicio en un diálogo nativo. El contenido largo tiene desplazamiento interno. La X o Escape vuelve al inicio y devuelve el foco al botón que abrió el panel. Cerrar el panel conserva la conversación; **Nueva conversación**, finalizar atención o el minuto de inactividad limpian sus datos conforme al flujo existente.

Las fichas siguen abriendo información o el menú de citas según el servicio. El acceso **Mi cita y horarios** permite reservar, consultar y ver disponibilidad; aparece deshabilitado si la agenda en línea no está habilitada. Los formularios conservan validación, consentimiento, teclado manual y confirmación final.

Durante voz/video, el mismo panel de conversación se integra en la vista de llamada; al colgar vuelve al inicio. El video conserva su límite de 60 segundos. Ningún cambio de orientación inicia una nueva sesión de video.

El inicio muestra los avisos del sistema aunque el panel de texto esté cerrado. Las opciones de voz/video siguen respetando lo habilitado en Configuración.

## Implementación

- `public/kiosk-home.css`: distribución por dimensiones y orientación, sin alterar los estilos de administración.
- `public/kiosk-home.js`: apertura de servicios/texto/ayuda, movimiento de utilidades y avisos del inicio.
- `public/index.html`: accesos del kiosco y diálogo `home-panel`.
- `public/call-view.js`: utiliza el mismo nodo de conversación durante la llamada y lo devuelve al diálogo al salir. No duplica mensajes, campos ni conexiones.
- Se usa la altura dinámica del navegador (`dvh`) y desplazamiento interno para evitar que la página completa crezca al abrir servicios, conversación o teclado.

## Validación

`tests/kiosk-home.e2e.js` verifica nueve tamaños: 320×568, 390×844, 768×1024, 820×1180, 1080×1920, 1920×1080, 1366×768, 1024×600 y 844×390. Comprueba acciones visibles y tamaño táctil, ausencia de desbordamiento de la página, paneles, retorno de foco, citas, texto, teclado, cambio de tamaño con borrador, limpieza y ayuda.

Las regresiones de reservas, voz, LiveAvatar simulado e inactividad verifican los recorridos existentes. Se revisaron capturas de vertical, móvil y horizontal. Las pruebas usan proveedores simulados: sin sesiones reales de LiveAvatar, citas ni correos.

## Al recibir el kiosco físico

Las medidas probadas son del área visible del navegador, no pulgadas de pantalla. Todavía deben validarse la resolución y escala del sistema, altura de instalación, alcance de la mano, teclado del sistema y permisos del micrófono en el equipo definitivo. No se presupone una equivalencia entre emulación de navegador y una prueba física en iPad o kiosco.

El botón de pantalla completa sigue disponible; su funcionamiento depende del navegador. El modo de kiosco del sistema operativo, bloqueo de navegación y apertura automática se configuran al preparar el equipo, no mediante este cambio visual.
