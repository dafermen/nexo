# 15 · Inicio completo y llamada inmersiva

> **Voz o video (v0.6.0).** El inicio ofrece Llamada por voz con retrato y Videollamada con LiveAvatar. Elegir voz no crea una sesión de LiveAvatar. [Funcionamiento y validación](18-voz-y-video.md).


**Decisión acordada · v0.4.2 · 16 de septiembre de 2026.** Se conserva el inicio con catálogo, servicios, turnos y conversación. La presentación a pantalla completa se activa exclusivamente al iniciar una conexión de video.

## Recorrido

1. Inicio: se mantienen todas las opciones anteriores.
2. Iniciar conversación: tras el consentimiento, si LiveAvatar está configurado, se abre la vista de llamada. Mientras conecta, se puede cancelar con el botón rojo.
3. Llamada: video ocupando el espacio disponible, saludo pequeño arriba y respuesta de texto resumida visualmente a dos líneas abajo. El texto completo permanece accesible desde el botón de conversación.
4. Colgar, alcanzar los 60 segundos, abandonar la pantalla o perder una conexión ya establecida: detener video y voz, solicitar cierre remoto, limpiar conversación/borradores y volver al inicio. Los turnos ya confirmados conservan su registro.
5. Si la conexión inicial falla, se recupera el inicio y se muestra el error. El catálogo y la alternativa por texto siguen disponibles.

## Controles

| Icono | Acción |
|---|---|
| Micrófono | Iniciar/detener reconocimiento. Al terminar abre el texto para revisarlo antes de enviar |
| Altavoz | Silenciar la respuesta o activar sonido si el navegador lo bloqueó |
| Conversación | Mostrar texto y controles existentes en un panel; cerrar el panel vuelve al video |
| Encuadre | Alternar horizontal completo (`contain`) y vertical con recorte lateral (`cover`) |
| Teléfono rojo | Colgar y volver al inicio, también durante la conexión |

Los botones tienen nombres accesibles, estado, ayuda al pasar el cursor y al menos 44 × 44 píxeles en los tamaños verificados. Escape cierra primero el panel de texto; si no hay panel ni diálogo abierto, cuelga la llamada. Los errores siguen siendo visibles durante la llamada.

## Orientación y pantalla completa

La llamada ocupa **toda la ventana de la aplicación** sin depender de la autorización del navegador para ocultar sus barras. El botón de pantalla completa existente se conserva. El modo kiosco del iPad se configura por separado.

La vista elige inicialmente un encuadre según la orientación de la ventana y se adapta al girar el dispositivo. Una elección manual se conserva durante esa llamada. El encuadre vertical recorta los laterales del video horizontal; no gira a la persona ni transforma el video original. El encuadre horizontal permite recuperar la imagen completa. Cambiarlo no reinicia LiveAvatar ni abre otra sesión.

## Implementación y pruebas

- `public/call-view.js`: presentación, iconos, panel, foco y encuadre; reutiliza controles de conversación/sesión existentes.
- `public/call-view.css`: estilos activos únicamente durante la llamada; el inicio conserva sus estilos.
- `public/app.js`: conecta los estados de video con la vista, la cuenta regresiva y la limpieza al finalizar.
- Máximo de 60 segundos de video y cierre adicional tras 45 segundos sin actividad; sin reconexión automática.

Validación sin créditos: 62 pruebas API/componentes, 10 recorridos generales y 6 comprobaciones de llamada. Se probaron 1024 × 1366, 1366 × 1024, 390 × 844 y 844 × 390: video del tamaño de la ventana, controles dentro de pantalla, panel de texto, silencio, encuadre sin nueva sesión, colgar, abandono y vencimiento con actividad.

Las capturas usan una **fuente de video simulada** para verificar la presentación: [vertical](capturas/llamada-vertical.png) y [horizontal](capturas/llamada-horizontal.png). El avatar real sigue siendo el elegido en la cuenta de LiveAvatar. No se abrió una sesión de pago para este cambio. La prueba en iPad físico continúa pendiente.
