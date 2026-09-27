/**
 * NEXO · GUÍA DEL MÓDULO: server/conversation-store.js
 * Registrar atención y turnos de conversación para seguimiento.
 * Entrada: db; canal text/voice/video; mensajes y resultado de cada turno.
 * Salida: IDs, páginas del historial, métricas y un generador de texto para exportar.
 * Estado importante: conversationId agrupa turnos; outcome distingue
 * pending/completed/interrupted; reason explica de dónde salió la respuesta.
 * Efectos y límites: Guarda texto, no grabaciones de micrófono. recoverConversations marca
 * interrupciones tras reinicio; retención 0 no elimina automáticamente el historial.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {randomUUID} from 'node:crypto';
export function createConversationStore(db){
 db.exec(`
 CREATE TABLE IF NOT EXISTS conversations(
 id TEXT PRIMARY KEY,startedAt TEXT NOT NULL,lastAt TEXT NOT NULL,endedAt TEXT,
 status TEXT NOT NULL,closeReason TEXT,channel TEXT NOT NULL,consentVersion TEXT NOT NULL
 ) STRICT;
 CREATE TABLE IF NOT EXISTS conversation_turns(
 id INTEGER PRIMARY KEY AUTOINCREMENT,conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 kind TEXT NOT NULL,channel TEXT NOT NULL,startedAt TEXT NOT NULL,completedAt TEXT,
 userText TEXT NOT NULL,assistantText TEXT,outcome TEXT NOT NULL,provider TEXT,reason TEXT,serviceId TEXT,
 aiCalls INTEGER NOT NULL DEFAULT 0,inputTokens INTEGER NOT NULL DEFAULT 0,outputTokens INTEGER NOT NULL DEFAULT 0,durationMs INTEGER NOT NULL DEFAULT 0
 ) STRICT;
 CREATE INDEX IF NOT EXISTS conversations_date ON conversations(startedAt DESC);
 CREATE INDEX IF NOT EXISTS turns_conversation ON conversation_turns(conversationId,id);
`);
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {
  startConversation(channel='text'){const id=randomUUID(),now=new Date().toISOString();db.prepare("INSERT INTO conversations VALUES(?,?,?,NULL,'active',NULL,?,'text-log-v1')").run(id,now,now,channel);return id;},
  startConversationTurn(id,{message='',channel='text',kind='message'}={}){return transaction(()=>{const now=new Date().toISOString();db.prepare('UPDATE conversations SET lastAt=? WHERE id=?').run(now,id);return Number(db.prepare("INSERT INTO conversation_turns(conversationId,kind,channel,startedAt,userText,outcome) VALUES(?,?,?,?,?,'pending')").run(id,kind,channel,now,message).lastInsertRowid);});},
  completeConversationTurn(id,{text=null,outcome='completed',provider=null,reason=null,serviceId=null,aiCalls=0,inputTokens=0,outputTokens=0,durationMs=0}={}){
   const now=new Date().toISOString();
   db.prepare('UPDATE conversation_turns SET assistantText=?,outcome=?,provider=?,reason=?,serviceId=?,aiCalls=?,inputTokens=?,outputTokens=?,durationMs=?,completedAt=? WHERE id=?').run(text,outcome,provider,reason,serviceId,aiCalls,inputTokens,outputTokens,durationMs,now,id);
   db.prepare('UPDATE conversations SET lastAt=? WHERE id=(SELECT conversationId FROM conversation_turns WHERE id=?)').run(now,id);
  },
  endConversation(id,reason='ended'){db.prepare("UPDATE conversations SET status='closed',closeReason=?,endedAt=? WHERE id=? AND status='active'").run(reason,new Date().toISOString(),id);},
  recoverConversations(){const now=new Date().toISOString();db.prepare("UPDATE conversation_turns SET outcome='interrupted',completedAt=? WHERE outcome='pending'").run(now);db.prepare("UPDATE conversations SET status='interrupted',closeReason='server_restart',endedAt=? WHERE status='active'").run(now);},
  purgeConversations(days,now=new Date()){if(!days)return 0;return db.prepare("DELETE FROM conversations WHERE status<>'active' AND lastAt<?").run(new Date(now.getTime()-days*86400000).toISOString()).changes;},
  listConversations(offset=0){return db.prepare('SELECT c.*, (SELECT count(*) FROM conversation_turns t WHERE t.conversationId=c.id) AS turns FROM conversations c ORDER BY startedAt DESC,id DESC LIMIT 50 OFFSET ?').all(offset);},
  conversation(id){return db.prepare('SELECT * FROM conversations WHERE id=?').get(id)||null;},
  conversationTurns(id,offset=0){return db.prepare('SELECT * FROM conversation_turns WHERE conversationId=? ORDER BY id LIMIT 100 OFFSET ?').all(id,offset);},
  conversationMetrics(){return {
   sessions:db.prepare('SELECT count(*) AS total,sum(status=?) AS active FROM conversations').get('active'),
   turns:db.prepare("SELECT count(*) AS total,coalesce(sum(aiCalls),0) AS aiCalls,coalesce(sum(inputTokens),0) AS inputTokens,coalesce(sum(outputTokens),0) AS outputTokens,round(avg(CASE WHEN outcome='completed' THEN durationMs END)) AS averageMs FROM conversation_turns WHERE kind='message'").get(),
   channels:db.prepare("SELECT channel,count(*) AS turns FROM conversation_turns WHERE kind='message' GROUP BY channel").all(),
   reasons:db.prepare("SELECT reason,count(*) AS turns FROM conversation_turns WHERE kind='message' AND reason IS NOT NULL GROUP BY reason ORDER BY turns DESC LIMIT 10").all(),
   outcomes:db.prepare("SELECT outcome,count(*) AS turns FROM conversation_turns WHERE kind='message' GROUP BY outcome").all()
  };},
  *exportConversation(id){
   const c=this.conversation(id);if(!c)return;
   yield '\uFEFFNEXO · REGISTRO DE CONVERSACIÓN\nID: '+c.id+'\nInicio UTC: '+c.startedAt+'\nEstado: '+c.status+'\nCierre: '+(c.closeReason||'—')+'\n\n';
   // Keyset pages release SQLite statements between chunks; include only this export's snapshot.
   const max=db.prepare('SELECT max(id) AS id FROM conversation_turns WHERE conversationId=?').get(id).id||0;let after=0;
   while(after<max){const rows=db.prepare('SELECT * FROM conversation_turns WHERE conversationId=? AND id>? AND id<=? ORDER BY id LIMIT 100').all(id,after,max);if(!rows.length)break;
    for(const t of rows){yield '['+t.startedAt+'] Canal: '+t.channel+' · '+t.outcome+'\n'+(t.userText?'VISITANTE:\n'+t.userText+'\n':'')+(t.assistantText?'NEXO (respuesta generada):\n'+t.assistantText+'\n':'')+'Origen: '+(t.provider||'—')+' · Motivo: '+(t.reason||'—')+' · IA: '+t.aiCalls+' llamadas · Tokens: '+t.inputTokens+' entrada / '+t.outputTokens+' salida\n\n';after=t.id;}
   }
  }
 };
}

