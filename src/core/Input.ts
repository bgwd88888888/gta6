export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private drag = false;
  private pointerId: number | null = null;
  private events = new AbortController();
  lookDelta = 0;

  constructor(canvas: HTMLCanvasElement, onBlur: () => void) {
    const options = { signal: this.events.signal };
    window.addEventListener('keydown', (event) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.code);
      this.held.add(event.code);
    }, options);
    window.addEventListener('keyup', (event) => this.held.delete(event.code), options);
    window.addEventListener('blur', () => { this.clear(); onBlur(); }, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.clear(); onBlur(); }
    }, options);
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      this.drag = true;
      this.pointerId = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
    }, options);
    canvas.addEventListener('pointerup', () => this.clearPointer(), options);
    canvas.addEventListener('lostpointercapture', () => this.clearPointer(), options);
    canvas.addEventListener('pointermove', (event) => { if (this.drag) this.lookDelta += event.movementX; }, options);
  }

  private clearPointer() { this.drag = false; this.pointerId = null; }
  get looking() { return this.drag; }
  down(...keys: string[]) { return keys.some((key) => this.held.has(key)); }
  take(key: string) { const value = this.pressed.has(key); this.pressed.delete(key); return value; }
  endFrame() { this.pressed.clear(); this.lookDelta = 0; }
  clear() { this.held.clear(); this.pressed.clear(); this.lookDelta = 0; if (this.pointerId !== null) this.clearPointer(); }
  dispose() { this.events.abort(); this.clear(); }
}
