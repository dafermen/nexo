/** NEXO · GUÍA DEL MÓDULO: tests/agenda-voice.e2e.js
 * Entrada: voz simulada, calendarios de profesores en memoria y reloj actual.
 * Salida: disponibilidad -> hora exacta -> datos -> confirmación en calendario falso.
 * No utiliza cuentas Google, SMTP, OpenAI ni LiveAvatar reales.
 */
import assert from 'node:assert/strict';import {once} from 'node:events';import {createRequire} from 'node:module';
import {createApp} from '../server/app.js';import {schoolCenter} from '../server/center.js';import {pcmToWav} from '../server/providers/local-tts.js';import {instructorsFixture} from './instructors-fixture.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const f=await instructorsFixture({now:Date.now}),mails=[];
await f.bookings.configure({...f.repo.bookingSettings(),instructors:f.repo.bookingSettings().instructors.map((i,index)=>({...i,name:['Héctor','Darío','Ana','Lucía','Pedro'][index]}))});
const app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,sessionTtlMs:300000},ai:{reply(){throw Error('IA inesperada');}},bookingMailer:{ready:true,async sendConfirmation(b){mails.push(b);},close(){}},localTts:{status:()=>({available:true}),stop(){},close(){},synthesize:async()=>({audioBase64:pcmToWav(Buffer.alloc(4410)).toString('base64')})},liveAvatar:{status:()=>({configured:false,mode:'LITE'}),start(){throw Error('Video inesperado');},async stop(){},async close(){}}});
app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{class R{start(){window.rec=this;this.active=true;this.onstart?.();}abort(){this.active=false;this.onend?.();}}window.SpeechRecognition=R;window.say=text=>{const r=window.rec;if(!r?.active)throw Error('Micrófono inactivo');const row=[{transcript:text}];row.isFinal=true;r.onresult({results:[row]});r.onend?.();};});
 const availability=await f.bookings.availability('road-test'),slot=availability.slots.find(s=>new Intl.DateTimeFormat('en',{hour:'numeric',hourCycle:'h23',timeZone:'America/New_York'}).format(new Date(s))==='09')||availability.slots[0];assert.ok(slot);
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'America/New_York'}).formatToParts(new Date(slot)).map(p=>[p.type,p.value]));const day=parts.year+'-'+parts.month+'-'+parts.day,hour=parts.hour+':'+parts.minute;
 await page.goto(base);await page.locator('#start').click();await page.locator('#accept-session').click();
 const listen=()=>page.waitForFunction(()=>window.rec?.active);await listen();
 await page.evaluate(day=>window.say('¿Hay disponibilidad el '+day+'?'),day);await page.waitForSelector('.agenda-options button');assert.equal(await page.locator('.agenda-options button').count(),3);assert.equal(f.events.size,0);await listen();
 await page.evaluate(({day,hour})=>window.say('Quiero clase práctica con Héctor el '+day+' a las '+hour),{day,hour});
 await page.waitForSelector('#booking-content input[name=customerName]');assert.equal(await page.evaluate(()=>window.rec.active),false);assert.equal(f.events.size,0);assert.match(await page.locator('#booking-content').innerText(),/Sus datos/);
 assert.equal(await page.locator('#booking-instructor').inputValue(),f.repo.bookingSettings().instructors[0].id);
 await page.locator('#booking-dialog .close-button').click();await listen();
 // Entre la respuesta y el formulario Darío puede ocuparse, aunque otro profesor siga libre.
 await page.route('**/api/services/road-test/slots',async route=>{const response=await route.fetch(),data=await response.json(),id=f.repo.bookingSettings().instructors[1].id;data.schedule=data.schedule.map(s=>({...s,instructorIds:s.instructorIds.filter(v=>v!==id)}));await route.fulfill({response,json:data});},{times:1});
 await page.evaluate(()=>window.say('mejor con Darío'));await page.waitForSelector('#booking-content .notice');
 assert.equal(await page.locator('#booking-content input[name=customerName]').count(),0);assert.equal(f.events.size,0);
 await page.locator('#booking-dialog .close-button').click();await listen();
 await page.evaluate(()=>window.say('mejor con Darío'));await page.waitForSelector('#booking-content input[name=customerName]');
 assert.equal(await page.locator('#booking-instructor').inputValue(),f.repo.bookingSettings().instructors[1].id);assert.equal(f.events.size,0);
 await page.locator('[name=customerName]').fill('Prueba agenda voz');await page.locator('[name=email]').fill('prueba@example.test');await page.locator('[name=consent]').check();await page.getByRole('button',{name:'Revisar turno'}).click();
 assert.equal(f.events.size,0);await page.getByRole('button',{name:'Confirmar',exact:false}).last().click();await page.waitForSelector('.receipt-code');assert.equal(f.events.size,1);assert.equal(mails.length,1);
 const event=[...f.events.values()][0];assert.equal(Date.parse(event.start.dateTime),Date.parse(slot));assert.equal([...f.events.keys()][0].startsWith(f.teachers[1].id+'/'),true);assert.deepEqual(errors,[]);
 console.log('Voz móvil: día -> disponibilidad -> hora exacta -> profesor/datos -> revisión -> cita y correo simulados, sin reservas anticipadas ni consumo real.');
}finally{await browser.close();await new Promise(r=>app.close(r));f.close();}
