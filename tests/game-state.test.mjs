import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { DeliveryMission } = await loadTs('../src/core/mission.ts');
const { loadSave, writeSave } = await loadTs('../src/core/save.ts');

test('delivery requires an active job, proximity and low speed; reward is paid once', () => {
  const mission = new DeliveryMission();
  assert.equal(mission.deliver(0, 0), 0);
  mission.start();
  assert.equal(mission.deliver(6, 0), 0);
  assert.equal(mission.deliver(2, 10), 0);
  assert.equal(mission.deliver(2, -10), 0);
  assert.equal(mission.deliver(2, 0), 250);
  assert.equal(mission.deliver(2, 0), 0);
  assert.equal(mission.status, 'complete');
});
test('expired jobs cannot pay out and can be restarted', () => {
  const mission = new DeliveryMission();
  mission.start(); mission.tick(121);
  assert.equal(mission.remaining, 0);
  assert.equal(mission.status, 'failed');
  assert.equal(mission.deliver(0, 0), 0);
  mission.start();
  assert.equal(mission.remaining, 120);
  assert.equal(mission.status, 'active');
});
test('repeated start cannot refill an active job timer', () => {
  const mission = new DeliveryMission(); mission.start(); mission.tick(30); mission.start();
  assert.equal(mission.remaining, 90);
});
test('idle and completed jobs do not consume the timer', () => {
  const mission = new DeliveryMission(); mission.tick(15); assert.equal(mission.remaining, 120);
  mission.start(); mission.deliver(0, 0); mission.tick(15); assert.equal(mission.remaining, 120);
});
test('save validates content and degrades gracefully if browser storage is unavailable', () => {
  let stored = '{broken';
  globalThis.localStorage = { getItem: () => stored, setItem: (_key, value) => { stored = value; } };
  assert.deepEqual(loadSave(), { version: 1, money: 0, deliveries: 0 });
  stored = JSON.stringify({ version: 1, money: -500, deliveries: 1 });
  assert.equal(loadSave().money, 0);
  const saved = { version: 1, money: 250, deliveries: 1 };
  assert.equal(writeSave(saved), true); assert.deepEqual(loadSave(), saved);
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.equal(loadSave().money, 0); assert.equal(writeSave(saved), false);
  delete globalThis.localStorage;
});
