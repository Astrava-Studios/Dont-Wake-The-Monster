import { generateLevel } from '../src/level.js';
import { createSim, step } from '../src/sim.js';
import { makeBody, stepBodies } from '../src/physics.js';

const L = generateLevel(1);
const S = createSim({ night: 1, seed: L.seed });

for (let i = 0; i < 30; i++) {
  S.bodies.push(makeBody('chair', i % 5, Math.floor(i / 5)));
}

console.log('Testing 1000 physics steps with 30 bodies...');
const t0 = performance.now();
for (let i = 0; i < 1000; i++) {
  step(S, 1 / 60, { x: 1, z: 0, m: 1 });
}
const elapsed = performance.now() - t0;
console.log(`1000 steps took ${elapsed.toFixed(2)} ms (${(elapsed / 1000).toFixed(4)} ms/step)`);

