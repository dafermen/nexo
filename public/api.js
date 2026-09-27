/**
 * NEXO · GUÍA DEL MÓDULO: public/api.js
 * Centralizar peticiones del kiosco al servidor Nexo.
 * Entrada: path y opciones method/body/signal.
 * Salida: Promesa del JSON recibido o Error con status HTTP.
 * Estado importante: token es el Bearer del visitante; el timeout limita espera a 30 segundos.
 * Efectos y límites: fetch al mismo servidor; no contiene claves de proveedores. JSON.stringify
 * serializa el body, no ejecuta instrucciones.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

export class ApiClient {
  constructor() { this.token = null; }
  /**
   * request: Serializa body y agrega Bearer visitante; combina cancelación del llamador con timeout.
   * Entrada (firma real): path, { method = 'GET', body, signal } = {}.
   * Salida: Promise del JSON; Error.status permite distinguir sesión vencida, conflicto o límite.
   */
  async request(path, { method = 'GET', body, signal } = {}) {
    let response;
    try {
      response = await fetch(path, {
        method, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) { if (signal?.aborted) throw error; throw new Error('No pude conectar con el centro. Revisa que el servidor esté activo e intenta otra vez.'); }
    const payload = await response.json();
    if(payload.pilotRequired)location.assign('/pilot');
    if (!response.ok) { const error = new Error(payload.error || 'No se pudo completar la solicitud.'); error.status = response.status; throw error; }
    return payload;
  }
}
