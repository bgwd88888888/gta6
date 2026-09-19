export type MissionStatus = 'available' | 'active' | 'complete' | 'failed';
export class DeliveryMission {
  status: MissionStatus = 'available';
  remaining = 120;
  readonly reward = 250;
  start() { if (this.status !== 'active') { this.status = 'active'; this.remaining = 120; } }
  tick(dt: number) {
    if (this.status !== 'active') return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) this.status = 'failed';
  }
  deliver(distance: number, speed: number): number {
    if (this.status !== 'active' || distance > 5 || Math.abs(speed) > 2.5) return 0;
    this.status = 'complete';
    return this.reward;
  }
}
