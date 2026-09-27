/**
 * NEXO · GUÍA DEL MÓDULO: tests/admin-agenda.e2e.js
 * Navegador aislado: filtros, vistas, detalle, motivos, errores, móvil y limpieza al salir.
 * Calendar simulado y SQLite en memoria. No envía correos ni cancela citas de usuarios.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {calendarFixture} from './calendar-fixture.js';
import {centerRepository,schoolCenter} from '../server/center.js';
import {BookingService} from '../server/booking.js';
import {createApp} from '../server/app.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const f=calendarFixture();await f.authorize();await f.service.select(f.calendars[1].id);
const original=f.service.fetch;f.service.fetch=async(url,opts)=>opts.method==='GET'&&new URL(url).pathname.endsWith('/events')?new Response(JSON.stringify({items:[...f.events.values()]})):original(url,opts);
const repo=centerRepository(f.repo,schoolCenter);repo.saveService(repo.getCenterSettings().revision,'road-test',{name:'Clase práctica',description:'Prueba de agenda',duration:60,priceCents:null,requirements:null,modality:'Presencial',active:true});
const bookings=new BookingService({repository:repo,calendar:f.service});await bookings.configure({...repo.bookingSettings(),enabled:true,serviceIds:['road-test']});
const schedule=await bookings.availability('road-test'),stored=[];
for(let i=0;i<3;i++)stored.push(await bookings.reserve({requestId:randomUUID(),sessionHash:'test',serviceId:'road-test',slot:schedule.slots[i],customerName:['Ana Prueba','Bruno Prueba','<img src=x onerror=alert(1)>'][i],email:'prueba'+i+'@example.test',priceCents:null}));
const admin='test-agenda-browser-secret';const app=createApp({repository:f.repo,calendar:f.service,config:{center:schoolCenter,provider:'demo',adminToken:admin},ai:{reply:async()=>{throw Error('No AI expected');}},localTts:{status:()=>({available:false}),close(){},stop(){}}});
app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'/admin');await page.locator('#token').fill(admin);await page.locator('#login button').click();await page.waitForSelector('#appointments tr');
 assert.equal(await page.locator('#appointments tr').count(),3);assert.equal(await page.locator('#appointments img').count(),0);
 await page.locator('#agenda-filters [name=q]').fill(stored[0].code.toLowerCase());await page.getByRole('button',{name:'Aplicar filtros'}).click();await page.waitForFunction(()=>document.querySelectorAll('#appointments tr').length===1);assert.match(await page.locator('#appointments').innerText(),/Ana Prueba/);
 await page.getByRole('button',{name:'Ver detalle',exact:true}).click();await page.waitForSelector('#cancel-appointment-form');assert.match(await page.locator('#appointment-detail').innerText(),/prueba0@example.test/);await page.locator('#close-appointment').click();
 await page.locator('#agenda-reset').click();await page.waitForFunction(()=>document.querySelectorAll('#appointments tr').length===3);
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(stored[0].slot));
 await page.locator('#agenda-filters [name=from]').fill(day);await page.locator('#agenda-filters [name=view]').selectOption('week');await page.waitForSelector('.agenda-card');assert.equal(await page.locator('.agenda-day').count(),7);
 await page.locator('#agenda-filters [name=serviceId]').selectOption('road-test');await page.getByRole('button',{name:'Aplicar filtros'}).click();await page.waitForSelector('.agenda-card');await page.locator('#agenda-check-availability').click();await page.waitForSelector('.slot-busy');assert.ok(await page.locator('.slot-free').count()>0);
 mkdirSync('.local/agenda-qa',{recursive:true});await page.locator('#admin-agenda').screenshot({path:'.local/agenda-qa/week.png'});
 await page.locator('#agenda-filters [name=view]').selectOption('day');await page.waitForSelector('.agenda-card');assert.equal(await page.locator('.agenda-day').count(),1);
 await page.locator('.agenda-card').filter({hasText:'Ana Prueba'}).click();await page.waitForSelector('#cancel-appointment-form');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.locator('#appointment-dialog').screenshot({path:'.local/agenda-qa/detail-mobile.png'});
 await page.locator('#cancel-appointment-form [name=reason]').selectOption('Falta de pago');await page.getByRole('button',{name:'Confirmar cancelación',exact:true}).click();await page.waitForSelector('#appointment-dialog:not([open])',{state:'attached'});await page.waitForFunction(()=>document.querySelector('#agenda-cards').textContent.includes('Cancelado'));
 assert.equal(f.repo.agendaDetail(stored[0].id).cancellations[0].reason,'Falta de pago');assert.equal(f.events.size,2);
 // Un fallo remoto no debe presentarse como una cancelación exitosa.
 f.flags.deleteFails=true;await page.locator('.agenda-card').filter({hasText:'Bruno Prueba'}).click();await page.locator('#cancel-appointment-form [name=reason]').selectOption('Error al crear la reserva');await page.getByRole('button',{name:'Confirmar cancelación',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#appointment-detail').textContent.includes('Compruebe el estado'));
 assert.equal(f.repo.agendaDetail(stored[1].id).status,'reserved');assert.equal(f.events.size,2);await page.locator('#close-appointment').click();
 await page.locator('#agenda-reset').click();await page.waitForSelector('#appointments tr');
 await page.locator('#logout').click();assert.equal(await page.locator('#appointments').innerText(),'');assert.equal(await page.locator('#agenda-cards').innerText(),'');assert.equal(await page.locator('#appointment-detail').innerText(),'');assert.equal(await page.locator('#agenda-availability').innerText(),'');assert.deepEqual(errors,[]);
 console.log('Agenda E2E: lista/día/semana, filtros, disponibilidad, detalle móvil, motivo, fallo Google, XSS y logout aprobados. Sin citas ni correo reales.');
}finally{await browser.close();await new Promise(resolve=>app.close(resolve));f.repo.close();}
