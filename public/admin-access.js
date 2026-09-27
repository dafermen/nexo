/**
 * NEXO · GUÍA DEL MÓDULO: public/admin-access.js
 * Mostrar acceso por correo/código o token y gestionar vencimiento.
 * Entrada: Nodo de acceso, callbacks y respuestas de /api/auth.
 * Salida: Estado autenticado para la página y cierre por inactividad.
 * Estado importante: Los callbacks onAuthenticated/onExpired/onActivity desacoplan acceso del
 * panel que lo usa.
 * Efectos y límites: No confundir cookie administrativa con token visitante; el servidor verifica
 * autoridad en cada petición.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Shared login: legacy bootstrap key or an HttpOnly email session. Never store credentials in web storage.
export function installAdminAccess({onAuthenticated,onExpired,onActivity=()=>{}}){
 const legacy=document.getElementById('login'),notice=document.getElementById('error');let mailReady=false,mode='token',challenge=null,generation=0,signedIn=false,lastActivity=Date.now(),cooldown=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const message=text=>{notice.textContent=text;notice.hidden=!text;};
 const panel=el('section');panel.className='email-access';panel.hidden=true;
 const title=el('h2','Entre con su correo'),intro=el('p','Reciba un código temporal en el correo del administrador.');
 const requestForm=el('form'),emailLabel=el('label','Correo administrador'),email=el('input');email.type='email';email.autocomplete='email';email.required=true;email.maxLength=254;email.id='admin-email';emailLabel.append(email);const send=el('button','Recibir código');send.className='primary';send.id='request-admin-code';requestForm.append(emailLabel,send);
 const verifyForm=el('form');verifyForm.hidden=true;const codeLabel=el('label','Código de 8 dígitos'),code=el('input');code.id='admin-code';code.autocomplete='one-time-code';code.inputMode='numeric';code.pattern='[0-9]{8}';code.maxLength=8;code.required=true;codeLabel.append(code);const verify=el('button','Entrar');verify.className='primary';verify.id='verify-admin-code';verifyForm.append(codeLabel,verify);
 const status=el('p');status.id='admin-code-status';status.setAttribute('role','status');const help=el('p','Vence en 10 minutos. Solo puede utilizarse una vez.');help.className='muted';panel.append(title,intro,requestForm,verifyForm,status,help);legacy.after(panel);
 const setup=el('p');setup.className='notice';setup.hidden=true;legacy.before(setup);
 async function request(path,method='GET',body){const r=await fetch('/api/auth/'+path,{method,headers:{'Content-Type':'application/json'},credentials:'same-origin',...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});const value=await r.json();if(!r.ok)throw new Error(value.error||'No se pudo completar el acceso.');return value;}
 function signed(){signedIn=true;lastActivity=Date.now();panel.hidden=true;legacy.hidden=true;email.value='';code.value='';challenge=null;onAuthenticated('cookie-session');}
 requestForm.onsubmit=async event=>{event.preventDefault();if(!mailReady||Date.now()<cooldown)return;const epoch=generation;send.disabled=true;message('');try{const result=await request('request','POST',{email:email.value.trim()});if(epoch!==generation)return;challenge=result.challenge;cooldown=Date.now()+result.resendSeconds*1000;status.textContent=result.message;verifyForm.hidden=false;code.value='';code.focus();}catch(error){if(epoch===generation)message(error.message);}finally{if(epoch===generation&&Date.now()>=cooldown)send.disabled=false;}};
 verifyForm.onsubmit=async event=>{event.preventDefault();const epoch=generation;verify.disabled=true;message('');try{await request('verify','POST',{challenge,code:code.value});if(epoch!==generation)return;signed();}catch(error){if(epoch===generation){code.value='';message(error.message);}}finally{if(epoch===generation)verify.disabled=false;}};
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('nexo-admin-activity'):null;
 channel?.addEventListener('message',event=>{if(event.data==='activity'){lastActivity=Date.now();onActivity();}if(event.data==='logout'&&signedIn){signedIn=false;onExpired();}});
 let lastBroadcast=0;
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{lastActivity=Date.now();if(lastActivity-lastBroadcast>3000){channel?.postMessage('activity');lastBroadcast=lastActivity;}},{passive:true});
 setInterval(()=>{if(!panel.hidden){const seconds=Math.max(0,Math.ceil((cooldown-Date.now())/1000));send.disabled=!mailReady||seconds>0;send.textContent=seconds?'Solicitar de nuevo en '+seconds+' s':challenge?'Enviar un nuevo código':'Recibir código';}},1000);
 setInterval(async()=>{if(mode!=='email'||!signedIn||Date.now()-lastActivity>=5*60000)return;try{await request('session');}catch{signedIn=false;onExpired();}},60000);
 (async()=>{try{const config=await request('config');mode=config.mode;mailReady=config.ready;const active=!document.getElementById('dashboard').hidden;legacy.hidden=mode==='email'||active;panel.hidden=mode!=='email'||active;if(mode==='email'){send.disabled=!config.ready;if(!config.ready){status.textContent='El responsable debe completar el envío de correo en la configuración local.';}try{await request('session');signed();}catch{}}else if(config.emailConfigured){setup.textContent='El acceso por correo está preparado. Falta activar el envío; mientras tanto puede utilizar su clave actual.';setup.hidden=false;}}catch{setup.textContent='No se pudo comprobar el acceso. Actualice la página.';setup.hidden=false;}})();
 return {
  reset(){generation++;signedIn=false;code.value='';email.value='';challenge=null;verifyForm.hidden=true;verify.disabled=false;status.textContent='';panel.hidden=mode!=='email';legacy.hidden=mode==='email';},
  logout(){this.reset();if(mode==='email'){request('logout','POST').catch(()=>message('No se pudo confirmar el cierre. Cierre esta ventana y vuelva a intentarlo cuando haya conexión.'));channel?.postMessage('logout');}},
 };
}
