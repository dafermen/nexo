# Referencia de temas del kiosco

## public/kiosk-themes.css

**Propósito:** Mantener variantes visuales aisladas para Nexo y Método Mogollón.

- **Entrada:** `body[data-theme]`, tamaño de pantalla y clases del estado de llamada.
- **Salida:** Colores, marca tipográfica, controles y superficies del kiosco.
- **Variables importantes:** `--lime`, `--ink`, `--paper`, `--line`. El amarillo se fija solo para Método Mogollón.
- **Efectos y límites:** No cambia datos ni proveedores. Nexo conserva sus reglas existentes; los estados de peligro siguen distinguibles. La hoja se carga después de la distribución responsive.

Recorrido completo y mantenimiento: [Temas visuales](../57-temas-visuales.md).
