/**
 * NEXO · GUÍA DEL MÓDULO: public/admin-agenda.js
 * Agenda administrativa desacoplada del catálogo. Recibe request autenticado; devuelve load/reset.
 * Filtros y paginación se resuelven en el servidor. Texto de clientes siempre mediante textContent.
 * version invalida respuestas tras cerrar sesión o cambiar filtros; actionBusy impide dobles clics.
 * Cancelar requiere motivo y confirmación explícita. Un error nunca presenta el horario como libre.
 */
import {installTransfers} from './booking-transfers.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const states={reserved:'Reservado',pending:'En verificación',cancelled:'Cancelado'};
const bookingState=a=>states[a.status]+(a.transferPending?' · Traslado por verificar':'');
const syncStates={unchecked:'Sin comprobación reciente',reserved:'Confirmada en última comprobación',pending:'Google todavía no confirma',cancelled:'Cancelación confirmada',error:'Revisión pendiente con Google',local:'Demo local'};
const dateKey=(value,zone)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const shift=(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
export function installAgenda({root,request}){
 const transfers=installTransfers({request,onChanged:()=>load()});root.querySelector('#agenda-transfer').onclick=()=>transfers.open();
 let version=0,detailVersion=0,offset=0,timezone='America/New_York',data=null,actionBusy=false;
 const filters=root.querySelector('#agenda-filters'),rows=root.querySelector('#appointments'),cards=root.querySelector('#agenda-cards'),notice=root.querySelector('#agenda-notice'),dialog=document.getElementById('appointment-dialog'),content=dialog.querySelector('#appointment-detail');
 const field=name=>filters.elements[name];
 const say=text=>{notice.textContent=text;};
 const stamp=value=>value?new Intl.DateTimeFormat('es',{timeZone:timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Sin comprobar';
 const time=value=>new Intl.DateTimeFormat('es',{timeZone:timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(value));
 const button=(label,fn)=>{const b=el('button',label,'secondary');b.type='button';b.onclick=fn;return b;};
 function range(){
  if(field('view').value==='list')return;
  const start=field('from').value||dateKey(Date.now(),timezone);field('from').value=start;field('to').value=field('view').value==='week'?shift(start,6):start;
 }
 function params(){const p=new URLSearchParams({offset:String(offset)});for(const name of ['q','status','serviceId','instructorId','from','to'])if(field(name).value)p.set(name,field(name).value);return p;}
 async function load(){
  const epoch=++version;detailVersion++;say('Cargando agenda…');rows.replaceChildren();cards.replaceChildren();root.querySelector('#agenda-availability').replaceChildren();
  root.querySelector('#agenda-prev').disabled=true;root.querySelector('#agenda-next').disabled=true;
  try{
   const result=await request('/api/admin/agenda?'+params());if(epoch!==version)return;if(offset&&offset>=result.total){offset=Math.max(0,Math.floor((result.total-1)/50)*50);return load();}data=result;timezone=result.timezone;
   const selected=field('serviceId').value;field('serviceId').replaceChildren(new Option('Todos los servicios',''));for(const s of result.services)field('serviceId').add(new Option(s.name,s.id));field('serviceId').value=selected;
   const teacher=field('instructorId'),chosen=teacher.value;teacher.replaceChildren(new Option('Todos los profesores',''),new Option('Sin profesor asignado · agenda única','unassigned'));
   for(const i of result.instructors||[]){const duplicate=result.instructors.filter(other=>other.name===i.name).length>1;teacher.add(new Option(i.name+(duplicate?' · '+i.id.slice(-6):'')+({active:'',paused:' · Pausado',historical:' · Historial'}[i.state]||''),i.id));}
   if(chosen&&!Array.from(teacher.options).some(o=>o.value===chosen))teacher.add(new Option('Profesor no configurado',chosen));teacher.value=chosen;
   root.querySelector('#agenda-connection').textContent='Zona horaria: '+timezone+' · '+(result.calendar.connected?'Google conectado'+(result.calendar.selected?' · '+result.calendar.selected.name:' · Falta seleccionar calendario'):'Google sin conectar')+' · '+(result.booking.enabled?'Reservas habilitadas':'Reservas desactivadas');
   say(result.total?`${offset+1}–${offset+result.items.length} de ${result.total} citas. La lista muestra registros de Nexo; no actualiza Google automáticamente.`:'No hay citas para estos filtros.');
   root.querySelector('#empty').hidden=!!result.items.length;
   root.querySelector('#agenda-prev').disabled=offset===0;root.querySelector('#agenda-next').disabled=offset+result.items.length>=result.total;
   const list=field('view').value==='list';root.querySelector('.table-scroll').hidden=!list;cards.hidden=list;
   const groups=new Map();
   if(!list&&field('from').value){for(let day=field('from').value;day<=field('to').value;day=shift(day,1)){const box=el('section',undefined,'agenda-day');box.append(el('h3',new Intl.DateTimeFormat('es',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'}).format(new Date(day+'T12:00:00Z'))));groups.set(day,box);cards.append(box);}}
   for(const a of result.items){
    const row=el('tr');row.dataset.id=a.id;
    const person=el('td',a.customerName);person.append(el('small',a.email));
    row.append(el('td',a.code),el('td',a.serviceName+(a.instructorName?' · '+a.instructorName:'')+(a.provider==='local'?' · Demo local':'')),person,el('td',stamp(a.slot)),el('td',bookingState(a),a.status));
    const sync=el('td',syncStates[a.sync.state]);sync.append(el('small',a.sync.checkedAt?stamp(a.sync.checkedAt):''));row.append(sync);
    const actions=el('td');actions.append(button('Ver detalle',()=>open(a.id)));
    if(a.status!=='cancelled')actions.append(button('Cancelar',()=>open(a.id,true)));row.append(actions);rows.append(row);
    if(!list){const card=button(time(a.slot)+' · '+a.customerName,()=>open(a.id));card.classList.add('agenda-card',a.status);card.append(el('small',a.serviceName+(a.instructorName?' · '+a.instructorName:'')),el('small',bookingState(a)),el('small',syncStates[a.sync.state]));groups.get(dateKey(a.slot,timezone))?.append(card);}
   }
   for(const box of groups.values())if(box.children.length===1)box.append(el('p','Sin citas de Nexo en esta página.','muted'));
  }catch(e){if(epoch===version)say(e.message||'No se pudo cargar la agenda.');}
 }
 async function open(id,cancelling=false){
  const epoch=++detailVersion,session=version;content.replaceChildren(el('p','Cargando cita…'));if(!dialog.open)dialog.showModal();
  const alive=()=>epoch===detailVersion&&session===version&&dialog.open;
  try{
   const a=await request('/api/admin/agenda/'+encodeURIComponent(id));if(!alive())return;content.replaceChildren();
   content.append(el('h3',a.serviceName),el('p','Código: '+a.code),el('p',a.customerName+' · '+a.email),el('p',stamp(a.slot)+(a.end?' – '+time(a.end):'')+' · '+(a.timezone||timezone)),el('p','Estado: '+bookingState(a)));
   content.append(el('p',a.priceCents===null?'Precio por confirmar':new Intl.NumberFormat('es',{style:'currency',currency:a.currency||'USD'}).format(a.priceCents/100)));
   content.append(el('p',syncStates[a.sync.state]+(a.sync.checkedAt?' · '+stamp(a.sync.checkedAt):''),'agenda-sync'));
   if(a.instructorName)content.append(el('p','Profesor: '+a.instructorName));
   content.append(el('p','Correo de confirmación: '+({sent:'enviado',sending:'en proceso',uncertain:'envío por comprobar',failed:'falló',not_sent:'sin enviar',unavailable:'no disponible'}[a.mailStatus]||a.mailStatus)));
   const feedback=el('p','','notice');feedback.setAttribute('role','status');feedback.hidden=true;
   async function act(work){if(actionBusy)return;actionBusy=true;feedback.hidden=false;feedback.textContent='Procesando…';content.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{await work();if(!alive())return;dialog.close();await load();}
    catch(e){if(alive()){feedback.textContent=(e.message||'No se pudo confirmar la operación.')+' Compruebe el estado antes de repetirla.';content.querySelectorAll('button').forEach(b=>b.disabled=false);}}
    finally{actionBusy=false;}
   }
   if(a.provider==='google-calendar'&&a.status!=='cancelled')content.append(button('Verificar con Google',()=>act(()=>request('/api/admin/calendar/bookings/'+id+'/verify',{method:'POST',body:'{}'}))));
   if(a.provider==='google-calendar'&&a.status==='reserved'&&!['sent','sending','uncertain'].includes(a.mailStatus))content.append(button('Enviar confirmación',()=>{if(confirm('¿Enviar la confirmación al correo de esta cita?'))act(async()=>{const r=await request('/api/admin/calendar/bookings/'+id+'/receipt',{method:'POST',body:'{}'});if(r.mailStatus!=='sent')throw Error('No se confirmó la entrega del correo.');});}));
   if(a.status!=='cancelled'){
    const form=el('form');form.id='cancel-appointment-form';const label=el('label','Motivo de cancelación'),select=el('select');select.name='reason';select.required=true;
    for(const [v,t] of [['','Seleccione un motivo'],['Error al crear la reserva','Error al crear la reserva'],['Falta de pago','Falta de pago'],['Solicitud del cliente','Solicitud del cliente'],['Cambio de horario','Cambio de horario'],['Otro','Otro motivo']])select.add(new Option(t,v));label.append(select);
    const extraLabel=el('label','Explique el motivo'),extra=el('textarea');extra.name='details';extra.maxLength=300;extra.minLength=3;extraLabel.append(extra);extraLabel.hidden=true;
    select.onchange=()=>{extraLabel.hidden=select.value!=='Otro';extra.required=select.value==='Otro';};
    const submit=el('button','Confirmar cancelación','agenda-danger');submit.type='submit';
    form.append(el('h3','Cancelar esta cita'),label,extraLabel,el('p','Conservará el historial. Google debe confirmar la cancelación antes de liberar el horario. Esta acción no envía un correo al cliente ni procesa reembolsos.'),submit);
    form.onsubmit=e=>{e.preventDefault();const reason=select.value==='Otro'?extra.value.trim():select.value;if(!form.reportValidity())return;if(!confirm('¿Cancelar la cita '+a.code+' de '+a.customerName+' del '+stamp(a.slot)+'? Motivo: '+reason))return;act(()=>request('/api/admin/appointments/'+id,{method:'PATCH',body:JSON.stringify({status:'cancelled',reason})}));};content.append(form);if(cancelling)select.focus();
   }
   content.append(feedback,el('h3','Historial de cancelación'));
   if(a.transfers?.length){content.append(el('h3','Historial de reasignaciones'));for(const t of a.transfers){content.append(el('p',stamp(t.createdAt)+' · '+t.sourceName+' → '+t.targetName+' · '+({moved:'Trasladada',pending:'Por verificar: ambos horarios protegidos',failed:'Rechazada'}[t.status])+' · '+t.actor+' · '+t.reason));if(t.status==='pending')content.append(button('Verificar traslado',()=>act(async()=>{const result=await request('/api/admin/transfers/'+t.id+'/verify',{method:'POST',body:'{}'});if(result.status==='pending')throw Error('Google todavía no confirma el traslado. Se mantienen protegidos ambos horarios.');})));}}
   if(!a.cancellations.length)content.append(el('p','Sin solicitudes de cancelación.'));
   for(const h of a.cancellations)content.append(el('p',stamp(h.createdAt)+' · '+h.actor+' · '+h.reason+' · '+({confirmed:'Confirmada',pending:'En proceso',uncertain:'Por comprobar'}[h.outcome]||h.outcome)));
  }catch(e){if(alive())content.replaceChildren(el('p',e.message,'notice'));}
 }
 filters.onsubmit=e=>{e.preventDefault();offset=0;range();load();};
 field('view').onchange=()=>{offset=0;range();load();};
 root.querySelector('#agenda-today').onclick=()=>{field('from').value=dateKey(Date.now(),timezone);if(field('view').value==='list')field('view').value='day';range();offset=0;load();};
 root.querySelector('#agenda-reset').onclick=()=>{filters.reset();offset=0;load();};
 for(const [id,days] of [['agenda-back',-1],['agenda-forward',1]])root.querySelector('#'+id).onclick=()=>{if(field('view').value==='list')field('view').value='day';field('from').value=shift(field('from').value||dateKey(Date.now(),timezone),days*(field('view').value==='week'?7:1));range();offset=0;load();};
 root.querySelector('#agenda-prev').onclick=()=>{offset=Math.max(0,offset-50);load();};root.querySelector('#agenda-next').onclick=()=>{offset+=50;load();};
 dialog.querySelector('#close-appointment').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{detailVersion++;content.replaceChildren();});
 root.querySelector('#agenda-check-availability').onclick=async()=>{
  const box=root.querySelector('#agenda-availability'),epoch=version;box.replaceChildren();
  if(!field('serviceId').value){box.append(el('p','Seleccione un servicio para consultar sus horarios.'));return;}
  const serviceId=field('serviceId').value,instructorId=field('instructorId').value,teacherLabel=field('instructorId').selectedOptions[0].textContent,day=field('from').value||dateKey(Date.now(),timezone);box.append(el('p','Consultando Google Calendar…'));
  try{const result=await request('/api/admin/agenda-availability?'+new URLSearchParams({serviceId,instructorId}));if(epoch!==version)return;
   box.replaceChildren(el('h3','Horarios del '+day),el('p',instructorId?teacherLabel:'Todos los profesores'),el('p','Comprobados a las '+time(Date.now())+'. La disponibilidad puede cambiar; no se reserva desde esta vista.'));
   const slots=result.schedule.filter(s=>dateKey(s.slot,result.timezone)===day),grid=el('div',undefined,'agenda-slots');
   for(const s of slots)grid.append(el('span',time(s.slot)+' · '+(s.available?((s.remaining||1)===1?'1 cupo disponible':s.remaining+' cupos disponibles'):{occupied:'Ocupado',past:'Ya pasó',notice:'Fuera de anticipación'}[s.reason]),s.available?'slot-free':'slot-busy'));
   if(!slots.length)box.append(el('p','Sin horarios en el horizonte de reservas para este día.'));box.append(grid);
  }catch(e){if(epoch===version)box.replaceChildren(el('p',e.message,'notice'));}
 };
 // Invalidar una consulta pendiente si el operador cambia filtros antes de que termine.
 for(const name of ['serviceId','instructorId','from','to'])field(name).addEventListener('change',()=>{version++;root.querySelector('#agenda-availability').replaceChildren();});
 return {load,reset(){transfers.reset();version++;detailVersion++;offset=0;data=null;filters.reset();field('instructorId').replaceChildren(new Option('Todos los profesores',''),new Option('Sin profesor asignado · agenda única','unassigned'));rows.replaceChildren();cards.replaceChildren();say('');root.querySelector('#agenda-connection').textContent='';root.querySelector('#agenda-availability').replaceChildren();dialog.close();content.replaceChildren();}};
}
