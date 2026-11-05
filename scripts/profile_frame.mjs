import * as THREE from 'three';
import { generateLevel } from '../src/level.js';
import { createSim, step } from '../src/sim.js';
import {
  buildMonster, buildPlayer, buildNest, buildFurniture,
  buildDuck, buildTreasure, buildPowerup, buildDoor, buildWindow, toon, M
} from '../src/models.js';

const L = generateLevel(1);
const S = createSim({ night: 1, seed: L.seed });

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

const world = new THREE.Group(); scene.add(world);
const player = buildPlayer(); scene.add(player.group);
const nest = buildNest(L.theme); world.add(nest);
const MO = buildMonster(L.monster); world.add(MO.group);

for (const o of L.obstacles) {
  world.add(buildFurniture(o.kind, o.baseHw, o.baseHd));
}
for (const t of S.treasures) {
  world.add(buildTreasure(t.kind));
}
for (const d of S.ducks) {
  world.add(buildDuck());
}

// Benchmark animateMonster
const N = 10000;
let t0 = performance.now();
for (let i = 0; i < N; i++) {
  const time = i * 0.016;
  const br = Math.sin(time * 1.3);
  MO.pivot.scale.set(1 + br * 0.015, 1 + br * 0.035, 1);
  MO.head.rotation.set(0.05 + br * 0.03, 0, Math.sin(time * 0.5) * 0.05);
}
let t1 = performance.now();
console.log(`animateMonster x${N}: ${(t1 - t0).toFixed(2)}ms (${((t1 - t0)/N).toFixed(4)}ms/call)`);

// Benchmark scene matrixWorld update
t0 = performance.now();
for (let i = 0; i < 1000; i++) {
  scene.updateMatrixWorld(true);
}
t1 = performance.now();
console.log(`scene.updateMatrixWorld x1000: ${(t1 - t0).toFixed(2)}ms (${((t1 - t0)/1000).toFixed(4)}ms/call)`);
