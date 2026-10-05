/**
 * NEXO · GUÍA DEL MÓDULO: public/kiosk-home.js
 * Abrir paneles compactos sin abandonar la pantalla del kiosco.
 * Entrada: Callbacks switchView/onClose/openAgenda y acciones del visitante.
 * Salida: Controlador open/close sobre paneles del inicio.
 * Estado importante: El panel activo determina contenido y foco; data/ARIA comunican estado.
 * Efectos y límites: Modifica DOM y foco. No inicia servicios pagados.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// The public home remains one viewport. Native dialogs provide focus containment.
export function createKioskHome({switchView,onClose,openAgenda,openPreparation}){
 const $=id=>document.getElementById(id),panel=$('home-panel'),menu=$('home-menu');
 const tools=$('home-menu-tools');tools.append(document.querySelector('.live-controls'),document.querySelector('.footer'));
 function open(view,catalogMode='services'){
  if(document.body.classList.contains('video-first'))return;
  panel.dataset.catalogMode=catalogMode;
  if(document.body.dataset.theme==='metodomogollon')document.querySelector('.services-view h2').textContent=catalogMode==='prices'?'Precios y paquetes':'Conozca nuestros servicios';
  switchView(view);if(!panel.open)panel.showModal();
  // Do not open a software keyboard merely by entering the text view.
  $('home-panel-close').focus({preventScroll:true});
 }
 $('home-services').onclick=()=>open('services');$('home-chat').onclick=()=>open('chat');
 $('home-agenda').onclick=openAgenda;$('home-options').onclick=()=>menu.showModal();
 // Los accesos del tema reutilizan controladores y datos; no duplican reservas ni precios.
 $('method-courses').onclick=()=>open('services');
 $('method-prices').onclick=()=>open('services','prices');
 $('method-agenda').onclick=openAgenda;
 $('method-prepare').onclick=openPreparation;
 $('method-info').onclick=()=>menu.showModal();
 $('home-panel-close').onclick=()=>panel.close();
 panel.addEventListener('close',()=>{if(!document.body.classList.contains('video-first'))onClose();});
 const observer=new MutationObserver(()=>{const notice=$('notice');$('home-notice').textContent=notice.textContent;$('home-notice').hidden=notice.hidden;});
 observer.observe($('notice'),{attributes:true,childList:true,subtree:true,characterData:true});
 return {open,close(){if(panel.open)panel.close();if(menu.open)menu.close();}};
}
