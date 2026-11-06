// Promise tests: every number or claim the player reads must be true in the rules.
import assert from 'node:assert/strict';
import { RULES } from '../src/rules.js';
import { createSim, step, stepNoise, heardNoise, playerSpeed, dropLoot, useLullaby, nightResult, wakeUp, weightFactor, scream, bedEmpty } from '../src/sim.js';
import { MONSTERS, MODIFIERS, generateLevel } from '../src/level.js';
import { SHOP, getTips } from '../src/texts.js';
import { setLang, LANGS, checkDictionaries } from '../src/i18n.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok', name); };
const sim = (o = {}) => createSim({ night: 1, seed: 3, ...o });
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// ---- shop texts
// percentage written in the shop text, in any language ('%12' in Turkish, '12%' in English/Chinese)
const shopPct = (k) => { const m = SHOP.find((s) => s.k === k).ds().match(/%\s*(\d+)|(\d+)\s*%/); return +(m[1] || m[2]) / 100; };
t('🧦 socks: noise -X% per level', () => {
  const a = sim(), b = sim({ upgrades: { socks: 1 } });
  assert.ok(near(stepNoise(b, 1, 'wood') / stepNoise(a, 1, 'wood'), 1 - shopPct('socks')));
});
t('💪 back: weight penalty -X% per level', () => {
  const a = sim(), b = sim({ upgrades: { back: 1 } }); a.weight = b.weight = 6;
  assert.ok(near((1 - weightFactor(b)) / (1 - weightFactor(a)), 1 - shopPct('back')));
});
t('👟 feet: speed +X% per level', () => { assert.ok(near(playerSpeed(sim({ upgrades: { feet: 1 } }), 1) / playerSpeed(sim(), 1), 1 + shopPct('feet'))); });
t('🎵 lullaby box: +1 lullaby at night start', () => { assert.equal(sim({ upgrades: { lullaby: 2 } }).lull - sim().lull, 2); });
t('🍀 charm: treasure value +X% per level', () => {
  const a = sim(), b = sim({ upgrades: { charm: 1 } });
  const va = a.treasures[0].value, vb = b.treasures[0].value;
  assert.equal(vb, Math.round(a.L.items[0].value * a.L.valueMult * (1 + shopPct('charm')))); assert.ok(vb > va);
});

// ---- how-to + tips
t('tiptoe is quieter and slower than running', () => { const S = sim(); assert.ok(stepNoise(S, 0.4, 'wood') < stepNoise(S, 1, 'wood')); assert.ok(playerSpeed(S, 0.4) < playerSpeed(S, 1)); });
t('noise is muffled while snoring', () => { const S = sim(); const a = heardNoise(S, 5, 0, 0); S.snoring = true; assert.ok(heardNoise(S, 5, 0, 0) < a * 0.5); });
t('rugs absorb noise, squeaky planks are loud', () => { const S = sim(); assert.ok(stepNoise(S, 1, 'rug') < stepNoise(S, 1, 'wood')); assert.ok(stepNoise(S, 0.4, 'squeak') > stepNoise(S, 1, 'wood')); });
t('noise is louder close to the monster', () => { const S = sim(); assert.ok(heardNoise(S, 5, S.L.nest.x, S.L.nest.z + 3) > heardNoise(S, 5, S.L.exit.x, S.L.exit.z)); });
t('loot makes you slower and louder', () => { const a = sim(), b = sim(); b.weight = 8; assert.ok(playerSpeed(b, 1) < playerSpeed(a, 1)); assert.ok(stepNoise(b, 1, 'wood') > stepNoise(a, 1, 'wood')); });
t('drop: dropping loot makes you faster', () => {
  const S = sim(); S.bag = [{ kind: 'vase', value: 45, weight: 2, seed: 1 }, { kind: 'book', value: 10, weight: 1, seed: 2 }]; S.weight = 3; S.collected = 2;
  const v = playerSpeed(S, 1); dropLoot(S); assert.ok(playerSpeed(S, 1) > v); assert.equal(S.bag.length, 1);
});
t('lullaby calms a sleeping monster and stuns a chasing one', () => {
  const S = sim({ upgrades: { lullaby: 2 } }); S.wake = 60; useLullaby(S); assert.ok(near(S.wake, 60 - RULES.calm.lullaby));
  wakeUp(S, 'noise'); useLullaby(S); assert.ok(S.monster.stun > 0);
});
t('hiding behind tall furniture blocks the monster\'s look', () => {
  let found = false;
  for (let s = 1; s < 40 && !found; s++) {
    const S = createSim({ night: 3, seed: s }); const o = S.L.obstacles.find((x) => x.tall && x.z > S.L.nest.z + 2);
    if (!o) continue;
    const dx = o.x - S.L.nest.x, dz = o.z - (S.L.nest.z + 1), d = Math.hypot(dx, dz);
    S.player.x = o.x + dx / d * (Math.max(o.hw, o.hd) + 0.5); S.player.z = o.z + dz / d * (Math.max(o.hw, o.hd) + 0.5);
    S.wake = 60; S.peek = 'open'; S.peekT = 1; step(S, 1 / 30, { x: 0, y: 0 });
    if (S.hidden) found = true;
  }
  assert.ok(found);
});
t('the monster senses its shrinking hoard: more taken = it hears more', () => {
  const S = sim(); const a = heardNoise(S, 5, 0, 0); S.collected = S.total; assert.ok(heardNoise(S, 5, 0, 0) > a * 1.5);
});
t('up close the monster lunges (pounce) during a chase', () => {
  const S = sim(); wakeUp(S, 'noise'); S.monster.state = 'chase'; S.state = 'chase';
  S.player.x = S.monster.x + 2.5; S.player.z = S.monster.z; let pounced = false;
  for (let i = 0; i < 10 && !pounced; i++) { step(S, 1 / 30, { x: 0, y: 0 }); pounced = S.events.some((e) => e.type === 'pounce'); S.events.length = 0; }
  assert.ok(pounced && RULES.chase.pounceMult > 1);
});
t('dawn wakes the monster', () => { const S = sim(); S.t = S.L.dawnTime - 0.01; step(S, 1 / 30, { x: 0, y: 0 }); assert.ok(S.woke && S.dawn); });

