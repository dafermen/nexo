# Referencia: Herramientas y lanzadores

Contratos del código propio de Nexo. Consulte primero el [mapa de código](../41-mapa-codigo-fuente.md) y el [manual junior](../23-manual-desarrollador-junior.md). Las firmas orientan la lectura; el cuerpo y sus validaciones son la autoridad ejecutable.

## ABRIR-ADMIN.cmd

Delega el acceso al script de administración.

- **Entrada:** Acción del operador en Windows y herramientas instaladas.
- **Salida:** Ejecución del script indicado o apertura del navegador.
- **Estado importante:** %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
- **Efectos y límites:** No es código que deba importarse desde el navegador. Revisar el script delegado para sus efectos.

## ABRIR-DOCUMENTACION.cmd

Abre el portal local de documentación.

- **Entrada:** Acción del operador en Windows y herramientas instaladas.
- **Salida:** Ejecución del script indicado o apertura del navegador.
- **Estado importante:** %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
- **Efectos y límites:** No es código que deba importarse desde el navegador. Revisar el script delegado para sus efectos.

## CONFIGURAR-AVATAR.cmd

Delega la captura de configuración de video.

- **Entrada:** Acción del operador en Windows y herramientas instaladas.
- **Salida:** Ejecución del script indicado o apertura del navegador.
- **Estado importante:** %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
- **Efectos y límites:** No es código que deba importarse desde el navegador. Revisar el script delegado para sus efectos.

## CONFIGURAR-CORREO.cmd

Delega la captura oculta del secreto SMTP.

- **Entrada:** Acción del operador en Windows y herramientas instaladas.
- **Salida:** Ejecución del script indicado o apertura del navegador.
- **Estado importante:** %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
- **Efectos y límites:** No es código que deba importarse desde el navegador. Revisar el script delegado para sus efectos.

## INICIAR.cmd

Arranca el servidor con el entorno local; mantener la consola abierta.

- **Entrada:** Acción del operador en Windows y herramientas instaladas.
- **Salida:** Ejecución del script indicado o apertura del navegador.
- **Estado importante:** %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
- **Efectos y límites:** No es código que deba importarse desde el navegador. Revisar el script delegado para sus efectos.

## INSTALAR-IDIOMAS.cmd

Instala voces inglesa/francesa verificadas.

- **Entrada:** Acción del operador en Windows y herramientas instaladas.
- **Salida:** Ejecución del script indicado o apertura del navegador.
- **Estado importante:** %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
- **Efectos y límites:** No es código que deba importarse desde el navegador. Revisar el script delegado para sus efectos.

## INSTALAR-VOZ-LOCAL.cmd

Instala motor y voz española mediante el script verificado.

- **Entrada:** Acción del operador en Windows y herramientas instaladas.
- **Salida:** Ejecución del script indicado o apertura del navegador.
- **Estado importante:** %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
- **Efectos y límites:** No es código que deba importarse desde el navegador. Revisar el script delegado para sus efectos.

## scripts/activate-practical-booking.mjs

Aplicar la activación inicial específica del piloto de la escuela.

- **Entrada:** Configuración local, calendario autorizado y horario existente.
- **Salida:** Respaldo SQLite, servicio Clase práctica y reglas habilitadas.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** Script histórico de escritura, no comando habitual de arranque. No crea eventos, pero sí modifica configuración y consulta Google.

**Dependencias directas:** `node:sqlite`, `node:fs`, `node:path`, `../server/config.js`, `../server/db.js`, `../server/center.js`, `../server/providers/google-calendar.js`, `../server/booking.js`.

## scripts/build-executive-avatar.py

Reconstruir vestuario del avatar local desde geometrías fuente.

- **Entrada:** GLB base, recursos descritos en docs/13 y NumPy.
- **Salida:** GLB de vestuario con geometría, pesos y texturas empaquetadas.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** ROOT es raíz; g construye JSON glTF; buf acumula binario. Herramienta de preparación, no parte de cada llamada.

## scripts/check-docs.js

Comprobar cobertura documental y enlaces de la ruta educativa.

- **Entrada:** Árbol propio de código y guías Markdown.
- **Salida:** Resumen o lista de fallos y código de salida 1.
- **Estado importante:** sources reúne archivos; references contiene fichas; failures acumula diagnósticos.
- **Efectos y límites:** Solo lectura; no analiza secretos, dependencias ni datos de clientes. No prueba semántica de comentarios.

