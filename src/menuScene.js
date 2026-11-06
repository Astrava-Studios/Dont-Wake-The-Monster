// The main menu's backdrop: the monster's bedroom at night. It snores in its nest (breathing, Zzz) and now and
// then cracks an eye open; the thief, sack on the back, tiptoes towards the chest and freezes whenever it does.
// Only drawing and a tiny looping script live here; main.js animates the monster and the rogue from V.peek / V.m.
import * as THREE from 'three';
import { THEMES, MONSTERS } from './level.js';

// eye peeks: first one soon after the menu opens, then every 8-14 s; an eye twitch, then the eye stays open a while
const FIRST = [3.5, 5.5], GAP = [8, 14], WARN = 0.8, OPEN = [1.3, 2.3];
const SNORE = [5.5, 8]; // seconds between soft snores (never while the eye is open)
const A = new THREE.Vector3(-3.7, 0, 1.1), B = new THREE.Vector3(-1.0, 0, 1.0); // the thief's sneaking line
const SPEED = 0.32;
const rnd = ([a, b]) => a + Math.random() * (b - a);

export function createMenuScene(d) {
  const { M, toon, AS } = d;
  const V = { built: false, m: 0, peek: 'none', peekT: 0, snoreT: 0, dir: 1, u: 0, wait: 0, home: { x: 2.4, z: -1.9, yaw: -0.45 }, monster: MONSTERS[0] };

  function build() {
    const w = d.clearWorld(); V.built = true; V.u = 0.15; V.dir = 1; V.wait = 0;
    V.monster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)]; // a different sleeper each time the menu opens
    V.peek = 'none'; V.peekT = rnd(FIRST); V.snoreT = 1.5;
    const th = THEMES[0];
    d.scene.background = new THREE.Color('#140e22');
    const wood = toon('#5e3f2c'), dark = toon('#3b2619'), wall = toon('#4b3d72'), wall2 = toon('#3d3160'), trim = toon(th.trim);
    const floor = M(new THREE.PlaneGeometry(12, 12), wood, 0, 0, 1.5, w, false); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    for (let i = -5; i <= 5; i++) M(new THREE.BoxGeometry(0.03, 0.005, 12), dark, i * 1.1, 0.003, 1.5, w, false);
    M(new THREE.BoxGeometry(12, 7, 0.2), wall, 0, 3.5, -4.3, w);
    M(new THREE.BoxGeometry(12, 0.18, 0.3), trim, 0, 0.09, -4.15, w, false); // skirting
    for (const s of [-1, 1]) M(new THREE.BoxGeometry(0.2, 7, 12), wall2, s * 6, 3.5, 1.5, w);
    // tall window with the moon, a moonbeam falling on the floor
    const win = new THREE.Group(); win.position.set(-3.2, 2.5, -4.18); w.add(win);
    M(new THREE.PlaneGeometry(1.3, 1.8), toon('#1d2a55', { emissive: '#22336a', ei: 0.7 }), 0, 0, 0, win, false);
    M(new THREE.CircleGeometry(0.24, 20), toon('#fff6d0', { emissive: '#fff0b0', ei: 2.2 }), 0.25, 0.45, 0.01, win, false);
    for (const [x, y, sw, sh] of [[0, 0.93, 1.45, 0.1], [0, -0.93, 1.45, 0.1], [-0.68, 0, 0.1, 1.95], [0.68, 0, 0.1, 1.95], [0, 0, 0.06, 1.8], [0, 0.1, 1.3, 0.06]]) M(new THREE.BoxGeometry(sw, sh, 0.06), dark, x, y, 0.03, win);
    for (const s of [-1, 1]) { const c = M(new THREE.BoxGeometry(0.45, 2.3, 0.08), toon('#7b2f4f'), s * 0.92, -0.05, 0.08, win); c.rotation.z = s * 0.04; }
    const beam = M(new THREE.PlaneGeometry(1.5, 3.2), new THREE.MeshBasicMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending }), -2.6, 0.012, -2.2, w, false);
    beam.rotation.x = -Math.PI / 2; beam.rotation.z = -0.35;
    // rug + nest (the monster itself is made by main.js at V.home)
    const rug = M(new THREE.CircleGeometry(3.0, 40), toon(th.rugs[0][0]), V.home.x, 0.01, V.home.z + 0.4, w, false); rug.rotation.x = -Math.PI / 2; rug.scale.y = 0.75;
    const ring = M(new THREE.RingGeometry(2.55, 2.75, 40), toon(th.rugs[0][1]), V.home.x, 0.013, V.home.z + 0.4, w, false); ring.rotation.x = -Math.PI / 2; ring.scale.y = 0.75;
    const nest = d.buildNest(th); nest.position.set(V.home.x, 0, V.home.z); nest.rotation.y = V.home.yaw * 0.5; w.add(nest);
    // the loot the thief is after, a lamp by the nest, a bit of clutter at the walls
    const chest = AS.treasure('chest') || d.buildTreasure('chest'); if (chest) { chest.position.set(0.1, 0, -0.1); chest.rotation.y = 0.5; w.add(chest); }
    const lamp = AS.decor('lamp'); if (lamp) { lamp.position.set(4.9, 0, -3.4); w.add(lamp); }
    const shelf = AS.furniture('bookshelf', 0.9, 0.3) || d.buildFurniture('bookshelf', 0.9, 0.3); if (shelf) { shelf.position.set(-0.6, 0, -3.85); w.add(shelf); }
    for (const [k, x, z, r] of [['crate', -5.2, -2.4, 0.3], ['plant', 5.3, 0.6, 0]]) { const o = AS.furniture(k, 0.3, 0.3) || d.buildFurniture(k, 0.3, 0.3); if (o) { o.position.set(x, 0, z); o.rotation.y = r; w.add(o); } }
    const cn = AS.treasure('candle') || d.buildTreasure('candle'); if (cn) { cn.position.set(-1.9, 0, -0.6); w.add(cn); }
    // lights: cool moonlight, a warm lamp over the nest, one candle by the thief
    d.hemi.intensity = 0.3; d.sun.intensity = 0.2; d.moon.intensity = 0.55; d.scene.environmentIntensity = 0.12; d.lantern.intensity = 0;
    d.nestLight.position.set(3.6, 2.6, -1.0); d.nestLight.intensity = 9;
    d.candles.forEach((c, i) => { c.userData.on = i === 0; c.position.set(-1.9, 0.75, -0.6); c.intensity = i === 0 ? 2.6 : 0; });
    const p = d.player; p.group.visible = true; p.sack.visible = true; place(p);
  }
  function place(p) {
    const pg = p.group; pg.position.lerpVectors(A, B, V.u);
    const dx = (B.x - A.x) * V.dir, dz = (B.z - A.z) * V.dir;
    pg.rotation.y = V.wait > 0 && V.peek === 'none' ? pg.rotation.y : Math.atan2(dx, dz);
  }
  function update(dt) {
    if (!V.built) return;
    V.peekT -= dt;
    if (V.peekT <= 0) {
      if (V.peek === 'none') { V.peek = 'warn'; V.peekT = WARN; }
      else if (V.peek === 'warn') { V.peek = 'open'; V.peekT = rnd(OPEN); }
      else { V.peek = 'none'; V.peekT = rnd(GAP); V.snoreT = Math.max(V.snoreT, 1.2); }
    }
    V.snoreT -= dt;
    if (V.snoreT <= 0) { V.snoreT = rnd(SNORE); if (V.peek === 'none' && d.snore) d.snore(); }
    const p = d.player;
    if (V.peek === 'open') V.m = 0; // freeze!
    else if (V.wait > 0) { V.wait -= dt; V.m = 0; if (V.wait <= 0) V.dir = -V.dir; }
    else {
      V.m = 0.18; V.u += V.dir * SPEED * dt / A.distanceTo(B);
      if (V.u >= 1 || V.u <= 0) { V.u = Math.min(1, Math.max(0, V.u)); V.wait = V.dir > 0 ? 2.2 : 1.0; }
    }
    place(p);
  }
  const leave = () => { V.built = false; };
  return { build, update, leave, V, get built() { return V.built; } };
}
