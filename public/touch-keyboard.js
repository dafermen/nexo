/**
 * NEXO · GUÍA DEL MÓDULO: public/touch-keyboard.js
 * Ofrecer teclado táctil desplegable para campos permitidos.
 * Entrada: Eventos de foco/puntero, input activo y callbacks de apertura.
 * Salida: Texto editado con selección conservada; eventos input y controlador
 * enable/open/close/destroy.
 * Estado importante: target identifica campo; selección delimita inserción; layout diferencia
 * texto y correo.
 * Efectos y límites: No almacena ni envía lo escrito. Se omiten campos no elegibles; al abrirlo el
 * llamador pausa el micrófono.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {language} from './i18n.js';
// Only public kiosk fields are eligible. No storage, network or admin passwords.
export function createTouchKeyboard({onOpen=()=>{}}={}){
 const dialog=document.createElement('section');dialog.hidden=true;dialog.id='touch-keyboard';dialog.setAttribute('role','group');dialog.className='touch-keyboard';dialog.setAttribute('aria-labelledby','touch-keyboard-title');
 dialog.innerHTML='<div class="touch-keyboard-heading"><strong id="touch-keyboard-title">Teclado en pantalla</strong><button type="button" data-action="done">Listo ✓</button></div><label for="touch-keyboard-value" id="touch-keyboard-label">Escriba</label><input id="touch-keyboard-value" type="text" inputmode="none" autocomplete="off" spellcheck="false" aria-describedby="touch-keyboard-help"><div class="touch-keyboard-keys"></div><p id="touch-keyboard-help">Listo cierra el teclado. No envía la consulta ni confirma la cita.</p>';
 document.body.append(dialog);
 const editor=dialog.querySelector('input'),keys=dialog.querySelector('.touch-keyboard-keys');
 let enabled=false,target=null,shift=false,symbols=false;
 const eligible=node=>node instanceof HTMLInputElement&&!node.closest('#touch-keyboard')&&node.matches('#message, #booking-content input')&&['text','email','tel','search'].includes(node.type)&&!node.disabled&&!node.readOnly&&node.isConnected;
 const buttons=new Map();
 function prepare(){
  for(const [input,entry] of buttons){if(!input.isConnected){buttons.delete(input);continue;}if(entry.button.disabled===eligible(input))entry.button.disabled=!eligible(input);}
  if(!enabled)return;
  for(const input of document.querySelectorAll('#message, #booking-content input'))if(eligible(input)&&!buttons.has(input)){
   const label=input.labels?.[0]?.textContent?.trim()||input.getAttribute('aria-label')||'este campo';
   const wrap=document.createElement('span');wrap.className='keyboard-field';input.before(wrap);wrap.append(input);
   const button=document.createElement('button');button.type='button';button.className='keyboard-toggle';button.setAttribute('aria-label','Teclado para '+label);button.title='Mostrar u ocultar teclado';button.setAttribute('aria-controls','touch-keyboard');button.setAttribute('aria-expanded','false');
   button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M5 9h2m2 0h2m2 0h2m2 0h2M5 12h2m2 0h2m2 0h2m2 0h2M7 16h10"/></svg>';
   button.addEventListener('click',event=>{event.preventDefault();if(target===input&&!dialog.hidden)close();else{close(false);open(input);}});wrap.append(button);buttons.set(input,{button,wrap,label});
  }
 }
 function close(restoreFocus=true){const previous=target;target=null;editor.value='';dialog.hidden=true;for(const {button} of buttons.values())button.setAttribute('aria-expanded','false');if(restoreFocus&&previous?.isConnected)buttons.get(previous)?.button.focus({preventScroll:true});if(!dialog.isConnected)document.body.append(dialog);}
 function render(){
  keys.replaceChildren();
  const accents=language==='fr'?'àâçéèêëîïôùûœ':'áéíóúü';
  const rows=symbols?['1234567890','@._-+/#&=','!?¿¡:;,()',accents+(language==='fr'?'':'ñ')]:['1234567890','qwertyuiop','asdfghjklñ','zxcvbnm',target?.type==='email'?'@._-+':accents];
  for(const chars of rows.flatMap(row=>row.length>10?[row.slice(0,7),row.slice(7)]:[row])){const row=document.createElement('div');row.className='touch-keyboard-row';for(const char of chars){const button=document.createElement('button');button.type='button';button.textContent=shift?char.toUpperCase():char;button.dataset.char=button.textContent;row.append(button);}keys.append(row);}
  const row=document.createElement('div');row.className='touch-keyboard-row touch-keyboard-actions';
  for(const [action,label] of [['shift','⇧'],['symbols',symbols?'ABC':'@ #'],['space','Espacio'],['backspace','⌫']]){const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;if(action==='shift'){button.setAttribute('aria-label','Mayúsculas');button.setAttribute('aria-pressed',String(shift));}if(action==='backspace')button.setAttribute('aria-label','Borrar carácter');row.append(button);}keys.append(row);
 }
 function sync(){if(!eligible(target)){close();return;}target.value=editor.value;target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));}
 function edit(text,backspace=false){
  let start=editor.selectionStart??editor.value.length,end=editor.selectionEnd??start;
  if(backspace&&start===end)start-=Array.from(editor.value.slice(0,start)).at(-1)?.length||0;
  const available=editor.maxLength<0?Infinity:editor.maxLength-(editor.value.length-(end-start));text=text.slice(0,Math.max(0,available));
  editor.setRangeText(text,start,end,'end');sync();editor.focus({preventScroll:true});
 }
 function open(input){
  if(!enabled||!eligible(input))return;
  prepare();target=input;symbols=false;shift=input.name==='id';const entry=buttons.get(input);
  dialog.querySelector('#touch-keyboard-label').textContent=entry.label;
  editor.value=input.value;editor.maxLength=input.maxLength<0?10000:input.maxLength;render();onOpen();
  const anchor=input.id==='message'?input.closest('form'):input.closest('label')||entry.wrap;anchor.after(dialog);dialog.hidden=false;entry.button.setAttribute('aria-expanded','true');editor.focus({preventScroll:true});editor.setSelectionRange(editor.value.length,editor.value.length);dialog.scrollIntoView({block:'nearest'});
 }
 dialog.addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault();});
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.char!==undefined)edit(button.dataset.char);
  else switch(button.dataset.action){case 'done':close();break;case 'backspace':edit('',true);break;case 'space':edit(' ');break;case 'shift':shift=!shift;render();break;case 'symbols':symbols=!symbols;render();break;}
 });
 editor.addEventListener('input',sync);
 dialog.addEventListener('keydown',event=>{if(['Enter','Escape'].includes(event.key)&&event.target===editor){event.preventDefault();event.stopPropagation();close();}});
 const observer=new MutationObserver(()=>{if(!dialog.isConnected||(target&&(!eligible(target)||target.closest('dialog')?.open===false)))close(false);prepare();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','disabled']});
 function setEnabled(value){enabled=!!value;if(enabled)prepare();else{close(false);for(const {button,wrap} of buttons.values()){button.remove();if(wrap.isConnected)wrap.replaceWith(...wrap.childNodes);}buttons.clear();}}
 return {close,setEnabled,destroy(){setEnabled(false);observer.disconnect();dialog.remove();}};
}
