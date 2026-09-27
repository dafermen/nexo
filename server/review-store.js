/**
 * NEXO · GUÍA DEL MÓDULO: server/review-store.js
 * Revisar respuestas insuficientes y publicar mejoras aprobadas.
 * Entrada: db; filtros de cola; acción draft/dismiss/publish con revision y aprobación.
 * Salida: Cola, temas, conteos y revisión actualizada; HttpError ante conflicto.
 * Estado importante: candidate selecciona turnos revisables; knowledgeRevision detecta cambios
 * simultáneos en FAQ.
 * Efectos y límites: Publicar escribe revisión y base FAQ dentro de una transacción. No aprende ni
 * publica automáticamente lo que diga un visitante.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {HttpError} from './errors.js';
import {parseFaq} from './faq.js';
import {normalize} from './school-filter.js';

export const reviewCandidate=`t.kind='message' AND (t.reason IN ('clarify','intent_clarify','agenda_clarify','unknown_fact','intent_unknown','guidance_unknown','interpretation_unavailable','ai_unavailable','response_error') OR (t.reason IN ('catalog','intent_catalog','faq') AND (t.assistantText LIKE '%pendiente%' OR t.assistantText LIKE '%confirmar con%')))`;
const candidate=reviewCandidate;
export function createReviewStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS answer_reviews(
 turnId INTEGER PRIMARY KEY REFERENCES conversation_turns(id) ON DELETE CASCADE,
 status TEXT NOT NULL,question TEXT NOT NULL,answer TEXT NOT NULL,revision INTEGER NOT NULL,updatedAt TEXT NOT NULL
 ) STRICT;`);
 const get=id=>db.prepare(`SELECT t.*,coalesce(r.status,'pending') AS reviewStatus,coalesce(r.question,'') AS question,coalesce(r.answer,'') AS answer,coalesce(r.revision,0) AS reviewRevision FROM conversation_turns t LEFT JOIN answer_reviews r ON r.turnId=t.id WHERE t.id=? AND ${candidate}`).get(id);
 return {
  reviewQueue(offset=0,status='pending'){
   const filter=status==='all'?'1=1':status==='pending'?"coalesce(r.status,'pending') IN ('pending','draft')":"r.status IN ('published','dismissed')";
   return {
    items:db.prepare(`SELECT t.*,coalesce(r.status,'pending') AS reviewStatus,coalesce(r.question,'') AS question,coalesce(r.answer,'') AS answer,coalesce(r.revision,0) AS reviewRevision,
     (SELECT count(*) FROM conversation_turns x WHERE x.conversationId=t.conversationId AND x.reason IN ('clarify','intent_clarify','agenda_clarify')) AS clarifications
     FROM conversation_turns t LEFT JOIN answer_reviews r ON r.turnId=t.id WHERE ${candidate} AND ${filter} ORDER BY t.id DESC LIMIT 30 OFFSET ?`).all(offset),
    topics:db.prepare("SELECT coalesce(serviceId,'general') AS serviceId,count(*) AS total FROM conversation_turns WHERE kind='message' GROUP BY serviceId ORDER BY total DESC LIMIT 12").all(),
    pending:db.prepare(`SELECT count(*) AS total FROM conversation_turns t LEFT JOIN answer_reviews r ON r.turnId=t.id WHERE ${candidate} AND coalesce(r.status,'pending') IN ('pending','draft')`).get().total
   };
  },
  updateReview(id,input){
   if(!['draft','dismiss','publish'].includes(input.action)||!Number.isSafeInteger(input.revision))throw new HttpError(400,'Acción o versión inválida.');
   const question=typeof input.question==='string'?input.question.trim():'',answer=typeof input.answer==='string'?input.answer.trim():'';
   if(input.action!=='dismiss'&&(!question||question.length>250||!answer||answer.length>1500||/[\r\n\x00-\x1f]/.test(question+answer)))throw new HttpError(400,'Escriba una pregunta de hasta 250 caracteres y una respuesta de hasta 1500, cada una en una sola línea.');
   db.exec('BEGIN IMMEDIATE');
   try{
    const prior=get(id);if(!prior)throw new HttpError(404,'Consulta no disponible.');
    if(prior.reviewRevision!==input.revision)throw new HttpError(409,'Otra ventana modificó esta revisión. Actualice la lista.');
    if(['published','dismissed'].includes(prior.reviewStatus))throw new HttpError(409,'Esta revisión ya está cerrada. Puede editar respuestas publicadas en Respuestas frecuentes.');
    const now=new Date().toISOString();
    if(input.action==='publish'){
     if(input.approved!==true)throw new HttpError(400,'Revise y apruebe la respuesta antes de publicarla.');
     const base=db.prepare("SELECT * FROM knowledge_bases WHERE id='school'").get();
     if(!base||base.revision!==input.knowledgeRevision)throw new HttpError(409,'La base de respuestas cambió. Actualice antes de publicar.');
     const entries=parseFaq(base.source);
     if(entries.some(e=>e.questions.some(q=>normalize(q)===normalize(question))))throw new HttpError(409,'Esa pregunta ya existe. Edite su respuesta en Respuestas frecuentes.');
     const source=base.source+'\n\n[revision-'+id+']\npregunta: '+question+'\nrespuesta: '+answer+'\n';
     try{parseFaq(source);}catch(e){throw new HttpError(400,e.message);}
     db.prepare("UPDATE knowledge_bases SET source=?,revision=revision+1,updatedAt=? WHERE id='school'").run(source,now);
    }
    const status={draft:'draft',dismiss:'dismissed',publish:'published'}[input.action];
    db.prepare('INSERT INTO answer_reviews VALUES(?,?,?,?,1,?) ON CONFLICT(turnId) DO UPDATE SET status=excluded.status,question=excluded.question,answer=excluded.answer,revision=answer_reviews.revision+1,updatedAt=excluded.updatedAt').run(id,status,input.action==='dismiss'?'':question,input.action==='dismiss'?'':answer,now);
    db.prepare('INSERT INTO audit_events(action,entityId,createdAt) VALUES(?,?,?)').run('answer_review.'+status,String(id),now);
    db.exec('COMMIT');return get(id);
   }catch(error){db.exec('ROLLBACK');throw error;}
  }
 };
}
