/**
 * NEXO · GUÍA DEL MÓDULO: scripts/purge.js
 * Ejecutar limpieza de registros de la demo según retención.
 * Entrada: Configuración del entorno y repositorio local.
 * Salida: Conteo de registros eliminados.
 * Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
 * ejecutar.
 * Efectos y límites: Es una operación de escritura/borrado; no ejecutarla para aprender sobre una
 * base real.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import { readConfig } from '../server/config.js';
import { createRepository } from '../server/db.js';
const config = readConfig();
const repository = createRepository(config.dbPath);
console.log(`Reservas vencidas eliminadas: ${repository.purge(config.retentionDays)}`);
repository.close();
