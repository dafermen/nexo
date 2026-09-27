# Mantener el portal de documentación

## Abrirlo

En Administración, pulse **Documentación**. Se abre una pestaña nueva en `/docs`. También puede abrir `ABRIR-DOCUMENTACION.cmd` con Nexo encendido. El portal es de consulta y contiene únicamente documentación de Nexo.

## Añadir y actualizar documentos

1. Guarde un archivo `.md` o `.txt` en `docs/`, con codificación UTF-8 y un título de primer nivel.
2. Use enlaces relativos a otros documentos. Las capturas pueden guardarse en `docs/capturas/` como PNG, JPEG, WebP o GIF.
3. Actualice la página: el servidor vuelve a descubrir los documentos y el buscador consulta también su contenido.
4. Actualice `docs/project-status.json` para modificar fases y tareas. Cada tarea tiene un identificador, fase, prioridad, estado y documento de evidencia. Los pendientes incluyen un criterio de aceptación.
5. Mantenga el resumen escrito de fases y la continuidad consistentes con el tablero.

`README.md` y `UBICACION.md` también se incluyen. Los documentos de las etapas 01 a 15 muestran un aviso de antecedente histórico. Para cambiar categorías, revise `server/documentation.js`.

## Cómo funciona

El servidor entrega un catálogo con títulos, contenido para búsqueda, referencias de capturas y estado del proyecto. El lector solicita cada documento mediante un identificador generado a partir de su ruta. Los endpoints son `GET /api/docs/catalog`, `GET /api/docs/document?id=…` y `GET /api/docs/assets?id=…`.

El navegador analiza Markdown con Marked 17.0.5, distribuido localmente bajo licencia MIT, y construye los elementos del lector. No se inserta HTML del documento como código ejecutable. Las tablas y listas se muestran directamente; los diagramas Mermaid se presentan como su código fuente. No se cargan imágenes remotas. Consulte [la licencia](MARKED-LICENSE.txt).

## Alcance y acceso

En modo local el portal es de lectura sin acceso administrativo. En modo piloto, su API exige tanto acceso al piloto como sesión administrativa. No guardar secretos ni datos de alumnos en la documentación, incluso protegida.

No incluya claves, transcripciones personales ni información de alumnos en documentos o capturas. La API admite únicamente los archivos de documentación y las imágenes permitidas; no permite solicitar una ruta arbitraria ni leer `.env`, la base de datos o los registros. Comprueba también que la ruta real permanezca dentro del proyecto.

## Validación

Ejecute `npm.cmd test`, `npm.cmd run check` y `npm.cmd run test:docs` con Playwright disponible. Las pruebas del portal utilizan un servidor aislado y comprueban navegación, búsqueda, descarga, enlaces, vista móvil y contenido seguro. No inician conversaciones, OpenAI ni LiveAvatar.

## Ruta educativa y referencia del código

La portada ofrece cuatro accesos bajo «Aprenda cómo está construido»: mapa, recorridos, datos/contratos y prácticas. La categoría «Aprender el código» agrupa las guías 41–44 y las fichas de `docs/codigo/`. El manual junior sigue disponible en las guías iniciales y enlazado desde esta ruta.

Al añadir un archivo propio, documente propósito, entradas, salidas, estado y efectos en su cabecera y ficha. Mantenga los contratos de las funciones centrales junto a la implementación. Ejecute `npm run docs:check` para detectar archivos sin ficha/cabecera y enlaces educativos rotos; la revisión humana debe comprobar que las explicaciones siguen correspondiendo al código.
