/** NEXO · GUÍA DEL MÓDULO: server/staff.js
 * Entrada: rol autenticado y ruta HTTP. Salida: permiso explícito; por defecto deniega.
 * Los propietarios de instalación conservan recuperación; las cuentas de personal no
 * sustituyen credenciales de Google ni conceden acceso a expedientes todavía inexistentes.
 */
export const roles=['owner','manager','advisor','instructor'];
export function staffCan(role,path,method='GET'){
 if(role==='owner')return true;
 if(path==='/api/admin/me')return roles.includes(role);
 if(/^\/api\/admin\/students(?:\/|$)/.test(path))return roles.includes(role);
 if(/^\/api\/admin\/school-groups(?:\/|$)/.test(path))return ['manager','advisor'].includes(role);
 if(path.startsWith('/api/admin/reception'))return ['manager','advisor'].includes(role);
 if(role==='manager')return /^\/api\/admin\/(publications|content-releases|overview|services|center|knowledge|reviews|agenda|agenda-availability|reports)(\/|$)/.test(path);
 return false;
}
