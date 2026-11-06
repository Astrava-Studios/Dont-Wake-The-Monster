// Pure game logic. No DOM, no three.js: the same step(dt) runs in node (tests, bot) and the browser.
// The view reads S and drains S.events each frame.
import { RULES } from './rules.js';
import { generateLevel, cellOf, cellCenter, astar, collide, blockedLOS } from './level.js';
import { makeBody, stepBodies } from './physics.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// gear: { slippers, cloak, bigbag } owned for the run · kit: consumables carried into this night (max RULES.consumables.slots)
// bonus: the worn costume set's bonus ({ stepNoise, take, kitTime, capacity, peekGap, calm, speed }), see RULES.costumes
export function createSim({ night = 1, seed = 1, upgrades = {}, gear = {}, kit = [], bonus = {}, house = 'manor', relics = [] } = {}) {
  const L = generateLevel(night, seed, house);
  const up = { socks: 0, back: 0, feet: 0, lullaby: 0, charm: 0, ...upgrades };
  const R = RULES, U = R.upgrades;
  let id = 0;
  const hasRelic = (k) => relics.includes(k);
  let capMod = 0;
  if (hasRelic('feather_step')) capMod -= 1;
  if (hasRelic('golden_compass')) L.dawnTime = Math.max(35, L.dawnTime - 12);
  const capacity = Math.max(2, R.bag.capacity + (gear.bigbag ? R.gear.bigbag.capacity : 0) + (bonus.capacity || 0) + capMod);
  const S = {
    L, night, up, rng: L.rng, events: [],
    t: 0, state: 'play', wake: 0, bag: [], weight: 0, value: 0, collected: 0, total: 0,
    leftExit: false, quiet: 0, stepT: 0, snoreT: L.rng() * 3, snoring: false,
    peek: 'none', peekT: 0, peekNext: R.peek.first, hidden: false, seen: 0,
    feather: 0, lull: up.lullaby * U.lullaby.per, woke: false, chaseT: 0, dawn: false, heartT: 0, endT: 0, emptyHint: false,
    screams: R.scream.perNight, screamed: false,
    player: { x: L.start.x, z: L.start.z, facing: -L.exit.side * Math.PI / 2, m: 0, opening: false },
    monster: {
      x: L.nest.x, z: L.nest.z, homeX: L.nest.x, homeZ: L.nest.z, yaw: 0, state: 'sleep', t: 0, stun: 0, path: null, pathT: 0,
      tossT: R.quirks.tossMin + L.rng() * R.quirks.tossRand, tossYaw: 0,
      nightmareT: R.quirks.nightmareMin + L.rng() * R.quirks.nightmareRand, twitch: 0,
      sleepwalkT: R.quirks.sleepwalkMin + L.rng() * R.quirks.sleepwalkRand, sleepwalkLeft: 0, sleepwalkTarget: null,
    },
    treasures: [], ducks: [], powerups: [],
    gear: { ...gear }, kit: kit.slice(0, R.consumables.slots), sleep: 0, lockpick: false,
    bonus: { ...bonus }, capacity,
    relics: relics.slice(), hasRelic,
    nextId: () => ++id,
  };
  const vm = L.valueMult * (1 + U.charm.per * up.charm) * (hasRelic('golden_compass') ? 1.25 : 1);
  for (const it of L.items) { const t = makeTreasure(S, it.kind, it.x, it.z, Math.round(it.value * vm)); if (it.onBed) t.onBed = true; S.treasures.push(t); }
  S.total = S.treasures.length;
  S.bodies = L.obstacles.filter((o) => o.loose).map((o) => makeBody(o.kind, o.x, o.z, 0, o));
  for (const d of L.ducks) S.ducks.push({ id: S.nextId(), x: d.x, z: d.z, alive: true, vx: 0, vz: 0 });
  S.cats = [];
  for (const c of L.cats || []) S.cats.push({ id: S.nextId(), x: c.x, z: c.z, yaw: c.yaw, startled: false, vx: 0, vz: 0 });
  for (const p of L.powerups) S.powerups.push({ id: S.nextId(), kind: p.kind, x: p.x, z: p.z, alive: true });
  return S;
}

function makeTreasure(S, kind, x, z, value, weight) {
  const b = RULES.items[kind];
  return { id: S.nextId(), kind, x, z, alive: true, value, weight: weight ?? b.weight, noise: b.noise, take: b.take, progress: 0, creakT: 0, cool: 0, cond: 1, seed: (S.rng() * 1e9) | 0 };
}
const emit = (S, type, o = {}) => S.events.push({ type, ...o });

