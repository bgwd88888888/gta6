import { Radar } from './Radar';
export class Hud {
  readonly canvas: HTMLCanvasElement;
  private radar: Radar;
  private overlay: HTMLElement;
  private title: HTMLElement;
  private description: HTMLElement;
  private button: HTMLButtonElement;
  private money: HTMLElement;
  private speed: HTMLElement;
  private mode: HTMLElement;
  private mission: HTMLElement;
  private objective: HTMLElement;
  private timer: HTMLElement;
  private prompt: HTMLElement;
  private toastElement: HTMLElement;
  private toastUntil = 0;
  constructor(root: HTMLElement, onStart: () => void, onPause: () => void) {
    root.innerHTML = `
      <canvas id="game" aria-label="棕榈街区 3D 游戏场景"></canvas>
      <div class="vignette"></div>
      <header class="topbar">
        <a class="brand" href="./" aria-label="日落街区首页">GTA<span>VI</span><i>日落街区</i></a>
        <div class="location"><span class="live-dot"></span> LEON BAY <span class="separator">/</span> 自由探索 <span class="version">原型 0.1</span></div>
        <section class="retro-hud" aria-label="玩家状态">
          <div class="retro-stats">
            <time class="hud-clock" aria-label="游戏时间 18 点 42 分">18:42</time>
            <strong id="money" class="hud-cash" aria-label="现金 0 美元">$00000000</strong>
            <div class="hud-vitals">
              <span class="hud-armor" aria-label="护甲 0"><svg viewBox="0 0 24 26" aria-hidden="true"><path d="M3 3 8 1l4 5 4-5 5 2-1 14-8 7-8-7Z"/></svg><b>000</b></span>
              <span class="hud-health" aria-label="生命值 100"><svg viewBox="0 0 26 24" aria-hidden="true"><path d="M13 22 3 12C-5 3 6-3 13 5 20-3 31 3 23 12Z"/></svg><b>100</b></span>
            </div>
          </div>
          <div class="hud-weapon" role="img" aria-label="当前装备：空手">
            <svg viewBox="0 0 64 72" aria-hidden="true"><path class="fist-cuff" d="m18 52 26-7 9 20H23Z"/><path class="fist-hand" d="m17 48-6-16 3-5 6 1-3-13 3-4 5 1 3 13-1-16 4-3 5 3 1 15 2-13 5-1 4 5-2 15 3-8 5 1 2 7-4 15-10 12-18 2Z"/><path class="fist-detail" d="m20 28 9 7 13-5M29 35l-3 10m11-21 1 6"/></svg>
          </div>
          <div class="hud-wanted" aria-label="通缉等级 0，共 6 级">${Array.from({ length: 6 }, () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6.3 7 .9-5.1 4.8 1.3 7-6.2-3.4L5.8 21l1.3-7L2 9.2l7-.9Z"/></svg>').join('')}</div>
          <button id="pause" class="hud-pause" title="暂停游戏（Esc）" aria-label="暂停游戏">Ⅱ<small>ESC</small></button>
        </section>
      </header>
      <aside class="mission-panel">
        <div class="eyebrow"><span class="tiny-square"></span> STREET OPPORTUNITIES <span>01</span></div>
        <h2 id="mission-title">街角的第一单</h2>
        <p id="objective">前往绿色标记，接取一份海滨快递。</p>
        <div class="mission-footer"><span class="reward">+$250</span><span id="timer">随时开始 ↗</span></div>
      </aside>
      <div class="map-panel"><div class="radar-bezel"><canvas id="minimap" width="400" height="400" aria-label="圆形雷达：白色箭头为玩家，粉色菱形为目标，蓝色为车辆，N 为北方"></canvas></div><div class="radar-location">Leon Bay</div></div>
      <div class="bottom-center"><div id="prompt" class="prompt" hidden></div><div class="controls"><span><kbd>W A S D</kbd> 移动</span><span><kbd>F</kbd> 上下车</span><span><kbd>E</kbd> 接任务</span><span><kbd>拖动鼠标</kbd> 视角</span><span><kbd>R</kbd> 重置</span></div></div>
      <div class="speed-panel"><div id="mode">ON FOOT / 步行</div><strong id="speed">00</strong><span>KM/H</span><div class="speed-track"><i id="speed-fill"></i></div><small>棕榈成荫，自由上路。</small></div>
      <div id="toast" role="status" aria-live="polite"></div>
      <div id="overlay" class="overlay" data-state="intro">
      <div class="poster-art" aria-hidden="true"></div><div class="poster-wash" aria-hidden="true"></div>
      <header class="poster-header"><a href="./" class="poster-wordmark" aria-label="日落街区首页">VI<span>LEON BAY</span></a><span class="poster-header-note">A LITTLE FREEDOM. A LONG SUMMER.</span><span class="poster-edition">可游玩原型 <i></i> 2026</span></header>
      <section class="start-card">
        <div class="eyebrow"><span></span> WELCOME TO LEON BAY <span></span></div>
        <div class="poster-logo" role="img" aria-label="Grand Theft Auto VI">
          <span class="logo-six" aria-hidden="true">VI</span>
          <span class="logo-words" aria-hidden="true"><span>grand</span><span>theft</span><span>auto</span></span>
        </div>
        <h1 id="overlay-title">日落之后，自由开始。</h1>
        <p id="overlay-description">霓虹将亮，故事未完。<br>一辆旧车，一整座城，下一站由你决定。</p>
        <div class="start-facts"><span>自由探索</span><i>✦</i><span>海岸驾驶</span><i>✦</i><span>街头任务</span></div>
        <button id="start" disabled>正在准备街区…</button>
        <div class="start-note"><span>W A S D</span> 移动 <b>·</b> <span>F</span> 上下车 <b>·</b> <span>E</span> 接任务</div>
      </section>
      <div class="poster-coordinate" aria-hidden="true">25° 47′ N<br>80° 13′ W <span>YOUR NEXT CHAPTER ↗</span></div>
      <footer class="poster-footer"><span class="studio-mark" aria-hidden="true">P<span>☆</span></span><span>GTA VI INSPIRED · FAN-MADE EXPERIENCE<br><small>海滨街区单机原型 · 进度保存在本机</small></span><span class="footer-sunset">SOMEWHERE UNDER THE SAME SUN.</span></footer>
      </div>`;
    const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
    this.canvas = get('game'); this.radar = new Radar(get('minimap')); this.overlay = get('overlay');
    this.title = get('overlay-title'); this.description = get('overlay-description'); this.button = get('start');
    this.money = get('money'); this.speed = get('speed'); this.mode = get('mode');
    this.mission = get('mission-title'); this.objective = get('objective'); this.timer = get('timer'); this.prompt = get('prompt'); this.toastElement = get('toast');
    this.button.addEventListener('click', () => { this.button.blur(); onStart(); });
    get('pause').addEventListener('click', (event) => { (event.currentTarget as HTMLButtonElement).blur(); onPause(); });
  }
  ready() { this.button.disabled = false; this.button.textContent = '开启日落之旅 ↗'; }
  hideOverlay() { this.overlay.hidden = true; }
  pause() { this.overlay.hidden = false; this.overlay.dataset.state = 'paused'; this.title.textContent = '停一下，日落还在。'; this.description.textContent = '游戏已暂停，任务计时也已停止。按 Esc 或点击下方继续。'; this.button.textContent = '继续探索 ↗'; }
  error(message: string) { this.overlay.hidden = false; this.overlay.dataset.state = 'error'; this.title.textContent = '街区暂未就绪'; this.description.textContent = message; this.button.disabled = false; this.button.textContent = '重新加载 ↗'; this.button.onclick = () => location.reload(); }
  showPrompt(text: string) { this.prompt.hidden = !text; this.prompt.textContent = text; }
  toast(text: string) { this.toastElement.textContent = text; this.toastUntil = performance.now() + 4000; this.toastElement.classList.add('visible'); }
  update(data: { money: number; speed: number; driving: boolean; cockpit: boolean; status: string; remaining: number; x: number; z: number; yaw: number; radarYaw: number; targetX: number; targetZ: number; carX: number; carZ: number }) {
    this.money.textContent = `$${data.money.toString().padStart(8, '0')}`;
    this.money.setAttribute('aria-label', `现金 ${data.money} 美元`);
    this.speed.textContent = Math.round(data.speed * 3.6).toString().padStart(2, '0');
    this.mode.textContent = data.driving ? data.cockpit ? 'COCKPIT / 车内视角' : 'CHASE / 车外视角' : 'ON FOOT / 步行';
    document.getElementById('speed-fill')!.style.width = `${Math.min(data.speed / 30 * 100, 100)}%`;
    const active = data.status === 'active';
    this.mission.textContent = active ? '沿着海岸，送到日落' : data.status === 'complete' ? '第一桶金，已到账' : data.status === 'failed' ? '下一单，会更顺利' : '街角的第一单';
    this.objective.textContent = active ? '沿道路前往海滨绿圈，减速停车完成配送。' : data.status === 'complete' ? '继续探索，或返回起点再接一单。' : data.status === 'failed' ? '本次配送超时，返回绿色标记重新接单。' : '前往绿色标记，按 E 接取一份海滨快递。';
    this.timer.textContent = active ? `${Math.floor(data.remaining / 60)}:${Math.floor(data.remaining % 60).toString().padStart(2, '0')}` : '随时开始 ↗';
    if (performance.now() > this.toastUntil) this.toastElement.classList.remove('visible');
    this.radar.draw(data);
  }
}
