# Curso de cinco horas y libro: contenido aprobado y mantenimiento

Versión 0.34.0 · Información entregada por el cliente el 27/09/2026.

## Qué informa Nexo

| Servicio | Datos aprobados |
|---|---|
| Curso de Pre-Licencia de 5 Horas | $80; miércoles 6:00 PM y sábados 10:00 AM, hora de Nueva York. Learner Permit válido de NY; completar satisfactoriamente el curso y cumplir identificación/participación de la modalidad. |
| Libro de Preguntas y Respuestas | $35; español, inglés y francés. Estudio para el examen escrito, acceso gratis a la App y asistencia gratis para programar la cita por canales oficiales. |

La asistencia de programación no incluye tarifas del DMV, no garantiza una fecha ni aprobar el examen. El agente no garantiza aprobación del examen teórico ni del Road Test. Los documentos concretos, políticas o reglas actuales no incluidas deben confirmarse con el personal o los canales oficiales del DMV; Nexo no verifica normativa en Internet durante cada conversación.

**Los horarios del curso son informativos.** No son horarios generales de atención ni cupos comprobados en Google. Este cambio no habilita reservas del curso, crea eventos ni modifica los calendarios de Héctor y Darío. La clase práctica de 60 minutos conserva su agenda, selección de profesor y confirmación mediante formulario.

## Cómo actualizar a futuro sin cambiar código

1. Entre a **Administración → Servicios** y edite el curso o libro.
2. Mantenga precio, descripción, requisitos y los nuevos campos **Horarios informativos**, **Qué incluye**, **Condiciones y alcance**.
3. Guarde. El catálogo conserva el ID del servicio y su relación con las citas existentes.
4. En **Respuestas frecuentes**, mantenga las variantes de preguntas y el tono de la respuesta.
5. Use parámetros y revise la vista previa. Evite repetir precios, horarios o condiciones literalmente en muchos temas.

![Del editor a SQLite y a las respuestas del asistente](assets/flujo-faq.png)

| Parámetro de FAQ | Campo del catálogo |
|---|---|
| `{{servicio.precio}}` | Precio y moneda |
| `{{servicio.requisitos}}` | Requisitos |
| `{{servicio.horarios}}` | Horarios informativos |
| `{{servicio.incluye}}` | Qué incluye |
| `{{servicio.condiciones}}` | Condiciones y alcance |

Ejemplo: «`{{servicio.horarios}} Consulte con el personal los cupos y la inscripción.`». Al cambiar el horario del catálogo, la próxima respuesta y su vista previa utilizan ese dato. Cambiar esta información **no cambia las reglas de reservas de Google Calendar**.

## Conversación por etapas

- **Sin permiso:** el Learner Permit es el primer paso para acceder al curso; se orienta a la preparación teórica y al libro. Los requisitos oficiales específicos deben confirmarse.
- **Con permiso:** se ofrecen información de preparación práctica y del curso.
- **Curso terminado:** se orienta hacia preparación del Road Test y servicios publicados.
- **Libro:** se distingue el recurso de estudio, App y asistencia de una cita garantizada o tasas oficiales.

Las respuestas provienen de FAQ activas en SQLite y son editables. Los reconocedores solo seleccionan la respuesta aprobada; no contienen precios ni requisitos comerciales. La memoria es temporal por atención. Las preguntas frecuentes se resuelven localmente; la interpretación y orientación con IA conservan los límites establecidos.

Se añadieron traducciones locales para este contenido en inglés y francés. Las modificaciones futuras de texto libre requieren revisar sus traducciones; el editor no traduce automáticamente cualquier texto nuevo. Precios y horarios deben verificarse en los tres idiomas después de editarlos.

## Para desarrolladores: carga comercial versionada

`conocimiento/actualizaciones/curso-libro-20260927.json` conserva el contenido aprobado y un identificador único. Es un artefacto de entrega; **SQLite es la fuente activa después de aplicar**. Editar este JSON posteriormente no modifica el sitio ni debe usarse para forzar una carga repetida.

`server/content-update.js` actualiza en una única transacción el documento comercial, las FAQ y el registro `content_updates`. La actualización:

- Solo modifica los dos servicios y los temas identificados; conserva otros servicios, categorías, profesor/calendario, configuración, citas y credenciales.
- Valida los campos con el mismo contrato del editor administrativo.
- Incrementa revisiones, registra auditoría e invalida por revisión la información de audio reutilizable.
- Guarda el ID y huella del paquete. Repetirlo no vuelve a escribir; reutilizar su ID con contenido diferente se rechaza.
- Revierte toda la transacción si ocurre un error.

Una futura entrega comercial necesita otro ID y una propuesta revisada. Los cambios habituales se hacen desde Administración. Nunca ejecute de nuevo una carga histórica completa para corregir un precio.

### Operación de despliegue

Con base inicializada, perfil escolar correcto y respaldo cifrado verificado:

```text
node --env-file=.env scripts/apply-school-content.js conocimiento/actualizaciones/curso-libro-20260927.json
```

Esto solo muestra un resumen de la propuesta. Para aplicar, detenga el servidor, conserve el estado comercial anterior para reversión y agregue `--apply`. En Linux use el usuario del servicio y su archivo de entorno privado. No copie la base local sobre la del VPS. La carga no se ejecuta automáticamente al arrancar.

Si debe revertir inmediatamente el despliegue, restaure juntos el código, los servicios, las FAQ y el registro de esa carga, con el servicio detenido. No restaure toda la base sobre reservas posteriores. Conserve el respaldo completo para recuperación de incidentes.

## Validación

Pruebas de SQLite/API para aplicación única, previa sin escrituras, preservación de otros datos, rechazo de paquete modificado, campos editables, preguntas del cliente y actualización de precios/horarios. Recorridos por voz/texto ES/EN/FR verifican que los horarios informativos no abren agenda ni llaman a Google o IA. Pruebas de navegador comprueban formulario administrativo y regresión de reserva práctica por voz con calendario/correo simulados.

Los cupos reales del curso y sus requisitos específicos de participación siguen requiriendo confirmación de la escuela. Ninguna prueba automatizada equivale a haber inscrito un alumno o entregado una cita real del DMV.

## Sitio web y simulador · v0.34.1

Los enlaces proporcionados por el usuario están en **Ayuda y opciones**. La ficha del libro también los muestra. Se abren en otra pestaña y no llevan nombres, correos, tokens ni datos de la atención. El simulador es una herramienta de práctica; no es el examen oficial del DMV. Nexo no inicia sesión ni compra accesos en esos sitios.

- Sitio web: https://www.metodomogollon.com/
- Simulador: https://test.metodomogollon.com/home

**Mantenimiento:** Administración → Configuración → Negocio → **Sitio web** y **Simulador / recurso de práctica**. Los enlaces activos se guardan en SQLite. Dejar un campo vacío oculta su botón. Solo se admiten enlaces HTTPS sin credenciales.

Los temas `escuela-sitio-web` y `escuela-simulador` se editan en Respuestas frecuentes. Usan `{{centro.web}}` y `{{centro.simulador}}`: cambiar la URL no requiere editar cada respuesta. Hay variantes locales en español, inglés y francés. Si se elimina una URL, la respuesta indica que el enlace debe confirmarse.

La entrega `conocimiento/actualizaciones/recursos-20260927.json` utiliza la misma carga versionada del apartado anterior. Solo cambia los dos enlaces públicos y dos FAQ; conserva catálogo, calendario, citas y claves. Incrementa también la revisión de configuración para renovar las sesiones que estaban usando información anterior.
