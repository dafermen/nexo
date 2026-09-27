/**
 * NEXO · GUÍA DEL MÓDULO: public/admin.js
 * Administrar catálogo, perfil y biblioteca de audio.
 * Entrada: Formularios del administrador y respuestas autorizadas de API.
 * Salida: Listas, editores, estados de carga y estadísticas de audio.
 * Estado importante: revision protege ediciones; generaciones invalidan cargas tras cerrar sesión;
 * loadAudioLibrary consulta bajo demanda.
 * Efectos y límites: Guardar cambia SQLite mediante API; vaciar biblioteca elimina audios
 * derivados, no servicios ni historial.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {installReports} from './admin-reports.js';
import {installAgenda} from './admin-agenda.js';
import {installAdminAccess} from './admin-access.js';
const $=id=>document.getElementById(id);
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
let token='',generation=0,lastActivity=Date.now(),data=null,dirty=false,editor=null,saving=false;
const money=s=>s.priceCents===null?'Precio por confirmar':s.priceCents===0?'Sin costo':new Intl.NumberFormat('es-US',{style:'currency',currency:s.currency||'USD'}).format(s.priceCents/100);
function message(id,text=''){ $(id).textContent=text;$(id).hidden=!text; }
const showError=text=>message('error',text);
function logout(remote=false){reports.reset();for(const controller of downloads)controller.abort();agenda.reset();generation++;token='';data=null;dirty=false;editor=null;saving=false;$('token').value='';$('login').hidden=false;$('dashboard').hidden=true;$('logout').hidden=true;$('service-dialog').close();$('service-form').reset();$('school-settings').replaceChildren();$('service-admin').replaceChildren();$('appointments').replaceChildren();$('audio-library').open=false;$('audio-library-status').textContent='Abra esta sección para consultar el uso.';$('audio-library-clear').disabled=true;message('saved');message('error');message('editor-error');if(remote)access.logout();else access.reset();}
async function request(path,options={}){
 const response=await fetch(path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(!response.ok){if(response.status===401)logout();throw new Error(result.error);}
 return result;
}
function discard(){return !dirty||confirm('Hay cambios sin guardar. ¿Desea descartarlos?');}
function renderSchool(settings){
 $('school-details').hidden=!settings;$('new-service').hidden=!settings;
 if(!settings)return;
 $('school-name').textContent=settings.profile.name;
 $('price-currency-label').textContent='Precio ('+(settings.configuration?.business.currency||'USD')+')';
 document.querySelector('.calendar-note strong').textContent='Agenda del negocio';
 document.querySelector('.calendar-note p').textContent='Consulte la agenda y sus estados más abajo. La disponibilidad se comprueba con Google al reservar; puede revisar la conexión desde Configuración → Conexiones.';
 $('ai-protection').textContent=data.aiProtection ? 'Protección de IA activa · '+data.aiProtection.usage.calls+' / '+data.aiProtection.limits.dailyCalls+' solicitudes hoy · Máximo '+data.aiProtection.limits.sessionCalls+' por atención. Incluye orientación e interpretación de consultas. Las respuestas locales sin IA no consumen este cupo.' : '';
 $('knowledge-status').textContent=data.knowledge ? 'Base de respuestas: '+data.knowledge.entries+' temas activos.'+(data.knowledge.error?' No se cargó la última edición: '+data.knowledge.error+(data.knowledge.loaded?' Se conserva la versión válida anterior.':' Se usan las respuestas habituales de Nexo.'):(data.knowledge.source==='sqlite'?' Respuestas guardadas en SQLite. Edítelas desde Respuestas frecuentes.':' Archivo listo; los cambios guardados se revisan en la próxima consulta.')) : '';
 $('last-saved').textContent='Último guardado: '+new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short'}).format(new Date(settings.updatedAt));
 const form=node('form');form.id='school-form';const label=node('label','Nombre del negocio');const name=node('input');name.name='name';name.required=true;name.maxLength=120;name.value=settings.profile.name;label.append(name);form.append(label,node('p',(settings.configuration?.business.timezone||'America/New_York')+' · Un intervalo de atención por día.'));
 const days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
 for(const row of settings.profile.weeklyHours){
   const box=node('div');box.className='hours-row';const checkLabel=node('label');checkLabel.className='check';const enabled=node('input');enabled.type='checkbox';enabled.name='enabled-'+row.day;enabled.checked=row.open!==null;checkLabel.append(enabled,document.createTextNode(days[row.day]));box.append(checkLabel);
   for(const key of ['open','close']){const l=node('label',key==='open'?'Apertura':'Cierre');const input=node('input');input.type='time';input.name=key+'-'+row.day;input.value=row[key]||(key==='open'?'08:00':'18:00');input.required=enabled.checked;input.disabled=!enabled.checked;l.append(input);box.append(l);enabled.addEventListener('change',()=>{input.disabled=!enabled.checked;input.required=enabled.checked;});}
   form.append(box);
 }
 const err=node('p');err.className='notice';err.role='alert';err.hidden=true;form.append(err);const save=node('button','Guardar escuela y horarios');save.className='primary';form.append(save);form.addEventListener('input',()=>{dirty=true;});
 form.addEventListener('submit',async event=>{event.preventDefault();if(saving)return;saving=true;save.disabled=true;const epoch=generation;err.hidden=true;
   const values=new FormData(form);const weeklyHours=days.map((_,day)=>({day,open:values.has('enabled-'+day)?values.get('open-'+day):null,close:values.has('enabled-'+day)?values.get('close-'+day):null}));
   try{await request('/api/admin/center',{method:'PUT',body:JSON.stringify({revision:settings.revision,profile:{name:values.get('name').trim(),weeklyHours}})});if(epoch!==generation)return;dirty=false;await load();message('saved',(settings.configuration?.business.type==='general'?'Negocio':'Escuela')+' y horarios guardados. La asesora utilizará los nuevos datos en su próxima respuesta.');}
   catch(e){if(epoch===generation){err.textContent=e.message||'No se pudo guardar. Actualice los datos para comprobar el resultado antes de reintentar.';err.hidden=false;}}
   finally{if(epoch===generation){saving=false;save.disabled=false;}}
 });$('school-settings').replaceChildren(form);
}
function openEditor(service){
 if(saving||!discard())return;if(dirty)renderSchool(data.centerSettings);dirty=false;editor={id:service?.id||null,revision:data.centerSettings.revision};const f=$('service-form');f.reset();
 for(const key of ['name','description','requirements','duration','modality'])f.elements[key].value=service?.[key]??'';
 f.elements.price.value=service?.priceCents==null?'':(service.priceCents/100).toFixed(2);f.elements.active.checked=service?.active??true;
 $('editor-title').textContent=service?'Editar servicio':'Añadir servicio';message('editor-error');$('save-service').disabled=false;$('service-dialog').showModal();f.elements.name.focus();
}
function closeEditor(){if(saving||!discard())return;dirty=false;editor=null;$('service-dialog').close();$('service-form').reset();}
async function load(){
 const epoch=generation;showError('');
 try{
   const result=await request('/api/admin/overview');if(epoch!==generation||!token)return;data=result;dirty=false;
   $('token').value='';$('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;renderSchool(data.centerSettings);$('service-admin').replaceChildren();
   for(const service of data.services){
     const card=node('article');card.className='admin-service';const status=node('span',service.active?'Publicado':'Pausado');status.className=service.active?'status-tag':'status-tag paused';
     const button=node('button',data.centerSettings?'Editar servicio':service.active?'Pausar servicio':'Habilitar servicio');button.className='secondary';
     if(data.centerSettings)button.addEventListener('click',()=>openEditor(service));
     else button.addEventListener('click',async()=>{button.disabled=true;try{await request('/api/admin/services/'+service.id,{method:'PATCH',body:JSON.stringify({active:!service.active})});await load();}catch(e){showError(e.message);button.disabled=false;}});
     card.append(status,node('h3',service.name),node('p',service.description),node('strong',money(service)),node('small',(service.duration===null?'Duración pendiente':service.duration+' min')+' · '+(service.modality||'Modalidad pendiente')),button);$('service-admin').append(card);
   }
    await Promise.all([agenda.load(),reports.load()]);

 }catch(error){if(epoch===generation||!token)showError(error.message||'No se pudo conectar.');}
}
$('service-form').addEventListener('input',()=>{dirty=true;});
$('service-form').addEventListener('submit',async event=>{
 event.preventDefault();if(!editor||saving)return;saving=true;const epoch=generation;const editing={...editor};$('save-service').disabled=true;message('editor-error');
 const f=$('service-form').elements;const service={name:f.name.value.trim(),description:f.description.value.trim(),requirements:f.requirements.value.trim()||null,modality:f.modality.value||null,priceCents:f.price.value===''?null:Math.round(Number(f.price.value)*100),duration:f.duration.value===''?null:Number(f.duration.value),active:f.active.checked};
 try{await request('/api/admin/services'+(editing.id?'/'+editing.id:''),{method:editing.id?'PUT':'POST',body:JSON.stringify({revision:editing.revision,service})});if(epoch!==generation)return;dirty=false;editor=null;$('service-dialog').close();f.name.value='';await load();message('saved','Servicio guardado. El kiosco se actualizará automáticamente; la asesora ya dispone de la nueva información.');}
 catch(e){if(epoch===generation)message('editor-error',e.message||'No se pudo confirmar el guardado. Actualice el panel antes de volver a intentarlo.');}
 finally{if(epoch===generation){saving=false;$('save-service').disabled=false;}}
});
$('service-dialog').addEventListener('cancel',event=>{event.preventDefault();closeEditor();});$('close-editor').addEventListener('click',closeEditor);
$('new-service').addEventListener('click',()=>openEditor(null));
$('login').addEventListener('submit',event=>{event.preventDefault();token=$('token').value.trim();lastActivity=Date.now();load();});
$('logout').addEventListener('click',()=>{if(discard())logout(true);});$('refresh').addEventListener('click',()=>{if(!saving&&discard()){message('saved');load();}});
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{lastActivity=Date.now();},{passive:true});
setInterval(()=>{if(token&&Date.now()-lastActivity>300000){logout(true);showError('Sesión administrativa cerrada por inactividad.');}},1000);
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>logout(false));

const downloads=new Set();
async function download(path,options,filename){
 const epoch=generation,controller=new AbortController();downloads.add(controller);const timer=setTimeout(()=>controller.abort(),120000);
 try{const response=await fetch(path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:controller.signal});if(!response.ok){const error=await response.json();if(response.status===401)logout();throw Error(error.error);}
 const blob=await response.blob();if(epoch!==generation||!token)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }finally{clearTimeout(timer);downloads.delete(controller);}
}
const reports=installReports({root:$('admin-reports'),request,download});
const agenda=installAgenda({root:$('admin-agenda'),request});
const access=installAdminAccess({onAuthenticated:credential=>{token=credential;lastActivity=Date.now();load();},onExpired:()=>logout(false),onActivity:()=>lastActivity=Date.now()});

async function loadAudioLibrary(){
 const epoch=generation;
 try{const usage=await request('/api/admin/audio-library');if(epoch!==generation||!token)return;
  $('audio-library-status').textContent=!usage.available?'Biblioteca no disponible. La voz sigue generándose normalmente.':(usage.enabled?'Activa':'Desactivada')+' · '+usage.entries+' audios · '+(usage.bytes/1048576).toFixed(1)+' / '+Math.round(usage.maxBytes/1048576)+' MB · '+usage.hits+' reutilizaciones · '+usage.misses+' búsquedas sin audio · Aproximadamente '+(usage.savedMs/1000).toFixed(1)+' segundos de generación evitados · Conservación: '+usage.ttlDays+' días.';
  $('audio-library-clear').disabled=!usage.available||!usage.entries;
 }catch(e){if(epoch===generation)$('audio-library-status').textContent=e.message;}
}
$('audio-library').addEventListener('toggle',()=>{if($('audio-library').open&&token)loadAudioLibrary();});
$('audio-library-refresh').addEventListener('click',loadAudioLibrary);
$('audio-library-clear').addEventListener('click',async()=>{const epoch=generation;$('audio-library-clear').disabled=true;try{await request('/api/admin/audio-library',{method:'DELETE',body:'{}'});if(epoch!==generation)return;await loadAudioLibrary();message('saved','Audios eliminados. Se generarán de nuevo cuando se necesiten.');}catch(e){if(epoch===generation)showError(e.message);}});
