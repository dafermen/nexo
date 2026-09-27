/**
 * NEXO · GUÍA DEL MÓDULO: tests/calendar-fixture.js
 * Crear un servidor y repositorio de pruebas de Calendar compartidos.
 * Entrada: Dependencias y respuestas simuladas definidas en el fixture.
 * Salida: Entorno aislado reutilizable por pruebas de interfaz.
 * Estado importante: El fixture registra peticiones para comprobar efectos sin crear citas reales.
 * Efectos y límites: No representa una conexión OAuth real; cerrar recursos al terminar la prueba.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {randomBytes} from 'node:crypto';
import {createRepository} from '../server/db.js';
import {GoogleCalendarService,calendarScopes} from '../server/providers/google-calendar.js';
export function calendarFixture({repo=createRepository(':memory:'),key=randomBytes(32)}={}){
 let time=Date.parse('2026-09-24T15:00:00Z');
 const calendars=[{id:'personal@example.test',summary:'Personal',timeZone:'America/New_York',accessRole:'owner',primary:true},{id:'mogollon-test@group.calendar.google.com',summary:'Mogollon Method',timeZone:'America/New_York',accessRole:'owner'},{id:'other-id@group.calendar.google.com',summary:'Mogollon Method',timeZone:'America/Bogota',accessRole:'reader'}];
 const calls=[],events=new Map(),flags={};const result=(data,status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 const fetchImpl=async(url,options={})=>{const u=new URL(url),body=options.body?options.body instanceof URLSearchParams?Object.fromEntries(options.body):JSON.parse(options.body):null;calls.push({url:u.href,path:u.pathname,method:options.method||'GET',body,headers:options.headers});
  if(u.hostname==='oauth2.googleapis.com'){
   if(u.pathname==='/revoke')return result({},flags.revokeFails?500:200);
   if(flags.invalidGrant)return result({error:'invalid_grant'},400);
   if(body.grant_type==='refresh_token')return result({access_token:'renewed-secret-token',expires_in:3600});
   return result({access_token:'secret-access-token',refresh_token:flags.noRefresh?undefined:'secret-refresh-token',expires_in:3600,scope:flags.partialScope?calendarScopes[0]:calendarScopes.join(' ')});
  }
  if(u.hostname!=='www.googleapis.com')throw Error('Unexpected external host');
  if(flags.unauthorizedOnce){flags.unauthorizedOnce=false;return result({},401);}
  if(flags.forbidden)return result({error:{message:'private-google-diagnostic'}},403);
  if(u.pathname.endsWith('/users/me/calendarList'))return result({items:u.searchParams.get('pageToken')?calendars.slice(1):calendars.slice(0,1),...(u.searchParams.get('pageToken')?{}:{nextPageToken:'page-two'})});
  if(u.pathname.includes('/users/me/calendarList/')){const id=decodeURIComponent(u.pathname.split('/').at(-1)),c=calendars.find(c=>c.id===id);return c?result(c):result({},404);}
  const match=u.pathname.match(/\/calendars\/([^/]+)\/events(?:\/([^/]+))?(\/move)?$/);if(!match)throw Error('Unexpected calendar request');
  const calendarId=decodeURIComponent(match[1]),id=match[2],eventKey=calendarId+'/'+id;
  if(match[3]){
   if(flags.moveRejected)return result({},flags.moveRejected);if(flags.moveNetworkBefore)throw Error('Network before move');
   const event=events.get(eventKey);if(!event)return result({},404);events.delete(eventKey);const moved=structuredClone(event);delete moved.extendedProperties?.private;events.set(u.searchParams.get('destination')+'/'+id,moved);if(flags.moveUncertain)throw Error('Network after move');return result(moved);
  }
  if(options.method==='POST'){events.set(calendarId+'/'+body.id,{...structuredClone(body),iCalUID:body.id+'@google.com'});if(flags.insertUncertain)throw Error('Network after insert');return result(body);}
  if(options.method==='PATCH'){if(flags.patchFails)return result({},503);const event=events.get(eventKey);if(!event)return result({},404);Object.assign(event,body);return result({etag:'"fixture-v2"',...event});}
  if(options.method==='DELETE'){if(flags.changedBeforeDelete)return result({},412);if(flags.deleteFails)return result({},503);events.delete(eventKey);return result(null,204);}
  if(id){const event=events.get(eventKey);return event?result({etag:'"fixture-v1"',...event}):result({},404);}
  return result({items:[{id:'existing-event'}]});
 };
 const config={clientId:'client-id.apps.googleusercontent.com',clientSecret:'secret-client-value',redirectUri:'http://localhost:3000/api/calendar/oauth/callback',keyPath:'unused-fixture-key'};
 const service=new GoogleCalendarService({repository:repo,config,fetchImpl,now:()=>time,key});
 async function authorize(){const started=service.begin(),state=new URL(started.url).searchParams.get('state');await service.complete({state,code:'authorization-code'},started.binding);}
 return {repo,key,config,fetchImpl,service,calendars,calls,events,flags,authorize,advance:ms=>time+=ms};
}