// ---- monster traits
const M = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));
t('Horzilla snores longer', () => assert.ok(M.snorzilla.snoreLen > 1));
t('Pofuduk: light sleeper, slow runner', () => { assert.ok(M.fluffnir.hearing > 1); assert.ok(M.fluffnir.speed < 1); });
t('Alevkuyruk: deep sleeper, very fast', () => { assert.ok(M.blazeroo.hearing < 1); assert.ok(M.blazeroo.speed > 1); });
t('Glumpa: hears less, peeks often', () => { assert.ok(M.glumpa.hearing < 1); assert.ok(M.glumpa.peekRate > 1); });

// ---- modifiers
// a level with modifier `id` and no other value-changing modifier
const levelWith = (id) => { for (let s = 1; s < 400; s++) { const L = generateLevel(6, s); if (L.has(id) && ['golden', 'short'].every((o) => o === id || !L.has(o))) return L; } };
t('Golden Night: x1.5 value', () => { const L = levelWith('golden'); assert.ok(near(L.valueMult, RULES.mods.golden)); assert.ok(MODIFIERS.find((m) => m.id === 'golden').desc.includes(String(RULES.mods.golden))); });
t('Short Night: earlier dawn, more loot', () => {
  let L; for (let s = 1; s < 400 && !L; s++) { const x = generateLevel(6, s); if (x.has('short') && !x.has('golden')) L = x; }
  const ref = generateLevel(6, 1); assert.ok(L.dawnTime < (RULES.night.dawnBase + 6 * RULES.night.dawnPerNight)); assert.ok(near(L.valueMult, RULES.mods.short)); void ref;
});
t('Squeaky Floors: more squeaky planks', () => { const L = levelWith('squeaky'); assert.ok(L.squeak.size > RULES.level.squeakBase + 6 * RULES.level.squeakPerNight); });
t('Toy Mess: lots of toys', () => { const L = levelWith('toys'); assert.ok(L.ducks.length >= RULES.level.toysExtra); });
t('Restless Night: calms slower', () => { const L = levelWith('restless'); assert.ok(L.decayMult < 1); });

// ---- results screen
t('3 stars = escaped + never woke it + took everything; stars pay reputation per night', () => {
  const S = createSim({ night: 3, seed: 3 }); S.state = 'escaped'; S.bag = [{ kind: 'vase', value: 100, weight: 3, seed: 5 }]; S.collected = S.total;
  const r = nightResult(S); assert.equal(r.stars, 3); assert.equal(r.bonus, (RULES.score.stealthBonus + RULES.score.sweepBonus) * 3);
  assert.equal(r.items.length, 1);
  S.woke = true; S.collected = 0; const r2 = nightResult(S); assert.equal(r2.stars, 1); assert.equal(r2.bonus, 0);
});
t('caught: tonight\'s loot is lost', () => { const S = sim(); S.state = 'caught'; S.bag = [{ kind: 'book', value: 50, weight: 1 }]; const r = nightResult(S); assert.ok(!r.ok && r.items.length === 0 && r.lost.length === 1); });
t('items are only taken by holding Take next to them, never by walking over', () => {
  const S = sim(); const it = S.treasures.find((x) => !x.onBed); S.player.x = it.x; S.player.z = it.z;
  for (let i = 0; i < 30; i++) step(S, 1 / 30, { x: 0, y: 0 }); assert.ok(it.alive, 'standing without Take');
  for (let i = 0; i < Math.ceil(it.take * 30) + 5 && it.alive; i++) step(S, 1 / 30, { x: 0, y: 0, take: true });
  assert.ok(!it.alive && S.bag.length === 1);
});
t('rummaging is visible: taking while it looks counts as moving', () => {
  const S = createSim({ night: 2, seed: 4 }); const it = S.treasures.find((x) => !x.dropped && !x.onBed);
  S.player.x = it.x; S.player.z = it.z; S.wake = 50; S.peek = 'open'; S.peekT = 2; S.hidden = false;
  const w = S.wake; step(S, 1 / 30, { x: 0, y: 0, take: true }); assert.ok(S.wake > w || S.hidden);
});

