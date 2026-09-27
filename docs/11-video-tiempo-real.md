# 11 · LiveAvatar: integración de la etapa 1

**v0.4.0 · 16 de septiembre de 2026.** El modo vigente es **LITE**, con conversación y voz controladas por Nexo. FULL se conserva por compatibilidad; la prueba anterior de 60 segundos no es la configuración predeterminada de la asesora.

## Configurar

1. Elegir la asesora en la cuenta de LiveAvatar y obtener su avatar ID y una clave de API.
2. Ejecutar [CONFIGURAR-AVATAR.cmd](../CONFIGURAR-AVATAR.cmd). Guardar la clave localmente y habilitar consumo para probar con créditos. No enviarla al chat.
3. Confirmar que Piper esté instalado en la PC que sirve Nexo. No se requiere voice ID en LITE.
4. Reiniciar y pulsar «Iniciar conversación». Se puede empezar con respuestas demo sin OpenAI.

«Probar video» permite diagnosticar manualmente y escoger sandbox Wayne, un avatar técnico distinto. Su disponibilidad depende de las condiciones de la cuenta; no equivale a una asesora personalizada gratuita.

## Protocolo y módulos

| Módulo | Responsabilidad |
|---|---|
| `server/providers/live-avatar.js` | Token, inicio, duración y cierre remoto; secretos en servidor |
| `public/providers/live-avatar.js` | Reproducir medios, pedir TTS, correlacionar habla y cancelar |
| `public/providers/live-avatar-lite.js` | Esperar estado conectado y enviar comandos WebSocket |
| `public/providers/avatar-audio.js` | WAV mono PCM16 → PCM16 de 24 kHz |
| `server/providers/local-tts.js` | Sintetizar respuesta en memoria con Piper |

En LITE: `agent.speak` con bloques base64 y `agent.speak_end`; eventos `agent.speak_started`, `agent.speak_ended` e interrupción. Se usa el audio generado por Nexo, sin publicar micrófono/cámara ni solicitar otra respuesta de IA a LiveAvatar. FULL utiliza `avatar.speak_text` y requiere `LIVEAVATAR_VOICE_ID`.

## Límites y datos

Una sesión simultánea por proceso; 60 segundos predeterminados (30–60 configurables), sandbox 60 segundos; tres intentos de inicio por minuto. Cierre por 45 segundos de inactividad, finalización o salida de pantalla. Si falla el cierre remoto se reintenta y se bloquean nuevos inicios.

El navegador recibe token de sala y URL de control efímeros. LITE recibe la voz sintetizada de la respuesta; FULL recibe el texto. El formulario de turnos queda separado del agente. La app no guarda grabaciones; las condiciones externas pertenecen al proveedor.

## Validación

Pruebas locales con proveedor simulado aprobadas. Actualización v0.4.1: conexión externa comprobada en Edge, con imagen y reproducción de audio. Calidad percibida de labios/gestos, consumo exacto y Safari en iPad pendientes. [Plan completo, arquitectura, claves y pruebas de aceptación](14-etapas-liveavatar-metahuman.md). [Informe de validación](08-validacion.md).

Referencias: [configuración LITE](https://docs.liveavatar.com/docs/lite-mode/configuration), [ciclo de vida](https://docs.liveavatar.com/docs/lite-mode/lifecycle), [eventos](https://docs.liveavatar.com/docs/lite-mode/events).
