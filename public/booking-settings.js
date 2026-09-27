/**
 * NEXO · GUÍA DEL MÓDULO: public/booking-settings.js
 * Editar reglas de agenda para servicios publicados.
 * Entrada: request, catálogo y configuración de reservas.
 * Salida: Formulario de reglas y resultado de guardado.
 * Estado importante: revision detecta edición simultánea; serviceIds restringe qué servicios
 * admiten reserva.
 * Efectos y límites: No fabrica slots en el navegador; disponibilidad real la calcula el servidor.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {instructorSettings} from './instructor-settings.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function bookingSettings({request}){
 const panel=el('section');panel.id='booking-settings';panel.className='calendar-panel';let alive=true,rules,inputs=[],enabled,choices=[],saving=false,instructorEditor;
 const notice=el('p');notice.setAttribute('role','status');
 panel.append(el('h2','Reservas desde el kiosco'),el('p','Use una agenda única o un calendario por profesor. Cada profesor ofrece un cupo por horario. Se respetan la duración del servicio, el horario del negocio y los eventos ocupados de Google.'),notice);
 function render(data){rules=data.rules;inputs=[];choices=[];
  const content=el('fieldset');content.className='booking-grid booking-config';
  const on=el('label');on.className='field check-row booking-wide';enabled=el('input');enabled.type='checkbox';enabled.checked=rules.enabled;enabled.id='booking-enabled';on.append(enabled,el('span','Permitir reservas en línea'));content.append(on);
  content.append(el('p','Horario vigente: '+data.center.hours));
  const services=el('div');services.className='booking-wide booking-services';services.setAttribute('role','group');services.setAttribute('aria-label','Servicios que se pueden reservar');services.append(el('h3','Servicios que se pueden reservar'));
  for(const s of data.services){const label=el('label');label.className='field check-row';const check=el('input');check.type='checkbox';check.value=s.id;check.checked=rules.serviceIds.includes(s.id);check.disabled=!s.active||!s.duration||s.duration>480;label.append(check,el('span',s.name+' · '+(s.duration?s.duration+' min':'confirme la duración en Administración')));services.append(label);choices.push(check);}
  content.append(services);
  instructorEditor=instructorSettings({rules,services:data.services,request});content.append(instructorEditor.element);
  for(const [key,label,min,max] of [['horizonDays','Ofrecer horarios durante los próximos días',1,30],['noticeMinutes','Anticipación mínima (minutos)',60,10080]]){const wrap=el('label',label);wrap.className='field';const input=el('input');input.type='number';input.min=min;input.max=max;input.value=rules[key];input.id='booking-'+key;inputs.push([key,input]);wrap.append(input);content.append(wrap);}
  const wrap=el('label','Separación entre opciones de inicio');wrap.className='field';const step=el('select');step.id='booking-step';for(const n of [15,30,60]){const o=el('option',n+' minutos');o.value=n;step.append(o);}step.value=rules.stepMinutes;wrap.append(step);content.append(wrap);
  const save=el('button','Guardar reglas de reservas');save.type='button';save.className='secondary';save.id='booking-save';save.onclick=async()=>{if(saving)return;const values=Object.fromEntries(inputs.map(([k,n])=>[k,Number(n.value)]));saving=true;content.disabled=true;notice.textContent='Guardando…';try{const r=await request('PUT','/booking-settings',{revision:rules.revision,enabled:enabled.checked,serviceIds:choices.filter(c=>c.checked).map(c=>c.value),stepMinutes:Number(step.value),...values,...instructorEditor.value()});if(alive){rules=r.rules;notice.textContent='Reglas guardadas. El kiosco se actualizará automáticamente. Las citas existentes conservan su calendario.';}}catch(e){if(alive)notice.textContent=e.message;}finally{saving=false;if(alive)content.disabled=false;}};
  content.append(save,el('p','Los datos del alumno se guardan en Nexo y en el evento privado de Google. No se envían invitaciones ni se cobran importes. Para revisar o cancelar citas, abra Administración.'));
  panel.append(content);
 }
 request('GET','/booking-settings').then(data=>{if(alive)render(data);}).catch(e=>{if(alive)notice.textContent=e.message;});
 return {element:panel,destroy(){alive=false;instructorEditor?.destroy();panel.replaceChildren();}};
}
