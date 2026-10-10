# NEXO · GUÍA DEL MÓDULO: scripts/install-multilingual-voices.ps1
# Instalar voces inglesa y francesa del manifiesto.
# Entrada: Piper ya instalado y multilingual-voices.json con URL/sha256.
# Salida: Modelos y configuraciones verificados en runtime/voices.
# Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
# ejecutar.
# Efectos y límites: Comprueba nombres permitidos y hashes; reiniciar Nexo después de instalar.
# Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.

$ErrorActionPreference = 'Stop'
$nexoProject = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$nexoVoices = Join-Path $nexoProject 'runtime/voices'
New-Item -ItemType Directory -Force -Path $nexoVoices | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $nexoProject 'runtime/piper/piper.exe'))) {
  throw 'Primero ejecute INSTALAR-VOZ-LOCAL.cmd para instalar Piper y la voz española.'
}
$nexoManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'multilingual-voices.json') -Raw | ConvertFrom-Json
foreach ($voice in $nexoManifest) {
  if ($voice.file -notmatch '^(en_US-ljspeech-high|fr_FR-siwis-medium|en_US-bryce-medium|fr_FR-upmc-medium)\.onnx(\.json)?$') { throw 'Archivo de voz no permitido.' }
  $nexoTarget = Join-Path $nexoVoices $voice.file
  if ((Test-Path -LiteralPath $nexoTarget) -and (Get-FileHash -LiteralPath $nexoTarget -Algorithm SHA256).Hash -eq $voice.sha256) { continue }
  Invoke-WebRequest -UseBasicParsing -Uri $voice.url -OutFile ($nexoTarget + '.part')
  if ((Get-FileHash -LiteralPath ($nexoTarget + '.part') -Algorithm SHA256).Hash -ne $voice.sha256) { throw 'Descarga distinta de la versión verificada. No se instalará.' }
  Move-Item -LiteralPath ($nexoTarget + '.part') -Destination $nexoTarget -Force
}
Write-Host 'Voces inglesa y francesa instaladas. Reinicie Nexo. No se utilizan APIs de pago para sintetizar esta voz.'
