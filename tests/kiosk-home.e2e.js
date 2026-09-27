/**
 * NEXO · GUÍA DEL MÓDULO: tests/kiosk-home.e2e.js
 * E2E de navegador de kiosk home.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {createApp} from '../server/app.js';
import {schoolCenter,centerRepository} from '../server/center.js';
import {BookingService} from '../server/booking.js';
import {calendarFixture} from './calendar-fixture.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const f=calendarFixture();await f.authorize();await f.service.select(f.calendars[1].id);
const repo=centerRepository(f.repo,schoolCenter);await new BookingService({repository:repo,calendar:f.service}).configure({...repo.bookingSettings(),enabled:true,serviceIds:['cinco-horas']});
const settings=repo.getCenterSettings();settings.configuration.experience.touchKeyboard=true;repo.saveConfiguration(settings.revision,{profile:settings.profile,configuration:settings.configuration});
const app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,sessionTtlMs:300000},ai:{reply:async()=>({text:'Respuesta de prueba.'})},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),stop:async()=>{},close:async()=>{}}});
app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
try{
 const page=await browser.newPage({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));mkdirSync('.local/kiosk-qa',{recursive:true});
 const sizes=[[390,844],[320,568],[768,1024],[820,1180],[1080,1920],[1920,1080],[1366,768],[1024,600],[844,390]];
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});await page.locator('.avatar-photo').evaluate(img=>img.decode());
  assert.equal(await page.locator('#home-panel').evaluate(e=>e.open),false);
  for(const id of ['start','start-video','new-conversation','home-services','home-agenda','home-chat','home-options','fullscreen']){
   const b=await page.locator('#'+id).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${id} fuera de ${width}x${height}: ${JSON.stringify(b)}`);assert.ok(b.height>=44,`${id} tamaño táctil`);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1));
  if([390,820,1920].includes(width))await page.screenshot({path:`.local/kiosk-qa/home-${width}.png`});
  await page.locator('#home-services').click();await page.waitForSelector('.service-card');assert.ok(await page.locator('.service-card').first().isVisible());
  const panel=await page.locator('#home-panel').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=height+1);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#home-panel').evaluate(e=>e.open),false);assert.equal(await page.locator('#home-services').evaluate(e=>document.activeElement===e),true);
 }
 await page.setViewportSize({width:820,height:1180});await page.locator('#home-agenda').click();assert.equal(await page.locator('#booking-title').innerText(),'Mi cita y horarios');assert.equal(await page.locator('#booking-content > button').count(),3);await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.locator('#home-chat').click();await page.getByRole('button',{name:'Teclado para Su consulta',exact:true}).click();await page.locator('#touch-keyboard [data-char="h"]').click();await page.getByRole('button',{name:'Listo ✓',exact:true}).click();assert.equal(await page.locator('#message').inputValue(),'h');
 await page.locator('#message').fill('¿Qué servicios ofrecen?');await page.setViewportSize({width:1024,height:768});assert.equal(await page.locator('#message').inputValue(),'¿Qué servicios ofrecen?');await page.locator('#send').click();await page.locator('#accept-session').click();await page.waitForSelector('.message.assistant');assert.match(await page.locator('.message.assistant').innerText(),/servicios/);
 await page.locator('#home-panel-close').click();await page.locator('#new-conversation').click();assert.equal(await page.locator('.message').count(),0);assert.equal(await page.locator('#home-panel').evaluate(e=>e.open),false);
 await page.locator('#home-options').click();assert.ok(await page.getByRole('button',{name:'Privacidad y uso'}).isVisible());await page.locator('.home-management summary').click();assert.ok(await page.getByRole('link',{name:'Administración',exact:true}).isVisible());await page.locator('#privacy').click();assert.equal(await page.locator('#privacy-dialog').evaluate(e=>e.open),true);await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 assert.equal(f.events.size,0);assert.deepEqual(errors,[]);console.log('Inicio en 9 tamaños, acciones táctiles, servicios, citas, texto, foco, limpieza y menú: aprobado. Sin proveedores de pago.');
}finally{await browser.close();await new Promise(r=>app.close(r));f.repo.close();}


