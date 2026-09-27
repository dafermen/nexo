/**
 * NEXO · GUÍA DEL MÓDULO: server/providers/admin-mail.js
 * Enviar el código de acceso administrativo mediante SMTP.
 * Entrada: Configuración mail; destinatario y código temporal.
 * Salida: Promesa del envío; ready indica si existe configuración suficiente.
 * Estado importante: Transport de Nodemailer mantiene la conexión; code no debe aparecer en logs.
 * Efectos y límites: Envía correo real si se usa el proveedor real. En pruebas inyectar un mailer
 * falso.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import nodemailer from 'nodemailer';
export class AdminMailer{
 constructor(settings={},factory=nodemailer.createTransport){
  this.settings=settings;this.ready=!!(settings.host&&settings.from&&settings.user&&settings.password);
  this.transport=this.ready?factory({host:settings.host,port:settings.port,secure:settings.secure,requireTLS:!settings.secure,tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},auth:{user:settings.user,pass:settings.password},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,dnsTimeout:10000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true}):null;
 }
 async sendCode({to,code}){
  if(!this.ready)throw new Error('Correo no configurado.');
  const result=await this.transport.sendMail({from:{name:'Nexo · Administración',address:this.settings.from},to,subject:'Su código de acceso a Nexo',text:'Su código de acceso a Nexo es: '+code+'\n\nVence en 10 minutos y puede utilizarse una sola vez. Ingréselo únicamente en la pantalla de Administración donde lo solicitó.\n\nSi no solicitó este acceso, puede ignorar el mensaje. Un código nuevo reemplaza al anterior.'});
  if(!result.accepted?.some(address=>String(address).toLowerCase()===to.toLowerCase()))throw new Error('Envío no confirmado.');
 }
 close(){this.transport?.close();}
}
