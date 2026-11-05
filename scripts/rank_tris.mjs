import * as THREE from 'three';
import { generateLevel } from '../src/level.js';
import { createSim } from '../src/sim.js';
import {
  buildMonster, buildPlayer, buildNest, buildFurniture,
  buildDuck, buildTreasure, buildPowerup, buildDoor, buildWindow, toon, M
} from '../src/models.js';

const level = generateLevel(1);
const sim = createSim({ night: 1, seed: level.seed });

const items = [];

function register(name, category, obj) {
  let tris = 0;
  let meshes = 0;
  let verts = 0;
  const geomTypes = {};
  obj.traverse((o) => {
    if (o.isMesh && o.geometry) {
      meshes++;
      let t = 0;
      const g = o.geometry;
      if (g.index) t = g.index.count / 3;
      else if (g.attributes.position) t = g.attributes.position.count / 3;
      tris += t;
      if (g.attributes.position) verts += g.attributes.position.count;
      geomTypes[g.type] = (geomTypes[g.type] || 0) + t;
    }
  });
  items.push({ name, category, tris: Math.round(tris), meshes, verts, geomTypes });
}

const mon = buildMonster(level.monster);
register(`Monster [${level.monster.id}] (Full)`, 'Monster', mon.group);

// Check subparts of monster
register('Monster Body + Belly + Spots', 'Monster Subpart', mon.pivot.children.find(c => c === mon.body) ? mon.body : mon.pivot);
register('Monster Head + Face + Horns', 'Monster Subpart', mon.head);
register('Monster Tail', 'Monster Subpart', mon.tail);

register('Player (Procedural)', 'Player', buildPlayer().group);
register('Nest (Bed + Cushions)', 'Nest', buildNest(level.theme));
register('Door', 'Structure', buildDoor(false));
register('Window', 'Structure', buildWindow());

for (const o of level.obstacles) {
  register(`Obstacle: ${o.kind}`, 'Obstacle', buildFurniture(o.kind, o.baseHw, o.baseHd));
}
for (const t of sim.treasures) {
  register(`Treasure: ${t.kind}`, 'Treasure', buildTreasure(t.kind));
}
for (const d of sim.ducks) {
  register(`Duck`, 'Toy', buildDuck());
}

items.sort((a, b) => b.tris - a.tris);

console.log('=== TOP OBJECTS BY TRIANGLE COUNT ===');
for (const it of items.slice(0, 20)) {
  console.log(`${it.name.padEnd(35)} | Tris: ${String(it.tris).padStart(6)} | Meshes: ${String(it.meshes).padStart(3)} | Verts: ${String(it.verts).padStart(6)}`);
}

// Category summary
const cats = {};
for (const it of items) {
  if (it.category.includes('Subpart')) continue;
  cats[it.category] = cats[it.category] || { tris: 0, meshes: 0 };
  cats[it.category].tris += it.tris;
  cats[it.category].meshes += it.meshes;
}
console.log('\n=== CATEGORY SUMMARY ===');
for (const [c, d] of Object.entries(cats).sort((a, b) => b[1].tris - a[1].tris)) {
  console.log(`${c.padEnd(20)} | Total Tris: ${String(d.tris).padStart(6)} | Meshes: ${String(d.meshes).padStart(4)}`);
}

