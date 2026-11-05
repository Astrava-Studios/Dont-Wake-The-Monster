import * as THREE from 'three';
import {
  buildMonster, buildPlayer, buildNest, buildFurniture,
  buildDuck, buildTreasure, buildPowerup, buildDoor, buildWindow
} from '../src/models.js';
import { MONSTERS } from '../src/level.js';

function countTris(obj) {
  let tris = 0;
  let meshes = 0;
  let vertices = 0;
  obj.traverse((o) => {
    if (o.isMesh && o.geometry) {
      meshes++;
      const geo = o.geometry;
      if (geo.index) {
        tris += geo.index.count / 3;
      } else if (geo.attributes.position) {
        tris += geo.attributes.position.count / 3;
      }
      if (geo.attributes.position) {
        vertices += geo.attributes.position.count;
      }
    }
  });
  return { tris: Math.round(tris), meshes, vertices };
}

console.log('=== PROCEDURAL MODELS TRIANGLE AUDIT ===');
const player = buildPlayer();
console.log('Player (Procedural):', countTris(player.group));

for (const m of MONSTERS) {
  const mon = buildMonster(m);
  console.log(`Monster [${m.id}] (${m.name}):`, countTris(mon.group));
}

console.log('Nest:', countTris(buildNest({ rugA: '#fff', rugB: '#eee' })));
console.log('Door:', countTris(buildDoor()));
console.log('Window:', countTris(buildWindow()));
console.log('Duck:', countTris(buildDuck()));

for (const k of ['chest', 'gem', 'vase', 'clock', 'crown', 'ring', 'goblet', 'potion']) {
  console.log(`Treasure [${k}]:`, countTris(buildTreasure(k)));
}

for (const f of ['table', 'wardrobe', 'bookshelf', 'armchair', 'crate', 'barrel', 'plant', 'blocks']) {
  console.log(`Furniture (procedural) [${f}]:`, countTris(buildFurniture(f, 1, 1)));
}

