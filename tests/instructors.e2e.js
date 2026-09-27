/**
 * NEXO · GUÍA DEL MÓDULO: tests/instructors.e2e.js
 * Navegador contra SQLite y calendarios simulados: selección, capacidad y configuración.
 * Entrada: PLAYWRIGHT_MODULE y BROWSER_CHANNEL opcionales. Salida: aserciones y capturas.
 * Nunca conecta Google, SMTP, IA o LiveAvatar reales. Cierra todos los recursos al terminar.
 */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {createApp} from '../server/app.js';
import {schoolCenter} from '../server/center.js';
import {instructorsFixture} from './instructors-fixture.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const f=await instructorsFixture({now:Date.now}),adminToken='instructors-browser-test',mails=[];
const app=createApp({repository:f.repo,calendar:f.service,bookingMailer:{ready:true,async sendConfirmation(r){mails.push(r);},close(){}},config:{provider:'demo',center:schoolCenter,adminToken,sessionTtlMs:300000},ai:{reply:async()=>{throw Error('No AI expected');}},localTts:{status:()=>({available:false}),stop(){},close(){}}});
app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base);assert.equal(await page.locator('.home-management a[href="/admin"]').count(),1);assert.equal(await page.locator('.home-management a[href="/settings"],.home-management a[href="/docs"]').count(),0);
 const start=async()=>{await page.locator('#home-services').click();await page.locator('.service-card').filter({hasText:'Clase práctica'}).click();await page.getByRole('button',{name:'Reservar y confirmar cita',exact:true}).click();if(await page.locator('#accept-session').isVisible())await page.locator('#accept-session').click();await page.waitForSelector('.slot:not(:disabled)');};
 await start();assert.match(await page.locator('.slot:not(:disabled)').first().innerText(),/5 cupos disponibles/);await page.locator('.slot:not(:disabled)').first().click();
 assert.equal(await page.locator('#booking-instructor option').count(),6);assert.equal(await page.locator('#booking-instructor').inputValue(),'');
 await page.locator('[name=customerName]').fill('Alumno de prueba');await page.locator('[name=email]').fill('alumno@example.test');await page.locator('[name=consent]').check();await page.getByRole('button',{name:'Revisar turno'}).click();assert.equal(await page.getByRole('button',{name:'Confirmar turno'}).count(),0);
 const teachers=(await f.bookings.availability('road-test')).instructors;await page.locator('#booking-instructor').selectOption(teachers[2].id);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));mkdirSync('.local/instructors-screenshots',{recursive:true});await page.locator('#booking-dialog').screenshot({path:'.local/instructors-screenshots/seleccion-movil.png'});
 await page.getByRole('button',{name:'Revisar turno'}).click();assert.match(await page.locator('#booking-content').innerText(),/Profesor: Profesor 3/);await page.getByRole('button',{name:'Confirmar turno'}).click();await page.waitForSelector('.receipt-code');
 const saved=f.repo.calendarBookings()[0];assert.equal(saved.calendarId,f.teachers[2].id);assert.equal(saved.instructorName,'Profesor 3');assert.equal(mails.length,1);
 await page.getByRole('button',{name:'Finalizar atención'}).click();await start();assert.match(await page.locator('.slot:not(:disabled)').first().innerText(),/4 cupos disponibles/);await page.locator('.slot:not(:disabled)').first().click();assert.equal(await page.locator('#booking-instructor option').count(),5);assert.equal(await page.locator('#booking-instructor option').filter({hasText:'Profesor 3'}).count(),0);await page.keyboard.press('Escape');
 // La consulta también conserva la identidad del profesor.
 await page.locator('.service-card').filter({hasText:'Clase práctica'}).click();await page.getByRole('button',{name:'Consultar mi cita',exact:true}).click();await page.locator('[name=email]').fill('alumno@example.test');await page.locator('[name=id]').fill(saved.code);await page.getByRole('button',{name:'Consultar cita',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#booking-content').textContent.includes('Profesor: Profesor 3'));
 await page.setViewportSize({width:1360,height:1000});await page.goto(base+'/settings');await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.locator('[data-section-button=integrations]').click();await page.waitForSelector('.instructor-row');await page.waitForFunction(()=>document.querySelector('.instructor-calendar').options.length>5);
 assert.equal(await page.locator('#booking-assignment').inputValue(),'instructors');assert.equal(await page.locator('.instructor-row').count(),5);
 // La sugerencia se aplica al campo vacío; un nombre editado nunca se pisa al refrescar.
 f.teachers[0].summary='Clases · Héctor Mogollón';await page.locator('#instructor-refresh').click();await page.waitForFunction(()=>document.querySelector('.instructor-calendar').textContent.includes('Clases · Héctor Mogollón'));
 assert.equal(await page.locator('.instructor-name').first().inputValue(),'Profesor 1');await page.locator('.instructor-name').first().fill('');await page.locator('.instructor-calendar').first().selectOption(f.teachers[0].id);assert.equal(await page.locator('.instructor-name').first().inputValue(),'Héctor Mogollón');
 await page.locator('.instructor-name').first().fill('Nombre corregido');await page.locator('.instructor-calendar').first().selectOption(f.teachers[1].id);assert.equal(await page.locator('.instructor-name').first().inputValue(),'Nombre corregido');await page.locator('.instructor-calendar').first().selectOption(f.teachers[0].id);await page.locator('.instructor-use-name').first().click();assert.equal(await page.locator('.instructor-name').first().inputValue(),'Héctor Mogollón');
 await page.locator('.instructor-name').first().fill('Ana Pérez');await page.locator('#booking-save').click();await page.waitForFunction(()=>document.querySelector('#booking-settings > [role=status]').textContent.includes('Reglas guardadas'));assert.equal(f.repo.bookingSettings().instructors[0].name,'Ana Pérez');
 await page.locator('.instructor-calendar').nth(1).selectOption(f.teachers[0].id);await page.locator('#booking-save').click();await page.waitForFunction(()=>document.querySelector('#booking-settings > [role=status]').textContent.includes('mismo calendario'));assert.equal(f.repo.bookingSettings().instructors[1].calendarId,f.teachers[1].id);
 await page.locator('.instructor-calendar').nth(1).selectOption(f.teachers[1].id);await page.locator('.instructor-active').nth(4).uncheck();await page.locator('#booking-save').click();await page.waitForFunction(()=>document.querySelector('#booking-settings > [role=status]').textContent.includes('Reglas guardadas'));assert.equal((await f.bookings.availability('road-test')).instructors.length,4);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#booking-instructors').screenshot({path:'.local/instructors-screenshots/configuracion-movil.png'});
 await page.locator('#booking-assignment').selectOption('single');await page.locator('#booking-save').click();await page.waitForFunction(()=>document.querySelector('#booking-settings > [role=status]').textContent.includes('Reglas guardadas'));assert.equal(await page.locator('#booking-instructors').isVisible(),false);assert.equal(f.repo.bookingSettings().assignment,'single');assert.equal((await f.bookings.verify(saved.id)).status,'reserved');assert.equal(f.events.size,1);assert.deepEqual(errors,[]);
 // La selección también se traduce, pero los nombres propios no se alteran.
 await f.bookings.configure({...f.repo.bookingSettings(),assignment:'instructors'});
 // Filtro de agenda y disponibilidad usan el mismo profesor; quitarlo conserva su historial.
 await page.goto(base+'/admin');await page.locator('#token').fill(adminToken);await page.locator('#login button').click();await page.waitForSelector('#appointments tr');
 const instructorFilter=page.locator('#agenda-filters [name=instructorId]');await instructorFilter.selectOption(teachers[0].id);await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#agenda-notice').textContent.includes('No hay citas'));
 await instructorFilter.selectOption(teachers[2].id);await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click();await page.waitForSelector('#appointments tr');assert.match(await page.locator('#appointments').innerText(),/Profesor 3/);
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(saved.slot));await page.locator('#agenda-filters [name=from]').fill(day);await page.locator('#agenda-filters [name=view]').selectOption('week');await page.waitForSelector('.agenda-card');assert.equal(await page.locator('.agenda-card').count(),1);
 await page.locator('#agenda-filters [name=serviceId]').selectOption('road-test');await page.locator('#agenda-check-availability').click();await page.waitForSelector('#agenda-availability .slot-busy');assert.match(await page.locator('#agenda-availability').innerText(),/Profesor 3/);assert.doesNotMatch(await page.locator('#agenda-availability').innerText(),/[2-5] cupos disponibles/);
 await f.bookings.configure({...f.repo.bookingSettings(),instructors:f.repo.bookingSettings().instructors.filter(i=>i.id!==teachers[2].id)});await page.getByRole('button',{name:'Aplicar filtros',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#agenda-filters [name=instructorId]').selectedOptions[0].textContent.includes('Historial'));assert.equal(await page.locator('.agenda-card').count(),1);
 await page.locator('#agenda-check-availability').click();await page.waitForFunction(()=>document.querySelector('#agenda-availability').textContent.includes('configuración actual'));
 await page.locator('#admin-agenda').screenshot({path:'.local/instructors-screenshots/filtro-profesor.png'});await page.locator('#logout').click();assert.equal(await instructorFilter.locator('option').count(),2);
 for(const [language,label] of [['en','Choose your instructor'],['fr','Choisissez votre moniteur']]){
  await page.goto(base);await page.locator('[data-language="'+language+'"]').click();await page.locator('#home-agenda').click();await page.locator('#booking-content > button').first().click();await page.locator('#accept-session').click();await page.waitForSelector('.slot:not(:disabled)');await page.locator('.slot:not(:disabled)').first().click();
  await page.getByLabel(label,{exact:true}).waitFor();assert.equal(await page.locator('#booking-instructor option').filter({hasText:'Ana Pérez'}).count(),1);assert.ok(await page.locator('#booking-instructor').evaluate(el=>el.getBoundingClientRect().height>=44));
 }
 assert.deepEqual(errors,[]);console.log('OK: cupos, selección obligatoria, calendario elegido, consulta, configuración, duplicados, pausa, móvil e idiomas; cero servicios de pago.');
}finally{await browser.close();await new Promise(resolve=>app.close(resolve));await app.closeAdminAuth();f.close();}
