# Conversación automática por turnos

Versión 0.8.0 · 18 de septiembre de 2026

## Cómo usarla

En Chrome, recargue Nexo y elija Llamada por voz. Acepte el aviso de inicio si aparece. Con el modo automático habilitado (valor predeterminado), Nexo saluda y activa el micrófono al terminar; no necesita pulsar Hablar. Hable cuando aparezca «Escuchando». Cada frase finalizada se envía automáticamente; Nexo responde y vuelve a escuchar. El navegador puede solicitar permiso de micrófono, que debe conceder el usuario. Si la conversación ya comenzó por texto, la llamada activa la escucha directamente sin repetir el saludo. La videollamada mantiene su activación manual del micrófono y el límite de 60 segundos.

- El micrófono pausa la escucha automática, incluso mientras se prepara o reproduce una respuesta. No interrumpe esa respuesta; puede silenciarla con el altavoz.
- El botón de flechas circulares cambia entre automático y manual. Cambiar de modo deja la escucha en pausa; pulse el micrófono para reanudar.
- En modo manual, revise la transcripción y pulse Enviar. El chat escrito en el inicio sigue siendo manual.
- Abrir el panel de texto o escribir pausa la escucha automática. Colgar, salir de la pestaña o vencer la llamada cancela los temporizadores y limpia la atención.

## Detección del turno y errores

El reconocimiento sigue a cargo del navegador (SpeechRecognition en español). Nexo espera una transcripción final y 900 ms adicionales antes de enviarla. Un resultado parcial nuevo cancela el envío pendiente; no se envían fragmentos parciales. El navegador determina el final de la frase: los 900 ms no son un detector de silencio de audio propio.

Durante la consulta y la respuesta de voz se detiene el reconocimiento para evitar que Nexo se transcriba a sí mismo. Después del fin de la respuesta se esperan 650 ms y se vuelve a escuchar. Es una conversación alternada: para interrumpir, pause el micrófono o silencie la respuesta; todavía no hay interrupción por voz mientras habla la asesora.

Un fallo del reconocimiento, ausencia de frase completa o error de voz pausa el modo automático y muestra un aviso. No se reintenta indefinidamente ni se envían frases vacías. Permanecen los plazos del reconocimiento: 12 segundos para confirmar inicio y 20 segundos sin resultados. El cierre por inactividad de la llamada sigue activo; mantener el micrófono abierto automáticamente no cuenta por sí solo como actividad del usuario.

## Integración y consumo

CallConversation en public/call-conversation.js coordina los turnos y sus cancelaciones sin depender de OpenAI, Piper ni LiveAvatar. public/app.js conecta el coordinador a los proveedores existentes. El filtro y los cupos se aplican siempre en POST /api/chat. Si la respuesta ordena continuar solo con catálogo (desvíos o cuota), se pausa la escucha automática y se abre Servicios.

No se guardan grabaciones nuevas, no se cambian credenciales, y la llamada por voz no abre LiveAvatar. Los envíos automáticos sí pueden generar consultas a OpenAI si pasan el filtro, dentro de los mismos límites: 6 solicitudes por atención y 100 al día por defecto. Los límites no se ampliaron.

## Verificación

108 pruebas unitarias/API aprobadas. Se añadieron pruebas de envío único, transcripciones parciales, cancelación al pausar/cerrar, espera del audio y fin sin frase.

El recorrido de navegador tests/auto-call.e2e.js usa reconocimiento, IA y audio de prueba: dos turnos sin Enviar, ningún envío parcial/duplicado, pausa durante audio, errores, envío manual, orientación y filtro, dos desvíos, cierre con envío pendiente y chat escrito. No abre sesiones de LiveAvatar. Los recorridos existentes de voz manual y video simulado también pasan, incluidos controles táctiles en cuatro tamaños, inactividad y cierre del video al minuto.

La comprobación contra el servidor local utilizó reconocimiento simulado y Piper real: saludo y dos respuestas locales de catálogo reproducidos, reanudación de escucha después de cada audio y cierre limpio. Cero consultas a OpenAI y cero sesiones de LiveAvatar en esa comprobación. Falta valorar con la voz del usuario los tiempos de final de frase y su comodidad en un ambiente real; el micrófono físico en Chrome había sido confirmado por el usuario en el paso anterior.

Ejecutar las pruebas sin proveedores de pago: npm test; npm run test:auto; npm run test:voice; npm run test:avatar. Los recorridos de navegador requieren Playwright y Edge; PLAYWRIGHT_MODULE y BROWSER_CHANNEL permiten seleccionar la instalación disponible.

## Mejora del inicio de voz — 26/09/2026

El botón Llamada por voz inicia automáticamente la conversación por turnos. El aviso inicial explica el reconocimiento y el envío automático. Se espera al final del saludo y la pausa de 650 ms antes de escuchar para no transcribir la propia respuesta. Pausar, colgar o un error durante el saludo impiden la apertura posterior. Permisos denegados y errores del reconocimiento dejan la escucha en pausa, sin reintentos continuos. Se respeta la opción de conversación automática de Configuración; el texto escrito y las videollamadas conservan sus controles.

Pruebas añadidas: primera escucha sin pulsar micrófono, saludo sin capturar eco, cierre durante saludo, permiso denegado sin reintento y llamada iniciada tras conversación escrita. Se usan reconocimiento y audio simulados, sin LiveAvatar ni OpenAI real; la calidad del micrófono físico se comprueba con el usuario.

## Reservar durante la llamada

El botón **Mi cita y horarios** ofrece reservar y confirmar, consultar una cita por correo y código de ocho letras, o ver disponibilidad. También admite las peticiones por voz «Quiero reservar una cita», «Quiero consultar mi cita» y «Quiero ver disponibilidad». La reserva abre la elección de día y hora y el formulario de nombre/correo sin salir de la llamada por voz. La escucha se pausa durante todo el formulario. Cerrar vuelve a escuchar solo si el modo automático estaba activo antes. Colgar, terminar o un minuto sin interacción en el formulario cancela la reanudación y limpia sus campos. La voz no confirma citas; el alumno revisa el resumen y pulsa Confirmar turno. [Manual de reservas](34-reservas-calendar.md).
