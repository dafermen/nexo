/**
 * NEXO · GUÍA DEL MÓDULO: scripts/pilot-smoke.js
 * Entrada: URL HTTPS del VPS. Salida: comprobaciones públicas sin contraseña.
 * Verifica barrera, cabeceras, rutas privadas y bloqueo de proveedores; no crea sesiones.
 * No es un pentest ni sustituye la prueba funcional autenticada del despliegue.
 */
import assert from 'node:assert/strict';
const origin=new URL(process.argv[2]);
assert.equal(origin.protocol,'https:');assert.equal(origin.pathname,'/');
const get=(path,options={})=>fetch(new URL(path,origin),{redirect:'manual',signal:AbortSignal.timeout(15000),...options});
const privateAccess=!process.argv.includes('--public');
const home=await get('/');assert.equal(home.status,privateAccess?303:200);if(privateAccess)assert.equal(home.headers.get('location'),'/pilot');
const entry=await get('/pilot');assert.equal(entry.status,privateAccess?200:303);if(!privateAccess)assert.equal(entry.headers.get('location'),'/');
const login=privateAccess?entry:home;
const status=await (await get('/api/pilot/status')).json();assert.equal(status.enabled,privateAccess);
for(const name of ['content-security-policy','strict-transport-security','x-content-type-options','x-frame-options'])assert.ok(login.headers.get(name),'Falta '+name);
assert.equal((await get('/api/config')).status,privateAccess?401:200);
for(const path of ['/api/docs/catalog','/api/admin/appointments'])assert.equal((await get(path)).status,401,path);
// En modo público no crear sesiones ni iniciar proveedores para comprobar la apertura.
for(const path of (privateAccess?['/api/sessions','/api/chat','/api/tts','/api/avatar/session']:['/api/chat','/api/tts','/api/avatar/session']))assert.equal((await get(path,{method:'POST',headers:{Origin:origin.origin,'Content-Type':'application/json'},body:'{}'})).status,401,path);
for(const path of ['/.env','/data/kiosk.sqlite','/config/installation.json'])assert.ok([303,404].includes((await get(path)).status),path);
assert.equal((await get('/api/pilot/login',{method:'POST',headers:{Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'})).status,403);
console.log('Comprobaciones del VPS aprobadas ('+(privateAccess?'acceso privado':'kiosco público')+'); no se consumieron IA ni video.');
