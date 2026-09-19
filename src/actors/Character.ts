import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export async function loadCharacter() {
  return new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/casual-character.glb`);
}

export class Character {
  readonly root = new THREE.Group();
  private model: THREE.Group;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current = '';
  private bones = new Map<string, THREE.Bone>();
  private neutral = new Map<THREE.Bone, { position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3 }>();
  private headParts: THREE.Object3D[] = [];
  private cockpitHiddenParts: THREE.Object3D[] = [];
  private seated = false;

  constructor(gltf: GLTF) {
    this.model = gltf.scene; this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of gltf.animations) this.actions.set(clip.name.split('|').pop()!, this.mixer.clipAction(clip));
    this.play('Idle_Neutral'); this.mixer.update(0);
    this.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.model);
    this.model.scale.setScalar(1.78 / (bounds.max.y - bounds.min.y));
    this.model.rotation.y = Math.PI;
    this.model.position.y = -bounds.min.y * this.model.scale.x;
    this.model.traverse((node) => {
      if (node instanceof THREE.Bone) {
        this.bones.set(node.name, node);
        this.neutral.set(node, { position: node.position.clone(), rotation: node.quaternion.clone(), scale: node.scale.clone() });
      }
      if (node.name.startsWith('Casual2_Head')) this.headParts.push(node);
      if (node instanceof THREE.Mesh) {
        node.castShadow = true; node.receiveShadow = true;
        // Animated bounds vary substantially between standing and sitting.
        node.frustumCulled = false;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          // Keep the real skinned forearms/hands; hide the shirt directly under the eye.
          if (material.name === 'LightBrown' || material.name === 'LightBlue') this.cockpitHiddenParts.push(node);
          if (material instanceof THREE.MeshStandardMaterial) {
            material.metalness = 0; material.roughness = 0.85;
            if (material.name === 'LightBrown') material.color.set('#377f87');
          }
        }
      }
    });
  }
  private play(name: string) {
    if (this.current === name) return;
    const next = this.actions.get(name)!; const previous = this.actions.get(this.current);
    next.reset().setEffectiveTimeScale(name === 'Walk' ? 1.5 : name === 'Run' ? 1.25 : 1).setEffectiveWeight(1).play();
    if (previous) { previous.fadeOut(0.18); next.fadeIn(0.18); }
    this.current = name;
  }
  update(dt: number, moving: boolean, running: boolean) {
    if (this.seated) return;
    this.play(moving ? running ? 'Run' : 'Walk' : 'Idle_Neutral'); this.mixer.update(dt);
  }
  private restoreNeutral() {
    for (const [bone, pose] of this.neutral) { bone.position.copy(pose.position); bone.quaternion.copy(pose.rotation); bone.scale.copy(pose.scale); }
  }
  private bone(name: string) { const bone = this.bones.get(name) ?? this.model.getObjectByName(name); if (!bone) throw new Error(`Character bone missing: ${name}`); return bone; }
  private worldPosition(name: string) { return this.bone(name).getWorldPosition(new THREE.Vector3()); }
  private pointBone(name: string, child: string, target: THREE.Vector3) {
    this.root.updateWorldMatrix(true, true);
    const bone = this.bone(name); const origin = this.worldPosition(name);
    const from = this.worldPosition(child).sub(origin).normalize(); const to = target.clone().sub(origin).normalize();
    const worldRotation = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldRotation));
    this.root.updateWorldMatrix(true, true);
  }
  private solveLimb(upper: string, lower: string, end: string, target: THREE.Vector3, hint: THREE.Vector3) {
    this.root.updateWorldMatrix(true, true);
    const a = this.worldPosition(upper); const b = this.worldPosition(lower); const c = this.worldPosition(end);
    const l1 = a.distanceTo(b); const l2 = b.distanceTo(c);
    const direction = target.clone().sub(a).normalize();
    const distance = THREE.MathUtils.clamp(a.distanceTo(target), Math.abs(l1 - l2) + 0.001, l1 + l2 - 0.001);
    const along = (l1 * l1 + distance * distance - l2 * l2) / (2 * distance);
    const bend = hint.clone().sub(a); bend.addScaledVector(direction, -bend.dot(direction)).normalize();
    const joint = a.clone().addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
    this.pointBone(upper, lower, joint);
    this.pointBone(lower, end, a.clone().addScaledVector(direction, distance));
  }
  setSeated(value: boolean, vehicle?: THREE.Group) {
    this.seated = value; this.mixer.stopAllAction(); this.current = ''; this.restoreNeutral();
    this.headParts.forEach((part) => { part.visible = true; });
    this.cockpitHiddenParts.forEach((part) => { part.visible = true; });
    this.root.position.set(0, value ? 0 : -0.82, 0);
    if (!value || !vehicle) { this.play('Idle_Neutral'); this.mixer.update(0); return; }
    this.root.updateWorldMatrix(true, true);
    // Anchor pelvis to the seat, then pose each leg toward the footwell.
    const pelvis = vehicle.worldToLocal(this.worldPosition('Body'));
    this.root.position.add(new THREE.Vector3(-0.4, 0.35, 0.38).sub(pelvis));
    this.root.updateWorldMatrix(true, true);
    for (const side of ['L', 'R']) {
      const x = side === 'L' ? -0.52 : -0.28;
      const ankle = vehicle.localToWorld(new THREE.Vector3(x, -0.13, -0.01));
      this.solveLimb(`UpperLeg${side}`, `LowerLeg${side}`, `LowerLeg${side}_end`, ankle, vehicle.localToWorld(new THREE.Vector3(x, 0.35, -0.6)));
      // This source rig keeps foot controls under Root, not under the shin.
      const foot = this.bone(`Foot${side}`); foot.position.copy(foot.parent!.worldToLocal(ankle.clone()));
    }
    this.root.updateWorldMatrix(true, true);
  }
  updateDriver(vehicle: THREE.Group, leftGrip: THREE.Vector3, rightGrip: THREE.Vector3, cockpit: boolean) {
    if (!this.seated) return;
    this.headParts.forEach((part) => { part.visible = !cockpit; });
    this.cockpitHiddenParts.forEach((part) => { part.visible = !cockpit; });
    for (const [side, target, x] of [['L', leftGrip, -0.75], ['R', rightGrip, -0.05]] as const) {
      this.solveLimb(`UpperArm${side}`, `LowerArm${side}`, `Wrist${side}`, target, vehicle.localToWorld(new THREE.Vector3(x, 0.55, 0.3)));
    }
  }
  dispose() {
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model);
    const skeletons = new Set<THREE.Skeleton>();
    this.model.traverse(node => { if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton); });
    skeletons.forEach(skeleton => skeleton.dispose());
  }
}