// ---------- derived numbers (shared with UI + promise tests) ----------
export function weightFactor(S) {
  const P = RULES.player; return 1 - Math.min(P.maxSlow, S.weight * P.weightSlow * (1 - RULES.upgrades.back.per * S.up.back));
}
export function playerSpeed(S, m) {
  const P = RULES.player;
  const sp = m < P.tiptoeBelow ? Math.max(m, P.tiptoeMin) * P.tiptoeFactor : m;
  const relicSp = S && S.hasRelic && S.hasRelic('owl_eye') ? 0.94 : 1;
  return sp * P.speed * (1 + RULES.upgrades.feet.per * S.up.feet) * weightFactor(S) * ((S.bonus && S.bonus.speed) || 1) * relicSp;
}
export function stepNoise(S, m, tile) {
  const N = RULES.noise, P = RULES.player;
  let base = m < P.tiptoeBelow ? N.tiptoe : N.runMin + (m - P.tiptoeBelow) / (1 - P.tiptoeBelow) * (N.runMax - N.runMin);
  if (tile === 'rug') base *= N.rugMult;
  base *= 1 + S.weight * N.weightLoud * (1 - RULES.upgrades.back.per * S.up.back);
  const extra = tile === 'squeak' ? (m < P.tiptoeBelow ? N.squeakTiptoe : N.squeakRun) : 0;
  let n = (base + extra) * (1 - RULES.upgrades.socks.per * S.up.socks);
  if (S.feather > 0) n *= N.featherMult;
  if (S.gear && S.gear.slippers) n *= RULES.gear.slippers.stepNoise;
  if (S.bonus && S.bonus.stepNoise) n *= S.bonus.stepNoise;
  if (S.hasRelic && S.hasRelic('feather_step')) n *= 0.6;
  return n;
}
// how much of a noise actually reaches the monster's ears
export function heardNoise(S, n, x, z) {
  const N = RULES.noise;
  const d = dist(x, z, S.monster.homeX, S.monster.homeZ);
  const distF = clamp(N.distNear - d / N.distFalloff, N.distFar, N.distNear);
  // the monster senses its shrinking hoard: every treasure taken makes it a lighter sleeper
  const hoard = 1 + RULES.night.hoardSense * (S.collected / Math.max(1, S.total));
  // a whispering orb in the bag keeps the monster half-listening; sleep dust muffles everything
  let curse = 1; for (const b of S.bag) { const c = RULES.items[b.kind].curse; if (c && c.hear) curse *= c.hear; }
  const dust = S.sleep > 0 ? 0.2 : 1;
  const snoreMask = S.hasRelic && S.hasRelic('snore_whistle') ? 0.15 : N.snoreMask;
  return n * distF * (S.snoring ? snoreMask : 1) * S.L.monster.hearing * S.L.wakeMult * hoard * curse * dust;
}
export function tileAt(S, x, z) { return S.L.isSqueak(x, z) ? 'squeak' : S.L.onRug(x, z) ? 'rug' : 'wood'; }
export const bagFits = (S, t) => S.weight + t.weight <= S.capacity;
// what an item is worth now (cracks lower it)
export const itemWorth = (b) => Math.round(b.value * (b.cond ?? 1));

// the monster is out of bed: an item lying on the bed (the crown) can only be taken then
export const bedEmpty = (S) => dist(S.monster.x, S.monster.z, S.monster.homeX, S.monster.homeZ) > S.L.nest.r;
// awake states in which the player can still move and act
export const ACTIVE = ['play', 'wakeup', 'chase', 'return', 'lure'];

export function addNoise(S, n, x, z, ring = true) {
  if (ring && n > 0.5) emit(S, 'noise', { x, z, n });
  // hunting the scream: it listens from where it stands now, and enough noise gives you away
  if (S.state === 'lure') {
    const N = RULES.noise, d = dist(x, z, S.monster.x, S.monster.z);
    S.grump = (S.grump || 0) + n * clamp(N.distNear - d / N.distFalloff, N.distFar, N.distNear) * S.L.monster.hearing;
    if (S.grump >= RULES.scream.hear) startChase(S);
    return;
  }
  // walking back to bed it is still grumpy: enough noise and it turns around and chases again
  if (S.state === 'return' && S.monster.state === 'return') {
    S.grump = (S.grump || 0) + heardNoise(S, n, x, z);
    if (S.grump >= RULES.chase.returnRewake) rechase(S);
    return;
  }
  if (S.state !== 'play') return;
  S.wake += heardNoise(S, n, x, z);
  if (S.wake >= 100) wakeUp(S, 'noise');
}

function rechase(S) {
  const mo = S.monster; S.grump = 0;
  S.state = 'chase'; mo.state = 'chase'; mo.path = null; mo.t = 0;
  S.chaseT = Math.max(S.chaseT, S.L.chaseTime * RULES.chase.rewakeTime);
  emit(S, 'wake', { reason: 'noise' }); emit(S, 'chase');
}

