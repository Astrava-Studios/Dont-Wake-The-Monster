// Frame-rate governor (src/perf.js): steps down when slow, undoes a step that buys nothing, climbs back with headroom.
// It never lowers the resolution: its steps are shadows off, simple materials and, last, a steady 30 fps.
import assert from 'node:assert/strict';
import { createGovernor, ladder, CAP30 } from '../src/perf.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok', name); };
// feed `secs` seconds of frames; ms(level) gives the frame time the phone manages at that level (a cap holds frames back)
const run = (G, secs, ms, refresh = 16.7) => {
  for (let t = 0; t < secs;) { const f = Math.max(ms(G.level), G.step().cap || 0) / 1000; G.sample(f, refresh); t += f; }
};
const mk = (steps = ladder(true, 'med'), level = 0) => { const log = []; const G = createGovernor({ steps, level, apply: (s, l, why) => log.push([l, why]) }); return { G, log }; };

ok('ladder: Auto on Medium = full, no shadows, simple materials, then 30 fps; never a resolution step', () => {
  const s = ladder(true, 'med');
  assert.deepEqual(s.map((x) => [x.shadows, x.lite, x.cap]), [[true, false, 0], [false, false, 0], [false, true, 0], [false, true, CAP30]]);
  assert.ok(s.every((x) => !('scale' in x)));
});
ok('ladder: Low (already simple) and manual choices only add the 30 fps step', () => {
  assert.deepEqual(ladder(true, 'low').map((x) => x.cap), [0, CAP30]);
  assert.deepEqual(ladder(false, 'high').map((x) => [x.shadows, x.lite, x.cap]), [[true, false, 0], [true, false, CAP30]]);
});
ok('a phone that runs at 60 stays on full quality', () => {
  const { G, log } = mk(); run(G, 30, () => 16.7); assert.equal(G.level, 0); assert.equal(log.length, 0);
});
ok('slow frames step down until it is smooth, then it stays there', () => {
  const { G } = mk(); run(G, 40, (l) => [40, 30, 16.7, 16.7][l]);
  assert.equal(G.level, 2);
});
ok('a phone too slow for 60 even on the simplest look settles on a steady 30 fps', () => {
  const { G } = mk(); run(G, 60, (l) => [50, 40, 28, 28][l]);
  assert.equal(G.level, 3); assert.equal(G.step().cap, CAP30);
});
ok('a browser already capped at 30 fps (no gain) gets its step undone, not chased down', () => {
  const { G, log } = mk(); run(G, 20, () => 33.4);
  assert.equal(G.level, 0); assert.ok(log.some(([, why]) => why === 'no gain'));
});
ok('with headroom it climbs back, and backs off when the climb fails', () => {
  const { G } = mk(ladder(true, 'med'), 2); run(G, 60, () => 16.7); assert.equal(G.level, 0);
  const b = mk(ladder(true, 'med'), 2); run(b.G, 120, (l) => (l >= 2 ? 16.7 : 30));
  assert.equal(b.G.level, 2); assert.ok(b.G.upFails >= 1);
});
ok('ignores the first seconds of a night (shader compiles)', () => {
  const { G } = mk(); run(G, 2, () => 200); assert.equal(G.level, 0);
});
console.log(`perf: ${n} tests passed`);