**Dependencias directas:** `node:fs/promises`, `node:path`, `node:url`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
slash(value)
async walk(directory)
```

## scripts/check.js

Comprobar sintaxis de archivos JavaScript sin ejecutar su lógica.

- **Entrada:** Árbol del proyecto excluyendo node_modules.
- **Salida:** Resultado node --check por archivo y código de salida.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** No valida comportamiento: complementar con pruebas.

**Dependencias directas:** `node:fs`, `node:child_process`.

## scripts/configure-avatar.js

Recoger ajustes de LiveAvatar con entrada oculta para la clave.

- **Entrada:** Respuestas de consola: clave, avatarId y habilitación de pago.
- **Salida:** Variables LIVEAVATAR actualizadas en .env.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** Conserva otras variables; no crea una sesión de video. Requiere reiniciar para cargar el entorno.

**Dependencias directas:** `node:readline/promises`, `node:stream`, `node:fs`, `node:url`.

### Funciones y métodos

Firmas del archivo (los callbacks pueden repetirse en ámbitos distintos):

```js
write(chunk, encoding, callback)
```

## scripts/configure-mail.ps1

Guardar la contraseña de aplicación SMTP sin mostrarla.

- **Entrada:** Entrada SecureString de 16 caracteres.
- **Salida:** SMTP_PASSWORD actualizado en .env.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** Libera el BSTR usado para convertir el secreto. Nunca imprimir el valor ni el archivo resultante.

## scripts/install-local-voice.ps1

Instalar Piper y la voz española verificada.

- **Entrada:** URLs y hashes fijados en el script; acceso de red.
- **Salida:** Archivos en runtime/piper y runtime/voices.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** Compara SHA256 antes de usar descargas. No ejecuta síntesis ni usa claves de API.

## scripts/install-multilingual-voices.ps1

Instalar voces inglesa y francesa del manifiesto.

- **Entrada:** Piper ya instalado y multilingual-voices.json con URL/sha256.
- **Salida:** Modelos y configuraciones verificados en runtime/voices.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** Comprueba nombres permitidos y hashes; reiniciar Nexo después de instalar.

## scripts/open-admin.ps1

Abrir administración con el método de acceso disponible.

- **Entrada:** Estado público de autenticación; .env solo en modo token.
- **Salida:** Navegador abierto; en modo token copia credencial al portapapeles.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** El portapapeles contiene un secreto en el modo antiguo; no compartirlo. En modo correo solo abre la pantalla de código.

## scripts/purge.js

Ejecutar limpieza de registros de la demo según retención.

- **Entrada:** Configuración del entorno y repositorio local.
- **Salida:** Conteo de registros eliminados.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** Es una operación de escritura/borrado; no ejecutarla para aprender sobre una base real.

**Dependencias directas:** `../server/config.js`, `../server/db.js`.

## scripts/validate-faq.js

Validar el archivo semilla de preguntas frecuentes.

- **Entrada:** conocimiento/preguntas-frecuentes.txt y catálogo de referencia.
- **Salida:** Conteo o errores de formato.
- **Estado importante:** Las rutas se resuelven respecto al proyecto; revisar constantes antes de ejecutar.
- **Efectos y límites:** No publica cambios en la base SQLite activa.

**Dependencias directas:** `node:fs/promises`, `node:fs`, `node:path`, `node:sqlite`, `../server/faq.js`.

## VALIDAR-RESPUESTAS.cmd

Comprueba el formato del archivo semilla FAQ.

- **Entrada:** Acción del operador en Windows y herramientas instaladas.
- **Salida:** Ejecución del script indicado o apertura del navegador.
- **Estado importante:** %~dp0 identifica la carpeta de este lanzador; errorlevel indica fallo.
- **Efectos y límites:** No es código que deba importarse desde el navegador. Revisar el script delegado para sus efectos.

## scripts/create-pilot-access.js

**Propósito:** Crear una clave aleatoria sin imprimirla.

- **Entra:** Ruta nueva de archivo privado.
- **Sale:** JSON 0600 con clave y hash scrypt.
- **Estado y efectos:** No sobreescribe archivos ni modifica el entorno activo.

## scripts/package-pilot.py

**Propósito:** Construir entrega por lista de archivos permitidos.

- **Entra:** Código y plantillas.
- **Sale:** Tar, manifiesto interno y SHA256.
- **Estado y efectos:** Rechaza enlaces y nombres privados; no copia bases, cachés ni credenciales.

## scripts/pilot-smoke.js

**Propósito:** Verificar la barrera pública del VPS.

- **Entra:** Origen HTTPS.
- **Sale:** Aserciones de acceso, cabeceras y CSRF.
- **Estado y efectos:** No autentica, no crea sesiones ni llama proveedores.

## deploy/check-linux-voice.mjs

Recibe ejecutable y modelos Linux; devuelve aserciones de WAV e identidad para los tres idiomas. Solo síntesis local, sin red.

## deploy/preflight.mjs

Lee entorno privado validado y permisos; comprueba Node, usuario, datos y voces sin contactar proveedores. Falla antes de habilitar un despliegue incompleto.

## deploy/install-voices.py

Recibe directorio destino; descarga únicamente modelos del manifiesto y compara SHA256 antes de reemplazar archivos. Rechaza contenido inesperado.

## deploy/backup.sh

Recibe destinatario público age y carpeta privada; respalda SQLite de forma coherente y cifra base, configuración y clave de Calendar. El temporal se elimina al terminar; no imprime secretos.

## deploy/install-release.sh

Recibe tar y hash esperado; crea una carpeta nueva, verifica entradas/manifiesto e instala npm sin scripts. No activa servicio ni reemplaza el código o datos vivos.

## scripts/restore-database.js

Utilidad offline con contraseña oculta. Descifra a SQLite nuevo, verifica integridad, revoca sesiones recuperadas y deja avisos pendientes para revisión; no reemplaza datos activos. Consulte [Reportes y respaldos](../49-reportes-avisos-respaldos.md).

### Comprobación del despliegue — actualización v0.31.0

[Contrato y recorrido de PILOT_PRIVATE_ENABLED, PILOT_PASSWORD y PILOT_PASSWORD_HASH](../53-configurar-acceso-piloto.md). Incluye separación entre barrera y protecciones del VPS, prioridad de claves, pruebas aisladas y verificación pública sin consumo.

## scripts/apply-mogollon-offer.js

Entrada, salida, propósito y límites en la cabecera del módulo. [Recorrido explicado, catálogo aprobado y validación](../54-catalogo-voz-agenda.md).

## scripts/apply-school-content.js

Lee el entorno sin imprimir claves y un JSON comercial. Comprueba el perfil MetodoMogollon y llama applyContentUpdate. Sin --apply solo propone. Requiere base ya inicializada; usar respaldo y detener el servidor antes de aplicar. No cambia calendarios ni alumnos.
