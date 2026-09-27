# Manual de operación de Nexo

> **Vigente desde v0.13.0:** las respuestas activas se guardan en SQLite y se editan en Administración → Respuestas frecuentes. El archivo inicial se importa una vez. El acceso admite códigos por correo tras configurar SMTP. [Guía de SQLite y acceso](31-sqlite-acceso-correo.md).

## Iniciar y abrir

1. En la PC del proyecto, abra `C:\Projects\Nexo\INICIAR.cmd` si Nexo no está funcionando.
2. Entre en `http://localhost:3000` desde Chrome o Edge. Para probar el micrófono, utilice preferentemente Chrome externo al navegador integrado de Codex.
3. Elija escribir, llamada por voz o videollamada. La voz muestra un retrato; el video abre LiveAvatar.
4. Desde Administración, «Documentación ↗» abre este portal en otra pestaña.

## Conversación por voz

En una llamada, active el micrófono y acepte el aviso. En modo automático, Nexo envía la frase final al terminar de hablar, responde y vuelve a escuchar. La escucha se pausa mientras responde para reducir la captura de su propia voz.

Puede pausar con el micrófono, cambiar al modo manual o escribir. Colgar cierra la atención y limpia la conversación. La transcripción puede tener errores: si una frase no se entiende, vuelva a expresarla o escríbala.

## Video y consumo

LiveAvatar se conecta únicamente al elegir video. Cada sesión tiene un máximo de 60 segundos. Para probar preguntas, FAQs y reglas prefiera texto o voz. No inicie video repetidamente para comprobar una corrección del filtro.

La interpretación y la orientación de OpenAI usan cupos compartidos, por defecto 6 solicitudes por atención y 100 por día. Las respuestas locales conocidas siguen disponibles cuando no hay cupo. Administración muestra el consumo agregado.

## Editar la escuela

Abra `/admin` o `ABRIR-ADMIN.cmd`. En esta instalación el acceso por correo está activo: escriba el correo administrador, pulse Recibir código e introduzca los ocho dígitos recibidos. En una instalación nueva sin correo configurado se conserva la clave de instalación. [Configurar Gmail paso a paso y resolver problemas](31-sqlite-acceso-correo.md).

Puede editar horarios generales y servicios: nombre, descripción, precio, duración, requisitos, modalidad y estado activo. Precio vacío significa pendiente; cero significa gratuito. Los horarios del centro no son cupos de una agenda.

## Editar preguntas frecuentes

Abra Administración → Respuestas frecuentes. Edite el texto y pulse Guardar respuestas: se valida y guarda en SQLite. Se utiliza en la próxima consulta sin reiniciar. El archivo TXT original solo es la semilla de la primera importación.

Use parámetros de precio o requisitos para que la respuesta consulte el catálogo actual. Si el texto es inválido, no se guarda y el editor explica el error; la base válida permanece intacta. [Guía completa](21-preguntas-frecuentes.md).

## Ante un problema

| Problema | Acción |
|---|---|
| No aparece texto al hablar | Revisar permiso, navegador y conexión del servicio de reconocimiento |
| No se oye la respuesta | Revisar volumen, salida de audio y disponibilidad de Piper |
| Pregunta difícil de entender | Reformular brevemente o usar texto; anotar un ejemplo sin datos personales para evaluación |
| Precio o requisito pendiente | Pedir confirmación al responsable y editar el catálogo |
| Video no conecta | Cerrar la atención y revisar configuración antes de volver a gastar una sesión |
| La agenda no ofrece horarios | Google Calendar todavía no está conectado; coordinar con el personal |
| Cambios no se reflejan | Actualizar la página; si cambió `.env`, reiniciar el servidor de Nexo identificado |

Los registros técnicos están en `.local`. No comparta archivos completos sin revisar que no contengan información privada. Para reiniciar, no termine indiscriminadamente otros procesos Node de la PC.

## Límites actuales

Nexo informa y orienta. El chat no reserva, cobra, cancela citas ni garantiza aprobación de exámenes. El piloto físico, la agenda real, los pagos y la operación en producción permanecen pendientes.

## Preparar el kiosco para el siguiente visitante

El inicio vuelve a quedar limpio después de un minuto sin actividad: desaparecen historial, texto sin enviar, avisos y formularios abiertos, y se revoca la sesión de conversación en el servidor. Pulsar Nueva conversación, junto a Llamada por voz y Videollamada en el inicio, hace la misma limpieza inmediatamente y permite elegir texto, voz o video otra vez. La nueva atención vuelve a solicitar consentimiento.

Escribir, tocar la pantalla o hablar renueva la actividad. Una respuesta que está generándose o reproduciéndose no se corta por este temporizador. Dejar el micrófono abierto en silencio no renueva la actividad. Al volver a una pestaña que estuvo oculta se comprueba el tiempo transcurrido. Las llamadas conservan su cierre tras 45 segundos sin actividad y LiveAvatar su máximo de 60 segundos. No se borran servicios, configuración ni turnos guardados por separado.

## Revisar las conversaciones

En Administración → Conversaciones puede consultar el historial y descargar cada atención como archivo `.txt`. Solo el administrador tiene acceso. Limpiar el inicio prepara el kiosco para otra persona y conserva este registro privado. Los registros empiezan desde la activación de v0.14.0; no se recuperan conversaciones anteriores. [Manual y conservación](32-historial-conversaciones.md).

### Aviso «¿Sigue aquí?»

«Sí, continuar» mantiene la atención actual. «No, nueva conversación» cierra la sesión anterior, detiene voz y video, limpia mensajes, borradores y formularios, y vuelve al inicio. Es la opción para una persona que encuentra una conversación ajena. La siguiente atención solicita consentimiento nuevamente. El historial privado de Administración se conserva.

## Google Calendar

Configuración → Conexiones contiene el acceso a Google, lista de calendarios y pruebas. El calendario previsto es Mogollon Method, pendiente de autorización real. «Usar este calendario» guarda por separado del formulario comercial. No habilita todavía reservas automáticas de visitantes. [Guía paso a paso](33-google-calendar.md).


## Orientación y mejora de respuestas (v0.21.0)

Administración → Mejorar respuestas permite revisar dudas del historial, guardar borradores y aprobar respuestas para su publicación. La orientación inicial usa el catálogo activo. Consulte el [manual de orientación y revisión](37-orientacion-revision.md) para conocer operación, arquitectura, retención y límites.


## Inicio de kiosco responsive (v0.22.0)

El inicio concentra voz, video, servicios, citas y consulta escrita. Privacidad y acceso del personal se encuentran en Ayuda y opciones. [Manual del nuevo inicio](38-kiosco-responsive.md).


## Atención en tres idiomas — v0.23.0

NEXO-41: selector Español · English · Français en el inicio, voz y conversación por idioma, fechas y formularios localizados, y correo de nuevas reservas en el idioma elegido. [Operación, arquitectura, pruebas y límites](39-idiomas.md). Los textos comerciales nuevos requieren traducciones revisadas; queda pendiente su editor en Administración y la validación con hablantes nativos.


## Biblioteca de audio — v0.24.0

NEXO-42: audio generado reutilizable para respuestas aprobadas, con metadatos SQLite y archivos WAV privados. Administración permite consultar el uso y vaciar audios; presupuesto inicial de 128 MB y caducidad de 30 días. [Alcance, arquitectura, privacidad y pruebas](40-biblioteca-audio.md). La voz actual sigue siendo local; no supone ahorro por sesión de LiveAvatar.
