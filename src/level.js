// Procedural room generation, navigation grid, A*, collisions, line of sight.
// Pure: no DOM, no three.js — runs in node for tests and the bot.
import { RULES } from './rules.js';
import { monsterText, modText } from './i18n.js';

export const MONSTERS = [
  { id: 'grumbo', color: '#8e6bd8', belly: '#f3d7ff', hearing: 1, snoreLen: 1, peekRate: 1, speed: 1, scale: 1 },
  { id: 'snorzilla', color: '#5cb85c', belly: '#e0f7c8', hearing: 1.1, snoreLen: 1.5, peekRate: 1, speed: 1, scale: 1.08 },
  { id: 'fluffnir', color: '#f28bb8', belly: '#ffe3ef', hearing: 1.3, snoreLen: 0.9, peekRate: 1.3, speed: 0.85, scale: 0.95 },
  { id: 'blazeroo', color: '#f5873a', belly: '#ffe2b8', hearing: 0.8, snoreLen: 1, peekRate: 0.8, speed: 1.2, scale: 1.05 },
  { id: 'glumpa', color: '#3fb3c9', belly: '#d6f6ff', hearing: 0.85, snoreLen: 1, peekRate: 1.7, speed: 1, scale: 1 },
].map((m) => Object.defineProperties(m, { name: { get: () => monsterText(m.id).name, enumerable: true }, trait: { get: () => monsterText(m.id).trait, enumerable: true } }));
// the Old Library's own monster: a long, bespectacled book-dragon. Sharp ears, long naps, slow to chase.
export const BOOKWYRM = Object.defineProperties({ id: 'bookwyrm', color: '#7a9a4a', belly: '#efe2b0', hearing: 1.25, snoreLen: 1.35, peekRate: 0.9, speed: 0.88, scale: 1.05, wyrm: true },
  { name: { get: () => monsterText('bookwyrm').name, enumerable: true }, trait: { get: () => monsterText('bookwyrm').trait, enumerable: true } });
// the Pirate Galleon's monster: Captain Barnaby, a tentacled buccaneer beast with rolling sea legs.
export const BARNABY = Object.defineProperties({ id: 'barnaby', color: '#1f6f8b', belly: '#99e0d0', hearing: 1.15, snoreLen: 1.1, peekRate: 1.2, speed: 1.05, scale: 1.05, pirate: true },
  { name: { get: () => monsterText('barnaby').name, enumerable: true }, trait: { get: () => monsterText('barnaby').trait, enumerable: true } });
// the Alchemist Tower's monster: Professor Oozefang, an arcane glowing slime dragon with sharp hearing.
export const OOZEFANG = Object.defineProperties({ id: 'oozefang', color: '#2ecc71', belly: '#a8ffb2', hearing: 1.35, snoreLen: 0.85, peekRate: 1.4, speed: 0.95, scale: 1.0, alchemist: true },
  { name: { get: () => monsterText('oozefang').name, enumerable: true }, trait: { get: () => monsterText('oozefang').trait, enumerable: true } });
export const ALL_MONSTERS = [...MONSTERS, BOOKWYRM, BARNABY, OOZEFANG];

export const MODIFIERS = [
  { id: 'squeaky', icon: 'plank' },
  { id: 'golden', icon: 'sparkle' },
  { id: 'dark', icon: 'candle' },
  { id: 'toys', icon: 'duck' },
  { id: 'lucky', icon: 'clover' },
  { id: 'restless', icon: 'swirl' },
  { id: 'hoard', icon: 'gem' },
  { id: 'short', icon: 'sunrise' },
].map((m) => Object.defineProperties(m, {
  name: { get: () => modText(m.id).name, enumerable: true },
  desc: { get: () => modText(m.id, { x: m.id === 'golden' ? RULES.mods.golden : RULES.mods.short }).desc, enumerable: true },
}));

