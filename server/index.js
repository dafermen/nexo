/**
 * NEXO · GUÍA DEL MÓDULO: server/index.js
 * Arrancar Nexo y cerrar sus recursos ordenadamente.
 * Entrada: Configuración validada, ruta SQLite y base inicial de preguntas frecuentes.
 * Salida: Servidor HTTP escuchando en 127.0.0.1; código de salida si falla el arranque.
 * Estado importante: config contiene ajustes privados; repository reúne almacenes; purgeTimer
 * limpia datos vencidos; stopping evita cerrar dos veces.
 * Efectos y límites: Abre SQLite, carga FAQ, programa limpieza y atiende SIGINT/SIGTERM. No
 * importar este archivo en una prueba unitaria: arranca la aplicación.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import { SqliteFaqRepository } from './sqlite-faq.js';
import { fileURLToPath } from 'node:url';
import { readConfig } from './config.js';
import { createRepository } from './db.js';
import { createAiProvider } from './providers/ai.js';
import { createApp } from './app.js';

try {
  const config = readConfig();
  const repository = createRepository(config.dbPath);
  repository.recoverConversations();
  repository.purge(config.retentionDays);
  repository.purgeConversations(config.conversationRetentionDays);
  const purgeTimer = setInterval(() => {repository.purge(config.retentionDays);repository.purgeConversations(config.conversationRetentionDays);}, 3600_000);
  purgeTimer.unref();
  const faq = new SqliteFaqRepository(repository,fileURLToPath(new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url)));
  await faq.refresh();
  const app = createApp({ config, repository, ai: createAiProvider(config), faq });
  app.listen(config.port, '127.0.0.1', () => console.log(`NEXO disponible en http://localhost:${config.port} | ${config.provider === 'demo' ? 'DEMO: respuestas preparadas, sin IA real' : 'IA: OpenAI'} | Administración ${(config.adminToken || config.installation.email) ? 'habilitada' : 'desactivada'}`));
  app.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'El puerto está ocupado. Cambia PORT en .env.' : 'No se pudo iniciar el servidor.'); clearInterval(purgeTimer); repository.close(); process.exitCode = 1; });
  let stopping = false;
  const stop = () => {
    if (stopping) return; stopping = true;
    clearInterval(purgeTimer);
    app.close(async () => { await app.closeAdminAuth(); repository.close(); process.exit(0); });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
} catch (error) { console.error(error.message); process.exitCode = 1; }
