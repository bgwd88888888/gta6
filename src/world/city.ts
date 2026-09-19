import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { blocks } from './layout';
export const PICKUP = new THREE.Vector3(8, 0, 8);
export const DESTINATION = new THREE.Vector3(48, 0, -42);
const materials = new Map<string | number, THREE.MeshStandardMaterial>();
function material(color: string | number) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.83 }));
  return materials.get(color)!;
}
export function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string | number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function collider(world: RAPIER.World, x: number, y: number, z: number, w: number, h: number, d: number) {
  world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z).setFriction(0.65));
}
function sign(parent: THREE.Object3D, label: string, x: number, y: number, z: number, width: number, background = '#202b31') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 128);
  ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f1edca'; ctx.fillText(label, 256, 68);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.set(x, y, z); parent.add(mesh);
}
function palm(scene: THREE.Scene, x: number, z: number, scale = 1) {
  const tree = new THREE.Group(); tree.position.set(x, 0, z); tree.scale.setScalar(scale);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 7, 6), material('#9e795c'));
  trunk.position.y = 3.5; trunk.rotation.z = 0.06; trunk.castShadow = true; tree.add(trunk);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.5, 4), material(i % 2 ? '#47776b' : '#639276'));
    const angle = i * Math.PI * 2 / 7;
    leaf.position.set(Math.sin(angle) * 1.65, 7, Math.cos(angle) * 1.65);
    leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(angle), -0.25, Math.cos(angle)).normalize());
    leaf.castShadow = true; tree.add(leaf);
  }
  scene.add(tree);
}
export function buildCity(scene: THREE.Scene, world: RAPIER.World) {
  blocks.length = 0;
  box(scene, -5, -0.45, 0, 170, 0.9, 180, '#cdb996');
  collider(world, -5, -1, 0, 170, 2, 180);
  box(scene, 175, -0.6, 0, 190, 0.2, 900, '#70aca9');
  box(scene, 76, 0.025, 0, 8, 0.05, 180, '#ead2a6');
  for (let i = 0; i < 10; i++) box(scene, 85 + i * 12, -0.45, 0, 0.35, 0.03, 380, '#a6c4b6');
  for (const axis of [-48, 0, 48]) {
    box(scene, axis, 0.015, 0, 12, 0.03, 172, '#525e63');
    box(scene, -4, 0.02, axis, 164, 0.03, 12, '#525e63');
    for (let p = -78; p <= 78; p += 6) {
      if ([-48, 0, 48].some((a) => Math.abs(p - a) < 9)) continue;
      box(scene, axis, 0.045, p, 0.16, 0.02, 2.6, '#e8cf93');
      box(scene, p, 0.05, axis, 2.6, 0.02, 0.16, '#e8cf93');
    }
  }
  for (const x of [-48, 0, 48]) for (const z of [-48, 0, 48]) {
    for (let i = -4; i <= 4; i += 1.6) {
      box(scene, x + i, 0.05, z + 7, 0.8, 0.03, 2.2, '#ddd8c4');
      box(scene, x + 7, 0.05, z + i, 2.2, 0.03, 0.8, '#ddd8c4');
    }
  }
  const palette = ['#e5b99e', '#b5c9b3', '#e1cdb3', '#c6a6a8', '#9aafb5', '#e4bb7e'];
  let index = 0;
  for (const cx of [-69, -24, 24]) for (const cz of [-70, -24, 24, 70]) {
    const w = cx === -69 ? 16 : 25; const d = Math.abs(cz) === 70 ? 18 : 25;
    const h = 5 + (index * 7 % 13);
    box(scene, cx, 0.08, cz, w + 5, 0.16, d + 5, '#ded4b9');
    box(scene, cx, h / 2, cz, w, h, d, palette[index % palette.length]);
    collider(world, cx, h / 2, cz, w, h, d);
    blocks.push({ x: cx, z: cz, w, d });
    box(scene, cx, h + 0.2, cz, w + 0.7, 0.4, d + 0.7, '#f1ddbb');
    box(scene, cx + 2, h + 0.8, cz - 2, 4, 1.2, 3, '#818d89');
    for (let y = 2.4; y < h - 0.3; y += 3) for (let x = -w / 2 + 2; x < w / 2 - 1; x += 3.6) {
      box(scene, cx + x, y, cz + d / 2 + 0.03, 1.65, 1.5, 0.08, '#57757b');
      box(scene, cx + x, y, cz - d / 2 - 0.03, 1.65, 1.5, 0.08, '#57757b');
    }
    index++;
  }
  sign(scene, 'PALM MARKET', 24, 3.3, 36.58, 16);
  sign(scene, 'SUNSET MOTEL', -24, 4.5, -11.4, 17, '#976878');
  sign(scene, 'COAST CLUB', -24, 3.2, 79.08, 13, '#517b73');
  box(scene, 24, 2.5, 37.5, 18, 0.25, 2.4, '#efab70');
  for (let z = -76; z <= 76; z += 16) {
    palm(scene, 65, z, 0.9 + ((z + 76) % 3) * 0.08);
    box(scene, 72, 0.65, z, 0.2, 1.3, 0.2, '#eee2c6');
    box(scene, 72, 1.15, z + 8, 0.15, 0.12, 16, '#eee2c6');
  }
  for (const x of [-39, 9]) for (const z of [-36, 36, 60]) palm(scene, x, z, 0.8);
  // Boundary rails keep the prototype playable without water/streaming systems.
  collider(world, 78, 1, 0, 1, 2, 180); collider(world, -89, 1, 0, 1, 2, 180);
  collider(world, -5, 1, -89, 170, 2, 1); collider(world, -5, 1, 89, 170, 2, 1);
  for (const z of [-88, 88]) box(scene, -5, 0.45, z, 168, 0.9, 0.5, '#bbaa92');
  box(scene, -88, 0.45, 0, 0.5, 0.9, 176, '#bbaa92');
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.1, 8, 48), new THREE.MeshBasicMaterial({ color: '#d4fa85' }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; marker.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 5, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#d4fa85', transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 2.5; marker.add(beam);
  const parcel = box(marker, 0, 1.3, 0, 0.85, 0.85, 0.85, '#d4fa85'); parcel.rotation.y = Math.PI / 4;
  scene.add(marker);
  return { marker, parcel };
}