export function wakeUp(S, reason) {
  if (S.state !== 'play') return;
  S.state = 'wakeup'; S.woke = true; S.wake = 100; S.peek = 'none';
  S.dawn = reason === 'dawn'; S.chaseT = S.dawn ? 1e9 : S.L.chaseTime;
  S.monster.state = 'wakeup'; S.monster.t = 0; S.monster.sleepwalkReturn = false; S.grump = 0;
  emit(S, 'wake', { reason });
}

// it found you while hunting the scream: a normal chase
function startChase(S) {
  const mo = S.monster; S.grump = 0;
  // a startled "!" first (wakeup state, a little longer than waking up): being seen is a head start, not a sure catch
  S.state = 'chase'; mo.state = 'wakeup'; mo.path = null; mo.t = -RULES.scream.react; S.chaseT = S.L.chaseTime;
  emit(S, 'spotted', { x: mo.x, z: mo.z });
}
// can the hunting monster see the player right now?
function spots(S, range) {
  const mo = S.monster, p = S.player, d = dist(mo.x, mo.z, p.x, p.z);
  if (d < RULES.chase.catchRadius * 0.75) return true; // walked right into you
  return d < range && !p.inWardrobe && !S.L.inDark(p.x, p.z) && !blockedLOS(S.L, mo.x, mo.z, p.x, p.z);
}

// ---------- player actions ----------
// scream: wakes the monster on purpose; it runs to the spot you screamed from and looks around for you.
// Hide (dark, wardrobe, behind tall furniture) or slip away quietly, and take the crown from its empty bed.
export function scream(S) {
  if (S.screams <= 0 || S.state !== 'play') return false;
  const p = S.player, mo = S.monster;
  S.screams--; S.screamed = true; S.woke = true; S.wake = 100; S.peek = 'none'; S.sleep = 0; S.grump = 0;
  S.state = 'lure'; S.dawn = false; S.chaseT = S.L.chaseTime;
  mo.state = 'wakeup'; mo.t = 0; mo.sleepwalkReturn = false; mo.path = null; mo.lure = { x: p.x, z: p.z };
  emit(S, 'scream', { x: p.x, z: p.z });
  emit(S, 'wake', { reason: 'scream' });
  return true;
}
export function dropLoot(S) {
  if (!S.bag.length || !ACTIVE.includes(S.state)) return false;
  let hi = 0; S.bag.forEach((b, i) => { if (b.weight > S.bag[hi].weight || (b.weight === S.bag[hi].weight && b.value < S.bag[hi].value)) hi = i; });
  const it = S.bag.splice(hi, 1)[0]; S.weight -= it.weight; S.value -= it.value; S.collected--;
  const p = S.player; const back = { x: p.x - Math.sin(p.facing) * 0.9, z: p.z - Math.cos(p.facing) * 0.9 };
  collide(S.L, back, 0.3, true);
  const kind = it.kind;
  const t = makeTreasure(S, kind, back.x, back.z, it.value, it.weight); t.cool = 1.2; t.dropped = true; t.take = RULES.take.dropped; t.seed = it.seed;
  t.cond = it.cond ?? 1; if (RULES.items[kind].fragile) { t.cond = Math.max(RULES.damage.minCond, t.cond - RULES.damage.dropLoss); emit(S, 'crack', { kind, x: back.x, z: back.z }); }
  S.treasures.push(t); // total stays the same: it was un-collected
  addNoise(S, RULES.noise.drop, back.x, back.z);
  emit(S, 'drop', { id: t.id, kind, value: it.value, x: back.x, z: back.z });
  return true;
}
export function useLullaby(S) {
  if (S.lull <= 0 || !lullabyEffect(S, true)) return false;
  S.lull--; return lullabyEffect(S);
}
function lullabyEffect(S, dry) {
  if (!['play', 'chase', 'wakeup', 'lure'].includes(S.state)) return false;
  if (dry) return true;
  if (S.state === 'lure') { // hunting the scream: the lullaby lulls it straight back to bed
    S.state = 'return'; S.monster.state = 'return'; S.monster.path = null; S.grump = 0;
    emit(S, 'lullaby', { mode: 'calm' }); emit(S, 'giveUp'); return true;
  }
  if (S.state === 'play') {
    S.wake = Math.max(0, S.wake - RULES.calm.lullaby);
    S.peek = 'none'; S.peekNext = 5;
    if (S.monster.state === 'sleepwalk') { S.monster.state = 'return'; S.monster.sleepwalkReturn = true; emit(S, 'sleepwalkEnd'); }
    emit(S, 'lullaby', { mode: 'calm' });
  } else {
    S.monster.stun = RULES.chase.stunTime;
    emit(S, 'lullaby', { mode: 'stun' });
  }
  return true;
}

