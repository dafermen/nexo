/**
 * NEXO · GUÍA DEL MÓDULO: public/admin-reports.js
 * Dashboard privado: filtros, tabla, CSV y respaldo cifrado. Entrada: request/download autenticados.
 * Salida: DOM con textContent. generation descarta respuestas después de salir o cambiar filtros.
 * Las tarjetas usan el período; filtros de texto/canal/estado afectan únicamente la tabla.
 */
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const labels={reserved:'Confirmada',cancelled:'Cancelada',pending:'Pendiente',draft:'Borrador',published:'Publicada',dismissed:'Descartada',queued:'En cola',sending:'Enviando',sent:'Aceptado por correo',uncertain:'Envío incierto',skipped:'Omitido',not_sent:'Sin envío',unavailable:'No configurado',text:'Texto',voice:'Voz',video:'Video',createdAt:'Fecha de creación',slot:'Fecha de cita',customerName:'Nombre',serviceName:'Servicio',status:'Estado',question:'Pregunta',serviceId:'Servicio',channel:'Canal',recipient:'Administrador',attempts:'Intentos'};
const types={appointments:{sorts:['createdAt','slot','customerName','serviceName','status'],states:['reserved','pending','cancelled']},questions:{sorts:['createdAt','question','serviceId','status','channel'],states:['pending','draft','published','dismissed']},notifications:{sorts:['createdAt','recipient','status','attempts'],states:['queued','sending','sent','uncertain','skipped']}};
const reasons={clarify:'Necesitó aclaración',intent_clarify:'Necesitó aclaración',agenda_clarify:'Faltaban datos de la cita',unknown_fact:'Información no disponible',intent_unknown:'Consulta no interpretada',guidance_unknown:'Orientación pendiente',interpretation_unavailable:'Interpretación no disponible',ai_unavailable:'IA no disponible',response_error:'No se completó la respuesta',catalog:'Dato del servicio pendiente',intent_catalog:'Dato del servicio pendiente',faq:'Respuesta con información pendiente'};
export function installReports({root,request,download}){
 const $=id=>root.querySelector('#'+id),form=$('report-filters'),f=form.elements;
 let generation=0,active=false,offset=0,total=0,timezone='UTC',services=new Map();
 const params=()=>new URLSearchParams([...new FormData(form),['offset',String(offset)]]);
 const notify=text=>{$('report-notice').textContent=text;};
 function options(select,values,empty){select.replaceChildren();if(empty){const o=node('option',empty);o.value='';select.append(o);}for(const value of values){const o=node('option',labels[value]||value);o.value=value;select.append(o);}}
 function changeType(){options(f.sort,types[f.type.value].sorts);options(f.status,types[f.type.value].states,'Todos los estados');f.channel.disabled=f.type.value!=='questions';f.channel.value='';}
 function display(key,value){if(['createdAt','updatedAt','slot'].includes(key)&&value)return new Intl.DateTimeFormat('es',{dateStyle:'short',timeStyle:'short',timeZone:timezone}).format(new Date(value));if(key==='reason')return reasons[value]||'Revisar contexto';if(key==='serviceId')return services.get(value)||value||'General';if(key==='status'||key==='channel'||key==='mailStatus')return labels[value]||value;return value??'—';}
 async function refresh(summary=true){if(!active)return;const epoch=++generation;notify('Cargando…');$('report-prev').disabled=true;$('report-next').disabled=true;
  try{
   const query=params(),[page,stats]=await Promise.all([request('/api/admin/reports?'+query),summary?request('/api/admin/reports/summary?'+query):null]);
   if(epoch!==generation||!active)return;timezone=page.timezone;
   if(stats){
    if(!f.from.value)f.from.value=stats.from;if(!f.to.value)f.to.value=stats.to;
    const selected=f.serviceId.value;services=new Map(stats.services.map(s=>[s.id,s.name]));f.serviceId.replaceChildren(new Option('Todos los servicios',''));for(const s of stats.services)f.serviceId.add(new Option(s.name,s.id));f.serviceId.value=selected;
    $('report-period').textContent=`${stats.from} al ${stats.to} · ${timezone}. Las tarjetas resumen todo el período. Los demás filtros afectan la tabla. Datos conservados en Nexo; las citas se cuentan por creación y su estado actual. Se excluyen las citas antiguas de demostración.`;
    const cards=[['Atenciones iniciadas',stats.conversations],['Consultas',stats.turns.total],['Respuestas sin llamada a IA',stats.turns.withoutAi],['Preguntas por revisar',stats.reviews.pending],['Citas creadas',stats.bookings.total],['Confirmadas actualmente',stats.bookings.reserved],['Canceladas',stats.bookings.cancelled],['Citas en verificación',stats.bookings.pending],['Consultas a IA',stats.turns.aiCalls],['Tokens registrados',stats.turns.inputTokens+stats.turns.outputTokens],['Respuesta promedio',`${(stats.turns.averageMs/1000).toFixed(1)} s`]];
    $('report-cards').replaceChildren(...cards.map(([label,value])=>{const card=node('article');card.append(node('span',label),node('strong',String(value)));return card;}));
    $('report-channels').textContent='Consultas por canal: '+(stats.channels.map(c=>(labels[c.channel]||c.channel)+': '+c.total).join(' · ')||'Sin datos');
    $('report-topics').textContent='Temas más consultados: '+(stats.topics.map(t=>(services.get(t.serviceId)||'General')+': '+t.total).join(' · ')||'Sin datos');
    $('report-mail').textContent=(stats.mailReady?'Correo configurado. ':'Correo no configurado; los avisos quedarán en cola. ')+(stats.adminRecipients.length?'Administradores: '+stats.adminRecipients.join(', '):'No hay administradores configurados.')+' Avisos del período: '+(stats.notifications.map(n=>(labels[n.status]||n.status)+': '+n.total).join(' · ')||'sin avisos')+'.';
   }
   total=page.total;const tr=node('tr');for(const col of page.columns){const th=node('th');th.scope='col';if(page.sorts.includes(col.key)){const button=node('button',col.label.replace(' (UTC)','')+(f.sort.value===col.key?(f.direction.value==='asc'?' ↑':' ↓'):''));button.type='button';button.className='report-sort';button.addEventListener('click',()=>{f.direction.value=f.sort.value===col.key&&f.direction.value==='asc'?'desc':'asc';f.sort.value=col.key;offset=0;refresh(false);});th.setAttribute('aria-sort',f.sort.value===col.key?(f.direction.value==='asc'?'ascending':'descending'):'none');th.append(button);}else th.textContent=col.label.replace(' (UTC)','');tr.append(th);}tr.append(node('th','Acción'));$('report-head').replaceChildren(tr);
   $('report-body').replaceChildren(...page.items.map(item=>{const row=node('tr');for(const col of page.columns)row.append(node('td',display(col.key,item[col.key])));const action=node('td');
    if(f.type.value==='questions'){const a=node('a','Revisar respuestas');a.href='/reviews';action.append(a);}
    else if(f.type.value==='appointments'){const a=node('a','Abrir agenda');a.href='#admin-agenda';action.append(a);}
    else if(item.status==='uncertain'){const button=node('button','Reintentar aviso');button.type='button';button.className='secondary';button.addEventListener('click',async()=>{if(!confirm('El correo podría haberse entregado. ¿Desea reintentar el aviso a '+item.recipient+'?'))return;button.disabled=true;try{await request('/api/admin/notifications/'+item.id+'/retry',{method:'POST',body:JSON.stringify({confirm:true})});if(epoch===generation)await refresh();}catch(e){if(epoch===generation)notify(e.message);button.disabled=false;}});action.append(button);}row.append(action);return row;}));
   notify(total?`${offset+1}–${Math.min(offset+page.limit,total)} de ${total} registros · Página ${Math.floor(offset/page.limit)+1} de ${Math.ceil(total/page.limit)}`:'No hay registros para estos filtros.');$('report-prev').disabled=offset===0;$('report-next').disabled=offset+page.limit>=total;
  }catch(e){if(epoch===generation){$('report-body').replaceChildren();notify(e.message);}}
 }
 form.addEventListener('submit',e=>{e.preventDefault();offset=0;refresh();});f.type.addEventListener('change',()=>{changeType();offset=0;refresh();});
 $('report-prev').addEventListener('click',()=>{offset=Math.max(0,offset-Number(f.limit.value));refresh(false);});$('report-next').addEventListener('click',()=>{offset+=Number(f.limit.value);refresh(false);});
 $('report-reset').addEventListener('click',()=>{form.reset();changeType();offset=0;refresh();});
 $('report-export').addEventListener('click',async()=>{const epoch=generation;$('report-export').disabled=true;try{await download('/api/admin/reports/export?'+params(),{},'nexo-'+f.type.value+'.csv');if(epoch===generation)notify('CSV preparado con todos los resultados filtrados, hasta 10.000 filas. Guárdelo en una ubicación privada.');}catch(e){if(epoch===generation)notify(e.message);}finally{$('report-export').disabled=false;}});
 $('backup-form').addEventListener('submit',async e=>{e.preventDefault();const pass=$('backup-password'),confirmPass=$('backup-confirm'),epoch=generation;if(pass.value!==confirmPass.value){$('backup-notice').textContent='Las contraseñas no coinciden.';return;}
  const password=pass.value;pass.value='';confirmPass.value='';$('backup-download').disabled=true;$('backup-notice').textContent='Preparando respaldo cifrado…';
  try{await download('/api/admin/backups',{method:'POST',body:JSON.stringify({password})},'nexo-base.nexo');if(epoch===generation)$('backup-notice').textContent='Respaldo descargado. Conserve la contraseña por separado: Nexo no la guarda y no puede recuperarla.';}catch(e){if(epoch===generation)$('backup-notice').textContent=e.message;}finally{$('backup-download').disabled=false;}
 });
 changeType();
 return {async load(){active=true;await refresh();},reset(){active=false;generation++;offset=0;form.reset();changeType();for(const id of ['report-body','report-head','report-cards'])$(id).replaceChildren();for(const id of ['report-notice','report-period','report-channels','report-topics','report-mail','backup-notice'])$(id).textContent='';$('backup-form').reset();services.clear();}};
}
