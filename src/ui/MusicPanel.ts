import { Music, TRACKS, type MusicState } from '../core/Music';
import './music-panel.css';

export class MusicPanel {
  readonly music: Music;
  private element = document.createElement('section');
  private events = new AbortController();
  constructor(root: HTMLElement) {
    this.element.className = 'music-panel';
    this.element.setAttribute('aria-label', '游戏音乐与车载电台');
    this.element.innerHTML = `
      <div class="music-heading"><span id="music-mode">♫ SUNSET SOUND</span><span id="music-number">01 / 04</span></div>
      <strong id="music-title"></strong><span id="music-artist"></span>
      <div class="music-feedback"><small id="music-status" role="status" aria-live="polite"></small><button id="music-retry" hidden>重试播放</button></div>
      <div class="music-buttons"><button id="music-prev" title="上一首（[）" aria-label="上一首">⏮</button>
        <button id="music-mute" title="静音（M）">静音</button>
        <button id="music-next" title="下一首（/ 或 ]）" aria-label="下一首">⏭</button>
        <label class="music-volume">音量 <input id="music-volume" type="range" min="0" max="100" step="5" value="40" aria-label="音乐音量"></label></div>
      <div class="music-bottom"><small id="music-hint"></small></div>`;
    root.append(this.element);
    const audio = document.createElement('audio');
    audio.hidden = true; this.element.append(audio);
    this.music = new Music(import.meta.env.BASE_URL, (state) => this.render(state), audio);
    this.get<HTMLButtonElement>('music-prev').onclick = () => this.music.next(-1);
    this.get<HTMLButtonElement>('music-next').onclick = () => this.music.next(1);
    this.get<HTMLButtonElement>('music-mute').onclick = () => this.music.toggleMute();
    this.get<HTMLButtonElement>('music-retry').onclick = () => this.music.retry();
    this.get<HTMLInputElement>('music-volume').oninput = (event) => this.music.setVolume(Number((event.target as HTMLInputElement).value) / 100);
    // UI controls must not also move the character or trigger vehicle interactions.
    this.element.addEventListener('keydown', (event) => event.stopPropagation());
    this.element.addEventListener('keyup', (event) => event.stopPropagation());
    this.element.addEventListener('click', (event) => {
      if (event.target instanceof HTMLButtonElement && event.detail > 0) event.target.blur();
    });
    // Gestures only unlock audio in menus or a car; walking stays silent.
    const unlock = () => { if (this.music.state.status !== 'error') this.music.start(); };
    const options = { capture: true, signal: this.events.signal };
    document.addEventListener('pointerdown', unlock, options);
    document.addEventListener('keydown', (event) => {
      unlock();
      if (!this.music.state.available) return;
      const target = event.target;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        (target instanceof HTMLElement && (target.isContentEditable || target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLInputElement && target.type !== 'range')))) return;
      // Handle music in the page's gesture event, including menus and focused controls.
      // Do not route these keys through the simulation, which stops while paused.
      if (event.code === 'KeyM') this.music.toggleMute();
      else if (event.code === 'BracketLeft') this.music.next(-1);
      else if (['Slash', 'NumpadDivide', 'BracketRight'].includes(event.code) || event.key === '/' || event.key === '／') this.music.next(1);
      else return;
      event.preventDefault(); event.stopPropagation();
    }, options);
    this.music.start();
  }
  private get<T extends HTMLElement>(id: string) { return this.element.querySelector<T>(`#${id}`)!; }
  private render(state: MusicState) {
    this.element.hidden = !state.available;
    this.get('music-mode').textContent = state.driving ? '♫ PALM RADIO · 车载电台' : '♫ SUNSET SOUND · 背景音乐';
    this.get('music-number').textContent = `${String(state.index + 1).padStart(2, '0')} / ${String(TRACKS.length).padStart(2, '0')}`;
    this.get('music-title').textContent = state.track.title;
    this.get('music-artist').textContent = state.track.artist;
    const mute = this.get<HTMLButtonElement>('music-mute');
    mute.textContent = state.muted ? '开启声音' : '静音'; mute.setAttribute('aria-pressed', String(state.muted));
    this.get<HTMLInputElement>('music-volume').value = String(Math.round(state.volume * 100));
    for (const id of ['music-prev', 'music-next']) this.get<HTMLButtonElement>(id).disabled = !state.available || state.status === 'paused';
    this.get('music-hint').textContent = '/ 下一首 · [ 上一首 · M 静音';
    const labels = { paused: '音乐已暂停', loading: '正在加载音乐…', playing: '', blocked: '点击页面任意位置开启音乐', error: '音频加载失败，请重试' };
    const status = this.get('music-status');
    if (status.textContent !== labels[state.status]) status.textContent = labels[state.status];
    this.get('music-retry').hidden = !['blocked', 'error'].includes(state.status);
    this.element.dataset.playing = String(state.status === 'playing' && !state.muted && state.volume > 0);
  }
  dispose() { this.events.abort(); this.music.dispose(); this.element.remove(); }
}
