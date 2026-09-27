# Prácticas, depuración y mantenimiento para estudiantes

Aprenda con datos ficticios y proveedores simulados. Estos ejercicios no requieren créditos de LiveAvatar ni credenciales reales.

## 1. Leer antes de cambiar

Antes de editar, identifique dónde se ejecuta el archivo, qué datos valida, qué devuelve, qué estado modifica y qué ocurre si el visitante cierra mientras espera. La cabecera del módulo y los contratos centrales orientan esa lectura; la [referencia de firmas](41-mapa-codigo-fuente.md) permite encontrar ayudantes.

## 2. Ejercicio: código legible de reserva

Lea `server/booking-code.js` y `tests/booking-code.test.js`. Compare código con/sin guion y mayúsculas/minúsculas. Distinga normalización, validación y presentación. Añada un caso ficticio inválido y ejecute:

```powershell
node --test tests/booking-code.test.js
```

Resultado esperado: variantes permitidas representan el mismo código; entradas mal formadas fallan. No sustituya azar criptográfico por Math.random: generación y unicidad persistente tienen responsabilidades diferentes.

## 3. Ejercicio: precio desconocido

Lea `filterSchoolMessage` y un caso de `tests/filter.test.js` o `tests/faq.test.js`. Prepare servicios ficticios con priceCents null, 0 y 2500. Use state nuevo por escenario.

Resultado: pendiente, sin costo y 25.00 respectivamente. Explique por qué `if (!priceCents)` confunde cero y null antes de modificar la función.

## 4. Ejercicio: cancelar envío automático

Lea `CallConversation` y `tests/auto-conversation.test.js`. Inyecte callbacks y reloj controlado. Entregue texto final, pause antes del plazo y compruebe que no se envía. Después compruebe que una frase final válida dispara send una sola vez. partial debe cancelar una frase en preparación si la persona continúa hablando.

Resultado: probar tiempo sin dormir minutos ni usar micrófono físico. No cambie los tiempos de producción para hacer pasar la prueba.

## 5. Ejercicio: audio separado por voz

Lea `audio-policy.js`, `audio-library.js` y su test. Un proveedor falso devuelve WAV válido y cuenta llamadas. La misma respuesta autorizada/identidad reutiliza audio; cambiar idioma o identidad genera otro. Vaciar durante una síntesis no debe permitir que reaparezca después.

Resultado: entender clave de caché, checksum y epoch. Un hash solo del texto no basta cuando cambia voz/modelo/contenido vigente.

## 6. Ejercicio: reserva incierta

Lea `BookingService.reserve` y `tests/booking.test.js`. Simule creación recibida por Google con respuesta perdida. Reintente el mismo requestId: no debe insertar otro evento y el horario sigue protegido mientras esté pending.

Resultado: explicar idempotencia (repetir la misma solicitud sin duplicar efecto) y reconciliación (comprobar el resultado externo).

## 7. Pruebas por alcance

| Cambio | Verificación útil |
| --- | --- |
| Comentarios | Sintaxis, cobertura documental y lógica intacta |
| Filtro/FAQ | filter, faq, intent y regresiones |
| Agenda | booking, agenda-conversation, google-calendar con dobles |
| Audio | audio-library, local-tts y speech |
| Formularios/portal | E2E de página y revisión desktop/móvil |
| Autenticación | admin-access y rutas administrativas |

```powershell
npm run check
npm run docs:check
npm test
node --test tests/booking.test.js
npm run test:docs
```

Los E2E importan Playwright. Puede configurar `PLAYWRIGHT_MODULE` con una instalación disponible y `BROWSER_CHANNEL` con el navegador instalado. Una máquina nueva no necesariamente tiene las herramientas auxiliares del entorno original.

`filter-live.e2e.js` e `intent-live.e2e.js` son optativos y pueden consumir OpenAI; no forman parte de npm test. Los E2E habituales usan dobles. Un micrófono simulado no demuestra calidad ni permisos del dispositivo físico.

## 8. Leer una prueba

Prepare escenario, ejecute y compruebe. fixture reúne preparación; assert.equal compara valor y assert.rejects espera error de promesa. t.after/finally liberan conexiones y temporales incluso si falla.

`createRepository(':memory:')` usa SQLite temporal. `server.listen(0, '127.0.0.1')` elige puerto libre sin apagar el kiosco. fetchImpl, spawnImpl, now y clock controlan red, procesos y tiempo.

Una prueba útil protege comportamiento: evitar duplicados, mezclar usuarios o inventar precio. No escriba pruebas que solo repitan un comentario.

## 9. Depurar por capas

### Navegador

Revise consola, solicitud HTTP, controles y callbacks. Un 401 no se arregla cambiando el color del botón. Si llegó JSON correcto, revise generación, DOM y traducción antes del proveedor.

### Servidor

Reproduzca con datos mínimos: body -> validación -> regla -> proveedor/almacén. Registre etapa/código; nunca config completo, cookies o cuerpos con información personal.

### Persistencia

Consulte estado/revisión mediante repositorio. No borre pending para liberar un horario sin reconciliar Google. Respete unidades de precio y tiempo.

### Asincronía

Interfaz ocupada: revisar finally. Audio después de colgar: generation/owner/abort. Caché repoblada tras vaciar: epoch. Correo duplicado: claimBookingReceipt.

## 10. Cambiar proveedor

1. Identifique contrato: reply, interpret, synthesize, start/stop o callbacks.
2. Cree un adaptador separado; no disperse llamadas externas por pantallas.
3. Conserve cancelación, límites y errores controlados.
4. Pruebe éxito, error, timeout y cierre tardío relevantes con un doble.
5. Si cambia voz, actualice identidad/versiones de caché.
6. Actualice configuración, manual y evidencia de tarea.

MetaHuman sigue como fase futura. Cambiar la imagen no demuestra haber integrado ese proveedor.

## 11. Mantener comentarios útiles

Explique invariantes: «guardamos pending antes de la red para no duplicar eventos». Evite repetir lo obvio como «incrementa i». Distinga valor devuelto de efecto: una función puede devolver undefined y actualizar DOM.

Al cambiar firma, actualice entrada/salida y ejemplos. Indique unidades y datos privados. Los comentarios no sustituyen validación ejecutable. Actualice fichas en `docs/codigo/`; docs:check verifica presencia/enlaces, no semántica ni vigencia de cada firma.

## 12. Entregar una mejora

Describa problema, comportamiento final, archivo responsable, pruebas y límite pendiente. Actualice `docs/project-status.json` y consulte el [manual GitHub](24-manual-github.md). Mantenga documentos solo de Nexo.

Distinga resultados simulados de hardware/proveedores reales. Información comercial sin confirmar debe seguir pendiente.
