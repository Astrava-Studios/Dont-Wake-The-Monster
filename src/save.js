// Save = settings + meta (survives runs: records, costumes) + run (one roguelite run: coins, stash, skills…).
// Old flat saves (v1) are moved into run/meta on load.
import { newRun, newMeta } from './run.js';
const KEY = 'dwtm_save_v1';
const defaults = () => ({ sound: true, seenHow: false, hints: {}, escapes: 0, caught: 0, run: newRun(), meta: newMeta() });

// the rest of the game reads save.coins / save.upgrades / save.stash / save.bestNight — these point into run / meta
function link(s) {
  const alias = (name, get, set) => Object.defineProperty(s, name, { get, set, enumerable: false, configurable: true });
  alias('coins', () => s.run.coins, (v) => { s.run.coins = v; });
  alias('upgrades', () => s.run.upgrades, (v) => { s.run.upgrades = v; });
  alias('stash', () => s.run.stash, (v) => { s.run.stash = v; });
  alias('bestNight', () => s.meta.bestNight, (v) => { s.meta.bestNight = v; });
  return s;
}
export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return link(defaults());
    const d = defaults(); const s = { ...d, ...raw };
    if (!raw.run) { // v1 → run/meta
      s.run = { ...newRun(), coins: raw.coins || 0, stash: raw.stash || [], upgrades: raw.upgrades || {} };
      s.meta = { ...newMeta(), bestNight: raw.bestNight || 0 };
      for (const k of ['coins', 'stash', 'upgrades', 'bestNight', 'bestHaul', 'soldTotal']) delete s[k];
    }
    s.run = { ...newRun(), ...s.run }; s.meta = { ...newMeta(), ...s.meta };
    return link(s);
  } catch { return link(defaults()); }
}
export function writeSave(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
