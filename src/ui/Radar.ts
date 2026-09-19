import { blocks } from '../world/layout';

export interface RadarData {
  x: number; z: number; yaw: number; radarYaw: number; driving: boolean;
  targetX: number; targetZ: number; carX: number; carZ: number;
}

/** A player-centred, camera-oriented radar. All canvas coordinates are logical pixels. */
export class Radar {
  constructor(private canvas: HTMLCanvasElement) {}

  draw(data: RadarData) {
    const ctx = this.canvas.getContext('2d')!;
    const size = 200; const center = size / 2; const radius = 96;
    const scale = radius / (data.driving ? 80 : 60);
    const cos = Math.cos(data.radarYaw); const sin = Math.sin(data.radarYaw);
    ctx.setTransform(this.canvas.width / size, 0, 0, this.canvas.height / size, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.beginPath(); ctx.arc(center, center, radius, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#6bd5dc'; ctx.fillRect(0, 0, size, size);
    ctx.save(); ctx.translate(center, center); ctx.rotate(data.radarYaw); ctx.scale(scale, scale); ctx.translate(-data.x, -data.z);
    ctx.fillStyle = '#56996e'; ctx.fillRect(-90, -90, 170, 180);
    ctx.fillStyle = '#ebe1b7'; ctx.fillRect(72, -90, 8, 180);
    const roads = () => {
      ctx.beginPath();
      for (const a of [-48, 0, 48]) {
        ctx.moveTo(a, -86); ctx.lineTo(a, 86);
        ctx.moveTo(-86, a); ctx.lineTo(76, a);
      }
      ctx.stroke();
    };
    ctx.lineCap = 'butt'; ctx.strokeStyle = '#f6f1dd'; ctx.lineWidth = 17; roads();
    ctx.strokeStyle = '#202629'; ctx.lineWidth = 10; roads();
    for (const b of blocks) {
      ctx.fillStyle = '#f0b4d0'; ctx.fillRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d);
      ctx.fillStyle = '#c884aa'; ctx.fillRect(b.x - b.w / 2 + 2, b.z - b.d / 2 + 2, b.w - 4, b.d - 4);
    }
    ctx.restore();
    const project = (x: number, z: number, clamp = false) => {
      const dx = (x - data.x) * scale; const dz = (z - data.z) * scale;
      let px = dx * cos - dz * sin; let py = dx * sin + dz * cos;
      const distance = Math.hypot(px, py);
      if (clamp && distance > 82) { px *= 82 / distance; py *= 82 / distance; }
      return { x: center + px, y: center + py, offscreen: distance > 82 };
    };
    if (!data.driving) {
      const car = project(data.carX, data.carZ);
      ctx.fillStyle = '#63e9f2'; ctx.strokeStyle = '#152127'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(car.x - 4, car.y - 6, 8, 12, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#20383d'; ctx.fillRect(car.x - 2, car.y - 3, 4, 3);
    }
    const target = project(data.targetX, data.targetZ, true);
    ctx.save(); ctx.translate(target.x, target.y);
    ctx.strokeStyle = '#181d27'; ctx.lineWidth = 4; ctx.fillStyle = '#f691d3';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(7, 0); ctx.lineTo(0, 7); ctx.lineTo(-7, 0); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.strokeStyle = '#fff5fc'; ctx.lineWidth = 1; ctx.stroke();
    if (target.offscreen) {
      const angle = Math.atan2(target.y - center, target.x - center);
      ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(10, -3); ctx.lineTo(14, 0); ctx.lineTo(10, 3); ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.translate(center, center); ctx.rotate(data.radarYaw - data.yaw);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6.5, 7); ctx.lineTo(0, 4); ctx.lineTo(-6.5, 7); ctx.closePath();
    ctx.strokeStyle = '#131b22'; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
    ctx.restore();
    // Compass rotates with the map; it is drawn after clipping so it stays legible on the rim.
    ctx.font = '900 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#141923'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.fillStyle = '#fff6ed';
    const nx = center + sin * 87; const ny = center - cos * 87;
    ctx.strokeText('N', nx, ny); ctx.fillText('N', nx, ny);
  }
}
