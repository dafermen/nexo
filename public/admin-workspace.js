/** NEXO · GUÍA DEL MÓDULO: public/admin-workspace.js
 * Entrada: dashboard existente y resumen autorizado. Salida: navegación por tareas.
 * Reubica nodos conservando IDs y eventos; no consulta datos privados ni modifica permisos.
 */
export function installAdminWorkspace(){
 const dashboard=document.getElementById('dashboard'),reports=document.getElementById('admin-reports'),agenda=document.getElementById('admin-agenda');
 const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const header=document.querySelector('.admin header'),more=node('details'),menu=node('div');more.className='admin-more';more.append(node('summary','Más herramientas'),menu);for(const link of [...header.querySelectorAll('a')])if(link.getAttribute('href')!=='/'&&link.id!=='documentation-link')menu.append(link);header.insertBefore(more,header.querySelector('#logout'));
 const home=node('section'),catalog=node('section'),nav=node('nav');home.id='admin-home';catalog.id='admin-catalog';nav.className='admin-navigation';nav.ariaLabel='Secciones de administración';
 for(const child of [...dashboard.children])if(child!==reports&&child!==agenda)catalog.append(child);
 home.append(node('h2','¿Qué necesita hacer hoy?'),node('p','Elija una tarea. Cada área reúne sus herramientas y explica qué cambios verá el visitante.'));
 const strip=node('div');strip.className='admin-status-strip';home.append(strip);const grid=node('div');grid.className='admin-home-grid';home.append(grid);
 const cards=[['Agenda y citas','Consulte horarios, revise reservas y gestione cambios.','#admin-agenda','Ver agenda'],['Personal y recepción','Organice turnos, escritorios y atención presencial.','/staff','Abrir recepción'],['Clientes y servicios','Expedientes escolares y clases utilizadas, según sus permisos.','/students','Ver expedientes'],['Contenido y publicaciones','Prepare cambios, revise y publique con historial.','/publications','Administrar contenido'],['Preguntas por resolver','Revise dudas reales y mejore las respuestas del asistente.','/reviews','Revisar preguntas'],['Configuración del negocio','Identidad, idiomas, atención y conexiones del sistema.','/settings','Configurar']];
 for(const [title,description,url,action]of cards){const a=node('a');a.href=url;a.append(node('strong',title),node('p',description),node('small',action+' →'));grid.append(a);}
 const sections=[['Inicio',home],['Agenda',agenda],['Servicios',catalog],['Reportes',reports]];
 function show(id){const selected=sections.find(([,s])=>s.id===id)||sections[0];for(const [,s]of sections)s.hidden=s!==selected[1];for(const b of nav.children)b.setAttribute('aria-current',b.dataset.target===selected[1].id?'page':'false');}
 for(const [label,section]of sections){const b=node('button',label);b.className='secondary';b.dataset.target=section.id;b.onclick=()=>{location.hash=section.id;show(section.id);};nav.append(b);}
 dashboard.prepend(nav,home);dashboard.append(catalog);const sync=()=>{const hash=location.hash.slice(1);show(hash==='audio-library'?'admin-catalog':hash);if(hash==='audio-library')document.getElementById('audio-library').open=true;};addEventListener('hashchange',sync);sync();
 return {update(data,role){strip.replaceChildren();for(const [label,value]of [['Servicios activos',data.services.filter(s=>s.active).length],['Precios por confirmar',data.services.filter(s=>s.active&&s.priceCents===null).length],['Su acceso',role==='owner'?'Propietario':'Gerencia']]){const item=node('div');item.append(node('strong',String(value)),node('div',label));strip.append(item);}const school=data.centerSettings?.configuration.business.type==='driving-school';grid.querySelector('a[href="/students"]').hidden=!school;grid.querySelector('a[href="/settings"]').hidden=role!=='owner';},reset(){strip.replaceChildren();}};
}
