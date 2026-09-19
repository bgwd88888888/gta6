import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { box } from '../world/city';
import { Input } from '../core/Input';

export class Car {
  readonly mesh = new THREE.Group();
  readonly body: RAPIER.RigidBody;
  private wheels: THREE.Mesh[] = [];
  private steeringWheel = new THREE.Group();
  constructor(scene: THREE.Scene, world: RAPIER.World) {
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.8, 12).setLinearDamping(0.3).setAngularDamping(8).setCanSleep(false));
    this.body.setEnabledRotations(false, true, false, true);
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.94, 0.45, 1.95).setMass(900).setFriction(0.1).setRestitution(0.1), this.body);
    box(this.mesh, 0, 0.05, 0, 1.95, 0.55, 4, '#a4d4ba');
    box(this.mesh, 0, 0.36, -1.18, 1.87, 0.17, 1.4, '#b4e5c8');
    // Hollow cabin: the driver looks through real windows, not a solid box.
    const glass = new THREE.MeshStandardMaterial({ color: '#86b9bb', transparent: true, opacity: 0.12, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.47, 0.88), glass);
    windshield.position.set(0, 0.87, -0.68); this.mesh.add(windshield);
    const rearGlass = windshield.clone(); rearGlass.position.z = 1.18; this.mesh.add(rearGlass);
    for (const x of [-0.8, 0.8]) {
      const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.77, 0.86), glass);
      sideGlass.rotation.y = Math.PI / 2; sideGlass.position.set(x, 0.88, 0.25); this.mesh.add(sideGlass);
      for (const z of [-0.69, 0.3, 1.18]) box(this.mesh, x, 0.88, z, 0.065, 1, 0.065, '#8dbda5');
      box(this.mesh, x, 0.35, 0.25, 0.08, 0.2, 1.85, '#263739');
      box(this.mesh, x * 0.96, 0.44, 0.2, 0.1, 0.05, 0.5, '#40524e');
    }
    box(this.mesh, 0, 1.38, 0.35, 1.64, 0.15, 1.75, '#a4d4ba');
    box(this.mesh, 0, 1.31, -0.65, 1.6, 0.08, 0.08, '#263739');
    box(this.mesh, 0, 0.4, 0.97, 1.48, 0.17, 0.34, '#33443f');
    // Dashboard, instrument cluster and steering wheel are part of the car.
    box(this.mesh, 0, 0.42, -0.6, 1.49, 0.22, 0.4, '#263432');
    box(this.mesh, 0, 0.55, -0.57, 1.48, 0.04, 0.4, '#475951');
    box(this.mesh, -0.4, 0.54, -0.385, 0.49, 0.17, 0.025, '#101e20');
    for (const x of [-0.52, -0.3]) {
      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.065, 20), new THREE.MeshBasicMaterial({ color: '#a6c7aa' }));
      dial.position.set(x, 0.55, -0.368); this.mesh.add(dial);
      box(this.mesh, x, 0.566, -0.363, 0.006, 0.068, 0.008, '#eafbc4');
    }
    box(this.mesh, 0.23, 0.46, -0.382, 0.27, 0.08, 0.025, '#142324');
    box(this.mesh, 0.23, 0.46, -0.366, 0.2, 0.028, 0.008, '#b7cf91');
    for (const x of [-0.4, 0.4]) {
      box(this.mesh, x, 0.29, 0.4, 0.53, 0.16, 0.65, '#384943');
      box(this.mesh, x, 0.57, 0.73, 0.53, 0.58, 0.13, '#384943');
    }
    this.steeringWheel.position.set(-0.4, 0.63, 0.03);
    this.steeringWheel.rotation.x = -0.28;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 8, 32), new THREE.MeshStandardMaterial({ color: '#182825', roughness: 0.7 }));
    this.steeringWheel.add(rim);
    box(this.steeringWheel, 0, 0, 0, 0.32, 0.034, 0.04, '#83938a');
    box(this.steeringWheel, 0, -0.09, 0, 0.027, 0.17, 0.04, '#83938a');
    box(this.steeringWheel, 0, 0, 0.025, 0.1, 0.085, 0.04, '#263b32');
    this.mesh.add(this.steeringWheel);
    box(this.mesh, 0, -0.1, -2.03, 1.8, 0.18, 0.12, '#e4ddce');
    box(this.mesh, 0, -0.1, 2.03, 1.8, 0.18, 0.12, '#e4ddce');
    for (const x of [-0.65, 0.65]) {
      box(this.mesh, x, 0.15, -2.015, 0.43, 0.2, 0.035, '#fff0bc');
      box(this.mesh, x, 0.15, 2.015, 0.43, 0.2, 0.035, '#d96964');
    }
    for (const x of [-1, 1]) for (const z of [-1.25, 1.25]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.24, 12), new THREE.MeshStandardMaterial({ color: '#273039' }));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x, -0.15, z); wheel.castShadow = true; this.mesh.add(wheel); this.wheels.push(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 10), new THREE.MeshStandardMaterial({ color: '#cccfc3', metalness: 0.5, roughness: 0.4 }));
      hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); this.mesh.add(hub);
    }
    scene.add(this.mesh); this.sync();
  }
  get yaw() { const q = this.body.rotation(); return new THREE.Euler().setFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w), 'YXZ').y; }
  get speed() { const v = this.body.linvel(); return Math.hypot(v.x, v.z); }
  getDriverEye() { return new THREE.Vector3(-0.4, 1.04, 0.48).applyQuaternion(this.mesh.quaternion).add(this.mesh.position); }
  getDriverGrips() {
    this.mesh.updateWorldMatrix(true, true);
    return { left: this.steeringWheel.localToWorld(new THREE.Vector3(-0.17, 0.1, 0.03)), right: this.steeringWheel.localToWorld(new THREE.Vector3(0.17, 0.1, 0.03)) };
  }
  update(dt: number, input: Input, driving: boolean) {
    const yaw = this.yaw; const fx = -Math.sin(yaw); const fz = -Math.cos(yaw);
    const v = this.body.linvel();
    let forward = v.x * fx + v.z * fz;
    const throttle = driving ? Number(input.down('KeyW', 'ArrowUp')) - Number(input.down('KeyS', 'ArrowDown')) : 0;
    const braking = driving && input.down('Space');
    forward += throttle * (forward * throttle < 0 ? 22 : 12) * dt;
    forward *= Math.exp(-(braking ? 5 : throttle ? 0.14 : driving ? 0.8 : 4) * dt);
    forward = THREE.MathUtils.clamp(forward, -10, 30);
    const lateral = (v.x * Math.cos(yaw) - v.z * Math.sin(yaw)) * Math.exp(-(braking ? 3 : 12) * dt);
    this.body.setLinvel({ x: fx * forward + Math.cos(yaw) * lateral, y: v.y, z: fz * forward - Math.sin(yaw) * lateral }, true);
    const steer = driving ? Number(input.down('KeyA', 'ArrowLeft')) - Number(input.down('KeyD', 'ArrowRight')) : 0;
    this.steeringWheel.rotation.z = THREE.MathUtils.lerp(this.steeringWheel.rotation.z, steer * 0.65, 1 - Math.exp(-dt * 10));
    this.body.setAngvel({ x: 0, y: steer * Math.min(Math.abs(forward) / 8, 1) * Math.sign(forward) * 1.6, z: 0 }, true);
    this.wheels.forEach((wheel) => { wheel.rotation.x -= forward * dt * 2; });
  }
  sync() { this.mesh.position.copy(this.body.translation()); this.mesh.quaternion.copy(this.body.rotation()); }
  reset() {
    this.body.setTranslation({ x: 0, y: 0.8, z: 12 }, true); this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); this.body.setAngvel({ x: 0, y: 0, z: 0 }, true); this.sync();
  }
}
