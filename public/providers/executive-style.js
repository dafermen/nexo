/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/executive-style.js
 * Aplicar materiales y detalles visuales al modelo local.
 * Entrada: Escena o mallas del avatar cargado.
 * Salida: Mallas procedurales de accesorios añadidas al modelo; surface devuelve una Mesh y patch
 * construye geometría.
 * Estado importante: surface/patch trabajan con materiales y zonas del modelo.
 * Efectos y límites: Muta la escena 3D en memoria; no cambia el archivo GLB original.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import * as THREE from '../vendor/three/three.module.js';

// Original procedural accessories for the bundled MPFB model, in its bind coordinates.
function surface(rows, columns, point, material) {
  const positions = [], indices = [], uv = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= columns; c++) {
    positions.push(...point(r / rows, c / columns)); uv.push(c / columns, r / rows);
    if (r < rows && c < columns) {
      const a = r * (columns + 1) + c, b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}
function patch(points, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  const indices = []; for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
  geometry.setIndex(indices); geometry.computeVertexNormals(); return new THREE.Mesh(geometry, material);
}
export function dressExecutive(model, head, spine) {
  const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x35241d, roughness: .53, metalness: .025, side: THREE.DoubleSide });
  // Fine longitudinal variation gives volume without separate moving strands.
  hairMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 hairUV;\n' + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nhairUV = uv;');
    shader.fragmentShader = 'varying vec2 hairUV;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat strand = sin(hairUV.x * 650.0 + sin(hairUV.y * 8.0) * 1.8);\ndiffuseColor.rgb *= 0.94 + 0.06 * strand;');
  };
  const hair = new THREE.Group(); hair.name = 'NexoLongHair';
  hair.add(surface(28, 100, (v, u) => {
    const phi = u * Math.PI * 2;
    const front = Math.max(0, Math.cos(phi));
    const theta = v * (1.66 - .57 * front ** 4);
    const ridge = 1 + .005 * Math.sin(phi * 65);
    return [Math.sin(theta) * Math.sin(phi) * .096 * ridge, 1.65 + Math.cos(theta) * .145, .032 + Math.sin(theta) * Math.cos(phi) * .124 * ridge];
  }, hairMaterial));
  hair.add(surface(42, 110, (v, u) => {
    const phi = .72 + u * (Math.PI * 2 - 1.44);
    const theta = 1.66 - .57 * Math.max(0, Math.cos(phi)) ** 4;
    const root = Math.sin(theta), rootY = 1.65 + Math.cos(theta) * .145;
    const swing = Math.sin(v * Math.PI) * .012 + Math.sin(v * Math.PI * 2) * .004;
    const radius = .096 * root + v * .03 + swing;
    const ripple = Math.sin(phi * 65 + v * 1.5) * .0007;
    const end = 1.285 + .022 * Math.cos(phi * 3) + .008 * Math.sin(phi * 7);
    return [Math.sin(phi) * (radius + ripple), rootY * (1 - v) + end * v, .032 + Math.cos(phi) * (.124 * root + .022 * v + ripple) + .06 * v * Math.max(0, Math.cos(phi))];
  }, hairMaterial));
  model.traverse(node => {
    if (node.isMesh && node.name.includes('ponytail')) node.visible = false;
    if (node.isMesh && node.name.includes('casualsuit')) node.material = new THREE.MeshStandardMaterial({color: 0x293b43, roughness: .9});
  });
  model.add(hair); model.updateMatrixWorld(true); head.attach(hair);

  const outfit = new THREE.Group(); outfit.name = 'NexoExecutiveCollar';
  const ivory = new THREE.MeshStandardMaterial({color: 0xe6e3da, roughness: .92, side: THREE.DoubleSide});
  const lapel = new THREE.MeshStandardMaterial({color: 0x30444c, roughness: .84, side: THREE.DoubleSide});
  outfit.add(patch([[-.055,1.496,.107],[-.03,1.484,.112],[0,1.48,.116],[.03,1.484,.112],[.055,1.496,.107],[.037,1.355,.164],[-.037,1.355,.164]],ivory));
  for (const side of [-1, 1]) {
    outfit.add(patch([[side*.064,1.501,.107],[side*.11,1.447,.121],[side*.08,1.418,.157],[side*.095,1.397,.163],[side*.018,1.315,.181],[side*.052,1.435,.146]],lapel));
  }
  model.add(outfit); model.updateMatrixWorld(true); spine.attach(outfit);
}
