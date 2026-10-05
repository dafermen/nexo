# Referencia de temas del kiosco

## public/kiosk-themes.css

**Propósito:** Mantener variantes visuales aisladas para Nexo y Método Mogollón.

- **Entrada:** `body[data-theme]`, tamaño de pantalla y clases del estado de llamada.
- **Salida:** Colores, marca tipográfica, controles, superficies y distribución con asesora a la izquierda y menú a la derecha.
- **Variables importantes:** `--lime`, `--ink`, `--paper`, `--line`. El amarillo se fija solo para Método Mogollón.
- **Efectos y límites:** No cambia datos ni proveedores. Nexo conserva sus reglas existentes; los estados de peligro siguen distinguibles. La hoja se carga después de la distribución responsive.

`.method-menu` y `.method-footer` solo aparecen en el inicio de Método Mogollón; se ocultan durante llamadas. Las filas de idiomas y controles se reservan fuera de la imagen para evitar solapamientos. `data-catalog-mode="prices"` destaca precios del catálogo; no almacena importes. La imagen se selecciona en `renderCenter()` de `public/app.js`.

Recorrido completo y mantenimiento: [Temas visuales](../57-temas-visuales.md).
