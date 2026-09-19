import './style.css';
import './ui/retro-hud.css';
import './ui/sunset-theme.css';
import { Hud } from './ui/Hud';
import { MusicPanel } from './ui/MusicPanel';

let game: import('./core/Game').Game | undefined;
const hud = new Hud(document.getElementById('app')!, () => game?.start(), () => game?.togglePause());
const musicPanel = new MusicPanel(document.getElementById('app')!);
async function boot() {
  try {
    const { createGame } = await import('./core/Game');
    game = await createGame(hud, musicPanel.music);
  } catch (error) {
    console.error('Unable to initialize PALM RUN:', error);
    hud.error('初始化失败。请使用支持 WebGL 2 的桌面浏览器并开启硬件加速，检查网络后重试。');
  }
}
void boot();
if (import.meta.hot) import.meta.hot.dispose(() => { game?.dispose(); musicPanel.dispose(); });
