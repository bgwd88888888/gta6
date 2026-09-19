import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Input } from './Input';
import { loadSave, writeSave } from './save';
import { DeliveryMission } from './mission';
import { Player } from '../actors/Player';
import { Car } from '../actors/Car';
import { buildCity, PICKUP, DESTINATION } from '../world/city';
import { Hud } from '../ui/Hud';
import type { Music } from './Music';
import { loadCharacter } from '../actors/Character';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export async function createGame(hud: Hud, music: Music) {
  const [, character] = await Promise.all([RAPIER.init(), loadCharacter()]);
  return new Game(hud, character, music);
}

export class Game {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(52, 1, 0.1, 600);
  private renderer: THREE.WebGLRenderer;
  private world: RAPIER.World;
  private player: Player;
  private car: Car;
  private input: Input;
  private city: ReturnType<typeof buildCity>;
  private mission = new DeliveryMission();
  private save = loadSave();
  private driving = false;
  private cockpit = false;
  private cockpitLook = 0;
  private cameraSnap = true;
  private running = false;
  private started = false;
  private yaw = 0.45;
  private last = 0;
  private accumulator = 0;
  private jumpQueued = false;
  private frame = 0;
  private hudTime = 0;
  private events = new AbortController();
  private readonly step = 1 / 60;

