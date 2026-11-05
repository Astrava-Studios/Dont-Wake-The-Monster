import * as THREE from 'three';
import { generateLevel } from '../src/level.js';
import { createSim } from '../src/sim.js';
import {
  buildMonster, buildPlayer, buildNest, buildFurniture,
  buildDuck, buildTreasure, buildPowerup, buildDoor, buildWindow, toon, M
} from '../src/models.js';

function analyzeObject(name, obj) {
  let tris = 0;
  let meshes = 0;
  let geoms = {};
  obj.traverse((o) => {
    if (o.isMesh && o.geometry) {
      meshes++;
      let t = 0;
      const g = o.geometry;
      if (g.index) t = g.index.count / 3;
      else if (g.attributes.position) t = g.attributes.position.count / 3;
      tris += t;
      geoms[g.type] = (geoms[g.type] || 0) + t;
    }
  });
  return { name, tris: Math.round(tris), meshes, geoms };
}

console.log(analyzeObject('Monster (All parts)', buildMonster({ color: '#55a', belly: '#aef', scale: 1 }).group));
console.log(analyzeObject('Nest (Bed & Pillows)', buildNest({ nest: '#55a', nest2: '#aef' })));
console.log(analyzeObject('Player (Procedural)', buildPlayer().group));
console.log(analyzeObject('Table', buildFurniture('table', 1, 1)));
console.log(analyzeObject('Bookshelf', buildFurniture('bookshelf', 1, 1)));
console.log(analyzeObject('Armchair', buildFurniture('armchair', 1, 1)));
console.log(analyzeObject('Window', buildWindow()));
console.log(analyzeObject('Door', buildDoor()));
