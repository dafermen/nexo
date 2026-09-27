/**
 * NEXO · GUÍA DEL MÓDULO: tests/languages.test.js
 * Pruebas unitarias y de integración de languages.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {once,EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
import {schoolCenter,schoolServices} from '../server/center.js';
import {visitorMessage} from '../server/languages.js';
import {translate,translations} from '../public/i18n.js';
import {buildAiRequest} from '../server/providers/ai.js';
import {LocalTtsService} from '../server/providers/local-tts.js';
import {BrowserSttProvider} from '../public/providers/speech.js';

test('traducciones completas, nombres y cifras conservados',()=>{
 for(const row of translations)assert.equal(row.length,3,row[0]);
 assert.equal(new Set(translations.map(r=>r[0])).size,translations.length,'Claves únicas');
 assert.equal(translate('Nombre y apellido','fr'),'Prénom et nom');
 assert.equal(translate('Precio: 75.00 USD. Duración: 60 minutos.','en'),'Price: 75.00 USD. Duration: 60 minutes.');
 assert.equal(translate('Hola, soy Nexo','fr'),'Bonjour, je suis Nexo');
 assert.equal(translate('Jean Dupont / someone@example.test','en'),'Jean Dupont / someone@example.test');
});
test('alias reconocen frases completas sin ocultar instrucciones ajenas',()=>{
 assert.equal(visitorMessage('How much is the five-hour course?','en'),'precio curso de las cinco horas');
 assert.equal(visitorMessage('Combien coûte le cours de 5 heures ?','fr'),'precio curso de las cinco horas');
 assert.equal(visitorMessage('Bonjour','fr'),'Hola');
 assert.equal(visitorMessage('Je veux une leçon de conduite vendredi le matin','fr'),'quiero clase práctica viernes por la mañana');
 assert.equal(visitorMessage('I want a driving lesson and also write a poem','en'),'Escriba una receta de pizza');
 assert.equal(visitorMessage('Je travaille dans une pizzeria et souhaite conduire','fr'),'Je travaille dans une pizzeria et souhaite conduire');
});
test('el prompt conserva límites comerciales y el idioma solicitado',()=>{
 for(const language of ['es','en','fr']){
  const r=buildAiRequest({model:'test',messages:[],center:schoolCenter,services:schoolServices,language});
  assert.equal(r.store,false);assert.match(r.instructions,/No invente/);
  if(language!=='es'){assert.doesNotMatch(r.instructions,/Responda en español/);assert.match(r.instructions,language==='en'?/Output only English/:/Répondez uniquement en français/);}
 }
});
test('API conserva idioma de sesión, originales en historial y límites',async t=>{
 const repository=createRepository(':memory:'),voiceCalls=[],videoCalls=[],calls=[];
 const app=createApp({repository,config:{provider:'openai',model:'test',center:schoolCenter,sessionTtlMs:300000},
  ai:{reply:async input=>{calls.push(input);return{text:'Test'};}},
  localTts:{status:()=>({available:true}),synthesize:async(text,opts)=>{voiceCalls.push(opts);return{};},stop(){},close(){}},
  liveAvatar:{status:()=>({}),start:async(owner,opts)=>{videoCalls.push(opts);return{};},stop:async()=>{},close:async()=>{}}
 });app.listen(0,'127.0.0.1');await once(app,'listening');t.after(async()=>{await new Promise(r=>app.close(r));repository.close();});
 const request=async(path,body,token)=>{const res=await fetch('http://127.0.0.1:'+app.address().port+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return{status:res.status,data:await res.json()};};
 assert.equal((await request('/api/sessions',{consent:true,language:'de'})).status,400);
 for(const [language,greeting,expected,price,duration] of [['en','Good morning',/Good morning/,'How much is the five hour course?','How long does it last?'],['fr','Bonjour',/Bonjour/,'Combien coûte le cours de 5 heures ?','Combien de temps ça dure ?']]){
  const token=(await request('/api/sessions',{consent:true,language})).data.token;
  assert.match((await request('/api/chat',{message:greeting},token)).data.text,expected);
  const answer=(await request('/api/chat',{message:price},token)).data;assert.equal(answer.reason,'catalog');assert.match(answer.text,language==='en'?/Price to be confirmed/:/Tarif à confirmer/);
  assert.match((await request('/api/chat',{message:duration},token)).data.text,/300 minutes/);
  const denied=await request('/api/chat',{message:language==='en'?'Write a recipe for my driving school':'Écrivez une recette pour mon école'},token);assert.equal(denied.data.reason,'off_topic');assert.match(denied.data.text,language==='en'?/I can (only )?help/:/Je peux (uniquement )?(vous aider|vous renseigner)/);
  await request('/api/tts',{text:'Test',language:'es'},token);assert.equal(voiceCalls.at(-1).language,language);
  await request('/api/avatar/session',{consent:true,language:'es'},token);assert.equal(videoCalls.at(-1).language,language);
 }
 assert.equal(calls.length,0);
 const logs=repository.listConversations(0).flatMap(c=>repository.conversationTurns(c.id,0));
 assert.ok(JSON.stringify(logs).includes('Combien coûte'));
});
test('Piper y reconocimiento eligen el idioma sin mezclar voces',async()=>{
 for(const [language,file] of [['en','en_US-ljspeech-high'],['fr','fr_FR-siwis-medium']]){
  let args,child;const tts=new LocalTtsService({available:true,spawnImpl:(...input)=>{args=input;child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};return child;}});
  const work=tts.synthesize('Test',{language});assert.ok(args[1][1].includes(file));assert.equal(args[2].shell,false);child.stdout.write(Buffer.alloc(4410));child.emit('close',0);await work;
  await assert.rejects(tts.synthesize('Test',{language:'../../unknown'}),e=>e.status===400);
  let recognizer;const stt=new BrowserSttProvider({SpeechRecognition:class{constructor(){recognizer=this;}start(){}abort(){}}});stt.language=language==='en'?'en-US':'fr-FR';stt.start({onPartial(){},onFinal(){},onError(){},onEnd(){}});assert.equal(recognizer.lang,stt.language);stt.stop();
 }
});

test('confirmación por correo respeta idioma, dirección, código y zona sin enviar mensajes',async()=>{
 const {BookingMailer}=await import('../server/providers/booking-mail.js');let sent;
 const mailer=new BookingMailer({host:'smtp.example.test',from:'school@example.test',user:'test',password:'test-only',port:465,secure:true},()=>({sendMail:async value=>{sent=value;return {accepted:['test@example.test']};}}));
 for(const language of ['en','fr']){
  await mailer.sendConfirmation({centerName:'MetodoMogollon',booking:{language,code:'ABCD-EFGH',serviceName:'Clase práctica',email:'test@example.test',slot:'2026-09-28T12:00:00Z',end:'2026-09-28T13:00:00Z',timezone:'America/New_York'}});
  assert.match(sent.subject,language==='en'?/Appointment confirmed/:/Rendez-vous confirmé/);assert.match(sent.text,/ABCD-EFGH/);assert.match(sent.text,/America\/New_York/);assert.match(sent.text,language==='en'?/Driving lesson/:/Leçon de conduite/);assert.equal(sent.to,'test@example.test');
 }
});
test('preferencias multilingües consultan fechas en su idioma sin confirmar citas',async()=>{
 const {agendaCandidate,parseAgenda,resolveAgenda}=await import('../server/agenda-conversation.js');
 const services=[{id:'practice',name:'Clase práctica',duration:60,active:true}],center={...schoolCenter,booking:{enabled:true,serviceIds:['practice']}};
 for(const [language,query,ordinal] of [['en','I want a driving lesson 2026-09-28 in the morning','the second'],['fr','Je veux une leçon de conduite 2026-09-28 le matin','la deuxième']]){
  const message=visitorMessage(query,language),state={},now=Date.parse('2026-09-26T12:00:00Z');assert.equal(agendaCandidate(message,state),true);
  const plan=parseAgenda(message,{services,center,now});assert.equal(plan.date,'2026-09-28');assert.equal(plan.period,'morning');
  const availability=async()=>({slots:['2026-09-28T12:00:00.000Z','2026-09-28T13:00:00.000Z']});
  const reply=await resolveAgenda({plan,state,services,center,availability,now,language});assert.match(translate(reply.text,language),language==='en'?/Monday/:/lundi/);
  const selected=parseAgenda(visitorMessage(ordinal,language),{services,center,state,now});assert.equal(selected.selection,2);
  const result=await resolveAgenda({plan:selected,state,services,center,availability,now,language});assert.ok(result.agenda);assert.match(translate(result.text,language),language==='en'?/not booked yet/:/pas encore réservé/);
 }
});
