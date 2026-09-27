/** NEXO · GUÍA DEL MÓDULO: tests/mogollon-offer.test.js
 * Afiches y preguntas ficticias contra funciones puras; no modifica la instalación.
 */
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {mogollonOffer} from '../server/mogollon-offer.js';
import {schoolServices,schoolCenter} from '../server/center.js';import {filterSchoolMessage} from '../server/school-filter.js';import {parseFaq,compileFaq} from '../server/faq.js';
const prior=[...schoolServices,{id:'practice',name:'Clase práctica',duration:60,active:true}],source=readFileSync(new URL('../conocimiento/preguntas-frecuentes.txt',import.meta.url),'utf8');
const offer=mogollonOffer(prior,'practice',source),services=offer.services.filter(s=>s.active),faq=compileFaq(parseFaq(offer.knowledge));
const ask=message=>filterSchoolMessage({message,services,center:schoolCenter,state:{},faq});
test('afiche: nueve precios exactos, ID de práctica conservado y aplicación repetible',()=>{
 assert.deepEqual(services.map(s=>s.priceCents),[3500,6000,8000,8000,15000,58500,84500,106500,126000]);assert.equal(services[1].id,'practice');assert.equal(services[1].duration,60);assert.equal(services[4].duration,null);
 assert.deepEqual(mogollonOffer(offer.services,'practice',offer.knowledge),offer);assert.equal(prior[0].priceCents,null);
});
test('preguntas distinguen clase, road test, curso, cuaderno, manual y paquetes',()=>{
 for(const [question,price] of [['¿Cuánto cuesta la clase práctica?','60.00'],['¿Cuánto cuesta el road test?','150.00'],['¿Cuánto cuesta el curso de las 5 horas?','80.00'],['Precio del cuaderno','35.00'],['Precio del manual práctico','80.00'],['Cuánto cuesta el paquete de cinco clases','585.00'],['Precio paquete de 10 clases','845.00'],['Precio paquete de 15 clases','1065.00'],['Precio paquete de 20 clases','1260.00']]){const answer=ask(question);assert.equal(answer.kind,'local');assert.ok(answer.text.includes(price),question+': '+answer.text);}
 const detail=ask('¿Qué incluye paquete de 5 clases?').text;assert.match(detail,/carro y cita/);assert.doesNotMatch(detail,/Obsequio/);assert.match(ask('Cuaderno').text,/Obsequio/);
 assert.doesNotMatch(ask('Requisitos de la clase práctica').text,/garantiz|gratis/);
});
