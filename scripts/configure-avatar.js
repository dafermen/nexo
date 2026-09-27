/**
 * NEXO · GUÍA DEL MÓDULO: scripts/configure-avatar.js
 * Recoger ajustes de LiveAvatar con entrada oculta para la clave.
 * Entrada: Respuestas de consola: clave, avatarId y habilitación de pago.
 * Salida: Variables LIVEAVATAR actualizadas en .env.
 * Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
 * ejecutar.
 * Efectos y límites: Conserva otras variables; no crea una sesión de video. Requiere reiniciar
 * para cargar el entorno.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
let muted = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
const rl = createInterface({ input: process.stdin, output, terminal: !!process.stdin.isTTY });
try {
  console.log('NEXO - Configuración local de LiveAvatar\nCrea tu cuenta en https://app.liveavatar.com\nLa clave se guardará solo en .env; no se envía al chat.\n');
  process.stdout.write('Clave de API de LiveAvatar (entrada oculta): '); muted = true;
  const apiKey = (await rl.question('')).trim(); muted = false; console.log();
  if (!apiKey || /[\s"'#\\]/.test(apiKey)) throw new Error('Clave vacía o con caracteres no admitidos. No se guardaron cambios.');
  const avatarId = (await rl.question('ID de la recepcionista (Enter para configurar solo prueba técnica Wayne): ')).trim();
  const voiceId = ''; // LITE uses Nexo's own TTS.
  const allowPaid = (await rl.question('¿Habilitar sesiones con créditos? Escribe SI; Enter mantiene solo sandbox: ')).trim().toUpperCase() === 'SI';
  if ((avatarId && !uuid.test(avatarId)) || (voiceId && !uuid.test(voiceId))) throw new Error('Los IDs deben ser UUID válidos. No se guardaron cambios.');
  const previous = existsSync(envPath) ? readFileSync(envPath, 'utf8') : 'PORT=3000\nAI_PROVIDER=demo\nDB_PATH=./data/kiosk.sqlite\n';
  const preserved = previous.split(/\r?\n/).filter(line => !/^\s*(?:export\s+)?LIVEAVATAR_(API_KEY|AVATAR_ID|VOICE_ID|MODE|ALLOW_PAID|MAX_SECONDS)\s*=/.test(line)).join('\n').trimEnd();
  writeFileSync(envPath, `${preserved}\nLIVEAVATAR_API_KEY=${apiKey}\nLIVEAVATAR_AVATAR_ID=${avatarId}\nLIVEAVATAR_VOICE_ID=${voiceId}\nLIVEAVATAR_MODE=LITE\nLIVEAVATAR_ALLOW_PAID=${allowPaid}\nLIVEAVATAR_MAX_SECONDS=60\n`, { mode: 0o600 });
  console.log('\nConfiguración guardada. Reinicia Nexo y pulsa Probar video.\nLITE usa la voz local del servidor. La recepcionista tiene un límite de 1 minuto; sandbox usa Wayne durante 1 minuto.');
} catch (error) { muted = false; console.error(error.message); process.exitCode = 1; }
finally { rl.close(); }
