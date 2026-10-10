/**
 * NEXO · GUÍA DEL MÓDULO: server/providers/local-tts.js
 * Convertir texto a voz local Piper y describir su identidad de caché.
 * Entrada: Texto, owner, language y AbortSignal; rutas locales de ejecutable/modelos.
 * Salida: WAV en base64, duration y provider; status sin secretos; cacheIdentity con huellas.
 * Estado importante: job guarda el único proceso en curso y su owner; fingerprints reutiliza
 * huellas si los archivos no cambiaron; voiceSettings fija formato y frecuencia.
 * Efectos y límites: Inicia un proceso sin shell, limita tamaño/tiempo y permite detenerlo. No
 * llama una API de voz pagada.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {join} from 'node:path';
import { spawn } from 'node:child_process';
import {createHash} from 'node:crypto';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HttpError } from '../errors.js';

const executable = fileURLToPath(new URL('../../runtime/piper/piper.exe', import.meta.url));
// Perfiles explícitos y modelos de 22.050 Hz: el número de hablante forma parte de
// la identidad de caché, incluso cuando dos voces comparten el mismo modelo.
const profiles = {
 male:{es:{file:'es_ES-sharvard-medium',speaker:'0',locale:'es-ES'},en:{file:'en_US-bryce-medium',speaker:'0',locale:'en-US'},fr:{file:'fr_FR-upmc-medium',speaker:'1',locale:'fr-FR'}},
 female:{es:{file:'es_ES-sharvard-medium',speaker:'1',locale:'es-ES'},en:{file:'en_US-ljspeech-high',speaker:'0',locale:'en-US'},fr:{file:'fr_FR-siwis-medium',speaker:'0',locale:'fr-FR'}}
};
const voiceSettings={sampleRate:22050,sentenceSilence:'0.18',format:'wav-pcm16-mono',implementation:1};
const fingerprints=new Map();
/**
 * fingerprint: Calcula SHA256 del archivo y comparte el cálculo mientras tamaño y tiempos no
 * cambien.
 * Entrada (firma real): path.
 * Salida: Promise<string> con huella; un fallo quita la entrada para permitir reintento.
 */
