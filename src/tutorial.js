// Scream tutorial: a guided lesson in six steps (see the card + marker in main.js).
// Pure logic, no DOM: runs in node tests. tutorialStep() moves T along and tells the view where to point.
import { RULES } from './rules.js';
import { astar, cellOf, blockedLOS } from './level.js';
import { bedEmpty } from './sim.js';

export const STEPS = ['crown', 'away', 'scream', 'hide', 'grab', 'exit'];
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const AWAY = 9; // metres from the crown before screaming: it searches out of sight range of the bed (see RULES.scream.see)

export function createTutorial() {
  return { i: 0, step: STEPS[0], target: null, spot: null, hide: null, result: null, changed: true };
}
const crownOf = (S) => S.treasures.find((t) => t.onBed);
// measured from the level's start (always walkable; the player may be squeezed against furniture), cached per cell
const reachable = (S, x, z) => {
  const L = S.L, c = cellOf(L, x, z); L.tutReach ||= new Map();
  if (!L.tutReach.has(c)) L.tutReach.set(c, !!astar(L.pgrid, cellOf(L, L.start.x, L.start.z), c));
  return L.tutReach.get(c);
};

// a reachable point at least AWAY from the crown, as close to the player as possible (small room: the farthest one)
export function screamSpot(S) {
  const L = S.L, p = S.player, c = crownOf(S);
  let best = null, bd = 1e9, far = null, fd = 0;
  for (let x = -L.W / 2 + 1; x <= L.W / 2 - 1; x += 0.8) for (let z = -L.D / 2 + 1; z <= L.D / 2 - 1; z += 0.8) {
    const dc = dist(x, z, c.x, c.z), d = dist(x, z, p.x, p.z);
    if (dc < AWAY) { if (dc > fd && reachable(S, x, z)) { fd = dc; far = { x, z }; } continue; }
    if (d >= bd || !reachable(S, x, z)) continue;
    bd = d; best = { x, z };
  }
  return best || far;
}
const farEnough = (S, x, z) => dist(x, z, crownOf(S).x, crownOf(S).z) >= AWAY;

// where to hide from someone standing at (fx, fz): a wardrobe, a dark section, or the far side of tall furniture
export function hideSpot(S, fx, fz) {
  const L = S.L, p = S.player, cands = [];
  for (const o of L.obstacles) {
    if (o.kind === 'wardrobe') { cands.push({ x: o.x, z: o.z, kind: 'wardrobe', w: 0 }); continue; } // stand still next to it to slip in
    if (!o.tall || o.loose) continue;
    // points around it, just outside its edges; the ones it blocks from the searcher's view hide you
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, sx = Math.sign(Math.round(Math.sin(a) * 10)), sz = Math.sign(Math.round(Math.cos(a) * 10));
      cands.push({ x: o.x + sx * (o.hw + 0.45), z: o.z + sz * (o.hd + 0.45), kind: 'furniture', w: 2 });
    }
  }
  for (const dz of L.darkZones || []) cands.push({ x: dz.x, z: dz.z, kind: 'dark', w: 1 });
  let best = null, bd = 1e9;
  for (const c of cands) {
    if (c.kind !== 'wardrobe' && (Math.abs(c.x) > L.W / 2 - 0.4 || Math.abs(c.z) > L.D / 2 - 0.4)) continue;
    if (c.kind === 'furniture' && !blockedLOS(L, fx, fz, c.x, c.z)) continue;
    if (dist(c.x, c.z, fx, fz) < RULES.chase.catchRadius + 1) continue;
    const d = dist(c.x, c.z, p.x, p.z) + c.w; if (d >= bd || (c.kind !== 'wardrobe' && !reachable(S, c.x, c.z))) continue;
    bd = d; best = c;
  }
  if (best) return best;
  // nothing to hide behind: just get out of its sight range and keep still
  const far = RULES.scream.see + 1.5;
  for (let x = -L.W / 2 + 1; x <= L.W / 2 - 1; x += 0.8) for (let z = -L.D / 2 + 1; z <= L.D / 2 - 1; z += 0.8) {
    if (dist(x, z, fx, fz) < far) continue;
    const d = dist(x, z, p.x, p.z); if (d >= bd || !reachable(S, x, z)) continue;
    bd = d; best = { x, z, kind: 'away' };
  }
  return best;
}

function go(T, i) { T.i = i; T.step = STEPS[i]; T.changed = true; }

// advance the lesson from the sim state; T.result: 'done' | 'spotted' | 'late' once it is over
export function tutorialStep(T, S) {
  T.changed = false;
  if (T.result) return T;
  const L = S.L, p = S.player, c = crownOf(S);
  if (!c) { T.result = 'done'; T.changed = true; return T; }
  // screamed earlier than asked: skip ahead to hiding
  if (S.screamed && T.i < 3) { go(T, 3); T.hide = null; }
  if (T.step === 'crown') {
    T.target = { x: c.x, z: c.z };
    if (dist(p.x, p.z, L.nest.x, L.nest.z) < L.nest.r + 1.8) go(T, 1);
  } else if (T.step === 'away') {
    if (!T.spot) T.spot = screamSpot(S);
    T.target = T.spot;
    if (farEnough(S, p.x, p.z) || (T.spot && dist(p.x, p.z, T.spot.x, T.spot.z) < 0.9)) go(T, 2);
  } else if (T.step === 'scream') {
    T.target = null;
  } else if (T.step === 'hide') {
    const mo = S.monster, from = mo.lure || p;
    if (!T.hide) T.hide = hideSpot(S, from.x, from.z);
    T.target = T.hide;
    if (mo.state === 'search') go(T, 4);
  } else if (T.step === 'grab') {
    T.target = c.alive ? { x: c.x, z: c.z } : null;
    if (!c.alive) go(T, 5);
  } else if (T.step === 'exit') {
    T.target = { x: L.exit.x, z: L.exit.z };
    if (S.state === 'escaped') { T.result = 'done'; T.changed = true; }
  }
  // it found you, or it got back to bed with the crown still on it
  if (!T.result && T.i >= 3 && T.i < 5) {
    if (S.state === 'chase' || S.state === 'caught') { T.result = 'spotted'; T.changed = true; }
    else if (S.state === 'play' && !bedEmpty(S) && c.alive) { T.result = 'late'; T.changed = true; }
  }
  if (T.result) T.target = T.result === 'done' ? null : T.target;
  return T;
}
// the lesson counts as learned once the crown is in the bag
export const learned = (T, S) => T.result === 'done' || (T.i >= 5);
