/**
 * NEXO · GUÍA DEL MÓDULO: tests/pilot.e2e.js
 * Entrada: certificado/key TLS de QA y Playwright local. Salida: pruebas y capturas.
 * Proxy HTTPS efímero, SQLite en memoria y proveedores dobles. No usa .env ni cuentas.
 * El certificado de prueba se acepta solo en este navegador aislado de QA.
 */
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:https';
import {request} from 'node:http';
import {createRequire} from 'node:module';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
import {makePilotHash} from '../server/pilot-access.js';
import {schoolCenter} from '../server/center.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const password='test-only-pilot-browser-password';let upstream,code;
const proxy=createServer({key:readFileSync(process.env.NEXO_TEST_TLS_KEY),cert:readFileSync(process.env.NEXO_TEST_TLS_CERT)},(req,res)=>{
  const relay=request({host:'127.0.0.1',port:upstream,path:req.url,method:req.method,headers:{...req.headers,'x-nexo-proto':'https','x-nexo-client-ip':'127.0.0.1'}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});relay.on('error',()=>{res.writeHead(502);res.end();});req.pipe(relay);
});
proxy.listen(0,'127.0.0.1');await once(proxy,'listening');const base='https://127.0.0.1:'+proxy.address().port;
const repository=createRepository(':memory:');
const app=createApp({repository,config:{deploymentMode:'pilot',publicOrigin:base,pilotPasswordHash:await makePilotHash(password),center:schoolCenter,provider:'demo',sessionTtlMs:60000,installation:{mode:'email',email:'admin@example.test'}},adminMailer:{ready:true,async sendCode(input){code=input.code;},close(){}},ai:{reply(){throw Error('Proveedor inesperado');}},localTts:{status:()=>({available:false}),close(){},stop(){}},liveAvatar:{status:()=>({mode:'LITE',configured:false}),async close(){},async stop(){}}});
app.listen(0,'127.0.0.1');await once(app,'listening');upstream=app.address().port;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1280,height:900}});
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForURL(base+'/pilot');
  mkdirSync('.local/pilot-qa',{recursive:true});await page.screenshot({path:'.local/pilot-qa/login-desktop.png'});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'.local/pilot-qa/login-mobile.png'});
  await page.locator('#password').fill(password);await page.getByRole('button',{name:'Entrar al piloto'}).click();await page.waitForURL(base+'/');
  await page.waitForSelector('#home-options');assert.equal((await context.request.get(base+'/api/config')).status(),200);
  await page.goto(base+'/docs');await page.getByRole('heading',{name:'Documentación privada'}).waitFor();
  const headers={Origin:base};const challenge=await (await context.request.post(base+'/api/auth/request',{headers,data:{email:'admin@example.test'}})).json();
  const verified=await context.request.post(base+'/api/auth/verify',{headers,data:{challenge:challenge.challenge,code}});assert.equal(verified.status(),200);
  await page.reload();await page.waitForSelector('body[data-ready="true"]');assert.equal((await context.request.get(base+'/api/docs/catalog')).status(),200);
  await page.goto(base+'/pilot');await page.getByRole('button',{name:'Cerrar acceso en este dispositivo'}).click();await page.getByText('Acceso cerrado.',{exact:false}).waitFor();
  assert.equal((await context.request.get(base+'/api/docs/catalog')).status(),401);
  await page.goto(base);await page.waitForURL(base+'/pilot');assert.deepEqual(errors,[]);
  // Otra instancia aislada: abrir el kiosco no debe abrir documentos ni administración.
  const publicRepo=createRepository(':memory:');
  const publicApp=createApp({repository:publicRepo,config:{deploymentMode:'pilot',pilotPrivateEnabled:false,publicOrigin:base,center:schoolCenter,provider:'demo',sessionTtlMs:60000,installation:{mode:'email',email:'admin@example.test'}},adminMailer:{ready:true,async sendCode(input){code=input.code;},close(){}},ai:{reply(){throw Error('Proveedor inesperado');}},localTts:{status:()=>({available:false}),close(){},stop(){}},liveAvatar:{status:()=>({mode:'LITE',configured:false}),async close(){},async stop(){}}});
  publicApp.listen(0,'127.0.0.1');await once(publicApp,'listening');upstream=publicApp.address().port;
  try{
    await context.clearCookies();await page.goto(base+'/pilot');await page.waitForURL(base+'/');await page.waitForSelector('#home-options');
    assert.equal((await (await context.request.get(base+'/api/config')).json()).pilot,false);
    await page.goto(base+'/docs');await page.getByRole('heading',{name:'Documentación privada'}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Entrar al piloto'}).count(),0);
    const challenge2=await (await context.request.post(base+'/api/auth/request',{headers,data:{email:'admin@example.test'}})).json();
    assert.equal((await context.request.post(base+'/api/auth/verify',{headers,data:{challenge:challenge2.challenge,code}})).status(),200);
    await page.reload();await page.waitForSelector('body[data-ready="true"]');assert.equal((await context.request.get(base+'/api/docs/catalog')).status(),200);
    assert.equal((await context.request.post(base+'/api/pilot/logout',{headers,data:{}})).status(),200);
    assert.equal((await context.request.get(base+'/api/docs/catalog')).status(),401);assert.deepEqual(errors,[]);
  }finally{await new Promise(resolve=>publicApp.close(resolve));publicRepo.close();}
  console.log('Piloto HTTPS privado/público: entrada desktop/móvil, cookie, home, documentos privados, administrador y logout aprobados. Sin llamadas pagadas.');
}finally{await browser.close();await new Promise(resolve=>proxy.close(resolve));await new Promise(resolve=>app.close(resolve));repository.close();}
