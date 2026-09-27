/**
 * NEXO · GUÍA DEL MÓDULO: server/providers/booking-mail.js
 * Enviar comprobantes de citas en el idioma del visitante.
 * Entrada: booking confirmado, centerName y configuración SMTP heredada.
 * Salida: Promesa del envío del comprobante.
 * Estado importante: slot/timezone determinan hora local; code es el identificador visible,
 * language elige textos.
 * Efectos y límites: Envía correo; no confirma ni modifica el evento Google. Fallar el correo no
 * implica que se haya perdido la reserva.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import {translate,validLanguage} from '../languages.js';
import {AdminMailer} from './admin-mail.js';

export class BookingMailer extends AdminMailer{
 /** Envía datos básicos a UN administrador; nunca copia otros destinatarios ni el chat. */
 async sendNewBooking({to,booking,centerName}){
  if(!this.ready)throw Error('Correo no configurado.');
  const format=new Intl.DateTimeFormat('es',{dateStyle:'full',timeStyle:'short',timeZone:booking.timezone});
  const result=await this.transport.sendMail({from:{name:'Nexo · Reservas',address:this.settings.from},to,
   subject:'Nueva cita confirmada · '+booking.serviceName.replace(/[\r\n]/g,' '),
   text:`Nueva cita en ${centerName}.\n\nServicio: ${booking.serviceName}\n${booking.instructorName?'Profesor: '+booking.instructorName+'\n':''}Nombre: ${booking.customerName}\nCorreo: ${booking.email}\nInicio: ${format.format(new Date(booking.slot))}\nFin: ${format.format(new Date(booking.end))}\nZona horaria: ${booking.timezone}\nCódigo: ${booking.code||booking.id}\n\nRegistrada en Google Calendar. Este aviso no acredita pago. Consulte Agenda y citas en la administración de Nexo para gestionar la reserva.`});
  if(!result.accepted?.some(a=>String(a).toLowerCase()===to.toLowerCase()))throw Error('Envío no confirmado.');
 }
 async sendConfirmation({booking,centerName}){
  if(!this.ready)throw Error('Correo no configurado.');
  const language=validLanguage(booking.language)?booking.language:'es';
  const format=new Intl.DateTimeFormat(language,{dateStyle:'full',timeStyle:'short',timeZone:booking.timezone});
  let text=`Su cita está confirmada en ${centerName}.\n\nServicio: ${booking.serviceName}\nInicio: ${format.format(new Date(booking.slot))}\nFin: ${format.format(new Date(booking.end))}\nZona horaria: ${booking.timezone}\n\nCódigo de reserva: ${booking.code||booking.id}\n\nPara consultar su cita en Nexo, elija «Consultar cita» e introduzca este código y el correo donde recibió este mensaje. No comparta el código.\n\nLa cita está registrada en la agenda del negocio; no se añade automáticamente a su calendario personal. No se ha realizado ningún cobro. Para cambios o cancelaciones, contacte al personal.\n\nSi no realizó esta reserva, contacte al negocio.`;
  const service=translate(booking.serviceName,language);
  if(language==='en')text=`Your appointment at ${centerName} is confirmed.\n\nService: ${service}\nStart: ${format.format(new Date(booking.slot))}\nEnd: ${format.format(new Date(booking.end))}\nTime zone: ${booking.timezone}\n\nBooking code: ${booking.code||booking.id}\n\nTo find your appointment in Nexo, select “Find appointment” and enter this code and the email address that received this message. Do not share your code.\n\nThe appointment is in the business calendar; it is not automatically added to your personal calendar. No payment has been taken. For changes or cancellations, contact staff.\n\nIf you did not make this booking, contact the business.`;
  if(language==='fr')text=`Votre rendez-vous chez ${centerName} est confirmé.\n\nService : ${service}\nDébut : ${format.format(new Date(booking.slot))}\nFin : ${format.format(new Date(booking.end))}\nFuseau horaire : ${booking.timezone}\n\nCode de réservation : ${booking.code||booking.id}\n\nPour consulter votre rendez-vous dans Nexo, choisissez « Consulter le rendez-vous » et saisissez ce code et l’adresse e-mail qui a reçu ce message. Ne partagez pas votre code.\n\nLe rendez-vous est enregistré dans l’agenda de l’établissement ; il n’est pas ajouté automatiquement à votre agenda personnel. Aucun paiement n’a été effectué. Pour toute modification ou annulation, contactez le personnel.\n\nSi vous n’avez pas effectué cette réservation, contactez l’établissement.`;
  if(booking.instructorName)text+='\n\n'+({es:'Profesor: ',en:'Instructor: ',fr:'Moniteur : '}[language])+booking.instructorName;
  const result=await this.transport.sendMail({from:{name:'Nexo · Reservas',address:this.settings.from},to:booking.email,subject:({es:'Cita confirmada',en:'Appointment confirmed',fr:'Rendez-vous confirmé'}[language])+' · '+service.replace(/[\r\n]/g,' '),text});
  if(!result.accepted?.some(a=>String(a).toLowerCase()===booking.email.toLowerCase()))throw Error('Envío no confirmado.');
 }
}
