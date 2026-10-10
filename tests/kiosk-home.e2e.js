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
const settings=repo.getCenterSettings();settings.configuration.experience.touchKeyboard=true;Object.assign(settings.configuration.business,{website:'https://www.metodomogollon.com/',practiceUrl:'https://test.metodomogollon.com/home'});repo.saveConfiguration(settings.revision,{profile:settings.profile,configuration:settings.configuration});
f.repo.updateCenterSettings(f.repo.readCenterSettings().revision,current=>({...current,services:[...current.services,{...current.services[0],id:'cuaderno-preguntas',name:'Libro de Preguntas y Respuestas',priceCents:3500,description:'Material de preparación para el examen teórico.'}]}));
const app=createApp({repository:f.repo,calendar:f.service,config:{provider:'demo',center:schoolCenter,sessionTtlMs:300000},ai:{reply:async()=>({text:'Respuesta de prueba.'})},localTts:{status:()=>({available:false}),stop(){},close(){}},liveAvatar:{status:()=>({configured:false}),stop:async()=>{},close:async()=>{}}});
app.listen(0,'127.0.0.1');await once(app,'listening');const base='http://127.0.0.1:'+app.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})}),errors=[];
try{
 const page=await browser.newPage({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));mkdirSync('.local/kiosk-qa',{recursive:true});
 const sizes=[[390,844],[320,568],[768,1024],[820,1180],[1080,1920],[1920,1080],[1366,768],[1024,600],[844,390]];
 for(const theme of ['nexo','metodomogollon']){
 const themed=repo.getCenterSettings();themed.configuration.experience.theme=theme;repo.saveConfiguration(themed.revision,{profile:themed.profile,configuration:themed.configuration});
 // Bloquear configuración reproduce la primera visita con una red lenta. El HTML
 // debe traer el tema y pedir únicamente su retrato antes de recibir esta API.
 const early=await browser.newPage({viewport:{width:820,height:1180}}),portraits=[];
 let releaseConfig;const pendingConfig=new Promise(resolve=>{releaseConfig=resolve;});
 await early.route('**/api/config',async route=>{await pendingConfig;await route.continue();});
 early.on('request',r=>{if(/recepcionista-v1|asesora-mogollon-v1|hector-mogollon-v1/.test(r.url()))portraits.push(new URL(r.url()).pathname);});
 try{
  const response=await early.goto(base,{waitUntil:'domcontentloaded'});
  assert.match(response.headers()['cache-control'],/no-store/);
  await early.locator('.avatar-photo').evaluate(img=>img.decode());
  assert.equal(await early.locator('body').getAttribute('data-theme'),theme);
  assert.equal(await early.locator('.mogollon-brand').isVisible(),theme==='metodomogollon');
  assert.deepEqual(portraits,[theme==='metodomogollon'?'/assets/hector-mogollon-v1.png':'/assets/recepcionista-v1.png']);
  if(theme==='metodomogollon')assert.equal(await early.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(16, 23, 34)');
  for(const path of ['/','/index.html']){const res=await fetch(base+path);const html=await res.text();assert.match(html,new RegExp(`<body data-theme="${theme}"`));assert.match(res.headers.get('cache-control'),/no-store/);}
 }finally{releaseConfig();await early.waitForSelector('.service-card',{state:'attached'});await early.close();}
 for(const [width,height] of sizes){
  await page.setViewportSize({width,height});await page.goto(base);await page.waitForSelector('.service-card',{state:'attached'});await page.locator('.avatar-photo').evaluate(img=>img.decode());
  assert.equal(await page.locator('#home-panel').evaluate(e=>e.open),false);
  assert.equal(await page.locator('body').getAttribute('data-theme'),theme);
  assert.equal(await page.locator('.mogollon-brand').isVisible(),theme==='metodomogollon');
  const servicesButton=theme==='metodomogollon'?'method-courses':'home-services';
  const actions=theme==='metodomogollon'?['method-courses','method-prices','method-agenda','method-prepare','method-info']:['home-services','home-agenda','home-options'];
  for(const id of ['start','start-video','new-conversation','home-chat','fullscreen',...actions]){
   const b=await page.locator('#'+id).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${id} fuera de ${width}x${height}: ${JSON.stringify(b)}`);assert.ok(b.height>=44,`${id} tamaño táctil`);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1));
  if([390,820,1920].includes(width))await page.screenshot({path:`.local/kiosk-qa/home-${theme}-${width}.png`});
  await page.locator('#'+servicesButton).click();await page.waitForSelector('.service-card');assert.ok(await page.locator('.service-card').first().isVisible());
  const panel=await page.locator('#home-panel').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=height+1);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#home-panel').evaluate(e=>e.open),false);assert.equal(await page.locator('#'+servicesButton).evaluate(e=>document.activeElement===e),true);
  assert.match(await page.locator('.avatar-photo').getAttribute('src'),theme==='metodomogollon'?/hector-mogollon-v1/:/recepcionista-v1/);
  if(theme==='metodomogollon'){
   await page.locator('#method-prices').click();assert.equal(await page.locator('#home-panel').getAttribute('data-catalog-mode'),'prices');assert.ok(await page.locator('.service-price').first().isVisible());await page.keyboard.press('Escape');
   for(const lang of ['en','fr','es']){await page.locator(`[data-language="${lang}"]`).click();await page.waitForTimeout(120);assert.equal(await page.locator('#method-prices').innerText(),{en:'Prices and packages',fr:'Tarifs et forfaits',es:'Precios y paquetes'}[lang]);for(const id of actions){const b=await page.locator('#'+id).boundingBox();assert.ok(b.y>=0&&b.y+b.height<=height&&b.height>=44,`${lang} ${id}`);assert.ok(await page.locator('#'+id).evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),`${lang} ${id} sin solapamiento`);}}
  }
 }
 }
 await page.setViewportSize({width:820,height:1180});await page.locator('#method-agenda').click();assert.equal(await page.locator('#booking-title').innerText(),'Mi cita y horarios');assert.equal(await page.locator('#booking-content > button').count(),3);await page.keyboard.press('Escape');
 await page.locator('#method-prepare').click();assert.equal(await page.locator('#booking-title').innerText(),'Libro de Preguntas y Respuestas');assert.equal(await page.locator('#booking-content a').filter({hasText:'Practicar examen teórico'}).getAttribute('href'),'https://test.metodomogollon.com/home');await page.keyboard.press('Escape');assert.equal(await page.locator('#method-prepare').evaluate(e=>document.activeElement===e),true);
 await page.setViewportSize({width:390,height:844});await page.locator('#home-chat').click();await page.getByRole('button',{name:'Teclado para Su consulta',exact:true}).click();await page.locator('#touch-keyboard [data-char="h"]').click();await page.getByRole('button',{name:'Listo ✓',exact:true}).click();assert.equal(await page.locator('#message').inputValue(),'h');
 await page.locator('#message').fill('¿Qué servicios ofrecen?');await page.setViewportSize({width:1024,height:768});assert.equal(await page.locator('#message').inputValue(),'¿Qué servicios ofrecen?');await page.locator('#send').click();await page.locator('#accept-session').click();await page.waitForSelector('.message.assistant');assert.match(await page.locator('.message.assistant').innerText(),/servicios/);
 await page.locator('#home-panel-close').click();await page.locator('#new-conversation').click();assert.equal(await page.locator('.message').count(),0);assert.equal(await page.locator('#home-panel').evaluate(e=>e.open),false);
 await page.locator('#method-info').click();assert.ok(await page.getByRole('button',{name:'Privacidad y uso'}).isVisible());await page.locator('.home-management summary').click();assert.ok(await page.getByRole('link',{name:'Administración',exact:true}).isVisible());await page.locator('#privacy').click();assert.equal(await page.locator('#privacy-dialog').evaluate(e=>e.open),true);await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.locator('#method-info').click();
 for(const [label,url] of [['Sitio web de la escuela','https://www.metodomogollon.com/'],['Practicar examen teórico','https://test.metodomogollon.com/home']]){
  const link=page.getByRole('link',{name:label+' ↗',exact:true});assert.equal(await link.getAttribute('href'),url);assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');assert.ok((await link.boundingBox()).height>=44);
 }
 await page.keyboard.press('Escape');
 const updated=repo.getCenterSettings();updated.configuration.business.practiceUrl='';updated.configuration.business.website='';repo.saveConfiguration(updated.revision,{profile:updated.profile,configuration:updated.configuration});
 await page.reload();await page.waitForSelector('.service-card',{state:'attached'});await page.locator('#method-info').click();assert.equal(await page.locator('#school-resources').isVisible(),false);
 await page.keyboard.press('Escape');
 const disabled=repo.getCenterSettings();disabled.configuration.experience.voiceEnabled=false;disabled.configuration.experience.videoEnabled=false;repo.saveConfiguration(disabled.revision,{profile:disabled.profile,configuration:disabled.configuration});await page.reload();await page.waitForSelector('.service-card',{state:'attached'});assert.equal(await page.locator('#start').isVisible(),false);assert.equal(await page.locator('#start-video').isVisible(),false);assert.ok(await page.locator('#home-chat').isVisible());
 assert.equal(f.events.size,0);assert.deepEqual(errors,[]);console.log('Inicio responsive, acciones táctiles y enlaces externos opcionales: aprobado. Sin proveedores de pago.');
}finally{await browser.close();await new Promise(r=>app.close(r));f.repo.close();}
