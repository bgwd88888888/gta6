import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/core/Music.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { Music, TRACKS } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
class Media extends EventTarget {
  volume = 1; muted = false; currentTime = 0; duration = 154; loop = false; paused = true;
  _src = ''; pendingError = null;
  set src(value) { this._src = value; this.currentTime = 0; }
  get src() { return this._src; }
  play() { this.paused = false; return this.pendingError || Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
  removeAttribute() { this._src = ''; }
}
test('theme loops, car radio advances, exit restores theme position, pause preserves position', () => {
  const audio = new Media(); const music = new Music('/game/', () => {}, audio);
  assert.equal(audio.src, '');
  music.start(); assert.equal(audio.src, '/game/music/welcome-to-los-santos.mp3'); assert.equal(audio.loop, true);
  audio.currentTime = 37;
  music.setDriving(true); assert.equal(audio.currentTime, 37); assert.equal(audio.loop, false);
  music.next(1); assert.equal(music.state.track.title, 'Self Control');
  audio.dispatchEvent(new Event('ended')); assert.equal(music.state.track.title, 'Out of Touch');
  music.setDriving(false); audio.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(audio.currentTime, 37); assert.equal(audio.loop, true);
  music.pause(); assert.equal(audio.paused, true); music.start(); assert.equal(audio.currentTime, 37);
  music.setDriving(true); assert.equal(music.state.track.title, 'Out of Touch');
  music.pause(); music.next(1); assert.equal(music.state.track.title, 'Out of Touch');
  music.dispose(); assert.equal(audio.paused, true); assert.equal(audio.src, '');
});
test('radio wraps in both directions and ends advance exactly once', () => {
  const audio = new Media(); const music = new Music('/', () => {}, audio);
  music.start(); music.setDriving(true); music.next(-1); assert.equal(music.state.index, TRACKS.length - 1);
  audio.dispatchEvent(new Event('ended')); assert.equal(music.state.index, 0);
  music.setDriving(false); audio.dispatchEvent(new Event('ended')); assert.equal(music.state.index, 0);
  music.dispose();
});
test('home and pause menus can change songs and retain the selected song after walking', () => {
  const audio = new Media(); const music = new Music('/', () => {}, audio);
  music.start(); assert.equal(music.state.index, 0); assert.equal(audio.paused, false);
  audio.currentTime = 30; music.next(1); audio.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(music.state.track.title, 'Self Control'); assert.equal(audio.currentTime, 0);
  audio.currentTime = 18; music.setMenuOpen(false); music.next(1);
  assert.equal(music.state.index, 1); assert.equal(audio.paused, true);
  music.setMenuOpen(true); assert.equal(music.state.index, 1); assert.equal(audio.currentTime, 18);
  music.next(1); assert.equal(music.state.track.title, 'Out of Touch');
  music.next(-1); music.next(-1); music.next(-1); assert.equal(music.state.index, 3);
  music.next(1); assert.equal(music.state.index, 0);
  music.next(1); music.setMenuOpen(false); music.setDriving(true); music.next(-1);
  assert.equal(music.state.index, 3);
  music.setDriving(false); music.setMenuOpen(true);
  assert.equal(music.state.index, 1); assert.equal(audio.paused, false);
  music.dispose();
});
test('walking hides and stops music; gestures cannot restart it; menus and cars restore it', () => {
  const audio = new Media(); const music = new Music('/', () => {}, audio);
  music.start(); assert.equal(music.state.available, true); assert.equal(audio.paused, false);
  audio.currentTime = 12;
  music.setMenuOpen(false); assert.equal(music.state.available, false); assert.equal(audio.paused, true);
  music.start(); music.retry(); music.next(1);
  assert.equal(audio.paused, true); assert.equal(music.state.index, 0);
  music.setMenuOpen(true); assert.equal(music.state.available, true); assert.equal(audio.paused, false); assert.equal(audio.currentTime, 12);
  music.setMenuOpen(false); assert.equal(audio.paused, true);
  music.setDriving(true); assert.equal(music.state.available, true); assert.equal(audio.paused, false);
  music.next(1); audio.currentTime = 24;
  music.setMenuOpen(true); music.setMenuOpen(false);
  assert.equal(music.state.index, 1); assert.equal(audio.currentTime, 24); assert.equal(audio.paused, false);
  music.setDriving(false); assert.equal(music.state.available, false); assert.equal(audio.paused, true);
  music.start(); assert.equal(audio.paused, true);
  music.setMenuOpen(true); audio.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(music.state.index, 0); assert.equal(audio.currentTime, 12); assert.equal(audio.paused, false);
  music.dispose();
});
test('stale playback rejection cannot overwrite a newer track and current failures are visible', async () => {
  const audio = new Media(); const music = new Music('/', () => {}, audio); let reject;
  audio.pendingError = new Promise((_, fail) => { reject = fail; });
  music.start(); audio.pendingError = null; music.setDriving(true); music.next(1);
  audio.dispatchEvent(new Event('playing')); reject(new DOMException('Interrupted', 'AbortError')); await Promise.resolve();
  assert.equal(music.state.status, 'playing');
  audio.dispatchEvent(new Event('error')); assert.equal(music.state.status, 'error');
  audio.pendingError = Promise.reject(new DOMException('Needs gesture', 'NotAllowedError'));
  music.retry(); await Promise.resolve(); assert.equal(music.state.status, 'blocked');
  music.pause(); assert.equal(music.state.status, 'paused'); music.dispose();
});
test('volume and mute persist; unavailable storage is harmless', () => {
  let saved = null; globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const a = new Music('/', () => {}, new Media()); a.setVolume(.65); a.toggleMute();
  const b = new Music('/', () => {}, new Media()); assert.equal(b.state.volume, .65); assert.equal(b.state.muted, true);
  b.setVolume(2); assert.equal(b.state.volume, 1); assert.equal(b.state.muted, false);
  b.setVolume(NaN); assert.equal(b.state.volume, 1);
  globalThis.localStorage = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  const c = new Music('/', () => {}, new Media()); c.setVolume(.25); assert.equal(c.state.volume, .25);
  a.dispose(); b.dispose(); c.dispose(); delete globalThis.localStorage;
});
