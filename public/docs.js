/**
 * NEXO · GUÍA DEL MÓDULO: public/docs.js
 * Navegar la biblioteca, manuales y tablero de tareas.
 * Entrada: Catálogo público y hash de URL con doc/view/category/q.
 * Salida: Tarjetas, documentos renderizados, búsqueda, descarga e impresión.
 * Estado importante: revision descarta documentos llegados tarde; searchTimer limita búsquedas;
 * taskFilter selecciona estado.
 * Efectos y límites: Solo solicita rutas de documentación; crear un enlace no concede acceso a
 * archivos fuera del catálogo.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {renderDocument} from './docs-renderer.js';
import './docs-reading-tools.js';

const $=selector=>document.querySelector(selector);
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const link=(text,href,className)=>{const n=node('a',text,className);n.href=href;return n;};
const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const labels={completed:'Realizada',partial:'En curso',pending:'Pendiente'};
let catalog,revision=0,searchTimer,taskFilter='all';
const notice=text=>{$('#notice').textContent=text;$('#notice').hidden=!text;};
const docHref=path=>'#doc='+catalog.documents.find(d=>d.path===path)?.id;
function card(doc){
  const a=link('', '#doc='+doc.id,'doc-card');
  a.append(node('span',doc.category,'card-icon'),node('h3',doc.title),node('p',doc.summary),node('span','Leer documento ↗','card-foot'));return a;
}
function section(title,description){const h=node('div',undefined,'section-heading');h.append(node('h2',title));if(description)h.append(node('p',description));return h;}
/**
 * home: Construye la portada del portal con acceso al recorrido de aprendizaje y al tablero.
 * Entrada (firma real): (sin parámetros).
 * Salida: DocumentFragment que route inserta en la vista.
 */
function home(){
  const fragment=document.createDocumentFragment(),hero=node('section',undefined,'hero'),intro=node('div');
  intro.append(node('p','BIBLIOTECA DEL PROYECTO','eyebrow'));const title=node('h1','Todo Nexo. ');title.append(node('em','Un solo lugar.'));intro.append(title,node('p','Entienda cómo funciona, aprenda a desarrollarlo y descubra el siguiente paso. Toda la documentación de este proyecto, conectada.'));
  hero.append(intro,node('div','N','hero-icon'));fragment.append(hero);
  const paths=node('nav',undefined,'docs-reading-paths');paths.setAttribute('aria-label','Recorridos de lectura');
  for(const [prefix,title,description] of [['00-','Conocer el producto','Propósito y funciones.'],['24-','Aprender a usarlo','Uso y administración.'],['23-','Explorar el desarrollo','Código, arquitectura y pruebas.']]) {const doc=catalog.documents.find(d=>d.path.startsWith('docs/'+prefix));if(doc){const a=link('','#doc='+doc.id);a.append(node('strong',title),node('span',description));paths.append(a);}}fragment.append(paths);
  const stats=node('div',undefined,'stats');
  for(const [value,label] of [[catalog.documents.length,'Documentos'],[catalog.status.phases.length,'Fases'],[catalog.status.tasks.filter(t=>t.status==='completed').length,'Tareas realizadas'],[catalog.status.tasks.filter(t=>t.status!=='completed').length,'Por completar']]){const s=node('div',undefined,'stat');s.append(node('strong',value),node('span',label));stats.append(s);}fragment.append(stats);
  fragment.append(section('Aprenda cómo está construido','Código explicado para estudiantes: módulos, recorridos, datos y ejercicios. Comience por el Manual del desarrollador junior en las guías de abajo.'));
  const learning=node('div',undefined,'card-grid learning-grid');
  learning.setAttribute('aria-label','Ruta de aprendizaje del código');
  for(const prefix of ['41-','42-','43-','44-']){const doc=catalog.documents.find(d=>d.path.startsWith('docs/'+prefix));if(doc)learning.append(card(doc));}
  fragment.append(learning);
  fragment.append(section('Empiece por aquí','Guías prácticas para conocer, operar y continuar Nexo.'));
  const grid=node('div',undefined,'card-grid');for(const prefix of ['00-','23-','24-','25-','26-','27-']){const d=catalog.documents.find(d=>d.path.startsWith('docs/'+prefix));if(d)grid.append(card(d));}fragment.append(grid);
  const next=node('section',undefined,'next-step'),copy=node('div');copy.append(node('p','EL SIGUIENTE PASO','eyebrow'),node('h2','Preparar el piloto de la escuela'),node('p','Confirmar precios y requisitos, validar las reservas y probar la experiencia en el dispositivo real.'));next.append(copy,link('Ver fases y pendientes →','#tasks'));fragment.append(next);return fragment;
}
function library(params){
  const fragment=document.createDocumentFragment(),query=params.get('q')||'',category=params.get('category');
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  const docs=catalog.documents.filter(d=>(!category||d.category===category)&&terms.every(term=>normalize(d.title+' '+d.path+' '+d.searchText).includes(term)));
  fragment.append(node('p','BIBLIOTECA','eyebrow'),node('h1',query?'Resultados de búsqueda':category||'Todos los documentos'),node('p',docs.length+' documentos'+(query?' para «'+query+'»':' de Nexo')));
  const grid=node('div',undefined,'card-grid');for(const d of docs)grid.append(card(d));fragment.append(grid);
  if(!docs.length)fragment.append(node('div','No encontramos coincidencias. Pruebe con otra palabra, como voz, agenda o GitHub.','empty'));return fragment;
}
function tasks(){
  const fragment=document.createDocumentFragment();fragment.append(node('p','AVANCE DEL PROYECTO · '+catalog.status.updatedAt,'eyebrow'),node('h1','Fases y tareas'),node('p',catalog.status.summary));
  const phases=node('div',undefined,'phase-grid');for(const p of catalog.status.phases){const item=node('article',undefined,'phase');item.append(node('span',labels[p.status],'pill '+p.status),node('h2',p.title),node('p',p.summary));phases.append(item);}fragment.append(phases,section('Trabajo realizado y próximos pasos','Los estados describen la demo actual. Las tareas pendientes incluyen su criterio de aceptación.'));
  const filters=node('div',undefined,'filters');filters.setAttribute('aria-label','Filtrar tareas');
  for(const [key,label] of [['all','Todas'],['completed','Realizadas'],['partial','En curso'],['pending','Pendientes']]){const b=node('button',label);b.setAttribute('aria-pressed',String(key===taskFilter));b.onclick=()=>{taskFilter=key;$('#view').replaceChildren(tasks());};filters.append(b);}fragment.append(filters);
  const list=node('div',undefined,'task-list');
  for(const t of catalog.status.tasks.filter(t=>taskFilter==='all'||t.status===taskFilter)){
    const row=node('article',undefined,'task'),body=node('div');body.append(node('small',t.id+' · '+t.priority),node('h3',t.title),node('p',t.description));
    if(t.acceptance)body.append(node('p','Criterio: '+t.acceptance));
    if(t.evidence&&catalog.documents.some(d=>d.path===t.evidence.path))body.append(link(t.evidence.label||'Ver documentación ↗',docHref(t.evidence.path)));
    row.append(body,node('span',labels[t.status],'pill '+t.status));list.append(row);
  }fragment.append(list);return fragment;
}
/**
 * readDocument: Solicita un documento y verifica la revisión de navegación antes de mostrarlo.
 * Entrada (firma real): id, heading, version.
 * Salida: Promise<void>; dibuja contenido, herramientas e índice lateral.
 */
