// Loose props: start upright, get shoved, tip over, make noise, never pass through walls.
import assert from 'node:assert/strict';
import { createSim, step } from '../src/sim.js';
import { makeBody, stepBodies, LOOSE } from '../src/physics.js';
import { LOOSE_OBSTACLES } from '../src/level.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok', name); };
const room = () => ({ W: 12, D: 10, obstacles: [], nest: { x: 0, z: -4, r: 0.1 } });

t('every loose obstacle kind has physics data', () => { for (const k of LOOSE_OBSTACLES) assert.ok(LOOSE[k], k); });
t('a level starts with every prop upright and still', () => {
  for (let seed = 1; seed < 30; seed++) {
    const S = createSim({ night: 3, seed });
    for (let i = 0; i < 60; i++) step(S, 1 / 60, { x: 0, y: 0 });
    for (const b of S.bodies) { assert.equal(b.tip, 0); assert.equal(b.fallen, false); }
  }
});
t('walking into a chair shoves it; running into it knocks it over with a topple event', () => {
  const L = room(), ch = makeBody('chair', 0, 0); const ev = [];
  const walker = { x: -1, z: 0, r: 0.32, vx: 1.2, vz: 0, solid: true, who: 'player' };
  for (let i = 0; i < 60; i++) { walker.x += walker.vx / 60; stepBodies(L, [ch], [walker], 1 / 60, (type) => ev.push(type)); }
  assert.ok(ch.x > 0.1, 'moved'); assert.equal(ch.fallen, false, 'a slow walk does not tip it');
  const runner = { x: ch.x - 1, z: 0, r: 0.32, vx: 4.6, vz: 0, solid: true, who: 'player' };
  for (let i = 0; i < 90; i++) { runner.x += runner.vx / 60; stepBodies(L, [ch], [runner], 1 / 60, (type) => ev.push(type)); }
  assert.ok(ch.fallen); assert.ok(ev.includes('topple')); assert.ok(ev.includes('bump'));
});
t('a crate is heavy: it slows the thief and never tips', () => {
  const L = room(), cr = makeBody('crate', 0, 0);
  const p = { x: -1, z: 0, r: 0.32, vx: 4.6, vz: 0, solid: true, who: 'player' };
  for (let i = 0; i < 60; i++) { p.x += p.vx / 60; stepBodies(L, [cr], [p], 1 / 60, () => {}); }
  assert.equal(cr.tip, 0); assert.ok(p.x < -1 + 4.6 - 0.5, 'player slowed');
});
t('a prop pushed into a wall stays inside the room and blocks the thief', () => {
  const L = room(), b = makeBody('barrel', 5, 0);
  const p = { x: 4, z: 0, r: 0.32, vx: 3, vz: 0, solid: true, who: 'player' };
  for (let i = 0; i < 120; i++) { p.x += p.vx / 60; stepBodies(L, [b], [p], 1 / 60, () => {}); }
  assert.ok(b.x <= 6 - b.r + 1e-6); assert.ok(p.x <= b.x - b.r - p.r + 0.05);
});
t('sim: loose obstacles follow their bodies', () => {
  const S = createSim({ night: 5, seed: 7 }); const b = S.bodies[0]; if (!b) return;
  b.vx = 2; for (let i = 0; i < 30; i++) step(S, 1 / 60, { x: 0, y: 0 });
  assert.equal(b.obstacle.x, b.x);
});
console.log(`physics: ${n} tests passed`);
