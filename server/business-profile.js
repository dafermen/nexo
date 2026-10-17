/** NEXO · GUÍA DEL MÓDULO: server/business-profile.js
 * Entrada: centro configurado. Salida: capacidades y etiquetas del perfil.
 * No lee secretos ni activa módulos por datos enviados desde el navegador.
 */
export function businessProfile(center){
 const school=center?.businessType==='driving-school'||(!center?.businessType&&center?.id==='metodomogollon');
 return {id:school?'driving-school':'general',school,labels:{customer:school?'Estudiante':'Cliente',professional:school?'Profesor':'Profesional'},modules:{reception:true,catalog:true,agenda:true,schoolRecords:school},payments:false};
}
