# Atención en español, inglés y francés — v0.23.0

## Uso en el kiosco

El inicio ofrece **Español · English · Français**, con nombres en su propia lengua y sin banderas. Basta pulsar una opción; el botón activo queda resaltado. Los controles mantienen al menos 44 píxeles de alto en los tamaños verificados.

El idioma se aplica a las etiquetas y avisos del visitante, servicios iniciales, formularios de citas, fechas, conversación, reconocimiento del micrófono y voz de respuesta. Se conserva al cerrar paneles o iniciar otra conversación. Recargar la página vuelve a español; no se guarda la preferencia en el navegador.

Cambiar de idioma termina la atención actual y limpia mensajes y borradores. No cancela las citas confirmadas ni elimina el historial privado. El selector está en el inicio; durante una llamada se conserva el idioma elegido. Para cambiarlo, cuelgue y elija otra opción.

## Conversación y consumo

- Cada sesión tiene un idioma validado (`es`, `en`, `fr`), fijado por el servidor. Enviar otro idioma a TTS o LiveAvatar no modifica esa sesión.
- Las frases habituales tienen equivalencias locales completas. Saludos, precios, requisitos y duración usan el catálogo y las FAQ. No se traduce eliminando palabras arbitrarias de una petición.
- Las frases que requieren interpretación conservan el mensaje original y utilizan el intérprete estructurado existente, ahora instruido para comprender las tres lenguas. No se cambia el límite por sesión, por día ni por respuesta.
- Las respuestas libres de OpenAI reciben instrucciones de idioma y trato profesional; en francés se utiliza «vous». Las restricciones del negocio siguen vigentes.
- El historial guarda la pregunta original y la respuesta entregada, no el alias español utilizado internamente. Los formularios no envían nombre ni correo a la IA.

## Voz y video

Reconocimiento del navegador: `es-US`, `en-US`, `fr-FR`. La disponibilidad y exactitud dependen de su servicio y de los permisos del equipo. No se han probado micrófonos físicos de clientes ni iPad con esta entrega.

Voz local Piper: español Sharvard (voz 1), inglés LJ Speech y francés SIWIS (voz única). Se elige un modelo fijo por idioma; no se permite suministrar rutas desde la API. Si falta la voz seleccionada se informa y permanece la entrada escrita; no se sustituye silenciosamente por español.

En esta PC están instaladas las tres voces. En una instalación nueva ejecute primero `INSTALAR-VOZ-LOCAL.cmd` y luego `INSTALAR-IDIOMAS.cmd`. El segundo descarga unos 178 MB de modelos inglés/francés, verifica SHA-256 con `scripts/multilingual-voices.json` y no instala ejecutables adicionales. Reinicie Nexo al terminar. La generación de voz es local; el reconocimiento del navegador y OpenAI pueden necesitar internet.

LiveAvatar LITE recibe el audio local en el idioma elegido. FULL recibe el idioma de la sesión en `avatar_persona`; la voz configurada debe admitirlo. Se conserva el máximo de **60 segundos**. No se abrió ninguna sesión real de LiveAvatar en esta entrega; la compatibilidad perceptual del avatar con cada idioma debe validarse en el piloto.

## Citas y correo

Los horarios se presentan en la lengua seleccionada, manteniendo la zona horaria del negocio. La disponibilidad procede del mismo calendario. Una conversación no confirma una reserva: sigue siendo obligatorio revisar y confirmar el formulario.

Las nuevas reservas guardan `language` en su documento SQLite existente. La confirmación por correo usa esa lengua, incluso si se intenta enviarla después desde Administración. Las reservas antiguas sin este dato mantienen español. Se conservan código, dirección de correo, precios e identificadores; los eventos del calendario mantienen el nombre original del servicio para el personal.

## Mantenimiento para desarrollo

| Archivo | Responsabilidad |
|---|---|
| `public/i18n.js` | Traducciones revisadas, plantillas y metadatos de idiomas, compartidos por navegador y servidor |
| `public/language-ui.js` | Aplica textos y atributos accesibles, conserva fuentes para volver de idioma, excluye mensajes del visitante y datos personales |
| `server/languages.js` | Equivalencias locales de consultas completas; las consultas desconocidas conservan su texto |
| `public/app.js` | Selección, limpieza de sesión, voz y fechas de formularios |
| `server/app.js` | Idioma de sesión, respuestas, TTS, avatar y reserva |
| `server/providers/local-tts.js` | Lista cerrada de modelos de voz |
| `server/providers/booking-mail.js` | Confirmación por correo en tres idiomas |

**Alcance de los contenidos:** están traducidos los recorridos principales del visitante y el catálogo/FAQ iniciales de Nexo. No se traducen automáticamente textos comerciales nuevos escritos por el administrador: deben añadirse sus traducciones revisadas a `public/i18n.js`. Un texto sin traducción permanece en su lengua original. Los nombres propios se conservan. Administración, Configuración, Documentación y detalles técnicos de instalación siguen en español. Pendiente: editor de traducciones comerciales en SQLite y auditoría editorial con hablantes nativos antes del despliegue público.

Al añadir una frase, no introduzca una traducción que cambie importes, requisitos o condiciones. Mantenga tres columnas y claves únicas; los tests comprueban esto. Marque cualquier nuevo dato personal mostrado fuera de un input con `data-no-translate`. No traduzca códigos ni lo dictado por el visitante.

## Validación

- `tests/languages.test.js`: idioma válido e inmutable, aliases completos, rechazo de solicitudes ajenas, respuestas locales, historial original, prompts, elección de modelos, reconocimiento, agenda con fechas y selección ordinal, y correos sin SMTP real.
- `tests/languages.e2e.js`: español/inglés/francés en nueve tamaños cada uno (27 combinaciones), cambio de idioma, chat, FAQ, formulario hasta revisión, conservación de nombre/correo, voz automática y cambio de idioma con borrador.
- Síntesis real local inglesa y francesa: WAV no vacío a 22.050 Hz. STT de navegador simulado; no prueba de calidad acústica con personas.
- Pruebas de regresión de API, reservas, filtro, voz y video con dobles. Sin reservas, correos ni sesiones de LiveAvatar reales.

## Créditos de las voces

Conserve los model cards distribuidos en `docs` y los avisos del runtime al redistribuir la aplicación.

- Inglés: [Piper LJ Speech high, ficha del modelo](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/ljspeech/high/MODEL_CARD). La ficha identifica el corpus [LJ Speech](https://keithito.com/LJ-Speech-Dataset/) como dominio público y enlaza los detalles de entrenamiento. Modelo descargado sin modificaciones.
- Francés: [Piper SIWIS medium, ficha del modelo](https://huggingface.co/rhasspy/piper-voices/blob/main/fr/fr_FR/siwis/medium/MODEL_CARD), entrenado con el [corpus SIWIS French Speech Synthesis Database](https://datashare.is.ed.ac.uk/handle/10283/2353), atribuido a sus autores en ese registro y publicado bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). La ficha indica ajuste desde Lessac medium; se conserva íntegra. Modelo descargado sin modificaciones.
- Español: se conserva la voz y su ficha `docs/SHARVARD-MODEL-CARD.txt` de la instalación existente.


