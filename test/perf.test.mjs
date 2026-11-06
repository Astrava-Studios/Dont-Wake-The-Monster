// Frame-rate governor (src/perf.js): steps down when slow, undoes a step that buys nothing, climbs back with headroom.
import assert from 'node:assert/strict';
import { createGovernor, ladder } from '../src/perf.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok', name); };
// feed `secs` seconds of frames; ms(level) gives the frame time the "GPU" manages at that level
const run = (G, secs, ms, refresh = 16.7) => { for (let t = 0; t < secs;) { const f = ms(G.level) / 1000; G.sample(f, refresh); t += f; } };
const mk = (steps = ladder(true), level = 0) => { const log = []; const G = createGovernor({ steps, level, apply: (s, l, why) => log.push([l, why]) }); return { G, log }; };

ok('ladder: Auto drops shadows after the first resolution step; manual keeps them', () => {
  assert.deepEqual(ladder(true).map((s) => s.shadows), [true, true, false, false, false, false]);
  assert.ok(ladder(false).every((s) => s.shadows));
  assert.equal(ladder(true)[0].scale, 1);
});
ok('a phone that runs at 60 stays sharp', () => {
  const { G, log } = mk(); run(G, 30, () => 16.7); assert.equal(G.level, 0); assert.equal(log.length, 0);
});
ok('slow frames step down until it is smooth, then it stays there', () => {
  const { G } = mk(); run(G, 40, (l) => [40, 34, 26, 16.7, 16.7, 16.7][l]);
  assert.equal(G.level, 3);
});
ok('a 30 fps cap (no gain from smaller frames) is undone, not chased to the bottom', () => {
  const { G, log } = mk(); run(G, 20, () => 33.4);
  assert.equal(G.level, 0); assert.ok(log.some(([, why]) => why === 'no gain'));
});
ok('with headroom it climbs back, and backs off when the climb fails', () => {
  const { G } = mk(ladder(true), 4); run(G, 60, () => 16.7); assert.equal(G.level, 0);
  const b = mk(ladder(true), 3); run(b.G, 120, (l) => (l >= 3 ? 16.7 : 30));
  assert.equal(b.G.level, 3); assert.ok(b.G.upFails >= 1);
});
ok('ignores the first seconds of a night (shader compiles)', () => {
  const { G } = mk(); run(G, 2, () => 200); assert.equal(G.level, 0);
});
console.log(`perf: ${n} tests passed`);
