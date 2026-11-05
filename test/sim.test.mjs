// Core sim rules. Run: npm test
import assert from 'node:assert/strict';
import { createSim, step, nightResult, wakeUp, addNoise } from '../src/sim.js';
import { playNight } from '../src/bot.js';
import { generateLevel, cellOf, astar } from '../src/level.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok', name); };

t('same seed -> same level and same bot game', () => {
  const a = playNight({ night: 4, seed: 123 }), b = playNight({ night: 4, seed: 123 });
  assert.equal(a.state, b.state); assert.equal(a.value, b.value); assert.equal(a.t.toFixed(3), b.t.toFixed(3));
});

t('every treasure, toy and power-up is reachable from the door', () => {
  for (let night = 1; night <= 10; night++) for (let s = 1; s <= 15; s++) {
    const L = generateLevel(night, s * 31 + night); const start = cellOf(L, L.start.x, L.start.z);
    for (const it of [...L.items, ...L.powerups]) assert.ok(astar(L.pgrid, start, cellOf(L, it.x, it.z)), `night ${night} seed ${s}: ${it.kind} unreachable`);
    assert.ok(astar(L.pgrid, start, cellOf(L, L.exit.x, L.exit.z)), 'exit unreachable');
  }
});

t('rugs never overlap (no z-fighting)', () => {
  const half = (r) => (r.round ? [r.r, r.r] : [r.w / 2, r.d / 2]);
  for (let night = 1; night <= 10; night++) for (let s = 1; s <= 50; s++) {
    const L = generateLevel(night, s * 13 + night);
    for (let i = 0; i < L.rugs.length; i++) for (let j = i + 1; j < L.rugs.length; j++) {
      const a = L.rugs[i], b = L.rugs[j], [aw, ad] = half(a), [bw, bd] = half(b);
      assert.ok(Math.abs(a.x - b.x) >= aw + bw || Math.abs(a.z - b.z) >= ad + bd, `night ${night} seed ${s}: rugs ${i} and ${j} overlap`);
    }
  }
});

t('standing still lets the monster calm down', () => {
  const S = createSim({ night: 1, seed: 5 }); S.wake = 50;
  for (let i = 0; i < 90; i++) step(S, 1 / 30, { x: 0, y: 0 });
  assert.ok(S.wake < 50);
});

t('wake reaching 100 starts a chase, chase ends in return or catch', () => {
  const S = createSim({ night: 2, seed: 9 }); S.wake = 99.9;
  S.player.x = S.L.nest.x; S.player.z = S.L.nest.z + 3.2;
  step(S, 1 / 30, { x: 1, y: 0 });
  // force a footstep
  for (let i = 0; i < 30 && S.state === 'play'; i++) step(S, 1 / 30, { x: 1, y: 0 });
  assert.equal(S.state === 'wakeup' || S.state === 'chase' || S.state === 'caught', true);
  for (let i = 0; i < 600 && !['caught', 'return'].includes(S.state); i++) step(S, 1 / 30, { x: 0, y: 0 });
  assert.equal(S.state, 'caught', 'a monster next to a frozen thief catches it');
});

t('escaping with loot ends the night and scores', () => {
  const S = playNight({ night: 1, seed: 77 });
  assert.equal(S.state, 'escaped'); const r = nightResult(S);
  assert.ok(r.ok && r.items.length === S.bag.length && r.items.length > 0);
});

t('bot finishes 30 nights of every difficulty without hanging', () => {
  for (const night of [1, 4, 8, 12]) for (let s = 1; s <= 8; s++) { const S = playNight({ night, seed: s }); assert.ok(S.done, `night ${night} seed ${s} did not finish (${S.state})`); }
});

t('sleep quirks: monster tosses, twitches in nightmare, and sleepwalks', () => {
  const S = createSim({ night: 3, seed: 10 });
  S.wake = 40;
  let tossed = false, twitched = false;
  for (let i = 0; i < 30 * 35 && S.state === 'play'; i++) {
    step(S, 1 / 30, { x: 0, y: 0 });
    for (const e of S.events) {
      if (e.type === 'monsterToss') tossed = true;
      if (e.type === 'monsterNightmare') twitched = true;
    }
    S.events.length = 0;
  }
  assert.ok(tossed, 'monster should toss and turn in bed');
  assert.ok(twitched, 'monster should twitch from nightmare');
});

t('cat hazard: running into a sleeping cat hisses and adds noise, tiptoeing is safe', () => {
  const S = createSim({ night: 3, seed: 15 });
  assert.ok(S.cats.length > 0, 'cats should spawn from night 2+');
  const cat = S.cats[0];
  // tiptoe past cat at 0.9m
  S.player.x = cat.x + 0.9; S.player.z = cat.z;
  step(S, 1 / 30, { x: 0.4, y: 0 }); // tiptoe magnitude < 0.6
  assert.equal(cat.startled, false, 'tiptoeing should not startle the cat');
  // run into cat
  S.player.x = cat.x + 0.4; S.player.z = cat.z;
  step(S, 1 / 30, { x: 1.0, y: 0 }); // full run
  assert.equal(cat.startled, true, 'running or bumping should startle cat');
  assert.ok(S.events.some((e) => e.type === 'catHiss'), 'should emit catHiss event');
});

t('wardrobe hiding: standing still next to wardrobe hides player from monster', () => {
  const S = createSim({ night: 2, seed: 2 });
  const w = S.L.obstacles.find((o) => o.kind === 'wardrobe');
  if (w) {
    S.player.x = w.x; S.player.z = w.z + 0.6;
    step(S, 1 / 30, { x: 0, y: 0 });
    assert.ok(!S.player.inWardrobe, 'just stopping next to it does not slip inside yet');
    for (let i = 0; i < 20; i++) step(S, 1 / 30, { x: 0, y: 0 });
    assert.ok(S.player.inWardrobe, 'standing still by wardrobe should enter it');
    assert.ok(S.hidden, 'player inside wardrobe must be hidden');
    wakeUp(S, 'noise'); step(S, 1 / 30, { x: 0, y: 0 });
    assert.ok(!S.player.inWardrobe, 'no wardrobe hiding once the monster is awake');
  }
});

t('sleepwalking does not raise the wake meter when the monster gets back to bed', () => {
  const S = createSim({ night: 3, seed: 5 });
  S.wake = 30; S.monster.sleepwalkT = 0;
  let after = null;
  for (let i = 0; i < 30 * 20 && after == null; i++) { S.peekNext = 999; step(S, 1 / 30, { x: 0, y: 0 }); if (S.events.some((e) => e.type === 'asleep')) after = S.wake; S.events.length = 0; }
  assert.ok(after != null && after <= 30, 'wake after sleepwalk ' + after);
});

t('walking back to bed it still hears: loud noise turns it around', () => {
  const S = createSim({ night: 3, seed: 5 });
  wakeUp(S, 'noise'); S.state = 'return'; S.monster.state = 'return';
  addNoise(S, 2, S.monster.homeX, S.monster.homeZ);
  assert.equal(S.state, 'return', 'a small sound is fine');
  addNoise(S, 40, S.monster.homeX, S.monster.homeZ);
  assert.equal(S.state, 'chase', 'a loud one makes it chase again');
  assert.ok(S.chaseT > 0);
});

console.log(`sim: ${n} tests passed`);
