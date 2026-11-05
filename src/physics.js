// Loose props: small furniture (chairs, barrels, crates, plants, toy blocks...) that bodies can shove and knock over.
// Pure and deterministic (no Math.random): the sim steps it, the view only draws body.x/z/tip/yaw.
// A body wrapping a level obstacle writes its position back into that obstacle, so line-of-sight follows it;
// level.collide() skips obstacles marked `loose` (the bodies resolve those contacts here instead).
import { collide } from './level.js';

// r: contact radius · mass: how hard it is to shove · tipAt: push speed that knocks it over (0 = never tips)
// mat: which bump / topple sound it makes · noise: how loud it is for the monster when it falls
export const LOOSE = {
  chair:        { r: 0.32, mass: 1.2, tipAt: 1.5, mat: 'wood',  noise: 4 },
  stool:        { r: 0.25, mass: 0.8, tipAt: 1.3, mat: 'wood',  noise: 3 },
  barrel:       { r: 0.42, mass: 3.0, tipAt: 3.2, mat: 'barrel', noise: 5 },
  crate:        { r: 0.46, mass: 3.5, tipAt: 0,   mat: 'wood',  noise: 4 },
  plant:        { r: 0.32, mass: 1.6, tipAt: 2.2, mat: 'pot',   noise: 4 },
  blocks:       { r: 0.3,  mass: 0.6, tipAt: 1.2, mat: 'toy',   noise: 2 },
  armchair:     { r: 0.52, mass: 4.5, tipAt: 0,   mat: 'soft',  noise: 2 },
  vaseStack:    { r: 0.28, mass: 0.7, tipAt: 0.9, mat: 'pot',   noise: 12 },
  candleMelted: { r: 0.14, mass: 0.5, tipAt: 0.9, mat: 'metal', noise: 2 },
  pillowA:      { r: 0.27, mass: 0.4, tipAt: 0,   mat: 'soft',  noise: 0.5 },
  pillowB:      { r: 0.27, mass: 0.4, tipAt: 0,   mat: 'soft',  noise: 0.5 },
};
// height of the props that can tip: once fallen they lie this far along the floor
const TIP_H = { chair: 0.95, stool: 0.65, barrel: 0.95, plant: 0.9, blocks: 0.45, vaseStack: 0.85, candleMelted: 0.3 };
export const isLooseKind = (k) => !!LOOSE[k];

export function makeBody(kind, x, z, yaw = 0, obstacle = null) {
  const P = LOOSE[kind] || LOOSE.pillowA;
  return { kind, x, z, yaw, vx: 0, vz: 0, spin: 0, tip: 0, tipV: 0, ax: 1, az: 0, fallen: false, cool: 0, obstacle, h: TIP_H[kind] || 0, ...P };
}