export const THEMES = [
  { wall: '#6c5a9c', wall2: '#7867a8', trim: '#f6d27a', rugs: [['#e07a8b', '#f7c46c'], ['#6fc3c9', '#fff4e0']], nest: '#ff9fb2', nest2: '#ffd1dc', bg: '#1d1530' },
  { wall: '#3f7f8c', wall2: '#4a8c99', trim: '#ffd38a', rugs: [['#f6a35d', '#ffe3a1'], ['#c48be0', '#ffd6f0']], nest: '#ffd27a', nest2: '#fff0c4', bg: '#122a30' },
  { wall: '#a35d6e', wall2: '#ae6979', trim: '#ffe08a', rugs: [['#6fc3c9', '#e9f7d0'], ['#7c8cf0', '#fff4e0']], nest: '#9fd8ff', nest2: '#e2f4ff', bg: '#2a1520' },
  { wall: '#4d6b9e', wall2: '#5877aa', trim: '#f9c97c', rugs: [['#c48be0', '#ffd6f0'], ['#ff8f6b', '#ffe3a1']], nest: '#c9b5ff', nest2: '#efe6ff', bg: '#151d33' },
];
export const LIBRARY_THEME = { wall: '#5a3d2b', wall2: '#654533', trim: '#d9b26a', rugs: [['#7a2f3f', '#e0b040'], ['#2f5a4a', '#e8d9a8']], nest: '#b5895a', nest2: '#e8d2a8', bg: '#140d0a', library: true };
export const PIRATE_THEME = { wall: '#3a271d', wall2: '#473023', trim: '#d4af37', rugs: [['#1a3c5a', '#c29b38'], ['#5a1a1a', '#d4af37']], nest: '#4a3020', nest2: '#684530', bg: '#0a101a', pirate: true };
export const ALCHEMIST_THEME = { wall: '#261b36', wall2: '#322346', trim: '#00ffcc', rugs: [['#3b185f', '#a12568'], ['#132c33', '#126e82']], nest: '#221538', nest2: '#382258', bg: '#0c0714', alchemist: true };

export const TREASURE = RULES.items;

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const CS = 0.5; // nav cell size

