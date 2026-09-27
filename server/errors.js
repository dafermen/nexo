/**
 * NEXO · GUÍA DEL MÓDULO: server/errors.js
 * Representar errores HTTP controlados y validar campos de texto.
 * Entrada: status/message al construir HttpError; value, label, min, max en textField.
 * Salida: Error con status o texto recortado válido.
 * Estado importante: status será convertido a respuesta HTTP por app.js.
 * Efectos y límites: Lanza HttpError en vez de aceptar entradas inválidas; no registra secretos.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function textField(value, name, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\u0000-\u0008\u000b-\u001f]/.test(value)) {
    throw new HttpError(400, `${name}: ingresa entre ${min} y ${max} caracteres.`);
  }
  return value.trim();
}
