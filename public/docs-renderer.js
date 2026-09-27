/**
 * NEXO · GUÍA DEL MÓDULO: public/docs-renderer.js
 * Convertir Markdown a nodos DOM con elementos permitidos.
 * Entrada: Markdown y catálogo de documentos/imágenes para resolver enlaces.
 * Salida: DocumentFragment y lista de encabezados para índice lateral.
 * Estado importante: headingId genera anclas; target resuelve referencias internas; inline/blocks
 * recorren tokens.
 * Efectos y límites: No ejecutar HTML del Markdown. Los enlaces y recursos se construyen según
 * reglas explícitas del renderizador.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {marked} from './vendor/marked.esm.js';

const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const decode=text=>String(text||'').replace(/&(amp|lt|gt|quot|#39|#x27);/g,(_,c)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'",'#x27':"'"}[c]));
export const headingId=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');

/**
 * renderDocument: Recorre tokens Markdown construyendo nodos permitidos y resolviendo enlaces del
 * catálogo.
 * Entrada (firma real): source, {path,documents,assets}.
 * Salida: {fragment,headings}; el llamador inserta fragment y usa headings para navegación.
 */
export function renderDocument(source,{path,documents,assets}){
  const headings=[],used=new Map();
  function target(href,image=false){
    if(!href||/[\u0000-\u001f]/.test(href))return null;
    let url;try{url=new URL(href,'https://nexo.docs/'+path);}catch{return null;}
    if(url.username||url.password)return null;
    if(url.origin!=='https://nexo.docs')return !image&&url.protocol==='https:'?{href:url.href,external:true}:null;
    let rel;try{rel=decodeURIComponent(url.pathname).slice(1);}catch{return null;}
    const record=(image?assets:documents).find(d=>d.path===rel);
    if(!record)return null;
    let heading='';try{if(url.hash)heading='&heading='+encodeURIComponent(decodeURIComponent(url.hash.slice(1)));}catch{return null;}
    return {href:image?'/api/docs/assets?id='+record.id:'#doc='+record.id+heading};
  }
  function inline(tokens,parent){
    for(const t of tokens||[]){
      if(t.type==='text'||t.type==='escape'){if(t.tokens)inline(t.tokens,parent);else parent.append(document.createTextNode(decode(t.text)));}
      else if(['strong','em','del'].includes(t.type)){const node=el(t.type);inline(t.tokens,node);parent.append(node);}
      else if(t.type==='codespan')parent.append(el('code',decode(t.text)));
      else if(t.type==='br')parent.append(el('br'));
      else if(t.type==='link'){
        const dest=target(t.href);const node=el(dest?'a':'span');inline(t.tokens,node);
        if(dest){node.href=dest.href;if(dest.external){node.target='_blank';node.rel='noopener noreferrer';}}
        else {node.className='file-reference';node.title='Referencia local: '+t.href;}
        parent.append(node);
      }else if(t.type==='image'){
        const dest=target(t.href,true);
        if(dest){const img=el('img');img.src=dest.href;img.alt=t.text||'Ilustración del documento';img.loading='lazy';parent.append(img);}
        else parent.append(el('span',t.text?'[Imagen: '+t.text+']':'[Imagen no incluida]'));
      }else parent.append(document.createTextNode(t.raw||t.text||''));
    }
  }
  function blocks(tokens,parent){
    for(const t of tokens){
      if(t.type==='space'||t.type==='def')continue;
      if(t.type==='heading'){
        const node=el('h'+t.depth);inline(t.tokens,node);const base=headingId(node.textContent)||'seccion';const n=used.get(base)||0;used.set(base,n+1);node.id=base+(n?'-'+n:'');parent.append(node);
        headings.push({id:node.id,text:node.textContent,depth:t.depth});
      }else if(t.type==='paragraph'||t.type==='text'){const node=el('p');inline(t.tokens||marked.lexer(t.text)[0]?.tokens||[],node);parent.append(node);}
      else if(t.type==='code'){
        const wrapper=el('div');wrapper.className='code-block';if(t.lang)wrapper.append(el('small',t.lang==='mermaid'?'Diagrama · fuente Mermaid':t.lang));
        const pre=el('pre');pre.append(el('code',t.text));wrapper.append(pre);parent.append(wrapper);
      }else if(t.type==='blockquote'){const node=el('blockquote');blocks(t.tokens,node);parent.append(node);}
      else if(t.type==='list'){
        const list=el(t.ordered?'ol':'ul');if(t.ordered&&t.start!==1)list.start=t.start;
        for(const item of t.items){const li=el('li');if(item.task){const box=el('input');box.type='checkbox';box.disabled=true;box.checked=item.checked;box.setAttribute('aria-label',item.checked?'Completado':'Pendiente');li.append(box);}blocks(item.tokens,li);list.append(li);}parent.append(list);
      }else if(t.type==='table'){
        const wrap=el('div');wrap.className='table-wrap';wrap.tabIndex=0;wrap.setAttribute('aria-label','Tabla desplazable');
        const table=el('table'),head=el('thead'),row=el('tr'),body=el('tbody');
        for(const cell of t.header){const th=el('th');th.scope='col';inline(cell.tokens,th);row.append(th);}head.append(row);table.append(head);
        for(const cells of t.rows){const row=el('tr');for(const cell of cells){const td=el('td');inline(cell.tokens,td);row.append(td);}body.append(row);}table.append(body);wrap.append(table);parent.append(wrap);
      }else if(t.type==='hr')parent.append(el('hr'));
      else parent.append(el('pre',t.raw||t.text||'')); // Raw HTML is displayed as text, never executed.
    }
  }
  const fragment=document.createDocumentFragment();blocks(marked.lexer(source,{gfm:true}),fragment);return {fragment,headings};
}
