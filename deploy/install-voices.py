"""NEXO · GUÍA DEL MÓDULO: deploy/install-voices.py
Instalar modelos conocidos verificando SHA256; no lee configuración ni claves.
Entrada: directorio nuevo/de voces. Salida: modelos y metadatos verificados.
Falla sin sustituir el destino si cambia el contenido publicado por el proveedor.
"""
import hashlib
import json
import pathlib
import sys
import urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
target = pathlib.Path(sys.argv[1]).resolve()
target.mkdir(parents=True, exist_ok=True)
voices = json.loads((root / 'scripts/multilingual-voices.json').read_text(encoding='utf-8-sig'))
base = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/sharvard/medium/'
for suffix, digest in [('.onnx', '40febfb1679c69a4505ff311dc136e121e3419a13a290ef264fdf43ddedd0fb1'), ('.onnx.json', '7438c9b699c72b0c3388dae1b68d3f364dc66a2150fe554a1c11f03372957b2c')]:
    name = 'es_ES-sharvard-medium' + suffix
    voices.append(dict(file=name, url=base + name, sha256=digest))
for voice in voices:
    name = voice['file']
    if pathlib.Path(name).name != name:
        raise ValueError('Nombre de modelo inválido')
    dest = target / name
    if dest.exists() and hashlib.file_digest(dest.open('rb'), 'sha256').hexdigest() == voice['sha256']:
        continue
    temp = dest.with_suffix(dest.suffix + '.part')
    with urllib.request.urlopen(voice['url'], timeout=120) as response, temp.open('wb') as output:
        total = 0
        while chunk := response.read(1024 * 1024):
            total += len(chunk)
            if total > 200 * 1024 * 1024:
                raise ValueError('Modelo demasiado grande')
            output.write(chunk)
    with temp.open('rb') as downloaded:
        if hashlib.file_digest(downloaded, 'sha256').hexdigest() != voice['sha256']:
            temp.unlink()
            raise ValueError('Hash del modelo no coincide: ' + name)
    temp.replace(dest)
print('Voces verificadas: español, inglés y francés.')
