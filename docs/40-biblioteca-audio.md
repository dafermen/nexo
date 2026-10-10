# Biblioteca de audio y perfiles de voz — v0.37.0

## Elegir la voz

Desde v0.37.0 la voz predeterminada es masculina en español, inglés y francés. En `.env`, `PIPER_VOICE_PROFILE=male` selecciona ese perfil y `PIPER_VOICE_PROFILE=female` conserva las voces anteriores. Reinicie Nexo después de cambiarlo. El perfil se aplica a toda la instalación, independientemente del tema visual. No es una imitación de la voz de la persona de la fotografía.

| Idioma | Modelo masculino | Hablante |
|---|---|---|
| Español | es_ES-sharvard-medium | 0 (M) |
| Inglés | en_US-bryce-medium | 0 (Bryce) |
| Francés | fr_FR-upmc-medium | 1 (Pierre) |

Los tres generan WAV mono a 22.050 Hz. Antes de actualizar una instalación, descargue los modelos: en Windows, después de instalar Piper, ejecute `powershell -ExecutionPolicy Bypass -File scripts/install-multilingual-voices.ps1`; en Linux, `python3 deploy/install-voices.py /opt/nexo/voices`. Los instaladores comprueban SHA256 y conservan los modelos femeninos para permitir volver al perfil anterior. Los modelos no se incluyen en Git ni en el paquete de despliegue.

