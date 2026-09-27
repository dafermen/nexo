/**
 * NEXO · GUÍA DEL MÓDULO: public/calendar-settings.js
 * Mostrar conexión, selección y prueba de Google Calendar.
 * Entrada: Funciones request/estado y clics del administrador.
 * Salida: UI de autorización y resultado de comprobación; destroy descarta vista.
 * Estado importante: render presenta el estado seguro; IDs identifican calendario seleccionado, no
 * credenciales.
 * Efectos y límites: Las acciones de conectar, probar o desconectar van a API autenticada; una
 * prueba de escritura sí crea y elimina un evento técnico.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
export function calendarSettings({initial,request,beforeConnect=()=>true}){
 const panel=node('section');panel.className='calendar-panel';panel.id='calendar-settings';panel.setAttribute('aria-label','Google Calendar');
 let state=initial,items=[],running=false,alive=true,version=0;
 const title=node('h2','Google Calendar'),description=node('p','Conecte su cuenta y seleccione el calendario base para el modo de agenda única. Puede configurar calendarios por profesor en Reservas desde el kiosco.');
 const status=node('p'),notice=node('p');notice.className='calendar-notice';notice.setAttribute('role','status');
 const setup=node('details'),summary=node('summary','Preparar la conexión por primera vez');setup.append(summary);
 const steps=node('ol');for(const text of ['Cree o elija un proyecto propio en Google Cloud y habilite Google Calendar API.','Configure Google Auth Platform. Si la aplicación está en pruebas, agregue su correo como usuario de prueba.','Cree un cliente OAuth de tipo Aplicación web y registre exactamente la dirección de retorno que aparece abajo.','Guarde GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el archivo .env de Nexo y reinicie el servidor. No use su contraseña de Gmail.'])steps.append(node('li',text));
 const uri=node('code',state.redirectUri||'http://localhost:3000/api/calendar/oauth/callback');setup.append(steps,node('p','Dirección de retorno:'),uri);
 const guide=node('a','Abrir documentación de Nexo ↗');guide.href='/docs#doc=343ccf280a5c675f8eb2';guide.target='_blank';guide.rel='noopener noreferrer';setup.append(node('p','Busque «Google Calendar» para ver la guía detallada.'),guide);
 const controls=node('div');controls.className='calendar-actions';
 const connect=button('Conectar con Google','calendar-connect',async()=>{if(!beforeConnect())return;const r=await request('POST','/connect',{});location.assign(r.url);});
 const refresh=button('Actualizar calendarios','calendar-refresh',async()=>{state=await request('GET','');items=state.connected?(await request('GET','/calendars')).items:[];render();});
 const disconnect=button('Desconectar','calendar-disconnect',async()=>{if(!confirm('¿Desconectar Google Calendar de Nexo? Los eventos existentes se conservarán.'))return;state=await request('DELETE','');items=[];notice.textContent=state.revoked?'Cuenta desconectada.':'Nexo quedó desconectado. Google no confirmó la retirada del permiso; puede retirarlo desde Seguridad de su cuenta de Google.';render();});
 controls.append(connect,refresh,disconnect);
 const selection=node('label','Calendario base (modo de agenda única)'),select=node('select');selection.className='field';select.id='calendar-select';selection.htmlFor=select.id;selection.append(select);
 const calendarId=node('small');calendarId.className='calendar-id';selection.append(calendarId);
 const save=button('Usar este calendario','calendar-save',async()=>{state=await request('PUT','/selection',{calendarId:select.value});notice.textContent='Calendario guardado: '+state.selected.name+'.';render();});
 const actions=node('div');actions.className='calendar-actions';
 const read=button('Comprobar lectura','calendar-check',async()=>{const r=await request('POST','/check',{calendarId:state.selected.id});notice.textContent='Lectura correcta en «'+r.calendarName+'»: '+r.eventsNext7Days+' eventos en los próximos 7 días. Zona horaria: '+r.timeZone+'.';state=await request('GET','');render();});
 const test=button('Probar creación y limpieza','calendar-test',async()=>{if(!confirm('Se creará un evento «[PRUEBA NEXO]» en «'+state.selected.name+'» y luego se eliminará. No tendrá invitados ni recordatorios y no bloqueará disponibilidad. ¿Realizar la prueba?'))return;const r=await request('POST','/test',{calendarId:state.selected.id});notice.textContent='Prueba correcta en «'+r.calendarName+'»: evento creado, leído y eliminado.';state=await request('GET','');render();});
 const cleanup=button('Limpiar prueba pendiente','calendar-cleanup',async()=>{state=await request('POST','/cleanup',{});notice.textContent='Pruebas pendientes verificadas y limpiadas.';render();});actions.append(read,test,cleanup);
 const last=node('p'),scope=node('p','Configure los servicios reservables en el panel de Reservas. El kiosco consulta disponibilidad y registra la cita únicamente al confirmar el formulario.');scope.className='calendar-scope';
 const permissions=node('p','Google autoriza la lista de calendarios y sus eventos. Nexo usa el calendario base o los calendarios de profesores configurados. Solo cancela citas propias verificadas y limpia sus eventos técnicos de prueba.');permissions.className='calendar-scope';
 panel.append(title,description,status,setup,controls,selection,save,actions,last,notice,scope,permissions);
 function button(text,id,work){const b=node('button',text);b.type='button';b.id=id;b.className='secondary';b.onclick=async()=>{if(running||!alive)return;running=true;notice.textContent='Procesando…';renderDisabled();try{await work();}catch(e){if(alive){notice.textContent=e.message;try{state=await request('GET','');render();}catch{}}}finally{running=false;if(alive){renderDisabled();if(notice.textContent==='Procesando…')notice.textContent='';}}};return b;}
 function renderDisabled(){const pending=!!state.pendingTests?.length;connect.disabled=running||!state.configured;refresh.disabled=running||!state.connected;disconnect.disabled=running||!state.connected||pending;select.disabled=running||!items.length;save.disabled=running||!select.value||pending;read.disabled=test.disabled=running||!state.connected||!state.selected||pending;cleanup.disabled=running||!state.connected||!pending;}
 function render(){if(!alive)return;status.textContent=!state.configured?'Falta preparar el acceso de Google.':state.needsReconnect?'La conexión requiere volver a autorizar Google.':state.connected?'Cuenta conectada'+(state.selected?' · '+state.selected.name:' · Seleccione un calendario'):'Cuenta sin conectar.';setup.open=!state.configured;connect.textContent=state.connected?'Volver a conectar':'Conectar con Google';disconnect.hidden=!state.connected;selection.hidden=save.hidden=!state.connected;cleanup.hidden=!state.pendingTests?.length;last.textContent=state.lastCheck?'Última comprobación: '+new Date(state.lastCheck.at).toLocaleString('es')+' · '+(state.lastCheck.kind==='write'?'Creación y limpieza correctas':'Lectura correcta'):'';
  if(state.pendingTests?.length)last.textContent='Hay una prueba pendiente de verificar y limpiar. No inicie otra prueba.';
  const previous=select.value;select.replaceChildren();const empty=node('option','Seleccione un calendario');empty.value='';select.append(empty);
  for(const c of items){const option=node('option',c.name+' · '+c.timeZone+(c.writable?'':' · Solo lectura')+' · '+c.id);option.value=c.id;option.disabled=!c.writable;select.append(option);}
  select.value=state.selected?.id||previous||'';calendarId.textContent=state.selected?'Guardado: '+state.selected.name+' · '+state.selected.id:'';renderDisabled();
 }
 select.onchange=()=>{calendarId.textContent=select.value?'Seleccionado: '+select.value:'';renderDisabled();};render();
 if(state.connected){const epoch=++version;request('GET','/calendars').then(r=>{if(alive&&epoch===version){items=r.items;render();}}).catch(e=>{if(alive)notice.textContent=e.message;});}
 return {element:panel,destroy(){alive=false;version++;}};
}
