# Seguridad del piloto: controles y evidencia

Revisión de Nexo v0.25.0, 26/09/2026. Alcance: código local, configuración preparada, pruebas automatizadas y ejecución Linux aislada. No incluye todavía el VPS, DNS, certificado público, cuenta SMTP ni autorización OAuth del dominio final. **No es una certificación de ausencia de vulnerabilidades ni un pentest externo.**

## Controles incorporados

| Riesgo | Control y alcance |
|---|---|
| Cualquiera consume IA/video al encontrar el dominio | Entrada privada antes de configuración, catálogo, sesiones, voz y video. Clave aleatoria, verificador scrypt, cookie Secure/HttpOnly con prefijo `__Host-`, límites persistidos de intentos. |
| Un participante ve información privada | Acceso administrativo independiente por correo; documentos API privados en modo piloto; historial, ajustes y reservas administrativas mantienen autorización. |
| Peticiones desde otro sitio | Host/origen exactos; Origin obligatorio para operaciones con cambios; comprobación de Fetch Metadata; cookie del piloto Lax para permitir el retorno OAuth, con comprobación de origen en los POST. |
| Cabeceras falsas evaden límites | Solo proxy local y dominio configurado; Caddy sobrescribe IP/protocolo. No se confía en X-Forwarded-For recibido del público. |
| Costes por abuso | Cuotas de IA por sesión/día, techos del entorno en piloto, contador persistido de intentos de video, máximo 60 segundos, LITE obligatorio. Son límites de solicitudes, **no un presupuesto monetario exacto**. |
| Sobrecarga | Límite de sesiones activas, mapa acotado de rate limits, máximo de derivaciones de clave del piloto en paralelo, tamaños/tiempos HTTP, proceso con recursos/permisos restringidos. Un ataque volumétrico requiere mitigación del proveedor. |
| Secretos/archivos expuestos | Solo tipos estáticos permitidos dentro de la ruta física de public; comprobación de enlaces simbólicos. Configuración privada fuera del código. Paquete creado por lista permitida. |
| Pérdida de datos | Respaldo coherente de SQLite, clave de Calendar y configuración cifrados; procedimiento de restauración separado. |
| Almacenamiento indefinido | Conversaciones: 7 días por defecto y máximo 30 en piloto. Citas, reseñas y otros registros siguen sus reglas propias; revisar/exportar/borrar datos del piloto al cierre. Retención de respaldos separada. |
| Errores de voz en Linux | Ejecutable y directorio de modelos configurables; versiones fijadas, modelos con SHA256 y caché diferenciada por motor/voz/idioma. |

La clave de participantes es compartida: no identifica individualmente a cada persona. Rotarla al terminar el piloto. No equivale a cuentas de clientes ni a roles múltiples; hay una lista explícita de administradores con los mismos permisos. Usuarios autorizados aún pueden usar las funciones comerciales de prueba y generar citas/correos conforme a los límites existentes.

## Pruebas y evidencia local

- Suite del servidor y lógica, incluidas pruebas de acceso piloto: aprobada en Windows y Node 24.21.0 en Linux. 253 pruebas de servidor/lógica y 159 fichas/cabeceras de código verificadas; el paquete Linux omite ocho lanzadores CMD de Windows.
- Instalación desde el tar verificado, dependencias limpias, preflight y arranque del servidor como usuario nexo probados en Ubuntu 24.04 aislado; sin publicar puertos del contenedor.
- Navegador HTTPS: entrada desktop/móvil, cookies, inicio del kiosco, documentación privada, código administrativo simulado y cierre aprobados. Portal documental y home responsive en nueve tamaños también aprobados.
- Casos nuevos: bloqueo antes de proveedores, cookies, origen ausente/ajeno, host/proxy falsos, separación de administrador, rutas privadas, logout, expiración, límites de intentos, cupo de sesiones, video y persistencia de presupuesto tras reinicio.
- Síntesis real ES/EN/FR aprobada en Ubuntu 24.04/Python 3.12, proceso no privilegiado, archivos de solo lectura y red desactivada. Se detectó y agregó `pathvalidate==3.3.1` para la CLI de Piper 1.4.1.
- Respaldo cifrado age y restauración de SQLite, entorno y clave probados con datos ficticios dentro de Ubuntu 24.04; integridad, contenido y permisos correctos. No se respaldó la base real.
- Plantilla Caddy validada con 2.11.4. Esto verifica configuración; no emite ni prueba el certificado del dominio del cliente.
- Auditoría npm de Nodemailer y, por separado, versiones vendorizadas Three 0.180.0, Marked 17.0.5 y LiveKit Client 2.22.3: sin vulnerabilidades conocidas reportadas en la consulta.
- Auditoría pip de las dependencias fijadas de Piper, incluida pathvalidate: sin vulnerabilidades conocidas reportadas. La consulta no audita los modelos ni demuestra la ausencia de fallos desconocidos.
- No se abrió una sesión pagada de LiveAvatar, no se enviaron consultas de pago a OpenAI, ni se crearon citas/correos reales durante esta preparación.

Evidencias técnicas en `.local/vps-*.log` y `.local/vps-*-audit.json`, excluidas de la entrega. Las auditorías deben repetirse al instalar y actualizar. Los avisos/licencias de dependencias se conservan; no se modificó código de terceros.

## Condiciones de aceptación pendientes en el VPS

1. Dirección y arquitectura reales, dominio, DNS y HTTPS accesible desde otra red.
2. Firewall IPv4/IPv6; Node/SQLite sin exposición; SSH restringido y recuperación disponible.
3. Claves propias del piloto, permisos de archivos y unidad systemd funcionando sin privilegios.
4. Envío/recepción del código administrativo y correo de una reserva; autorización Calendar sobre el dominio definitivo.
5. Prueba de micrófono, voz, video breve, idiomas y cierre automático desde equipos del cliente.
6. Respaldo cifrado fuera del servidor, restauración y política de borrado de todas las categorías de datos acordada con el responsable.
7. Supervisión de memoria, disco, errores, caducidad de certificados y cuotas. Mantener actualizaciones de sistema y dependencias.

Hasta completar esas pruebas, el estado es **preparado para instalar y validar el piloto**, no «servidor público validado». Usar datos ficticios y el calendario de pruebas. La guía operativa está en [Despliegue Linux](45-despliegue-piloto-linux.md).
