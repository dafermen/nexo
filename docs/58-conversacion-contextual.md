# Conversación con contexto y elección de profesor — v0.38.0

## Qué cambia para el visitante

Nexo conserva más contexto dentro de una atención y prepara citas con el profesor solicitado. Funciona por texto y con la transcripción de voz. Los temas visuales y la voz masculina son independientes de esta mejora.

| Ejemplo | Comportamiento |
|---|---|
| «Con Héctor el viernes a las nueve de la mañana» | Consulta horarios reales de ese profesor. Si está libre, abre nombre/correo con profesor y hora seleccionados. |
| «Mejor con Darío» | Conserva día y hora, cambia profesor y vuelve a consultar. No utiliza el cupo de Héctor para afirmar que Darío está libre. |
| «Mejor el martes a la misma hora» | Conserva hora y profesor. Sin una hora previa, solicita aclaración. |
| «La segunda» | Revalida la opción y prepara el formulario; esa hora queda como referencia para futuras correcciones. |
| «Cualquier profesor» | Quita la preferencia. El visitante elige uno disponible en el formulario. |
| «No el de cinco horas, mejor el libro» | Interpreta la corrección en lugar de responder con el primer servicio mencionado. |
| «¿Y eso qué incluye?» | El intérprete recibe servicio y conversación reciente; inclusiones/condiciones se resuelven con el catálogo vigente. |

Una solicitud ambigua puede necesitar otra pregunta. No se promete comprender todas las expresiones. Si la transcripción no coincide con lo dicho, hay que evaluar el reconocimiento del micrófono por separado.

## Flujo y fuentes de verdad

```text
Voz → transcripción ─┐
Texto escrito ──────┴→ filtro y respuestas locales claras
                       ↓ si hace falta interpretar
                   IA + contexto → plan validado
                       ├→ catálogo/FAQ → respuesta comercial
                       ├→ orientación → respuesta acotada al catálogo
                       └→ Calendar por profesor → opciones/formulario
                                                     ↓
                                         nombre + correo + revisión
                                                     ↓
                                         confirmación del visitante
```

Precios, requisitos, inclusiones y condiciones vienen del catálogo/FAQ. Los profesores proceden de la configuración de agenda. **La disponibilidad se consulta de nuevo; el modelo no la inventa.** La conversación nunca crea, cancela ni mueve citas por sí sola.

## Memoria temporal y privacidad

- `schoolState.recentTurns`: últimos tres intercambios, máximo 280 caracteres por mensaje/respuesta, enviados al intérprete como datos no confiables.
- `schoolState`: servicio, dato pendiente y pregunta de orientación. Una corrección tiene prioridad sobre preferencias anteriores.
- `agendaState`: servicio, profesor, fecha, franja/hora, aclaración pendiente y hasta tres opciones.
- La orientación generativa recibe hasta dos intercambios recientes. Una consulta clara continúa resolviéndose localmente.
- La memoria no se comparte entre visitantes; termina al cerrar, caducar o reiniciar la sesión. El historial administrativo mantiene su conservación separada.

Los formularios de nombre/correo no se incorporan a la IA. El contexto breve enmascara correos y secuencias reconocibles de teléfono; no es un anonimizador completo. Evite datos sensibles en el chat. Desvíos rechazados, límites y errores de interpretación no se añaden a esa memoria. Una nueva pregunta enviada al modelo sigue su tratamiento habitual; `store:false` no sustituye las políticas del proveedor.

## Recorrido para el desarrollador junior

1. `server/school-filter.js` mantiene saludos y consultas claras sin IA. Correcciones, comparaciones y coincidencias inciertas pueden pedir interpretación. Inclusiones/condiciones salen de campos editables del servicio.
2. `server/school-intent.js` construye y valida el esquema. `rememberInterpretation()` limita la memoria. `guidance` permite pasar al redactor acotado; el clasificador nunca devuelve precios libres.
3. `server/app.js` aplica cuotas antes de **cada** consulta. `handleAgenda()` procesa tanto peticiones directas como reservas detectadas semánticamente. Al cerrar la sesión descarta resultados tardíos.
4. `BookingService.publicStatus()` publica profesores activos con ID público, nombre y servicios; nunca identificadores de Calendar ni credenciales.
5. `server/agenda-conversation.js`: `instructorId: null` conserva la preferencia; `anyInstructor: true` la quita explícitamente. Se rechazan IDs desconocidos y combinaciones contradictorias. Un profesor pausado o no habilitado requiere otra elección.
6. `resolveAgenda()` filtra `schedule[].instructorIds`, no solo los horarios agregados de `slots`. Una selección vuelve a consultar disponibilidad.
7. `public/app.js` recibe `preferredSlot` y `preferredInstructor`, vuelve a validar ambos y preselecciona al profesor. No sustituye silenciosamente por otro profesor libre.

El modelo puede interpretar mal incluso al devolver JSON válido. La validación comprueba estructura, IDs y reglas; no garantiza comprensión perfecta. Referencia: [Structured Outputs de OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs).

## Consumo y configuración

Se conserva el modelo y no se elevan límites. Una consulta clara puede consumir cero llamadas; una ambigua normalmente una; una reserva indirecta u orientación puede necesitar dos (interpretación general y plan de agenda o redacción). Ambas descuentan del mismo presupuesto, sin reintentos automáticos ilimitados. Se respetan el máximo de salida configurado y el límite de tamaño de entrada.

Al agotar el cupo siguen disponibles catálogo y formularios. Los resultados dinámicos de agenda no entran en la biblioteca de audio reutilizable. LiveAvatar mantiene su máximo de 60 segundos.

## Verificación y límites

Validación local: 317 pruebas del servidor aprobadas, sintaxis y cobertura documental verificadas. Recorridos de reserva móvil y portal de documentación aprobados. Estas cifras corresponden a la versión 0.38.0.

- Pruebas de memoria acotada, separación por visitante, enmascarado, correcciones, inclusiones/condiciones y presupuestos compartidos.
- Agenda: profesor ocupado, cambio de profesor/día, ordinales, hora ambigua, profesor pausado/desconocido y opción caducada.
- API simulada: intención indirecta → plan validado → disponibilidad → formulario; dos llamadas consumen dos cupos y no crean citas.
- Navegador móvil con voz simulada: Héctor → Darío, formulario preseleccionado y rechazo si Darío se ocupa antes de abrirlo aunque otro profesor siga libre. Revisión y confirmación solo en calendario/correo de prueba.

La prueba adicional con frases ficticias contra OpenAI real está pendiente de autorización específica; no se ejecutó en esta validación.

La validación física del micrófono y la evaluación con el modelo real se registran aparte; las pruebas simuladas no las sustituyen. Para mejorar con casos del cliente, registre frase, transcripción, respuesta y resultado esperado, revise los informes administrativos y añada una prueba antes de modificar reglas o FAQ.
