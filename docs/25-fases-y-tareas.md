# Estado actual, fases y tareas

> **Vigente desde v0.13.0:** las respuestas activas se guardan en SQLite y se editan en Administración → Respuestas frecuentes. El archivo inicial se importa una vez. El acceso admite códigos por correo tras configurar SMTP. [Guía de SQLite y acceso](31-sqlite-acceso-correo.md).

## Cómo interpretar este estado

Este es el resumen vigente de Nexo. Las evidencias detalladas están en [Validación](08-validacion.md). El [backlog original](07-backlog.md) conserva historia de la demo; sus pendientes iniciales no deben leerse como una lista actualizada.

El tablero visual usa `docs/project-status.json`. Actualice ese archivo cuando cambie el estado de una tarea, y registre la evidencia en el documento relacionado. «Realizada» significa que el alcance concreto indicado se implementó; no significa que todo el proyecto esté listo para producción.

## Fases

| Fase | Estado | Resultado o siguiente paso |
|---|---|---|
| Base del proyecto | Realizada para demo local | API, SQLite, contratos y documentación inicial |
| Kiosco y administración | Realizada para demo local | Interfaz, perfil escolar, catálogo editable y vista de llamada |
| Conversación por voz | Realizada para demo local | Transcripción y conversación automática |
| Video con LiveAvatar | Integración realizada | Sesiones limitadas a 60 segundos; piloto físico pendiente |
| Conocimiento y filtro | Realizada para demo local | FAQs, interpretación y cuotas |
| Documentación | Realizada para consulta local | Portal, manuales junior/GitHub, fases y plantillas |
| Configuración por negocio | Realizada por instalación | Identidad, asistente, canales, cuotas y editor de texto de respuestas propias |
| Agenda y operación real | Parcial | Piloto de reservas individuales disponible; información comercial y operación pública pendientes |
| Piloto y publicación | Pendiente | iPad, HTTPS, identidades, respaldos y validación presencial |
| MetaHuman y pagos | Pendiente, etapa futura | Evaluar infraestructura del avatar y proveedor de pagos |

## Entregas principales

- Arranque local, interfaz táctil y componentes desacoplados.
- Llamadas por voz y video diferenciadas; video en pantalla completa y regreso al inicio.
- Máximo de 60 segundos en LiveAvatar y cierre por inactividad.
- Perfil escolar, trato de usted y horarios generales.
- Administración de servicios, precios, requisitos y modalidades.
- Filtro escolar, respuestas locales y cuotas de OpenAI compartidas por sesión y día.
- Voz automática con pausas, cancelación y protección ante respuestas tardías.
- FAQs parametrizadas en SQLite con validación y editor de texto protegido.
- Acceso administrativo con código temporal por correo; Gmail activado y primer ingreso real verificado el 19/09/2026.
- Interpretación de regionalismos y frases dudosas; aclaraciones sin sanción por incertidumbre del modelo.
- Portal de documentación con búsqueda, lector y tablero.

## Pendientes prioritarios

| Prioridad | Trabajo | Criterio para darlo por terminado |
|---|---|---|
| Alta | Completar catálogo | Responsable confirma precios, requisitos, modalidad y detalles de cada servicio |
| Alta | Google Calendar | Agenda elegida, autorización, consulta y confirmación verificadas sin duplicar turnos |
| Alta | Prueba presencial | Visitantes de prueba usan micrófono y altavoz en el entorno real; se registran fallos |
| Alta | iPad y HTTPS | Permisos, pantalla, orientación, suspensión y reconexión comprobados en dispositivo |
| Alta | Piloto de video | Latencia, audio, apariencia, cierre y consumo verificados con presupuesto acordado |
| Media | Git y GitHub | Repositorio, remoto y política de colaboración elegidos; publicación revisada |
| Media | Roles administrativos | Accesos individuales y auditoría en lugar de una clave compartida |
| Media | Respaldos | Copia y restauración real probadas con una política de retención |
| Media | Editor gráfico de FAQs | Parcial: editor de texto propio disponible en Configuración; faltan edición por temas e importación masiva |
| Media | Calidad y accesibilidad | Más expresiones reales, navegación asistida y métricas agregadas |
| Posterior | Pagos | Proveedor, condiciones y flujo de órdenes; pruebas de duplicados y errores |
| Posterior | MetaHuman y flota | Infraestructura y costos evaluados después del piloto inicial |

## Siguiente paso propuesto

Completar la información del catálogo y hacer una atención piloto por voz con preguntas reales. La conexión de Google Calendar ya fue verificada; el siguiente paso es acordar las reglas de disponibilidad y reserva. No hay fechas de entrega comprometidas para estas tareas.

## Entrega v0.14.0 — Historial y seguimiento

NEXO-28: registro persistente de atenciones, consulta administrativa, métricas y exportación individual a texto. El aviso del kiosco informa la conservación del texto. Se verifican separación entre visitantes, protección de acceso, reinicios, cancelaciones y descarga paginada. Pendientes: filtros por fecha, búsqueda, gráficos y exportación masiva. [Alcance](32-historial-conversaciones.md).

## Entrega v0.15.0 — conexión de Google Calendar

NEXO-29 completado: integración administrativa y validación con proveedor simulado. NEXO-30 completado el 26/09/2026: Google autorizado, Mogollon Method seleccionado y lectura/creación/eliminación real verificadas. Las reservas de visitantes requieren una etapa adicional de reglas de disponibilidad y confirmación. [Guía](33-google-calendar.md).

## Entrega v0.16.0 — reservas individuales

NEXO-31 completado: piloto de Clase práctica de 60 minutos, lunes a viernes 08:00–18:00 en Nueva York. Reglas editables, consulta de disponibilidad, confirmación explícita, verificación y cancelación. NEXO-14 permanece parcial hasta validar operación con alumnos y requisitos restantes. [Manual](34-reservas-calendar.md).


## Atención en tres idiomas — v0.23.0

NEXO-41: selector Español · English · Français en el inicio, voz y conversación por idioma, fechas y formularios localizados, y correo de nuevas reservas en el idioma elegido. [Operación, arquitectura, pruebas y límites](39-idiomas.md). Los textos comerciales nuevos requieren traducciones revisadas; queda pendiente su editor en Administración y la validación con hablantes nativos.


## Biblioteca de audio — v0.24.0

NEXO-42: audio generado reutilizable para respuestas aprobadas, con metadatos SQLite y archivos WAV privados. Administración permite consultar el uso y vaciar audios; presupuesto inicial de 128 MB y caducidad de 30 días. [Alcance, arquitectura, privacidad y pruebas](40-biblioteca-audio.md). La voz actual sigue siendo local; no supone ahorro por sesión de LiveAvatar.

## Documentación del código para estudiantes

NEXO-43: comentarios de módulo y contratos de funciones centrales, manual junior ampliado, referencia del código propio, recorridos de interacción, contratos de datos/API y ejercicios. Disponibles en la portada del portal bajo «Aprenda cómo está construido». [Ruta y alcance](41-mapa-codigo-fuente.md).

## Piloto Linux — v0.25.0

NEXO-44 completado: preparación del código, acceso privado, voz Linux y despliegue documentado. NEXO-16/17/18 parciales: queda validar el servidor real, sus integraciones y respaldos externos. NEXO-45 pendiente: Capacitor/APK después del piloto web. [Guía](45-despliegue-piloto-linux.md) · [Seguridad](46-seguridad-piloto.md).