export function generateLevel(night, seed, house = 'manor') {
  const rng = mulberry(seed);
  const R = (a, b) => a + rng() * (b - a);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  const LV = RULES.level;
  const lib = house === 'library', pir = house === 'pirate', alch = house === 'alchemist';
  const HL = RULES.houses.library, HP = RULES.houses.pirate, HA = RULES.houses.alchemist;
  const houseCfg = lib ? HL : pir ? HP : alch ? HA : null;
  const wExtra = houseCfg ? houseCfg.wExtra || 0 : 0;
  const dExtra = houseCfg ? houseCfg.dExtra || 0 : 0;
  const W = 2 * Math.round(Math.min(LV.roomW.base + night * LV.roomW.perNight, LV.roomW.max) + wExtra);
  const D = 2 * Math.round(Math.min(LV.roomD.base + night * LV.roomD.perNight, LV.roomD.max) + dExtra);
  const monster = lib ? (rng() < HL.wyrmChance || night === 1 ? BOOKWYRM : pick(MONSTERS))
    : pir ? (rng() < HP.pirateChance || night === 1 ? BARNABY : pick(MONSTERS))
    : alch ? (rng() < HA.alchChance || night === 1 ? OOZEFANG : pick(MONSTERS))
    : night === 1 ? MONSTERS[0] : pick(MONSTERS);
  const modCount = night <= 1 ? 0 : night <= 4 ? 1 : 2;
  const mods = shuffle(MODIFIERS).slice(0, modCount);
  const has = (id) => mods.some((m) => m.id === id);
  const theme = lib ? LIBRARY_THEME : pir ? PIRATE_THEME : alch ? ALCHEMIST_THEME : pick(THEMES);

  const nest = { x: Math.round(R(-(W / 2 - 5), W / 2 - 5)), z: -D / 2 + 2.7, r: 2.2 };
  const side = rng() < 0.5 ? -1 : 1;
  const exit = { x: side * (W / 2 - 0.75), z: Math.round(R(0, D / 2 - 2.5)) + 0.5, side };
  const start = { x: exit.x - side * 1.0, z: exit.z };

  const obstacles = [];
  const fits = (o, margin, avoidNest = 3.6) => {
    if (o.x - o.hw < -W / 2 || o.x + o.hw > W / 2 || o.z - o.hd < -D / 2 || o.z + o.hd > D / 2) return false;
    for (const b of obstacles) if (Math.abs(o.x - b.x) < o.hw + b.hw + margin && Math.abs(o.z - b.z) < o.hd + b.hd + margin) return false;
    const nx = Math.max(Math.abs(o.x - nest.x) - o.hw, 0), nz = Math.max(Math.abs(o.z - nest.z) - o.hd, 0);
    if (Math.hypot(nx, nz) < avoidNest - 1.4) return false;
    const ex = Math.max(Math.abs(o.x - start.x) - o.hw, 0), ez = Math.max(Math.abs(o.z - start.z) - o.hd, 0);
    if (Math.hypot(ex, ez) < 1.8) return false;
    return true;
  };
  const add = (kind, x, z, hw, hd, rot, tall, margin = 0.05) => {
    const o = { kind, x, z, hw: rot ? hd : hw, hd: rot ? hw : hd, baseHw: hw, baseHd: hd, rot, tall };
    if (fits(o, margin)) { obstacles.push(o); return true; }
    return false;
  };
  if (lib) libraryShelves();
  else if (pir) pirateGalleonFurniture();
  else if (alch) alchemistLabFurniture();
  else houseFurniture();
  function libraryShelves() {
    // shelves all along the walls, then long rows of shelves with aisles between them
    for (let x = -W / 2 + 1.2; x < W / 2 - 1; x += 2.1) { if (Math.abs(x - nest.x) < 3.4) continue; add('bookshelf', x, -D / 2 + 0.35, 1.0, 0.3, 0, true); }
    for (const s of [-1, 1]) for (let z = -D / 2 + 1.5; z < D / 2 - 1; z += 2.3) add('bookshelf', s * (W / 2 - 0.35), z, 1.0, 0.3, 1, true);
    for (let z = -D / 2 + 5.4; z < D / 2 - 2.2; z += R(2.7, 3.2)) {
      for (let x = -W / 2 + 1.8; x < W / 2 - 2; ) {
        const hw = R(1.1, 2.0); if (x + 2 * hw > W / 2 - 1.8) break;
        add('bookshelf', x + hw, z, hw, 0.3, 0, true); x += 2 * hw + R(1.5, 2.2);
      }
    }
    // a few reading tables and armchairs in the aisles
    const kinds = [['table', 0.8, 0.5, false], ['armchair', 0.6, 0.55, true], ['plant', 0.38, 0.38, false]];
    for (let i = 0, tries = 0; i < 3 + Math.floor(night / 3) && tries < 200; tries++) {
      const [k, hw, hd, tall] = pick(kinds); const x = R(-W / 2 + 2, W / 2 - 2), z = R(-D / 2 + 2.2, D / 2 - 1.2);
      if (add(k, x, z, hw, hd, 0, tall, 1.2)) i++;
    }
  }
  function pirateGalleonFurniture() {
    // pirate ship bulkheads: lined with rum barrels and heavy cargo crates
    for (const s of [-1, 1]) {
      for (let z = -D / 2 + 1.2; z < D / 2 - 1; z += R(1.8, 2.6)) {
        const r = rng();
        if (r < 0.65) add('barrel', s * (W / 2 - 0.55), z, 0.45, 0.45, 0, true);
        else add('crate', s * (W / 2 - 0.6), z, 0.5, 0.5, 0, true);
      }
    }
    for (let x = -W / 2 + 1.2; x < W / 2 - 1; x += R(2.0, 3.2)) {
      if (Math.abs(x - nest.x) < 3.4) continue;
      const r = rng();
      if (r < 0.5) add('crate', x, -D / 2 + 0.55, 0.5, 0.5, 0, true);
      else if (r < 0.8) add('barrel', x, -D / 2 + 0.5, 0.45, 0.45, 0, true);
      else add('wardrobe', x, -D / 2 + 0.42, 0.8, 0.4, 0, true);
    }
    const midCount = Math.min(LV.midBase + 2 + Math.floor(night * LV.midPerNight), LV.midMax + 3);
    const midKinds = [['barrel', 0.45, 0.45, true], ['crate', 0.5, 0.5, true], ['vaseStack', 0.28, 0.28, false], ['table', 0.8, 0.5, false]];
    for (let i = 0, tries = 0; i < midCount && tries < 200; tries++) {
      const [k, hw, hd, tall] = pick(midKinds);
      const x = R(-W / 2 + 2, W / 2 - 2), z = R(-D / 2 + 2.2, D / 2 - 1.2);
      if (add(k, x, z, hw, hd, rng() < 0.5 && k !== 'barrel' ? 1 : 0, tall, 1.1)) i++;
    }
  }
  function alchemistLabFurniture() {
    // arcane bookshelves and specimen cabinets along walls
    for (let x = -W / 2 + 1.2; x < W / 2 - 1; x += R(2.2, 3.4)) {
      if (Math.abs(x - nest.x) < 3.4) continue;
      const r = rng();
      if (r < 0.6) add('bookshelf', x, -D / 2 + 0.35, 1.0, 0.3, 0, true);
      else add('wardrobe', x, -D / 2 + 0.42, 0.8, 0.4, 0, true);
    }
    for (const s of [-1, 1]) {
      for (let z = -D / 2 + 1.5; z < D / 2 - 1; z += R(2.4, 3.8)) {
        const r = rng();
        if (r < 0.5) add('bookshelf', s * (W / 2 - 0.35), z, 1.0, 0.3, 1, true);
        else add('plant', s * (W / 2 - 0.45), z, 0.38, 0.38, 0, false);
      }
    }
    const midCount = Math.min(LV.midBase + 1 + Math.floor(night * LV.midPerNight), LV.midMax + 2);
    const midKinds = [['table', 0.8, 0.5, false], ['blocks', 0.32, 0.32, false], ['vaseStack', 0.28, 0.28, false], ['armchair', 0.6, 0.55, true]];
    for (let i = 0, tries = 0; i < midCount && tries < 200; tries++) {
      const [k, hw, hd, tall] = pick(midKinds);
      const x = R(-W / 2 + 2, W / 2 - 2), z = R(-D / 2 + 2.2, D / 2 - 1.2);
      if (add(k, x, z, hw, hd, rng() < 0.5 ? 1 : 0, tall, 1.15)) i++;
    }
  }
  function houseFurniture() {
  // back wall pieces
  for (let x = -W / 2 + 1.2; x < W / 2 - 1; x += R(2.2, 3.6)) {
    if (Math.abs(x - nest.x) < 3.4) continue;
    const r = rng();
    if (r < 0.45) add('bookshelf', x, -D / 2 + 0.35, 1.0, 0.3, 0, true);
    else if (r < 0.7) add('wardrobe', x, -D / 2 + 0.42, 0.8, 0.4, 0, true);
    else if (r < 0.85) add('plant', x, -D / 2 + 0.5, 0.38, 0.38, 0, false);
  }
  // side walls
  for (const s of [-1, 1]) {
    for (let z = -D / 2 + 1.5; z < D / 2 - 1; z += R(2.5, 4)) {
      const r = rng();
      if (r < 0.35) add('bookshelf', s * (W / 2 - 0.35), z, 1.0, 0.3, 1, true);
      else if (r < 0.55) add('barrel', s * (W / 2 - 0.55), z, 0.45, 0.45, 0, true);
      else if (r < 0.7) add('crate', s * (W / 2 - 0.6), z, 0.5, 0.5, 0, true);
    }
  }
  // middle clutter, keep passages (margin 1.2)
  const midCount = Math.min(LV.midBase + Math.floor(night * LV.midPerNight), LV.midMax);
  const midKinds = [['table', 0.8, 0.5, false], ['crate', 0.5, 0.5, true], ['barrel', 0.45, 0.45, true], ['plant', 0.38, 0.38, false], ['armchair', 0.6, 0.55, true], ['blocks', 0.32, 0.32, false], ['vaseStack', 0.28, 0.28, false]];
  for (let i = 0, tries = 0; i < midCount && tries < 200; tries++) {
    const [k, hw, hd, tall] = pick(midKinds);
    const x = R(-W / 2 + 2, W / 2 - 2), z = R(-D / 2 + 2.2, D / 2 - 1.2);
    if (add(k, x, z, hw, hd, rng() < 0.5 && k !== 'barrel' && k !== 'plant' ? 1 : 0, tall, 1.15)) i++;
  }
  }

  // small furniture is loose: the sim's physics bodies push it around (collide() skips it)
  for (const o of obstacles) if (LOOSE_OBSTACLES.includes(o.kind)) o.loose = true;
  const L = { night, seed, W, D, monster, mods, has, theme, nest, exit, start, obstacles, house };
  // completely dark sections (library & alchemist): never on the start or the monster's bed
  L.darkZones = [];
  if (lib || alch) {
    const HZ = lib ? HL : HA;
    const n = HZ.darkZones[Math.min(HZ.darkZones.length - 1, Math.floor((night - 1) / 3))];
    for (let t = 0; t < 200 && L.darkZones.length < n; t++) {
      const z = { x: R(-W / 2 + 2, W / 2 - 2), z: R(-D / 2 + 3, D / 2 - 1.5), hw: R(1.8, 3.0), hd: R(1.5, 2.4) };
      const dx = (px, pz) => Math.hypot(Math.max(Math.abs(px - z.x) - z.hw, 0), Math.max(Math.abs(pz - z.z) - z.hd, 0));
      if (dx(start.x, start.z) < 2.5 || dx(nest.x, nest.z) < 3.4 || dx(exit.x, exit.z) < 1.5) continue;
      if (L.darkZones.some((o) => Math.abs(o.x - z.x) < o.hw + z.hw && Math.abs(o.z - z.z) < o.hd + z.hd)) continue;
      L.darkZones.push(z);
    }
  }
  L.inDark = (x, z) => L.darkZones.some((d) => Math.abs(x - d.x) < d.hw && Math.abs(z - d.z) < d.hd);
  L.pgrid = makeGrid(L, 0.34, true);
  L.mgrid = makeGrid(L, 0.65, false);
  const reach = flood(L.pgrid, cellOf(L, start.x, start.z));
  const reachable = (x, z) => { const c = cellOf(L, x, z); return c >= 0 && reach[c] === 1; };

  // floor: rugs
  L.rugs = [];
  // rugs never overlap each other (overlapping flat planes z-fight and flicker)
  const half = (r) => (r.round ? [r.r, r.r] : [r.w / 2, r.d / 2]);
  const rugFits = (r) => {
    const [hw, hd] = half(r);
    if (r.x - hw < -W / 2 + 0.3 || r.x + hw > W / 2 - 0.3 || r.z - hd < -D / 2 + 0.3 || r.z + hd > D / 2 - 0.3) return false;
    return L.rugs.every((o) => { const [ow, od] = half(o); return Math.abs(r.x - o.x) > hw + ow + 0.3 || Math.abs(r.z - o.z) > hd + od + 0.3; });
  };
  // a long runner rug leading towards the nest (quiet path, but not all the way) — placed first so it always exists
  L.rugs.push({ round: false, x: nest.x + R(-1, 1), z: nest.z + 4.2, w: 1.4, d: R(2.4, 3.6), a: theme.rugs[0][0], b: theme.rugs[0][1] });
  const rugN = 2 + Math.floor(rng() * 2);
  for (let i = 0, t = 0; i < rugN && t < 60; t++) {
    const [a, b] = pick(theme.rugs);
    const r = rng() < 0.4
      ? { round: true, x: R(-W / 2 + 2.5, W / 2 - 2.5), z: R(-D / 2 + 4, D / 2 - 2), r: R(1.3, 2), a, b }
      : { round: false, x: R(-W / 2 + 3, W / 2 - 3), z: R(-D / 2 + 4, D / 2 - 2.5), w: R(2.5, 4.5), d: R(1.8, 3), a, b };
    if (rugFits(r)) { L.rugs.push(r); i++; }
  }
  L.onRug = (x, z) => L.rugs.some((r) => r.round ? Math.hypot(x - r.x, z - r.z) < r.r : Math.abs(x - r.x) < r.w / 2 && Math.abs(z - r.z) < r.d / 2);

  const free = (x, z, minD, list) => reachable(x, z) && !list.some((p) => Math.hypot(p.x - x, p.z - z) < minD);
  const spot = (minFromStart, list, minD, filter) => {
    for (let t = 0; t < 300; t++) {
      const x = R(-W / 2 + 0.7, W / 2 - 0.7), z = R(-D / 2 + 0.7, D / 2 - 0.7);
      if (Math.hypot(x - start.x, z - start.z) < minFromStart) continue;
      if (filter && !filter(x, z)) continue;
      if (free(x, z, minD, list)) return { x, z };
    }
    return null;
  };

  // squeaky planks
  L.squeak = new Set();
  const sqMult = houseCfg ? houseCfg.squeakMult || 1 : 1;
  const sqN = Math.floor((LV.squeakBase + night * LV.squeakPerNight) * (has('squeaky') ? LV.squeakyMult : 1) * sqMult);
  for (let i = 0, t = 0; i < sqN && t < 400; t++) {
    const tx = Math.floor(R(0, W)), tz = Math.floor(R(0, D));
    const cx = -W / 2 + tx + 0.5, cz = -D / 2 + tz + 0.5;
    if (L.onRug(cx, cz) || Math.hypot(cx - start.x, cz - start.z) < 1.8 || !reachable(cx, cz)) continue;
    const key = tx + ',' + tz; if (L.squeak.has(key)) continue;
    L.squeak.add(key); i++;
  }
  L.isSqueak = (x, z) => L.squeak.has(Math.floor(x + W / 2) + ',' + Math.floor(z + D / 2));

  // treasures
  const items = [];
  // the crown lies in the monster's bed, next to it: it can only be taken once the monster has left the bed (scream)
  { const side = rng() < 0.5 ? -1 : 1; items.push({ kind: 'crown', x: nest.x + side * 1.15, z: nest.z + 1.6, onBed: true }); }
  const chestN = night >= LV.chestFromNight ? (night >= LV.twoChestsFromNight ? 2 : 1) : 0;
  for (let i = 0; i < chestN; i++) { const p = spot(4, items, 2); if (p) items.push({ kind: 'chest', ...p }); }
  const tN = Math.min(LV.itemBase + Math.floor(night * LV.itemPerNight), LV.itemMax) + (has('hoard') ? LV.hoardExtra : 0) + (has('lucky') ? 1 : 0);
  const byTier = (t) => Object.keys(RULES.items).filter((k) => RULES.items[k].tier === t && k !== 'chest' && k !== 'crown');
  for (let i = 0; i < tN; i++) {
    const p = spot(2.6, items, 1.6); if (!p) continue;
    // rarer things sit closer to the monster, and later nights have better loot
    const near = Math.hypot(p.x - nest.x, p.z - nest.z) < 5.5; const r = rng() + Math.min(night, 10) * 0.03 + (near ? 0.25 : 0);
    const tier = r > 1.05 ? 3 : r > 0.6 ? 2 : 1;
    items.push({ kind: pick(byTier(tier)), ...p });
  }
  // every dark section hides one more thing
  for (const dz of L.darkZones) { const p = spot(2.6, items, 1.4, (x, z) => Math.abs(x - dz.x) < dz.hw - 0.4 && Math.abs(z - dz.z) < dz.hd - 0.4); if (p) items.push({ kind: pick(byTier(rng() < 0.5 ? 3 : 2)), ...p }); }
  // one cursed item some nights: very valuable, a burden to carry
  if (night >= LV.cursedFromNight && rng() < LV.cursedChance) { const p = spot(3, items, 1.6); if (p) items.push({ kind: pick(['ticker', 'orb', 'statue']), ...p }); }
  // hidden real value of every item; later nights carry better loot
  const grow = 1 + LV.valuePerNight * (night - 1);
  const darkValMult = houseCfg ? houseCfg.darkValue || 1 : 1;
  for (const it of items) { const [lo, hi] = RULES.items[it.kind].value; it.value = Math.round((lo + (hi - lo) * Math.pow(rng(), 1.3)) * grow * (L.inDark(it.x, it.z) ? darkValMult : 1)); }
  L.items = items;
  // toys
  const duckN = (night >= 2 ? 1 + Math.floor(night / 3) : 0) + (has('toys') ? LV.toysExtra : 0);
  L.ducks = [];
  for (let i = 0; i < duckN; i++) { const p = spot(2.5, items.concat(L.ducks), 1.0); if (p) L.ducks.push(p); }
  // sleeping cat hazard: night 2+, 1 cat (or 2 on later nights)
  const catN = night >= 2 ? (night >= 6 ? 2 : 1) : 0;
  L.cats = [];
  for (let i = 0; i < catN; i++) {
    const p = spot(3.2, items.concat(L.ducks, L.cats), 1.6);
    if (p) L.cats.push({ ...p, yaw: rng() * Math.PI * 2 });
  }
  // powerups
  const pN = 1 + (night >= 3 ? 1 : 0) + (has('lucky') ? 2 : 0);
  L.powerups = [];
  // power-ups are no longer found on the floor: feathers, lullabies and more are bought from the merchant
  void pN;

  const N = RULES.night, CH = RULES.chase, MD = RULES.mods;
  const dawnExtra = houseCfg ? houseCfg.dawnExtra || 0 : 0;
  const houseValMult = houseCfg ? houseCfg.valueMult || 1 : 1;
  L.dawnTime = Math.round((N.dawnBase + night * N.dawnPerNight) * (has('short') ? MD.shortDawn : 1)) + dawnExtra;
  L.valueMult = (has('golden') ? MD.golden : 1) * (has('short') ? MD.short : 1) * houseValMult;
  L.sway = pir;
  L.magicGlow = alch;
  L.wakeMult = 1 + Math.min(night - 1, N.wakeNightCap) * N.wakePerNight;
  L.decayMult = has('restless') ? RULES.calm.restlessMult : 1;
  L.chaseSpeed = (CH.speedBase + Math.min(night, CH.nightCap) * CH.speedPerNight) * monster.speed;
  L.chaseTime = CH.timeBase + Math.min(night, CH.nightCap) * CH.timePerNight;
  L.rng = rng;
  return L;
}

