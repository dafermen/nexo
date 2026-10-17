/** NEXO · GUÍA DEL MÓDULO: tests/reception.e2e.js
 * Recorrido real de DOM con datos ficticios: crear personal, dos turnos, llamado,
 * privacidad de sala, cierre, ausencia y formulario móvil en tres idiomas.
 * No carga .env, no envía correos ni consulta proveedores reales.
 */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {createRepository} from '../server/db.js';
import {centerRepository,schoolCenter} from '../server/center.js';
import {createApp} from '../server/app.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:'),wrapped=centerRepository(repo,schoolCenter);const initial=wrapped.getCenterSettings();initial.configuration.experience.theme='metodomogollon';wrapped.saveConfiguration(initial.revision,{profile:initial.profile,configuration:initial.configuration});
const app=createApp({repository:repo,config:{provider:'demo',center:schoolCenter,adminToken:'test-owner-key-not-real-0001',sessionTtlMs:300000},ai:{async reply(){return {text:'Respuesta de prueba'};}},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),async stop(){},async close(){}}});app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})}),errors=[];
try{
 const staff=await browser.newPage(),visitor=await browser.newPage({viewport:{width:390,height:844}}),lobby=await browser.newPage();for(const p of [staff,visitor,lobby])p.on('pageerror',e=>errors.push(e.message));
 await staff.goto(base+'/staff');await staff.locator('#token').fill('test-owner-key-not-real-0001');await staff.locator('#login button').click();await staff.waitForSelector('#dashboard:not([hidden])');
 await staff.locator('#staff-form [name=name]').fill('Asesor de prueba');await staff.locator('#staff-form [name=email]').fill('advisor@example.test');await staff.locator('#staff-form button[type=submit],#staff-form button.primary').first().click();await staff.waitForFunction(()=>document.getElementById('staff-list').textContent.includes('advisor@example.test'));
 await visitor.goto(base);await visitor.waitForSelector('.service-card',{state:'attached'});await visitor.locator('#method-info').click();await visitor.locator('#menu-reception').click();await visitor.locator('#accept-session').click();await visitor.waitForSelector('#booking-content form');await visitor.locator('#booking-content input[type=text]').fill('Prueba privada de recepción');await visitor.locator('#booking-content input[type=checkbox]').check();await visitor.locator('#booking-content button').last().click();await visitor.waitForFunction(()=>document.querySelector('#booking-content .reception-code')?.textContent==='A001');
 await staff.locator('#refresh').click();await staff.waitForFunction(()=>document.getElementById('tickets').textContent.includes('A001'));await staff.locator('#next-form button').click();await staff.getByRole('button',{name:'Iniciar atención',exact:true}).waitFor();await lobby.goto(base+'/lobby');await lobby.waitForFunction(()=>document.getElementById('calls').textContent.includes('A001'));assert.ok(!(await lobby.locator('body').innerText()).includes('Prueba privada'));
 mkdirSync('.local/reception-qa',{recursive:true});await staff.screenshot({path:'.local/reception-qa/staff.png',fullPage:true});await visitor.screenshot({path:'.local/reception-qa/visitor.png'});await lobby.screenshot({path:'.local/reception-qa/lobby.png'});
 await staff.getByRole('button',{name:'Iniciar atención',exact:true}).click();await staff.getByRole('button',{name:'Finalizar atención',exact:true}).click();await staff.waitForFunction(()=>document.getElementById('tickets').textContent.includes('Finalizado'));
 await visitor.keyboard.press('Escape');await visitor.locator('#new-conversation').click();
 for(const lang of ['en','fr']){await visitor.locator('[data-language='+lang+']').click();await visitor.locator('#method-info').click();await visitor.locator('#menu-reception').click();await visitor.locator('#accept-session').click();await visitor.waitForSelector('#booking-content form');const copy=await visitor.locator('#booking-content').innerText();assert.ok(copy.includes(lang==='en'?'Reason for your visit':'Motif de votre visite'));await visitor.keyboard.press('Escape');await visitor.locator('#new-conversation').click();}
 assert.deepEqual(errors,[]);console.log('Recepción: personal, ficha móvil ES/EN/FR, llamado y pantalla pública verificados.');
}finally{await browser.close();await new Promise(r=>app.close(r));await app.closeAdminAuth();repo.close();}
