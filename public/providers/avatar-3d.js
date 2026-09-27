/**
 * NEXO · GUÍA DEL MÓDULO: public/providers/avatar-3d.js
 * Cargar y animar la alternativa local de avatar 3D.
 * Entrada: Contenedor, estado y datos de boca procedentes del audio.
 * Salida: Escena renderizada; fallback cuando no puede cargar el modelo.
 * Estado importante: renderer/scene/camera forman la escena; morph targets cambian boca; loop
 * actualiza movimientos.
 * Efectos y límites: Carga modelos y usa GPU del navegador. No es MetaHuman ni video LiveAvatar;
 * es una alternativa local.
 * Ruta de aprendizaje: docs/23-manual-desarrollador-junior.md y docs/41-mapa-codigo-fuente.md.
 */

import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { applyExecutiveWardrobe } from './executive-wardrobe.js';
import { PortraitAvatarProvider } from './avatar.js';

/** Local 3D rendering; external speech engines supply mouth frames through setMouth. */
export class LocalAvatarProvider extends PortraitAvatarProvider {
  constructor(element, label) {
    super(element, label); this.mouth = { shape: 'sil', level: 0 }; this.meshes = []; this.ready = false; this.enabled = true;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)'); this.lastTime = 0;
  }
  async load() {
    try {
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      this.renderer = renderer; renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
      renderer.domElement.className = 'avatar-canvas'; renderer.domElement.setAttribute('aria-hidden', 'true'); this.element.append(renderer.domElement);
      const scene = new THREE.Scene(); this.scene = scene;
      scene.add(new THREE.HemisphereLight(0xfff7e6, 0x526657, 2.2));
      for (const [color, strength, x, y, z] of [[0xffecd8, 3, -2, 3, 4], [0xd7e8ff, 1.8, 3, 2, 2], [0xdeffc3, 2, 0, 3, -3]]) {
        const light = new THREE.DirectionalLight(color, strength); light.position.set(x, y, z); scene.add(light);
      }
      const gltf = await new GLTFLoader().loadAsync('/assets/recepcionista-3d.glb'); this.model = gltf.scene; scene.add(this.model);
      this.model.traverse(node => {
        if (node.isMesh) { node.frustumCulled = false; if (node.morphTargetDictionary) this.meshes.push(node); }
        if (node.isMesh && node.name.includes('casualsuit')) {
          node.material = new THREE.MeshStandardMaterial({ color: 0x587765, roughness: .92 });
        }
      });
      if (new URLSearchParams(location.search).get('avatar') !== 'anterior') {
        await applyExecutiveWardrobe(this.model);
      }
      // Relax the source model's arms into a reception pose using world-space directions.
      for (const side of ['Left', 'Right']) {
        const arm = this.model.getObjectByName(side + 'Arm'), elbow = this.model.getObjectByName(side + 'ForeArm');
        this.model.updateMatrixWorld(true);
        const direction = elbow.getWorldPosition(new THREE.Vector3()).sub(arm.getWorldPosition(new THREE.Vector3())).normalize();
        const desired = new THREE.Vector3(side === 'Left' ? .1 : -.1, -1, .08).normalize();
        const delta = new THREE.Quaternion().setFromUnitVectors(direction, desired);
        const world = arm.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
        arm.quaternion.copy(arm.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
      }
      this.head = this.model.getObjectByName('Head'); this.headBase = this.head.quaternion.clone();
      this.spine = this.model.getObjectByName('Spine2'); this.spineBase = this.spine?.quaternion.clone();
      this.model.updateMatrixWorld(true);
      const head = this.head.getWorldPosition(new THREE.Vector3());
      this.camera = new THREE.PerspectiveCamera(30, 1, .01, 20);
      this.camera.position.set(head.x, head.y + .035, head.z + 1.08);
      this.camera.lookAt(head.x, head.y - .025, head.z);
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.element); this.resize();
      renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); this.fallback('No se pudo mantener el dibujo 3D. Recarga para reintentar.'); });
      this.ready = true; this.setEnabled(true); this.element.classList.remove('local-3d-loading'); this.loop(0);
    } catch (error) { this.fallback('El dibujo 3D no estÃ¡ disponible. Puedes continuar con la imagen.'); throw error; }
  }
  resize() {
    if (!this.camera) return;
    const w = this.element.clientWidth, h = this.element.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  setEnabled(enabled) {
    this.enabled = enabled; this.element.classList.toggle('local-3d-ready', this.ready && enabled);
    this.element.setAttribute('aria-label', enabled && this.ready ? 'Nexo, asesora virtual 3D animada en esta PC' : 'Nexo, retrato de recepcionista virtual');
  }
  setMouth(frame) { this.mouth = frame; }
  fallback(message) { this.ready = false; this.setEnabled(false); this.element.classList.remove('local-3d-loading'); this.resizeObserver?.disconnect(); this.renderer?.dispose(); this.element.dispatchEvent(new CustomEvent('avatar-error', { detail: message })); }
  loop(time) {
    if (!this.ready) return;
    requestAnimationFrame(t => this.loop(t));
    if (!this.enabled || document.hidden || this.element.classList.contains('video-ready') || time - this.lastTime < 32) return;
    const dt = Math.min(.1, (time - this.lastTime) / 1000); this.lastTime = time;
    const t = time / 1000, moving = !this.reduced.matches;
    const listening = this.element.dataset.state === 'listening';
    const rotation = new THREE.Euler(moving ? Math.sin(t * .72) * .018 : 0, moving ? Math.sin(t * .43) * .045 : 0, moving ? (listening ? .045 : Math.sin(t * .31) * .016) : 0);
    this.head.quaternion.copy(this.headBase).multiply(new THREE.Quaternion().setFromEuler(rotation));
    if (this.spine) this.spine.quaternion.copy(this.spineBase).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(moving ? Math.sin(t * 1.2) * .006 : 0, 0, 0)));
    const blinkPhase = t % 4.7, blink = moving && blinkPhase < .16 ? Math.sin(blinkPhase / .16 * Math.PI) : 0;
    const level = this.mouth.level > .025 ? this.mouth.level : 0;
    for (const mesh of this.meshes) {
      for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
        let target;
        if (name.startsWith('viseme_')) {
          const shape = name.slice(7);
          const weight = this.mouth.weights ? (this.mouth.weights[shape] || 0) : (shape === this.mouth.shape ? 1 : 0);
          target = shape === 'sil' ? 0 : weight * .58 * level;
        }
        else if (name === 'eyeBlinkLeft' || name === 'eyeBlinkRight') target = blink;
        else if (name === 'mouthSmileLeft' || name === 'mouthSmileRight') target = .035;
        else if (name === 'browInnerUp') target = listening ? .07 : .01;
        if (target !== undefined) mesh.morphTargetInfluences[index] = THREE.MathUtils.damp(mesh.morphTargetInfluences[index], target, name.startsWith('viseme_') ? 13 : 24, dt || .033);
      }
    }
    this.element.dataset.mouthLevel = level.toFixed(3);
    this.renderer.render(this.scene, this.camera);
  }
}
