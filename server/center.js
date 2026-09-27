/**
 * NEXO · GUÍA DEL MÓDULO: server/center.js
 * Adaptar el repositorio base al negocio configurado y su catálogo editable.
 * Entrada: repository, center inicial y config; perfiles y servicios enviados por administración.
 * Salida: Repositorio decorado con getCenter, saveConfiguration, saveService y lecturas de
 * catálogo.
 * Estado importante: state lee center_settings; configurationRevision cambia al guardar
 * configuración; null es dato pendiente, 0 es precio gratuito.
 * Efectos y límites: Guarda mediante updateCenterSettings. Cambiar moneda pone precios pendientes
 * y cambiar tipo de negocio desactiva el catálogo anterior; no convierte importes.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {settingsDefaults,validateSettings,fillTemplate,isSchool,businessText} from './business-settings.js';
import {parseFaq} from './faq.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from './errors.js';

// Business facts supplied by the owner. Unknown values are null, never zero/free.
export const schoolCenter = {
  id: 'metodomogollon', name: 'Escuela de Conducción "MetodoMogollon"',
  addressStyle: 'usted', timezone: 'America/New_York',
  hours: 'Lunes a viernes, de 08:00 a 18:00 (hora de Nueva York)',
  modalities: ['Presencial', 'Virtual'],
  booking: { provider: 'google-calendar', status: 'pending', enabled: false,
    message: 'Para coordinar su turno, consulte con el personal de la escuela. La agenda en línea estará disponible próximamente.' },
  greeting: 'Hola, soy Nexo, su asistente virtual de MetodoMogollon. Puedo orientarle sobre la preparación para el road test, las clases y el curso de las 5 horas. ¿En qué puedo ayudarle?',
  pending: ['Precios', 'Requisitos', 'Duración y modalidad por servicio', 'Enlace de Google Calendar', 'Alcance de la preparación para el examen teórico'],
};
export const schoolServices = [
  { id: 'road-test', name: 'Preparación para el road test', category: 'EXAMEN PRÁCTICO', description: 'Preparación para presentar el examen práctico de manejo del DMV de Nueva York. Consulte con el personal el contenido de la preparación.', icon: 'compass', duration: null },
  { id: 'clases', name: 'Clases presenciales y virtuales', category: 'APRENDIZAJE', description: 'La escuela ofrece clases presenciales y virtuales. Consulte qué modalidad corresponde a la preparación que necesita.', icon: 'document', duration: null },
  { id: 'cinco-horas', name: 'Curso de las 5 horas', category: 'FORMACIÓN', description: 'Información sobre el curso de las 5 horas. Consulte con el personal la modalidad y las próximas fechas.', icon: 'spark', duration: 300 },
].map(service => ({ ...service, active: true, priceCents: null, currency: 'USD', requirements: 'Requisitos pendientes de confirmar con la escuela.' }));


const dayNames = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const defaultHours = dayNames.map((_, day) => ({ day, open: day < 5 ? '08:00' : null, close: day < 5 ? '18:00' : null }));
const clean = (value, label, max, optional = false) => {
  if (optional && (value === null || value === '')) return null;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new HttpError(400, label + ' inválido.');
  return value.trim();
};
function exactKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new HttpError(400, 'Campos no permitidos.');
}
/**
 * validateProfile: Valida nombre y siete filas de horario ordenadas de lunes a domingo.
 * Entrada (firma real): input.
 * Salida: Perfil normalizado; lanza HttpError 400 ante horario inválido.
 */
function validateProfile(input) {
  exactKeys(input, ['name','weeklyHours']);
  const name = clean(input.name, 'Nombre del negocio', 120);
  if (!Array.isArray(input.weeklyHours) || input.weeklyHours.length !== 7) throw new HttpError(400, 'Complete los siete días de la semana.');
  const weeklyHours = input.weeklyHours.map((row, day) => {
    exactKeys(row,['day','open','close']);
    if (row.day !== day) throw new HttpError(400, 'Orden de días inválido.');
    if (row.open === null && row.close === null) return {day,open:null,close:null};
    const valid = time => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    if (!valid(row.open) || !valid(row.close) || row.close <= row.open) throw new HttpError(400, 'Revise apertura y cierre de ' + dayNames[day] + '. El cierre debe ser posterior a la apertura.');
    return {day,open:row.open,close:row.close};
  });
  return {name,weeklyHours};
}
/**
 * validateService: Valida hechos comerciales; conserva id al editar y genera uno para un servicio
 * nuevo.
 * Entrada (firma real): input, prior, currency.
 * Salida: Servicio normalizado; null conserva explícitamente datos pendientes.
 */
export function validateService(input, prior, currency) {
  exactKeys(input,['name','description','duration','priceCents','requirements','modality','active','schedule','inclusions','conditions']);
  const name = clean(input.name, 'Nombre del servicio', 100);
  const description = clean(input.description, 'Descripción', 1000);
  const requirements = clean(input.requirements, 'Requisitos', 1500, true);
  const extra=Object.fromEntries(['schedule','inclusions','conditions'].map(key=>[key,clean(Object.hasOwn(input,key)?input[key]:(prior?.[key]??null),key,1500,true)]));
  if (input.priceCents !== null && (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 100000000)) throw new HttpError(400, 'Precio inválido.');
  if (input.duration !== null && (!Number.isInteger(input.duration) || input.duration < 1 || input.duration > 1440)) throw new HttpError(400, 'Duración inválida (1 a 1440 minutos).');
  if (![null,'Presencial','Virtual','Presencial y virtual'].includes(input.modality)) throw new HttpError(400, 'Modalidad inválida.');
  if (typeof input.active !== 'boolean') throw new HttpError(400, 'Estado inválido.');
  return { id: prior?.id || randomUUID(), category: prior?.category || 'SERVICIOS', icon: prior?.icon || 'document', currency, name, description, requirements, ...extra, priceCents: input.priceCents, duration: input.duration, modality: input.modality, active: input.active };
}
/**
 * centerRepository: Decora el repositorio con el perfil comercial persistente; sin center devuelve
 * el repositorio original.
 * Entrada (firma real): repository, center, config={}.
 * Salida: Objeto con catálogo/configuración específicos del negocio.
 */
