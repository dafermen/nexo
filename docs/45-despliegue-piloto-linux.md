# Despliegue del piloto web en Linux

Nexo v0.25.1 se prepara para un VPS Ubuntu 24.04 x86_64 con dominio propio. La instalación local de Windows continúa funcionando. **No se ha desplegado todavía en Internet**: faltan dominio, acceso y características del VPS. Capacitor/APK queda para una fase posterior.

## Arquitectura de esta entrega

```text
Navegador del participante → HTTPS :443 → Caddy → 127.0.0.1:3000 Nexo
                                                    ├─ SQLite /var/lib/nexo
                                                    ├─ Piper local (ES/EN/FR)
                                                    ├─ OpenAI / LiveAvatar LITE
                                                    └─ SMTP / Google Calendar
```

Un proceso Nexo y una base SQLite. No iniciar varios workers ni varias copias contra el mismo archivo: los bloqueos de sesiones, voz y video también usan memoria. Actualmente la síntesis de voz y el avatar tienen concurrencia limitada a una operación/sesión; este piloto no es un servicio masivo multiusuario.

- `/opt/nexo/releases/...`: código inmutable, propietario root.
- `/opt/nexo/current`: enlace a la versión activa.
- `/opt/node`: Node 24.21.0 LTS verificado, o actualización 24.x posterior revisada.
- `/opt/nexo/piper`: entorno Python aislado; `/opt/nexo/voices`: modelos verificados.
- `/etc/nexo/nexo.env` y `installation.json`: secretos y administración, root:nexo, 0640.
- `/var/lib/nexo`: SQLite, clave de cifrado de Calendar y caché; nexo:nexo, 0700.

No servir una carpeta del proyecto con `file_server`: todo acceso pasa por Nexo. Caddy es el único proxy previsto; un CDN o proxy adicional requiere adaptar y volver a probar la confianza en direcciones IP.

## 1. Preparar y revisar la entrega local

Ejecutar pruebas, comprobación de sintaxis y `npm run docs:check`. Después:

```text
python scripts/package-pilot.py
```

Produce `dist/nexo-pilot-0.25.1.tar.gz` y un archivo SHA256. La lista permitida incluye código, pruebas, guías y plantillas; excluye `.env`, `config/installation.json`, SQLite, `.local`, node_modules, modelos instalados, tokens, historiales y cachés. El manifiesto interno permite verificar cada archivo. No es una firma digital: transferir el SHA256 por un canal fiable.

**No copiar toda la carpeta de Windows al VPS.** El piloto comienza con datos nuevos y la semilla de la escuela; las modificaciones comerciales guardadas en la base local no viajan en el paquete. Revisar catálogo, precios, FAQs e idiomas desde Administración antes de invitar al cliente. Migrar una base real sería una operación separada, previa revisión de datos y respaldo.

## 2. Preparar el VPS

Estos pasos son para un servidor dedicado al piloto. Si ya aloja otros sitios o usa un panel, revisar puertos/proxy y adaptar antes de ejecutarlos.

