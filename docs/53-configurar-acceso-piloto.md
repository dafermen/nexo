# Activar o desactivar el piloto privado y cambiar su clave

Desde v0.31.0, el responsable de la instalación controla el acceso de participantes mediante el archivo de entorno. La administración conserva su acceso por código de correo.

## Dónde configurarlo

- Desarrollo Windows: `C:\Projects\Nexo\.env`.
- Servidor web: `/etc/nexo/nexo.env`. Este es el equivalente al `.env` local; modificar Windows no modifica el servidor.
- Mantener `DEPLOYMENT_MODE=pilot` en el VPS, tanto privado como público. Esta variable activa HTTPS, validación del proxy, límites y retención: no usar `local` para abrir el sitio.
- Editar el archivo privado, nunca los ejemplos del paquete. No poner claves en el chat, repositorios, capturas ni comandos que queden en historial.

## Opciones

| Variable | Uso |
| --- | --- |
| `PILOT_PRIVATE_ENABLED=true` | Exige la clave del piloto antes de abrir el kiosco. |
| `PILOT_PRIVATE_ENABLED=false` | Cualquier visitante del dominio puede entrar al kiosco. Administración, datos y documentación siguen requiriendo autenticación. |
| `PILOT_PASSWORD` | Clave elegida por el responsable, de 16 a 256 caracteres en una sola línea. Escribir entre comillas para preservar espacios y `#`. |
| `PILOT_PASSWORD_HASH` | Alternativa compatible: verificador scrypt generado con `scripts/create-pilot-access.js`. |

Ejemplo **sin clave real**:

```dotenv
DEPLOYMENT_MODE=pilot
PILOT_PRIVATE_ENABLED=true
PILOT_PASSWORD="REEMPLAZAR POR UNA CLAVE PRIVADA LARGA"
```

Sustituya la frase del ejemplo por una contraseña propia antes de guardar. No use la frase del manual como contraseña. Evite comillas dentro de la clave para simplificar su escritura en el archivo.

Si `PILOT_PASSWORD` no está vacía, prevalece sobre `PILOT_PASSWORD_HASH`. Para volver al verificador anterior, dejar `PILOT_PASSWORD=` y mantener el hash válido. Si quiere retirar definitivamente una clave antigua, retire también su hash; dejarlo conservaría la posibilidad de volver a él.

La instalación existente sigue usando su hash y su clave actual. No se genera ni se cambia una clave automáticamente al actualizar. La opción nueva se deja activada en el VPS y desactivada en el desarrollo local.

## Aplicar cambios

1. Abrir el archivo correspondiente con un editor privado.
2. Cambiar la opción y/o la clave y guardar.
3. En Linux, ejecutar `sudo systemctl restart nexo`. En Windows, reiniciar Nexo con el procedimiento de arranque habitual; no iniciar una segunda copia sobre el puerto 3000.
4. Abrir una ventana privada del navegador. Con `true` debe aparecer la entrada del piloto; con `false`, directamente el kiosco.
5. Si se cambió la clave, comunicarla a los participantes por un canal privado. Las sesiones del piloto se invalidan al reiniciar. Cambiar esta clave no modifica los correos ni los códigos de administración.

En privado, una clave ausente/incorrectamente configurada impide arrancar: no abre el sitio por error. `PILOT_PRIVATE_ENABLED` solo admite exactamente `true` o `false`. Si se omite, conserva compatibilidad: privado en `DEPLOYMENT_MODE=pilot` y sin barrera en `local`. Activar acceso privado requiere un `PUBLIC_ORIGIN` HTTPS porque la cookie es segura.

Para abrir al público basta con cambiar **solo** `PILOT_PRIVATE_ENABLED=false` y reiniciar. Puede conservar la clave para volver a cerrar el acceso. El enlace antiguo `/pilot` vuelve al inicio cuando la barrera está deshabilitada. El cambio aumenta el número de personas que pueden usar el kiosco; los límites de consumo siguen vigentes.

## Cómo funciona: guía para el desarrollador junior

1. `server/config.js` recibe el entorno; valida el interruptor y calcula `pilotPrivateEnabled`. Si hay clave directa, `configuredPilotHash` de `server/pilot-access.js` crea un verificador scrypt con salt aleatorio **una vez al arrancar**, antes de aceptar peticiones. La clave directa no se añade al objeto config, aunque sigue presente en el archivo y entorno del proceso.
2. `server/app.js` separa `deployed` (protecciones del VPS) de `pilot` (instancia opcional de la barrera). Quitar la barrera no debe quitar HSTS, los topes de IA, autenticación administrativa, protección documental ni validación de origen.
3. `PilotAccess.login` compara la clave recibida con el verificador usando scrypt asíncrono y comparación de tiempo constante. Limita intentos y concurrencia; entrega una cookie opaca `HttpOnly`, `Secure`, `SameSite=Lax`, de ocho horas, distinta de la cookie administrativa.
4. `GET /api/pilot/status` devuelve `{enabled, authenticated}` sin secretos. `GET /api/config` conserva `pilot` como indicador de la barrera para mostrar u ocultar la salida del piloto.
5. Sin barrera, `/pilot` y `/pilot.html` redirigen a `/`; el inicio de sesión del piloto responde 404. El cierre sigue revocando la sesión administrativa y limpiando cookies, útil para pestañas que estaban abiertas antes del cambio.

No guardar la clave en SQLite ni enviarla a `/api/config`, informes, documentación o logs. Si se usa `PILOT_PASSWORD`, el archivo contiene la clave en claro: mantener `/etc/nexo/nexo.env` root:nexo 0640 y respaldos completos cifrados. Quien prefiera no conservarla en claro puede seguir usando solo el hash.

## Pruebas y mantenimiento

`tests/pilot-security.test.js` cubre compatibilidad, opciones inválidas, configuración incompleta, precedencia/rotación de claves, rechazo de cookies anteriores en otro proceso, rutas públicas, documentación privada, TLS/CSRF, cuotas y errores sin datos secretos. Proveedores y correos son dobles, sin consumo real.

`tests/pilot.e2e.js` recorre el login con HTTPS, cookie segura, pantalla móvil, administración/documentación y logout; también prueba el kiosco abierto en una instancia aislada. Requiere certificado de QA y Playwright. No deshabilitar el piloto real para ejecutar esta prueba.

`node scripts/pilot-smoke.js https://DOMINIO/` verifica un despliegue privado. Tras una apertura intencional usar `node scripts/pilot-smoke.js https://DOMINIO/ --public`. Ambos comprueban controles de acceso sin iniciar llamadas ni crear reservas.

La documentación se encuentra en Administración → Documentación del proyecto. [Despliegue real y operación](47-piloto-metodomogollon.md), [manual del desarrollador](23-manual-desarrollador-junior.md).
