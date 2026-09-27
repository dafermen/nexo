"""NEXO · GUÍA DEL MÓDULO: scripts/package-pilot.py
Entradas: código del proyecto, lista explícita de carpetas y archivos permitidos.
Salida: dist/nexo-pilot-VERSION.tar.gz, SHA256 y manifiesto. Sin datos del negocio vivo.
Rechaza enlaces simbólicos y nombres privados; no lee .env ni SQLite.
"""
import hashlib
import json
import pathlib
import tarfile
import io
import re

root = pathlib.Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text(encoding='utf-8-sig'))['version']
allowed_dirs = ['server', 'public', 'docs', 'conocimiento', 'scripts', 'tests', 'deploy']
allowed_files = ['package.json', 'package-lock.json', 'README.md', 'UBICACION.md', '.gitignore', '.env.example', 'config/installation.example.json']
files = [root / name for name in allowed_files]
for directory in allowed_dirs:
    for item in (root / directory).rglob('*'):
        if item.is_symlink():
            raise ValueError('No se empaquetan enlaces simbólicos: ' + str(item.relative_to(root)))
        if item.is_file():
            files.append(item)
manifest = {}
for item in sorted(files):
    name = item.relative_to(root).as_posix()
    if any(part.startswith('.') for part in pathlib.PurePosixPath(name).parts) and name not in ['.env.example','.gitignore']:
        raise ValueError('Archivo oculto inesperado: ' + name)
    if item.suffix in ['.sqlite', '.db', '.key', '.pem', '.log', '.age'] or item.name in ['installation.json', '.env']:
        raise ValueError('Archivo privado en la lista de entrega: ' + name)
    if item.suffix in ['.js','.mjs','.json','.md','.txt','.env','.py','.ps1','.sh'] or item.name=='.env.example':
        content=item.read_bytes()
        if re.search(rb'(?:sk-(?:proj|svcacct)-[A-Za-z0-9_-]{40,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|AIza[A-Za-z0-9_-]{35})',content):
            raise ValueError('Posible secreto en archivo de entrega: '+name)
    with item.open('rb') as source:
        manifest[name] = hashlib.file_digest(source, 'sha256').hexdigest()
dist = root / 'dist'
dist.mkdir(exist_ok=True)
output = dist / ('nexo-pilot-' + version + '.tar.gz')
with tarfile.open(output, 'w:gz', format=tarfile.PAX_FORMAT) as archive:
    for name in sorted(manifest):
        def clean(info):
            info.uid = info.gid = 0
            info.uname = info.gname = ''
            info.mode = 0o644
            return info
        archive.add(root / name, arcname=name, recursive=False, filter=clean)
    data = (json.dumps(manifest, indent=2) + '\n').encode()
    info = tarfile.TarInfo('release-manifest.json')
    info.size = len(data)
    info.mode = 0o644
    archive.addfile(info, io.BytesIO(data))
with output.open('rb') as source:
    digest = hashlib.file_digest(source, 'sha256').hexdigest()
(dist / (output.name + '.sha256')).write_text(digest + '  ' + output.name + '\n', encoding='utf-8')
print(f'Paquete: {output.name}; {len(manifest)} archivos; {output.stat().st_size} bytes. Sin .env, bases, cachés ni instalación privada.')