1. Actualizar Ubuntu y paquetes de seguridad. Acceso SSH por clave, cuenta administrativa propia y acceso de recuperación del proveedor.
2. Firewall del proveedor y del sistema: abrir 80/443; restringir SSH a direcciones autorizadas. **No abrir 3000, 2019 ni SQLite.** Mantener una sesión SSH y probar otra antes de restringir acceso.
3. Instalar `ca-certificates`, `curl`, `xz-utils`, `python3-venv`, `sqlite3` y `age`. Instalar Caddy estable siguiendo su [repositorio oficial para Ubuntu](https://caddyserver.com/docs/install#debian-ubuntu-raspbian). Plantilla validada con Caddy 2.11.4.
4. Instalar Node desde la [distribución oficial 24.21.0](https://nodejs.org/dist/v24.21.0/), verificar el tar con `SHASUMS256.txt` y colocarlo en `/opt/node`. El paquete de esta prueba es `node-v24.21.0-linux-x64.tar.xz`; ARM requiere una validación propia de Node, Piper y sus modelos.
5. Crear usuario de servicio sin inicio de sesión:

```bash
sudo useradd --system --home-dir /var/lib/nexo --shell /usr/sbin/nologin nexo
sudo install -d -o nexo -g nexo -m 700 /var/lib/nexo
sudo install -d -o root -g nexo -m 750 /etc/nexo
sudo install -d -o root -g root -m 755 /opt/nexo/releases
```

Si el usuario/directorio ya existe, comprobar su propietario y contenido; no borrarlo. La unidad `deploy/nexo.service` limita permisos y escritura, y reinicia ante fallos. `MemoryMax=2G` es un límite del proceso, no una recomendación de capacidad del VPS; comprobar memoria total, carga y duración de la voz en el equipo real.

## 3. Instalar una versión y la voz

Transferir el paquete y verificar su SHA256 antes de extraer scripts. `deploy/install-release.sh ARCHIVO SHA256` crea un directorio nuevo, valida rutas/manifiesto, instala dependencias con `npm ci --ignore-scripts` y conserva código propiedad de root. **No activa el servicio.** Recordar la ruta que informa.

```bash
sudo python3 -m venv /opt/nexo/piper
sudo /opt/nexo/piper/bin/pip install -r RUTA_RELEASE/deploy/piper-requirements.txt
sudo python3 RUTA_RELEASE/deploy/install-voices.py /opt/nexo/voices
```

Sustituir `RUTA_RELEASE` por la ruta real. El archivo de dependencias fija las versiones probadas en Python 3.12/Ubuntu 24.04. Incluye `pathvalidate`, necesario para el ejecutable Piper 1.4.1. El instalador verifica SHA256 de los seis archivos de modelos. Si cambia una descarga, falla; no omitir la comprobación.

La voz mantenida de Linux usa [Piper 1.4.1](https://github.com/OHF-Voice/piper1-gpl/releases/tag/v1.4.1), con licencia GPL-3.0. Los modelos tienen sus propios avisos en la sección Licencias. Se instala desde su distribución; el tar de Nexo no redistribuye este motor ni los modelos. Revisar avisos antes de distribuir una futura APK. Al actualizar motor, dependencias o voces, cambiar `PIPER_ENGINE_VERSION` y validar/vaciar audios anteriores cuando corresponda.

## 4. Configuración privada y acceso

Copiar `deploy/pilot.env.example` a `/etc/nexo/nexo.env` y `deploy/installation.example.json` a `/etc/nexo/installation.json`, con permisos root:nexo 0640. Editar usando un editor privado del servidor; no pegar claves en chats, capturas, URLs ni comandos que queden en el historial.

Configurar:

- `DEPLOYMENT_MODE=pilot`, dominio HTTPS exacto en `PUBLIC_ORIGIN`, sin barra final.
- Correo administrador y remitente real en JSON; `administratorLogin=email`; contraseña SMTP en el archivo de entorno. No configurar `ADMIN_TOKEN`.
- `CENTER_PROFILE=metodomogollon`; retención de conversaciones 7 días, máximo 30 en el piloto.
- IA inicialmente `demo`. Para habilitarla, configurar proveedor, clave y modelo autorizado. El entorno limita la configuración del panel a 6 consultas por atención y 100 diarias por defecto; incluye interpretación de intención.
- Video inicialmente sin pago habilitado; tras verificar voz, cuenta e IDs, habilitarlo conscientemente. El piloto exige `LITE`, máximo 60 segundos y 5 intentos de inicio diarios UTC por defecto. Un fallo también cuenta para evitar reintentos costosos; cero desactiva inicios.
- Claves Google OAuth nuevas/propias del piloto y SMTP del remitente. No reutilizar ni exportar automáticamente la autorización de Calendar de Windows.

Desde v0.31.0, `PILOT_PRIVATE_ENABLED=true` controla la barrera; `false` abre el kiosco manteniendo las protecciones del VPS. También puede asignar `PILOT_PASSWORD` directamente en el archivo privado. Consulte [opciones y precedencia de claves](53-configurar-acceso-piloto.md).

Alternativa con verificador: generar la entrada de los participantes:

```bash
sudo /opt/node/bin/node RUTA_RELEASE/scripts/create-pilot-access.js /etc/nexo/pilot-access.private.json
```

Abrir ese archivo privado en el editor; copiar solo `PILOT_PASSWORD_HASH` a `nexo.env`. Entregar el valor `password` a los participantes por un canal privado y conservar el original en el gestor de contraseñas. El archivo tiene 0600 y no se sobreescribe. El verificador se calcula con scrypt y salt aleatorio; con esta alternativa, el archivo de entorno no necesita guardar la clave en claro. Rotar generando otro archivo, reemplazando el hash y reiniciando Nexo.

La entrada del piloto dura 8 horas y se invalida al reiniciar. El cliente entra por `/pilot`; el administrador además verifica su código recibido por correo. Ayuda y opciones → Acceso del personal → Acceso del piloto permite cerrar el acceso en el dispositivo. Cerrar el piloto también revoca la sesión administrativa del navegador. Limpiar una conversación del kiosco **no cierra el acceso del dispositivo al piloto**.

## 5. Activar HTTPS y el servicio

1. Apuntar DNS al VPS. Si se publica AAAA, comprobar IPv6; no dejar una dirección incorrecta.
2. Crear `/opt/nexo/current` hacia la versión revisada. Copiar `deploy/nexo.service` a `/etc/systemd/system/nexo.service`.
3. Adaptar `deploy/Caddyfile` al dominio. Si el servidor tiene otros sitios, integrar el bloque, sin reemplazar su configuración global.
4. Ejecutar `caddy validate --config /etc/caddy/Caddyfile` antes de recargar.
5. Comprobar la configuración como usuario de servicio, cargando el entorno sin imprimirlo:

```bash
sudo -u nexo /opt/node/bin/node --env-file=/etc/nexo/nexo.env /opt/nexo/current/deploy/preflight.mjs
sudo systemctl daemon-reload
sudo systemctl enable --now nexo
sudo systemctl reload caddy
```

Caddy gestiona certificados y redirección a HTTPS según su [documentación de HTTPS automático](https://caddyserver.com/docs/automatic-https). Nexo sigue escuchando solo en loopback; el proxy sobrescribe las cabeceras de IP/protocolo. No usar `NODE_TLS_REJECT_UNAUTHORIZED=0` ni desactivar validación TLS para resolver fallos.

En Google Cloud registrar exactamente `https://DOMINIO/api/calendar/oauth/callback`, agregar usuarios de prueba cuando corresponda y autorizar de nuevo desde Configuración → Conexiones. Seleccionar y comprobar «Mogollon Method». Las citas y correos de prueba son acciones reales: realizarlas con datos propios y eliminar el evento de prueba al terminar.

## 6. Comprobación antes de invitar al cliente

Desde otra máquina ejecutar `node scripts/pilot-smoke.js https://DOMINIO`. Comprueba barrera, cabeceras y rechazo de llamadas sin acceso; no gasta IA/video. Verificar además:

- Puertos visibles externamente y renovación de certificado; firewall también en IPv6.
- Inicio/cierre del piloto, caducidad, administrador por correo y denegación de documentación/historial a un participante sin permisos.
- Micrófono HTTPS en el navegador real. STT sigue dependiendo del soporte/servicio del navegador; Piper resuelve **salida de voz**, no transcripción.
- Español/inglés/francés, voz automática, texto, teclado, inactividad y pantalla responsive.
- Catálogo/FAQs, límites y errores. Primero datos ficticios; video solo en la prueba breve acordada, máximo 60 segundos.
- Calendar: disponibilidad, crear una cita, verificar que existe, confirmar correo y cancelar la cita de prueba.
- Respaldo cifrado, restauración y recuperación tras reinicio. No basta con que la pantalla de inicio cargue.

Consultar el [informe de seguridad y alcance](46-seguridad-piloto.md). La aceptación final del VPS queda pendiente hasta completar estas comprobaciones.

## 7. Respaldo, restauración y actualización

`deploy/backup.sh` usa la API de respaldo de SQLite a través de `.backup`, comprueba integridad e incluye entorno, instalación y clave de Calendar en un archivo cifrado con age. No copia el SQLite vivo con `cp`. Requiere destinatario público age y directorio de respaldos privado. Mantener la clave privada de descifrado fuera del VPS.

```bash
sudo bash /opt/nexo/current/deploy/backup.sh age1DESTINATARIO /var/backups/nexo
```

Configurar luego una ejecución diaria como root y copia del `.age` fuera del VPS. Conservar, como política inicial del piloto, 7 copias diarias; revisar si el responsable requiere otro plazo. La retención de conversaciones no borra copias históricas: los respaldos deben caducar también.

Para probar restauración: descifrar con `age -d -i CLAVE_PRIVADA -o respaldo.tar RESPALDO.age` en una máquina protegida, extraer en un directorio nuevo, ejecutar `sqlite3 kiosk.sqlite 'PRAGMA integrity_check;'` y comparar catálogo/registros esperados. Nunca mostrar el contenido de `nexo.env` ni la clave en logs. Para recuperar el servidor: detener Nexo, guardar el estado anterior por separado, reponer juntos SQLite y la clave de Calendar, aplicar permisos, revisar entorno, arrancar y repetir pruebas. Si restaura acceso antiguo, revocar sesiones administrativas y reautorizar Calendar cuando sea necesario.

Antes de actualizar: respaldo, nueva carpeta de versión, pruebas/preflight, detener servicio, cambiar `current`, arrancar y probar. Para volver atrás: detener y restaurar código **y base compatibles**; no asumir que toda migración futura es reversible. No borrar el respaldo/versión anterior hasta validar la recuperación.

## Próximas fases

1. Piloto web Linux privado con el dominio real y revisión del cliente.
2. Ajustes por uso, accesibilidad, carga y vocabulario; datos comerciales definitivos.
3. Capacitor/APK: almacenamiento de credenciales, permisos nativos, STT y política de navegación propia. No incrustar claves de proveedores en la APK.
4. MetaHuman/infraestructura de video, como alternativa futura independiente.

## Administradores múltiples (v0.25.1)

`administratorEmails` es la lista completa de direcciones autorizadas (máximo 10). Cuando existe, sustituye a `administratorEmail` para otorgar acceso. El formato anterior sigue siendo compatible. Mantener explícitos `mail.user` y `mail.from` para no cambiar el remitente al editar la lista. Cada correo tiene sus códigos, reemplazos y sesiones propios; quitarlo de la lista y reiniciar revoca solo sus accesos. La migración conserva el administrador histórico y sus claves foráneas. [Despliegue del dominio real](47-piloto-metodomogollon.md).
