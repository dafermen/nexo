# Manual de Git y GitHub para Nexo

## Estado verificado

Repositorio vigente: **https://github.com/dafermen/nexo** (público), propiedad del usuario. El historial parte de Nexo 0.33.0. GitHub Actions ejecuta las comprobaciones al subir a main y al abrir propuestas de cambio. Consulte Actions para conocer el resultado de cada revisión. El repositorio del cliente no se utiliza.

## Conceptos básicos

| Concepto | Significado práctico |
|---|---|
| Git | Historial de versiones guardado en su computadora |
| GitHub | Servicio donde puede alojar el repositorio y revisar trabajo |
| Commit | Un conjunto coherente de cambios guardados en el historial |
| Rama | Una línea de trabajo para desarrollar una tarea |
| Pull request | Una propuesta de cambios para revisar antes de integrar |
| Issue | Una necesidad, error o tarea con un resultado esperado |
| Actions | Automatizaciones de GitHub; prepararlas no significa haberlas ejecutado |

## Obtener el proyecto en otra computadora

La carpeta C:\Projects\Nexo ya tiene Git y el remoto correcto. No la reinicialice ni clone encima de ella. En una computadora nueva, elija una carpeta vacía:

```powershell
git clone https://github.com/dafermen/nexo.git
Set-Location nexo
npm ci --ignore-scripts
Copy-Item .env.example .env
npm run check
npm run docs:check
npm test
```

Complete su configuración privada según el [manual de instalación](31-sqlite-acceso-correo.md). No copie la base de producción para desarrollar. Node 24 aporta SQLite; voces locales y credenciales se configuran aparte.

`.gitignore` excluye `.env`, bases, instalación real, `.local`, `runtime`, dependencias y cobertura. Los archivos de ejemplo contienen valores ilustrativos. Git guarda código e historial; el respaldo cifrado conserva los datos del negocio.

## Trabajo cotidiano

Cuando ya exista un repositorio y un remoto:

1. Compruebe `git status` y preserve cualquier cambio pendiente.
2. Actualice la rama base con `git pull --ff-only` cuando esté limpia y corresponda.
3. Cree una rama para una tarea, por ejemplo `git switch -c mejora/faq-horarios`.
4. Implemente la tarea y ejecute las pruebas pertinentes.
5. Revise el diff, seleccione archivos y guarde un commit explicativo.
6. Suba la rama y abra un pull request.
7. Integre después de revisar la evidencia y resolver observaciones.

## Qué escribir en un pull request

```text
Problema: qué ocurre y a quién afecta.
Cambio: qué comportamiento queda disponible.
Validación: comandos y recorridos realmente ejecutados.
Pendientes: datos, dispositivos o dependencias que faltan.
Documentación: tarea y guía actualizadas.
```

Use títulos concretos: «Conservar el curso al pedir su precio» explica más que «Mejoras varias».

## Revisión y protección

En un repositorio compartido pueden exigirse revisiones y comprobaciones antes de integrar, además de restringir cambios directos a la rama principal. La disponibilidad depende de la cuenta y del tipo de repositorio. [Ramas protegidas](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

La protección de push puede detectar determinados secretos antes de que lleguen al repositorio, pero no sustituye la revisión del contenido. Si se filtra una credencial, debe revocarse y reemplazarse; borrar la línea del último archivo no la elimina del historial. [Protección de secretos](https://docs.github.com/en/code-security/concepts/secret-security/push-protection).

## Integración continua preparada

El archivo `.github/workflows/ci.yml` ejecuta al recibir cambios en main o propuestas de cambio:

1. Node 24 y dependencias fijadas por package-lock.json, sin scripts de instalación.
2. Sintaxis, cobertura de documentación y pruebas unitarias/API en Windows y Linux.
3. Chromium para autenticación, FAQ visual y portal, con proveedores simulados.

No utiliza claves de OpenAI, LiveAvatar, correo ni Google. No despliega por sí solo. Acciones fijadas por revisión, token de solo lectura y tiempo máximo de 15 minutos. Los fallos se consultan en la pestaña Actions del repositorio.

Para impedir integrar cambios con pruebas fallidas, el propietario deberá activar una regla de protección de main y exigir estas comprobaciones. **No está activada por esta entrega.**

![Flujo de cambios y revisión](assets/flujo-github.png)

## Recuperar un error

Primero revise `git status` y `git diff`. Corrija cambios locales editando los archivos. Para deshacer un cambio ya compartido, prefiera un commit de reversión revisado. Evite borrar historial o usar push forzado como solución rutinaria.

## SQLite y correo desde v0.13

Incluya package.json, package-lock.json, el código y config/installation.example.json. Excluya .env, config/installation.json, data, .local, respaldos y node_modules. No publique su correo privado de administración ni credenciales SMTP. En un clon nuevo ejecute npm ci. [Instalación](31-sqlite-acceso-correo.md).

## Primera publicación verificada — v0.33.1

El 27/09/2026 se publicó el historial en `dafermen/nexo`. La [primera ejecución de GitHub Actions](https://github.com/dafermen/nexo/actions/runs/36341650322) aprobó las 301 pruebas en cada sistema (Windows y Linux), comprobaciones de código/documentación y los tres recorridos de navegador: acceso por correo simulado, editor visual y portal. No se usaron claves ni APIs de pago. Las acciones se fijan por commit de su versión 6 y los sistemas de prueba son Ubuntu 24.04 y Windows 2025. El flujo valida; no despliega automáticamente ni impide por sí solo integrar una revisión fallida.
