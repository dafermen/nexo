# NEXO · GUÍA DEL MÓDULO: scripts/open-admin.ps1
# Abrir administración con el método de acceso disponible.
# Entrada: Estado público de autenticación; .env solo en modo token.
# Salida: Navegador abierto; en modo token copia credencial al portapapeles.
# Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
# ejecutar.
# Efectos y límites: El portapapeles contiene un secreto en el modo antiguo; no compartirlo. En
# modo correo solo abre la pantalla de código.
# Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
try { $access = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/config' -TimeoutSec 5 } catch { $access = $null }
if ($access -and $access.mode -eq 'email') { Write-Host 'Solicite su código con el correo del administrador.'; Start-Process 'http://localhost:3000/admin'; exit }
$line = Get-Content -LiteralPath (Join-Path $projectRoot '.env') | Where-Object { $_ -match '^ADMIN_TOKEN=' } | Select-Object -Last 1
if (-not $line) { throw 'No se encontro la credencial administrativa.' }
$credential = ($line -replace '^ADMIN_TOKEN=', '').Trim().Trim('"').Trim("'")
Set-Clipboard -Value $credential
Write-Host 'Clave de administracion copiada. Peguela en el campo de acceso con Ctrl+V.'
Write-Host 'Al terminar, cierre la sesion y copie otro texto para limpiar el portapapeles.'
Start-Process 'http://localhost:3000/admin'
