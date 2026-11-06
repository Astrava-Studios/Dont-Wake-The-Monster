// KayKit (CC0) glTF models: preload, clone, fit to the game's footprints.
// Every builder returns null when its model failed to load, so callers can
// fall back to the procedural models in models.js.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = import.meta.env.BASE_URL + 'models/';
const FILES = {
  barrel: 'dungeon/barrel_large.gltf', crates: 'dungeon/crates_stacked.gltf',
  chest: 'dungeon/chest_gold.gltf',
  candle: 'dungeon/candle_lit.gltf',
  cabinet: 'furniture/cabinet_medium_decorated.gltf', table: 'furniture/table_medium.gltf', armchair: 'furniture/armchair_pillows.gltf',
  cactus: 'furniture/cactus_medium_A.gltf', lamp: 'furniture/lamp_standing.gltf', frame: 'furniture/pictureframe_large_A.gltf',
  pillowA: 'furniture/pillow_A.gltf', pillowB: 'furniture/pillow_B.gltf', books: 'furniture/book_set.gltf', book: 'furniture/book_single.gltf',
  wallShelf: 'furniture/shelf_A_small.gltf', frameS1: 'furniture/pictureframe_small_A.gltf', frameS2: 'furniture/pictureframe_small_B.gltf',
  chair: 'furniture/chair_A.gltf', candleMelted: 'dungeon/candle_melted.gltf', bottleA: 'dungeon/bottle_A_brown.gltf', bottleB: 'dungeon/bottle_B_green.gltf',
  hornbeast: 'monster/hornbeast.glb', // Meshy AI model (see src/hornbeast.js)
  rogue: 'chars/Rogue_Hooded.glb', animMove: 'chars/Rig_Medium_MovementBasic.glb', animGen: 'chars/Rig_Medium_General.glb',
};
const lib = {};
const NO_SHADOW = new Set(['frame', 'frameS1', 'frameS2', 'wallShelf', 'pillowA', 'pillowB', 'bottleA', 'bottleB', 'candleMelted', 'candle', 'book', 'books']);

export async function loadAssets(onProgress, { skip = false } = {}) {
  if (skip) { onProgress && onProgress(1); return lib; } // ?noassets: prove the game runs on procedural shapes alone
  const loader = new GLTFLoader(); const keys = Object.keys(FILES); let done = 0;
  await Promise.all(keys.map(async (k) => {
    try {
      const g = await loader.loadAsync(BASE + FILES[k]);
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = !NO_SHADOW.has(k); o.receiveShadow = true; } });
      lib[k] = g;
    } catch (e) { console.warn('[assets] failed to load', k, e); }
    onProgress && onProgress(++done / keys.length);
  }));
  return lib;
}
export const has = (k) => !!lib[k];
// the Hornbeast's mesh (shared geometry + material), or null when it did not load
export function hornbeastMesh() { return lib.hornbeast ? lib.hornbeast.scene.getObjectByProperty('isMesh', true) : null; }

