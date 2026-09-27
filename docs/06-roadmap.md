# 06 · Roadmap del MVP

> **Perfil activo: MetodoMogollon (16/09/2026).** Escuela de conducción; trato de usted; atención de lunes a viernes, 08:00–18:00 (Nueva York). Servicios confirmados por el responsable; precios y requisitos pendientes. Google Calendar será la agenda, aún sin conectar. El perfil de la escuela deshabilita las reservas locales y los horarios/precios de ejemplo descritos en la demo original. [Configuración y pendientes](16-metodomogollon.md).


**Actualizado el 16 de septiembre de 2026:** se adelanta el avatar de video y se elige iPad como terminal. La implementación local permite desarrollar antes del despliegue. [Decisión de etapas](14-etapas-liveavatar-metahuman.md).

| Hito | Resultado | Estado | Criterio de salida |
|---|---|---|---|
| Base local | Documentación, conversación, catálogo, turnos y administración | Entregado | Demo y pruebas locales ejecutables |
| Etapa 1A · Integración LITE | Espera sin consumo, voz propia, video bajo demanda, cierre e interrupción | Código, simulaciones y conexión real en Edge verificados | Cuenta real conectó y se confirmó cierre; iPad pendiente |
| Etapa 1B · Conversación real | Asesora elegida, OpenAI, voz española y latencia medida | Pendiente de cuentas/configuración | Respuestas correctas sobre catálogo y fallo explícito sin simulación oculta |
| Etapa 1C · iPad | HTTPS, reproducción, micrófono, orientación y modo kiosco | Pendiente de despliegue/dispositivo | Diez atenciones supervisadas; abandono y cortes probados |
| Centro real | Catálogo, agenda, recursos, feriados, usuarios admin y privacidad | Pendiente de reglas del centro | Reservas reales sin doble asignación ni exposición entre visitantes |
| Etapa 2 · MetaHuman | Personaje propio y renderizado en PC/servidor GPU; streaming al iPad | Planificado | Calidad, latencia y costo comparados con etapa 1; adaptador independiente |
| Ventas y pagos | Orden, checkout alojado, webhooks, conciliación | Posterior | Sandbox de éxito, rechazo, duplicado y devolución |
| Flota / vending | Gestión de dispositivos, recuperación y periféricos | Posterior | Reinicio y corte de red recuperables |

## Trabajo inmediato

1. Configurar clave y avatar ID de LiveAvatar localmente; verificar plan/créditos y habilitar consumo para el piloto.
2. Probar labios, gestos y voz con respuestas demo antes de habilitar OpenAI.
3. Activar OpenAI con una clave y modelo disponibles. Probar servicios, precios, solicitudes fuera de catálogo y errores.
4. Preparar HTTPS y probar en el iPad objetivo. Medir inicio de sesión, primera voz y consumo por atención.
5. Validar micrófono en el entorno, ruido, eco, permisos y conexión. Sustituir STT/TTS solo según resultados.
6. Sustituir catálogo ficticio y resolver requisitos operativos antes de uso público.

## Cuándo iniciar MetaHuman

Después de conocer volumen de uso, costo real de LiveAvatar, requisitos visuales y latencia. La PC GPU local y el servidor GPU son alternativas por evaluar; no se compra infraestructura ni se desarrolla Unreal en esta entrega. Se mantienen los contratos de conversación, voz y sesión. No hay fecha comprometida para esta fase.

## Piloto Linux — v0.25.0

NEXO-44 completado: preparación del código, acceso privado, voz Linux y despliegue documentado. NEXO-16/17/18 parciales: queda validar el servidor real, sus integraciones y respaldos externos. NEXO-45 pendiente: Capacitor/APK después del piloto web. [Guía](45-despliegue-piloto-linux.md) · [Seguridad](46-seguridad-piloto.md).
