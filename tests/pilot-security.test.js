/**
 * NEXO · GUÍA DEL MÓDULO: tests/pilot-security.test.js
 * Entradas: peticiones simulando el proxy y SQLite temporal. Salida: aserciones.
 * Verifica barreras antes de usar proveedores; no envía correo ni consume IA/video.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';
import {DemoAiProvider} from '../server/providers/ai.js';
import {makePilotHash,PilotAccess} from '../server/pilot-access.js';
import {readConfig} from '../server/config.js';
import {schoolCenter} from '../server/center.js';

const password='test-only-long-pilot-password';
const verifier=await makePilotHash(password);
async function fixture(t,extra={},ai=new DemoAiProvider()){
  const repository=createRepository(':memory:');let starts=0;
  const liveAvatar={status:()=>({mode:'FULL'}),start:async()=>{starts++;return {test:true};},stop:async()=>({}),close:async()=>{}};
  const app=createApp({repository,ai,liveAvatar,config:{deploymentMode:'pilot',pilotPasswordHash:verifier,publicOrigin:'https://pilot.example',provider:'demo',installation:{mode:'email',email:'admin@example.test'},sessionTtlMs:60000,videoDailyLimit:1,...extra}});
  app.listen(0,'127.0.0.1');await once(app,'listening');
  t.after(async()=>{await new Promise(resolve=>app.close(resolve));repository.close();});
  const request=(path,{method='GET',data,cookie,token,headers={}}={})=>new Promise((resolve,reject)=>{
    const req=httpRequest({host:'127.0.0.1',port:app.address().port,path,method,headers:{Host:'pilot.example','X-Nexo-Proto':'https','X-Nexo-Client-IP':'192.0.2.7',Origin:'https://pilot.example',...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers}},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();let body;try{body=JSON.parse(text);}catch{body=text;}resolve({status:res.statusCode,headers:res.headers,body});});
    });req.on('error',reject);req.end(data?JSON.stringify(data):undefined);
  });
  const login=async()=>{const r=await request('/api/pilot/login',{method:'POST',data:{password}});assert.equal(r.status,200);return r.headers['set-cookie'][0].split(';')[0];};
  return {request,login,repository,starts:()=>starts};
}
test('piloto bloquea datos, archivos y consumo sin acceso; permite solamente la entrada',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/')).status,303);
  assert.equal((await f.request('/pilot')).status,200);
  for(const path of ['/api/config','/api/services','/api/docs/catalog','/api/admin/appointments','/api/health'])assert.equal((await f.request(path)).status,401,path);
  for(const path of ['/api/sessions','/api/chat','/api/tts','/api/avatar/session','/api/auth/request'])assert.equal((await f.request(path,{method:'POST',data:{}})).status,401,path);
  assert.equal(f.starts(),0);
});
test('cookie segura, CSRF, host/proxy, administrador separado y cierre revoca acceso',async t=>{
  const f=await fixture(t);
  const logged=await f.request('/api/pilot/login',{method:'POST',data:{password}});
  const raw=logged.headers['set-cookie'][0],cookie=raw.split(';')[0];
  for(const flag of ['__Host-nexo_pilot=','Secure','HttpOnly','SameSite=Lax','Path=/'])assert.ok(raw.includes(flag));
  const home=await f.request('/',{cookie});assert.equal(home.status,200);assert.equal(home.headers['x-frame-options'],'DENY');assert.ok(home.headers['strict-transport-security']);
  assert.equal((await f.request('/api/docs/catalog',{cookie})).status,401); // participante sin permiso administrativo
  for(const headers of [{Origin:'https://evil.example'},{Origin:''},{'X-Nexo-Proto':'http'},{Host:'evil.example'},{'X-Nexo-Client-IP':'invalid'}])assert.equal((await f.request('/api/sessions',{cookie,method:'POST',data:{consent:true},headers})).status,403);
  assert.equal((await f.request('/pilot',{headers:{Origin:'','Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'navigate'}})).status,200);
  for(const path of ['/.env','/data/kiosk.sqlite','/config/installation.json','/%E0%A4%A'])assert.ok([400,404].includes((await f.request(path,{cookie})).status));
  assert.equal((await f.request('/api/pilot/logout',{method:'POST',cookie,data:{}})).status,200);
  assert.equal((await f.request('/api/config',{cookie})).status,401);
});
test('límite global de sesiones y cupo diario de video preceden al proveedor',async t=>{
  const f=await fixture(t,{maxActiveSessions:1});const cookie=await f.login();
  const created=await f.request('/api/sessions',{method:'POST',cookie,data:{consent:true}});assert.equal(created.status,201);
  assert.equal((await f.request('/api/sessions',{method:'POST',cookie,data:{consent:true}})).status,429);
  const options={method:'POST',cookie,token:created.body.token,data:{consent:true,costConsent:true}};
  assert.equal((await f.request('/api/avatar/session',options)).status,201);
  assert.equal((await f.request('/api/avatar/session',options)).status,429);assert.equal(f.starts(),1);
});
test('verificador no guarda contraseña, expira y limita intentos',async t=>{
  const repository=createRepository(':memory:');t.after(()=>repository.close());let now=1000;
  const gate=new PilotAccess({passwordHash:verifier,repository,now:()=>now});
  const cookie=(await gate.login(password,'192.0.2.1')).split(';')[0];const req={headers:{cookie}};
  assert.ok(!verifier.includes(password));assert.equal(gate.authenticated(req),true);now+=8*3600000+1;assert.equal(gate.authenticated(req),false);
  for(let i=0;i<5;i++)await assert.rejects(gate.login('wrong-but-long-password','192.0.2.2'),e=>e.status===401);
  await assert.rejects(gate.login(password,'192.0.2.2'),e=>e.status===429);
});
test('presupuesto externo persiste tras reiniciar SQLite y cero impide consumo',t=>{
  const dir=mkdtempSync(join(tmpdir(),'nexo-budget-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'test.sqlite');
  let repo=createRepository(path);assert.equal(repo.reserveProviderCall('liveavatar','2026-09-26',0),false);assert.equal(repo.reserveProviderCall('liveavatar','2026-09-26',1),true);repo.close();
  repo=createRepository(path);assert.equal(repo.reserveProviderCall('liveavatar','2026-09-26',1),false);assert.equal(repo.reserveProviderCall('liveavatar','2026-09-27',1),true);repo.close();
});
test('configuración del piloto falla cerrada sin dominio, acceso privado o correo',t=>{
  const dir=mkdtempSync(join(tmpdir(),'nexo-config-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'installation.json');
  writeFileSync(path,JSON.stringify({administratorEmail:'admin@example.test',administratorLogin:'email'}));
  const env={DEPLOYMENT_MODE:'pilot',PUBLIC_ORIGIN:'https://pilot.example',CENTER_PROFILE:'general',PILOT_PASSWORD_HASH:verifier,SMTP_PASSWORD:'test-only'};
  const read=e=>readConfig(e,{installationPath:path});assert.equal(read(env).conversationRetentionDays,7);
  for(const [key,value] of [['PUBLIC_ORIGIN',''],['CENTER_PROFILE',''],['PILOT_PASSWORD_HASH','bad'],['SMTP_PASSWORD',''],['ADMIN_TOKEN','not-allowed'],['CONVERSATION_RETENTION_DAYS','0']])assert.throws(()=>read({...env,[key]:value}),key);
});

// Las claves siguientes son ficticias: nunca leer el .env real en estas pruebas.
function configReader(t){
 const dir=mkdtempSync(join(tmpdir(),'nexo-pilot-options-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const path=join(dir,'installation.json');writeFileSync(path,JSON.stringify({administratorEmail:'admin@example.test',administratorLogin:'email'}));
 const base={DEPLOYMENT_MODE:'pilot',PUBLIC_ORIGIN:'https://pilot.example',CENTER_PROFILE:'general',PILOT_PASSWORD_HASH:verifier,SMTP_PASSWORD:'test-only'};
 return overrides=>readConfig({...base,...overrides},{installationPath:path});
}
test('opción privada conserva valores anteriores y rechaza errores de escritura',t=>{
 const read=configReader(t);
 assert.equal(read({}).pilotPrivateEnabled,true);
 assert.equal(read({DEPLOYMENT_MODE:'local'}).pilotPrivateEnabled,false);
 assert.equal(read({PILOT_PRIVATE_ENABLED:'false',PILOT_PASSWORD_HASH:''}).pilotPrivateEnabled,false);
 assert.equal(read({PILOT_PRIVATE_ENABLED:'true'}).pilotPrivateEnabled,true);
 for(const value of ['', 'FALSE','0','yes'])assert.throws(()=>read({PILOT_PRIVATE_ENABLED:value}),/PILOT_PRIVATE_ENABLED/);
 assert.throws(()=>read({PILOT_PRIVATE_ENABLED:'true',PILOT_PASSWORD_HASH:''}),/PILOT_PASSWORD/);
 assert.throws(()=>read({DEPLOYMENT_MODE:'local',PILOT_PRIVATE_ENABLED:'true',PUBLIC_ORIGIN:''}),/HTTPS/);
 for(const [key,value] of [['PUBLIC_ORIGIN',''],['CENTER_PROFILE',''],['SMTP_PASSWORD',''],['ADMIN_TOKEN','not-allowed'],['CONVERSATION_RETENTION_DAYS','0'],['LIVEAVATAR_MODE','FULL']])assert.throws(()=>read({PILOT_PRIVATE_ENABLED:'false',[key]:value}),key);
});
test('clave directa admite espacios y #, prevalece sobre hash, no se expone y rota al reiniciar',async t=>{
 const read=configReader(t),fresh='Prueba ficticia # nueva clave 2026',config=read({PILOT_PASSWORD:fresh});
 assert.equal(Object.hasOwn(config,'pilotPassword'),false);assert.ok(!JSON.stringify(config).includes(fresh));
 const first=await fixture(t,{pilotPrivateEnabled:config.pilotPrivateEnabled,pilotPasswordHash:config.pilotPasswordHash});
 assert.equal((await first.request('/api/pilot/login',{method:'POST',data:{password}})).status,401);
 const login=await first.request('/api/pilot/login',{method:'POST',data:{password:fresh}});assert.equal(login.status,200);
 const cookie=login.headers['set-cookie'][0].split(';')[0],response=await first.request('/api/config',{cookie});
 assert.equal(response.status,200);assert.equal(response.body.pilot,true);assert.ok(!JSON.stringify(response.body).includes(fresh));assert.ok(!JSON.stringify(response.body).includes(config.pilotPasswordHash));
 const next=read({PILOT_PASSWORD:'Otra clave ficticia para prueba'}),second=await fixture(t,{pilotPasswordHash:next.pilotPasswordHash});
 assert.equal((await second.request('/api/config',{cookie})).status,401);
 assert.equal((await second.request('/api/pilot/login',{method:'POST',data:{password:fresh}})).status,401);
 assert.equal((await second.request('/api/pilot/login',{method:'POST',data:{password:'Otra clave ficticia para prueba'}})).status,200);
 assert.equal(read({PILOT_PASSWORD:''}).pilotPasswordHash,verifier);
 for(const value of ['short','x'.repeat(257),'x'.repeat(16)+'\n'])assert.throws(()=>read({PILOT_PASSWORD:value}),/PILOT_PASSWORD/);
});
test('kiosco público conserva TLS, CSRF, documentos, administración y límites',async t=>{
 const f=await fixture(t,{pilotPrivateEnabled:false,pilotPasswordHash:'',maxActiveSessions:1});
 const home=await f.request('/');assert.equal(home.status,200);assert.ok(home.headers['strict-transport-security']);
 const config=await f.request('/api/config');assert.equal(config.status,200);assert.equal(config.body.pilot,false);
 const status=await f.request('/api/pilot/status');assert.deepEqual(status.body,{enabled:false,authenticated:false});
 for(const path of ['/pilot','/pilot.html']){const r=await f.request(path);assert.equal(r.status,303);assert.equal(r.headers.location,'/');}
 assert.equal((await f.request('/api/pilot/login',{method:'POST',data:{password}})).status,404);
 for(const path of ['/api/docs/catalog','/api/admin/agenda','/api/admin/calendar/booking-settings','/api/admin/reports/summary'])assert.equal((await f.request(path)).status,401,path);
 for(const path of ['/.env','/data/kiosk.sqlite','/config/installation.json'])assert.equal((await f.request(path)).status,404,path);
 for(const headers of [{Origin:'https://evil.example'},{Origin:''},{'X-Nexo-Proto':'http'},{Host:'evil.example'}])assert.equal((await f.request('/api/sessions',{method:'POST',data:{consent:true},headers})).status,403);
 const session=await f.request('/api/sessions',{method:'POST',data:{consent:true}});assert.equal(session.status,201);
 assert.equal((await f.request('/api/sessions',{method:'POST',data:{consent:true}})).status,429);
 const options={method:'POST',token:session.body.token,data:{consent:true,costConsent:true}};
 assert.equal((await f.request('/api/avatar/session',options)).status,201);assert.equal((await f.request('/api/avatar/session',options)).status,429);assert.equal(f.starts(),1);
 const logout=await f.request('/api/pilot/logout',{method:'POST',data:{}});assert.equal(logout.status,200);assert.equal(logout.headers['set-cookie'].length,2);
});
test('sin barrera privada el panel no puede superar el presupuesto del servidor',async t=>{
 const calls=[],f=await fixture(t,{pilotPrivateEnabled:false,provider:'openai',model:'test',center:schoolCenter,aiLimits:{sessionCalls:1,dailyCalls:1,outputTokens:100}}, {async reply(input){calls.push(input);return {text:'Orientación de prueba.',usage:{input_tokens:10,output_tokens:5}};}});
 const saved=f.repository.readCenterSettings();
 f.repository.updateCenterSettings(saved.revision,s=>({...s,configuration:{...s.configuration,ai:{...s.configuration.ai,sessionCalls:20,dailyCalls:1000,outputTokens:2000}}}));
 const token=(await f.request('/api/sessions',{method:'POST',data:{consent:true}})).body.token;
 const question={method:'POST',token,data:{message:'Necesito orientación para preparar mi examen de manejo'}};
 assert.equal((await f.request('/api/chat',question)).body.provider,'openai');
 assert.equal((await f.request('/api/chat',question)).body.reason,'session_limit');
 const second=(await f.request('/api/sessions',{method:'POST',data:{consent:true}})).body.token;
 assert.equal((await f.request('/api/chat',{...question,token:second})).body.reason,'daily_limit');
 assert.equal(calls.length,1);assert.equal(calls[0].maxOutputTokens,100);
});
