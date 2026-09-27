#!/usr/bin/env bash
# NEXO · GUÍA DEL MÓDULO: deploy/install-release.sh
# Instala código en una carpeta NUEVA. No activa el servicio, no cambia current ni datos vivos.
# Prerrequisitos: Node /opt/node/bin, usuario nexo creado. Ejecutar como administrador Linux.
set -euo pipefail
umask 022
archive=$(realpath "${1:?Archivo nexo-pilot-VERSION.tar.gz}")
expected=${2:?SHA256 esperado del paquete}
[[ "$expected" =~ ^[a-f0-9]{64}$ ]] || exit 1
actual=$(sha256sum "$archive" | cut -d' ' -f1)
[[ "$actual" == "$expected" ]] || { echo 'El paquete no coincide con SHA256' >&2; exit 1; }
[[ $(id -u) == 0 ]] || { echo 'Ejecute como administrador' >&2; exit 1; }
id nexo >/dev/null
[[ -x /opt/node/bin/node ]] || { echo 'Instale Node primero' >&2; exit 1; }
install -d -m 755 /opt/nexo/releases
release=$(mktemp -d /opt/nexo/releases/release.XXXXXXXX)
python3 - "$archive" "$release" <<'PY'
import hashlib, json, pathlib, sys, tarfile
target=pathlib.Path(sys.argv[2])
with tarfile.open(sys.argv[1]) as source:
    members=source.getmembers()
    for m in members:
        p=pathlib.PurePosixPath(m.name)
        if p.is_absolute() or '..' in p.parts or not m.isfile():
            raise ValueError('Entrada insegura en el paquete')
    names=[m.name for m in members]
    if len(set(names))!=len(names): raise ValueError('Entradas duplicadas')
    source.extractall(target,filter='data')
manifest=json.loads((target/'release-manifest.json').read_text())
if set(names)!=set(manifest)|{'release-manifest.json'}: raise ValueError('Manifiesto incompleto')
for name, expected in manifest.items():
    if hashlib.sha256((target/name).read_bytes()).hexdigest()!=expected: raise ValueError('Contenido alterado')
PY
chmod 755 "$release"
# npm no ejecuta scripts del paquete/dependencias. Node 24 aporta SQLite nativo.
export PATH=/opt/node/bin:$PATH
cd "$release"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
chown -R root:root "$release"
chmod -R go-w "$release"
echo "Código preparado en $release"
echo 'Revise la guía antes de actualizar /opt/nexo/current y arrancar el servicio.'
