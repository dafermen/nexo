/**
 * NEXO · GUÍA DEL MÓDULO: tests/instructors-fixture.js
 * Cinco profesores simulados, con eventos aislados por calendario y repositorio real.
 * Entrada: reloj opcional. Salida: fixture, BookingService e inputs; nunca usa Google real.
 */
import {randomUUID} from 'node:crypto';
import {calendarFixture} from './calendar-fixture.js';
import {centerRepository,schoolCenter} from '../server/center.js';
import {BookingService} from '../server/booking.js';
export async function instructorsFixture({now=()=>Date.parse('2026-09-28T11:00:00Z')}={}){
 const f=calendarFixture();await f.authorize();await f.service.select(f.calendars[1].id);const repo=centerRepository(f.repo,schoolCenter);
 repo.saveService(repo.getCenterSettings().revision,'road-test',{name:'Clase práctica',description:'Clase de conducción',duration:60,priceCents:null,requirements:null,modality:'Presencial',active:true});
 const teachers=Array.from({length:5},(_,i)=>({id:'teacher-'+i+'@example.test',summary:'Profesor '+(i+1),timeZone:'America/New_York',accessRole:'owner'}));f.calendars.push(...teachers);
 const original=f.service.fetch;f.service.fetch=async(url,options)=>{const u=new URL(url);if(options.method==='GET'&&u.pathname.endsWith('/events')){
  const id=decodeURIComponent(u.pathname.split('/').at(-2));if(f.flags.unreadableCalendar===id)return new Response('{}',{status:503});
  return new Response(JSON.stringify({items:[...f.events].filter(([key])=>key.startsWith(id+'/')).map(([,event])=>event)}));
 }return original(url,options);};
 const bookings=new BookingService({repository:repo,calendar:f.service,now});
 await bookings.configure({...repo.bookingSettings(),enabled:true,serviceIds:['road-test'],assignment:'instructors',instructors:teachers.map(c=>({name:c.summary,calendarId:c.id,active:true,serviceIds:['road-test']}))});
 return {...f,repo,bookings,teachers,input:(slot,instructorId)=>({requestId:randomUUID(),sessionHash:'test-session',serviceId:'road-test',slot,instructorId,customerName:'Alumno Prueba',email:'test@example.test',priceCents:null}),close(){f.service.close();f.repo.close();}};
}
