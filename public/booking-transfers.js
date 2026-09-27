/**
 * NEXO · GUÍA DEL MÓDULO: public/booking-transfers.js
 * Asistente administrativo: origen/destino, vista previa, selección explícita y resultado por cita.
 * request exige sesión; cada movimiento revalida en servidor. epoch detiene lotes al cerrar/salir.
 * Máximo diez citas por confirmación; no reintenta automáticamente resultados inciertos.
 */
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function installTransfers({request,onChanged}){
 const dialog=document.getElementById('transfer-dialog'),content=document.getElementById('transfer-content'),close=document.getElementById('transfer-close');let epoch=0,busy=false;
 close.onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>{epoch++;content.replaceChildren();});
 async function open(){const version=++epoch;busy=false;close.disabled=false;content.replaceChildren(el('p','Cargando profesores…'));dialog.showModal();const alive=()=>version===epoch&&dialog.open;
  try{const [configuration,agenda]=await Promise.all([request('/api/admin/calendar/booking-settings'),request('/api/admin/agenda')]);if(!alive())return;const rules=configuration.rules,teachers=rules.instructors||[];
   if(rules.assignment!=='instructors'||!teachers.some(i=>i.active)){content.replaceChildren(el('p','Configure y active los calendarios por profesor en Configuración → Conexiones.'));return;}
   const form=el('form'),source=el('select'),target=el('select'),reason=el('input'),pause=el('input');source.id='transfer-source';target.id='transfer-target';reason.id='transfer-reason';reason.required=true;reason.minLength=3;reason.maxLength=300;pause.type='checkbox';pause.id='transfer-pause';source.required=target.required=true;
   source.add(new Option('Seleccione origen',''));source.add(new Option('Sin profesor asignado · agenda única','unassigned'));target.add(new Option('Seleccione destino',''));
   const labelFor=(i,list)=>i.name+(list.filter(other=>other.name===i.name).length>1?' · '+i.id.slice(-6):'');
   for(const i of agenda.instructors||[])source.add(new Option(labelFor(i,agenda.instructors),i.id));for(const i of teachers.filter(i=>i.active))target.add(new Option(labelFor(i,teachers),i.id));
   for(const [caption,node] of [['Profesor de origen',source],['Profesor que recibirá las citas',target],['Motivo',reason]]){const label=el('label',caption);label.append(node);form.append(label);}
   const check=el('label');check.className='check';check.append(pause,document.createTextNode('Deshabilitar al profesor de origen para nuevas reservas al confirmar'));form.append(check);
   const preview=el('button','Revisar citas futuras');preview.id='transfer-preview';preview.type='submit';preview.className='primary';form.append(preview);
   const feedback=el('p');feedback.role='status';const list=el('div');list.id='transfer-preview-list';content.replaceChildren(el('p','Se conserva día, hora y código. Solo se mueven citas de Nexo confirmadas y futuras. No se envían correos de cambio: avise a los alumnos afectados.'),form,feedback,list);
   let current=null,checks=[];
   function clear(){current=null;checks=[];list.replaceChildren();feedback.textContent='';pause.disabled=source.value==='unassigned'||!teachers.some(i=>i.id===source.value&&i.active);if(pause.disabled)pause.checked=false;}
   source.onchange=clear;target.onchange=clear;clear();
   const setBusy=value=>{busy=value;close.disabled=value;form.querySelectorAll('input,select,button').forEach(n=>n.disabled=value);if(!value)pause.disabled=source.value==='unassigned'||!teachers.some(i=>i.id===source.value&&i.active);};
   form.onsubmit=async e=>{e.preventDefault();if(busy||!form.reportValidity())return;setBusy(true);list.replaceChildren();feedback.textContent='Comprobando horarios…';
    try{const data=await request('/api/admin/transfers/preview',{method:'POST',body:JSON.stringify({sourceId:source.value,targetId:target.value})});if(!alive())return;current=data;checks=[];feedback.textContent=data.items.length+' citas futuras. Seleccione hasta 10 para este traslado.';
     for(const item of data.items){const label=el('label');label.className='transfer-item';const input=el('input');input.type='checkbox';input.disabled=!item.eligible;input.dataset.bookingId=item.id;const text=el('span',item.code+' · '+item.customerName+' · '+item.serviceName+' · '+new Intl.DateTimeFormat('es',{timeZone:item.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(item.slot))+' — '+(item.eligible?'Disponible':item.reason));label.append(input,text);list.append(label);checks.push({input,item});}
     const confirm=el('button','Confirmar traslado de citas seleccionadas');confirm.type='button';confirm.id='transfer-confirm';confirm.className='primary';list.append(confirm);
     confirm.onclick=async()=>{if(busy||!current||!form.reportValidity())return;const selected=checks.filter(c=>c.input.checked&&c.item.eligible);if(!selected.length||selected.length>10){feedback.textContent='Seleccione entre 1 y 10 citas disponibles.';return;}
      if(!window.confirm('¿Mover '+selected.length+' citas a '+current.targetName+(pause.checked?' y deshabilitar al profesor de origen':'')+'? Las citas con conflicto no se mueven. Debe avisar a los alumnos del cambio.'))return;
      const payload={sourceId:current.sourceId,targetId:current.targetId,reason:reason.value.trim()},disable=pause.checked;setBusy(true);confirm.disabled=true;for(const c of checks)c.input.disabled=true;feedback.textContent='Procesando…';let stopped=false;
      try{
       if(disable){const saved=await request('/api/admin/calendar/booking-settings',{method:'PUT',body:JSON.stringify({...rules,revision:current.revision,instructors:teachers.map(i=>i.id===payload.sourceId?{...i,active:false}:i)})});Object.assign(rules,saved.rules);for(const i of teachers)Object.assign(i,saved.rules.instructors.find(other=>other.id===i.id));for(const option of target.options)if(option.value)option.disabled=!teachers.some(i=>i.id===option.value&&i.active);}
       for(const c of selected){if(!alive()){stopped=true;break;}const result=await request('/api/admin/transfers',{method:'POST',body:JSON.stringify({...payload,id:crypto.randomUUID(),bookingId:c.item.id})});if(!alive()){stopped=true;break;}c.input.parentElement.append(el('strong',result.status==='moved'?' · Trasladada':result.status==='failed'?' · Rechazada; continúa en origen':' · Por verificar en el detalle de la cita'));}
       if(alive())feedback.textContent='Proceso terminado. Revise el resultado de cada cita. Las no seleccionadas y los conflictos permanecen en origen.';
      }catch(error){stopped=true;if(alive())feedback.textContent=error.message+' Se detuvo el lote; revise el detalle de las citas antes de repetir.';}
      finally{if(alive()){setBusy(false);current=null;confirm.disabled=true;preview.textContent=stopped?'Volver a revisar las citas':'Actualizar citas pendientes';onChanged();}}
     };
    }catch(error){if(alive()){current=null;feedback.textContent=error.message;}}finally{if(alive())setBusy(false);}
   };
  }catch(e){if(alive())content.replaceChildren(el('p',e.message));}
 }
 return {open,reset(){epoch++;busy=false;close.disabled=false;dialog.close();content.replaceChildren();}};
}
