// Scream tutorial: the steps follow the player, and the hiding spot it points at really hides you.
import assert from 'node:assert/strict';
import { createSim, step, scream } from '../src/sim.js';
import { createTutorial, tutorialStep, STEPS } from '../src/tutorial.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok', name); };
const tick = (S, T, sec, inp = { x: 0, y: 0 }) => { for (let i = 0; i < sec * 30 && !S.done; i++) { step(S, 1 / 30, inp); tutorialStep(T, S); } };

// play the lesson the way it tells you to (teleporting between its targets), on many rooms
function lesson(night, seed) {
  const S = createSim({ night, seed }); S.searchMult = 1.6; const T = createTutorial(); const L = S.L; // seed 3: the player ends up against furniture
  tutorialStep(T, S); assert.equal(T.step, 'crown'); assert.ok(T.target);
  S.player.x = L.nest.x + 2.5; S.player.z = L.nest.z + 2.6; tick(S, T, 0.1); assert.equal(T.step, 'away');
  assert.ok(T.spot, 'a scream spot'); S.player.x = T.spot.x; S.player.z = T.spot.z; tick(S, T, 0.1); assert.equal(T.step, 'scream');
  scream(S); tick(S, T, 0.05); assert.equal(T.step, 'hide');
  if (!T.hide) return 'nohide';
  S.player.x = T.hide.x; S.player.z = T.hide.z; tick(S, T, 0.1);
  for (let i = 0; i < 30 * 15 && T.step === 'hide' && !T.result; i++) { step(S, 1 / 30, { x: 0, y: 0 }); tutorialStep(T, S); }
  if (T.result) return T.result + ':' + T.hide.kind;
  assert.equal(T.step, 'grab');
  const c = S.treasures.find((x) => x.onBed); S.player.x = c.x; S.player.z = c.z + 0.2;
  for (let i = 0; i < 30 * 6 && c.alive && !T.result; i++) { step(S, 1 / 30, { x: 0, y: 0, take: true }); tutorialStep(T, S); }
  if (T.result) return T.result + ':grab';
  assert.equal(T.step, 'exit');
  return 'ok';
}
t('steps run crown -> away -> scream -> hide -> grab -> exit', () => { assert.deepEqual(STEPS, ['crown', 'away', 'scream', 'hide', 'grab', 'exit']); });
t('the lesson works in most rooms (hiding spot really hides you)', () => {
  const out = {}; let ok = 0, all = 0;
  for (const night of [1, 2, 3]) for (let s = 1; s <= 15; s++) { const r = lesson(night, s === 1 ? 3 : s * 101 + night); out[r] = (out[r] || 0) + 1; all++; if (r === 'ok') ok++; }
  console.log('    ', JSON.stringify(out));
  assert.ok(ok / all >= 0.85, `only ${ok}/${all} lessons worked`);
});
t('screaming early skips straight to hiding', () => {
  const S = createSim({ night: 1, seed: 7 }); const T = createTutorial(); tutorialStep(T, S); scream(S); tick(S, T, 0.05); assert.equal(T.step, 'hide');
});
console.log(`tutorial: ${n} tests passed`);