// use the consumable in kit slot i: sleep dust, feather, lullaby, lockpick, smoke bomb
export function useItem(S, i) {
  const kind = S.kit[i]; const C = RULES.consumables; if (!kind) return false;
  const active = ACTIVE.includes(S.state);
  if (!active) return false;
  if (kind === 'sleepdust') { if (S.state !== 'play') return false; S.sleep = C.sleepdust.time * (S.bonus.kitTime || 1); S.peek = 'none'; S.peekNext = Math.max(S.peekNext, S.sleep); }
  else if (kind === 'feather') S.feather = C.feather.time * (S.bonus.kitTime || 1);
  else if (kind === 'lullaby') { if (!lullabyEffect(S)) return false; }
  else if (kind === 'lockpick') { if (S.lockpick) return false; S.lockpick = true; }
  else if (kind === 'smoke') { if (!['chase', 'wakeup', 'lure'].includes(S.state)) return false; S.monster.stun = C.smoke.stun; }
  S.kit.splice(i, 1); emit(S, 'use', { kind });
  return true;
}

function pickUp(S, t) {
  t.alive = false;
  S.bag.push({ kind: t.kind, value: t.value, weight: t.weight, seed: t.seed, cond: t.cond ?? 1 }); if (S.lockpick) S.lockpick = false; S.weight += t.weight; S.value += t.value; S.collected++;
  addNoise(S, t.noise * (1 - 0.08 * S.up.socks), t.x, t.z);
  emit(S, 'pickup', { id: t.id, kind: t.kind, value: t.value, x: t.x, z: t.z });
}

