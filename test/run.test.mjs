// Roguelite run + economy promises: rent, game over, gear, consumables, damage, curses, bag capacity.
import assert from 'node:assert/strict';
import { RULES } from '../src/rules.js';
import { newRun, newMeta, rentAmount, rentDueNight, rentDueNow, payRent, buyGear, buyConsumable, packKit, unpackKit, endRun } from '../src/run.js';
import { createSim, step, useItem, stepNoise, heardNoise, dropLoot, bagFits, nightResult } from '../src/sim.js';
import { generateLevel } from '../src/level.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok', name); };

t('rent: due every N nights, growing, then x growth', () => {
  const r = newRun(); assert.equal(rentDueNight(r), RULES.rent.every);
  assert.equal(rentAmount(0), RULES.rent.amounts[0]); assert.ok(rentAmount(5) > rentAmount(4));
  r.night = RULES.rent.every; assert.ok(!rentDueNow(r)); r.night++; assert.ok(rentDueNow(r));
});
t('rent: paying takes the coins and moves the next due date', () => {
  const r = newRun(); r.coins = rentAmount(0) + 10; assert.ok(payRent(r)); assert.equal(r.coins, 10); assert.equal(r.rentIdx, 1);
  assert.equal(rentDueNight(r), 2 * RULES.rent.every); assert.ok(!payRent(r), 'cannot pay without coins');
});
t('game over: the run resets, records and costumes stay', () => {
  const save = { run: newRun(), meta: newMeta() }; save.run.night = 13; save.run.coins = 999; save.run.sold = 4200; save.meta.costumes = ['ninja-hat'];
  const sum = endRun(save); assert.equal(sum.nights, 12); assert.equal(save.run.coins, 0); assert.equal(save.run.night, 1);
  assert.equal(save.meta.bestNight, 12); assert.deepEqual(save.meta.costumes, ['ninja-hat']); assert.equal(save.meta.totalSold, 4200);
});
t('merchant shop: gear once, consumables stack; never below zero', () => {
  const r = newRun(); r.coins = 1000;
  assert.ok(buyGear(r, 'slippers')); assert.ok(!buyGear(r, 'slippers')); assert.equal(r.coins, 1000 - RULES.gear.slippers.price);
  assert.ok(buyConsumable(r, 'feather') && buyConsumable(r, 'feather')); assert.equal(r.inv.feather, 2);
  r.coins = 0; assert.ok(!buyConsumable(r, 'smoke'));
});
t('kit: at most 3 consumables go into a night, unused ones come back', () => {
  const r = newRun(); r.inv = { feather: 2, lockpick: 1, smoke: 1 };
  const kit = packKit(r, ['feather', 'feather', 'lockpick', 'smoke']); assert.equal(kit.length, RULES.consumables.slots); assert.equal(r.inv.smoke, 1);
  unpackKit(r, ['lockpick']); assert.equal(r.inv.lockpick, 1);
});
const sim = (o = {}) => createSim({ night: 2, seed: 3, ...o });
t('Silent slippers lower step noise by the % sold', () => { assert.ok(Math.abs(stepNoise(sim({ gear: { slippers: true } }), 1, 'wood') / stepNoise(sim(), 1, 'wood') - RULES.gear.slippers.stepNoise) < 1e-9); });
t('Big bag carries more', () => { assert.equal(sim({ gear: { bigbag: true } }).capacity - sim().capacity, RULES.gear.bigbag.capacity); });
t('a full bag refuses the next item', () => {
  const S = sim(); const it = S.treasures[0]; S.weight = S.capacity; S.player.x = it.x; S.player.z = it.z;
  for (let i = 0; i < 120; i++) step(S, 1 / 30, { x: 0, y: 0, take: true }); assert.ok(it.alive && S.player.full && !bagFits(S, it));
});
t('sleep dust: no peeking and noise muffled', () => {
  const S = sim({ kit: ['sleepdust'] }); const a = heardNoise(S, 5, 0, 0); assert.ok(useItem(S, 0)); assert.ok(heardNoise(S, 5, 0, 0) < a * 0.3);
  S.wake = 90; S.peekNext = 0; step(S, 1 / 30, { x: 0, y: 0 }); assert.equal(S.peek, 'none'); assert.equal(S.kit.length, 0);
});
t('lockpick: the next item takes half as long', () => {
  const S = sim({ kit: ['lockpick'] }); const it = S.treasures[0]; S.player.x = it.x; S.player.z = it.z; useItem(S, 0);
  let k = 0; while (it.alive && k++ < 400) step(S, 1 / 30, { x: 0, y: 0, take: true });
  assert.ok(k <= Math.ceil(it.take * RULES.consumables.lockpick.takeMult * 30) + 3, `${k} frames`); assert.ok(!S.lockpick);
});
t('smoke bomb only works in a chase', () => {
  const S = sim({ kit: ['smoke'] }); assert.ok(!useItem(S, 0)); S.state = 'chase'; S.monster.state = 'chase'; assert.ok(useItem(S, 0)); assert.ok(S.monster.stun > 0);
});
t('fragile items crack when dropped, and are worth less', () => {
  const S = sim(); S.bag = [{ kind: 'vase', value: 100, weight: 3, seed: 1, cond: 1 }]; S.weight = 3; S.collected = 1;
  dropLoot(S); const t2 = S.treasures.at(-1); assert.ok(t2.cond < 1); assert.ok(S.events.some((e) => e.type === 'crack'));
});
t('running with fragile loot sometimes cracks it; tiptoeing never does', () => {
  const S = sim(); S.bag = [{ kind: 'vase', value: 100, weight: 3, seed: 1, cond: 1 }]; S.weight = 3; S.L.exit = { x: 999, z: 999, side: 1 }; // no escaping mid-test
  for (let i = 0; i < 3000; i++) { S.wake = 0; S.t = 0; step(S, 1 / 30, { x: i % 200 < 100 ? 0.45 : -0.45, y: 0 }); } assert.equal(S.bag[0].cond, 1, 'tiptoe');
  for (let i = 0; i < 3000; i++) { S.wake = 0; S.t = 0; step(S, 1 / 30, { x: i % 200 < 100 ? 1 : -1, y: 0 }); } assert.ok(S.bag[0].cond < 1, 'running');
});
t('a cursed ticking clock makes noise while carried', () => {
  const S = sim(); S.bag = [{ kind: 'ticker', value: 300, weight: 2, seed: 1, cond: 1 }]; S.weight = 2;
  for (let i = 0; i < 30 * 7; i++) step(S, 1 / 30, { x: 0, y: 0 }); assert.ok(S.events.some((e) => e.type === 'curse'));
});
t('cursed items appear from night 3 on, never before', () => {
  const cursed = (night) => { let c = 0; for (let s = 1; s <= 120; s++) c += generateLevel(night, s).items.filter((i) => RULES.items[i.kind].tier === 'cursed').length; return c; };
  assert.equal(cursed(2), 0); assert.ok(cursed(5) > 20);
});
t('later nights carry more valuable loot', () => {
  const avg = (night) => { let v = 0, c = 0; for (let s = 1; s <= 80; s++) for (const it of generateLevel(night, s).items) if (RULES.items[it.kind].tier === 2) { v += it.value; c++; } return v / c; };
  assert.ok(avg(8) > avg(1) * 1.4);
});
t('no power-ups lie on the floor any more', () => { for (let s = 1; s < 30; s++) assert.equal(generateLevel(4, s).powerups.length, 0); });
t('night result keeps item condition for the stash', () => {
  const S = sim(); S.state = 'escaped'; S.bag = [{ kind: 'vase', value: 100, weight: 3, seed: 1, cond: 0.7 }]; assert.equal(nightResult(S).items[0].cond, 0.7);
});
t('relics: feather step lowers noise and reduces bag capacity', () => {
  const normal = sim();
  const relicSim = sim({ relics: ['feather_step'] });
  assert.equal(relicSim.capacity, normal.capacity - 1);
  assert.ok(Math.abs(stepNoise(relicSim, 1, 'wood') / stepNoise(normal, 1, 'wood') - 0.6) < 1e-9);
});

console.log(`run: ${n} tests passed`);
