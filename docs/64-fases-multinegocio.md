# Fases de evolución de Nexo por negocio

17 de octubre de 2026 · Plan posterior a 0.40.0. La numeración de estas fases es independiente de las fases anteriores de recepción y expedientes.

La orientación fue aceptada por el usuario. La entrega 0.41.0 implementa la primera parte operativa de las fases 2 a 5 y añade una administración organizada por tareas. Los criterios restantes se detallan abajo; no todas las fases están cerradas. [Decisión de arquitectura](62-orientacion-multinegocio.md) · [Fuentes y conflictos](63-consolidacion-manuales.md).

## Fase 1 Consolidar el conocimiento

- **NEXO-66 (completada):** inventariar siete manuales, definir IDs por tema, separar aprobado/pendiente y documentar sustituciones y preguntas al negocio.
- **NEXO-67 (completada en 0.41.0):** revisar catálogo activo mediante exportación protegida; preparar diferencia de contenido y migración versionada para retirar afirmaciones históricas y cargar datos aprobados. Respaldar, probar aplicación única y reversión, revisar español/inglés/francés e invalidación de audios.
- **NEXO-68 (pendiente, prioridad alta):** registrar decisiones comerciales y verificaciones oficiales. Se puede publicar orientación segura sin esperar todos los precios; las funciones dependientes permanecen deshabilitadas.

Aceptación documental: toda fuente está identificada y cada conflicto tiene tratamiento. Aceptación operativa posterior: ninguna ruta confirma condiciones retiradas, las pendientes nunca significan precio cero y los expedientes existentes no se reescriben. El contenido conservador se publicó en 0.41.0; las decisiones comerciales de NEXO-68 siguen pendientes.

## Fase 2 Delimitar el núcleo reutilizable

- **NEXO-69:** inventariar dependencias escolares de configuración, conversación, agenda y expedientes. Definir contratos para perfil, recursos y extensión escolar; mover reglas gradualmente manteniendo compatibilidad.
- **NEXO-70:** preparar un negocio general ficticio con SQLite y archivos separados; comprobar que no recibe textos, datos, servicios ni credenciales de la escuela.

Dependencia: matriz de fase 1. Aceptación: mismo código ejecuta ambos perfiles y la regresión escolar pasa; no hace falta instalar módulos DMV en el negocio general. Conservar permisos existentes y migraciones no destructivas. No renombrar masivamente tablas solo para cambiar etiquetas visibles.

## Fase 3 Catálogo y publicación controlada

- **NEXO-71:** ampliar catálogo con componentes, cantidades y precios aprobados por versión; preservar instantáneas de asignaciones anteriores y distinguir gratuito, pendiente y no disponible.
- **NEXO-72:** ampliar el editor existente con fuente, aprobación, traducciones y flujo de publicación/retiro. Mostrar diferencia y vista previa antes de publicar; auditoría de actor y reversión. Invalidar respuestas/audio dependientes.

Dependencia: contratos de fase 2 y aprobaciones por servicio. Aceptación: editar un dato publicado actualiza respuestas de todos los canales sin copiar importes en guiones; un borrador no puede aparecer en respuestas ni activar reservas. Pruebas de conflicto entre editores y permisos.

## Fase 4 Conversación guiada por procesos

- **NEXO-73:** definir pasos, preguntas y condiciones por proceso; recordar datos pertinentes y permitir correcciones. Exponer a la IA solo acciones autorizadas, con argumentos validados en servidor y confirmación cuando corresponda.
- **NEXO-74:** derivación al personal con resumen mínimo y continuidad, usando recepción existente; revisar preguntas no resueltas antes de publicar nuevas respuestas. No prometer llamada telefónica o SMS.

Dependencia: catálogo y políticas versionados. Aceptación: respuestas breves, una pregunta por vez, transición entre preparación/curso/clases sin reiniciar todo; todas las operaciones conservan autorización e idempotencia. Probar regionalismos, ambigüedad, correcciones, consultas ajenas e instrucciones maliciosas en tres idiomas.

## Fase 5 Completar la extensión escolar

- **NEXO-75:** ampliar asignaciones existentes con componentes y trazabilidad de paquetes. Diseñar los dos plazos de clases adicionales y la tarifa atribuible a clases; habilitar reglas solo con datos aprobados y alcance de pagos acordado. No registrar una compra por el mero hecho de conversar.
- **NEXO-76:** ampliar coordinación del Road Test y requisitos de recursos (profesor, vehículo y horario); cambios sensibles por personal. Mantener citas oficiales del DMV separadas de eventos internos de Calendar.

Dependencia: aprobación de políticas, verificación normativa y modelos anteriores. Aceptación: ninguna sobreasignación o doble consumo; reversos auditados; editar precios no modifica derechos históricos; no se ofrece garantía ni cancelación automática del examen. No se crea integración DMV por suposición.

