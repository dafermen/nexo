/**
 * NEXO · GUÍA DEL MÓDULO: tests/admin-reports.e2e.js
 * Navegador aislado: reportes, orden, páginas, CSV, respaldo, móvil y logout.
 * Datos ficticios; sin SMTP, Google, IA ni LiveAvatar reales.
 */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync} from 'node:fs';
import {createRepository} from '../server/db.js';
import {createApp} from '../server/app.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=createRepository(':memory:');
for(let i=0;i<55;i++){const start=Date.now()+86400000+i*3600000;const row=repo.claimBooking({id:randomUUID(),requestId:randomUUID(),sessionHash:'private',calendarId:'private',marker:'private',slot:new Date(start).toISOString(),end:new Date(start+3600000).toISOString(),customerName:i===54?'<img src=x onerror=alert(1)>':'Persona '+String(i).padStart(3,'0'),email:'test'+i+'@example.test',serviceId:'practice',serviceName:'Clase práctica',priceCents:null,currency:'USD',timezone:'America/New_York',createdAt:new Date().toISOString()});repo.setBookingStatus(row.id,'reserved');}
const conversation=repo.startConversation('voice');for(let i=0;i<31;i++){const id=repo.startConversationTurn(conversation,{message:'Pregunta '+i,channel:'voice'});repo.completeConversationTurn(id,{reason:'intent_clarify',text:'¿Puede aclararlo?',aiCalls:1,inputTokens:20,outputTokens:5});}
const admin='test-report-browser-long-secret',app=createApp({repository:repo,config:{provider:'demo',adminToken:admin},ai:{reply:async()=>{throw Error('Sin IA');}},localTts:{status:()=>({available:false}),close(){},stop(){}}});app.listen(0,'127.0.0.1');await once(app,'listening');
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+app.address().port+'/admin');await page.locator('#token').fill(admin);await page.locator('#login button').click();await page.waitForSelector('#report-body tr');
 assert.equal(await page.locator('#report-body tr').count(),25);assert.match(await page.locator('#report-notice').innerText(),/55 registros/);assert.equal(await page.locator('#report-body img').count(),0);
 await page.locator('#report-next').click();await page.waitForFunction(()=>document.querySelector('#report-notice').textContent.includes('Página 2'));await page.locator('#report-next').click();await page.waitForFunction(()=>document.querySelectorAll('#report-body tr').length===5);assert.equal(await page.locator('#report-next').isDisabled(),true);
 await page.locator('#report-filters [name=q]').fill('test54@example.test');await page.getByRole('button',{name:'Consultar reporte',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#report-body tr').length===1);assert.match(await page.locator('#report-body').innerText(),/<img src=x/);assert.equal(await page.locator('#report-body img').count(),0);
 const csvWait=page.waitForEvent('download');await page.locator('#report-export').click();const csv=await csvWait;assert.match(readFileSync(await csv.path(),'utf8'),/test54@example.test/);
 await page.locator('#report-reset').click();await page.waitForFunction(()=>document.querySelectorAll('#report-body tr').length===25);await page.locator('#report-head').getByRole('button',{name:'Nombre',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#report-filters [name=sort]').value==='customerName'&&!document.querySelector('#report-notice').textContent.includes('Cargando'));assert.match(await page.locator('#report-body tr').first().innerText(),/<img src=x/);await page.locator('#report-head').getByRole('button',{name:'Nombre',exact:false}).click();await page.waitForFunction(()=>document.querySelector('#report-body tr')?.textContent.includes('Persona 053'));
 await page.locator('#report-filters [name=type]').selectOption('questions');await page.waitForFunction(()=>document.querySelector('#report-notice').textContent.includes('31 registros'));await page.locator('#report-filters [name=status]').selectOption('published');await page.getByRole('button',{name:'Consultar reporte',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#report-notice').textContent.includes('No hay registros'));
 await page.locator('#report-filters [name=status]').selectOption('pending');await page.getByRole('button',{name:'Consultar reporte',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#report-body tr').length===25);
 mkdirSync('.local/reports-qa',{recursive:true});await page.locator('#admin-reports').screenshot({path:'.local/reports-qa/dashboard.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.locator('#admin-reports').screenshot({path:'.local/reports-qa/mobile.png'});
 await page.locator('#database-backups summary').click();await page.locator('#backup-password').fill('test-backup-password');await page.locator('#backup-confirm').fill('different-password');await page.locator('#backup-download').click();assert.match(await page.locator('#backup-notice').innerText(),/no coinciden/);
 await page.locator('#backup-confirm').fill('test-backup-password');const backupWait=page.waitForEvent('download');await page.locator('#backup-download').click();const backup=await backupWait;assert.equal(readFileSync(await backup.path()).subarray(0,8).toString(),'NEXOBK01');assert.equal(await page.locator('#backup-password').inputValue(),'');
 await page.locator('#logout').click();assert.equal(await page.locator('#report-body').innerText(),'');assert.equal(await page.locator('#report-cards').innerText(),'');assert.equal(await page.locator('#report-mail').innerText(),'');assert.deepEqual(errors,[]);
 console.log('Reportes E2E: filtros, orden, 3 páginas, revisión, XSS, CSV, respaldo, móvil y logout aprobados.');
}finally{await browser.close();await new Promise(resolve=>app.close(resolve));await app.closeAdminAuth();repo.close();}
