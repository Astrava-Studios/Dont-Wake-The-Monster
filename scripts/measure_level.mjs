import * as THREE from 'three';
import { generateLevel } from '../src/level.js';
import { createSim } from '../src/sim.js';
import {
  buildMonster, buildPlayer, buildNest, buildFurniture,
  buildDuck, buildTreasure, buildPowerup, buildDoor, buildWindow, toon, M
} from '../src/models.js';

// Simulate buildWorld
const level = generateLevel(1);
const sim = createSim({ night: 1, seed: level.seed });

const world = new THREE.Group();
const scene = new THREE.Scene();
scene.add(world);

// Add player
const player = buildPlayer();
scene.add(player.group);

// Add nest & monster
const nest = buildNest(level.theme);
world.add(nest);
const monster = buildMonster(level.monster);
world.add(monster.group);

// Add door & window
world.add(buildDoor(false));
world.add(buildWindow());

// Add obstacles
for (const o of level.obstacles) {
  const g = buildFurniture(o.kind, o.baseHw, o.baseHd);
  world.add(g);
}

// Add treasures
for (const t of sim.treasures) {
  world.add(buildTreasure(t.kind));
}
for (const d of sim.ducks) {
  world.add(buildDuck());
}

let totalTris = 0;
let totalMeshes = 0;
let totalVertices = 0;
const breakdown = {};

scene.traverse((o) => {
  if (o.isMesh && o.geometry) {
    totalMeshes++;
    let tris = 0;
    const geo = o.geometry;
    if (geo.index) tris = geo.index.count / 3;
    else if (geo.attributes.position) tris = geo.attributes.position.count / 3;
    totalTris += tris;
    if (geo.attributes.position) totalVertices += geo.attributes.position.count;

    const name = o.geometry.type || 'Mesh';
    breakdown[name] = (breakdown[name] || 0) + tris;
  }
});

console.log('=== FULL LEVEL 1 SCENE AUDIT ===');
console.log('Total Triangles:', Math.round(totalTris));
console.log('Total Meshes (Draw Calls):', totalMeshes);
console.log('Total Vertices:', totalVertices);
console.log('Geometry Type Breakdown (Triangles):', breakdown);

