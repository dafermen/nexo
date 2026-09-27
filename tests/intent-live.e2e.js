/**
 * NEXO · GUÍA DEL MÓDULO: tests/intent-live.e2e.js
 * E2E de navegador de intent live.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Esta prueba es optativa y puede llamar una API real: leer sus condiciones
 * antes de ejecutarla. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {writeFileSync} from 'node:fs';
if(process.env.NEXO_RUN_LIVE_INTENT_TEST!=='1')throw new Error('Prueba opcional de pago: active NEXO_RUN_LIVE_INTENT_TEST=1.');
loadEnvFile(new URL('../.env',import.meta.url));
const base='http://localhost:3000';
async function request(path,method='GET',body,token){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});assert.ok(r.ok,`HTTP ${r.status}`);return r.json();}
const before=await request('/api/admin/overview','GET',undefined,process.env.ADMIN_TOKEN);
assert.ok(before.aiProtection.limits.dailyCalls-before.aiProtection.usage.calls>=4,'No hay cupo de prueba suficiente.');
const results=[];
const focused=true;
const holdout=false;
const groups=holdout?[[
 ['¿Cuánta plata tengo que llevar pa hacer el de cinco horas?',/intent_catalog/,/Precio|USD|costo/i],
 ['Yo no sé mover un carro, ¿ustedes me enseñan?',/intent_catalog/,/clases/i],
 ]]:focused?[[
 ['Necesito el papelito ese',/intent_clarify/,/documento|¿Se refiere/],
 ['Sí, el de sinco oras',/intent_catalog/,/¿Desea conocer/],
 ['Nesesito lo del cursito de sinco oras',/intent_catalog/,/¿Desea conocer/],
 ['¿Y cuánto cuesta un seguro de automóvil?',/intent_unknown/,/personal|confirmada/],
 ['Escríbame una receta de pizza',/off_topic/,/escuela|servicios/],
 ]]:[[
 ['Buenos días',/greeting/,/Buenos días/],
 ['A cómo sale lo de las cinco horas',/^intent_/,/precio|pendiente|USD/i],
 ['¿Y cuánto dura?',/catalog/,/300 minutos/],
 ['Quiero aprender a guiar',/^intent_/,/clases/i],
 ['Trabajo repartiendo pizza y necesito clases',/^intent_/,/clases/i],
 ['Necesito el papelito ese',/intent_clarify/,/¿Se refiere|documento/i],
 ['Sí, el de sinco oras',/^intent_/,/5 horas/i],
 ['Escríbame una receta de pizza',/off_topic/,/escuela|servicios/i],
 ],[
 ['Nesesito lo del cursito de sinco oras',/^intent_/,/5 horas/i],
 ['Soy programador Python y quiero tomar clases de manejo',/^intent_/,/clases/i],
 ['¿Y cuánto cuesta un seguro de automóvil?',/intent_clarify|intent_unknown/,/servicio|personal|escuela/i],
 ]];
try{
 for(const group of groups){
  const {token}=await request('/api/sessions','POST',{consent:true});
  try{for(const [message,reason,pattern] of group){
   const answer=await request('/api/chat','POST',{message},token);results.push({message,...answer});console.log(JSON.stringify(results.at(-1)));
   assert.match(answer.reason,reason,message);assert.match(answer.text,pattern,message);assert.equal(answer.catalogOnly,false);
  }}finally{await request('/api/session','DELETE',undefined,token);}
 }
}finally{
 const after=await request('/api/admin/overview','GET',undefined,process.env.ADMIN_TOKEN);
 const usage={calls:after.aiProtection.usage.calls-before.aiProtection.usage.calls,inputTokens:after.aiProtection.usage.inputTokens-before.aiProtection.usage.inputTokens,outputTokens:after.aiProtection.usage.outputTokens-before.aiProtection.usage.outputTokens};
 writeFileSync(new URL('../.local/intent-live-results.json',import.meta.url),JSON.stringify({results,usage},null,2));console.log(JSON.stringify({usage,liveAvatarSessions:0}));
}