// ---------- main step ----------
export function step(S, dt, input = { x: 0, y: 0 }) {
  const R = RULES, PR = R.player, L = S.L, p = S.player, mo = S.monster;
  S.t += dt; if (S.seen > 0) S.seen -= dt;
  const st = S.state;
  const canMove = ACTIVE.includes(st);
  const ix = canMove ? input.x : 0, iy = canMove ? input.y : 0;
  const m = Math.min(1, Math.hypot(ix, iy)); p.m = m;
  const px0 = p.x, pz0 = p.z;

  if (m > 0.02) {
    const sp = playerSpeed(S, m); const dx = ix / m, dz = iy / m;
    p.x += dx * sp * dt; p.z += dz * sp * dt;
    let dd = Math.atan2(dx, dz) - p.facing; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); p.facing += dd * Math.min(1, dt * 14);
    collide(L, p, PR.radius, !bedEmpty(S));
    S.stepT += dt * (PR.stepsBase + m * PR.stepsPerMag);
    if (S.stepT >= 1) {
      S.stepT -= 1;
      const tile = tileAt(S, p.x, p.z); const n = stepNoise(S, m, tile);
      if (tile === 'squeak') emit(S, 'squeak', { x: p.x, z: p.z, key: Math.floor(p.x + L.W / 2) + ',' + Math.floor(p.z + L.D / 2) });
      emit(S, 'step', { x: p.x, z: p.z, n, tile, run: m >= PR.tiptoeBelow });
      if (m >= PR.tiptoeBelow) for (const b of S.bag) {
        if (!RULES.items[b.kind].fragile || S.rng() >= RULES.damage.runCrack) continue;
        b.cond = Math.max(RULES.damage.minCond, (b.cond ?? 1) - RULES.damage.crackLoss); emit(S, 'crack', { kind: b.kind, x: p.x, z: p.z });
      }
      addNoise(S, n, p.x, p.z);
    }
    S.quiet = 0;
  } else { S.quiet += dt; S.stepT = Math.min(S.stepT, 0.6); }
  if (S.feather > 0) S.feather -= dt;
  if (S.sleep > 0) S.sleep -= dt;
  // cursed things rattle and whisper while you carry them
  for (const b of S.bag) { const c = R.items[b.kind].curse; if (!c || !c.every) continue; b.ct = (b.ct || 0) + dt; if (b.ct >= c.every) { b.ct = 0; emit(S, 'curse', { kind: b.kind, x: p.x, z: p.z }); addNoise(S, c.noise, p.x, p.z); } }

  if (st === 'play') {
    const C = R.calm;
    const decay = (S.sleep > 0 ? 15 : S.quiet > C.stillAfter ? C.still : m < PR.tiptoeBelow ? C.tiptoe : 0) * L.decayMult * (S.bonus.calm || 1);
    S.wake = Math.max(0, S.wake - decay * dt);
  }

  // items: stand next to one and hold "Take" (input.take); rummaging makes noise and counts as moving if it looks
  p.opening = false; p.near = null;
  if (canMove) {
    const TK = R.take; let best = null, bd = TK.radius;
    for (const t of S.treasures) {
      if (!t.alive) continue;
      if (t.cool > 0) { t.cool -= dt; continue; }
      if (t.onBed && !bedEmpty(S)) continue;
      const d = dist(t.x, t.z, p.x, p.z);
      if (d < bd) { bd = d; best = t; }
    }
    p.near = best ? best.id : null; p.full = !!(best && !bagFits(S, best));
    const relicRummage = S.hasRelic && S.hasRelic('greedy_fingers') ? 1.5 : 1;
    const rummage = TK.tickNoise * (1 - 0.1 * S.up.socks) * (S.gear.cloak ? R.gear.cloak.rummageNoise : 1) * relicRummage;
    const relicTake = S.hasRelic && S.hasRelic('greedy_fingers') ? 1.35 : 1;
    for (const t of S.treasures) {
      if (!t.alive) continue;
      if (t === best && input.take && m < 0.05 && !p.full) {
        t.progress += (dt * relicTake) / (t.take * (S.lockpick ? R.consumables.lockpick.takeMult : 1) * (S.bonus.take || 1)); t.creakT -= dt; p.opening = true;
        if (t.creakT <= 0) { t.creakT = TK.tickEvery; emit(S, 'creak', { id: t.id, kind: t.kind }); addNoise(S, rummage, t.x, t.z); }
        if (t.progress >= 1) pickUp(S, t);
      } else if (t.progress > 0) t.progress = Math.max(0, t.progress - dt * TK.decay);
    }
    for (const pw of S.powerups) {
      if (!pw.alive || dist(pw.x, pw.z, p.x, p.z) > PR.powerRadius) continue;
      pw.alive = false;
      if (pw.kind === 'feather') S.feather = R.noise.featherTime; else S.lull++;
      emit(S, 'power', { id: pw.id, kind: pw.kind, x: pw.x, z: pw.z });
    }
    for (const dk of S.ducks) {
      if (!dk.alive) continue;
      const dx = dk.x - p.x, dz = dk.z - p.z, d = Math.hypot(dx, dz);
      if (d < PR.duckRadius && m > 0.05) {
        dk.alive = false; dk.vx = dx / (d || 1) * 4; dk.vz = dz / (d || 1) * 4;
        emit(S, 'duck', { id: dk.id, x: dk.x, z: dk.z });
        addNoise(S, S.feather > 0 ? R.noise.duckFeather : R.noise.duck * (1 - 0.08 * S.up.socks), dk.x, dk.z);
      }
    }
    for (const cat of S.cats) {
      if (cat.startled) continue;
      const d = dist(cat.x, cat.z, p.x, p.z);
      // tiptoeing slowly does NOT wake the cat! Running or touching it startles it!
      if (d < 0.65 || (d < 1.35 && m >= PR.tiptoeBelow)) {
        cat.startled = true;
        const dx = cat.x - p.x, dz = cat.z - p.z, ld = Math.hypot(dx, dz) || 1;
        cat.vx = dx / ld * 5.5; cat.vz = dz / ld * 5.5;
        emit(S, 'catHiss', { id: cat.id, x: cat.x, z: cat.z });
        addNoise(S, 14 * (1 - 0.08 * S.up.socks), cat.x, cat.z);
      }
    }
    // wardrobe hiding
    let nearWardrobe = null;
    for (const o of L.obstacles) {
      if (o.kind === 'wardrobe') {
        const d = dist(p.x, p.z, o.x, o.z);
        if (d < 1.35) { nearWardrobe = o; break; }
      }
    }
    p.nearWardrobe = nearWardrobe ? nearWardrobe : null;
    const wasIn = p.inWardrobe;
    // slip inside only while sneaking, after standing still a moment, and not when an item is right there
    p.inWardrobe = !!(nearWardrobe && (st === 'play' || st === 'lure') && m < 0.05 && !p.opening && !p.near && (wasIn || S.quiet > PR.wardrobeAfter));
    if (p.inWardrobe) S.hidden = true;
    if (!wasIn && p.inWardrobe) emit(S, 'wardrobeEnter', { x: nearWardrobe.x, z: nearWardrobe.z });
    if (wasIn && !p.inWardrobe) emit(S, 'wardrobeExit', { x: nearWardrobe ? nearWardrobe.x : p.x, z: nearWardrobe ? nearWardrobe.z : p.z });
  }
  for (const dk of S.ducks) if (!dk.alive && Math.abs(dk.vx) + Math.abs(dk.vz) > 0.05) { dk.x += dk.vx * dt; dk.z += dk.vz * dt; dk.vx *= 0.9; dk.vz *= 0.9; }
  for (const cat of S.cats) if (cat.startled && Math.abs(cat.vx) + Math.abs(cat.vz) > 0.05) { cat.x += cat.vx * dt; cat.z += cat.vz * dt; cat.vx *= 0.88; cat.vz *= 0.88; }

  // exit
  const dExit = dist(p.x, p.z, L.exit.x, L.exit.z);
  if (!S.leftExit && dExit > 2.2) S.leftExit = true;
  if (canMove && S.leftExit && dExit < 1.0) {
    if (S.bag.length) { S.state = 'escaped'; S.endT = 0; emit(S, 'escaped'); }
    else if (!S.emptyHint) { S.emptyHint = true; emit(S, 'emptyHint'); }
  }
  if (dExit > 1.5) S.emptyHint = false;

  // dawn
  if (['play', 'return', 'lure'].includes(S.state) && S.t >= L.dawnTime) { S.state = 'play'; emit(S, 'alarm'); wakeUp(S, 'dawn'); }

  // sleeping monster: snore rhythm + peeking
  if (S.state === 'play') {
    const cycle = R.snore.cycle, len = R.snore.len * L.monster.snoreLen;
    S.snoreT += dt;
    const snoring = S.peek === 'none' && (S.snoreT % cycle) > cycle - len;
    if (snoring && !S.snoring) emit(S, 'snore', { len });
    if (!snoring && S.snoring && S.hasRelic && S.hasRelic('snore_whistle')) {
      S.wake = Math.min(95, S.wake + 8);
      emit(S, 'snoreSpike');
    }
    S.snoring = snoring;
    const PK = R.peek;
    const gate = S.wake >= PK.gate || (S.night >= PK.lateNight && S.wake >= PK.lateGate);
    if (S.peek === 'none') {
      // sleep gets lighter towards dawn: it peeks more often late in the night
      if (gate) S.peekNext -= dt * L.monster.peekRate * (0.5 + S.wake / 100) * (1 + PK.dawnBoost * Math.min(1, S.t / L.dawnTime));
      const warnDur = PK.warn + (S.hasRelic && S.hasRelic('owl_eye') ? 1.2 : 0);
      if (S.peekNext <= 0 && S.sleep <= 0) { S.peek = 'warn'; S.peekT = warnDur; emit(S, 'hmm'); }
    } else if (S.peek === 'warn') {
      S.peekT -= dt; if (S.peekT <= 0) { S.peek = 'open'; S.peekT = PK.open; }
    } else if (S.peek === 'open') {
      S.peekT -= dt;
      const dx = p.x - mo.x, dz = p.z - mo.z;
      const toP = Math.atan2(dx, dz);
      let rel = toP - mo.yaw;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const behindHead = Math.abs(rel) > 1.85;
      S.hidden = blockedLOS(L, mo.homeX, mo.homeZ + 1, p.x, p.z) || L.inDark(p.x, p.z) || behindHead || p.inWardrobe; // cannot see into darkness, behind obstacles, behind head, or inside wardrobe
      if ((m > 0.1 || p.opening) && !S.hidden && S.feather <= 0) {
        S.wake += PK.seenRate * dt * L.monster.hearing; S.seen = 0.3;
        if (S.wake >= 100) wakeUp(S, 'seen');
      }
      if (S.peekT <= 0 && S.state === 'play') { S.peek = 'none'; S.peekNext = (PK.nextMin + S.rng() * PK.nextRand) * (S.bonus.peekGap || 1); }
    }
    if (S.wake > 70) { S.heartT -= dt; if (S.heartT <= 0) { S.heartT = 1.1 - (S.wake - 70) / 60; emit(S, 'heart'); } }
  } else S.snoring = false;

  const mx0 = mo.x, mz0 = mo.z;
  stepMonster(S, dt);
  stepProps(S, dt, px0, pz0, mx0, mz0);

  if (S.state === 'caught' || S.state === 'escaped') {
    S.endT += dt;
    if (S.state === 'escaped') { const tx = L.exit.side * (L.W / 2 + 0.6); p.x += (tx - p.x) * Math.min(1, dt * 3); p.z += (L.exit.z - p.z) * Math.min(1, dt * 3); p.facing = L.exit.side * Math.PI / 2; }
  }
  S.done = (S.state === 'caught' || S.state === 'escaped') && S.endT > 1.6;
}

