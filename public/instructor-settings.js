/**
 * NEXO · GUÍA DEL MÓDULO: public/instructor-settings.js
 * Editor de recursos de agenda. Entrada: reglas, servicios y request autorizado.
 * Salida: element y value() con modo/profesores; no persiste hasta guardar reglas.
 * IDs de Calendar son privados de administración. Pausar no modifica citas existentes.
 */
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
// Solo se elimina el prefijo decorativo conocido. Nunca se deduce identidad desde el ID/correo.
export const calendarInstructorName=name=>String(name||'').replace(/^\s*clases\s*[·:|–—-]\s*/i,'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
export function instructorSettings({rules,services,request}){
 let alive=true,loading=false,loaded=false,calendars=[],counter=0;const rows=[];
 const root=el('section');root.className='booking-wide';
 const modeLabel=el('label','Organización de la agenda');modeLabel.className='field';const mode=el('select');mode.id='booking-assignment';mode.add(new Option('Un calendario · un cupo por horario','single'));mode.add(new Option('Calendarios por profesor · el alumno elige','instructors'));mode.value=rules.assignment||'single';modeLabel.append(mode);root.append(modeLabel);
 const group=el('section');group.id='booking-instructors';group.append(el('h3','Profesores y calendarios'),el('p','Cada calendario debe estar compartido con la cuenta conectada, con permiso para editar eventos, y aparecer en su lista de Google Calendar. Todos usan el horario del negocio; registre ausencias y descansos como eventos ocupados en el calendario del profesor.'));
 const notice=el('p');notice.role='status';const list=el('div'),refresh=el('button','Actualizar calendarios de profesores'),add=el('button','Añadir profesor');for(const b of [refresh,add]){b.type='button';b.className='secondary';}refresh.id='instructor-refresh';add.id='instructor-add';group.append(refresh,notice,list,add,el('p','Pausar o quitar un profesor no cancela ni mueve sus citas existentes. Conserve acceso al calendario mientras tenga citas pendientes de gestionar.'));root.append(group);
 function fill(select){const current=select.value||select.dataset.saved||'';select.replaceChildren(new Option('Seleccione un calendario',''));for(const c of calendars){const option=new Option(c.name+' · '+c.id,c.id);option.disabled=!c.writable;select.add(option);}if(current&&!calendars.some(c=>c.id===current))select.add(new Option(current+' · comprobar acceso',current));select.value=current;}
 async function load(){if(loading)return;loading=true;refresh.disabled=true;notice.textContent='Consultando calendarios…';try{const result=await request('GET','/calendars');if(!alive)return;calendars=result.items;loaded=true;for(const row of rows){fill(row.calendar);row.refreshSuggestion();}notice.textContent='Guardar comprobará permisos sin crear eventos.';}catch(e){if(alive)notice.textContent=e.message;}finally{loading=false;if(alive)refresh.disabled=false;}}
 function addRow(value={}){if(rows.length>=10){notice.textContent='Puede configurar hasta 10 profesores.';return;}const key=++counter,card=el('fieldset');card.className='instructor-row';card.append(el('legend','Profesor'));
  const nameLabel=el('label','Nombre que verá el alumno'),name=el('input');name.maxLength=80;name.className='instructor-name';name.value=value.name||'';nameLabel.append(name);
  const calendarLabel=el('label','Calendario del profesor'),calendar=el('select');calendar.className='instructor-calendar';calendar.dataset.saved=value.calendarId||'';fill(calendar);calendarLabel.append(calendar);
  // Un nombre guardado/editado se conserva, incluso al actualizar la lista o cambiar calendario.
  let manual=!!value.name;const useName=el('button','Usar nombre del calendario');useName.type='button';useName.className='secondary instructor-use-name';
  const suggested=()=>calendarInstructorName(calendars.find(c=>c.id===calendar.value)?.name);
  const refreshSuggestion=()=>{useName.disabled=!suggested();};refreshSuggestion();
  name.oninput=()=>{manual=!!name.value.trim();};calendar.onchange=()=>{calendar.dataset.saved=calendar.value;refreshSuggestion();if(!manual||!name.value.trim()){name.value=suggested();manual=false;}};
  useName.onclick=()=>{const next=suggested();if(!next)return;if(name.value.trim()&&name.value.trim()!==next&&!confirm('¿Reemplazar el nombre mostrado al alumno por «'+next+'»?'))return;name.value=next;manual=false;};
  const activeLabel=el('label');activeLabel.className='field check-row';const active=el('input');active.type='checkbox';active.className='instructor-active';active.checked=value.active??true;activeLabel.append(active,el('span','Disponible para nuevas reservas'));
  const serviceBox=el('div');serviceBox.className='booking-services';serviceBox.role='group';serviceBox.setAttribute('aria-label','Servicios del profesor '+key);serviceBox.append(el('p','Servicios que imparte'));const checks=[];
  for(const s of services){const label=el('label');label.className='field check-row';const check=el('input');check.type='checkbox';check.value=s.id;check.checked=(value.serviceIds||rules.serviceIds).includes(s.id);label.append(check,el('span',s.name));serviceBox.append(label);checks.push(check);}
  const row={name,calendar,active,checks,refreshSuggestion};rows.push(row);const remove=el('button','Quitar profesor de nuevas reservas');remove.type='button';remove.className='secondary';remove.onclick=()=>{if(!confirm('¿Quitar este profesor de las nuevas reservas? Sus citas actuales se conservan.'))return;rows.splice(rows.indexOf(row),1);card.remove();};card.append(calendarLabel,nameLabel,useName,el('p','Al elegir un calendario, completamos el nombre si está vacío. Puede corregirlo; sus cambios se conservan.'),activeLabel,serviceBox,remove);list.append(card);
 }
 for(const row of rules.instructors||[])addRow(row);add.onclick=()=>addRow();refresh.onclick=load;mode.onchange=()=>{group.hidden=mode.value!=='instructors';if(!group.hidden&&!loaded)load();};mode.onchange();
 return {element:root,value:()=>({assignment:mode.value,instructors:rows.map(r=>({name:r.name.value.trim(),calendarId:r.calendar.value,active:r.active.checked,serviceIds:r.checks.filter(c=>c.checked).map(c=>c.value)}))}),destroy(){alive=false;root.replaceChildren();}};
}