// ---------- grid ----------
export function cellOf(L, x, z) {
  const cols = L.W / CS, rows = L.D / CS;
  const i = Math.floor((x + L.W / 2) / CS), j = Math.floor((z + L.D / 2) / CS);
  if (i < 0 || j < 0 || i >= cols || j >= rows) return -1;
  return j * cols + i;
}
export function cellCenter(L, c) {
  const cols = L.W / CS; const i = c % cols, j = Math.floor(c / cols);
  return { x: -L.W / 2 + (i + 0.5) * CS, z: -L.D / 2 + (j + 0.5) * CS };
}
function makeGrid(L, inf, blockNest) {
  const cols = L.W / CS, rows = L.D / CS; const g = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = -L.W / 2 + (i + 0.5) * CS, z = -L.D / 2 + (j + 0.5) * CS;
    let b = Math.abs(x) > L.W / 2 - inf || z < -L.D / 2 + inf || z > L.D / 2 - inf;
    if (!b) for (const o of L.obstacles) if (Math.abs(x - o.x) < o.hw + inf && Math.abs(z - o.z) < o.hd + inf) { b = true; break; }
    if (!b && blockNest && Math.hypot(x - L.nest.x, z - L.nest.z) < L.nest.r + inf) b = true;
    g[j * cols + i] = b ? 1 : 0;
  }
  return { g, cols, rows };
}
function flood(grid, s) {
  const { g, cols, rows } = grid; const seen = new Uint8Array(g.length); if (s < 0) return seen;
  const q = [s]; seen[s] = 1;
  while (q.length) {
    const c = q.pop(); const i = c % cols, j = (c / cols) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const n = nj * cols + ni; if (!seen[n] && !g[n]) { seen[n] = 1; q.push(n); }
    }
  }
  return seen;
}