const box = new THREE.Box3(), v = new THREE.Vector3(), c = new THREE.Vector3();
// Wrap a clone in a group, scale it to w x h x d (0 = keep proportional), sit it on y=0, centred on x/z.
function fit(k, w, h, d, uniform = false) {
  if (!lib[k]) return null;
  const m = skClone(lib[k].scene); const wrap = new THREE.Group(); wrap.add(m); // SkeletonUtils: rigged clones get their own skeleton
  box.setFromObject(m); box.getSize(v);
  let sx = w ? w / v.x : 0, sy = h ? h / v.y : 0, sz = d ? d / v.z : 0;
  if (uniform) { const s = Math.min(...[sx, sy, sz].filter(Boolean)); sx = sy = sz = s; }
  else { const any = sx || sy || sz || 1; sx ||= any; sy ||= any; sz ||= any; } // all zero = natural size
  m.scale.set(sx, sy, sz);
  box.setFromObject(m); box.getCenter(c);
  m.position.set(-c.x, -box.min.y, -c.z);
  return wrap;
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Footprint is hw x hd (half sizes) in local, unrotated axes; front faces +z.
export function furniture(kind, hw, hd) {
  const w = hw * 2, d = hd * 2;
  switch (kind) {
    // bookshelf: KayKit only has wall-mounted shelves, so the procedural tall bookcase stays
    case 'wardrobe': return fit('cabinet', w, 1.7, d);
    case 'table': {
      const g = fit('table', w, 0.85, d); if (!g) return null;
      const cd = fit('candle', 0, 0.45, 0, true); if (cd) { cd.position.set(w * 0.2, 0.85, 0); g.add(cd); }
      return g;
    }
    case 'crate': return fit('crates', w * 1.05, 0, d * 1.05, true);
    case 'barrel': return fit('barrel', w * 1.05, 0, d * 1.05, true);
    case 'plant': return fit('cactus', w * 1.15, 0, d * 1.15, true);
    case 'armchair': return fit('armchair', w, 0, d, true);
  }
  return null; // blocks: keep the procedural toy blocks
}


export function decor(kind) {
  switch (kind) {
    case 'lamp': return fit('lamp', 0, 2.3, 0, true);
    case 'frame': return fit('frame', 0, 1.1, 0, true);
    case 'frameS': return fit(pick(['frameS1', 'frameS2']), 0, 0.6, 0, true);
    case 'wallShelf': { // wall shelf with a few books standing on it
      const g = fit('wallShelf', 1.2, 0, 0, true); if (!g) return null;
      const b = fit('books', 0.7, 0, 0, true); if (b) { b.position.set(-0.15, 0.22, 0); g.add(b); }
      return g;
    }
  }
  return null;
}

// small non-blocking floor clutter so the room never looks empty; rng = deterministic per level
// (books/bottles are loot now, so they are not used as clutter)
export const CLUTTER = ['pillowA', 'pillowB', 'candleMelted', 'chair', 'pillowA', 'candleMelted'];
export function clutter(k) {
  const size = { pillowA: 0.6, pillowB: 0.6, books: 0.55, book: 0.3, candleMelted: 0.3, bottleA: 0.45, bottleB: 0.45, chair: 0.75 }[k];
  const g = k === 'chair' ? fit(k, 0, 1.0, 0, true) : fit(k, size, 0, 0, true);
  return g;
}

// ?gallery: every model the game uses
export function galleryList() { return Object.keys(FILES).map((k) => ({ key: k, file: FILES[k], ok: !!lib[k] })); }
// natural scale (so relative sizes can be checked), only shrinking very large models to fit a cell
export function galleryModel(k) {
  if (k.startsWith('anim') || !lib[k]) return null;
  const g = fit(k, 0, 0, 0); box.setFromObject(g); box.getSize(v); const big = Math.max(v.x, v.z);
  if (big > 1.5) g.scale.setScalar(1.5 / big);
  return g;
}

// stealable items with a KayKit model; vase, watch, gem + crown are procedural (models.js)
export function treasure(kind) {
  if (kind === 'book') return fit('books', 0.6, 0, 0, true);
  if (kind === 'candle') return fit('candle', 0, 0.62, 0, true);
  if (kind === 'bottle') return fit(Math.random() < 0.5 ? 'bottleA' : 'bottleB', 0, 0.55, 0, true);
  if (kind === 'painting') { const g = fit(Math.random() < 0.5 ? 'frameS1' : 'frameS2', 0, 0.7, 0, true); if (g) g.rotation.x = -0.25; return g; }
  if (kind === 'chest') {
    const g = fit('chest', 0.95, 0, 0.95, true); if (!g) return null;
    g.traverse((o) => { if (/lid/i.test(o.name)) g.userData.lid = o; });
    return g;
  }
  return null;
}

// Hooded rogue with the medium rig's movement + general clips.
export function rogue() {
  if (!lib.rogue) return null;
  const model = lib.rogue.scene; // single player instance: use it directly
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  box.setFromObject(model); box.getSize(v);
  const s = 1.25 / v.y; model.scale.setScalar(s); body.add(model);
  const mixer = new THREE.AnimationMixer(model); const actions = {};
  for (const k of ['animMove', 'animGen']) for (const clip of lib[k]?.animations || []) actions[clip.name] = mixer.clipAction(clip);
  for (const n of ['Death_A', 'Interact']) if (actions[n]) { actions[n].setLoop(THREE.LoopOnce, 1); actions[n].clampWhenFinished = true; }
  return { group: g, body, model, mixer, actions };
}
