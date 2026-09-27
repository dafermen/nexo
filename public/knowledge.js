/**
 * NEXO · GUÍA DEL MÓDULO: public/knowledge.js
 * Editar la base activa de preguntas y respuestas.
 * Entrada: Texto FAQ y revisión recibidos tras autenticar.
 * Salida: Validación/guardado y mensajes de estado.
 * Estado importante: revision acompaña cada guardado; logout limpia contenido privado.
 * Efectos y límites: Escribe la base SQLite por API; no modifica el archivo semilla ni llama a IA
 * para publicar.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {installAdminAccess} from './admin-access.js';
const $=id=>document.getElementById(id);let token='',data=null,entries=[],selected=-1,page=0,mode='visual',dirty=false,saving=false,generation=0,previewGeneration=0,lastActivity=Date.now();
const message=(id,text='')=>{$(id).textContent=text;$(id).hidden=!text;};
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
async function request(method='GET',body,suffix=''){
 const r=await fetch('/api/admin/knowledge'+suffix,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const v=await r.json();if(!r.ok){if(r.status===401)logout(false);throw new Error(v.error||'No se pudo completar la operación.');}return v;
}
function changed(){dirty=true;previewGeneration++;message('saved');message('preview-result');$('draft-state').textContent='Cambios sin guardar';}
// Bloquear formulario y selector evita perder ediciones durante una conversión o guardado.
function busy(value){saving=value;$('knowledge-form').inert=value;for(const id of ['visual-mode','text-mode','add-topic','save'])$(id).disabled=value;}
function setMode(next){mode=next;$('visual-editor').hidden=next!=='visual';$('text-editor').hidden=next!=='text';$('topic-fields').disabled=next!=='visual';$('add-topic').hidden=next!=='visual';$('visual-mode').setAttribute('aria-pressed',String(next==='visual'));$('text-mode').setAttribute('aria-pressed',String(next==='text'));}
function renderList(){
 const categories=[...new Set(entries.map(e=>e.category||'General'))].sort(),previous=$('category-filter').value;
 $('category-filter').replaceChildren(new Option('Todas',''),...categories.map(c=>new Option(c,c)));$('category-filter').value=categories.includes(previous)?previous:'';
 $('category-suggestions').replaceChildren(...categories.map(c=>new Option(c,c)));
 const q=$('topic-search').value.toLocaleLowerCase(),category=$('category-filter').value,active=$('active-filter').value;
 const found=entries.map((e,index)=>({e,index})).filter(({e})=>(!category||(e.category||'General')===category)&&(!active||e.active===(active==='active'))&&[e.id,e.category,...e.questions,e.answer].join(' ').toLocaleLowerCase().includes(q));
 page=Math.min(page,Math.max(0,Math.ceil(found.length/30)-1));$('topic-count').textContent=found.length+' temas · página '+(page+1);$('topic-list').replaceChildren();
 for(const {e,index}of found.slice(page*30,page*30+30)){const b=node('button');b.type='button';b.className='topic-row';b.setAttribute('aria-pressed',String(index===selected));b.append(node('strong',e.questions[0]||'Nuevo tema'),node('small',(e.category||'General')+' · '+(e.active?'Activo':'Pausado')));b.onclick=()=>select(index);$('topic-list').append(b);}
 if(!found.length)$('topic-list').append(node('p','No hay temas con estos filtros.'));
 $('previous-topics').disabled=page===0;$('next-topics').disabled=(page+1)*30>=found.length;
}
function select(index){selected=index;previewGeneration++;message('preview-result');const e=entries[index];$('topic-fields').hidden=!e;$('empty-topic').hidden=!!e;if(e){$('topic-id').value=e.id;$('topic-category').value=e.category||'General';$('topic-service').value=e.serviceId||'';$('topic-active').checked=e.active;$('topic-questions').value=e.questions.join('\n');$('topic-answer').value=e.answer;}renderList();}
function edit(){if(selected<0)return;entries[selected]={id:$('topic-id').value,category:$('topic-category').value,serviceId:$('topic-service').value||null,active:$('topic-active').checked,questions:$('topic-questions').value.split(/\r?\n/).map(q=>q.trim()).filter(Boolean),answer:$('topic-answer').value.replace(/\r?\n/g,' ')};changed();renderList();}
async function load(){const epoch=++generation;previewGeneration++;message('error');try{
 const result=await request();if(epoch!==generation||!token)return;data=result;entries=result.entries;dirty=false;selected=-1;page=0;
 $('source').value=data.source;$('revision').textContent='Versión '+data.revision+' · '+new Date(data.updatedAt).toLocaleString('es');$('draft-state').textContent='Sin cambios pendientes';$('mode-warning').hidden=result.activeMode==='file';
 $('topic-service').replaceChildren(new Option('Información general',''),...result.services.map(s=>new Option(s.name+(s.active?'':' (inactivo)'),s.id)));
 $('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('token').value='';select(entries.length?0:-1);setMode(mode);
 }catch(e){if(epoch===generation)message('error',e.message);}}
function logout(remote=false){generation++;previewGeneration++;token='';data=null;entries=[];selected=-1;dirty=false;saving=false;$('source').value='';$('token').value='';$('topic-list').replaceChildren();$('topic-service').replaceChildren();$('category-filter').replaceChildren();$('category-suggestions').replaceChildren();for(const id of ['topic-id','topic-category','topic-questions','topic-answer','topic-search'])$(id).value='';$('topic-fields').hidden=true;$('dashboard').hidden=true;$('logout').hidden=true;$('knowledge-form').inert=false;$('save').disabled=false;busy(false);message('error');message('saved');message('preview-result');if(remote)access.logout();else access.reset();}
$('login').onsubmit=e=>{e.preventDefault();token=$('token').value.trim();lastActivity=Date.now();load();};
for(const id of ['topic-id','topic-category','topic-service','topic-active','topic-questions','topic-answer'])$(id).addEventListener('input',edit);
for(const id of ['topic-search','category-filter','active-filter'])$(id).addEventListener('input',()=>{page=0;renderList();});
$('previous-topics').onclick=()=>{page--;renderList();};$('next-topics').onclick=()=>{page++;renderList();};
$('add-topic').onclick=()=>{entries.push({id:'tema-'+crypto.randomUUID().slice(0,8),category:'General',active:true,serviceId:null,questions:[],answer:''});$('topic-search').value='';$('category-filter').value='';$('active-filter').value='';changed();select(entries.length-1);$('topic-questions').focus();};
$('delete-topic').onclick=()=>{if(entries.length===1){message('error','Conserve al menos un tema; puede desactivarlo.');return;}if(confirm('¿Eliminar este tema del borrador? Se publicará al guardar.')){entries.splice(selected,1);changed();select(Math.min(selected,entries.length-1));}};
$('insert-parameter').onclick=()=>{const field=$('topic-answer');field.setRangeText('{{'+$('parameter').value+'}}',field.selectionStart,field.selectionEnd,'end');edit();field.focus();};
$('source').oninput=changed;
for(const [id,next] of [['visual-mode','visual'],['text-mode','text']])$(id).onclick=async()=>{if(mode===next||saving)return;const epoch=generation;busy(true);message('error');try{
 const result=await request('POST',mode==='visual'?{entries}:{source:$('source').value},'/parse');if(epoch!==generation||!token)return;
 entries=result.entries;$('source').value=result.source;setMode(next);select(Math.max(0,Math.min(selected,entries.length-1)));
 }catch(e){if(epoch===generation)message('error',e.message);}finally{if(epoch===generation)busy(false);}};
$('preview').onclick=async()=>{const epoch=generation,view=++previewGeneration;message('error');try{const result=await request('POST',{entry:entries[selected]},'/preview');if(epoch!==generation||view!==previewGeneration||!token)return;message('preview-result',result.text+(result.warning?'\n\n'+result.warning:''));}catch(e){if(epoch===generation&&view===previewGeneration)message('error',e.message);}};
$('knowledge-form').onsubmit=async e=>{e.preventDefault();if(saving||!data)return;let epoch=generation;busy(true);message('error');try{
 await request('PUT',{revision:data.revision,...(mode==='visual'?{entries}:{source:$('source').value})});if(epoch!==generation)return;dirty=false;const refreshed=load();epoch=generation;await refreshed;if(epoch===generation&&token)message('saved','Respuestas guardadas. '+(data.activeMode==='file'?'Ya están disponibles para el asistente.':'Esta base no está seleccionada como fuente activa.'));
 }catch(e){if(epoch===generation)message('error',e.message);}finally{if(epoch===generation&&token)busy(false);}};
$('reload').onclick=()=>{if(!saving&&(!dirty||confirm('¿Descartar los cambios sin guardar?'))){message('saved');load();}};
$('logout').onclick=()=>{if(!dirty||confirm('¿Cerrar sin guardar los cambios?'))logout(true);};
for(const event of ['pointerdown','keydown','input'])document.addEventListener(event,()=>lastActivity=Date.now(),{passive:true});
setInterval(()=>{if(token&&Date.now()-lastActivity>300000){logout(true);message('error','Su sesión terminó por inactividad.');}},1000);
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});window.addEventListener('pagehide',()=>logout(false));
const access=installAdminAccess({onAuthenticated:value=>{token=value;lastActivity=Date.now();load();},onExpired:()=>logout(false),onActivity:()=>lastActivity=Date.now()});
