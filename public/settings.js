/**
 * NEXO · GUÍA DEL MÓDULO: public/settings.js
 * Editar parámetros del negocio desde secciones de configuración.
 * Entrada: Configuración guardada, valores del formulario y estado de integraciones.
 * Salida: Objeto de configuración validado en servidor y vista previa local.
 * Estado importante: data contiene configuración; dirty marca cambios; saving evita doble
 * guardado; generation descarta cargas antiguas; active elige sección.
 * Efectos y límites: No guarda claves privadas en navegador. Elegir modelo no demuestra
 * disponibilidad ni dispara una llamada pagada.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {bookingSettings} from './booking-settings.js';
import {calendarSettings} from './calendar-settings.js';
import {installAdminAccess} from './admin-access.js';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let calendarPanel=null,bookingPanel=null;
let token='',data=null,dirty=false,saving=false,generation=0,lastActivity=Date.now(),active='business';
const calendarOutcome=location.hash.startsWith('#calendar=')?location.hash.slice(10):null;
if(calendarOutcome){active='integrations';history.replaceState(null,'',location.pathname);}
async function calendarRequest(method,path,body){const epoch=generation;const response=await fetch('/api/admin/calendar'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(65000)});const result=await response.json();if(epoch!==generation)throw new Error('La sesión terminó.');if(!response.ok){if(response.status===401)logout();throw new Error(result.error||'No se pudo completar la operación de Calendar.');}return result;}
const sections=[['business','Negocio','Identidad y contacto','Los datos confirmados se utilizan en el kiosco y en las respuestas.'],['assistant','Asistente','Una atención con su identidad','Defina cómo se presenta y qué consultas puede atender.'],['experience','Experiencia','Canales y tiempos','Mantenga siempre la consulta escrita disponible.'],['ai','Inteligencia artificial','Uso de IA y presupuesto','Las respuestas del catálogo y las preguntas frecuentes no consumen consultas de IA.'],['knowledge','Respuestas','Conocimiento del negocio','Elija una base de respuestas pertinente a este negocio.'],['integrations','Conexiones','Agenda, video y proveedores','Las credenciales permanecen en el servidor. Aquí se configuran opciones y se consulta su estado.']];

function timezoneOptions(current){
 const common=[
  ['America/New_York','Nueva York · Estados Unidos'],
  ['America/Chicago','Chicago · Estados Unidos'],
  ['America/Denver','Denver · Estados Unidos'],
  ['America/Los_Angeles','Los Ángeles · Estados Unidos'],
  ['America/Phoenix','Phoenix · Estados Unidos'],
  ['America/Anchorage','Anchorage · Estados Unidos'],
  ['Pacific/Honolulu','Honolulu · Estados Unidos'],
  ['America/Puerto_Rico','Puerto Rico'],
  ['America/Santo_Domingo','Santo Domingo · República Dominicana'],
  ['America/Bogota','Bogotá · Colombia'],
  ['America/Mexico_City','Ciudad de México · México'],
  ['America/Lima','Lima · Perú'],
  ['America/Guayaquil','Guayaquil · Ecuador'],
  ['America/Caracas','Caracas · Venezuela'],
  ['America/Panama','Ciudad de Panamá · Panamá'],
  ['America/Costa_Rica','Costa Rica'],
  ['America/Guatemala','Guatemala'],
  ['America/El_Salvador','El Salvador'],
  ['America/Tegucigalpa','Tegucigalpa · Honduras'],
  ['America/Managua','Managua · Nicaragua'],
  ['America/La_Paz','La Paz · Bolivia'],
  ['America/Santiago','Santiago · Chile'],
  ['America/Argentina/Buenos_Aires','Buenos Aires · Argentina'],
  ['America/Montevideo','Montevideo · Uruguay'],
  ['America/Asuncion','Asunción · Paraguay'],
  ['America/Sao_Paulo','São Paulo · Brasil'],
  ['America/Toronto','Toronto · Canadá'],
  ['Europe/Madrid','Madrid · España'],
  ['Atlantic/Canary','Islas Canarias · España'],
  ['Europe/London','Londres · Reino Unido'],
  ['UTC','Hora universal · UTC'],
 ];
 const labels=new Map(common.map(([id,label])=>[id,label+' ('+id+')']));
 let supported=[];try{supported=Intl.supportedValuesOf('timeZone');}catch{}
 const regions={Africa:'África',America:'América',Antarctica:'Antártida',Arctic:'Ártico',Asia:'Asia',Atlantic:'Atlántico',Australia:'Australia',Europe:'Europa',Indian:'Océano Índico',Pacific:'Pacífico'};
 for(const id of [...supported,current].filter(Boolean)){
  if(labels.has(id))continue;
  const parts=id.split('/'),region=parts.shift();
  labels.set(id,(parts.length?parts.join(' / ').replaceAll('_',' ')+' · '+(regions[region]||region):id)+' ('+id+')');
 }
 return [...labels];
}

function modelOptions(current){
 const choices=[['','Usar modelo predeterminado de la instalación'],['gpt-4.1-mini','GPT-4.1 mini'],['gpt-4.1','GPT-4.1']];
 if(current&&!choices.some(([id])=>id===current))choices.push([current,'Modelo guardado · '+current]);
 return choices;
}

const definitions={
 business:[['profile.name','Nombre del negocio','text',{required:true,maxLength:120,wide:true}],['business.type','Tipo de atención','select',{options:[['driving-school','Escuela de conducción'],['general','Otro negocio / servicios']]}],['business.currency','Moneda de los servicios','select',{options:['USD','EUR','COP','MXN','ARS','PEN','CLP','DOP']}],['business.description','Descripción del negocio','textarea',{required:true,maxLength:600,wide:true}],['business.timezone','Zona horaria','select',{required:true,options:timezoneOptions,help:'Seleccione la ciudad o región de su negocio. Los cambios de horario de verano se aplican automáticamente donde corresponda.',wide:true}],['business.address','Dirección','text',{maxLength:250,wide:true}],['business.phone','Teléfono','text',{maxLength:70}],['business.email','Correo de contacto','email',{maxLength:150}],['business.website','Sitio web','url',{maxLength:500,wide:true,placeholder:'https://'}]],
 assistant:[['assistant.name','Nombre del asistente','text',{required:true,maxLength:40}],['assistant.addressStyle','Trato al visitante','select',{options:[['usted','Usted'],['tu','Tú']]}],['assistant.welcome','Saludo de inicio','textarea',{required:true,maxLength:400,wide:true,help:'Puede usar {asistente} y {negocio}. Los saludos breves durante la conversación conservan una respuesta breve.'}],['assistant.scope','Qué atención brinda','textarea',{required:true,maxLength:1000,wide:true,help:'Describa los temas permitidos. Esto no habilita cobros, reservas ni acciones externas.'}],['assistant.topics','Palabras y temas del negocio','text',{maxLength:500,wide:true,help:'Separados por comas. Ayudan a reconocer consultas de orientación.'}],['assistant.offTopic','Respuesta para una consulta ajena','textarea',{required:true,maxLength:400,wide:true}],['assistant.handoff','Cómo pedir atención humana','textarea',{required:true,maxLength:400,wide:true}]],
 experience:[['experience.touchKeyboard','Teclado en pantalla del kiosco','checkbox',{wide:true,help:'Opcional para pantallas táctiles sin teclado. Muestra un icono junto a los campos; cada visitante decide si abre o cierra el teclado. En iPad puede dejarlo desactivado y usar el teclado del dispositivo.'}],['experience.voiceEnabled','Ofrecer llamada por voz','checkbox',{wide:true}],['experience.videoEnabled','Ofrecer videollamada con LiveAvatar','checkbox',{wide:true,help:'Activarlo no inicia sesiones ni habilita créditos por sí solo.'}],['experience.automaticVoice','Conversación automática al iniciar','checkbox',{wide:true,help:'El visitante puede cambiar a envío manual durante su atención.'}],['experience.inactivityMinutes','Cerrar por inactividad (minutos)','number',{min:2,max:30,step:1,required:true}],['experience.accent','Color de acento','select',{options:[['lime','Verde Nexo'],['blue','Azul'],['violet','Violeta']]}]],
 ai:[['ai.enabled','Permitir respuestas e interpretación con IA','checkbox',{wide:true,help:'Al desactivarlo, continúan disponibles el catálogo y las respuestas locales.'}],['ai.interpretationEnabled','Interpretar preguntas ambiguas con IA','checkbox',{wide:true}],['ai.model','Modelo configurado','select',{options:modelOptions,wide:true,help:'Elija el modelo del asistente. La disponibilidad depende de su cuenta de OpenAI. Seleccionar y guardar no consume consultas de IA.'}],['ai.sessionCalls','Consultas máximas por atención','number',{min:1,max:30,step:1,required:true}],['ai.dailyCalls','Consultas máximas por día','number',{min:1,max:10000,step:1,required:true}],['ai.outputTokens','Máximo de tokens por respuesta','number',{min:100,max:700,step:1,required:true,help:'Controla la extensión de la respuesta generada. El consumo también incluye el texto enviado al modelo.',wide:true}]],
 knowledge:[['assistant.knowledgeMode','Origen de las respuestas','select',{options:[['file','Base SQLite de la escuela'],['custom','Respuestas propias de este negocio'],['none','Solo catálogo y reglas']],wide:true}],['assistant.knowledgeText','Preguntas frecuentes propias','textarea',{maxLength:8000,rows:16,wide:true,help:'Hasta 8.000 caracteres. Cada tema necesita [identificador], pregunta: y respuesta:. Se admiten los parámetros del manual de FAQs.',placeholder:'[horario]\npregunta: ¿A qué hora abren?\nrespuesta: Nuestro horario es {{centro.horario}}.'}]],
 integrations:[['booking.message','Cómo coordinar una cita o atención','textarea',{required:true,maxLength:500,wide:true}],['booking.url','Enlace de reservas externo (opcional)','url',{maxLength:500,wide:true,placeholder:'https://',help:'Se ofrece un botón para abrir la agenda. No conecta la API ni confirma disponibilidad dentro de Nexo.'}],['video.avatarId','ID de avatar de LiveAvatar','text',{maxLength:36,wide:true}],['video.voiceId','ID de voz de LiveAvatar (modo FULL)','text',{maxLength:36,wide:true}],['video.maxSeconds','Máximo por videollamada (segundos)','number',{min:30,max:60,step:1,required:true,wide:true,help:'El máximo permitido sigue siendo un minuto. El modo de integración y la autorización de gasto se mantienen en el servidor.'}]],
};
const valueAt=(object,path)=>path.split('.').reduce((o,k)=>o?.[k],object);
const setAt=(object,path,value)=>{const parts=path.split('.');const key=parts.pop();const parent=parts.reduce((o,k)=>o[k],object);parent[key]=value;};
function msg(id,text=''){$(id).textContent=text;$(id).hidden=!text;}
async function request(method='GET',body){const response=await fetch('/api/admin/configuration',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok){if(response.status===401)logout();throw new Error(result.error||'No se pudo completar la operación.');}return result;}
function show(id){active=id;for(const fieldset of document.querySelectorAll('[data-section]'))fieldset.hidden=fieldset.dataset.section!==id;for(const b of $('sections').children)b.setAttribute('aria-current',String(b.dataset.sectionButton===id));}
function field(path,label,type,options={}){
 const wrapper=el('label');wrapper.className='field'+(options.wide?' wide':'')+(type==='checkbox'?' check-row':'');const title=el('span',label);let input;
 if(type==='select'){input=el('select');for(const option of (typeof options.options==='function'?options.options(valueAt(data.configuration,path)):options.options)){const [value,text]=Array.isArray(option)?option:[option,option];const o=el('option',text);o.value=value;input.append(o);}}
 else if(type==='textarea'){input=el('textarea');input.rows=options.rows||3;}else{input=el('input');input.type=type;}
 input.name=path;input.id='setting-'+path.replaceAll('.','-');
 for(const key of ['required','maxLength','min','max','step','placeholder'])if(options[key]!==undefined)input[key]=options[key];
 const value=valueAt(path.startsWith('profile.')?{profile:data.profile}:data.configuration,path);if(type==='checkbox')input.checked=!!value;else input.value=value??'';
 wrapper.append(...(type==='checkbox'?[input,title]:[title,input]));if(options.help)wrapper.append(el('small',options.help));return wrapper;
}
function hours(){const box=el('div');box.className='hours';box.append(el('strong','Horarios de atención'));const days=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];for(const row of data.profile.weeklyHours){const r=el('div');r.className='hours-row';const check=el('label');check.className='day-check';const enabled=el('input');enabled.type='checkbox';enabled.name='day-'+row.day;enabled.checked=row.open!==null;check.append(enabled,document.createTextNode(days[row.day]));r.append(check);for(const k of ['open','close']){const label=el('label',k==='open'?'Apertura':'Cierre');label.className='field';const input=el('input');input.type='time';input.name=k+'-'+row.day;input.value=row[k]||(k==='open'?'08:00':'18:00');input.disabled=!enabled.checked;input.required=enabled.checked;enabled.onchange=()=>{input.disabled=!enabled.checked;input.required=enabled.checked;};label.append(input);r.append(label);}box.append(r);}return box;}
function integration(label,ready,description){const n=el('div');n.className='integration';const copy=el('div');copy.append(el('strong',label),el('p',description));const badge=el('span',ready?'Configurado':'Pendiente');badge.className='tag';n.append(copy,badge);return n;}
function render(){
 calendarPanel?.destroy();bookingPanel?.destroy();
 $('save').disabled=false;
 $('fields').replaceChildren();$('sections').replaceChildren();
 for(const [id,label,title,description] of sections){const b=el('button',label);b.type='button';b.dataset.sectionButton=id;b.onclick=()=>show(id);$('sections').append(b);
 const section=el('fieldset');section.dataset.section=id;section.append(el('legend',title),el('p',description));const grid=el('div');grid.className='form-grid';for(const spec of definitions[id])grid.append(field(...spec));
 if(id==='business'){const note=el('p','Al cambiar el tipo de negocio se pausan todos los servicios para revisarlos. Al cambiar la moneda se dejan sus precios por confirmar: no se convierten importes automáticamente.');note.className='info';grid.append(note,hours());}
 if(id==='knowledge'){const help=el('p');help.className='info';const a=el('a','Manual de preguntas frecuentes ↗');a.href='/knowledge';a.textContent='Editar base SQLite de la escuela ↗';a.target='_blank';a.rel='noopener noreferrer';help.append('Las respuestas propias se guardan en la base de Nexo. La base de la escuela se edita desde Respuestas frecuentes. ',a);grid.append(help);const ids=el('p','IDs de servicios para usar en sus respuestas: '+(data.services.map(s=>s.name+' → '+s.id).join(' · ')||'Cree servicios desde Administración.'));ids.className='service-reference';grid.append(ids);}
 if(id==='integrations'){const i=data.integrations;calendarPanel=calendarSettings({initial:i.calendar,request:calendarRequest,beforeConnect:()=>!dirty||confirm('La conexión abre Google. ¿Continuar y descartar los cambios de configuración sin guardar?')});bookingPanel=bookingSettings({request:calendarRequest});grid.prepend(calendarPanel.element,bookingPanel.element);grid.append(integration('Acceso administrativo',i.access?.ready||false,i.access?.mode==='email'?'Código temporal por correo. Sesiones protegidas en SQLite.':'Clave actual de instalación; el envío por correo está pendiente.'),integration('OpenAI',i.ai.keyConfigured,'Proveedor: '+i.ai.provider+'. La clave nunca se muestra en este módulo.'),integration('LiveAvatar',i.video.keyConfigured,'Modo '+i.video.mode+'. Consumo de créditos '+(i.video.paidEnabled?'habilitado':'desactivado')+' en el servidor.'),integration('Voz',i.voice.available,i.voice.provider),integration('Pagos',false,'Los cobros automáticos siguen pendientes.'));const note=el('p','Claves de API, clave administrativa, permisos de gasto, voz instalada, puerto, origen HTTPS y ruta de la base se mantienen en .env o en la instalación del servidor. No se exportan ni se envían al navegador.');note.className='info';grid.append(note);}
 section.append(grid);$('fields').append(section);}
 $('revision').textContent='Versión de datos '+data.revision+' · '+new Date(data.updatedAt).toLocaleString('es');show(active);preview();if(calendarOutcome==='failed')msg('error','Google no completó la conexión. Revise los permisos, la dirección de retorno y vuelva a intentar.');
}
function collect(){const result={profile:structuredClone(data.profile),configuration:structuredClone(data.configuration)};for(const specs of Object.values(definitions))for(const [path,,type] of specs){const input=$('settings-form').elements[path];setAt(path.startsWith('profile.')?result:result.configuration,path,type==='checkbox'?input.checked:type==='number'?Number(input.value):input.value.trim());}const f=$('settings-form').elements;result.profile.weeklyHours=data.profile.weeklyHours.map(row=>({day:row.day,open:f['day-'+row.day].checked?f['open-'+row.day].value:null,close:f['day-'+row.day].checked?f['close-'+row.day].value:null}));return result;}
function preview(){if(!data)return;const {profile,configuration:c}=collect();$('preview-assistant').textContent=c.assistant.name;$('preview-business').textContent=profile.name;$('preview-greeting').textContent=c.assistant.welcome.replaceAll('{asistente}',c.assistant.name).replaceAll('{negocio}',profile.name);$('preview-channels').textContent=['Texto',...(c.experience.voiceEnabled?['Voz']:[]),...(c.experience.videoEnabled?['Video']:[])].join(' · ');$('preview-card').dataset.accent=c.experience.accent;}
function logout(remote=false){calendarPanel?.destroy();bookingPanel?.destroy();generation++;token='';data=null;dirty=false;saving=false;$('token').value='';$('fields').replaceChildren();$('sections').replaceChildren();$('settings-form').reset();$('dashboard').hidden=true;$('logout').hidden=true;$('login').hidden=false;msg('saved');if(remote)access.logout();else access.reset();}
async function load(){const epoch=generation;msg('error');try{const result=await request();if(epoch!==generation||!token)return;data=result;dirty=false;$('token').value='';$('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;render();}catch(error){if(epoch===generation)msg('error',error.message);}}
$('login').onsubmit=event=>{event.preventDefault();token=$('token').value.trim();lastActivity=Date.now();load();};
$('settings-form').oninput=event=>{if(event.target.closest('#calendar-settings, #booking-settings'))return;dirty=true;msg('saved');preview();};
$('settings-form').addEventListener('invalid',event=>{show(event.target.closest('[data-section]').dataset.section);},true);
$('settings-form').addEventListener('change',event=>{if(event.target.name==='business.type'&&event.target.value==='general'){const f=$('settings-form').elements;f['assistant.knowledgeMode'].value='none';f['assistant.scope'].value='Servicios publicados, requisitos, precios, horarios y atención de este negocio.';f['assistant.topics'].value='servicios, atención';f['booking.message'].value='Para coordinar su atención, consulte con el personal de {negocio}.';preview();}});
$('settings-form').onsubmit=async event=>{event.preventDefault();if(saving)return;const payload={revision:data.revision,...collect()};saving=true;$('save').disabled=true;for(const fieldset of $('fields').children)fieldset.disabled=true;msg('error');const epoch=generation;try{await request('PUT',payload);if(epoch!==generation)return;dirty=false;await load();msg('saved','Configuración guardada. Las atenciones anteriores se cerraron; el kiosco utilizará los nuevos datos.');}catch(error){if(epoch===generation)msg('error',error.message||'No se pudo confirmar el guardado. Actualice los datos antes de reintentar.');}finally{if(epoch===generation){saving=false;$('save').disabled=false;for(const fieldset of $('fields').children)fieldset.disabled=false;}}};
$('reload').onclick=()=>{if(!saving&&(!dirty||confirm('¿Descartar los cambios sin guardar y actualizar?'))){msg('saved');load();}};
$('logout').onclick=()=>{if(!dirty||confirm('¿Cerrar sin guardar los cambios?'))logout(true);};
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>lastActivity=Date.now(),{passive:true});
setInterval(()=>{if(token&&Date.now()-lastActivity>300000){logout(true);msg('error','La sesión de configuración terminó por inactividad.');}},1000);
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});window.addEventListener('pagehide',()=>logout(false));

const access=installAdminAccess({onAuthenticated:credential=>{token=credential;lastActivity=Date.now();load();},onExpired:()=>logout(false),onActivity:()=>lastActivity=Date.now()});