Los grupos y diagnósticos internos existentes se conservan. La consulta autónoma del expediente sigue condicionada a identidad y privacidad (NEXO-64); no dar a la IA pública acceso a fichas para implementar este plan.

## Fase 6 Validar y publicar

- **NEXO-77:** pruebas de integración por perfil, migración/rollback, concurrencia de recursos y límites de permisos; aceptación física de voz y ES/EN/FR en teléfono y kiosco; restauración de copia cifrada; publicación coordinada de código y contenido con verificación HTTPS.

Aceptación: evidencia por cambio, versión visible, respaldo recuperable, plan de vuelta atrás compatible con roles y datos, y documentación que distingue validado localmente de publicado. Usar dobles de IA/Calendar/LiveAvatar en automatización y no crear reservas reales para pruebas sin control.

Cada fase puede producir una entrega pequeña validada; no hay obligación de esperar la fase 6 para corregir información comercial. Los cambios del piloto se publican mediante el procedimiento existente, nunca copiando SQLite local sobre producción.

## Trabajo existente que sigue pendiente

No duplicar las tareas del tablero: aceptación física de recepción (NEXO-60), identidad/retención de expedientes (NEXO-64), presentación de sala (NEXO-65), copia externa automática de respaldos y publicación/CI de los cambios todavía no enviados a GitHub. La evidencia de CI de versiones anteriores no acredita una nueva entrega.

## Documentación por entrega

Actualizar arquitectura y modelo de datos cuando se implemente el contrato, manual junior con recorrido real, operación administrativa con capturas verificadas, escenarios de conversación, pruebas y estado de publicación. El tablero `project-status.json` conserva las tareas históricas y añade estas nuevas; no marca funciones como completas por haber escrito su diseño.

La clave del piloto sigue en el archivo de entorno del servidor. No se migra a la configuración del negocio ni se incluye en respaldos exportados de contenido. [Configuración del piloto](53-configurar-acceso-piloto.md).

## Evidencia de esta entrega documental

El 17/10/2026 se verificaron las tres guías nuevas mediante el catálogo y lector reales del módulo documental. El tablero contiene 77 tareas con IDs únicos y referencias válidas; mantiene la versión de aplicación 0.40.0. Se comprobaron 194 enlaces relativos de las guías modificadas y README. `docs:check` pasó con 210 archivos propios, 9 referencias y 90 enlaces educativos; las siete pruebas existentes de `tests/documentation.test.js` pasaron. El primer intento restringido no pudo crear enlaces temporales ni conectar a localhost; la ejecución autorizada completó esas comprobaciones.

Estas pruebas validan documentación, tablero y acceso del portal; no certifican comportamiento de los nuevos procesos todavía pendientes. No se usaron proveedores de pago, no se modificó el catálogo SQLite y no hubo despliegue al VPS en esta entrega.

## Avance de implementación — 0.41.0

| Fase | Entregado | Falta para cerrar la fase |
|---|---|---|
| 1 Conocimiento | Propuesta conservadora reproducible y publicación versionada con recuperación. | Aprobar precios, modalidades, horarios y políticas todavía inciertos. |
| 2 Núcleo por negocio | Perfil de capacidades, bloqueo de expedientes escolares en perfil general y prueba SQLite independiente. | Completar extracción gradual de dependencias escolares y validar una segunda instalación real. |
| 3 Publicaciones | Borrador, fuente, comparación, aprobación, publicación, retiro, conflictos e historial; componentes e instantáneas. | Editor de traducciones revisadas por idioma; migrar por completo los editores directos anteriores al flujo editorial. |
| 4 Procesos | Orientación por permiso/experiencia en ES/EN/FR, protección temática y derivación con servicio mínimo editable. | Editor configurable de procesos y más escenarios conversacionales reales. |
| 5 Escuela | Registro de entregas por componente, cantidades limitadas, idempotencia, reversos auditados y clases separadas. | Vehículos compartidos/Road Test, políticas exactas de adicionales y decisiones normativas/comerciales. |
| 6 Validación | 354 pruebas unitarias/API; navegador con publicación, expedientes, móvil y agenda por voz simulada. | Aceptación física y validación operativa de recursos, publicación GitHub/CI remoto y respaldo externo automático. |

La pregunta sobre vehículos por profesor sigue abierta. No se deduce que cada calendario tenga un vehículo independiente. Los vencimientos automáticos no se activan sin precisar políticas y límites de fecha. El saldo monetario, cobros y crédito diagnóstico siguen fuera del alcance.

[Cómo administrar la entrega](65-administracion-publicaciones.md) · [Evidencia y publicación](66-entrega-0410.md). La sección de evidencia documental anterior describe el estado antes de implementar 0.41.0 y se conserva como historia.