// pushers: [{ x, z, r, vx, vz, solid, who }]; solid pushers are pushed back by heavy props (the thief),
// non-solid ones bulldoze through (the monster). emit(type, data) reports bumps and falls.
export function stepBodies(L, bodies, pushers, dt, emit) {
  if (!bodies.length || dt <= 0) return;
  for (const o of bodies) {
    o.cool = Math.max(0, o.cool - dt);
    for (const b of pushers) {
      const dx = o.x - b.x, dz = o.z - b.z, d = Math.hypot(dx, dz), m = b.r + o.r;
      if (d >= m) continue;
      const nx = d > 1e-5 ? dx / d : 1, nz = d > 1e-5 ? dz / d : 0, pen = m - d;
      // share the overlap: light things fly, heavy things barely budge and slow you down
      const k = b.solid ? 1 / (1 + o.mass * 0.5) : 1;
      o.x += nx * pen * k; o.z += nz * pen * k;
      if (b.solid) { b.x -= nx * pen * (1 - k); b.z -= nz * pen * (1 - k); }
      // relative closing speed: a push brings the prop up to a share of the pusher's speed (light things fly ahead)
      const sp = Math.max(0, b.vx * nx + b.vz * nz), vn = o.vx * nx + o.vz * nz, rel = sp - vn;
      if (rel < 0.15) continue;
      const target = Math.min(6, sp) * Math.min(1.4, 1.2 / (0.4 + o.mass * 0.5));
      if (vn < target) { o.vx += nx * (target - vn); o.vz += nz * (target - vn); }
      o.spin += (nx * b.vz - nz * b.vx) * 0.5 / o.mass; // off-centre hits make it turn
      if (o.tipAt && !o.fallen && o.tipV === 0 && rel >= o.tipAt) { o.ax = nz; o.az = -nx; o.tipV = 1.2 + rel * 0.4; }
      if (o.cool <= 0) { o.cool = 0.3; emit('bump', { kind: o.kind, mat: o.mat, x: o.x, z: o.z, k: Math.min(1, rel / 4), n: o.noise * 0.25 * Math.min(1.5, rel / 3), who: b.who }); }
    }
  }
  // props shove each other
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i], c = bodies[j]; const dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz), m = a.r + c.r;
    if (d >= m || d < 1e-5) continue;
    const nx = dx / d, nz = dz / d, pen = m - d, wa = c.mass / (a.mass + c.mass);
    a.x -= nx * pen * wa; a.z -= nz * pen * wa; c.x += nx * pen * (1 - wa); c.z += nz * pen * (1 - wa);
    const rv = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz;
    if (rv < 0) { const jv = -rv * 0.8 / (1 / a.mass + 1 / c.mass); a.vx -= nx * jv / a.mass; a.vz -= nz * jv / a.mass; c.vx += nx * jv / c.mass; c.vz += nz * jv / c.mass; }
    if (rv < -1 && a.cool <= 0) { a.cool = 0.25; emit('bump', { kind: a.kind, mat: a.mat, x: a.x, z: a.z, k: Math.min(1, -rv / 3), n: a.noise * 0.2, who: 'prop' }); }
  }
  for (const o of bodies) {
    // slide with floor friction (lying things drag more), bounce off walls and fixed furniture
    o.x += o.vx * dt; o.z += o.vz * dt; o.yaw += o.spin * dt;
    const f = Math.exp(-dt * (o.fallen ? 8 : 5)); o.vx *= f; o.vz *= f; o.spin *= Math.exp(-dt * 6);
    const pos = { x: o.x, z: o.z }; collide(L, pos, o.r, true);
    const hx = Math.abs(pos.x - o.x) > 1e-4, hz = Math.abs(pos.z - o.z) > 1e-4;
    const hard = (hx && Math.abs(o.vx) > 0.8) || (hz && Math.abs(o.vz) > 0.8);
    if (hx) o.vx *= -0.35; if (hz) o.vz *= -0.35;
    if (hard && o.cool <= 0) { o.cool = 0.25; emit('bump', { kind: o.kind, mat: o.mat, x: pos.x, z: pos.z, k: 0.6, n: o.noise * 0.2, who: 'wall' }); }
    o.x = pos.x; o.z = pos.z;
    // a tipping/fallen prop lies along the floor: keep its top end out of walls and furniture too, not just its base
    if (o.tip > 0 && o.h > 0) {
      const dx = -o.az, dz = o.ax, pr = Math.max(0.1, o.r * 0.6), reach = Math.max(0, o.h * Math.sin(o.tip) - pr);
      if (reach > 0.02) {
        const top = { x: o.x + dx * reach, z: o.z + dz * reach }, tx = top.x, tz = top.z; collide(L, top, pr, true);
        const mx = top.x - tx, mz = top.z - tz;
        if (Math.abs(mx) > 1e-4 || Math.abs(mz) > 1e-4) {
          const base = { x: o.x + mx, z: o.z + mz }; collide(L, base, o.r, true); o.x = base.x; o.z = base.z;
          if (mx * o.vx < 0) o.vx *= -0.35; if (mz * o.vz < 0) o.vz *= -0.35;
        }
      }
    }
    // tipping: accelerates like a falling stick, then lands with a crash
    if (o.tipV > 0 && !o.fallen) {
      o.tipV += dt * 11 * Math.sin(Math.max(0.25, o.tip)); o.tip += o.tipV * dt;
      if (o.tip >= Math.PI / 2) {
        o.tip = Math.PI / 2; o.fallen = true; o.tipV = 0;
        // a fallen barrel rolls a little further
        if (o.kind === 'barrel') { o.vx += o.az * -1.5; o.vz += o.ax * 1.5; }
        emit('topple', { kind: o.kind, mat: o.mat, x: o.x, z: o.z, n: o.noise });
      }
    }
    if (o.obstacle) { o.obstacle.x = o.x; o.obstacle.z = o.z; }
  }
  // a prop stuck against a wall is solid: the thief cannot walk through it
  for (const b of pushers) if (b.solid) for (const o of bodies) {
    const dx = b.x - o.x, dz = b.z - o.z, d = Math.hypot(dx, dz), m = b.r + o.r - 0.02;
    if (d < m && d > 1e-5) { b.x += dx / d * (m - d); b.z += dz / d * (m - d); }
  }
}
