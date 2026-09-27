/**
 * NEXO · GUÍA DEL MÓDULO: server/audio-store.js
 * Persistir metadatos y métricas de la biblioteca de audio.
 * Entrada: db; clave hash, checksum, bytes, duración, idioma y marcas temporales.
 * Salida: Entradas ordenadas por uso y contadores de aciertos/fallos/tiempo evitado.
 * Estado importante: key identifica audio; lastUsed permite expulsión LRU; audio_library_metrics
 * conserva totales.
 * Efectos y límites: Guarda metadatos en SQLite, no texto de respuestas ni audio binario; los WAV
 * viven en disco privado.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Metadata only: audio and visitor messages are never stored in these tables.
export function createAudioStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS audio_library (
 key TEXT PRIMARY KEY, checksum TEXT NOT NULL, bytes INTEGER NOT NULL,
 duration REAL NOT NULL, generationMs INTEGER NOT NULL, language TEXT NOT NULL,
 createdAt INTEGER NOT NULL, lastUsed INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS audio_library_metrics (
 id INTEGER PRIMARY KEY CHECK(id=1), hits INTEGER NOT NULL DEFAULT 0,
 misses INTEGER NOT NULL DEFAULT 0, bypasses INTEGER NOT NULL DEFAULT 0,
 errors INTEGER NOT NULL DEFAULT 0, savedMs INTEGER NOT NULL DEFAULT 0);
 INSERT OR IGNORE INTO audio_library_metrics(id) VALUES(1);`);
 return {
  audioEntry:key=>db.prepare('SELECT * FROM audio_library WHERE key=?').get(key),
  audioEntries:()=>db.prepare('SELECT * FROM audio_library ORDER BY lastUsed,createdAt,key').all(),
  saveAudio:r=>db.prepare('INSERT OR REPLACE INTO audio_library VALUES(?,?,?,?,?,?,?,?)').run(r.key,r.checksum,r.bytes,r.duration,r.generationMs,r.language,r.createdAt,r.lastUsed),
  deleteAudio:key=>db.prepare('DELETE FROM audio_library WHERE key=?').run(key),
  touchAudio:(key,now)=>db.prepare('UPDATE audio_library SET lastUsed=? WHERE key=?').run(now,key),
  audioMetric:(name,savedMs=0)=>{
   if(!['hits','misses','bypasses','errors'].includes(name))throw Error('Unknown audio metric');
   db.prepare(`UPDATE audio_library_metrics SET ${name}=${name}+1,savedMs=savedMs+? WHERE id=1`).run(savedMs);
  },
  audioMetrics:()=>db.prepare('SELECT hits,misses,bypasses,errors,savedMs FROM audio_library_metrics WHERE id=1').get(),
 };
}