Fuentes y atribución: [Sharvard / University of Edinburgh, datos CC BY 3.0](https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD); [Bryce Beattie, datos de dominio público](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/bryce/medium/MODEL_CARD); [UPMC Pierre, datos CC BY-SA 4.0](https://huggingface.co/rhasspy/piper-voices/blob/main/fr/fr_FR/upmc/medium/MODEL_CARD). Las tarjetas identifican los conjuntos de entrenamiento y sus condiciones; conserve estas referencias al distribuir la instalación.

La síntesis continúa siendo local. LiveAvatar LITE recibe este audio; FULL tiene su propia configuración de voz. No hace falta vaciar la biblioteca: modelo y hablante forman parte de la clave y evitan reproducir audios del perfil anterior. La primera petición de cada respuesta con la nueva voz genera otro archivo.

Validación v0.37.0: pruebas de selección y rechazo de perfiles inválidos, hablantes por idioma y separación de caché; síntesis real de los tres idiomas en Windows. Una prueba con Piper real guardó primero una respuesta femenina, cambió a masculina y comprobó que solo se reutilizaba el nuevo audio. La valoración de timbre y acento queda a elección del cliente.

## Qué hace y qué ahorra

Nexo guarda y reutiliza audio sintetizado de saludos y respuestas locales aprobadas. Primero resuelve la consulta con el catálogo, las FAQ y el filtro existentes. Después busca el audio del **texto final exacto** en el idioma y voz correspondientes. Si falta, lo genera con Piper y lo guarda.

La voz actual funciona en la PC: no se paga una API por sintetizarla. Esta mejora reduce trabajo del equipo y tiempo de espera; no evita una consulta a OpenAI realizada antes de obtener el texto ni elimina el consumo de LiveAvatar. Las FAQ que se reconocen localmente ya evitan consultas de IA. Las consultas ambiguas pueden seguir usando el intérprete dentro de los cupos configurados.

Las respuestas libres de OpenAI no se incorporan automáticamente a una biblioteca compartida. El proceso de revisión y publicación de FAQ continúa en Administración → Mejorar respuestas / Respuestas frecuentes.

## Operación

La biblioteca está activada por defecto y se llena conforme se utilizan las respuestas. Funciona con voz local y con el audio enviado a LiveAvatar LITE. FULL utiliza la voz de su proveedor y no pasa por esta biblioteca.

En **Administración → Biblioteca de audio** se muestran:

- Audios almacenados y espacio ocupado/límite.
- Reutilizaciones y búsquedas sin audio.
- Tiempo aproximado de generación evitado, calculado a partir del tiempo de la generación original. No representa dólares ahorrados ni una medición exacta de latencia final.
- Caducidad configurada.
- **Actualizar uso** y **Vaciar audios guardados**. Vaciar elimina únicamente estos archivos derivados y sus registros. No elimina FAQ, citas, historial ni métricas acumuladas. Los audios se regeneran cuando vuelvan a necesitarse.

Si faltan archivos, se corrompen o la carpeta no permite guardar, la respuesta se genera normalmente. La biblioteca no debe convertirse en un requisito adicional para poder escuchar al asistente.

## Límites y configuración

En `.env` pueden configurarse estos valores; requieren reiniciar Nexo:

```dotenv
AUDIO_CACHE_ENABLED=true
AUDIO_CACHE_MAX_MB=128
AUDIO_CACHE_TTL_DAYS=30
```

El tamaño admite 8–1024 MB; la caducidad 1–365 días. El valor inicial reserva como máximo 128 × 1.048.576 bytes para archivos contabilizados. Al guardar se eliminan primero los menos usados recientemente hasta que el nuevo audio quepa. Un audio individual que exceda el presupuesto se reproduce sin guardarlo. La caducidad se cuenta desde su creación, aunque siga utilizándose.

La limpieza ocurre al usar o consultar la biblioteca. No hay un proceso de limpieza mientras Nexo está apagado. En su primera operación tras iniciar también se eliminan archivos temporales y WAV huérfanos con el formato de nombres propio de Nexo. Otros archivos no se eliminan.

## Al cambiar datos o voz

La clave incluye el texto exacto, idioma, versión de los datos comerciales/FAQ y la identidad completa de síntesis: proveedor, modelo, hashes de modelo/configuración/ejecutable, hablante, formato, frecuencia y pausa entre frases. Las huellas de archivos se calculan una vez y se actualizan cuando cambia su tamaño o fecha de modificación.

Cambiar precio, catálogo, configuración o FAQ cambia el contexto de reutilización. Cambiar voz/modelo o ajustes cambia su identidad. No se renombra una grabación antigua como si fuera de la voz nueva. Los audios anteriores permanecen hasta su caducidad, limpieza por espacio o vaciado manual; las nuevas solicitudes utilizan su propia clave.

Cada proveedor futuro debe implementar `cacheIdentity(language)` con todos los ajustes que cambian el sonido. Si no lo implementa, no se reutiliza audio. La primera implementación admite WAV PCM mono de 16 bits a 22.050 Hz; otro formato requiere adaptar y probar su almacenamiento y validación. No se habilitó un proveedor de voz de pago ni un selector de nuevas voces en esta entrega.

## Protección del contenido

- La autorización para reutilizar se decide en el servidor. Un visitante no puede habilitarla enviando `cacheable: true`.
- Se permite el saludo actual o una respuesta de origen local aprobada que esa sesión haya recibido. Se conservan hasta 24 huellas autorizadas en memoria por sesión.
- La lista cerrada incluye catálogo, FAQ, horarios generales, pagos, cortesía y orientación local; las respuestas estructuradas del intérprete solo se permiten cuando se resuelven con esos datos aprobados.
- Se excluyen respuestas libres de IA, búsquedas/disponibilidad de Calendar, resultados de citas y textos arbitrarios enviados a TTS. Calendar se sigue consultando en cada búsqueda y al confirmar.
- Como segunda medida, se rechazan textos con direcciones de correo, teléfonos largos, fechas ISO, UUID y códigos de reserva. Esta comprobación no sustituye la validación del origen. No publique datos privados de alumnos dentro de una FAQ pública.
- No se guarda el audio capturado del micrófono. Se guardan únicamente respuestas genéricas sintetizadas. La biblioteca no contiene una copia del texto ni del token de sesión.

## Almacenamiento y arquitectura

| Componente | Responsabilidad |
|---|---|
| `server/audio-policy.js` | Fuentes permitidas, huellas de texto y revisión comercial por sesión |
| `server/audio-library.js` | Lectura, checksum, escritura temporal/renombrado, límite, caducidad y vaciado |
| `server/audio-store.js` | Tablas SQLite `audio_library` y `audio_library_metrics` |
| `server/providers/local-tts.js` | Identidad verificable de voz y generación normal |
| `server/app.js` | Sesión obligatoria, decisión de reutilización y rutas administrativas protegidas |
| `public/admin.js` | Consulta de uso y vaciado por el administrador |

Los archivos WAV están en `audio-cache` junto a la base SQLite; por defecto, `C:\Projects\Nexo\data\audio-cache`. Sus nombres son hashes, no consultas ni nombres de personas. No se sirven como archivos públicos. El servidor entrega el audio por `/api/tts`, con sesión, validación y límites existentes.

Los metadatos incluyen tamaño, checksum, idioma, duración, tiempos de generación/uso y clave. Las estadísticas son agregadas. No se mezclan con la conservación de conversaciones. Se puede excluir esta carpeta derivada de las copias de respaldo; los archivos ausentes se regeneran. Si se cambia `DB_PATH`, la biblioteca sigue la carpeta de esa base.

Las operaciones de archivos se serializan; la generación de Piper conserva su límite de concurrencia existente. Un vaciado durante generación impide volver a guardar ese resultado pendiente. Una cancelación no guarda audio incompleto. No se han agregado procesos de generación masiva ni llamadas externas.

## Verificación

- 244 pruebas de servidor aprobadas, incluidas nueve específicas de biblioteca.
- Casos: persistencia, reutilización entre atenciones autorizadas, cambio de texto/idioma/voz/revisión, presupuesto, caducidad, corrupción, archivo perdido, huérfanos, fallos de almacenamiento, cancelación, vaciado, protección de API y configuración.
- `tests/audio-library.e2e.js`: dos llamadas reutilizan un saludo, francés genera un archivo independiente, panel administrativo y vaciado, privacidad de otras tablas y pantalla móvil.
- Regresiones de Administración y LiveAvatar simulado.
- Prueba con Piper real y datos aislados: saludo español, 673 ms en la primera petición y 4 ms en la reutilización; WAV idéntico de 86.576 bytes. Resultado puntual de esta PC, no promesa de rendimiento.
- Sin consultas reales a OpenAI, sesiones de LiveAvatar, reservas ni correos durante estas pruebas.

Próximos pasos opcionales: configuración gráfica del límite, métricas por idioma sin texto personal y evaluación de otras voces con su identidad de caché completa.
