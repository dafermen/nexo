# Referencia: Páginas HTML y estilos CSS

Contratos del código propio de Nexo. Consulte primero el [mapa de código](../41-mapa-codigo-fuente.md) y el [manual junior](../23-manual-desarrollador-junior.md). Las firmas orientan la lectura; el cuerpo y sus validaciones son la autoridad ejecutable.

## public/admin-access.css

Formulario de acceso y avisos de autenticación.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/admin.css

Listados y editores administrativos.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/admin.html

Administración de negocio y servicios: estructura HTML.

- **Entrada:** CSS, módulo JavaScript asociado y eventos del visitante.
- **Salida:** Árbol DOM con regiones, controles, etiquetas y diálogos.
- **Estado importante:** Los id son contratos con JavaScript; hidden/open/aria-* expresan visibilidad y accesibilidad.
- **Efectos y límites:** El HTML no valida permisos del servidor. Mantener labels, foco y type de botones al editar formularios.

**Puntos de unión con JavaScript (id):** `settings-link`, `documentation-link`, `logout`, `login`, `token`, `error`, `saved`, `dashboard`, `school-name`, `refresh`, `last-saved`, `knowledge-status`, `ai-protection`, `audio-library`, `audio-library-status`, `audio-library-refresh`, `audio-library-clear`, `school-details`, `school-settings`, `new-service`, `service-admin`, `appointments`, `empty`, `service-dialog`, `service-form`, `editor-title`, `close-editor`, `price-currency-label`, `editor-error`, `save-service`. Mantenerlos sincronizados con selectores y etiquetas.

## public/base.css

Base tipográfica, controles y accesibilidad compartidos.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

**Variables declaradas:** `--ink`, `--lime`, `--line`, `--paper`.

## public/call-view.css

Presentación de llamada, controles y encuadre de video.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/conversations.css

Listado y detalle del historial.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/conversations.html

Historial y métricas privadas: estructura HTML.

- **Entrada:** CSS, módulo JavaScript asociado y eventos del visitante.
- **Salida:** Árbol DOM con regiones, controles, etiquetas y diálogos.
- **Estado importante:** Los id son contratos con JavaScript; hidden/open/aria-* expresan visibilidad y accesibilidad.
- **Efectos y límites:** El HTML no valida permisos del servidor. Mantener labels, foco y type de botones al editar formularios.

**Puntos de unión con JavaScript (id):** `logout`, `login`, `token`, `error`, `dashboard`, `metrics`, `retention`, `refresh`, `previous`, `next`, `conversations`, `detail-title`, `download`, `detail-info`, `turns`, `more-turns`. Mantenerlos sincronizados con selectores y etiquetas.

## public/docs.css

Biblioteca, índice lateral, Markdown, móvil e impresión.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

**Variables declaradas:** `--docs-green`, `--docs-muted`, `--docs-border`.

## public/docs.html

Biblioteca de documentación: estructura HTML.

- **Entrada:** CSS, módulo JavaScript asociado y eventos del visitante.
- **Salida:** Árbol DOM con regiones, controles, etiquetas y diálogos.
- **Estado importante:** Los id son contratos con JavaScript; hidden/open/aria-* expresan visibilidad y accesibilidad.
- **Efectos y límites:** El HTML no valida permisos del servidor. Mantener labels, foco y type de botones al editar formularios.

**Puntos de unión con JavaScript (id):** `menu-toggle`, `sidebar`, `category-nav`, `document-count`, `main`, `search-form`, `search`, `notice`, `view`. Mantenerlos sincronizados con selectores y etiquetas.

## public/index.html

Pantalla pública del kiosco: estructura HTML.

- **Entrada:** CSS, módulo JavaScript asociado y eventos del visitante.
- **Salida:** Árbol DOM con regiones, controles, etiquetas y diálogos.
- **Estado importante:** Los id son contratos con JavaScript; hidden/open/aria-* expresan visibilidad y accesibilidad.
- **Efectos y límites:** El HTML no valida permisos del servidor. Mantener labels, foco y type de botones al editar formularios.

