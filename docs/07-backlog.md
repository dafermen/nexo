# 07 · Backlog inicial

> **Perfil activo: MetodoMogollon (16/09/2026).** Escuela de conducción; trato de usted; atención de lunes a viernes, 08:00–18:00 (Nueva York). Servicios confirmados por el responsable; precios y requisitos pendientes. Google Calendar será la agenda, aún sin conectar. El perfil de la escuela deshabilita las reservas locales y los horarios/precios de ejemplo descritos en la demo original. [Configuración y pendientes](16-metodomogollon.md).


Prioridad: **P0** bloquea el núcleo; **P1** habilita piloto; **P2** expansión. Tamaño: S pequeño, M medio, L grande; no representa una promesa de fecha. Los roles son responsabilidades propuestas, no asignaciones a personas concretas.

## Entregado

| ID | Historia | Prioridad | Tamaño | Evidencia de aceptación |
|---|---|---|---|---|
| B-01 | Como visitante quiero ver servicios sin capacitación | P0 | M | Pantalla inicial, catálogo y botones táctiles |
| B-02 | Quiero conversar escribiendo y ver el historial | P0 | M | Demo, sesión, envío, respuesta y errores |
| B-03 | Quiero saber si uso IA real o una simulación | P0 | S | Etiqueta permanente y aviso previo |
| B-04 | Quiero ver al asistente reaccionar a la conversación | P0 | M | Retrato fotográfico e indicadores de estado conectados a eventos de voz; respaldo SVG |
| B-05 | Quiero elegir un servicio y horario disponible | P0 | M | Calendario de ejemplo y validación en servidor |
| B-06 | Quiero revisar mis datos antes de reservar | P0 | M | Formulario con consentimiento y pantalla de revisión |
| B-07 | Quiero un comprobante aunque repita la confirmación | P0 | M | Persistencia, idempotencia y restricción de horario |
| B-08 | Quiero que mi información desaparezca al irme | P0 | M | Limpieza, aviso y cierre por inactividad |
| B-09 | Como personal quiero consultar y cancelar turnos | P1 | M | Administración protegida y liberación de horario |
| B-10 | Como administrador quiero pausar un servicio | P1 | S | API y controles administrativos |
| B-11 | Como equipo técnico quiero cambiar proveedores | P0 | M | Contratos separados de IA, STT, TTS y avatar |
| B-12 | Quiero instalar y probar la demo fácilmente | P0 | M | Arranque Windows, README y pruebas sin paquetes de ejecución |
| B-13 | Quiero entender el proyecto y próximos pasos | P0 | M | Documentos de alcance, requisitos, arquitectura, datos, flujos y roadmap |

## Siguiente iteración

| ID | Historia / tarea | Pri. | Tamaño | Dependencias | Aceptación pendiente | Rol |
|---|---|---|---|---|---|---|
| B-14 | Activar y evaluar IA real | P0 | M | Credencial y modelo en cuenta | Consulta real responde; fallo de conexión no aparenta éxito; catálogo respetado | Desarrollo + producto |
| B-15 | Validar entrada y salida de voz físicas | P0 | M | PC, micrófono y altavoz | Español entendible, transcripción corregible, silencio y cancelación efectivos | QA + operación |
| B-16 | Sustituir catálogo ficticio | P1 | S | Servicios, moneda y condiciones reales | Contenido aprobado por responsable del centro | Producto |
| B-17 | Modelar agenda, recursos y feriados | P1 | L | Reglas del centro | No sobreasignar un recurso entre servicios; DST y cierres probados | Desarrollo |
| B-18 | Editar catálogo mediante admin | P1 | M | B-16 | Alta, edición, validación y auditoría; cambios no alteran comprobantes anteriores | Desarrollo |
| B-19 | Usuarios administrativos y roles | P1 | L | Identidades del centro | Login individual, permisos mínimos, expiración y auditoría con actor | Desarrollo |
| B-20 | Adaptar privacidad y retención | P1 | M | País, política y datos mínimos | Avisos aprobados, borrado probado, copia de seguridad con retención | Producto + operación |
| B-21 | Auditar accesibilidad y tactilidad | P1 | M | Personas y dispositivos de prueba | Teclado/lector, contraste, foco, tamaño de controles y uso sentado | Diseño + QA |
| B-22 | Evaluar calidad del agente | P1 | M | B-14, catálogo aprobado | Dataset de preguntas y ataques; registrar errores sin PII | Desarrollo + producto |
| B-23 | Métricas de latencia, costos y errores | P1 | M | B-14 | Panel agregado sin texto de conversaciones y límites por dispositivo | Desarrollo |
| B-24 | Pruebas de abandono y fallos de red | P1 | M | PC objetivo | Cortes durante voz/reserva y reinicio no exponen datos ni duplican turnos | QA |
| B-25 | Soporte y derivación humana real | P1 | M | Operación del centro | Solicitud visible al personal, confirmación y salida alternativa | Desarrollo + operación |

## Fases posteriores

