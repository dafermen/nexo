# 10 · Recepcionista: primera versión visual

## Diseño aplicado

La preferencia del usuario es una recepcionista con apariencia humana. Se creó una identidad ficticia con apariencia fotográfica, mirada hacia el visitante, expresión amable, cabello castaño y blazer verde suave sobre blusa marfil. La imagen tiene fondo transparente para integrarse con el panel verde del kiosco.

- Recurso del proyecto: [recepcionista-v1.png](../public/assets/recepcionista-v1.png).
- Método: herramienta integrada **ImageGen**; no se utilizó el CLI ni una clave de API del proyecto.
- Adaptador: `PortraitAvatarProvider`, con el mismo contrato `setState`.
- El retrato tiene un movimiento visual muy sutil y señales externas de escucha, pensamiento y habla. No hay animación facial ni sincronización labial.
- Se respeta la preferencia de movimiento reducido. Si falla la carga del retrato, permanece la ilustración original como respaldo.
- El texto de identificación sigue indicando asistente virtual; no se presenta como una operadora humana en vivo.

## Evolución a video en v0.2.0

Se incorporó un adaptador de video y voz LiveAvatar con cancelación y sesión limitada. Falta configurar la cuenta y comprobar el resultado real. Para conservar esta identidad hay que crear un avatar personalizado en el proveedor; la imagen por sí sola no anima labios. Consulta la [guía de video](11-video-tiempo-real.md).

## Prompt final utilizado

Use case: photorealistic-natural. Asset type: production portrait asset for Nexo, a Spanish-language virtual receptionist kiosk at a general customer service center. Create a single fictional adult woman receptionist, approximately 35 years old, approachable and professionally welcoming, looking directly into the camera, relaxed natural smile, warm expressive brown eyes, shoulder-length neatly styled dark brown hair tucked behind one ear. Wear a tailored muted sage-green blazer over a simple ivory blouse, tiny understated earrings. Photographic realism: natural skin texture, realistic eyes and teeth, subtle everyday makeup, believable soft studio lighting with warm key light and soft edge light. Composition: square image, centered front-facing head-and-upper-torso portrait, entire hair and both shoulders within frame, crop below the chest, head occupies a substantial part of the image, 6 percent headroom. The woman should fill most of the image, suitable for a large avatar on a dark forest-green kiosk panel. Background: genuinely transparent alpha channel, isolated person cutout, preserve fine hair detail, no background or baked checkerboard. No text, no logos, no watermark, no props, no headset, no additional people. Not cartoon, illustration, 3D render, glamorous fashion ad, or plastic skin. This is an original synthetic identity, not a depiction of any real person.


## Evolución v0.3.0

El inicio ahora muestra un modelo femenino 3D reutilizado, con voz local y animación. El retrato de este documento permanece en **Ver imagen**. No se ha convertido esta fotografía al modelo 3D. [Detalles](12-avatar-local.md).
