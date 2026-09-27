/**
 * NEXO · GUÍA DEL MÓDULO: public/conversations.js
 * Consultar historial y métricas privadas de conversaciones.
 * Entrada: Filtros/paginación, sesión administrativa y respuestas API.
 * Salida: Detalle de turnos, contadores y descarga del registro de texto.
 * Estado importante: IDs relacionan sesión/turnos; generaciones descartan peticiones al cerrar
 * sesión.
 * Efectos y límites: Lectura autenticada; logout elimina detalles de pantalla. El texto generado
 * no prueba que el visitante haya oído el audio.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {installAdminAccess} from './admin-access.js';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let token='',generation=0,lastActivity=Date.now(),offset=0,selected=null,turnOffset=0,selectionVersion=0;
const names={text:'Texto',voice:'Voz',video:'Video',active:'Abierta',closed:'Cerrada',interrupted:'Interrumpida',completed:'Respuesta generada',pending:'En curso',error:'Error',cancelled:'Cancelada',local:'Local',demo:'Demostración',openai:'OpenAI'};
const label=v=>names[v]||v||'—',date=v=>new Date(v).toLocaleString('es');
function error(text=''){$('error').textContent=text;$('error').hidden=!text;}
async function request(path,{raw=false}={}){const r=await fetch('/api/admin/conversations'+path,{headers:{Authorization:'Bearer '+token},credentials:'same-origin',signal:AbortSignal.timeout(20000)});if(!r.ok){if(r.status===401)logout(false);const v=await r.json();throw Error(v.error||'No se pudo leer el historial.');}return raw?r:r.json();}
function clearDetail(){selectionVersion++;selected=null;turnOffset=0;$('turns').replaceChildren();$('detail-title').textContent='Seleccione una conversación';$('detail-info').textContent='';$('download').hidden=$('more-turns').hidden=true;}
function logout(remote=false){generation++;token='';offset=0;clearDetail();$('metrics').replaceChildren();$('conversations').replaceChildren();$('retention').textContent='';$('token').value='';$('dashboard').hidden=$('logout').hidden=true;if(remote)access.logout();else access.reset();}
async function detail(id,append=false){
 const epoch=generation,seq=++selectionVersion;error();
 if(!append){selected=id;turnOffset=0;$('turns').replaceChildren();}
 $('more-turns').disabled=true;
 try{const value=await request('/'+id+'?offset='+turnOffset);if(epoch!==generation||seq!==selectionVersion)return;
 $('detail-title').textContent='Atención del '+date(value.conversation.startedAt);$('detail-info').textContent=label(value.conversation.status)+' · ID '+id;$('download').hidden=false;
 for(const t of value.turns){const row=el('article');row.className='turn';row.append(el('small',date(t.startedAt)+' · '+label(t.channel)+' · '+label(t.outcome)));if(t.userText)row.append(el('h3','Visitante'),el('p',t.userText));if(t.assistantText)row.append(el('h3','Nexo'),el('p',t.assistantText));row.append(el('small','Origen: '+label(t.provider)+' · '+t.durationMs+' ms · IA: '+t.aiCalls+' consultas · Tokens: '+t.inputTokens+' / '+t.outputTokens));$('turns').append(row);}
 turnOffset+=value.turns.length;$('more-turns').hidden=value.turns.length<100;if(!turnOffset)$('turns').append(el('p','Esta atención aún no tiene mensajes enviados.'));
 for(const b of $('conversations').children)if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset.id===id));
 }catch(e){if(epoch===generation&&seq===selectionVersion)error(e.message);}finally{if(seq===selectionVersion)$('more-turns').disabled=false;}
}
async function load(){const epoch=generation;error();try{
 const v=await request('?offset='+offset);if(epoch!==generation||!token)return;
 $('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('token').value='';$('metrics').replaceChildren();
 const m=v.metrics;for(const [title,value] of [['Atenciones',m.sessions.total],['Consultas',m.turns.total],['Consultas a IA',m.turns.aiCalls],['Tokens de entrada',m.turns.inputTokens],['Tokens de salida',m.turns.outputTokens],['Respuesta media (ms)',m.turns.averageMs||0]]){const card=el('div');card.className='metric';card.append(el('strong',String(value)),el('span',title));$('metrics').append(card);}
 $('retention').textContent=(v.retentionDays?'Conservación: '+v.retentionDays+' días.':'Conservación: sin eliminación automática.')+' Canales: '+(m.channels.map(c=>label(c.channel)+' '+c.turns).join(' · ')||'Aún no hay consultas.');
 $('conversations').replaceChildren();for(const c of v.items){const b=el('button',date(c.startedAt));b.className='history-item';b.dataset.id=c.id;b.setAttribute('aria-pressed',String(c.id===selected));b.append(el('small',label(c.status)+' · '+c.turns+' registros'));b.onclick=()=>detail(c.id);$('conversations').append(b);}
 if(!v.items.length)$('conversations').append(el('p','Todavía no hay conversaciones en esta página.'));$('previous').disabled=offset===0;$('next').disabled=v.items.length<50;
 }catch(e){if(epoch===generation)error(e.message);}}
$('download').onclick=async()=>{const id=selected,epoch=generation;if(!id)return;try{const response=await request('/'+id+'/export',{raw:true}),blob=await response.blob();if(epoch!==generation||id!==selected)return;const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='nexo-conversacion-'+id+'.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){if(epoch===generation)error(e.message);}};
$('more-turns').onclick=()=>detail(selected,true);$('next').onclick=()=>{offset+=50;clearDetail();load();};$('previous').onclick=()=>{offset=Math.max(0,offset-50);clearDetail();load();};$('refresh').onclick=()=>{clearDetail();load();};
$('login').onsubmit=e=>{e.preventDefault();token=$('token').value.trim();lastActivity=Date.now();load();};$('logout').onclick=()=>logout(true);
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>lastActivity=Date.now(),{passive:true});
setInterval(()=>{if(token&&Date.now()-lastActivity>300000){logout(true);error('Su sesión terminó por inactividad.');}},1000);
window.addEventListener('pagehide',()=>logout(false));
const access=installAdminAccess({onAuthenticated:value=>{token=value;lastActivity=Date.now();load();},onExpired:()=>logout(false),onActivity:()=>lastActivity=Date.now()});

