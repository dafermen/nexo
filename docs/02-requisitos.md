# 02 · Requisitos funcionales y no funcionales

> **Perfil activo: MetodoMogollon (16/09/2026).** Escuela de conducción; trato de usted; atención de lunes a viernes, 08:00–18:00 (Nueva York). Servicios confirmados por el responsable; precios y requisitos pendientes. Google Calendar será la agenda, aún sin conectar. El perfil de la escuela deshabilita las reservas locales y los horarios/precios de ejemplo descritos en la demo original. [Configuración y pendientes](16-metodomogollon.md).


Estado: **Implementado** = disponible en código; **Parcial** = existe una base con validación pendiente; **Futuro** = fuera de la entrega actual. La lista describe el estado real, sin equiparar un adaptador implementado con un servicio externo probado.

## Requisitos funcionales

| ID | Requisito | Prioridad | Aceptación | Estado |
|---|---|---|---|---|
| RF-01 | Mostrar inicio de kiosco y servicios | P0 | Se carga desde localhost y permite navegación táctil o teclado | Implementado |
| RF-02 | Mostrar un asistente virtual y sus estados | P0 | Retrato en espera y LiveAvatar LITE bajo demanda | Parcial: código y simulación probados; video real pendiente |
| RF-03 | Iniciar sesión con aviso de uso | P0 | Ninguna sesión se crea sin aceptar el aviso | Implementado |
| RF-04 | Enviar texto y mostrar respuesta | P0 | Consulta de 1–1000 caracteres; respuesta visible y recuperable ante error | Implementado |
| RF-05 | Reconocer voz y mostrar transcripción | P0 | Texto editable; permiso denegado y navegador incompatible tienen alternativa | Parcial: integración probada con simulación; micrófono real pendiente |
| RF-06 | Reproducir voz | P0 | Silenciar, cancelar y volver a escuchar sin mezclar sesiones | Piper probado con audio real en navegador; escucha física pendiente |
| RF-07 | Responder con IA generativa | P0 | Con credenciales válidas, respuesta de proveedor real y error explícito si falla | Parcial: adaptador probado con respuesta simulada |
| RF-08 | Probar sin credenciales | P0 | Modo DEMO visible y respuestas preparadas sin llamadas de IA | Implementado |
| RF-09 | Consultar servicios, duración y precio | P0 | Solo servicios activos; valores del catálogo del servidor | Implementado |
| RF-10 | Consultar horarios por servicio | P0 | Cinco días hábiles; horarios ocupados no aparecen | Implementado con agenda de ejemplo |
| RF-11 | Registrar datos mínimos para un turno | P0 | Nombre, email válido y consentimiento explícito | Implementado |
| RF-12 | Revisar antes de confirmar | P0 | Pantalla con servicio, hora, precio y datos; permite volver | Implementado |
| RF-13 | Guardar reserva y emitir comprobante | P0 | Respuesta satisfactoria solo tras escribir en SQLite | Implementado |
| RF-14 | Evitar duplicados y conflictos | P0 | Igual requestId y contenido devuelve la misma reserva; horario único | Implementado |
| RF-15 | Finalizar y limpiar sesión | P0 | Borra texto y formularios, detiene voz y revoca token | Implementado |
| RF-16 | Cerrar por inactividad | P0 | Video: cierre a los 45 s sin actividad; texto: aviso al minuto 4 y cierre al 5 | Implementado |
| RF-17 | Administrar turnos | P1 | API protegida; listar hasta 200 recientes y cancelar con confirmación | Implementado |
| RF-18 | Administrar disponibilidad del catálogo | P1 | Habilitar/pausar servicio; no permite reservar uno pausado | Implementado |
| RF-19 | Editar catálogo y agenda reales | P1 | CRUD validado, feriados, recursos y calendario del centro | Futuro |
| RF-20 | Solicitar atención humana | P1 | Explicación textual para acudir al personal; derivación real posterior | Parcial |
| RF-21 | Adquirir/contratar un servicio | P2 | Orden comercial confirmada y auditable, distinta del turno | Futuro |
| RF-22 | Procesar pagos | P2 | Checkout, webhook verificado e idempotencia; sin tarjetas en IA | Futuro |
| RF-23 | Integrar hardware de kiosco | P2 | Inicio automático, supervisión de dispositivos y recuperación | Futuro |

## Requisitos no funcionales

