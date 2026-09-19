import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Input } from '../core/Input';
import { Character } from './Character';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { Car } from './Car';

export class Player {
  readonly mesh = new THREE.Group();
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private controller: RAPIER.KinematicCharacterController;
  private velocityY = 0;
  private character: Character;
  private driving = false;
  constructor(private scene: THREE.Scene, world: RAPIER.World, model: GLTF) {
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(4, 1.1, 14));
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.5, 0.32), this.body);
    this.controller = world.createCharacterController(0.02);
    this.controller.enableAutostep(0.3, 0.2, false); this.controller.enableSnapToGround(0.2);
    this.character = new Character(model); this.mesh.add(this.character.root); this.character.root.position.y = -0.82;
    scene.add(this.mesh); this.sync();
  }
  update(dt: number, input: Input, yaw: number, jump: boolean) {
    const movement = new THREE.Vector3(Number(input.down('KeyD', 'ArrowRight')) - Number(input.down('KeyA', 'ArrowLeft')), 0, Number(input.down('KeyS', 'ArrowDown')) - Number(input.down('KeyW', 'ArrowUp')));
    movement.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const speed = input.down('ShiftLeft', 'ShiftRight') ? 9 : 5;
    const grounded = this.controller.computedGrounded();
    if (grounded && this.velocityY < 0) this.velocityY = -0.5;
    if (jump && grounded) this.velocityY = 7;
    this.velocityY -= 20 * dt;
    this.controller.computeColliderMovement(this.collider, { x: movement.x * speed * dt, y: this.velocityY * dt, z: movement.z * speed * dt });
    const delta = this.controller.computedMovement(); const p = this.body.translation();
    this.body.setNextKinematicTranslation({ x: p.x + delta.x, y: p.y + delta.y, z: p.z + delta.z });
    if (movement.lengthSq() > 0) this.mesh.rotation.y = Math.atan2(-movement.x, -movement.z);
    this.character.update(dt, movement.lengthSq() > 0, speed > 5);
  }
  sync() { if (!this.driving) this.mesh.position.copy(this.body.translation()); }
  setDriving(value: boolean, car?: Car) {
    this.driving = value; this.body.setEnabled(!value); this.mesh.visible = true; this.velocityY = 0;
    if (value && car) {
      car.mesh.add(this.mesh); this.mesh.position.set(0, 0, 0); this.mesh.quaternion.identity();
      this.character.setSeated(true, car.mesh); this.updateDriver(car, false);
    } else {
      this.scene.add(this.mesh); this.mesh.quaternion.identity(); this.character.setSeated(false); this.sync();
    }
  }
  updateDriver(car: Car, cockpit: boolean) { const grips = car.getDriverGrips(); this.character.updateDriver(car.mesh, grips.left, grips.right, cockpit); }
  dispose() { this.character.dispose(); }
  teleport(position: THREE.Vector3) { this.body.setTranslation(position, true); this.body.setNextKinematicTranslation(position); this.velocityY = 0; this.sync(); }
}