function stepMonster(S, dt) {
  const mo = S.monster, CH = RULES.chase, p = S.player; mo.t += dt;
  if (mo.state === 'sleep') {
    const Q = RULES.quirks;
    // roll / toss in bed
    mo.tossT = (mo.tossT ?? (Q.tossMin + S.rng() * Q.tossRand)) - dt;
    if (mo.tossT <= 0) {
      mo.tossT = Q.tossMin + S.rng() * Q.tossRand;
      mo.tossYaw = (S.rng() - 0.5) * 1.5;
      emit(S, 'monsterToss', { yaw: mo.tossYaw, x: mo.homeX, z: mo.homeZ });
    }
    const diff = (mo.tossYaw || 0) - mo.yaw;
    mo.yaw += diff * Math.min(1, dt * 2.2);

    // nightmare twitch & groan
    mo.nightmareT = (mo.nightmareT ?? (Q.nightmareMin + S.rng() * Q.nightmareRand)) - dt;
    if (mo.nightmareT <= 0) {
      mo.nightmareT = Q.nightmareMin + S.rng() * Q.nightmareRand;
      mo.twitch = 0.85;
      S.wake = Math.min(92, S.wake + 3.2);
      emit(S, 'monsterNightmare', { x: mo.x, z: mo.z });
    }
    if (mo.twitch > 0) mo.twitch = Math.max(0, mo.twitch - dt);

    // sleepwalk trigger (night 2+, wake >= 25, monster not peeking, play state)
    mo.sleepwalkT = (mo.sleepwalkT ?? (Q.sleepwalkMin + S.rng() * Q.sleepwalkRand)) - dt;
    if (S.night >= Q.sleepwalkNight && S.wake >= 25 && S.peek === 'none' && mo.sleepwalkT <= 0 && S.state === 'play') {
      mo.sleepwalkT = Q.sleepwalkMin + S.rng() * Q.sleepwalkRand;
      mo.state = 'sleepwalk';
      mo.sleepwalkLeft = Q.sleepwalkDur;
      const ang = (S.rng() - 0.5) * 1.6;
      const distM = 2.0 + S.rng() * 1.2;
      mo.sleepwalkTarget = {
        x: clamp(mo.homeX + Math.sin(ang) * distM, -S.L.W / 2 + 1.8, S.L.W / 2 - 1.8),
        z: clamp(mo.homeZ + Math.cos(ang) * distM, -S.L.D / 2 + 1.8, S.L.D / 2 - 1.8),
      };
      emit(S, 'sleepwalkStart', { x: mo.x, z: mo.z });
      return;
    }
    return;
  }
  if (mo.state === 'sleepwalk') {
    if (S.state !== 'play') { mo.state = 'sleep'; mo.x = mo.homeX; mo.z = mo.homeZ; return; }
    mo.sleepwalkLeft -= dt;
    const Q = RULES.quirks;
    moveMonster(S, mo.sleepwalkTarget.x, mo.sleepwalkTarget.z, Q.sleepwalkSpeed, dt);
    // bumping into sleepwalking monster wakes it!
    if (dist(mo.x, mo.z, p.x, p.z) < RULES.chase.catchRadius * 0.75) {
      wakeUp(S, 'bump');
      return;
    }
    if (mo.sleepwalkLeft <= 0 || dist(mo.x, mo.z, mo.sleepwalkTarget.x, mo.sleepwalkTarget.z) < 0.4) {
      mo.state = 'return'; mo.sleepwalkReturn = true;
      emit(S, 'sleepwalkEnd', { x: mo.x, z: mo.z });
      return;
    }
    return;
  }
  if (mo.state === 'wakeup') {
    if (mo.t > CH.wakeDelay) {
      if (S.state === 'lure') { mo.state = 'lure'; mo.t = 0; mo.path = null; }
      else { mo.state = 'chase'; S.state = 'chase'; mo.path = null; emit(S, 'chase'); }
    }
    return;
  }
  // scream: run to where it came from, then look around; spotting you starts a chase, otherwise back to bed
  if (mo.state === 'lure' || mo.state === 'search') {
    const SC = RULES.scream;
    if (S.state !== 'lure') return;
    if (mo.stun > 0) { mo.stun -= dt; return; }
    if (spots(S, mo.state === 'search' ? SC.see : SC.seeTravel)) { startChase(S); return; }
    if (mo.state === 'lure') {
      moveMonster(S, mo.lure.x, mo.lure.z, S.L.chaseSpeed, dt);
      if (dist(mo.x, mo.z, mo.lure.x, mo.lure.z) < 1.2 || mo.t > SC.lureMax) { mo.state = 'search'; mo.t = 0; mo.searchYaw = mo.yaw; emit(S, 'search', { x: mo.x, z: mo.z }); }
    } else {
      mo.yaw = mo.searchYaw + Math.sin(mo.t * 1.9) * 2.2; // turns its head left and right
      if (mo.t > SC.search) { mo.state = 'return'; S.state = 'return'; mo.path = null; S.grump = 0; emit(S, 'giveUp'); }
    }
    return;
  }
  if (mo.state === 'chase') {
    if (S.state !== 'chase') return;
    if (mo.stun > 0) { mo.stun -= dt; return; }
    S.chaseT -= dt;
    if (S.chaseT <= 0) { mo.state = 'return'; S.state = 'return'; mo.path = null; S.grump = 0; emit(S, 'giveUp'); return; }
    // pounce: when close it lunges forward for a moment, then needs to recover
    const CHr = RULES.chase; mo.pounceCd = Math.max(0, (mo.pounceCd || 0) - dt); mo.pounce = Math.max(0, (mo.pounce || 0) - dt);
    if (!mo.pounce && !mo.pounceCd && CHr.pounceMult > 1 && dist(mo.x, mo.z, p.x, p.z) < CHr.pounceRange) { mo.pounce = CHr.pounceTime; mo.pounceCd = CHr.pounceCooldown; emit(S, 'pounce', { x: mo.x, z: mo.z }); }
    moveMonster(S, p.x, p.z, S.L.chaseSpeed * (mo.pounce > 0 ? CHr.pounceMult : 1), dt);
    if (dist(mo.x, mo.z, p.x, p.z) < CH.catchRadius * S.L.monster.scale) { S.state = 'caught'; S.endT = 0; mo.state = 'caught'; emit(S, 'caught'); }
    return;
  }
  if (mo.state === 'return') {
    moveMonster(S, mo.homeX, mo.homeZ, S.L.chaseSpeed * CH.returnSpeed, dt);
    if (dist(mo.x, mo.z, mo.homeX, mo.homeZ) < 0.4) {
      mo.state = 'sleep'; mo.yaw = 0; mo.x = mo.homeX; mo.z = mo.homeZ;
      if (S.state === 'return') S.state = 'play';
      // it finds you lying in its bed
      if (S.state === 'play' && dist(S.player.x, S.player.z, mo.homeX, mo.homeZ) < S.L.nest.r + RULES.player.radius) { mo.sleepwalkReturn = false; wakeUp(S, 'bed'); return; }
      // back from a chase it sleeps lightly; back from sleepwalking nothing changed (the wake meter stays)
      if (!mo.sleepwalkReturn) { S.wake = CH.sleepWake; S.peekNext = RULES.peek.first; }
      mo.sleepwalkReturn = false; emit(S, 'asleep');
    }
  }
}

