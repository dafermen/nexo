/**
 * NEXO · GUÍA DEL MÓDULO: scripts/activate-practical-booking.mjs
 * Aplicar la activación inicial específica del piloto de la escuela.
 * Entrada: Configuración local, calendario autorizado y horario existente.
 * Salida: Respaldo SQLite, servicio Clase práctica y reglas habilitadas.
 * Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
 * ejecutar.
 * Efectos y límites: Script histórico de escritura, no comando habitual de arranque. No crea
 * eventos, pero sí modifica configuración y consulta Google.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// One-time local activation requested by the owner; never prints credentials.
import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {readConfig} from '../server/config.js';
import {createRepository} from '../server/db.js';
import {centerRepository,schoolCenter} from '../server/center.js';
import {GoogleCalendarService} from '../server/providers/google-calendar.js';
import {BookingService} from '../server/booking.js';
const config=readConfig();
if(config.center?.id!==schoolCenter.id)throw Error('Esta activación solo corresponde a la escuela autorizada.');
mkdirSync('.local/backups',{recursive:true});
const source=new DatabaseSync(config.dbPath,{readOnly:true});
try{await backup(source,resolve('.local/backups/before-practical-booking-'+Date.now()+'.sqlite'));}finally{source.close();}
const base=createRepository(config.dbPath),repo=centerRepository(base,config.center,config),calendar=new GoogleCalendarService({repository:repo,config:config.googleCalendar});
try{
 const status=calendar.status();if(!status.connected||status.selected?.name!=='Mogollon Method')throw Error('No está seleccionado el calendario autorizado para el piloto.');
 const current=repo.getCenterSettings();if(current.configuration.business.timezone!=='America/New_York'||current.profile.weeklyHours.some((r,i)=>i<5?r.open!=='08:00'||r.close!=='18:00':r.open!==null||r.close!==null))throw Error('Los horarios vigentes no coinciden con las reglas del piloto.');
 let service=current.services.find(s=>s.name==='Clase práctica');
 if(!service){const saved=repo.saveService(current.revision,null,{name:'Clase práctica',description:'Clase individual de conducción de 60 minutos. Elija un horario disponible para reservar su clase.',duration:60,priceCents:null,requirements:null,modality:'Presencial',active:true});service=saved.services.find(s=>s.name==='Clase práctica');}
 if(!service.active||service.duration!==60)throw Error('Revise la duración y el estado de Clase práctica antes de activar.');
 const booking=new BookingService({repository:repo,calendar});
 await booking.configure({...repo.bookingSettings(),enabled:true,serviceIds:[service.id],horizonDays:14,noticeMinutes:60,stepMinutes:60});
 const available=await booking.availability(service.id);
 console.log(JSON.stringify({configured:true,service:service.name,duration:service.duration,calendar:status.selected.name,timezone:available.timezone,availableSlots:available.slots.length,firstSlot:available.slots[0]||null,realEventsCreated:0}));
}finally{calendar.close();base.close();}
