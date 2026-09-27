# 13 · Asesora ejecutiva 3D

> Experimento anterior, disponible con `AVATAR_PROVIDER=local3d`. Desde v0.4.0 no se carga por defecto. La estrategia vigente es [LiveAvatar primero y MetaHuman después](14-etapas-liveavatar-metahuman.md). El contenido siguiente describe esa versión histórica.


**v0.3.3 · 15 de septiembre de 2026**

La versión predeterminada usa cabello castaño largo con ondas, blazer oscuro de raya fina y camisa clara. Conserva el rostro del personaje anterior, su expresión neutral, la voz local y las transiciones suaves de labios. La referencia de vestuario es una asesora comercial de oficina; sigue siendo un personaje 3D estilizado.

Abre [Nexo](http://localhost:3000/?v=manhattan). Para comparar con la versión anterior de prenda verde, utiliza [el enlace de comparación](http://localhost:3000/?avatar=anterior). El parámetro `v` solo identifica el enlace; `avatar=anterior` selecciona explícitamente el vestuario previo. El retrato fotográfico se mantiene como opción manual mediante «Ver imagen».

## Implementación

- [Módulo de vestuario](../public/providers/executive-wardrobe.js) separado del motor de conversación, voz y animación.
- [Recurso local de traje y cabello](../public/assets/asesora-ejecutiva.glb): 3,67 MB adicionales, con texturas incrustadas. No se descargan recursos externos al abrir el kiosco.
- El traje tiene geometría propia, incluidos cuello y solapas. Sus pesos se transfirieron del cuerpo y la ropa del modelo base al esqueleto compartido. Se ajustó el cuello y se ocultó la piel cubierta por la chaqueta.
- El pelo tiene geometría y textura propias, una adaptación de longitud y un tinte castaño aplicado en el material. Sigue el hueso de la cabeza. No hay simulación física individual de mechones.
- Se conserva la carga sin mostrar primero una identidad distinta. La selección anterior queda disponible mediante enlace explícito.
- El suavizado de labios no cambió: sincronización aproximada con el texto y la energía del audio, sin alineación fonética exacta.

El ajuste de ropa se diseñó para este modelo y el encuadre de busto. Un personaje distinto, un encuadre de cuerpo completo o gestos grandes de brazos requieren volver a revisar el ajuste y la máscara de piel.

## Recursos y atribuciones

### Cabello

**«elvs_hazel_hair», de Elvaerwyn. Licencia declarada: CC-BY.**

[Catálogo original de MakeHuman Community](https://static.makehumancommunity.org/assets/assetpacks/hair02.html) · [Paquete original](https://files2.makehumancommunity.org/asset_packs/hair02/hair02_ccby.zip).

El archivo original `elvs_hazel_hair.mhclo` declara `author: Elvaerwyn`, `license: CC-BY` y `description: long hair`; no indica un número de versión de la licencia. Se conserva esa denominación sin asignarle una versión no declarada. La atribución también está disponible en «Privacidad y uso» del kiosco.

Adaptaciones en Nexo: escala, posición, longitud, tono mediante material y asociación al hueso de la cabeza. La textura original se incrustó sin modificar sus píxeles. No se implica aval de la autora.

SHA-256 del ZIP original: `c681e5efd37df4007a52253a8d071aedbfe3b614f199d8dae4ae76d5bd7d95c9`.

### Traje

**«toigo_female_suit», de Margaret Toigo (MRT). Licencia declarada: CC0.**

[Catálogo original de MakeHuman Community](https://static.makehumancommunity.org/assets/assetpacks/suits01.html) · [Paquete original](https://files2.makehumancommunity.org/asset_packs/suits01/suits01_cc0.zip) · [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

Adaptaciones: escala, posición, ajuste de cuello, normales suavizadas y pesos del esqueleto. Textura original sin cambios de píxeles.

SHA-256 del ZIP original: `2b1d8676f3863b188e9eea98c1d8f234543d54c440e791d92b819f8ee1861f19`.

Las atribuciones del cuerpo base, Three.js y la voz están en la [guía de avatar local](12-avatar-local.md#recursos-versiones-y-atribuciones).

## Reconstruir el recurso

La ejecución del kiosco utiliza el GLB incluido; no requiere Python ni los archivos fuente. Para reconstruir únicamente el vestuario:

1. Descarga los dos ZIP anteriores y verifica sus hashes.
2. Extráelos en una carpeta que contenga `hair/elvs_hazel_hair/` y `clothes/toigo_female_suit/`.
3. Con Python y NumPy disponibles, ejecuta desde el proyecto:

```text
python scripts/build-executive-avatar.py <carpeta-de-fuentes-extraidas>
```

El [constructor](../scripts/build-executive-avatar.py) lee el cuerpo local, calcula pesos y normales y reconstruye `public/assets/asesora-ejecutiva.glb`. No utiliza Blender ni un servicio de avatar.

SHA-256 del GLB entregado: `de2dcd761b7a0d71d23fa6b1980176b39b637b2caf4e120c69232522040deb9b`.

## Comprobación

Se inspeccionó el resultado renderizado dentro del kiosco. La prueba con Piper y el modelo real aprobó carga, movimiento de cabeza, reproducción WAV, actividad de boca, silencio, repetición, cierre de sesión y alternancia con el retrato. La página no realizó peticiones externas. Esta prueba no evalúa oído humano, micrófono físico ni precisión fonética.

También aprobaron los 10 recorridos de interfaz en Edge (con voz simulada), incluidas vistas móvil y vertical sin desbordamiento. Se revisó la sintaxis de los 32 archivos JavaScript.

[Captura de inicio](capturas/inicio.png) · [Captura hablando](capturas/avatar-local-hablando.png).
