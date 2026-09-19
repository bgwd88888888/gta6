export interface Track { title: string; artist: string; file: string }
export const TRACKS: readonly Track[] = [
  { title: 'Welcome to Los Santos', artist: 'Oh No', file: 'welcome-to-los-santos.mp3' },
  { title: 'Self Control', artist: 'Laura Branigan', file: 'self-control.mp3' },
  { title: 'Out of Touch', artist: 'Daryl Hall & John Oates', file: 'out-of-touch.mp3' },
  { title: 'It Was a Good Day', artist: 'Ice Cube', file: 'it-was-a-good-day.mp3' },
];
export interface MusicState {
  track: Track; index: number; driving: boolean; available: boolean; muted: boolean; volume: number;
  status: 'paused' | 'loading' | 'playing' | 'blocked' | 'error';
}

/** A single media element prevents the theme and radio from playing over each other. */
export class Music {
  private audio: HTMLAudioElement;
  private driving = false;
  private menuOpen = true;
  private running = false;
  private radioIndex = 0;
  private menuIndex = 0;
  private index = -1;
  private themeTime = 0;
  private generation = 0;
  private disposed = false;
  private status: MusicState['status'] = 'paused';
  private events = new AbortController();

  constructor(private baseUrl: string, private onChange: (state: MusicState) => void, audio = new Audio()) {
    this.audio = audio;
    audio.preload = 'none'; audio.volume = 0.4;
    try {
      const settings = JSON.parse(localStorage.getItem('palm-run-music') || 'null');
      if (typeof settings?.volume === 'number' && Number.isFinite(settings.volume)) audio.volume = Math.max(0, Math.min(1, settings.volume));
      if (typeof settings?.muted === 'boolean') audio.muted = settings.muted;
    } catch { /* Audio remains usable when storage is unavailable. */ }
    const options = { signal: this.events.signal };
    audio.addEventListener('playing', () => { if (this.running) { this.status = 'playing'; this.emit(); } }, options);
    audio.addEventListener('waiting', () => { if (this.running) { this.status = 'loading'; this.emit(); } }, options);
    audio.addEventListener('error', () => { this.status = 'error'; this.emit(); }, options);
    audio.addEventListener('ended', () => { if (this.running && this.driving) this.next(1); }, options);
    audio.addEventListener('loadedmetadata', () => {
      if (!this.driving && this.index === 0 && this.themeTime > 0 && Number.isFinite(audio.duration)) audio.currentTime = this.themeTime % audio.duration;
    }, options);
    this.emit();
  }

  get state(): MusicState {
    return { track: TRACKS[Math.max(0, this.index)], index: Math.max(0, this.index), driving: this.driving,
      available: this.available, muted: this.audio.muted, volume: this.audio.volume, status: this.status };
  }
  private get available() { return this.menuOpen || this.driving; }
  setMenuOpen(open: boolean) {
    if (this.menuOpen === open) return;
    this.menuOpen = open;
    if (this.available) this.start(); else this.pause();
    this.emit();
  }
  private emit() { if (!this.disposed) this.onChange(this.state); }
  private select(index: number) {
    if (this.index === index) { this.audio.loop = !this.driving; return; }
    if (this.index === 0 && !this.driving) this.themeTime = this.audio.currentTime;
    this.generation++; this.audio.pause(); this.index = index;
    this.audio.src = `${this.baseUrl}music/${TRACKS[index].file}`;
    this.audio.loop = !this.driving;
    this.status = this.running ? 'loading' : 'paused';
  }
  start() {
    if (this.disposed || !this.available) return;
    if (this.running && !this.audio.paused && this.status !== 'error') return;
    this.running = true; this.select(this.driving ? this.radioIndex : this.menuIndex); this.play();
  }
  pause() {
    this.running = false; this.generation++; this.audio.pause(); this.status = 'paused'; this.emit();
  }
  setDriving(driving: boolean) {
    if (this.driving === driving) return;
    if (!this.driving && this.index === 0) this.themeTime = this.audio.currentTime;
    this.driving = driving;
    if (!this.available) this.pause();
    this.select(driving ? this.radioIndex : this.menuIndex);
    if (this.available) this.start();
    this.emit();
  }
  next(direction: number) {
    if (!this.available || !this.running) return;
    const index = ((this.driving ? this.radioIndex : this.menuIndex) + direction + TRACKS.length) % TRACKS.length;
    if (this.driving) this.radioIndex = index; else this.menuIndex = index;
    this.select(index); this.play();
  }
  retry() { if (this.running) { this.audio.load(); this.play(); } }
  private play() {
    const generation = ++this.generation;
    this.status = 'loading'; this.emit();
    void this.audio.play().catch((error: unknown) => {
      if (this.disposed || generation !== this.generation || !this.running) return;
      this.status = error instanceof Error && error.name === 'NotAllowedError' ? 'blocked' : 'error'; this.emit();
    });
  }
  toggleMute() { this.audio.muted = !this.audio.muted; this.persist(); this.emit(); }
  setVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
    if (volume > 0) this.audio.muted = false;
    this.persist(); this.emit();
  }
  private persist() {
    try { localStorage.setItem('palm-run-music', JSON.stringify({ volume: this.audio.volume, muted: this.audio.muted })); } catch { /* Optional preference. */ }
  }
  dispose() {
    this.disposed = true; this.running = false; this.generation++; this.events.abort();
    this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load();
  }
}
