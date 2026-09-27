/**
 * NEXO · GUÍA DEL MÓDULO: server/http-security.js
 * Entrada: petición HTTP y configuración validada. Salida: origen e IP fiables.
 * Efectos: rechaza Host/Origin falsos y evita confiar en cabeceras públicas de proxy.
 * En piloto solo Caddy local puede afirmar HTTPS e IP; debe sobrescribir cabeceras.
 */
import {isIP} from 'node:net';
import {HttpError} from './errors.js';
const loopback=ip=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
export function requestContext(req,config){
  const pilot=config.deploymentMode==='pilot';
  const publicUrl=config.publicOrigin?new URL(config.publicOrigin):null;
  let authority;try{authority=new URL(`${publicUrl?.host===req.headers.host?'https':'http'}://${req.headers.host||''}`);}catch{throw new HttpError(400,'Host inválido.');}
  if(authority.username||authority.password||authority.pathname!=='/'||authority.search||authority.hash)throw new HttpError(400,'Host inválido.');
  if(!['localhost','127.0.0.1','[::1]'].includes(authority.hostname)&&authority.origin!==publicUrl?.origin)throw new HttpError(403,'Host no permitido.');
  let clientIp=req.socket.remoteAddress;
  if(pilot){
    if(authority.origin!==publicUrl?.origin||!loopback(clientIp)||req.headers['x-nexo-proto']!=='https'||!isIP(req.headers['x-nexo-client-ip']||''))throw new HttpError(403,'Acceso permitido únicamente por el proxy HTTPS configurado.');
    clientIp=req.headers['x-nexo-client-ip'];
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==publicUrl.origin)throw new HttpError(403,'Origen requerido.');
    if(req.headers['sec-fetch-site']==='cross-site'&&!(req.method==='GET'&&req.headers['sec-fetch-mode']==='navigate'))throw new HttpError(403,'Solicitud externa no permitida.');
  }
  if(req.headers.origin&&req.headers.origin!==authority.origin&&req.headers.origin!==publicUrl?.origin)throw new HttpError(403,'Origen no permitido.');
  return {authority,clientIp};
}
