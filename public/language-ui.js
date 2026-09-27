/**
 * NEXO · GUÍA DEL MÓDULO: public/language-ui.js
 * Aplicar el selector de idioma sobre DOM y contenido añadido.
 * Entrada: Callback al elegir idioma y nodos observados.
 * Salida: Etiquetas/textos actualizados y controlador apply.
 * Estado importante: skip excluye campos sensibles o marcados noTranslate; observador procesa
 * cambios del DOM.
 * Efectos y límites: Modifica presentación, no traduce datos privados ni cambia hechos del
 * catálogo; app.js inicia una sesión nueva al cambiar idioma.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {translate,language,setLanguage} from './i18n.js';
export function installLanguageUI(onChange){
 const sources=new WeakMap(),attributes=new WeakMap();
 const skip=node=>node.parentElement?.closest('script,style,textarea,input,[data-no-translate],.message.user .message-body,.receipt-code,.center-label,.services-view .eyebrow,.footer>span:first-child,.language-picker');
 function render(root=document.body){
  observer.disconnect();
  const visit=node=>{if(node.nodeType===Node.TEXT_NODE&&!skip(node)){
   const previous=sources.get(node),raw=node.nodeValue,source=previous?.rendered===raw?previous.source:raw,rendered=translate(source,language);
   sources.set(node,{source,rendered});if(raw!==rendered)node.nodeValue=rendered;
  }};
  if(root.nodeType===Node.TEXT_NODE)visit(root);else{const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walk.nextNode())visit(walk.currentNode);}
  for(const el of root.nodeType===Node.ELEMENT_NODE?[root,...root.querySelectorAll('[aria-label],[placeholder],[title]')]:[]){if(el.closest('[data-no-translate],.language-picker'))continue;
   let map=attributes.get(el);if(!map){map={};attributes.set(el,map);}for(const key of ['aria-label','placeholder','title']){if(!el.hasAttribute(key))continue;const raw=el.getAttribute(key),source=map[key]?.rendered===raw?map[key].source:raw,rendered=translate(source,language);map[key]={source,rendered};if(raw!==rendered)el.setAttribute(key,rendered);}
  }
  observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title']});
 }
 const observer=new MutationObserver(records=>{for(const r of records){if(r.type==='childList'){for(const node of r.addedNodes){if(node.isConnected)render(node);}}else if(r.target.isConnected){render(r.target);}}});
 for(const button of document.querySelectorAll('[data-language]'))button.onclick=()=>onChange(button.dataset.language);
 function apply(locale){setLanguage(locale);document.documentElement.lang=locale;for(const b of document.querySelectorAll('[data-language]'))b.setAttribute('aria-pressed',String(b.dataset.language===locale));render();}
 apply(language);return {apply,render};
}
