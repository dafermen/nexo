/**
 * NEXO · GUÍA DEL MÓDULO: server/admin-store.js
 * Persistir verificadores de acceso, límites y la base editable de FAQ.
 * Entrada: Conexión SQLite; hashes, revisiones, tiempos en milisegundos y texto FAQ validado por
 * el llamador.
 * Salida: Métodos del almacén; filas, booleanos de éxito y revisiones actualizadas.
 * Estado importante: admin_challenges almacena hash/salt; admin_sessions guarda tokenHash;
 * knowledge_bases conserva source y revision.
 * Efectos y límites: Transacciones impiden reutilizar un código. Cambiar el administrador revoca
 * sesiones; nunca guardar códigos ni cookies en claro aquí.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Authentication records contain verifiers only: never raw codes or session cookies.
export function createAdminStore(db){
 db.exec(`
  CREATE TABLE IF NOT EXISTS administrators(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE,updatedAt INTEGER NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS admin_challenges(id TEXT PRIMARY KEY,adminId INTEGER NOT NULL REFERENCES administrators(id),codeHash TEXT NOT NULL,salt TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL,createdAt INTEGER NOT NULL,expiresAt INTEGER NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS admin_sessions(tokenHash TEXT PRIMARY KEY,adminId INTEGER NOT NULL REFERENCES administrators(id),createdAt INTEGER NOT NULL,expiresAt INTEGER NOT NULL,absoluteExpiresAt INTEGER NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS auth_limits(bucket TEXT PRIMARY KEY,count INTEGER NOT NULL,resetAt INTEGER NOT NULL) STRICT;
  CREATE TABLE IF NOT EXISTS knowledge_bases(id TEXT PRIMARY KEY,source TEXT NOT NULL,revision INTEGER NOT NULL,updatedAt TEXT NOT NULL) STRICT;
 `);
 // Migración SQLite: eliminar la restricción histórica de un único administrador.
 // Conserva IDs y claves foráneas; rollback completo si cualquier paso falla.
 if(/CHECK\s*\(\s*id\s*=\s*1\s*\)/i.test(db.prepare("SELECT sql FROM sqlite_master WHERE name='administrators'").get().sql)){
  db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
  try{
   db.exec('CREATE TABLE administrators_multi(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE,updatedAt INTEGER NOT NULL) STRICT; INSERT INTO administrators_multi SELECT * FROM administrators; DROP TABLE administrators; ALTER TABLE administrators_multi RENAME TO administrators;');
   if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Migración administrativa inválida.');
   db.exec('COMMIT;');
  }catch(error){db.exec('ROLLBACK;');throw error;}finally{db.exec('PRAGMA foreign_keys=ON;');}
 }
 const audit=(action)=>db.prepare('INSERT INTO audit_events(action,entityId,createdAt) VALUES (?,?,?)').run(action,'administrator',new Date().toISOString());
 /**
  * transaction: Agrupa el callback síncrono bajo BEGIN IMMEDIATE; siempre COMMIT o ROLLBACK.
  * Entrada (firma real): fn.
  * Salida: El valor de fn; propaga el error tras revertir.
  */
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}};
 return {
  synchronizeAdministrator(email,now){return this.synchronizeAdministrators(email?[email]:[],now);},
  synchronizeAdministrators(emails,now){return transaction(()=>{
    let changed=false;
    for(const row of db.prepare('SELECT id,email FROM administrators').all())if(!emails.includes(row.email)){
      db.prepare('DELETE FROM admin_challenges WHERE adminId=?').run(row.id);
      db.prepare('DELETE FROM admin_sessions WHERE adminId=?').run(row.id);
      db.prepare('DELETE FROM administrators WHERE id=?').run(row.id);changed=true;
    }
    for(const email of emails)if(db.prepare('INSERT OR IGNORE INTO administrators(email,updatedAt) VALUES (?,?)').run(email,now).changes)changed=true;
    if(changed)audit('admin.identity.changed');
  });},
  takeAuthLimit(bucket,max,duration,now){return transaction(()=>{
    const record=db.prepare('SELECT * FROM auth_limits WHERE bucket=?').get(bucket);
    if(record&&record.resetAt>now&&record.count>=max)return false;
    db.prepare('INSERT INTO auth_limits VALUES(?,?,?) ON CONFLICT(bucket) DO UPDATE SET count=excluded.count,resetAt=excluded.resetAt').run(bucket,record&&record.resetAt>now?record.count+1:1,record&&record.resetAt>now?record.resetAt:now+duration);return true;
  });},
  createAdminChallenge({id,email,codeHash,salt,now,expiresAt}){return transaction(()=>{
    const admin=db.prepare('SELECT id FROM administrators WHERE email=?').get(email);
    if(!admin)return false;
    db.prepare("UPDATE admin_challenges SET status='superseded',codeHash='',salt='' WHERE adminId=? AND status IN ('pending','sent')").run(admin.id);
    db.prepare("INSERT INTO admin_challenges VALUES (?,?,?,?,0,'pending',?,?)").run(id,admin.id,codeHash,salt,now,expiresAt);audit('admin.code.requested');
  });},
  adminCodeDelivery(id,success){
    if(success)db.prepare("UPDATE admin_challenges SET status='sent' WHERE id=? AND status='pending'").run(id);
    else db.prepare("UPDATE admin_challenges SET status='failed',codeHash='',salt='' WHERE id=? AND status='pending'").run(id);
    audit(success?'admin.mail.accepted':'admin.mail.failed');
  },
  claimAdminAttempt(id,now){return db.prepare("UPDATE admin_challenges SET attempts=attempts+1 WHERE id=? AND status='sent' AND expiresAt>? AND attempts<5 RETURNING *").get(id,now);},
  failAdminAttempt(id){db.prepare("UPDATE admin_challenges SET status='locked',codeHash='',salt='' WHERE id=? AND status='sent' AND attempts>=5").run(id);audit('admin.code.rejected');},
  /**
   * consumeAdminChallenge: Canjea código vigente por sesión dentro de una única transacción.
   * Entrada (firma real): {id,tokenHash,now,idleMs,absoluteMs}.
   * Salida: Booleano; un segundo canje no vuelve a crear acceso.
   */
  consumeAdminChallenge({id,tokenHash,now,idleMs,absoluteMs}){return transaction(()=>{
    const consumed=db.prepare("UPDATE admin_challenges SET status='consumed',codeHash='',salt='' WHERE id=? AND status='sent' AND expiresAt>? AND attempts<=5 RETURNING adminId").get(id,now);
    if(!consumed)return false;
    db.prepare('INSERT INTO admin_sessions VALUES(?,?,?,?,?)').run(tokenHash,consumed.adminId,now,now+idleMs,now+absoluteMs);audit('admin.login');return true;
  });},
  authenticateAdministrator(tokenHash,now,idleMs){return !!db.prepare('UPDATE admin_sessions SET expiresAt=min(?,absoluteExpiresAt) WHERE tokenHash=? AND expiresAt>? AND absoluteExpiresAt>? RETURNING tokenHash').get(now+idleMs,tokenHash,now,now);},
  revokeAdminSession(tokenHash){if(db.prepare('DELETE FROM admin_sessions WHERE tokenHash=?').run(tokenHash).changes)audit('admin.logout');},
  purgeAdministratorData(now){
    db.prepare('DELETE FROM admin_sessions WHERE expiresAt<=? OR absoluteExpiresAt<=?').run(now,now);
    db.prepare("UPDATE admin_challenges SET status='expired',codeHash='',salt='' WHERE expiresAt<=? AND codeHash<>''").run(now);
    db.prepare('DELETE FROM admin_challenges WHERE createdAt<?').run(now-86400000);
    db.prepare('DELETE FROM auth_limits WHERE resetAt<=?').run(now);
  },
  readKnowledge(id){return db.prepare('SELECT * FROM knowledge_bases WHERE id=?').get(id)||null;},
  /**
   * seedKnowledge: Inserta la semilla una sola vez mediante INSERT OR IGNORE.
   * Entrada (firma real): id, source.
   * Salida: Base existente o recién creada; nunca reemplaza contenido vigente.
   */
  seedKnowledge(id,source){db.prepare('INSERT OR IGNORE INTO knowledge_bases VALUES(?,?,1,?)').run(id,source,new Date().toISOString());return this.readKnowledge(id);},
  /**
   * saveKnowledge: Actualiza FAQ solo si coincide revision; no pisa cambios de otra ventana.
   * Entrada (firma real): id, revision, source.
   * Salida: Fila actualizada o null ante conflicto.
   */
  saveKnowledge(id,revision,source){return transaction(()=>{
    const result=db.prepare('UPDATE knowledge_bases SET source=?,revision=revision+1,updatedAt=? WHERE id=? AND revision=?').run(source,new Date().toISOString(),id,revision);
    if(!result.changes)return null;
    db.prepare('INSERT INTO audit_events(action,entityId,createdAt) VALUES (?,?,?)').run('knowledge.updated',id,new Date().toISOString());return this.readKnowledge(id);
  });},
 };
}