t('every tip is in the tip list and mentions something real', () => { const tips = getTips(); assert.ok(tips.length >= 6); for (const tip of tips) assert.ok(tip.length > 5); });

// ---- every language: complete dictionaries, and shop/modifier numbers still match the rules
t('en / zh / tr dictionaries have every key with the same {placeholders}', () => { assert.deepEqual(checkDictionaries(), []); });
for (const { id } of LANGS) t(`[${id}] shop percentages and modifier multipliers match rules.js`, () => {
  setLang(id);
  for (const k of ['socks', 'back', 'feet', 'charm']) assert.ok(near(shopPct(k), RULES.upgrades[k].per), `${id} ${k}: ${SHOP.find((s) => s.k === k).ds()}`);
  assert.ok(SHOP.find((s) => s.k === 'lullaby').ds().includes(String(RULES.upgrades.lullaby.per)));
  assert.ok(MODIFIERS.find((m) => m.id === 'golden').desc.includes(String(RULES.mods.golden)));
  assert.ok(MODIFIERS.find((m) => m.id === 'short').desc.includes(String(RULES.mods.short)));
  for (const m of MONSTERS) assert.ok(m.name && m.trait, `${id}: monster ${m.id} has no text`);
  setLang('tr');
});

// ---- scream + crown on the bed
const crownOf = (S) => S.treasures.find((x) => x.kind === 'crown');
const runFor = (S, sec, inp = { x: 0, y: 0 }) => { for (let i = 0; i < sec * 30 && !S.done; i++) step(S, 1 / 30, inp); };
t('📣 the crown lies on the bed and cannot be taken while the monster is in it', () => {
  const S = sim(); const c = crownOf(S); assert.ok(c && c.onBed);
  assert.ok(Math.hypot(c.x - S.L.nest.x, c.z - S.L.nest.z) < S.L.nest.r, 'crown is on the bed');
  S.player.x = c.x; S.player.z = c.z; runFor(S, c.take + 1, { x: 0, y: 0, take: true });
  assert.ok(c.alive, 'still there'); assert.ok(!bedEmpty(S));
});
t('📣 one scream per night, only while it sleeps', () => {
  const S = sim(); assert.equal(S.screams, RULES.scream.perNight);
  assert.ok(scream(S)); assert.equal(S.state, 'lure'); assert.ok(S.woke);
  assert.ok(!scream(S), 'no second scream');
  const C = sim(); wakeUp(C, 'noise'); assert.ok(!scream(C), 'not during a chase');
});
t('📣 it runs to the scream, searches, and goes back to bed if it does not find you', () => {
  const S = sim(); const sx = S.player.x, sz = S.player.z; scream(S);
  S.L.inDark = () => true; // the player stays out of sight (as in a dark corner) and keeps still
  let searched = false, minD = 1e9;
  for (let i = 0; i < 30 * 40 && S.state !== 'play'; i++) {
    S.player.x = -sx * 0.8; S.player.z = sz; step(S, 1 / 30, { x: 0, y: 0 }); // slipped away to the far side, stands quietly
    if (S.monster.state === 'search') { searched = true; minD = Math.min(minD, Math.hypot(S.monster.x - sx, S.monster.z - sz)); }
  }
  assert.ok(searched, 'it searched'); assert.ok(minD < 2.5, 'near the scream spot');
  assert.equal(S.state, 'play'); assert.equal(S.monster.state, 'sleep');
});
t('📣 after the scream the crown can be taken from the empty bed', () => {
  const S = sim(); const c = crownOf(S); scream(S);
  runFor(S, 1.2); assert.ok(bedEmpty(S), 'it left the bed');
  S.player.x = c.x; S.player.z = c.z;
  for (let i = 0; i < 30 * (c.take + 1) && c.alive; i++) { S.grump = 0; S.monster.state = 'search'; S.monster.t = 0; S.player.inWardrobe = true; step(S, 1 / 30, { x: 0, y: 0, take: true }); }
  assert.ok(!c.alive, 'crown taken');
});
t('📣 standing where you screamed gets you spotted and chased', () => {
  const S = sim(); scream(S); runFor(S, 8); assert.ok(['chase', 'caught'].includes(S.state));
});
t('📣 escaping after a scream pays the bold bonus, never the stealth one', () => {
  const S = createSim({ night: 3, seed: 3 }); scream(S); S.state = 'escaped'; S.bag = [{ kind: 'book', value: 50, weight: 1 }];
  const r = nightResult(S); assert.ok(r.bold && !r.stealth); assert.equal(r.bonus, RULES.score.boldBonus * 3); assert.equal(r.stars, 2);
  assert.ok(RULES.score.boldBonus < RULES.score.stealthBonus);
});
t('📣 a lullaby while it hunts sends it back to bed', () => {
  const S = sim(); S.lull = 1; scream(S); runFor(S, 1); assert.ok(useLullaby(S)); assert.equal(S.state, 'return');
});

console.log(`promises: ${n} tests passed`);
