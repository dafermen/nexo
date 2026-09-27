# Mapa del código fuente de Nexo

Esta referencia explica el código propio por responsabilidad. Abra los archivos en `C:\Projects\Nexo`; el portal ofrece sus contratos y firmas, no acceso libre al sistema de archivos.

## Arquitectura en una vista

```text
VISITANTE
  HTML + CSS -> public/app.js
                  | ApiClient: HTTP/JSON + token visitante
                  v
              server/app.js ---- validación, sesión, cuotas
                |      |      |
                |      |      +-- providers: IA / voz / Calendar / SMTP / video
                |      +--------- reglas: filtro / FAQ / intención / agenda
                +---------------- repositorio: SQLite y almacenes

ADMINISTRADOR -> acceso por código/cookie -> API administrativa -> SQLite
DOCUMENTACIÓN -> catálogo permitido -> Markdown -> DOM seguro
```

Las flechas son dependencias lógicas. Una petición puede entrar al filtro y terminar localmente sin llamar a un proveedor externo.

## Referencia por archivo

| Grupo | Contenido | Referencia |
| --- | --- | --- |
| Servidor y negocio | Arranque, configuración, rutas, dominio, almacenamiento | [Servidor](codigo/servidor.md) |
| Navegador | Coordinación de pantalla, llamadas, paneles y documentación | [Interfaz](codigo/interfaz.md) |
| Proveedores | Adaptadores de IA, agenda, correo, voz y avatar | [Proveedores](codigo/proveedores.md) |
| HTML y CSS | Estructura, selectores, accesibilidad y responsive | [Presentación](codigo/presentacion.md) |
| Herramientas | Lanzadores Windows, instaladores y validadores | [Herramientas](codigo/herramientas.md) |
| Pruebas | Escenarios, fixtures y casos automatizados | [Pruebas](codigo/pruebas.md) |

Cada ficha explica propósito, entrada, salida, variables importantes y efectos. Las funciones centrales tienen un contrato adicional; el inventario de firmas incluye también ayudantes y callbacks con nombre. Una firma muestra parámetros reales, incluidos valores por defecto. No implica que toda entrada sea válida: lea validaciones y errores.

## Orden sugerido de lectura del código

1. `public/api.js`: cómo se envía JSON y se recibe un error.
2. `server/errors.js` y `server/booking-code.js`: funciones pequeñas sin coordinación compleja.
3. `server/config.js` y `server/index.js`: configuración y arranque.
4. `server/db.js` y `server/center.js`: persistencia y adaptación al negocio.
5. `server/faq.js`, `school-filter.js` y `school-intent.js`: respuesta local e interpretación.
6. `public/call-conversation.js`: estados y temporizadores aislados.
7. `public/app.js` y `server/app.js`: conectar las piezas ya conocidas.
8. `booking.js`, `agenda-conversation.js` y `providers/google-calendar.js`: distinguir preferencia, disponibilidad y confirmación.
9. `audio-policy.js`, `audio-library.js` y `providers/local-tts.js`: autorización de reutilización, almacenamiento y generación.
10. La prueba correspondiente: comprobar comportamiento y casos límite.

## Contratos que conectan capas

| Productor | Consumidor | Contrato |
| --- | --- | --- |
| BrowserSttProvider | app + CallConversation | Callbacks de inicio, parcial, final, error y fin |
| CallConversation | app | Invoca listen, stopListening y send; informa phase |
| ApiClient | server/app | JSON y Bearer visitante; errores tienen status |
| Filtro/intención | Coordinador HTTP | kind, reason, text y banderas interpret/catalogOnly |
| Proveedor IA | Coordinador HTTP | text/usage o interpretation/usage, siempre validados |
| BookingService | Formularios | status, horario, código y estado de correo |
| AudioLibrary/LocalTts | LocalSpeechProvider | WAV base64, duración en segundos y proveedor |
| Almacenes | Servicios de negocio | Métodos que ocultan SQL y controlan transacciones |

## Alcance de la documentación

Se comentan módulos JavaScript propios, páginas HTML, estilos CSS, pruebas, scripts Python/PowerShell y lanzadores CMD. Las referencias incluyen configuración declarativa para saber dónde se usa.

No se reescribe código de terceros en `public/vendor/` o `node_modules/`, modelos/ejecutables de `runtime/`, imágenes/GLB binarios, base real, secretos, respaldos ni herramientas temporales de `.local/`. Sus contratos de integración se explican en los módulos propios. `package-lock.json` es generado para reproducir dependencias, no un manual que se edite a mano.

JSON no admite comentarios: sus campos se explican en [datos y contratos](43-datos-y-contratos.md).

## Cómo mantener este mapa

Al cambiar una función, revise contrato y variables junto a su implementación. Actualice la ficha en `docs/codigo/` si cambió propósito, firma o efectos; no copie credenciales ni respuestas reales de clientes. Añada archivos nuevos al grupo correspondiente.

Ejecute `npm run docs:check`: detecta archivos propios sin cabecera/ficha y enlaces rotos de estas guías. No demuestra por sí solo que una explicación sea semánticamente correcta; esa revisión sigue siendo responsabilidad del desarrollador.

Continúe con el [manual junior](23-manual-desarrollador-junior.md), los [recorridos](42-recorridos-ejecucion.md) y las [prácticas](44-practicas-desarrollo.md).

## Validación de esta entrega — 26 de septiembre de 2026

- 144 archivos propios con cabecera didáctica y ficha en seis referencias; 119 contratos detallados añadidos a funciones centrales.
- Sintaxis: 117 archivos JavaScript válidos; suite de lógica: 244 pruebas aprobadas.
- Comprobación documental: cobertura de archivos y 40 enlaces internos de la ruta educativa válidos.
- Portal probado con servidor aislado: portada, ruta de aprendizaje, búsqueda, categorías, índice, impresión, descarga, tareas, enlaces y Markdown seguro.
- Interfaz revisada en escritorio y móvil; manual comprobado también en el servidor activo, sin desbordamiento de página.
- Comparación estructural con el código previo: 108 archivos JavaScript conservan exactamente su lógica; los cambios ejecutables existentes corresponden al portal, su categoría y su prueba. También se añadió el validador documental de solo lectura. HTML y CSS conservan reglas/estructura, con comentarios nuevos.
- Estas comprobaciones no iniciaron llamadas de IA, síntesis ni sesiones pagadas de LiveAvatar.
