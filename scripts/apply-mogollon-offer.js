/**
 * NEXO · GUÍA DEL MÓDULO: scripts/apply-mogollon-offer.js
 * Entrada: entorno de Nexo y --apply opcional; catálogo/FAQ vigentes de SQLite.
 * Salida: resumen sin datos personales; por defecto solo calcula una propuesta.
 * Efectos con --apply: actualiza catálogo y FAQ con revisiones optimistas.
 * Ejecutar con respaldo y servicio detenido. Repetible; no mueve citas ni calendarios.
 */
import {readConfig} from '../server/config.js';
import {createRepository} from '../server/db.js';
import {mogollonOffer} from '../server/mogollon-offer.js';
const config=readConfig();if(config.center?.id!=='metodomogollon')throw Error('Esta carga corresponde únicamente a MetodoMogollon.');
const repo=createRepository(config.dbPath);
try{
 const current=repo.readCenterSettings(),stored=repo.readKnowledge('school'),booking=repo.bookingSettings();
 if(!stored||current.configuration.assistant.knowledgeMode!=='file')throw Error('Revise la base de conocimiento activa antes de cargar el catálogo.');
 const candidates=current.services.filter(s=>booking.serviceIds.includes(s.id)&&s.duration===60&&/clase pr[aá]ctica/i.test(s.name));
 if(candidates.length!==1)throw Error('No se identificó una única clase práctica reservable.');
 const proposed=mogollonOffer(current.services,candidates[0].id,stored.source);
 if(process.argv.includes('--apply')){
  repo.updateCenterSettings(current.revision,s=>({...s,services:proposed.services}));
  repo.saveKnowledge('school',stored.revision,proposed.knowledge);
 }
 console.log(JSON.stringify({applied:process.argv.includes('--apply'),services:proposed.services.filter(s=>s.active).map(({name,priceCents})=>({name,priceUSD:priceCents/100})),bookingRulesPreserved:JSON.stringify(booking)===JSON.stringify(repo.bookingSettings())}));
}finally{repo.close();}