// A* on 8-connected grid (no corner cutting). Returns list of cell indices.
export function astar(grid, s, goal) {
  const { g, cols, rows } = grid; const n = g.length;
  if (s < 0 || goal < 0) return null;
  if (g[goal]) { // nearest free cell to goal
    const gi = goal % cols, gj = (goal / cols) | 0; let best = -1, bd = 1e9;
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
      const i = gi + di, j = gj + dj; if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
      const c = j * cols + i; if (!g[c] && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = c; }
    }
    if (best < 0) return null; goal = best;
  }
  const gs = new Float32Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const heap = []; const gx = goal % cols, gz = (goal / cols) | 0;
  const h = (c) => { const dx = Math.abs(c % cols - gx), dz = Math.abs(((c / cols) | 0) - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const push = (c, f) => { heap.push([f, c]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  gs[s] = 0; push(s, h(s)); let iter = 0;
  while (heap.length && iter++ < 6000) {
    const [, c] = pop(); if (closed[c]) continue; closed[c] = 1;
    if (c === goal) { const path = [c]; let k = c; while (came[k] >= 0) { k = came[k]; path.push(k); } return path.reverse(); }
    const i = c % cols, j = (c / cols) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const nc = nj * cols + ni; if (g[nc] || closed[nc]) continue;
      if (di && dj && (g[j * cols + ni] || g[nj * cols + i])) continue;
      const ng = gs[c] + (di && dj ? 1.414 : 1);
      if (ng < gs[nc]) { gs[nc] = ng; came[nc] = c; push(nc, ng + h(nc)); }
    }
  }
  return null;
}

export const LOOSE_OBSTACLES = ['crate', 'barrel', 'plant', 'blocks', 'armchair', 'vaseStack'];
// push a circle out of obstacles / walls (loose props are handled by physics.js)
export function collide(L, pos, r, withNest) {
  for (let pass = 0; pass < 2; pass++) {
    for (const o of L.obstacles) {
      if (o.loose) continue;
      const cx = Math.max(o.x - o.hw, Math.min(pos.x, o.x + o.hw)), cz = Math.max(o.z - o.hd, Math.min(pos.z, o.z + o.hd));
      const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x += dx / d * (r - d); pos.z += dz / d * (r - d); }
      else {
        const px = o.hw - Math.abs(pos.x - o.x) + r, pz = o.hd - Math.abs(pos.z - o.z) + r;
        if (px < pz) pos.x += Math.sign(pos.x - o.x || 1) * px; else pos.z += Math.sign(pos.z - o.z || 1) * pz;
      }
    }
    if (withNest) {
      const dx = pos.x - L.nest.x, dz = pos.z - L.nest.z, d = Math.hypot(dx, dz), m = L.nest.r + r;
      if (d < m && d > 1e-6) { pos.x = L.nest.x + dx / d * m; pos.z = L.nest.z + dz / d * m; }
    }
    pos.x = Math.max(-L.W / 2 + r, Math.min(L.W / 2 - r, pos.x));
    pos.z = Math.max(-L.D / 2 + r, Math.min(L.D / 2 - r, pos.z));
  }
}

// is segment a->b blocked by any tall obstacle?
export function blockedLOS(L, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  for (const o of L.obstacles) {
    if (!o.tall) continue;
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, d, mn, mx] of [[ax, dx, o.x - o.hw, o.x + o.hw], [az, dz, o.z - o.hd, o.z + o.hd]]) {
      if (Math.abs(d) < 1e-9) { if (p < mn || p > mx) { ok = false; break; } }
      else { let a = (mn - p) / d, b = (mx - p) / d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { ok = false; break; } }
    }
    if (ok) return true;
  }
  return false;
}