| ID | Historia / tarea | Pri. | Tamaño | Dependencias | Aceptación |
|---|---|---|---|---|---|
| B-26 | Adaptador STT/TTS alternativo | P1 | L | Resultado B-15 | Pruebas de contrato; sin secretos permanentes en cliente |
| B-27 | Voz con streaming e interrupción | P2 | L | Latencia medida | Detener respuesta al hablar sin mezclar turnos conversacionales |
| B-28 | Instalación kiosco y watchdog | P1 | L | Hardware | Arranque y recuperación automáticos con usuario restringido |
| B-29 | Calendario compartido y PostgreSQL | P2 | L | Varias estaciones | Migraciones y pruebas concurrentes con agenda consistente |
| B-30 | Registro de órdenes comerciales | P2 | L | Condiciones de venta | Orden separada de cita, precio congelado y confirmación explícita |
| B-31 | Pagos alojados por proveedor | P2 | L | B-30, país/proveedor | Sandbox cubre rechazo, éxito, duplicado, timeout y webhook falso |
| B-32 | Reembolsos y conciliación | P2 | L | B-31 | Permisos, auditoría y conciliación con proveedor |
| B-33 | Comprobante por email/SMS/impresora | P2 | M | Consentimiento/canal | Solo enviar tras confirmación, reintento sin duplicar |
| B-34 | MetaHuman como segunda etapa | P2 | L | Piloto LiveAvatar medido | Personaje y streaming desde GPU; conservar conversación y turnos |
| B-35 | Flota de kioscos y actualizaciones | P2 | L | Piloto validado | Identidad por dispositivo, telemetría y despliegue gradual |
| B-36 | Idiomas adicionales | P2 | M | Demanda y contenido traducido | Catálogo, voz, formularios y errores coherentes por idioma |

## Deuda técnica conocida

- Migraciones de esquema y edición completa de catálogo aún no implementadas.
- Agenda derivada de una regla fija y capacidad independiente por servicio.
- Memoria y límites de solicitudes vinculados a un único proceso/IP local.
- Credencial administrativa compartida y sin identidad de operador.
- No hay presupuestos monetarios de API, trazas distribuidas, respaldos automáticos ni monitoreo de hardware.
- Adaptadores de voz dependen de capacidades/políticas del navegador; no se incluyen reconocimiento local ni voces instalables.
- Vista adaptable inicial; dimensiones y alcance físico del kiosco definitivo todavía no se conocen.


## Actualización v0.2.0 · B-34

Implementación parcial entregada: adaptador LiveAvatar, voz y video desde el texto de Nexo, controles de inicio/interrupción/cierre, configuración local y pruebas simuladas. Pendientes: cuenta y avatar elegidos, validación real de labios/gestos/latencia, personalización del rostro y aceptación del piloto. No se marca B-34 como terminado.


## Actualización v0.3.0 · B-34

Entregado avatar 3D local sin cuenta, pose, parpadeo, formas de boca aproximadas y voz Piper española. Probado con audio y modelo reales. Pendientes calidad de personaje, alineación fonética exacta y aceptación física del centro.

## Prioridad vigente: etapa 1 LiveAvatar en iPad

| ID | Trabajo | Prioridad | Estado / aceptación |
|---|---|---|---|
| LA-01 | Adaptador LITE y audio PCM propio | P0 | Implementado; contrato verificado con dobles |
| LA-02 | Espera sin sesión, cierre por inactividad e interrupción | P0 | Implementado y recorrido de navegador verificado |
| LA-03 | Cuenta, avatar ejecutivo y sesión externa | P0 | Pendiente: clave/ID, plan y selección visual en cuenta |
| LA-04 | Activar OpenAI y evaluar respuestas del catálogo | P0 | Pendiente de clave/modelo; adaptador ya existe |
| LA-05 | HTTPS e iPad físico | P0 | Pendiente: proxy, dispositivo, sonido, STT y permisos |
| LA-06 | Medir latencia y consumo; presupuesto/alertas | P1 | Pendiente; límites por sesión implementados |
| LA-07 | Piloto supervisado con fallos y abandono | P1 | Diez atenciones, sin datos entre visitantes; cierre remoto confirmado |
| MH-01 | Estudio MetaHuman/GPU/streaming | P2 | Etapa 2, después de LA-07 |

Estas prioridades sustituyen el orden anterior que dejaba todo avatar avanzado para el final. El 3D local permanece como experimento opcional.

## Configuración de la escuela y agenda

- Implementado: perfil de MetodoMogollon, trato de usted, catálogo informativo y bloqueo de reservas mientras falta la agenda.
- Pendiente: enlace/autorización de Google Calendar, disponibilidad real y confirmación de turnos.
- Pendiente: precios, requisitos, modalidad y duración por servicio, alcance del examen teórico y edición administrativa del catálogo.

## Panel editable completado (v0.5.0)

Implementado: alta, edición y pausa de servicios; precios, requisitos, duración, modalidad; nombre y horarios semanales; persistencia y conflictos de edición; actualización del kiosco y contexto de IA. Sustituye el pendiente de edición administrativa del perfil inicial. Pendientes: cuentas/roles, agenda Google Calendar, feriados y horarios partidos.

## Comprensión del visitante (v0.10.0)

Implementado: interpretación de frases dudosas, ejemplos regionales y errores de transcripción, contexto de aclaración, respuestas con catálogo y presupuesto compartido. Rechazos decididos por IA no sancionan al visitante. Pendiente: ampliar evaluación con expresiones reales proporcionadas voluntariamente, prueba con micrófono físico en ruido e iPad, y editor gráfico de FAQs.


## Atención en tres idiomas — v0.23.0

NEXO-41: selector Español · English · Français en el inicio, voz y conversación por idioma, fechas y formularios localizados, y correo de nuevas reservas en el idioma elegido. [Operación, arquitectura, pruebas y límites](39-idiomas.md). Los textos comerciales nuevos requieren traducciones revisadas; queda pendiente su editor en Administración y la validación con hablantes nativos.

## Piloto Linux — v0.25.0

NEXO-44 completado: preparación del código, acceso privado, voz Linux y despliegue documentado. NEXO-16/17/18 parciales: queda validar el servidor real, sus integraciones y respaldos externos. NEXO-45 pendiente: Capacitor/APK después del piloto web. [Guía](45-despliegue-piloto-linux.md) · [Seguridad](46-seguridad-piloto.md).
