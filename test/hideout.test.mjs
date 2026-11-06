// Phase 2 promises: stash size, repair table, decor, collection, costumes and their set bonuses.
import assert from 'node:assert/strict';
import { RULES } from '../src/rules.js';
import { newRun, newMeta, endRun } from '../src/run.js';
import { stashCap, buyStash, stashLoot, buyRepair, repairCost, repairItem, buyDecor, collect, buyPiece, wear, fullSet, setBonus, buyLantern, wearLantern, bonusPercent } from '../src/hideout.js';
import { createSim, stepNoise, playerSpeed, step } from '../src/sim.js';
import { merchantMax } from '../src/market.js';
import { buyHouse, chooseHouse, buyLanternUp, lanternStats } from '../src/hideout.js';
import { generateLevel } from '../src/level.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok', name); };
const fresh = (coins = 0) => { const s = { run: newRun(), meta: newMeta() }; s.run.coins = coins; return s; };

t('stash: base size, each upgrade adds the promised slots, then maxes out', () => {
  const r = fresh(1e5).run; assert.equal(stashCap(r), RULES.hideout.stash.base);
  for (const _ of RULES.hideout.stash.prices) assert.ok(buyStash(r));
  assert.equal(stashCap(r), RULES.hideout.stash.base + RULES.hideout.stash.per * RULES.hideout.stash.prices.length); assert.ok(!buyStash(r));
});
t('stash: loot that does not fit is left behind', () => {
  const r = newRun(); r.stash = Array.from({ length: stashCap(r) - 1 }, (_, i) => ({ kind: 'book', value: 10, seed: i }));
  const { kept, lost } = stashLoot(r, [{ kind: 'gem' }, { kind: 'vase' }]); assert.equal(kept.length, 1); assert.equal(lost.length, 1); assert.equal(r.stash.length, stashCap(r));
});
t('repair table: needed first, costs a share of the lost value, restores the item', () => {
  const r = fresh(2000).run; r.stash = [{ kind: 'vase', value: 200, cond: 0.6, seed: 1 }];
  assert.ok(!repairItem(r, 0), 'no table yet'); assert.ok(buyRepair(r));
  const c = repairCost(r.stash[0]); assert.equal(c, Math.round(200 * 0.4 * RULES.hideout.repair.costPer / 5) * 5);
  const before = r.coins; assert.ok(repairItem(r, 0)); assert.equal(r.stash[0].cond, 1); assert.equal(r.coins, before - c); assert.ok(!repairItem(r, 0), 'already whole');
});
t('game over: the guild takes the hideout upgrades; costumes, decor and the collection stay', () => {
  const s = fresh(1e5); buyStash(s.run); buyRepair(s.run); buyDecor(s, 'plant'); buyPiece(s, 'ninja', 'hat'); collect(s.meta, [{ kind: 'gem' }]);
  endRun(s); assert.equal(s.run.hideout.stash, 0); assert.equal(s.run.hideout.repair, false);
  assert.deepEqual(s.meta.decor, ['plant']); assert.ok(s.meta.costumes.includes('ninja.hat')); assert.deepEqual(s.meta.collection, ['gem']);
});
t('decor and pieces are bought once, never below zero coins', () => {
  const s = fresh(RULES.hideout.decor.rug); assert.ok(buyDecor(s, 'rug')); assert.ok(!buyDecor(s, 'rug')); assert.equal(s.run.coins, 0);
  assert.ok(!buyPiece(s, 'pirate', 'hat'));
});
t('collection: only new kinds are added', () => {
  const m = newMeta(); assert.deepEqual(collect(m, [{ kind: 'gem' }, { kind: 'gem' }, { kind: 'vase' }]), ['gem', 'vase']); assert.deepEqual(collect(m, [{ kind: 'gem' }]), []);
});
t('wardrobe: you can only wear what you own; 3 pieces of one set = full set', () => {
  const s = fresh(1e5); assert.ok(!wear(s.meta, 'hat', 'cat'));
  for (const slot of RULES.costumes.slots) { buyPiece(s, 'cat', slot); assert.ok(wear(s.meta, slot, 'cat')); }
  assert.equal(fullSet(s.meta.wear), 'cat'); buyPiece(s, 'ninja', 'hat'); wear(s.meta, 'hat', 'ninja'); assert.equal(fullSet(s.meta.wear), null);
  assert.deepEqual(setBonus(s.meta.wear), {});
});
t('lanterns: classic is free, others bought then worn', () => {
  const s = fresh(1e4); assert.ok(wearLantern(s.meta, 'classic')); assert.ok(!wearLantern(s.meta, 'ghost')); assert.ok(buyLantern(s, 'ghost')); assert.ok(wearLantern(s.meta, 'ghost'));
});
const full = (set) => setBonus({ hat: set, outfit: set, bag: set });
const sim = (bonus) => createSim({ night: 2, seed: 5, bonus });
t('Ninja set: steps quieter by the promised %', () => { assert.ok(Math.abs(stepNoise(sim(full('ninja')), 1, 'wood') / stepNoise(sim(), 1, 'wood') - (1 - bonusPercent('ninja') / 100)) < 1e-9); });
t('Sheriff set: faster by the promised %', () => { assert.ok(Math.abs(playerSpeed(sim(full('sheriff')), 1) / playerSpeed(sim(), 1) - (1 + bonusPercent('sheriff') / 100)) < 1e-9); });
t('Christmas set: one more in the bag', () => { assert.equal(sim(full('xmas')).capacity - sim().capacity, 1); });
t('Pirate set: the merchant pays more', () => {
  const it = { kind: 'gem', value: 300, cond: 1, seed: 1 };
  assert.ok(Math.abs(merchantMax(it, { pay: full('pirate').pay }) / merchantMax(it, {}) - (1 + bonusPercent('pirate') / 100)) < 1e-9);
});
t('Cat set: takes an item faster', () => {
  const frames = (bonus) => { const S = sim(bonus); const it = S.treasures.find((x) => !x.onBed); S.player.x = it.x; S.player.z = it.z; let k = 0; while (it.alive && k++ < 600) { S.wake = 0; step(S, 1 / 30, { x: 0, y: 0, take: true }); } return k; };
  assert.ok(frames(full('cat')) < frames({}));
});
t('Angel set: the wake meter falls faster when still', () => {
  const fall = (bonus) => { const S = sim(bonus); S.wake = 50; for (let i = 0; i < 60; i++) step(S, 1 / 30, { x: 0, y: 0 }); return 50 - S.wake; };
  assert.ok(fall(full('angel')) > fall({}) * 1.05);
});
t('every set has 3 prices and exactly one bonus', () => { for (const [id, s] of Object.entries(RULES.costumes.sets)) { assert.equal(s.prices.length, 3, id); assert.equal(Object.keys(s.bonus).length, 1, id); } });
t('Old Library: locked until bought, then kept after a game over', () => {
  const s = fresh(RULES.houses.library.price); assert.ok(!chooseHouse(s, 'library')); assert.ok(buyHouse(s, 'library')); assert.equal(s.run.house, 'library'); assert.equal(s.run.coins, 0);
  endRun(s); assert.ok(s.meta.houses.includes('library')); assert.ok(chooseHouse(s, 'library'));
});
t('Old Library: bigger, shelf aisles, dark sections away from the start and the bed', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const L = generateLevel(5, seed, 'library'), M = generateLevel(5, seed);
    assert.ok(L.W > M.W); assert.ok(L.darkZones.length >= 1); assert.ok(!L.inDark(L.start.x, L.start.z)); assert.ok(!L.inDark(L.nest.x, L.nest.z));
    assert.ok(L.obstacles.filter((o) => o.kind === 'bookshelf').length > M.obstacles.filter((o) => o.kind === 'bookshelf').length);
    assert.equal(M.darkZones.length, 0);
  }
});
t('Old Library: every dark section hides an item, and dark items are worth more', () => {
  let inDark = 0; for (let seed = 1; seed <= 40; seed++) { const L = generateLevel(4, seed, 'library'); inDark += L.items.filter((i) => L.inDark(i.x, i.z)).length; }
  assert.ok(inDark >= 40);
});
t('the monster cannot see you in a dark section, even when it peeks', () => {
  for (let seed = 1; seed < 80; seed++) {
    const S = createSim({ night: 4, seed, house: 'library' }); const dz = S.L.darkZones[0]; if (!dz) continue;
    S.player.x = dz.x; S.player.z = dz.z; S.peek = 'open'; S.peekT = 2; const w0 = S.wake;
    for (let i = 0; i < 15; i++) step(S, 1 / 30, { x: 0.01, y: 0 }); assert.ok(S.hidden, 'hidden in the dark'); assert.ok(S.wake <= w0 + 1); return;
  }
  assert.fail('no dark section found');
});
t('Bookwyrm: the library monster', () => { let w = 0; for (let s = 1; s <= 60; s++) if (generateLevel(3, s, 'library').monster.id === 'bookwyrm') w++; assert.ok(w > 20); for (let s = 1; s <= 60; s++) assert.notEqual(generateLevel(3, s).monster.id, 'bookwyrm'); });
t('Pirate Galleon: locked until bought, kept after game over, rolls Barnaby monster and ship sway', () => {
  const s = fresh(RULES.houses.pirate.price); assert.ok(!chooseHouse(s, 'pirate')); assert.ok(buyHouse(s, 'pirate')); assert.equal(s.run.house, 'pirate');
  endRun(s); assert.ok(s.meta.houses.includes('pirate')); assert.ok(chooseHouse(s, 'pirate'));
  const L = generateLevel(2, 5, 'pirate');
  assert.ok(L.sway); assert.ok(L.valueMult > 1.5);
  let b = 0; for (let seed = 1; seed <= 60; seed++) if (generateLevel(2, seed, 'pirate').monster.id === 'barnaby') b++;
  assert.ok(b > 20);
});
t('Alchemist Tower: locked until bought, kept after game over, has dark zones and Oozefang', () => {
  const s = fresh(RULES.houses.alchemist.price); assert.ok(!chooseHouse(s, 'alchemist')); assert.ok(buyHouse(s, 'alchemist')); assert.equal(s.run.house, 'alchemist');
  endRun(s); assert.ok(s.meta.houses.includes('alchemist')); assert.ok(chooseHouse(s, 'alchemist'));
  const L = generateLevel(3, 5, 'alchemist');
  assert.ok(L.magicGlow); assert.ok(L.darkZones.length >= 1);
  let o = 0; for (let seed = 1; seed <= 60; seed++) if (generateLevel(2, seed, 'alchemist').monster.id === 'oozefang') o++;
  assert.ok(o > 20);
});
t('Bestiary tracking: stolen items update itemStats counts', () => {
  const m = newMeta();
  collect(m, [{ kind: 'gem' }, { kind: 'gem' }, { kind: 'vase' }]);
  assert.equal(m.itemStats.gem.stolen, 2);
  assert.equal(m.itemStats.vase.stolen, 1);
});
t('lantern upgrades: range widens the dark radius, brightness the light; they are run upgrades', () => {
  const s = fresh(1e5); const a = lanternStats(s.run); assert.ok(buyLanternUp(s.run, 'range')); assert.ok(buyLanternUp(s.run, 'bright'));
  const b = lanternStats(s.run); assert.ok(b.darkR > a.darkR && b.dist > a.dist && b.mult > a.mult);
  for (let i = 0; i < 5; i++) buyLanternUp(s.run, 'range'); assert.equal(s.run.hideout.range, RULES.lanternUp.range.prices.length);
  endRun(s); assert.deepEqual(lanternStats(s.run), a);
});
console.log(`hideout: ${n} tests passed`);
