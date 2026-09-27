/**
 * NEXO · GUÍA DEL MÓDULO: tests/documentation.test.js
 * Pruebas unitarias y de integración de documentation.
 * Entrada: Casos y fixtures definidos en este archivo; dependencias simuladas cuando se inyectan.
 * Salida: Aserciones aprobadas o fallo con ubicación; los E2E pueden generar capturas locales.
 * Estado importante: fixture prepara escenario; assert compara resultado esperado; limpieza de
 * recursos evita contaminación entre casos.
 * Efectos y límites: Revisar fixtures y proveedores inyectados antes de ejecutar; los dobles
 * aíslan servicios externos. No usar la base de producción como fixture.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createDocumentation} from '../server/documentation.js';
import {createApp} from '../server/app.js';
import {createRepository} from '../server/db.js';

async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'nexo-docs-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(root,'docs'));
 await Promise.all([writeFile(join(root,'README.md'),'# Nexo\nProyecto de prueba.'),writeFile(join(root,'docs','guide.md'),'# Guía\nContenido único para buscar.'),writeFile(join(root,'docs','project-status.json'),JSON.stringify({version:'test',phases:[],tasks:[]})),writeFile(join(root,'.env'),'PRIVATE_FIXTURE'),writeFile(join(root,'docs','unsafe.js'),'SECRET_FIXTURE'),writeFile(join(root,'docs','capture.png'),Buffer.from([137,80,78,71])),writeFile(join(root,'docs','.hidden.md'),'Hidden')]);
 return {root,docs:createDocumentation({projectRoot:root})};
}
test('Documentation discovers only supported project documentation and safe images',async t=>{
 const {docs}=await fixture(t),catalog=await docs.catalog();assert.deepEqual(catalog.documents.map(d=>d.path),['README.md','docs/guide.md']);assert.equal(catalog.assets.length,1);assert.equal(catalog.status.version,'test');assert.ok(catalog.documents.some(d=>d.searchText.includes('único')));assert.ok(!JSON.stringify(catalog).includes('PRIVATE_FIXTURE'));assert.ok(!JSON.stringify(catalog).includes('SECRET_FIXTURE'));
 assert.match((await docs.document(catalog.documents[1].id)).text,/Guía/);const image=await docs.asset(catalog.assets[0].id);assert.equal(image.mime,'image/png');assert.equal(image.contents.length,4);
});
test('Documentation rejects paths, malformed IDs and unknown IDs',async t=>{
 const {docs}=await fixture(t);for(const id of ['../../.env','README.md','%2e%2e','0'.repeat(20),'',null])await assert.rejects(docs.document(id),e=>e.status===404);await assert.rejects(docs.asset('../.env'),e=>e.status===404);
});
test('Documentation refreshes additions and handles removed documents',async t=>{
 const {docs,root}=await fixture(t);const c=await docs.catalog(),doc=c.documents.find(d=>d.path==='docs/guide.md');await unlink(join(root,doc.path));await assert.rejects(docs.document(doc.id),e=>e.status===404);await writeFile(join(root,'docs','new.md'),'# Nueva guía');const next=await docs.catalog();assert.equal(next.documents.length,2);assert.ok(next.documents.some(d=>d.title==='Nueva guía'));
});
test('Documentation does not traverse directory links to another project',async t=>{
 const {docs,root}=await fixture(t);const other=await mkdtemp(join(tmpdir(),'nexo-other-'));t.after(()=>rm(other,{recursive:true,force:true}));await writeFile(join(other,'other.md'),'OTHER_PROJECT');await symlink(other,join(root,'docs','linked'),'junction');assert.ok(!JSON.stringify(await docs.catalog()).includes('OTHER_PROJECT'));
});
test('Documentation rejects a docs root that points outside Nexo',async t=>{
 const root=await mkdtemp(join(tmpdir(),'nexo-root-')),other=await mkdtemp(join(tmpdir(),'nexo-external-'));t.after(async()=>{await rm(root,{recursive:true,force:true});await rm(other,{recursive:true,force:true});});await symlink(other,join(root,'docs'),'junction');await assert.rejects(createDocumentation({projectRoot:root}).catalog(),e=>e.status===404);
});
test('Documentation HTTP routes are read-only and do not call paid providers',async t=>{
 const {docs}=await fixture(t),repository=createRepository(':memory:');const server=createApp({config:{provider:'demo',sessionTtlMs:300000},repository,ai:{reply(){throw new Error('Unexpected AI');}},documentation:docs,localTts:{stop(){},close(){}},liveAvatar:{async close(){}}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(r=>server.close(r));repository.close();});const base='http://127.0.0.1:'+server.address().port;
 const catalog=await (await fetch(base+'/api/docs/catalog')).json();assert.equal(catalog.documents.length,2);assert.equal((await fetch(base+'/docs')).status,200);assert.equal((await fetch(base+'/docs/')).status,200);assert.equal((await fetch(base+'/api/docs/document?id='+catalog.documents[0].id)).status,200);assert.equal((await fetch(base+'/api/docs/assets?id='+catalog.assets[0].id)).headers.get('content-type'),'image/png');
 for(const path of ['/.env','/docs/project-status.json','/api/docs/document?id=../../.env','/api/docs/unknown'])assert.equal((await fetch(base+path)).status,404,path);
 assert.equal((await fetch(base+'/api/docs/catalog',{method:'POST'})).status,405);assert.equal((await fetch(base+'/api/docs/catalog',{headers:{origin:'https://untrusted.example'}})).status,403);
});
test('Nexo project board has valid phases, unique tasks and document evidence',async()=>{
 const {documents,status}=await createDocumentation().catalog();const phases=new Set(status.phases.map(p=>p.id)),ids=new Set(),allowed=new Set(['completed','partial','pending']);for(const phase of status.phases)assert.ok(allowed.has(phase.status));for(const task of status.tasks){assert.ok(!ids.has(task.id));ids.add(task.id);assert.ok(phases.has(task.phaseId));assert.ok(allowed.has(task.status));assert.ok(documents.some(d=>d.path===task.evidence.path),task.evidence.path);if(task.status!=='completed')assert.ok(task.acceptance);}
 assert.ok(documents.some(d=>d.path==='docs/23-manual-desarrollador-junior.md'));
});
