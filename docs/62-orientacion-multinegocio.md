# Orientación de Nexo para múltiples tipos de negocio

17 de octubre de 2026 · Decisión de producto aceptada por el usuario. Documento de diseño; no equivale a funcionalidad desplegada.

Nexo evoluciona hacia una plataforma de atención conversacional y gestión de servicios. Método Mogollón es su primera implementación especializada. Se conserva el producto existente y se amplía gradualmente; no se inicia una reescritura.

## Estado y alcance

La versión previa a este plan era 0.40.0, del 13/10/2026; la primera implementación del plan se publicó como 0.41.0 el 17/10/2026. Ya existen configuración por negocio, catálogo, FAQ, agenda con profesores, personal, recepción, expedientes internos y consumo de clases. Los expedientes no son consultables por el visitante ni por la IA pública. Consulte la [entrega de expedientes](60-expedientes-servicios.md).

La consolidación documental inicial no modificó datos. La entrega 0.41.0 incorpora perfiles, publicación controlada, procesos iniciales y seguimiento de componentes; consulte el estado actualizado de implementación y despliegue en [la entrega 0.41.0](66-entrega-0410.md). La [matriz de decisiones](63-consolidacion-manuales.md) identifica qué información histórica debe dejar de utilizarse.

Pagos en línea, caja, créditos financieros, telefonía y SMS permanecen fuera de estas fases. Se conservan los canales existentes de conversación por voz y video: no son llamadas telefónicas. LiveAvatar mantiene su máximo de 60 segundos.

## Arquitectura objetivo

| Capa | Responsabilidad | Ejemplos |
|---|---|---|
| Núcleo común | Personas, servicios, componentes de paquetes, reservas, recursos, recepción, permisos y auditoría | Reserva con profesional; unidades utilizadas; solicitud de ayuda |
| Perfil del negocio | Identidad, temas, idiomas, trato, catálogo, políticas y procesos habilitados | Marca Método Mogollón, horario y mensajes propios |
| Extensión sectorial | Reglas y formularios específicos de la actividad | Permiso, clases, cinco horas, diagnóstico y Road Test |
| Adaptadores | Traducir operaciones a cada proveedor sin decidir reglas comerciales | Calendar, IA, STT, TTS, avatar y correo |

El núcleo habla de profesionales y recursos; el perfil escolar presenta profesores y vehículos. Una reserva puede necesitar varios recursos, pero ese control simultáneo todavía debe desarrollarse. Tener cinco calendarios no demuestra disponibilidad de cinco vehículos.

Se mantiene el monolito modular Node.js, interfaz web y SQLite. Primero se delimitan responsabilidades dentro del repositorio; no se introducen microservicios ni una base compartida entre clientes.

## Aislamiento entre negocios

Una instalación atiende un negocio con su propia base, directorio de archivos, secretos, administradores y respaldo. El mismo código puede desplegarse con otro perfil. Nunca se copia la base de alumnos, conversaciones ni credenciales de la escuela para iniciar otro negocio.

Un panel central para múltiples organizaciones es una ampliación posterior. No se considera resuelto añadiendo un identificador de negocio a algunas tablas. Requeriría aislamiento completo de permisos, consultas, archivos, tareas, cuotas y restauraciones.

## Tres responsabilidades de la conversación

1. **Conocimiento:** datos aprobados que Nexo puede explicar. Cada dato debe conservar fuente, versión, estado, responsable y vigencia cuando corresponda.
2. **Proceso:** pasos y condiciones de una atención. Una pregunta por vez; se conservan respuestas pertinentes y se permiten correcciones o cambio de servicio.
3. **Acción:** consulta o cambio ejecutado por el servidor con validación. La intención interpretada por IA no autoriza una reserva, una cancelación ni acceso a un expediente.

Ejemplo escolar: quiere cinco horas → preguntar por permiso si aún no se sabe → sin permiso, ofrecer orientación del módulo de preparación → con permiso, explicar solo información vigente y derivar la inscripción mientras no esté habilitada. No confundir esa derivación con una llamada telefónica automática.

Ejemplo de otro negocio: quiere mantenimiento → identificar tipo de servicio → consultar recursos y horarios → preparar formulario → confirmar reserva. No aparecen preguntas sobre DMV ni requisitos escolares.

## Modelo de datos propuesto

Estos conceptos son objetivos de diseño, no tablas nuevas creadas en esta entrega.

| Concepto | Datos esenciales | Regla |
|---|---|---|
| Servicio | ID estable, nombre localizado, duración, disponibilidad comercial, precio y versión | Un precio pendiente es desconocido, nunca cero |
| Componente de paquete | Servicio o beneficio, unidades, condiciones, importe asignado si está aprobado | Separar clases de materiales y acompañamiento |
| Política | Versión, ámbito, aprobación, vigencia, condiciones | Conservar la versión aceptada o aplicada en cada operación |
| Asignación de servicio | Cliente, versión del catálogo, unidades autorizadas y consumos | Editar catálogo no reescribe servicios anteriores |
| Recurso | Profesional, vehículo o espacio; agenda y disponibilidad | Confirmación atómica y sin duplicar reservas |
| Conocimiento | Tema estable, variantes, idioma, fuente, aprobación y publicación | Borradores y datos retirados no alimentan respuestas públicas |
| Atención | Intención, datos mínimos, paso actual y derivación | Memoria temporal separada del expediente privado |

La IA no calcula precios de paquetes ni plazos. Las reglas se ejecutan en servidor, con reloj y zona horaria definidos. Las reglas de 30 días requieren precisar límites e interpretación de día calendario antes de programar vencimientos.

## Publicación y mantenimiento

Flujo objetivo: borrador → revisión → aprobado → publicado → reemplazado o retirado. Aprobación comercial, verificación normativa y habilitación técnica son controles diferentes; un guion aprobado no habilita inscripción automática.

El catálogo es la fuente única de precios e inclusiones. Las FAQ, prompts, traducciones y audios deben depender de esa versión. Al retirar un dato, comprobar que no sobreviva en una respuesta alternativa, caché o historial usado como contexto.

Los documentos históricos conservan evidencia, pero no se ingieren indiscriminadamente como conocimiento vigente. La numeración de Word es editorial; se usan IDs por tema para evitar colisiones entre el índice original y los módulos nuevos.

## Secretos y acceso al piloto

El servidor ya admite `PILOT_PRIVATE_ENABLED` y `PILOT_PASSWORD`. Local: `C:\Projects\Nexo\.env`. VPS: `/etc/nexo/nexo.env`. Una contraseña no vacía prevalece sobre `PILOT_PASSWORD_HASH`; dejarla vacía no elimina por sí solo un hash configurado. El cambio se aplica al reiniciar el servicio.

No guardar la contraseña en SQLite, formularios públicos, documentación, capturas ni GitHub. Esta entrega confirma el mecanismo del código; no inspecciona ni altera la contraseña activa. [Guía de acceso privado](53-configurar-acceso-piloto.md).

## Ruta para el desarrollador junior

Lea primero [configuración](30-configuracion-negocio.md), [expedientes](60-expedientes-servicios.md) y [conversación contextual](58-conversacion-contextual.md). Después siga las [fases](64-fases-multinegocio.md).

Al implementar, identifique entradas, salidas, permisos y efectos antes de mover funciones. Mantenga contratos y migraciones compatibles, pruebe la escuela existente y un negocio general, y documente cada capacidad como propuesta, implementada, validada o publicada. No cambie todos esos estados a la vez por haber aprobado una prueba local.
