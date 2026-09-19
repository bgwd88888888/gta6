const KEY = 'palm-run.save.v1';
export interface SaveData { version: 1; money: number; deliveries: number }
export function loadSave(): SaveData {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (data?.version === 1 && Number.isSafeInteger(data.money) && data.money >= 0 && Number.isSafeInteger(data.deliveries) && data.deliveries >= 0) return data;
  } catch { /* Storage may be unavailable or contain an older/corrupt save. */ }
  return { version: 1, money: 0, deliveries: 0 };
}
export function writeSave(data: SaveData): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