export function centerRepository(repository, center, config={}) {
  if (!center) return repository;
  repository.ensureCenterSettings({ profile: {name:center.name,weeklyHours:defaultHours}, services: isSchool(center) ? schoolServices.map(s => ({...s,modality:null,requirements:null})) : [], configuration:settingsDefaults(center,config), configurationRevision:0 });
  const state = () => {const saved=repository.readCenterSettings();return {...saved,configuration:saved.configuration?{...saved.configuration,experience:{touchKeyboard:false,...saved.configuration.experience}}:settingsDefaults(center,config),configurationRevision:saved.configurationRevision||0};};
  const getCenter = () => {
    const {profile,services,configuration:settings,configurationRevision} = state();
    const groups = [];
    for (const row of profile.weeklyHours) {
      const last = groups.at(-1);
      if (last && last.open === row.open && last.close === row.close) last.end = row.day;
      else groups.push({...row,end:row.day});
    }
    const hours = groups.map(g => (g.day === g.end ? dayNames[g.day] : dayNames[g.day] + ' a ' + dayNames[g.end]) + (g.open ? ', de ' + g.open + ' a ' + g.close : ': cerrado')).join('; ') + (settings.business.timezone==='America/New_York'?' (hora de Nueva York)':' ('+settings.business.timezone+')');
    const result={...center,...profile,hours,configurationRevision,businessType:settings.business.type,businessDescription:settings.business.description,timezone:settings.business.timezone,currency:settings.business.currency,assistantName:settings.assistant.name,addressStyle:settings.assistant.addressStyle,assistantScope:settings.assistant.scope,topics:settings.assistant.topics,contact:{address:settings.business.address,phone:settings.business.phone,email:settings.business.email,website:settings.business.website},experience:settings.experience,
      booking:{provider:settings.booking.url?'external-link':'manual',status:settings.booking.url?'external':'pending',enabled:false,url:settings.booking.url,message:settings.booking.message},
      pending:[...(services.some(s=>s.active&&s.priceCents===null)?['Precios de algunos servicios']:[]),...(services.some(s=>s.active&&!s.requirements)?['Requisitos de algunos servicios']:[])]};
    result.greeting=businessText(fillTemplate(settings.assistant.welcome,result),result);result.offTopicMessage=fillTemplate(settings.assistant.offTopic,result);result.handoff=fillTemplate(settings.assistant.handoff,result);result.booking.message=fillTemplate(settings.booking.message,result);
    return result;
  };
  return {
    ...repository,
    getCenter, getCenterSettings: state,
    /**
     * saveConfiguration: Valida todas las secciones antes de guardar y protege cambios de moneda/tipo.
     * Entrada (firma real): revision, input.
     * Salida: Configuración persistida; los errores dejan la versión anterior.
     */
    saveConfiguration(revision,input){
      if(!input||Object.keys(input).some(k=>!['profile','configuration'].includes(k)))throw new HttpError(400,'Campos no permitidos.');
      const profile=validateProfile(input.profile),configuration=validateSettings(input.configuration);
      if(configuration.assistant.knowledgeMode==='custom'){
        try{parseFaq(configuration.assistant.knowledgeText);}catch(error){throw new HttpError(400,'Respuestas propias: '+error.message);}
      }
      return repository.updateCenterSettings(revision,old=>{
        const previous=old.configuration||settingsDefaults(center,config);
        const currencyChanged=previous.business.currency!==configuration.business.currency;
        const typeChanged=previous.business.type!==configuration.business.type;
        if(config.provider==='openai'&&configuration.ai.enabled&&!configuration.ai.model)throw new HttpError(400,'Indique el modelo de OpenAI.');
        // Never relabel existing prices as another currency or publish an old business catalog.
        const services=old.services.map(s=>({...s,...(currencyChanged?{priceCents:null,currency:configuration.business.currency}:{}),...(typeChanged?{active:false}:{})}));
        return {...old,profile,configuration,services,configurationRevision:(old.configurationRevision||0)+1};
      });
    },
    listServices: (all=false) => state().services.filter(s=>all || s.active),
    getService: id => state().services.find(s=>s.id===id),
    slots: () => [],
    reserve: () => {throw new HttpError(409,getCenter().booking.message);},
    saveProfile(revision, input) { const profile=validateProfile(input); return repository.updateCenterSettings(revision, old=>({...old,profile})); },
    /**
     * saveService: Edita o agrega un servicio usando revisión optimista y el límite de catálogo.
     * Entrada (firma real): revision, id, input.
     * Salida: Estado actualizado que devuelve updateCenterSettings.
     */
    saveService(revision, id, input) {
      return repository.updateCenterSettings(revision, old=> {
        const prior=old.services.find(s=>s.id===id);
        if(id && !prior) throw new HttpError(404,'Servicio no encontrado.');
        if(!id && old.services.length>=50) throw new HttpError(400,'Se permiten hasta 50 servicios.');
        const service=validateService(input,prior,state().configuration.business.currency);
        return {...old,services: prior ? old.services.map(s=>s.id===id?service:s) : [...old.services,service]};
      });
    },
    setServiceActive: () => {throw new HttpError(400,'Edite el servicio con su versión actual.');},
  };
}
