/**
 * NEXO · GUÍA DEL MÓDULO: server/booking-intent.js
 * Reconocer pedidos sencillos de abrir la agenda o consultar citas.
 * Entrada: Texto de la consulta.
 * Salida: Intención de interfaz reconocida o ausencia de coincidencia.
 * Estado importante: Expresiones regulares distinguen consulta, disponibilidad y reserva.
 * Efectos y límites: No consulta Google ni confirma citas; orienta qué opción mostrar.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

// Presentation hints only: these never create or confirm a booking.
export function bookingIntent(message){
 const text=message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/\b(no|cancelar|cancele|anular)\b/.test(text))return null;
 if(/\b(disponibilidad|disponibles|horarios libres|cupos|horas libres)\b/.test(text))return 'availability';
 if(/\b(consultar|consulto|ver|revisar|tengo|tendre|cuando|confirmada|quedo)\b/.test(text)&&/\b(cita|reserva)\b/.test(text))return 'lookup';
 if(/\b(reservar|agendar|confirmar)\b/.test(text)&&/\b(cita|clase|turno|reserva)\b/.test(text))return 'reserve';
 return null;
}