  constructor(private hud: Hud, character: GLTF, private music: Music) {
    this.renderer = new THREE.WebGLRenderer({ canvas: hud.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    this.scene.background = new THREE.Color('#c799c6'); this.scene.fog = new THREE.Fog('#c799c6', 90, 290);
    this.scene.add(new THREE.HemisphereLight('#ffe0d1', '#82769f', 2.4));
    const sun = new THREE.DirectionalLight('#ffbb98', 3.2); sun.position.set(-50, 85, 45); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -110; sun.shadow.camera.right = 110;
    sun.shadow.camera.top = 110; sun.shadow.camera.bottom = -110; sun.shadow.camera.far = 250; sun.shadow.normalBias = 0.06; this.scene.add(sun);
    this.world = new RAPIER.World({ x: 0, y: -20, z: 0 }); this.world.timestep = this.step;
    this.city = buildCity(this.scene, this.world); this.player = new Player(this.scene, this.world, character); this.car = new Car(this.scene, this.world);
    this.input = new Input(hud.canvas, () => this.pause());
    window.addEventListener('resize', this.resize, { signal: this.events.signal });
    hud.canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); this.pause(); this.hud.error('图形上下文已中断，请重新加载。也可以关闭其他占用显卡的页面后重试。'); }, { signal: this.events.signal });
    this.resize(); this.camera.position.set(76, 68, 98); this.camera.lookAt(3, 0, 2);
    this.city.marker.position.copy(PICKUP); this.refreshHud(); hud.ready();
    this.frame = requestAnimationFrame(this.animate);
  }
  start() {
    if (document.hidden) return;
    this.running = true; this.started = true; this.accumulator = 0; this.last = performance.now(); this.input.clear(); this.hud.hideOverlay();
    this.music.setMenuOpen(false);
  }
  pause() { if (!this.running) return; this.running = false; this.input.clear(); this.jumpQueued = false; this.hud.pause(); this.music.setMenuOpen(true); }
  togglePause() { if (!this.started) return; if (this.running) this.pause(); else this.start(); }
  private resize = () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); };
  private position() { return this.driving ? this.car.mesh.position : this.player.mesh.position; }
  private interact() {
    const p = this.position();
    if (this.mission.status !== 'active' && Math.hypot(p.x - PICKUP.x, p.z - PICKUP.z) < 4 && (!this.driving || this.car.speed < 2.5)) {
      this.mission.start(); this.hud.toast('包裹已取件 · 120 秒内送到海滨绿圈'); return;
    }
  }
  private toggleVehicle() {
    const p = this.position();
    if (this.driving) {
      if (this.car.speed > 2.5) { this.hud.toast('先减速停车，再下车'); return; }
      const yaw = this.car.yaw;
      const offsets = [new THREE.Vector3(2.6, 0, 0), new THREE.Vector3(-2.6, 0, 0), new THREE.Vector3(0, 0, 3.2)];
      for (const offset of offsets) {
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(this.car.mesh.position); offset.y = 1;
        const occupied = this.world.intersectionWithShape(offset, { x: 0, y: 0, z: 0, w: 1 }, new RAPIER.Capsule(0.5, 0.35), undefined, undefined, undefined, this.car.body);
        if (occupied) continue;
        this.driving = false; this.music.setDriving(false); this.cockpit = false; this.cameraSnap = true; this.player.setDriving(false); this.player.teleport(offset); this.hud.toast('已下车 · 按住 Shift 奔跑'); return;
      }
      this.hud.toast('车门旁空间不足，请将车挪到开阔处'); return;
    }
    if (p.distanceTo(this.car.mesh.position) < 4) { this.driving = true; this.music.setDriving(true); this.cockpit = false; this.cameraSnap = true; this.player.setDriving(true, this.car); this.yaw = this.car.yaw; this.hud.toast('W/S 驾驶 · V 车内视角'); }
  }
  private reset() {
    this.car.reset(); this.driving = false; this.cockpit = false; this.cameraSnap = true; this.player.setDriving(false); this.player.teleport(new THREE.Vector3(4, 1.1, 14)); this.yaw = 0.45;
    this.music.setDriving(false);
    this.hud.toast('角色与车辆已回到街角，当前任务计时继续');
  }
  private animate = (now: number) => {
    this.frame = requestAnimationFrame(this.animate);
    const elapsed = Math.max((now - (this.last || now)) / 1000, 0);
    const dt = Math.min(elapsed, 0.1); this.last = now;
    if (this.input.take('Escape')) this.togglePause();
    if (this.running) {
      if (this.input.take('KeyE')) this.interact();
      if (this.input.take('KeyF')) this.toggleVehicle();
      if (this.input.take('KeyR')) this.reset();
      if (this.input.take('KeyV') && this.driving) {
        this.cockpit = !this.cockpit; this.cockpitLook = 0; this.yaw = this.car.yaw; this.cameraSnap = true;
        this.hud.toast(this.cockpit ? '车内视角 · 拖动鼠标左右看 · V 切回车外' : '车外跟随视角 · V 切换车内');
      }
      if (!this.driving && this.input.take('Space')) this.jumpQueued = true;
      if (this.cockpit && this.driving) {
        this.cockpitLook = THREE.MathUtils.clamp(this.cockpitLook - this.input.lookDelta * 0.004, -1.25, 1.25);
        if (!this.input.looking) this.cockpitLook *= Math.exp(-dt * 4);
      } else this.yaw -= this.input.lookDelta * 0.005;
      this.accumulator += dt;
      while (this.accumulator >= this.step) {
        this.car.update(this.step, this.input, this.driving);
        if (!this.driving) this.player.update(this.step, this.input, this.yaw, this.jumpQueued);
        this.jumpQueued = false;
        this.world.step(); this.player.sync(); this.car.sync(); this.accumulator -= this.step;
      }
      const previous = this.mission.status; this.mission.tick(elapsed);
      if (previous === 'active' && this.mission.status === 'failed') this.hud.toast('配送超时 · 可以回到街角重新接单');
      const p = this.position();
      const reward = this.mission.deliver(Math.hypot(p.x - DESTINATION.x, p.z - DESTINATION.z), this.driving ? this.car.speed : 0);
      if (reward) {
        this.save.money += reward; this.save.deliveries++;
        const stored = writeSave(this.save); this.hud.toast(`送达成功！+$${reward}${stored ? ' · 已保存进度' : ' · 浏览器存储不可用，本次进度仅在当前页面保留'}`);
      }
      if (this.position().y < -8) this.reset();
      if (this.driving) this.player.updateDriver(this.car, this.cockpit);
      this.updateCamera(dt);
      this.city.parcel.rotation.y += dt; this.city.parcel.position.y = 1.5 + Math.sin(now / 450) * 0.25;
    }
    this.city.marker.position.copy(this.mission.status === 'active' ? DESTINATION : PICKUP);
    this.hudTime += dt; if (this.hudTime > 0.1) { this.refreshHud(); this.hudTime = 0; }
    this.input.endFrame(); this.renderer.render(this.scene, this.camera);
  };
  private updateCamera(dt: number) {
    const inside = this.driving && this.cockpit;
    const fov = inside ? 72 : 60;
    if (this.camera.fov !== fov) { this.camera.fov = fov; this.camera.near = inside ? 0.035 : 0.1; this.camera.updateProjectionMatrix(); }
    if (inside) {
      // Attach directly to the seat so acceleration/turns cannot drag the eye through the cabin.
      this.camera.position.copy(this.car.getDriverEye());
      const heading = this.car.yaw + this.cockpitLook;
      this.camera.lookAt(this.camera.position.clone().add(new THREE.Vector3(-Math.sin(heading), -0.035, -Math.cos(heading))));
    } else {
      if (this.driving && !this.input.looking) this.yaw += Math.atan2(Math.sin(this.car.yaw - this.yaw), Math.cos(this.car.yaw - this.yaw)) * (1 - Math.exp(-dt * 3));
      const target = this.position().clone().add(new THREE.Vector3(0, this.driving ? 0.85 : 0.55, 0));
      const distanceBack = this.driving ? 8.5 : 6.5;
      const desired = target.clone().add(new THREE.Vector3(Math.sin(this.yaw) * distanceBack, this.driving ? 1.8 : 1.3, Math.cos(this.yaw) * distanceBack));
      const direction = desired.clone().sub(target); const distance = direction.length(); direction.normalize();
      const hit = this.world.castRay(new RAPIER.Ray(target, direction), distance, true, undefined, undefined, undefined, this.driving ? this.car.body : this.player.body);
      if (hit) desired.copy(target).addScaledVector(direction, Math.max(0.25, hit.timeOfImpact - 0.35));
      if (this.cameraSnap || hit) this.camera.position.copy(desired);
      else this.camera.position.lerp(desired, 1 - Math.exp(-dt * 9));
      // Looking a little farther up the road leaves more horizon in the frame.
      target.add(new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).multiplyScalar(this.driving ? 3 : 1));
      this.camera.lookAt(target);
    }
    this.cameraSnap = false;
  }
  private refreshHud() {
    const p = this.position(); const target = this.mission.status === 'active' ? DESTINATION : PICKUP;
    this.hud.update({ money: this.save.money, speed: this.driving ? this.car.speed : 0, driving: this.driving, cockpit: this.cockpit, status: this.mission.status, remaining: this.mission.remaining, x: p.x, z: p.z, yaw: this.driving ? this.car.yaw : this.player.mesh.rotation.y, radarYaw: this.driving && this.cockpit ? this.car.yaw + this.cockpitLook : this.yaw, targetX: target.x, targetZ: target.z, carX: this.car.mesh.position.x, carZ: this.car.mesh.position.z });
    const pickupNear = Math.hypot(p.x - PICKUP.x, p.z - PICKUP.z) < 4;
    this.hud.showPrompt(!this.running ? '' : pickupNear && this.mission.status !== 'active' ? 'E  接取送货任务' : this.driving ? `V  ${this.cockpit ? '切换车外' : '切换车内'}　 /　 空格  刹车　 /　 F  下车` : p.distanceTo(this.car.mesh.position) < 4 ? 'F  驾驶 PALM COUPE' : 'Shift  奔跑　 /　 空格  跳跃');
  }
  dispose() {
    cancelAnimationFrame(this.frame); this.events.abort(); this.input.dispose(); this.player.dispose();
    const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>(); const textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const m of Array.isArray(object.material) ? object.material : [object.material]) { materials.add(m); if ('map' in m && m.map) textures.add(m.map); } }
    });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); textures.forEach((t) => t.dispose());
    this.world.free(); this.renderer.dispose();
  }
}
