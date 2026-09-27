/**
 * NEXO · GUÍA DEL MÓDULO: server/calendar-store.js
 * Guardar la conexión de Calendar y las pruebas pendientes.
 * Entrada: db; tokens ya cifrados, calendario seleccionado y comprobaciones.
 * Salida: Métodos de lectura/escritura del estado de conexión y pruebas.
 * Estado importante: selected identifica la agenda; pendingCalendarTests permite recuperar una
 * prueba interrumpida.
 * Efectos y límites: Almacena datos; el cifrado y las peticiones OAuth pertenecen al proveedor
 * google-calendar.js.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

export function createCalendarStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS google_calendar_connection(id INTEGER PRIMARY KEY CHECK(id=1),tokens TEXT,selected TEXT,lastCheck TEXT);
 CREATE TABLE IF NOT EXISTS google_calendar_tests(id TEXT PRIMARY KEY,calendarId TEXT NOT NULL,marker TEXT NOT NULL,createdAt TEXT NOT NULL);
 INSERT OR IGNORE INTO google_calendar_connection(id) VALUES(1);`);
 return {
  readCalendarConnection(){const r=db.prepare('SELECT * FROM google_calendar_connection WHERE id=1').get();return {...r,selected:r.selected?JSON.parse(r.selected):null,lastCheck:r.lastCheck?JSON.parse(r.lastCheck):null};},
  saveCalendarTokens(tokens){db.prepare('UPDATE google_calendar_connection SET tokens=? WHERE id=1').run(tokens);},
  selectCalendar(selected){db.prepare('UPDATE google_calendar_connection SET selected=?,lastCheck=NULL WHERE id=1').run(selected?JSON.stringify(selected):null);},
  recordCalendarCheck(result){db.prepare('UPDATE google_calendar_connection SET lastCheck=? WHERE id=1').run(JSON.stringify(result));},
  clearCalendarConnection(){db.prepare('UPDATE google_calendar_connection SET tokens=NULL,selected=NULL,lastCheck=NULL WHERE id=1').run();},
  pendingCalendarTests(){return db.prepare('SELECT * FROM google_calendar_tests ORDER BY createdAt').all();},
  addCalendarTest(test){db.prepare('INSERT INTO google_calendar_tests VALUES(?,?,?,?)').run(test.id,test.calendarId,test.marker,test.createdAt);},
  removeCalendarTest(id){db.prepare('DELETE FROM google_calendar_tests WHERE id=?').run(id);}
 };
}