**Puntos de unión con JavaScript (id):** `mode`, `fullscreen`, `agent-state`, `agent-heading`, `avatar`, `avatar-video`, `avatar-audio`, `start`, `start-video`, `new-conversation`, `home-services`, `home-agenda`, `home-chat`, `home-notice`, `home-options`, `channel-hint`, `local-voice-status`, `avatar-local`, `avatar-live`, `avatar-audio-enable`, `home-panel`, `home-panel-close`, `services-tab`, `chat-tab`, `chat-dot`, `end-session`, `services-view`, `services`, `chat-view`, `messages`, `chat-form`, `mic`, `message`, `send`, `input-status`, `sound`, `notice`, `privacy`, `home-menu`, `home-menu-title`, `home-menu-tools`, `welcome-dialog`, `welcome-title`, `welcome-detail`, `session-retention-copy`, `accept-session`, `voice-dialog`, `voice-title`, `voice-send-detail`, `accept-voice`, `privacy-dialog`, `privacy-title`, `booking-dialog`, `booking-title`, `booking-content`, `idle-dialog`, `idle-title`, `continue-session`, `idle-new-conversation`, `avatar-dialog`, `avatar-title`, `avatar-config-status`, `avatar-start-form`, `avatar-data-consent`, `avatar-connect`, `avatar-setup`. Mantenerlos sincronizados con selectores y etiquetas.

## public/kiosk-home.css

Distribución responsive de una pantalla y paneles del inicio.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/knowledge.css

Editor de FAQ.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/knowledge.html

Editor de respuestas frecuentes: estructura HTML.

- **Entrada:** CSS, módulo JavaScript asociado y eventos del visitante.
- **Salida:** Árbol DOM con regiones, controles, etiquetas y diálogos.
- **Estado importante:** Los id son contratos con JavaScript; hidden/open/aria-* expresan visibilidad y accesibilidad.
- **Efectos y límites:** El HTML no valida permisos del servidor. Mantener labels, foco y type de botones al editar formularios.

**Puntos de unión con JavaScript (id):** `logout`, `login`, `token`, `error`, `saved`, `dashboard`, `knowledge-form`, `source`, `revision`, `reload`, `save`. Mantenerlos sincronizados con selectores y etiquetas.

## public/reviews.css

Cola y editor de revisiones.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/reviews.html

Revisión humana de consultas: estructura HTML.

- **Entrada:** CSS, módulo JavaScript asociado y eventos del visitante.
- **Salida:** Árbol DOM con regiones, controles, etiquetas y diálogos.
- **Estado importante:** Los id son contratos con JavaScript; hidden/open/aria-* expresan visibilidad y accesibilidad.
- **Efectos y límites:** El HTML no valida permisos del servidor. Mantener labels, foco y type de botones al editar formularios.

**Puntos de unión con JavaScript (id):** `logout`, `login`, `token`, `error`, `saved`, `dashboard`, `pending`, `topics`, `status`, `refresh`, `previous`, `next`, `items`, `editor`, `context`, `visitor`, `assistant`, `state`, `review-form`, `question`, `answer`, `approved`, `publication-note`, `draft`, `publish`, `dismiss`. Mantenerlos sincronizados con selectores y etiquetas.

## public/settings.css

Secciones y formularios de configuración.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/settings.html

Parámetros e integraciones: estructura HTML.

- **Entrada:** CSS, módulo JavaScript asociado y eventos del visitante.
- **Salida:** Árbol DOM con regiones, controles, etiquetas y diálogos.
- **Estado importante:** Los id son contratos con JavaScript; hidden/open/aria-* expresan visibilidad y accesibilidad.
- **Efectos y límites:** El HTML no valida permisos del servidor. Mantener labels, foco y type de botones al editar formularios.

**Puntos de unión con JavaScript (id):** `logout`, `login`, `token`, `error`, `saved`, `dashboard`, `sections`, `settings-form`, `fields`, `save-hint`, `reload`, `save`, `preview-card`, `preview-assistant`, `preview-business`, `preview-greeting`, `preview-channels`, `revision`. Mantenerlos sincronizados con selectores y etiquetas.

## public/styles.css

Estilos generales del kiosco, avatar, chat y formularios.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

## public/theme.css

Variables de tema reutilizadas en páginas.

- **Entrada:** Selectores del HTML, atributos/clases de JavaScript y tamaño de pantalla.
- **Salida:** Reglas visuales aplicadas por la cascada CSS; no devuelve datos JavaScript.
- **Estado importante:** Variables --* son parámetros visuales; @media adapta presentación; orden/especificidad deciden qué regla prevalece.
- **Efectos y límites:** Cambiar estilos no cambia permisos ni estado de reserva. Probar foco visible, contraste, desbordamiento y orientación.

**Variables declaradas:** `--lime`.

## public/pilot.html

**Propósito:** Entrada privada del piloto.

- **Entra:** Formulario de clave.
- **Sale:** Controles y estados accesibles.
- **Estado y efectos:** Separada del acceso administrativo y sin secretos incrustados.

## public/pilot.css

**Propósito:** Presentación responsive de la entrada.

- **Entra:** Ancho y estado del formulario.
- **Sale:** Reglas visuales y de foco.
- **Estado y efectos:** No cambia la autorización.