function moveMonster(S, tx0, tz0, speed, dt) {
  const mo = S.monster, L = S.L;
  mo.pathT -= dt;
  if (mo.pathT <= 0 || !mo.path) {
    mo.pathT = RULES.chase.repath;
    const pth = astar(L.mgrid, cellOf(L, mo.x, mo.z), cellOf(L, tx0, tz0));
    mo.path = pth ? pth.slice(1).map((c) => cellCenter(L, c)) : null;
  }
  let tx = tx0, tz = tz0;
  if (mo.path && mo.path.length > 2) {
    while (mo.path.length > 1 && dist(mo.path[0].x, mo.path[0].z, mo.x, mo.z) < 0.45) mo.path.shift();
    const wp = mo.path[Math.min(1, mo.path.length - 1)]; tx = wp.x; tz = wp.z;
  }
  const dx = tx - mo.x, dz = tz - mo.z, d = Math.hypot(dx, dz);
  if (d > 0.05) {
    const s = Math.min(d, speed * dt); mo.x += dx / d * s; mo.z += dz / d * s;
    let dd = Math.atan2(dx, dz) - mo.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); mo.yaw += dd * Math.min(1, dt * 8);
  }
  collide(L, mo, RULES.chase.monsterRadius, false);
}

// ---------- loose props ----------
function stepProps(S, dt, px0, pz0, mx0, mz0) {
  if (!S.bodies.length || dt <= 0) return;
  const p = S.player, mo = S.monster;
  const pl = { x: p.x, z: p.z, r: RULES.player.radius, vx: (p.x - px0) / dt, vz: (p.z - pz0) / dt, solid: true, who: 'player' };
  const pushers = [pl];
  if (mo.state !== 'sleep') pushers.push({ x: mo.x, z: mo.z, r: RULES.chase.monsterRadius, vx: (mo.x - mx0) / dt, vz: (mo.z - mz0) / dt, solid: false, who: 'monster' });
  stepBodies(S.L, S.bodies, pushers, dt, (type, e) => {
    emit(S, type, e);
    if (e.who !== 'monster' && e.n > 0) addNoise(S, e.n, e.x, e.z, type === 'topple');
  });
  p.x = pl.x; p.z = pl.z; collide(S.L, p, RULES.player.radius, !bedEmpty(S));
}

// ---------- night result ----------
// escaped: the bag goes to the stash (sold later at the black market); stars pay reputation coins
export function nightResult(S) {
  const SC = RULES.score;
  if (S.state === 'escaped') {
    const stealth = !S.woke, sweep = S.collected >= S.total * SC.nearSweepAt;
    const bold = !!S.screamed; // woke it on purpose and still got away: pays a little, never as much as staying unseen
    const bonus = (stealth ? SC.stealthBonus : 0) * S.night + (sweep ? SC.sweepBonus : 0) * S.night + (bold ? SC.boldBonus : 0) * S.night;
    return { ok: true, items: S.bag.map(({ ct, ...b }) => ({ ...b })), stealth, sweep, bold, bonus, stars: 1 + (stealth || bold ? 1 : 0) + (sweep ? 1 : 0) };
  }
  return { ok: false, items: [], lost: S.bag.map((b) => ({ ...b })), bonus: 0, stars: 0 };
}
