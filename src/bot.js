// Greedy bot that plays through the same API as the player: returns stick input + presses buttons.
// Used by node balance runs and by ?autoplay in the browser.
import { RULES } from './rules.js';
import { astar, cellOf, cellCenter } from './level.js';
import { dropLoot, useLullaby, playerSpeed, createSim, step } from './sim.js';

export function createBot({ greed = 9, careful = true } = {}) {
  let path = null, pathT = 0, goal = null;
  const d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

  function steer(S, gx, gz, dt) {
    const p = S.player, L = S.L;
    pathT -= dt;
    if (!path || pathT <= 0 || !goal || goal.x !== gx || goal.z !== gz) {
      pathT = 0.25; goal = { x: gx, z: gz };
      const c = astar(L.pgrid, cellOf(L, p.x, p.z), cellOf(L, gx, gz));
      path = c ? c.slice(1).map((k) => cellCenter(L, k)) : null;
    }
    let tx = gx, tz = gz;
    if (path && path.length > 1) {
      while (path.length > 1 && d(path[0].x, path[0].z, p.x, p.z) < 0.35) path.shift();
      tx = path[0].x; tz = path[0].z;
    }
    const dx = tx - p.x, dz = tz - p.z, m = Math.hypot(dx, dz) || 1;
    return { x: dx / m, y: dz / m };
  }

  return function think(S, dt) {
    const p = S.player, mo = S.monster, L = S.L;
    const awake = ['wakeup', 'chase'].includes(S.state);
    const toExit = () => steer(S, L.exit.x, L.exit.z, dt);
    if (awake) {
      const md = d(mo.x, mo.z, p.x, p.z);
      if (md < 2.6 && S.lull > 0 && mo.stun <= 0) useLullaby(S);
      if (md < 4 && S.bag.length > 1 && playerSpeed(S, 1) < L.chaseSpeed * 1.05) dropLoot(S);
      return toExit();
    }
    if (S.state === 'return') return toExit();
    if (S.state !== 'play') return { x: 0, y: 0 };
    if (S.wake > 85 && S.lull > 0) useLullaby(S);
    // freeze while the monster looks, unless hidden
    if (careful && (S.peek === 'warn' || (S.peek === 'open' && !S.hidden))) return { x: 0, y: 0 };

    const exitD = d(p.x, p.z, L.exit.x, L.exit.z);
    const timeLeft = L.dawnTime - S.t;
    const goHome = S.weight >= greed || timeLeft < exitD / (playerSpeed(S, 0.5) || 1) + 6 || (S.wake > 80 && S.lull <= 0 && S.bag.length);
    let target = null;
    if (!goHome) {
      let best = 1e9;
      for (const t of S.treasures) {
        if (!t.alive || t.cool > 0) continue;
        if (t.onBed) continue; // the crown on the bed needs a scream first; the bot never screams
        if (t.take > 2 && S.wake > 55) continue; // skip long jobs when it is restless
        if (S.weight + t.weight > S.capacity) continue; // does not fit in the bag
        const v = d(t.x, t.z, p.x, p.z) - t.value / 40;
        if (v < best) { best = v; target = t; }
      }
    }
    const dir = target ? steer(S, target.x, target.z, dt) : toExit();
    if (!target && !S.bag.length) return { x: 0, y: 0 };
    // pace: run while snoring or while the monster is calm and far; otherwise tiptoe
    const far = d(p.x, p.z, mo.homeX, mo.homeZ) > 8;
    const run = S.snoring || (S.wake < 25 && far);
    const k = run ? 1 : 0.5;
    // stand still next to the item and hold Take
    if (target && d(target.x, target.z, p.x, p.z) < RULES.take.radius * 0.85) return { x: 0, y: 0, take: true };
    return { x: dir.x * k, y: dir.y * k };
  };
}

// play one whole night headless; returns the final sim
export function playNight(opts, botOpts, maxT = 220) {
  const S = createSim(opts); const think = createBot(botOpts); const dt = 1 / 30;
  while (!S.done && S.t < maxT) { const inp = think(S, dt); step(S, dt, inp); S.events.length = 0; }
  return S;
}
