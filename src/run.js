// A run (roguelite): coins, stash, skills, gear, consumables and the guild's rent. Pure — tested in node.
// Rent is due every RULES.rent.every nights. Starting the next night with rent unpaid ends the run;
// costumes and best records (save.meta) survive, everything in the run starts over.
import { RULES } from './rules.js';

export function newRun() {
  return { coins: 0, stash: [], upgrades: {}, gear: {}, inv: {}, kit: [], rep: 0, night: 1, visit: 0, rentIdx: 0, hideout: { stash: 0, repair: false, range: 0, bright: 0 }, house: 'manor',
    sold: 0, stolen: 0, escapes: 0, caught: 0, relics: [] };
}
export function newMeta() {
  return { bestNight: 0, runs: 0, totalSold: 0, bestRunSold: 0, costumes: [], achievements: [],
    lanterns: ['classic'], decor: [], collection: [], houses: ['manor'], wear: { hat: null, outfit: null, bag: null, lantern: 'classic' },
    monsterStats: {}, itemStats: {} };
}

export function rentAmount(idx) {
  const A = RULES.rent.amounts;
  return idx < A.length ? A[idx] : Math.round(A.at(-1) * Math.pow(RULES.rent.growth, idx - A.length + 1) / 5) * 5;
}
export const rentDueNight = (run) => (run.rentIdx + 1) * RULES.rent.every; // the last night you may play before paying
export const nightsToRent = (run) => rentDueNight(run) - run.night + 1;      // nights left, this one included
export const rentDueNow = (run) => run.night > rentDueNight(run);            // must pay before this night starts
export const canPayRent = (run) => run.coins >= rentAmount(run.rentIdx);
export function payRent(run) {
  const a = rentAmount(run.rentIdx); if (run.coins < a) return false;
  run.coins -= a; run.rentIdx++; return true;
}

// buying from the merchant
export function buyGear(run, kind) {
  const g = RULES.gear[kind]; if (!g || run.gear[kind] || run.coins < g.price) return false;
  run.coins -= g.price; run.gear[kind] = true; return true;
}
export function buyConsumable(run, kind) {
  const c = RULES.consumables[kind]; if (!c || !c.price || run.coins < c.price) return false;
  run.coins -= c.price; run.inv[kind] = (run.inv[kind] || 0) + 1; return true;
}
// pack up to `slots` consumables for tonight (taken out of the inventory); what is not used comes back after the night
export function packKit(run, kinds) {
  const kit = [];
  for (const k of kinds) { if (kit.length >= RULES.consumables.slots) break; if ((run.inv[k] || 0) > 0) { run.inv[k]--; kit.push(k); } }
  run.kit = kit.slice(); return kit;
}
export function unpackKit(run, left) { for (const k of left) run.inv[k] = (run.inv[k] || 0) + 1; run.kit = []; }

// the run is over: keep the records, start a new run
export function endRun(save) {
  const r = save.run, m = save.meta;
  m.runs++; m.bestNight = Math.max(m.bestNight, r.night - 1); m.totalSold += r.sold; m.bestRunSold = Math.max(m.bestRunSold, r.sold);
  const summary = { nights: r.night - 1, sold: r.sold, stolen: r.stolen, rentsPaid: r.rentIdx };
  save.run = newRun();
  return summary;
}