| ID | Categoría | Objetivo verificable | Estado actual |
|---|---|---|---|
| RNF-01 | Portabilidad | Ejecutar con Node 24 y navegador, sin instalación de paquetes de aplicación | Implementado; verificado en Windows |
| RNF-02 | Modularidad | Proveedor de IA, STT, TTS y avatar intercambiables mediante contrato | Implementado; selección de avatar por configuración; STT/TTS por composición en código |
| RNF-03 | Rendimiento | API local de catálogo/reserva p95 <300 ms; respuesta IA p95 <8 s en piloto | Metas por medir; timeout IA 25 s y cliente 30 s |
| RNF-04 | Seguridad de red | Escucha en loopback, sin CORS abierto, verificación de Host/Origin | Implementado y probado |
| RNF-05 | Secretos | No enviar clave de IA ni token admin en respuestas públicas; .env excluido de Git | Implementado |
| RNF-06 | Integridad | SQL parametrizado, restricción única de horario y registro transaccional | Implementado y probado |
| RNF-07 | Privacidad | Audio no grabado por la app; chat en memoria; datos de reserva separados del prompt | Implementado; usuarios aún pueden escribir datos sensibles en el chat |
| RNF-08 | Retención | Limpieza al iniciar y cada hora, después de 7 días de la cita | Implementado; requiere servidor activo |
| RNF-09 | Accesibilidad | Teclado, foco visible, etiquetas y live region; alternativa textual y movimiento reducido | Base implementada; auditoría WCAG 2.2 AA y lector de pantalla pendientes |
| RNF-10 | Ergonomía táctil | Acciones principales de al menos 44 px y vista horizontal/vertical sin desbordamiento | Implementado en acciones principales; revisión de controles secundarios pendiente |
| RNF-11 | Recuperación | Errores de proveedor no confirman turnos; reintento seguro de reserva | Implementado y probado |
| RNF-12 | Observabilidad | Salud HTTP y auditoría de cambios sin texto de conversaciones | Base implementada; métricas y alertas pendientes |
| RNF-13 | Disponibilidad | Reinicio automático, modo degradado e instalación reproducible de kiosco | Futuro; servidor manual local |
| RNF-14 | Escalabilidad | Varias estaciones con agenda compartida y sin colisiones | Futuro; SQLite y sesiones en un único proceso |
| RNF-15 | Calidad IA | Explicaciones ajustadas al catálogo y evaluación de alucinaciones | Prompt restrictivo implementado; evaluación real pendiente |

## Reglas de negocio

- El chat no puede ejecutar reservas, cancelar, modificar precios ni cobrar. La única confirmación autorizada es la respuesta validada del backend al formulario.
- Precio y estado del servicio se comprueban en el momento de reservar. El cliente expresa el precio que vio para detectar cambios, no para determinar el importe.
- Un horario tiene un cupo por servicio. Una cancelación libera ese cupo.
- El requestId es una clave de idempotencia: repetir exactamente una solicitud con el mismo token de sesión no genera una segunda reserva. Cambiar sus datos o reutilizarla desde otra sesión genera conflicto.
- Solo se almacenan los datos mínimos demostrativos; no se solicitan identificaciones, tarjetas ni documentos por voz o chat.
- Los importes son ilustrativos. Un turno reservado no es un pago realizado ni un servicio contratado.

## Definición de terminado por fase

Una historia implementada necesita una ruta utilizable, manejo de fallos relevantes y documentación consistente. Las integraciones externas necesitan además una prueba real con el proveedor y la PC objetivo antes de considerarse validadas para un piloto.

## Requisitos de la etapa LiveAvatar / iPad

| ID | Requisito | Estado |
|---|---|---|
| RF-24 | Abrir video solo bajo demanda y sin descargar 3D en espera | Implementado y probado con proveedor simulado |
| RF-25 | Transmitir voz propia a LITE y descartar intervenciones canceladas | Implementado y probado con dobles; sincronización externa pendiente |
| RF-26 | Limitar duración y reservar habilitación de créditos al servidor | Implementado; presupuesto mensual pendiente |
| RNF-14 | Reproducción y micrófono en Safari/iPad por HTTPS | Pendiente de dispositivo y despliegue |
| RNF-15 | Sustituir LiveAvatar por adaptador MetaHuman sin cambiar reservas | Arquitectura prevista; etapa 2 no implementada |

Ver [criterios de aceptación del piloto](14-etapas-liveavatar-metahuman.md).
