#!/usr/bin/env bash
# NEXO · GUÍA DEL MÓDULO: deploy/backup.sh
# Copia coherente de SQLite y secretos cifrada con age. Nunca copia un SQLite vivo con cp.
# Entrada: destinatario público age1... y directorio de respaldos privado.
set -euo pipefail
umask 077
recipient=${1:?Indique destinatario PUBLICO age1...}
destination=${2:?Indique directorio de respaldos}
[[ "$recipient" == age1* ]] || { echo 'Destinatario age no válido' >&2; exit 1; }
[[ -d "$destination" ]] || { echo 'Cree primero el directorio de respaldos privado' >&2; exit 1; }
command -v age >/dev/null
command -v sqlite3 >/dev/null
staging=$(mktemp -d /var/lib/nexo/backup.XXXXXXXX)
trap 'rm -rf -- "$staging"' EXIT
sqlite3 /var/lib/nexo/kiosk.sqlite ".backup '$staging/kiosk.sqlite'"
[[ $(sqlite3 "$staging/kiosk.sqlite" 'PRAGMA integrity_check;') == ok ]]
cp /etc/nexo/nexo.env /etc/nexo/installation.json "$staging/"
if [[ -f /var/lib/nexo/google-calendar.key ]]; then cp /var/lib/nexo/google-calendar.key "$staging/"; fi
output="$destination/nexo-$(date -u +%Y%m%dT%H%M%SZ)-$$.tar.age"
tar -C "$staging" -cf - . | age -r "$recipient" -o "$output"
chmod 600 "$output"
echo 'Respaldo cifrado creado. Probar restauración antes de depender de él.'