async function fingerprint(path){
 const info=await stat(path),signature=[info.size,info.mtimeMs,info.ctimeMs].join(':');
 const prior=fingerprints.get(path);if(prior?.signature===signature)return prior.work;
 const work=(async()=>{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');})();
 fingerprints.set(path,{signature,work});try{return await work;}catch(error){fingerprints.delete(path);throw error;}
}
/**
 * pcmToWav: Prepara cabecera RIFF para PCM de 16 bits mono sin modificar muestras.
 * Entrada (firma real): pcm, sampleRate = 22050.
 * Salida: Buffer WAV; sampleRate determina duración/velocidad de reproducción.
 */
export function pcmToWav(pcm, sampleRate = 22050) {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
export class LocalTtsService {
  constructor({ spawnImpl = spawn, available, executable:engine=executable, voicesDirectory=fileURLToPath(new URL('../../runtime/voices/',import.meta.url)), engineVersion='bundled',voiceProfile='male' } = {}) { if(!Object.hasOwn(profiles,voiceProfile))throw new Error('Perfil de voz inválido.');this.voiceProfile=voiceProfile;this.voices=profiles[voiceProfile];this.spawn = spawnImpl; this.enabled = available; this.job = null; this.executable=engine; this.voicesDirectory=voicesDirectory; this.engineVersion=engineVersion; }
  modelPath(language){return join(this.voicesDirectory,this.voices[language].file+'.onnx');}
  status(language='es') {
    const voices=this.voices;
    const installed=Object.fromEntries(Object.keys(voices).map(key=>[key,this.enabled ?? (existsSync(this.executable) && existsSync(this.modelPath(key)) && existsSync(this.modelPath(key)+'.json'))]));
    return {available:installed[language]===true,languages:installed,provider:'piper',language:voices[language]?.locale,voiceProfile:this.voiceProfile,local:true};
  }
  /**
   * cacheIdentity: Describe exactamente idioma, modelo, hablante, motor y parámetros de síntesis.
   * Entrada (firma real): language='es'.
   * Salida: Promise de objeto de identidad o null si esa voz no está disponible.
   */
  async cacheIdentity(language='es'){
    const voices=this.voices;
    if(!Object.hasOwn(voices,language)||!this.status(language).available)return null;
    const model=this.modelPath(language),[modelHash,configHash,engineHash]=await Promise.all([fingerprint(model),fingerprint(model+'.json'),fingerprint(this.executable)]);
    return {provider:'piper',model:voices[language].file,speaker:voices[language].speaker,locale:voices[language].locale,modelHash,configHash,engineHash,engineVersion:this.engineVersion,...voiceSettings};
  }
  /**
   * synthesize: Inicia Piper con texto por stdin, recoge PCM y cancela por
   * timeout/tamaño/AbortSignal.
   * Entrada (firma real): text, { owner, signal, language='es' } = {}.
   * Salida: Promise<{audioBase64,duration,provider}>; un solo job simultáneo por instancia.
   */
  async synthesize(text, { owner, signal, language='es' } = {}) {
    const voices=this.voices;
    if(!Object.hasOwn(voices,language))throw new HttpError(400,'Idioma no disponible.');
    const model=this.modelPath(language);
    if (!this.status(language).available) throw new HttpError(503, 'La voz local no está instalada. Ejecuta INSTALAR-VOZ-LOCAL.cmd y reinicia Nexo.');
    if (this.job) throw new HttpError(409, 'La voz está preparando otra respuesta. Espera un momento.');
    if (signal?.aborted) throw new HttpError(409, 'Voz cancelada.');
    return new Promise((resolve, reject) => {
      const child = this.spawn(this.executable, ['--model', model, '--speaker', voices[language].speaker, '--output_raw', '--sentence_silence', voiceSettings.sentenceSilence], { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
      const job = { child, owner }; this.job = job;
      let ended = false, size = 0, chunks = [];
      const finish = (error, value) => {
        if (ended) return; ended = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
        if (this.job === job) this.job = null;
        if (error) { child.kill(); reject(error); } else resolve(value);
      };
      const abort = () => finish(new HttpError(409, 'Voz cancelada.'));
      job.cancel = abort;
      const timer = setTimeout(() => finish(new HttpError(503, 'La voz local tardó demasiado. Prueba una respuesta más corta.')), 25_000);
      signal?.addEventListener('abort', abort, { once: true });
      child.on('error', () => finish(new HttpError(503, 'No se pudo iniciar la voz local. Revisa la instalación de Piper.')));
      child.stdin.on('error', () => {}); child.stderr.resume();
      child.stdout.on('data', chunk => { size += chunk.length; if (size > 5_000_000) finish(new HttpError(413, 'La respuesta de voz es demasiado larga.')); else chunks.push(chunk); });
      child.on('close', code => {
        if (ended) return;
        if (code !== 0 || !size || size % 2) return finish(new HttpError(503, 'No se pudo generar la voz local.'));
        const pcm = Buffer.concat(chunks); chunks = [];
        finish(null, { audioBase64: pcmToWav(pcm).toString('base64'), duration: size / 44100, provider: 'piper-local' });
      });
      child.stdin.end(text.replace(/[\r\n]+/g, ' ') + '\n', 'utf8');
    });
  }
  /**
   * stop: Cancela el proceso solo si pertenece al owner solicitado.
   * Entrada (firma real): owner.
   * Salida: Sin valor; no interrumpe la voz de otro propietario.
   */
  stop(owner) { if (this.job?.owner === owner) this.job.cancel(); }
  close() { this.job?.cancel(); }
}
