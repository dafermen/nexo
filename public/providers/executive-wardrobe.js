/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/executive-wardrobe.js
 * Aplicar una variante de vestuario al avatar 3D.
 * Entrada: Modelo/escena cargado y materiales asociados.
 * Salida: Aspecto modificado del avatar local.
 * Estado importante: Las mallas seleccionadas delimitan qué partes se colorean.
 * Efectos y límites: Carga asesora-ejecutiva.glb, adapta la piel cubierta y añade
 * vestuario/cabello. No modifica los archivos originales ni el video remoto.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';

/** Fitted CC0 suit and CC-BY hair. Sources and modifications: docs/13-asesora-ejecutiva.md. */
export async function applyExecutiveWardrobe(model) {
  const wardrobe = await new GLTFLoader().loadAsync('/assets/asesora-ejecutiva.glb');
  const body = model.getObjectByName('Human');
  // Hide skin covered by the fitted jacket, as clothing masks do in MakeHuman.
  const skinGeometry = body.geometry.clone(), skinPositions = skinGeometry.getAttribute('position');
  const skinIndices = skinGeometry.index.array, visibleSkin = [];
  for (let i = 0; i < skinIndices.length; i += 3) {
    const triangle = [skinIndices[i], skinIndices[i + 1], skinIndices[i + 2]];
    const covered = triangle.every(index => {
      const y = skinPositions.getY(index), x = skinPositions.getX(index);
      const neck = Math.abs(x) < .075 && y > 1.43;
      return y < 1.50 && y > .95 && !neck;
    });
    if (!covered) visibleSkin.push(...triangle);
  }
  skinGeometry.setIndex(visibleSkin); body.geometry = skinGeometry;
  model.traverse(node => {
    if (node.isMesh && (node.name.includes('casualsuit') || node.name.includes('ponytail'))) node.visible = false;
  });
  wardrobe.scene.traverse(node => {
    if (!node.isMesh) return;
    const fitted = new THREE.SkinnedMesh(node.geometry, node.material);
    fitted.name = node.name; fitted.frustumCulled = false;
    model.add(fitted); fitted.bind(body.skeleton, body.bindMatrix);
  });
}
