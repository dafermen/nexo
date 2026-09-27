# NEXO · GUÍA DEL MÓDULO: scripts/configure-mail.ps1
# Guardar la contraseña de aplicación SMTP sin mostrarla.
# Entrada: Entrada SecureString de 16 caracteres.
# Salida: SMTP_PASSWORD actualizado en .env.
# Estado importante: Las rutas se resuelven respecto al proyecto; revisar constantes antes de
# ejecutar.
# Efectos y límites: Libera el BSTR usado para convertir el secreto. Nunca imprimir el valor ni el
# archivo resultante.
# Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
Write-Host 'Introduzca la contraseña de aplicación de Gmail para el correo configurado.'
Write-Host 'No use su contraseña habitual de Google. El valor no se mostrará.'
$protectedValue = Read-Host 'Contraseña de aplicación' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($protectedValue)
try {
 $mailCredential = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) -replace '\s',''
 if ($mailCredential -notmatch '^[a-zA-Z0-9]{16}$') { throw 'Se esperan los 16 caracteres de la contraseña de aplicación de Gmail.' }
 $content = [IO.File]::ReadAllText($envPath)
 $line = 'SMTP_PASSWORD=' + $mailCredential
 if ($content -match '(?m)^SMTP_PASSWORD=.*$') { $content = [regex]::Replace($content,'(?m)^SMTP_PASSWORD=.*$', $line) }
 else { $content += [Environment]::NewLine + $line + [Environment]::NewLine }
 [IO.File]::WriteAllText($envPath,$content)
 Write-Host 'Credencial guardada localmente. Reinicie Nexo y abra Administración para solicitar su código.'
} finally {
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
 $mailCredential = $null
 $content = $null
 $line = $null
 $protectedValue.Dispose()
}

