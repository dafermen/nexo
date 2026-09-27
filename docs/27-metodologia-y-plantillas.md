# Metodología y plantillas de Nexo

## Forma de trabajar

Cada tarea debe partir de una necesidad del visitante, del personal o del equipo de desarrollo. Describa el resultado observable, identifique la capa responsable, implemente un cambio acotado y registre evidencia proporcional al riesgo.

Mantenga juntos código, pruebas relevantes y documentación. No confunda una prueba automática con una validación física ni una integración preparada con una conexión real disponible.

## Plantilla de tarea

```text
ID:
Fase:
Necesidad:
Resultado esperado:
Alcance:
Dependencias:
Criterios de aceptación:
Estado: pendiente / parcial / realizada
Evidencia:
Siguiente paso:
```

Ejemplo:

```text
ID: NEXO-P03
Necesidad: evitar errores de voz en el centro.
Resultado esperado: una persona completa una consulta por voz en el entorno real.
Dependencias: PC o iPad, micrófono, altavoz y conexión.
Criterios: no se escucha a sí mismo; transcribe, responde y permite colgar.
Evidencia: pasos, dispositivo, navegador y observaciones sin datos personales.
```

## Plantilla de error

```text
Qué esperaba:
Qué ocurrió:
Pasos para reproducir:
Dispositivo y navegador:
Frase de ejemplo sin datos personales:
Momento aproximado:
Evidencia visual revisada:
```

## Plantilla de decisión técnica

```text
Título y fecha:
Problema:
Opciones consideradas:
Decisión:
Motivo:
Consecuencias y límites:
Cómo se verificará:
Condición para revisarla:
```

## Plantilla de cierre y continuidad

```text
Trabajo completado:
Archivos o módulos afectados:
Pruebas ejecutadas y resultado:
Proveedores reales usados y consumo observado:
Qué no se ha validado:
Pendientes y dependencias:
Siguiente tarea sugerida:
```

## Validación por tipo de cambio

| Cambio | Verificación útil |
|---|---|
| Redacción de una FAQ | Validar archivo y probar la frase |
| Contexto o intención | Regresión de varias frases y seguimiento |
| Consumo y sesiones | Cuotas, concurrencia, cancelación y fallos |
| Interfaz | Vista móvil, teclado, mensajes de error y recorrido |
| Documentación | Enlaces, legibilidad, búsqueda y coherencia del estado |
| API de pago | Dobles primero; prueba real acotada cuando sea necesaria |
| Hardware | Prueba física y registro del dispositivo |

Los archivos de configuración, claves, datos personales y grabaciones no forman parte de una evidencia pública. Use ejemplos ficticios y métricas agregadas.
