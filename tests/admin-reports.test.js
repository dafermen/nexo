/**
 * NEXO · GUÍA DEL MÓDULO: tests/admin-reports.test.js
 * Verifica métricas, filtros, seguridad CSV/API, cola de avisos y recuperación de SQLite.
 * Entrada: datos sintéticos y correo simulado. Salida: aserciones sin proveedores reales.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createRepository} from '../server/db.js';
import {reportFilters,reportCsv,csvCell} from '../server/admin-reports.js';
import {BookingNotifications} from '../server/booking-notifications.js';
import {BookingMailer} from '../server/providers/booking-mail.js';
import {decryptSnapshot} from '../server/database-backup.js';
import {createApp} from '../server/app.js';

const record=(i=0)=>({id:randomUUID(),requestId:randomUUID(),sessionHash:'private-session',calendarId:'private-calendar',marker:'private-marker',slot:new Date(Date.UTC(2026,8,28,12)+i*3600000).toISOString(),end:new Date(Date.UTC(2026,8,28,13)+i*3600000).toISOString(),customerName:'Persona '+String(i).padStart(3,'0'),email:'person'+i+'@example.test',serviceId:'practice',serviceName:'Clase práctica',priceCents:null,currency:'USD',timezone:'America/New_York',createdAt:new Date().toISOString()});
const filters=s=>reportFilters(new URLSearchParams(s),'America/New_York');
test('reportes cuentan todas las citas, filtran y ordenan páginas estables sin secretos',t=>{
 const repo=createRepository(':memory:');t.after(()=>repo.close());
 for(let i=0;i<230;i++){const row=repo.claimBooking(record(i));repo.setBookingStatus(row.id,i%2?'reserved':'cancelled');}
 const first=repo.reportRows(filters('sort=customerName&direction=asc&limit=100'));
 assert.equal(first.total,230);assert.equal(first.items.length,100);assert.equal(first.items[0].customerName,'Persona 000');assert.equal(repo.reportRows(filters('offset=200')).items.length,25);
 const page=repo.reportRows(filters('q=person229@example.test'));assert.equal(page.total,1);assert.equal(page.items[0].customerName,'Persona 229');assert.doesNotMatch(JSON.stringify(page),/private-session|private-marker|private-calendar|sessionHash|requestId/);
 assert.equal(repo.reportRows(filters("q=' OR 1=1 --")).total,0);assert.equal(repo.reportRows(filters('status=reserved')).total,115);
 const csv=reportCsv(repo.reportRows(filters('status=reserved'),{exportAll:true}));assert.equal(csv.trim().split('\r\n').length,116);
 const stats=repo.reportSummary(filters(''));assert.equal(stats.bookings.total,230);assert.equal(stats.bookings.cancelled,115);assert.equal(stats.conversations,0);
});
test('preguntas por revisar comparten criterio con la cola y métricas sin inferir éxito',t=>{
 const repo=createRepository(':memory:');t.after(()=>repo.close());const id=repo.startConversation('voice');
 const a=repo.startConversationTurn(id,{message:'¿Y eso cómo?',channel:'voice'});repo.completeConversationTurn(a,{text:'¿Se refiere al curso?',reason:'intent_clarify',aiCalls:1,inputTokens:32,outputTokens:8,durationMs:500});
 const b=repo.startConversationTurn(id,{message:'Buenos días',channel:'text'});repo.completeConversationTurn(b,{text:'Buenos días',reason:'greeting',durationMs:20});
 const page=repo.reportRows(filters('type=questions&channel=voice&status=pending'));assert.equal(page.total,1);assert.equal(page.items[0].question,'¿Y eso cómo?');assert.equal(repo.reviewQueue().pending,1);
 repo.updateReview(a,{action:'dismiss',revision:0});assert.equal(repo.reportRows(filters('type=questions&status=pending')).total,0);assert.equal(repo.reportRows(filters('type=questions&status=dismissed')).total,1);
 const stats=repo.reportSummary(filters(''));assert.equal(stats.conversations,1);assert.equal(stats.turns.total,2);assert.equal(stats.turns.withoutAi,1);assert.equal(stats.turns.aiCalls,1);assert.equal(stats.turns.inputTokens,32);assert.equal(stats.reviews.pending,0);
});
test('filtros rechazan inyección/fechas; respeta DST y CSV neutraliza fórmulas',()=>{
 for(const s of ['sort=createdAt;DROP TABLE services','type=__proto__','direction=sideways','limit=10000','offset=-1','from=2026-02-30','status=bad','channel=bad','from=2020-01-01&to=2026-01-01'])assert.throws(()=>filters(s));
 const f=filters('from=2026-03-08&to=2026-03-08');assert.equal(Date.parse(f.end)-Date.parse(f.start),23*3600000);
 for(const value of ['=1+1',' +cmd','\t@SUM(1)','\r\n-3'])assert.ok(csvCell(value).startsWith('"\''));assert.equal(csvCell('a,"b"'),'"a,""b"""');
});
test('avisos: solo nuevas confirmaciones, ambos destinatarios, concurrencia e idempotencia',async t=>{
 const repo=createRepository(':memory:');t.after(()=>repo.close());const old=repo.claimBooking(record());repo.setBookingStatus(old.id,'reserved');
 const delivered=[],worker=new BookingNotifications({repository:repo,recipients:['a@example.test','b@example.test'],mailer:{ready:true,sendNewBooking:async x=>{delivered.push(x);}}});
 await worker.run();assert.equal(delivered.length,0);
 const row=repo.claimBooking(record(1));assert.equal(repo.queuedBookingNotifications().length,0);repo.setBookingStatus(row.id,'reserved');repo.setBookingStatus(row.id,'reserved');
 await Promise.all([worker.run(),worker.run()]);assert.equal(delivered.length,2);assert.deepEqual(delivered.map(x=>x.to),['a@example.test','b@example.test']);await worker.run();assert.equal(delivered.length,2);
 assert.equal(repo.reportRows(filters('type=notifications&status=sent')).total,2);await worker.close();
});
test('aviso incierto no se repite; reintento auditado y canceladas/administradores retirados se omiten',async t=>{
 const repo=createRepository(':memory:');t.after(()=>repo.close());let attempts=0;const recipients=['a@example.test'];
 let worker=new BookingNotifications({repository:repo,recipients,mailer:{ready:true,sendNewBooking:async()=>{attempts++;throw Error('SMTP disconnected');}}});
 const row=repo.claimBooking(record());repo.setBookingStatus(row.id,'reserved');await worker.run();await worker.run();assert.equal(attempts,1);
 const notice=repo.reportRows(filters('type=notifications')).items[0];assert.equal(notice.status,'uncertain');repo.retryBookingNotification(notice.id,recipients,'Admin');await worker.close();
 worker=new BookingNotifications({repository:repo,recipients,mailer:{ready:true,sendNewBooking:async()=>{attempts++;}}});await worker.run();assert.equal(attempts,2);
 assert.throws(()=>repo.retryBookingNotification(notice.id,recipients,'Admin'));
 const row2=repo.claimBooking(record(1));repo.setBookingStatus(row2.id,'reserved');repo.setBookingStatus(row2.id,'cancelled');await worker.run();assert.equal(attempts,2);
 const row3=repo.claimBooking(record(2));repo.setBookingStatus(row3.id,'reserved');await worker.close();worker=new BookingNotifications({repository:repo,recipients:[],mailer:{ready:true,sendNewBooking:async()=>{attempts++;}}});await worker.run();assert.equal(attempts,2);await worker.close();
});
test('un envío interrumpido por reinicio queda incierto y SMTP ausente conserva cola',async t=>{
 const repo=createRepository(':memory:');t.after(()=>repo.close());repo.setBookingNotificationRecipients(['a@example.test']);const row=repo.claimBooking(record());repo.setBookingStatus(row.id,'reserved');
 const id=repo.queuedBookingNotifications()[0].id;repo.claimBookingNotification(id);const worker=new BookingNotifications({repository:repo,recipients:['a@example.test'],mailer:{ready:false}});await worker.run();assert.equal(repo.reportRows(filters('type=notifications')).items[0].status,'uncertain');
 const second=repo.claimBooking(record(1));repo.setBookingStatus(second.id,'reserved');await worker.run();assert.equal(repo.queuedBookingNotifications().length,1);await worker.close();
});
test('correo administrativo contiene datos básicos, no copia destinatarios ni incluye secretos',async()=>{
 let payload;const mail=new BookingMailer({host:'smtp.test',from:'nexo@example.test',user:'test',password:'fake'},()=>({sendMail:async p=>{payload=p;return {accepted:[p.to]};}}));
 await mail.sendNewBooking({to:'admin@example.test',booking:{...record(),code:'ABCD-EFGH'},centerName:'Escuela'});
 assert.equal(payload.to,'admin@example.test');assert.equal(payload.cc,undefined);assert.match(payload.text,/ABCD-EFGH/);assert.match(payload.text,/America\/New_York/);assert.doesNotMatch(payload.text,/private-session|private-marker|private-calendar/);
});
test('respaldo online restaura WAL; clave errónea/alteración fallan y no sobrescribe archivos',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'nexo-report-test-'));const repo=createRepository(join(dir,'source.sqlite'));t.after(async()=>{repo.close();await rm(dir,{recursive:true,force:true});});
 const row=repo.claimBooking(record());const snapshot=await repo.encryptedBackup('correct-password-2026');t.after(snapshot.cleanup);
 const output=join(dir,'restored.sqlite');await decryptSnapshot(snapshot.path,output,'correct-password-2026');const db=new DatabaseSync(output,{readOnly:true});assert.equal(db.prepare('SELECT count(*) n FROM calendar_bookings WHERE id=?').get(row.id).n,1);db.close();
 assert.doesNotMatch((await readFile(snapshot.path)).toString(),/private-marker|SQLite format 3/);
 await assert.rejects(decryptSnapshot(snapshot.path,join(dir,'wrong.sqlite'),'incorrect-password'));await assert.rejects(access(join(dir,'wrong.sqlite')));
 await assert.rejects(decryptSnapshot(snapshot.path,output,'correct-password-2026'));await access(output);
 const data=await readFile(snapshot.path);data[50]^=1;const corrupt=join(dir,'bad.nexo');await writeFile(corrupt,data);await assert.rejects(decryptSnapshot(corrupt,join(dir,'bad.sqlite'),'correct-password-2026'));await assert.rejects(access(join(dir,'bad.sqlite')));
});
test('API reportes y respaldo exigen admin, origen, validación y descarga privada',async t=>{
 const repo=createRepository(':memory:');t.after(()=>repo.close());const admin='test-admin-reports-long-secret';const app=createApp({repository:repo,config:{provider:'demo',adminToken:admin},ai:{reply:async()=>({text:'test'})},localTts:{status:()=>({available:false}),close(){},stop(){}}});
 app.listen(0,'127.0.0.1');await once(app,'listening');t.after(()=>new Promise(resolve=>app.close(resolve)));const base='http://127.0.0.1:'+app.address().port;
 const call=(path,method='GET',body,authorized=true,origin=base)=>fetch(base+path,{method,headers:{...(authorized?{Authorization:'Bearer '+admin}:{}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 for(const path of ['/api/admin/reports','/api/admin/reports/summary','/api/admin/reports/export'])assert.equal((await call(path,'GET',null,false)).status,401);
 assert.equal((await call('/api/admin/backups','POST',{password:'test-password'},false)).status,401);
 assert.equal((await call('/api/admin/backups','POST',{password:'test-password'},true,'https://evil.example')).status,403);
 assert.equal((await call('/api/admin/reports?sort=bad')).status,400);
 const csv=await call('/api/admin/reports/export');assert.equal(csv.status,200);assert.equal(csv.headers.get('cache-control'),'no-store');assert.match(await csv.text(),/Código/);
 assert.equal((await call('/api/admin/backups','POST',{password:'short'})).status,400);
 const backup=await call('/api/admin/backups','POST',{password:'test-password-123'});assert.equal(backup.status,200);assert.equal(backup.headers.get('cache-control'),'no-store');assert.match(backup.headers.get('content-disposition'),/\.nexo/);assert.equal(Buffer.from(await backup.arrayBuffer()).subarray(0,8).toString(),'NEXOBK01');
});
