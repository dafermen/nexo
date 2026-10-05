/**
 * NEXO · GUÍA DEL MÓDULO: server/business-settings.js
 * Definir y validar los parámetros reutilizables de cada negocio.
 * Entrada: center/config para valores iniciales; objeto input completo al guardar.
 * Salida: Configuración normalizada, textos de negocio o HttpError 400 por valores inválidos.
 * Estado importante: business, assistant, experience, ai, booking y video son secciones;
 * knowledgeMode elige la fuente de respuestas.
 * Efectos y límites: Funciones locales: no llaman proveedores ni guardan. Las plantillas solo
 * permiten los campos autorizados, no ejecutan código.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {HttpError} from './errors.js';

export const isSchool=center=>!center?.businessType||center.businessType==='driving-school';
export function settingsDefaults(center,config={}){
 const school=isSchool(center);
 return {
  business:{type:school?'driving-school':'general',description:school?'Escuela de conducción y preparación para exámenes de manejo.':'Información y atención sobre nuestros servicios.',timezone:center?.timezone||'America/New_York',currency:'USD',address:'',phone:'',email:'',website:'',practiceUrl:''},
  assistant:{name:'Nexo',addressStyle:'usted',welcome:'Hola, soy {asistente}, su asistente virtual de {negocio}. ¿En qué puedo ayudarle?',scope:school?'Servicios de la escuela, clases, preparación para el examen de manejo y atención al alumno.':'Servicios publicados, requisitos, precios, horarios y atención del negocio.',topics:school?'conducción, conducir, manejo, manejar, road test, dmv, licencia, examen':'servicios, atención',offTopic:'Puedo ayudarle con los servicios de {negocio}. ¿Qué desea consultar?',handoff:'Consulte con el personal del negocio para continuar su atención.',knowledgeMode:school?'file':'none',knowledgeText:''},
  experience:{theme:'nexo',touchKeyboard:false,voiceEnabled:true,videoEnabled:true,automaticVoice:true,inactivityMinutes:Math.round((config.sessionTtlMs||300000)/60000),accent:'lime'},
  ai:{enabled:true,interpretationEnabled:true,model:config.model||'',sessionCalls:config.aiLimits?.sessionCalls||6,dailyCalls:config.aiLimits?.dailyCalls||100,outputTokens:config.aiLimits?.outputTokens||300},
  booking:{message:center?.booking?.message||'Para coordinar su atención, consulte con el personal.',url:''},
  video:{avatarId:config.liveAvatar?.avatarId||'',voiceId:config.liveAvatar?.voiceId||'',maxSeconds:config.liveAvatar?.durationSeconds||60},
 };
}
const fail=text=>{throw new HttpError(400,text);};
function keys(obj,list){if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).some(k=>!list.includes(k))||list.some(k=>!Object.hasOwn(obj,k)))fail('Configuración incompleta o con campos no permitidos.');}
function text(value,label,max,empty=false){if(typeof value!=='string'||(!empty&&!value.trim())||value.trim().length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))fail(label+': valor inválido.');return value.trim();}
function choice(value,list,label){if(!list.includes(value))fail(label+': opción inválida.');return value;}
function number(value,min,max,label){if(!Number.isInteger(value)||value<min||value>max)fail(label+': use un número entre '+min+' y '+max+'.');return value;}
function bool(value){if(typeof value!=='boolean')fail('Opción de activación inválida.');return value;}
function https(value,label){value=text(value,label,500,true);if(value){let url;try{url=new URL(value);}catch{fail(label+': use una URL HTTPS completa.');}if(url.protocol!=='https:'||url.username||url.password)fail(label+': use HTTPS sin credenciales.');}return value;}
function template(value,label,max){value=text(value,label,max);if(/[{}]/.test(value.replace(/\{(asistente|negocio)\}/g,'')))fail(label+': solo se permiten {asistente} y {negocio}.');return value;}
export function validateSettings(input){
 keys(input,['business','assistant','experience','ai','booking','video']);
 const b={practiceUrl:'',...input.business},a=input.assistant,e={theme:'nexo',touchKeyboard:false,...input.experience},i=input.ai,v=input.video;
 keys(b,['type','description','timezone','currency','address','phone','email','website','practiceUrl']);keys(a,['name','addressStyle','welcome','scope','topics','offTopic','handoff','knowledgeMode','knowledgeText']);keys(e,['theme','touchKeyboard','voiceEnabled','videoEnabled','automaticVoice','inactivityMinutes','accent']);keys(i,['enabled','interpretationEnabled','model','sessionCalls','dailyCalls','outputTokens']);keys(input.booking,['message','url']);keys(v,['avatarId','voiceId','maxSeconds']);
 const timezone=text(b.timezone,'Zona horaria',80);try{new Intl.DateTimeFormat('es',{timeZone:timezone});}catch{fail('Zona horaria inválida. Use un nombre como America/New_York.');}
 const email=text(b.email,'Correo',150,true);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Correo de contacto inválido.');
 const model=text(i.model,'Modelo de IA',100,true);if(model&&!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(model))fail('Identificador de modelo inválido.');
 const video={maxSeconds:number(v.maxSeconds,30,60,'Duración del video')};for(const key of ['avatarId','voiceId']){video[key]=text(v[key],'ID de avatar o voz',36,true);if(video[key]&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(video[key]))fail('ID de avatar o voz inválido.');}
 const result={
  business:{type:choice(b.type,['driving-school','general'],'Tipo de negocio'),description:text(b.description,'Descripción',600),timezone,currency:choice(b.currency,['USD','EUR','COP','MXN','ARS','PEN','CLP','DOP'],'Moneda'),address:text(b.address,'Dirección',250,true),phone:text(b.phone,'Teléfono',70,true),email,website:https(b.website,'Sitio web'),practiceUrl:https(b.practiceUrl,'Recurso de práctica')},
  assistant:{name:text(a.name,'Nombre del asistente',40),addressStyle:choice(a.addressStyle,['usted','tu'],'Trato'),welcome:template(a.welcome,'Saludo',400),scope:text(a.scope,'Alcance',1000),topics:text(a.topics,'Temas',500,true),offTopic:template(a.offTopic,'Redirección',400),handoff:template(a.handoff,'Atención humana',400),knowledgeMode:choice(a.knowledgeMode,['file','custom','none'],'Base de respuestas'),knowledgeText:text(a.knowledgeText,'Preguntas frecuentes',8000,true)},
  experience:{theme:choice(e.theme,['nexo','metodomogollon'],'Tema visual'),touchKeyboard:bool(e.touchKeyboard),voiceEnabled:bool(e.voiceEnabled),videoEnabled:bool(e.videoEnabled),automaticVoice:bool(e.automaticVoice),inactivityMinutes:number(e.inactivityMinutes,2,30,'Inactividad'),accent:choice(e.accent,['lime','blue','violet'],'Color')},
  ai:{enabled:bool(i.enabled),interpretationEnabled:bool(i.interpretationEnabled),model,sessionCalls:number(i.sessionCalls,1,30,'Consultas por sesión'),dailyCalls:number(i.dailyCalls,1,10000,'Consultas por día'),outputTokens:number(i.outputTokens,100,700,'Longitud de respuesta')},
  booking:{message:template(input.booking.message,'Mensaje de agenda',500),url:https(input.booking.url,'Enlace de agenda')},video,
 };
 if(result.business.type!=='driving-school'&&result.assistant.knowledgeMode==='file')fail('El archivo actual pertenece a la escuela. Para otro negocio use respuestas propias o desactive esa base.');
 return result;
}
export function fillTemplate(text,center){return text.replace(/\{asistente\}/g,center.assistantName||'Nexo').replace(/\{negocio\}/g,center.name);}
export function businessText(text,center){
 if(!isSchool(center))text=text.replace(/con la escuela/g,'con el personal').replace(/de la escuela/g,'del negocio').replace(/clases, cursos o turnos/g,'servicios o turnos').replace(/clases o cursos/g,'servicios').replace(/clases, preparación para el examen o nuestros horarios/g,'servicios o nuestros horarios').replace(/Las fechas de clases/g,'Las fechas de atención').replace(/¿Desea aprender a manejar o prepararse para un examen\?/g,'¿Qué atención necesita?').replace(/¿Busca clases para aprender a manejar o preparación para el examen práctico\?/g,'¿Sobre qué servicio necesita orientación?');
 if(center?.addressStyle==='tu')text=text.replace(/¿Qué desea consultar\?/g,'¿Qué quieres consultar?').replace(/¿Desea /g,'¿Quieres ').replace(/\bdesea\b/g,'quieres').replace(/\bPuede\b/g,'Puedes').replace(/\bConsulte\b/g,'Consulta').replace(/\bElija\b/g,'Elige').replace(/\bPregunte\b/g,'Pregunta').replace(/ayudarle/g,'ayudarte').replace(/su atención/g,'tu atención').replace(/su turno/g,'tu turno').replace(/su asistente/g,'tu asistente').replace(/¿Su consulta/g,'¿Tu consulta');
 return text;
}
