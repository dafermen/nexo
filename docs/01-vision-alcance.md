# 01 · Visión y alcance

> **Perfil activo: MetodoMogollon (16/09/2026).** Escuela de conducción; trato de usted; atención de lunes a viernes, 08:00–18:00 (Nueva York). Servicios confirmados por el responsable; precios y requisitos pendientes. Google Calendar será la agenda, aún sin conectar. El perfil de la escuela deshabilita las reservas locales y los horarios/precios de ejemplo descritos en la demo original. [Configuración y pendientes](16-metodomogollon.md).


## Decisión de producto vigente

Primera etapa: asesora LiveAvatar en kiosco iPad, con conversación, catálogo y turnos propios. Segunda etapa: evaluar MetaHuman con renderizado en PC/servidor GPU. La demo local sigue siendo el entorno de desarrollo. El video real se verificó en Edge; el iPad físico sigue pendiente de validar. [Plan aprobado](14-etapas-liveavatar-metahuman.md).

## Visión

Convertir una pantalla en un punto de atención accesible que ayude a una persona a comprender un servicio y completar su siguiente paso. La interacción principal es una conversación con un personaje virtual identificado como asistente de IA, complementada por controles táctiles y texto.

**Caso de uso elegido por el usuario:** turnos y servicios de un centro de atención. **Nombre provisional del producto:** Nexo. **Primera entrega:** demo funcional local, independiente de hardware especial.

## Problema y oportunidad

Los visitantes no siempre saben qué servicio necesitan, cómo iniciar un trámite o qué horario está disponible. El kiosco ofrece orientación consistente y una reserva guiada, con una salida clara hacia el personal del centro cuando no puede resolver la consulta.

No pretende sustituir la autoridad del personal, prometer resultados administrativos ni tomar decisiones profesionales. Una reserva requiere revisar los datos y confirmar mediante la interfaz.

## Personas usuarias

| Persona | Necesidad | Resultado esperado |
|---|---|---|
| Visitante | Saber dónde acudir o qué solicitar | Entender un servicio sin aprender el sistema |
| Visitante con turno | Elegir atención y horario | Obtener un comprobante visible |
| Personal de atención | Revisar y corregir reservas | Ver turnos y liberar un horario cancelado |
| Administrador del centro | Controlar oferta y operación | Pausar servicios y supervisar el kiosco |
| Equipo técnico | Cambiar IA, voz o avatar | Sustituir adaptadores con impacto acotado |

## Alcance implementado v0.1

1. Interfaz de kiosco en español, adaptable a orientación horizontal y vertical.
2. Recepcionista con retrato fotográfico generado por IA e indicadores de disponibilidad, escucha, pensamiento y habla. Esta versión no anima el rostro ni sincroniza labios. El avatar SVG original queda como respaldo de carga.
3. Conversación por teclado y reconocimiento de voz del navegador; transcripción editable.
4. Respuestas preparadas para demo y adaptador configurable de IA generativa mediante OpenAI.
5. Síntesis de voz del navegador, silencio y reproducción manual de una respuesta.
6. Catálogo con tres servicios de ejemplo y horarios generados localmente.
7. Formulario de registro mínimo vinculado al turno, revisión, confirmación y comprobante.
8. Backend HTTP modular y persistencia SQLite.
9. Administración local: listar reservas, cancelar, habilitar y pausar servicios.
10. Sesiones efímeras, validación en servidor, límites de solicitudes y aislamiento básico de datos.

## Fuera de esta primera entrega

- Cobros, tarjetas, billeteras digitales, facturación y reembolsos.
- Integración con calendario operativo, CRM, ERP o turnero existente.
- Cuentas de visitantes, autenticación de identidad o carga de documentos.
- Alta efectiva de un servicio comercial y emisión de contratos.
- Envío de correos, SMS, WhatsApp o comprobantes impresos.
- Derivación automática a un operador y cola presencial en tiempo real.
- Reconocimiento biométrico, cámaras, sensores, impresora o lector de tarjetas.
- Avatar de video, motor 3D, holografía o clonación de personas reales.
- Operación pública desatendida y despliegue de múltiples kioscos.

## Supuestos explícitos

- Un centro, una PC, idioma español y zona horaria del sistema operativo del servidor.
- Catálogo y precios ficticios en USD, sin moneda comercial confirmada por el usuario.
- Un recurso independiente por servicio, con un cupo a las 09:00, 10:00, 11:00, 14:00 y 15:00.
- Se ofrecen los próximos cinco días hábiles, a partir del día siguiente. Sin feriados, pausas ni agenda de profesionales.
- Registro de nombre y correo para demostrar el flujo; no se verifican identidad ni dirección de correo.
- La PC puede tener acceso a internet para IA y voz, aunque sirva la aplicación localmente.
- La demo utiliza datos ficticios y se prueba bajo supervisión.

## Criterios de éxito del MVP

**Entrega técnica:** iniciar desde una carpeta, comprender el modo activo, conversar por texto y completar una reserva persistida; ningún doble envío debe duplicar el turno. Demostración de cambios de estado del avatar y conexión de las interfaces de voz.

**Validación siguiente:** un visitante puede elegir y reservar sin ayuda en menos de tres minutos; 9 de 10 frases de prueba se transcriben de manera utilizable en el lugar real; no queda información de la sesión anterior al finalizar. Estas métricas son metas del piloto, no resultados ya medidos.

## Decisiones pendientes del centro

Servicios reales, requisitos y precios; país y moneda; identidad visual; idioma o idiomas adicionales; agenda y personal; horarios y feriados; datos imprescindibles; conservación y aviso de privacidad; asistencia humana; eventual proveedor de pagos. Estas decisiones no bloquean la demo entregada.
