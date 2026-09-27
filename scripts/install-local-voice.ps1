# NEXO · GUÍA DEL MÓDULO: scripts/install-local-voice.ps1
# Instalar Piper y la voz española verificada.
# Entrada: URLs y hashes fijados en el script; acceso de red.
# Salida: Archivos en runtime/piper y runtime/voices.
# Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
# ejecutar.
# Efectos y límites: Compara SHA256 antes de usar descargas. No ejecuta síntesis ni usa claves de
# API.
# Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.

$ErrorActionPreference = 'Stop'
$nexoProject = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$nexoRuntime = Join-Path $nexoProject 'runtime'
$nexoDownloads = Join-Path $nexoRuntime 'downloads'
$nexoVoices = Join-Path $nexoRuntime 'voices'
New-Item -ItemType Directory -Force -Path $nexoDownloads,$nexoVoices | Out-Null
function Get-VerifiedFile($Url, $Path, $ExpectedHash) {
  if ((Test-Path -LiteralPath $Path) -and (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -eq $ExpectedHash) { return }
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile ($Path + '.part')
  if ((Get-FileHash -LiteralPath ($Path + '.part') -Algorithm SHA256).Hash -ne $ExpectedHash) { throw 'La descarga no coincide con la versión verificada. No se instalará.' }
  Move-Item -LiteralPath ($Path + '.part') -Destination $Path -Force
}
Write-Host 'NEXO - Instalación de voz española en esta carpeta. Necesita internet solo para descargar.'
Get-VerifiedFile 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip' (Join-Path $nexoDownloads 'piper.zip') 'F3C58906402B24F3A96D92145F58ACBA6D86C9B5DB896D207F78DC80811EFCEA'
Expand-Archive -LiteralPath (Join-Path $nexoDownloads 'piper.zip') -DestinationPath $nexoRuntime -Force
Get-VerifiedFile 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx' (Join-Path $nexoVoices 'es_ES-sharvard-medium.onnx') '40FEBFB1679C69A4505FF311DC136E121E3419A13A290EF264FDF43DDEDD0FB1'
Get-VerifiedFile 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx.json' (Join-Path $nexoVoices 'es_ES-sharvard-medium.onnx.json') '7438C9B699C72B0C3388DAE1B68D3F364DC66A2150FE554A1C11F03372957B2C'
Write-Host 'Voz instalada. Abre INICIAR.cmd o reinicia Nexo. No se configuró ninguna API de pago.'
