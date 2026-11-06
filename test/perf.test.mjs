// Frame-rate governor (src/perf.js). Within a night only the free 30 fps cap moves; the look (shadows, simple
// materials: a shader recompile, i.e. a freeze) only changes between nights. The resolution is never touched.
import assert from 'node:assert/strict';
import { createGovernor, looks, CAP30 } from '../src/perf.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok', name); };
// play `secs` seconds; ms(look) = how long the phone needs for a frame with that look (the cap holds frames back)
const play = (G, secs, ms, refresh = 16.7) => {
  G.reset();
  for (let t = 0; t < secs;) { const f = Math.max(ms(G.look), G.cap ? CAP30 : 0) / 1000; G.sample(f, refresh); t += f; }
};
const mk = (o = {}) => { const log = []; const G = createGovernor({ looks: looks(true, 'med'), ...o, apply: (s, why) => log.push([s, why, G.look]) }); return { G, log }; };
const nights = (G, k, ms, secs = 40) => { for (let i = 0; i < k; i++) { G.nextNight(); play(G, secs, ms); } };

ok('looks: Auto on Medium = full, no shadows, simple materials; Low and manual choices keep their look', () => {
  assert.deepEqual(looks(true, 'med').map((x) => [x.shadows, x.lite]), [[true, false], [false, false], [false, true]]);
  assert.equal(looks(true, 'low').length, 1); assert.equal(looks(false, 'high').length, 1);
});
ok('a phone that runs at 60 stays on full quality, uncapped', () => {
  const { G, log } = mk(); nights(G, 3, () => 16.7); assert.equal(G.look, 0); assert.equal(G.cap, false); assert.equal(log.length, 0);
});
ok('slow frames cap to a steady 30 within the night, without touching the look', () => {
  const { G, log } = mk(); play(G, 20, () => 30);
  assert.equal(G.cap, true); assert.equal(G.look, 0); assert.ok(log.every(([s]) => s.shadows && !s.lite));
});
ok('the look steps down only between nights, until a night runs at 60', () => {
  const { G } = mk(); const ms = (l) => [30, 24, 16.7][l];
  play(G, 30, ms); assert.equal(G.look, 0);
  nights(G, 1, ms); assert.equal(G.look, 1);
  nights(G, 1, ms); assert.equal(G.look, 2);
  nights(G, 2, ms); assert.equal(G.look, 2); assert.equal(G.cap, false);
});
ok('too slow even with the simplest look: stays capped at 30', () => {
  const { G } = mk(); nights(G, 5, (l) => [50, 40, 28][l]); assert.equal(G.look, 2); assert.equal(G.cap, true); assert.equal(G.step().cap, CAP30);
});
ok('a simpler look that buys nothing (browser capped at 30 anyway) is undone and not retried', () => {
  const { G, log } = mk(); nights(G, 5, () => 33.4);
  assert.equal(G.look, 0); assert.ok(log.some(([, why]) => why === 'no gain'));
});
ok('nights with plenty of headroom try a nicer look again, and wait longer after a failed try', () => {
  const { G } = mk({ look: 2 }); nights(G, 3, () => 16.7); assert.ok(G.look < 2);
  const b = mk({ look: 2 }).G; nights(b, 12, (l) => (l === 2 ? 16.7 : 30)); assert.ok(b.lookFails >= 1); assert.equal(b.look >= 1, true);
});
ok('capped with headroom: tries 60 again inside the night', () => {
  const { G } = mk({ cap: true }); play(G, 20, () => 12); assert.equal(G.cap, false);
});
console.log(`perf: ${n} tests passed`);
