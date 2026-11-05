// Hideout + wardrobe: pure logic (no DOM), tested in node (test/hideout.test.mjs).
// save.run.hideout: stash size + repair table (lost at a game over, the guild takes the hideout)
// save.meta: costume pieces ('ninja.hat'), lantern looks, decor, the collection of stolen kinds — kept forever.
// Everything is paid with the run's coins.
import { RULES } from './rules.js';

const H = () => RULES.hideout, C = () => RULES.costumes;
const pay = (run, price) => { if (run.coins < price) return false; run.coins -= price; return true; };

// ---------- stash ----------
export const stashCap = (run) => H().stash.base + H().stash.per * ((run.hideout && run.hideout.stash) || 0);
export const stashPrice = (run) => H().stash.prices[(run.hideout && run.hideout.stash) || 0] ?? null; // null = maxed
export function buyStash(run) {
  const p = stashPrice(run); if (p == null || !pay(run, p)) return false;
  run.hideout.stash = (run.hideout.stash || 0) + 1; return true;
}
// a night's loot goes into the stash while it fits; the rest is left behind
export function stashLoot(run, items) {
  const room = Math.max(0, stashCap(run) - run.stash.length);
  const kept = items.slice(0, room), lost = items.slice(room);
  run.stash.push(...kept); return { kept, lost };
}

// ---------- repair table ----------
export function buyRepair(run) {
  if (run.hideout.repair || !pay(run, H().repair.price)) return false;
  run.hideout.repair = true; return true;
}
export const repairCost = (item) => Math.max(5, Math.round(item.value * (1 - (item.cond ?? 1)) * H().repair.costPer / 5) * 5);
export function repairItem(run, i) {
  const it = run.stash[i];
  if (!run.hideout.repair || !it || (it.cond ?? 1) >= 1 || !pay(run, repairCost(it))) return false;
  it.cond = 1; return true;
}

// ---------- decor + collection (meta) ----------
export function buyDecor(save, id) {
  const price = H().decor[id]; if (price == null || save.meta.decor.includes(id) || !pay(save.run, price)) return false;
  save.meta.decor.push(id); return true;
}
// every kind you ever escaped with gets a place on the trophy shelf
export function collect(meta, items) {
  meta.itemStats ??= {};
  const fresh = [];
  for (const it of items) {
    if (!meta.collection.includes(it.kind)) { meta.collection.push(it.kind); fresh.push(it.kind); }
    meta.itemStats[it.kind] ??= { stolen: 0, bestPrice: 0 };
    meta.itemStats[it.kind].stolen++;
  }
  return fresh;
}

// ---------- wardrobe (meta) ----------
export const pieceId = (set, slot) => `${set}.${slot}`;
export const piecePrice = (set, slot) => C().sets[set].prices[C().slots.indexOf(slot)];
export const ownsPiece = (meta, set, slot) => meta.costumes.includes(pieceId(set, slot));
export function buyPiece(save, set, slot) {
  if (!C().sets[set] || !C().slots.includes(slot) || ownsPiece(save.meta, set, slot) || !pay(save.run, piecePrice(set, slot))) return false;
  save.meta.costumes.push(pieceId(set, slot)); return true;
}
// wear a piece you own (set = null takes it off)
export function wear(meta, slot, set) {
  if (set != null && !ownsPiece(meta, set, slot)) return false;
  meta.wear[slot] = set; return true;
}
export function buyLantern(save, id) {
  const L = RULES.lanterns[id]; if (!L || save.meta.lanterns.includes(id) || !pay(save.run, L.price)) return false;
  save.meta.lanterns.push(id); return true;
}
export function wearLantern(meta, id) { if (!meta.lanterns.includes(id)) return false; meta.wear.lantern = id; return true; }
// the full set you wear (all 3 pieces of one set), or null
export function fullSet(wearing = {}) {
  const [a, ...rest] = C().slots.map((s) => wearing[s]);
  return a && rest.every((x) => x === a) ? a : null;
}
export const setBonus = (wearing) => { const s = fullSet(wearing); return s ? { ...C().sets[s].bonus } : {}; };
// how much a set bonus is worth, as the % shown in its description
export function bonusPercent(set) {
  const b = C().sets[set].bonus, [k, v] = Object.entries(b)[0];
  return k === 'capacity' ? v : Math.round(Math.abs(v - 1) * 100);
}

// ---------- houses (meta: unlocked forever) + lantern upgrades (run) ----------
export function buyHouse(save, id) {
  const h = RULES.houses[id]; if (!h || save.meta.houses.includes(id) || !pay(save.run, h.price)) return false;
  save.meta.houses.push(id); save.run.house = id; return true;
}
export function chooseHouse(save, id) { if (!save.meta.houses.includes(id)) return false; save.run.house = id; return true; }
export const lanternLevel = (run, k) => (run.hideout && run.hideout[k]) || 0;
export const lanternUpPrice = (run, k) => RULES.lanternUp[k].prices[lanternLevel(run, k)] ?? null; // null = maxed
export function buyLanternUp(run, k) {
  const p = lanternUpPrice(run, k); if (p == null || !pay(run, p)) return false;
  run.hideout[k] = lanternLevel(run, k) + 1; return true;
}
// what the lantern does tonight: radius you see in a dark section, light distance, brightness multiplier
export function lanternStats(run) {
  const U = RULES.lanternUp, r = lanternLevel(run, 'range'), b = lanternLevel(run, 'bright');
  return { darkR: U.range.darkR[r], dist: U.range.dist[r], mult: U.bright.mult[b] };
}