async function readDocument(id,heading,version){
  const doc=catalog.documents.find(d=>d.id===id);if(!doc)throw new Error('No encontramos este documento. Abra la biblioteca para elegir otro.');
  const response=await fetch('/api/docs/document?id='+encodeURIComponent(id));if(!response.ok)throw new Error('No se pudo abrir el documento. Puede haberse movido; recargue la biblioteca.');
  const result=await response.json();if(version!==revision)return;
  const fragment=document.createDocumentFragment(),top=node('div',undefined,'document-top'),buttons=node('div',undefined,'doc-tools');top.append(link('← Biblioteca','#library'));
  const print=node('button','Imprimir / PDF');print.onclick=()=>window.print();
  const download=node('button','Descargar');download.onclick=()=>{const url=URL.createObjectURL(new Blob([result.text],{type:'text/plain;charset=utf-8'}));const a=link('',url);a.download=doc.path.split('/').at(-1);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const copy=node('button','Copiar enlace');copy.onclick=async()=>{try{await navigator.clipboard.writeText(location.href);notice('Enlace copiado.');}catch{notice('Puede copiar la dirección de esta página desde el navegador.');}};
  buttons.append(print,download,copy);top.append(buttons);fragment.append(top,node('p',doc.category+' · '+doc.path,'document-meta'));
  if(doc.historical){const warning=node('div','Documento de evolución: conserva decisiones de una etapa anterior. Consulte el estado actual antes de utilizarlo como guía. ','notice');warning.append(link('Ver estado actual →',docHref('docs/25-fases-y-tareas.md')));fragment.append(warning);}
  const layout=node('div',undefined,'doc-layout'),article=node('article',undefined,'document'),toc=node('nav',undefined,'toc');toc.setAttribute('aria-label','En este documento');toc.append(node('strong','EN ESTE DOCUMENTO'));
  const rendered=renderDocument(result.text,{path:doc.path,documents:catalog.documents,assets:catalog.assets});article.append(rendered.fragment);
  for(const h of rendered.headings.filter(h=>h.depth===2||h.depth===3)){const a=link(h.text,'#doc='+id+'&heading='+encodeURIComponent(h.id));if(h.depth===3)a.className='nested';toc.append(a);}
  layout.append(article,toc);fragment.append(layout);
  const pager=node('nav',undefined,'docs-page-pager');pager.setAttribute('aria-label','Anterior y siguiente');const index=catalog.documents.indexOf(doc);
  for(const [entry,label] of [[catalog.documents[index-1],'Anterior'],[catalog.documents[index+1],'Siguiente']])if(entry)pager.append(link(label+': '+entry.title,'#doc='+entry.id));fragment.append(pager);
  $('#view').replaceChildren(fragment);window.InnovaLogicDocs.enhance(article);document.title=doc.title+' · Nexo';
  if(heading){const target=article.querySelector('#'+CSS.escape(heading));target?.scrollIntoView({block:'start'});}
}
function paramsForRoute(){const raw=location.hash.slice(1);return ['home','tasks','library',''].includes(raw)?new URLSearchParams({view:raw||'home'}):new URLSearchParams(raw);}
/**
 * route: Interpreta hash y cancela visualmente resultados antiguos incrementando revision.
 * Entrada (firma real): (sin parámetros).
 * Salida: Promise<void>; la URL permite compartir un documento concreto.
 */
async function route(){
  if(!catalog)return;const version=++revision,params=paramsForRoute(),view=params.get('view')||'library';notice('');document.body.classList.remove('nav-open');$('#menu-toggle').setAttribute('aria-expanded','false');
  for(const a of document.querySelectorAll('[data-nav]'))a.classList.toggle('active',!params.has('doc')&&a.dataset.nav===view&&!params.has('category'));
  for(const a of document.querySelectorAll('[data-category]'))a.classList.toggle('active',a.dataset.category===params.get('category'));
  if(document.activeElement!==$('#search'))$('#search').value=params.get('q')||'';
  document.title='Nexo · Documentación';
  try{
    if(params.has('doc')){ $('#view').replaceChildren(node('p','Abriendo documento…'));await readDocument(params.get('doc'),params.get('heading'),version); }
    else $('#view').replaceChildren(view==='home'?home():view==='tasks'?tasks():library(params));
    if(!params.get('heading')&&document.activeElement!==$('#search'))window.scrollTo(0,0);
    document.body.dataset.ready='true';
  }catch(error){if(version!==revision)return;$('#view').replaceChildren(node('h1','Documento no disponible'),node('p',error.message),link('Volver a la biblioteca','#library'));}
}
async function load(){
  try{const response=await fetch('/api/docs/catalog');if(response.status===401){$('#view').replaceChildren(node('h1','Documentación privada'),node('p','Ingrese como administrador para consultar la documentación del proyecto.'),link('Administración','/admin'));return;}if(!response.ok)throw new Error();catalog=await response.json();
    $('#document-count').textContent=catalog.documents.length+' documentos · '+catalog.status.version;
    const nav=$('#category-nav');nav.replaceChildren(node('p','EXPLORAR POR TEMA','nav-label'));
    for(const category of [...new Set(catalog.documents.map(d=>d.category))]){const a=link(category,'#view=library&category='+encodeURIComponent(category));a.dataset.category=category;nav.append(a);}await route();
  }catch{$('#view').replaceChildren(node('h1','No pudimos cargar la biblioteca'),node('p','Compruebe que el servidor de Nexo esté encendido.'));const retry=node('button','Intentar de nuevo');retry.onclick=load;$('#view').append(retry);}
}
function search(){const q=$('#search').value.trim();history.replaceState(null,'','#view=library'+(q?'&q='+encodeURIComponent(q):''));route();}
$('#search-form').onsubmit=event=>{event.preventDefault();clearTimeout(searchTimer);search();};
$('#search').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,180);};
$('#menu-toggle').onclick=()=>{$('#menu-toggle').setAttribute('aria-expanded',String(document.body.classList.toggle('nav-open')));};
document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}if(event.key==='Escape'){document.body.classList.remove('nav-open');$('#menu-toggle').setAttribute('aria-expanded','false');}});
window.addEventListener('hashchange',()=>{if(location.hash==='#main'){$('#main').focus();return;}clearTimeout(searchTimer);route();});load();

// Theme belongs to the documentation, not to the kiosk or administration UI.
let docsTheme;try{docsTheme=localStorage.getItem('nexo-docs-theme');}catch{}
function setDocsTheme(value){document.documentElement.dataset.theme=value;$('#docs-theme').textContent=value==='dark'?'Tema claro':'Tema oscuro';$('#docs-theme').setAttribute('aria-pressed',String(value==='dark'));try{localStorage.setItem('nexo-docs-theme',value);}catch{}}
setDocsTheme(['light','dark'].includes(docsTheme)?docsTheme:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
$('#docs-theme').onclick=()=>setDocsTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
