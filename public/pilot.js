/** NEXO · GUÍA DEL MÓDULO: public/pilot.js
 * Entrada: formulario del participante. Salida: petición limitada y redirección fija.
 * La clave solo se envía a /api/pilot/login por HTTPS, nunca se persiste en JS.
 */
const form=document.getElementById('pilot-form'),notice=document.getElementById('notice');
form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button'),input=form.elements.password;
  button.disabled=true;notice.textContent='';
  try{
    const response=await fetch('/api/pilot/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:input.value}),signal:AbortSignal.timeout(15000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo iniciar el acceso.');
    input.value='';location.assign('/');
  }catch(error){notice.textContent=error.name==='TimeoutError'?'La conexión tardó demasiado. Intente nuevamente.':error.message;}
  finally{input.value='';button.disabled=false;}
});

document.getElementById('logout').onclick=async()=>{
  try{const response=await fetch('/api/pilot/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();notice.textContent='Acceso cerrado. Puede cerrar esta ventana.';}catch{notice.textContent='No se pudo cerrar el acceso. Intente nuevamente.';}
};

fetch('/api/pilot/status',{signal:AbortSignal.timeout(10000)}).then(r=>r.json()).then(state=>{if(state.enabled===false){location.replace('/');return;}document.getElementById('logout').hidden=!state.authenticated;}).catch(()=>{});
