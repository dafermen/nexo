# 09 · Operación local y evolución del despliegue

## Requisitos de instalación

- Windows con Node.js 24 o superior para el lanzador incluido.
- Navegador moderno; probar Chrome o Edge en la PC concreta para voz.
- Micrófono y altavoz para experiencia hablada; teclado como alternativa.
- Internet para IA real y para los servicios de voz que lo necesiten.
- Carpeta con permisos de escritura para SQLite. No iniciar el servidor con privilegios de administrador.

En otro sistema operativo se puede utilizar `npm start` desde la carpeta del proyecto; el lanzador `.cmd` es específico de Windows. La entrega fue verificada en Windows.

## Configuración

| Variable | Valor inicial | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP local |
| `AI_PROVIDER` | `demo` | `demo` u `openai`; no hay fallback silencioso |
| `OPENAI_API_KEY` | Vacío | Credencial de API, solo servidor |
| `OPENAI_MODEL` | Vacío | Identificador habilitado en la cuenta del centro |
| `ADMIN_TOKEN` | Vacío | Si tiene menos de 24 caracteres, administración desactivada |
| `DB_PATH` | `./data/kiosk.sqlite` | Ruta de SQLite relativa al directorio de ejecución |
| `AVATAR_PROVIDER` | `liveavatar` | LiveAvatar bajo demanda; alternativas `portrait` y `local3d` |
| `LIVEAVATAR_MODE` | `LITE` | Voz propia; FULL se conserva por compatibilidad |
| `LIVEAVATAR_API_KEY` | Vacío | Clave permanente, solo servidor |
| `LIVEAVATAR_AVATAR_ID` | Vacío | ID de la asesora elegida |
| `LIVEAVATAR_VOICE_ID` | Vacío | Solo necesario en FULL |
| `LIVEAVATAR_ALLOW_PAID` | `false` | Responsable habilita consumo con `true` |
| `LIVEAVATAR_MAX_SECONDS` | `60` | Límite de sesión entre 30 y 60 segundos |
| `PUBLIC_ORIGIN` | Vacío | Origen HTTPS exacto del proxy, sin barra final |

Las variables del proceso prevalecen sobre `.env`. Usa el lanzador o sitúa la terminal en la carpeta del proyecto para evitar crear la base en otro directorio. Cambios en `.env` requieren reiniciar el servidor.

## Inicio, parada y salud

Ejecuta `INICIAR.cmd` o `npm.cmd start`. La salida indica URL, modo y estado administrativo. Detén con Ctrl+C. No cierres la aplicación durante una confirmación sin comprobar luego el registro con el personal.

[GET /api/health](http://localhost:3000/api/health) confirma que responde el proceso. No demuestra conectividad con OpenAI, micrófono funcional ni salud del hardware.

La pantalla completa mediante botón/F11 es una función visual del navegador. No equivale a un sistema operativo bloqueado en modo kiosco.

## Datos y respaldo

La base se crea en el primer inicio. Las pruebas automáticas usan bases aisladas y no alteran datos de operación. La sesión conversacional se pierde al reiniciar, pero las reservas no.

Si necesitas una copia de seguridad, detén el proceso limpiamente antes de copiar `data/kiosk.sqlite`; no copies únicamente el archivo principal mientras haya escrituras WAL activas. Protege la copia y su retención igual que el original. No se incluyen respaldos automáticos en esta demo.

`npm.cmd run purge` ejecuta la misma política de retención que el servidor: eliminar reservas cuyo horario y creación sean anteriores a 7 días. No es un comando de reinicio general ni elimina citas futuras. El criterio de 7 días es una configuración fija del MVP, a adaptar antes de uso real.

## Solución de problemas

| Síntoma | Comprobación y acción |
|---|---|
| No abre localhost | Mantener el servidor abierto; comprobar puerto y mensaje de inicio |
| Puerto ocupado | Elegir otro `PORT` en `.env`, reiniciar y abrir la URL indicada |
| Error al importar `node:sqlite` | Verificar `node --version`; usar Node 24 o superior |
| PowerShell bloquea npm.ps1 | Usar `npm.cmd` o el lanzador incluido |
| Sigue en modo demo | Guardar `AI_PROVIDER=openai`, clave/modelo y reiniciar; revisar variables del proceso |
| IA no disponible | Verificar clave, modelo habilitado, conectividad y acceso de la cuenta; no mostrar claves en pantalla pública |
| Micrófono desactivado | Navegador incompatible; probar Chrome/Edge o usar texto |
| Permiso denegado | Habilitar micrófono para localhost en configuración del navegador y del sistema |
| No hay transcripción | Revisar dispositivo, ruido y red; el STT del navegador puede ser remoto |
| No se escucha voz | Revisar volumen, voz española, política del navegador y botón Voz activada/ Escuchar |
| Turno no disponible | Recargar horarios; otra reserva pudo ocupar el cupo |
| ADMIN_TOKEN rechazado | Configurar al menos 24 caracteres aleatorios y reiniciar; usar valor exacto |
| Catálogo no cambia al editar semilla | Las filas existentes no se sobrescriben; requiere migración o futuro editor |
| Límite de solicitudes | Esperar un minuto; si sucede en uso real, ajustar cuotas con evidencia de tráfico |

## Configurar un kiosco físico después del piloto

**Destino vigente: iPad.** La PC aloja el servidor; el iPad accede por HTTPS. La configuración de origen no instala un proxy ni convierte localhost en una dirección accesible desde la tablet. Ver [preparación y criterios del piloto iPad](14-etapas-liveavatar-metahuman.md). Los pasos generales siguientes corresponden a kioscos con PC y deben adaptarse al dispositivo.

1. Seleccionar pantalla, micrófono y montaje según altura, distancia, reflejos, ruido y accesibilidad.
2. Crear un usuario restringido del sistema y habilitar arranque controlado del servidor.
3. Usar modo kiosco del navegador; separar operación pública y administración.
4. Supervisar proceso y dispositivos; recuperar el servicio tras un reinicio o pérdida de conectividad.
5. Fijar versión de runtime y navegador, aplicar actualizaciones probadas y tener rollback.
6. Incorporar impresora/lector únicamente mediante un adaptador de dispositivo separado.

## Acceso remoto y nube

La configuración entregada **no se debe exponer cambiando únicamente el host a `0.0.0.0`**. La arquitectura local tiene supuestos de un solo dispositivo. Para red o nube: HTTPS, autenticación por dispositivo y administrador, política de orígenes explícita, base compartida, sesiones compartidas, protección y retención de datos, límites por dispositivo, monitoreo y pruebas concurrentes.

El navegador exige un contexto apropiado para capacidades como micrófono. `localhost` permite la demo local; una instalación remota necesita revisar HTTPS y políticas del navegador. La topología final se decidirá con la operación del centro.


## Video opcional de la recepcionista

Abre `CONFIGURAR-AVATAR.cmd` para guardar clave, avatar ID y voice ID en `.env`. Conserva ese archivo al activar IA o administración. Reinicia el servidor y usa **Probar movimiento real**. La [guía de video](11-video-tiempo-real.md) explica sandbox, créditos, límites, errores y validación pendiente. El ZIP excluye `.env`.


## Opción predeterminada v0.3.0

El avatar ya es 3D local. En esta PC la voz Piper está instalada. Para otra PC Windows x64 ejecuta `INSTALAR-VOZ-LOCAL.cmd` una vez y luego `INICIAR.cmd`. El ZIP excluye los binarios y pesos de `runtime/`; el instalador los descarga desde sus fuentes y verifica hashes. [Guía completa](12-avatar-local.md).
