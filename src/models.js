import * as THREE from 'three';

// ---------- material helper ----------
// Same material model as the KayKit glTFs (MeshStandardMaterial, soft roughness) so procedural
// and downloaded models read as one style under the same lights + environment map.
const cache = new Map();
export function toon(color, o = {}) {
  const k = `${color}|${o.emissive || ''}|${o.ei || 0}|${o.opacity ?? 1}|${o.side || 0}|${o.metal || 0}`;
  if (!o.unique && cache.has(k)) return cache.get(k);
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.metal ? 0.32 : 0.72, metalness: o.metal ? 0.75 : 0 });
  if (o.map) m.map = o.map;
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei ?? 1; }
  if (o.opacity !== undefined && o.opacity < 1) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
  if (o.side) m.side = THREE.DoubleSide;
  if (!o.unique) cache.set(k, m);
  return m;
}
export function M(geo, mat, x = 0, y = 0, z = 0, parent = null, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const S = (r, w = 12, h = 8) => new THREE.SphereGeometry(r, w, h);
const B = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- PLAYER: tiny hooded thief ----------
export function buildPlayer() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const hoodie = toon('#4057b5'), skin = toon('#ffd9b8'), dark = toon('#2a2238'), white = toon('#ffffff');
  M(new THREE.CapsuleGeometry(0.26, 0.22, 4, 8), hoodie, 0, 0.42, 0, body);
  M(S(0.3, 10, 8), skin, 0, 0.92, 0.04, body);
  const hood = M(S(0.335, 12, 8), hoodie, 0, 0.97, -0.07, body); hood.scale.set(1.02, 1, 0.95);
  for (const s of [-1, 1]) { const e = M(new THREE.ConeGeometry(0.09, 0.2, 8), hoodie, s * 0.19, 1.26, -0.05, body); e.rotation.z = -s * 0.4; }
  const mask = M(new THREE.TorusGeometry(0.3, 0.04, 6, 14), dark, 0, 0.97, 0.04, body); mask.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    M(S(0.08, 8, 6), white, s * 0.11, 0.97, 0.3, body);
    M(S(0.045, 8, 6), dark, s * 0.11, 0.97, 0.36, body);
    M(S(0.017, 6, 4), white, s * 0.1 + 0.015, 0.99, 0.398, body, false);
    const bl = M(S(0.05, 8, 6), toon('#ff9db0'), s * 0.19, 0.84, 0.27, body, false); bl.scale.set(1, 0.55, 0.4);
    M(S(0.075, 8, 6), skin, s * 0.29, 0.44, 0.08, body);
  }
  const feet = [-1, 1].map((s) => { const f = M(S(0.11, 8, 6), dark, s * 0.12, 0.08, 0.02, g); f.scale.set(1, 0.7, 1.3); return f; });
  const sack = new THREE.Group(); sack.position.set(0, 0.58, -0.3); body.add(sack);
  M(S(0.25, 10, 8), toon('#d1a463'), 0, 0, 0, sack);
  M(new THREE.ConeGeometry(0.08, 0.15, 8), toon('#a87b42'), 0, 0.27, 0, sack);
  const patch = M(S(0.07, 8, 6), toon('#ffd65a', { metal: 1, emissive: '#ffb000', ei: 0.4 }), 0.12, 0.08, -0.2, sack, false); patch.scale.set(1, 1, 0.4);
  // shadow blob for readability
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; g.add(blob);
  return { group: g, body, feet, sack, blob };
}

// ---------- MONSTER ----------
export function buildMonster(type) {
  const g = new THREE.Group(); const pivot = new THREE.Group(); g.add(pivot);
  const col = toon(type.color), bel = toon(type.belly), dark = toon('#2a1f33'), cream = toon('#fff1cf'), white = toon('#ffffff');
  const spotC = toon(new THREE.Color(type.color).multiplyScalar(0.78).getStyle());
  const body = M(S(1.4, 16, 12), col, 0, 1.15, -0.2, pivot); body.scale.set(1.25, 0.85, 1.1);
  const belly = M(S(1.05, 12, 8), bel, 0, 0.95, 0.5, pivot); belly.scale.set(1.12, 0.78, 0.62);
  for (let i = 0; i < 5; i++) { const sp = M(S(rnd(0.18, 0.3), 8, 6), spotC, rnd(-1.2, 1.2), rnd(1.6, 2.0), rnd(-1.0, 0.2), pivot, false); sp.scale.set(1, 0.4, 1); }
  // back spikes
  for (let i = 0; i < 4; i++) { const c = M(new THREE.ConeGeometry(0.17, 0.42, 8), cream, 0, 2.0 - i * 0.12, -0.2 - i * 0.45, pivot); c.rotation.x = -0.5 - i * 0.25; }
  // head
  const head = new THREE.Group(); head.position.set(0, 1.4, 1.05); pivot.add(head);
  const hm = M(S(0.92, 14, 10), col, 0, 0, 0, head); hm.scale.set(1.15, 0.9, 0.95);
  const muz = M(S(0.5, 10, 8), bel, 0, -0.22, 0.66, head); muz.scale.set(1.35, 0.78, 0.8);
  for (const s of [-1, 1]) M(S(0.06, 6, 4), dark, s * 0.17, -0.08, 1.05, head);
  const bubble = M(S(0.13, 10, 8), toon('#bfe9ff', { opacity: 0.65, emissive: '#9fd8ff', ei: 0.3 }), 0.2, -0.17, 1.12, head, false);
  const eyesClosed = [], eyesOpen = [], pupils = [], brows = [];
  for (const s of [-1, 1]) {
    const ec = M(new THREE.TorusGeometry(0.15, 0.035, 6, 12, Math.PI), dark, s * 0.38, 0.18, 0.8, head, false);
    ec.rotation.z = Math.PI; eyesClosed.push(ec);
    const eo = M(S(0.21, 10, 8), white, s * 0.38, 0.2, 0.74, head, false); eo.visible = false; eyesOpen.push(eo);
    const pu = M(S(0.11, 8, 6), dark, 0, 0, 0.14, eo, false); pupils.push(pu);
    M(S(0.035, 6, 4), white, 0.04, 0.05, 0.09, pu, false);
    const br = M(B(0.3, 0.07, 0.07), dark, s * 0.38, 0.47, 0.78, head, false); br.rotation.z = s * 0.35; br.visible = false; brows.push(br);
    const ck = M(S(0.13, 8, 6), toon('#ff8fb0'), s * 0.62, -0.08, 0.66, head, false); ck.scale.set(1, 0.55, 0.4);
    const horn = M(new THREE.ConeGeometry(0.17, 0.62, 8), cream, s * 0.5, 0.78, -0.05, head); horn.rotation.z = -s * 0.35;
    const ear = M(S(0.26, 8, 6), col, s * 0.9, 0.3, -0.1, head); ear.scale.set(0.45, 1, 0.3); ear.rotation.z = -s * 0.9;
  }
  const mouth = M(S(0.32, 10, 8), toon('#7a1f3a'), 0, -0.42, 0.8, head, false); mouth.scale.set(1.1, 0.6, 0.5); mouth.visible = false;
  const teeth = [];
  for (const s of [-1, 1]) { const t = M(new THREE.ConeGeometry(0.06, 0.14, 6), white, s * 0.16, -0.27, 0.95, head, false); t.rotation.x = Math.PI; t.visible = false; teeth.push(t); }
  const smile = M(new THREE.TorusGeometry(0.16, 0.03, 4, 10, Math.PI), dark, 0, -0.33, 0.97, head, false); smile.rotation.z = Math.PI;
  // arms (lying forward)
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.85, 0.42, 1.35); pivot.add(a);
    const am = M(new THREE.CapsuleGeometry(0.3, 0.6, 4, 8), col, 0, 0, 0, a); am.rotation.x = Math.PI / 2;
    for (let i = -1; i <= 1; i++) M(new THREE.ConeGeometry(0.06, 0.15, 6), cream, i * 0.13, -0.05, 0.62, a).rotation.x = Math.PI / 2;
    arms.push(a);
  }
  const feet = [];
  for (const s of [-1, 1]) { const f = M(S(0.45, 10, 8), col, s * 1.15, 0.3, -0.1, pivot); f.scale.set(0.9, 0.6, 1.25); feet.push(f); }
  // tail
  const tail = new THREE.Group(); pivot.add(tail);
  for (let i = 0; i < 4; i++) {
    const a = -0.4 + i * 0.64; const r = 0.38 - i * 0.08;
    M(S(r, 8, 6), col, Math.sin(a) * 1.85 + 0.2, 0.35, -Math.cos(a) * 1.5 - 0.1, tail);
  }
  const tip = M(new THREE.ConeGeometry(0.22, 0.45, 8), cream, Math.sin(1.85) * 1.85 + 0.4, 0.4, -Math.cos(1.85) * 1.5 + 0.1, tail); tip.rotation.z = -Math.PI / 2;
  // dizzy stars ring
  const stars = new THREE.Group(); stars.position.set(0, 2.5, 1.0); stars.visible = false; pivot.add(stars);
  for (let i = 0; i < 4; i++) { const st = M(new THREE.OctahedronGeometry(0.14), toon('#ffe066', { emissive: '#ffcc00', ei: 0.8 }), Math.cos(i * 1.57) * 0.6, 0, Math.sin(i * 1.57) * 0.6, stars, false); st.scale.y = 0.5; }
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1.9, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.03; g.add(sh);
  addAccessories(type, head, pivot);
  g.scale.setScalar(type.scale);
  return { group: g, pivot, head, body, eyesClosed, eyesOpen, pupils, brows, mouth, teeth, smile, bubble, arms, feet, tail, stars };
}

// The themed monsters' outfits. head / pivot use the procedural monster's coordinates (head centre; body with the floor
// at y=0); the Hornbeast passes adapter groups that map them onto its own head and back. ownHorns: the body already
// has horns (the Hornbeast tints its own instead of growing Oozefang's crystal cones).
export function addAccessories(type, head, pivot, { ownHorns = false } = {}) {
  const white = toon('#ffffff'), cream = toon('#fff1cf');
  if (type.wyrm) { // Bookwyrm: round reading glasses, a striped nightcap, books stacked on its back, little wing fins
    const gold = toon('#d9b26a', { metal: 1 });
    for (const sx of [-1, 1]) { const rim = M(new THREE.TorusGeometry(0.24, 0.035, 6, 14), gold, sx * 0.38, 0.2, 0.93, head, false); void rim; }
    M(B(0.3, 0.035, 0.035), gold, 0, 0.22, 0.96, head, false);
    const cap = new THREE.Group(); cap.position.set(0.1, 0.72, -0.05); cap.rotation.z = -0.35; head.add(cap);
    M(new THREE.TorusGeometry(0.55, 0.12, 6, 14), toon('#fff4e0'), 0, 0, 0, cap).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) M(C(0.5 - i * 0.16, 0.56 - i * 0.16, 0.28, 10), toon(i % 2 ? '#fff4e0' : '#4a6fbf'), 0.12 * i, 0.16 + i * 0.26, 0, cap);
    M(S(0.13, 8, 6), toon('#fff4e0'), 0.5, 0.85, 0, cap);
    const bookCols = ['#b3262f', '#2f5a8a', '#d9a03a', '#3f7a4a'];
    for (let i = 0; i < 4; i++) { const bk = M(B(0.9 - i * 0.08, 0.2, 0.62), toon(bookCols[i]), (i % 2 ? 0.08 : -0.06), 2.02 + i * 0.2, -0.75, pivot); bk.rotation.y = i * 0.35 - 0.4; M(B(0.86 - i * 0.08, 0.16, 0.6), toon('#fff6e0'), (i % 2 ? 0.1 : -0.04), 2.02 + i * 0.2, -0.73, pivot, false).rotation.y = i * 0.35 - 0.4; }
    for (const sx of [-1, 1]) { const fin = M(new THREE.ConeGeometry(0.35, 0.8, 4), toon(new THREE.Color(type.color).multiplyScalar(0.75).getStyle()), sx * 1.55, 1.55, -0.4, pivot); fin.rotation.set(0.2, 0, sx * 1.1); fin.scale.z = 0.25; }
  } else if (type.pirate) { // Captain Barnaby: pirate tricorn hat, eye patch, tentacle whiskers
    const black = toon('#222228'), gold = toon('#d9b26a', { metal: 1 });
    const hat = new THREE.Group(); hat.position.set(0, 0.82, -0.02); head.add(hat);
    M(C(0.7, 0.85, 0.32, 10), black, 0, 0.1, 0, hat);
    M(new THREE.TorusGeometry(0.9, 0.1, 6, 16), black, 0, 0.02, 0, hat).rotation.x = Math.PI / 2;
    M(new THREE.TorusGeometry(0.92, 0.04, 4, 16), gold, 0, 0.08, 0, hat).rotation.x = Math.PI / 2;
    // skull badge on front
    M(S(0.12, 8, 6), white, 0, 0.18, 0.82, hat, false);
    // pirate eye patch
    const patch = M(S(0.16, 8, 6), black, -0.38, 0.22, 0.95, head, false); patch.scale.set(1, 1, 0.3);
    const strap = M(new THREE.TorusGeometry(0.78, 0.03, 4, 16), black, 0, 0.2, 0, head, false); strap.rotation.set(0.2, 0, -0.3);
    // tentacle whiskers
    for (const s of [-1, 1]) {
      const tent = M(new THREE.CylinderGeometry(0.04, 0.1, 0.45, 6), toon(type.belly), s * 0.35, -0.42, 0.92, head, false);
      tent.rotation.set(0.4, 0, s * 0.4);
    }
  } else if (type.alchemist) { // Professor Oozefang: glowing crystal horns, potion flask on back, slime orbs
    const arcane = toon('#00ffcc', { emissive: '#00ffcc', ei: 0.6 });
    if (!ownHorns) for (const s of [-1, 1]) {
      const horn = M(new THREE.ConeGeometry(0.18, 0.75, 6), arcane, s * 0.55, 0.88, 0.05, head);
      horn.rotation.set(-0.2, 0, -s * 0.45);
    }
    // glowing crystal on back
    const crystal = M(new THREE.OctahedronGeometry(0.35), arcane, 0, 2.1, -0.7, pivot);
    crystal.scale.set(0.8, 1.4, 0.8);
    // potion flask strapped to side
    const flask = new THREE.Group(); flask.position.set(1.4, 1.4, -0.2); pivot.add(flask);
    M(S(0.25, 10, 8), toon('#ff00aa', { emissive: '#ff00aa', ei: 0.5, transparent: true, opacity: 0.85 }), 0, 0, 0, flask);
    M(C(0.08, 0.08, 0.18, 8), cream, 0, 0.28, 0, flask);
  }
}

export function buildNest(theme) {
  const g = new THREE.Group();
  const cush = toon(theme.nest), cush2 = toon(theme.nest2);
  const ring = M(new THREE.TorusGeometry(2.0, 0.55, 8, 20), cush, 0, 0.38, 0, g); ring.rotation.x = -Math.PI / 2; ring.scale.z = 0.8;
  M(C(2.05, 2.1, 0.25, 16), cush2, 0, 0.12, 0, g);
  const pcols = ['#ffe3a1', '#bfe6ff', '#ffc6dc'];
  for (let i = 0; i < 3; i++) { const p = M(S(0.55, 10, 8), toon(pcols[i]), -1.6 + i * 1.6, 0.7, -1.7, g); p.scale.set(1.3, 0.55, 0.8); p.rotation.y = rnd(-0.3, 0.3); }
  // blanket corner
  const bl = M(B(1.4, 0.08, 1.0), toon('#fff4e0'), 1.5, 0.3, 1.2, g); bl.rotation.y = 0.5;
  return g;
}

// ---------- FURNITURE (footprint hw/hd in local axes) ----------
// library shelf: lower, books on both faces and standing on top, so the aisles read as a library from above
function libShelf(w, d) {
  const g = new THREE.Group(); const wood = toon('#6b4126'), wood2 = toon('#4e2e1a'); const h = 1.55;
  M(B(w, h, d), wood2, 0, h / 2, 0, g); M(B(w + 0.08, 0.08, d + 0.08), wood, 0, h, 0, g);
  const cols = ['#b3262f', '#2f5a8a', '#d9a03a', '#3f7a4a', '#7b4aa8', '#c46a2a', '#e8d9a8'];
  const col = () => toon(cols[Math.floor(Math.random() * cols.length)]);
  for (const side of [-1, 1]) for (let s = 0; s < 2; s++) {
    const y = 0.2 + s * 0.68; M(B(w + 0.02, 0.06, d + 0.02), wood, 0, y, 0, g, false);
    for (let x = -w / 2 + 0.12; x < w / 2 - 0.16;) {
      const bw = rnd(0.25, 0.45), bh = rnd(0.4, 0.55);
      M(B(bw, bh, 0.12), col(), x + bw / 2, y + 0.03 + bh / 2, side * (d / 2 - 0.02), g, false);
      x += bw + 0.04;
    }
  }
  for (let x = -w / 2 + 0.18; x < w / 2 - 0.24;) {
    const bw = rnd(0.22, 0.38);
    M(B(bw, rnd(0.25, 0.36), d * 0.75), col(), x + bw / 2, h + 0.17, 0, g);
    x += bw + 0.06;
  }
  return g;
}
function bookshelf(w, d) {
  const g = new THREE.Group(); const wood = toon('#7a4a2e'), wood2 = toon('#5e3820'); const h = 2.4;
  M(B(w, h, d), wood2, 0, h / 2, 0, g);
  const bookCols = ['#e36d6d', '#6db3e3', '#f2c45a', '#7fd17f', '#c48be0', '#ff9f6b', '#5bc9b8'];
  for (let s = 0; s < 3; s++) {
    const y = 0.25 + s * 0.75;
    M(B(w + 0.04, 0.08, d + 0.04), wood, 0, y, 0.0, g);
    let x = -w / 2 + 0.14;
    while (x < w / 2 - 0.18) {
      const bw = rnd(0.24, 0.42), bh = rnd(0.42, 0.58);
      const b = M(B(bw, bh, d * 0.7), toon(bookCols[Math.floor(Math.random() * bookCols.length)]), x + bw / 2, y + 0.04 + bh / 2, 0.08, g, false);
      if (Math.random() < 0.2) b.rotation.z = 0.15;
      x += bw + 0.04;
    }
  }
  M(B(w + 0.1, 0.1, d + 0.1), wood, 0, h, 0, g);
  return g;
}
function wardrobe(w, d) {
  const g = new THREE.Group(); const h = 2.7; const c = toon('#a0643f'), c2 = toon('#8a5232'), gold = toon('#ffd65a', { metal: 1, emissive: '#aa7700', ei: 0.3 });
  M(B(w, h, d), c2, 0, h / 2, 0, g);
  for (const s of [-1, 1]) { M(B(w / 2 - 0.08, h - 0.4, 0.05), c, s * w / 4, h / 2 + 0.05, d / 2, g); M(S(0.06, 10, 8), gold, s * 0.1, h / 2, d / 2 + 0.06, g); }
  M(B(w + 0.15, 0.14, d + 0.15), c, 0, h, 0, g);
  return g;
}
function table(w, d) {
  const g = new THREE.Group(); const c = toon('#b0723f'), cloth = toon('#f6e3c0');
  M(B(w, 0.12, d), c, 0, 0.9, 0, g);
  M(B(w * 0.7, 0.02, d + 0.06), cloth, 0, 0.97, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) M(C(0.06, 0.05, 0.9, 8), c, sx * (w / 2 - 0.12), 0.45, sz * (d / 2 - 0.12), g);
  // candle
  M(C(0.07, 0.07, 0.28, 10), toon('#fff4e0'), 0.3, 1.12, 0, g);
  const fl = M(S(0.06, 8, 6), toon('#ffcc55', { emissive: '#ffaa00', ei: 2 }), 0.3, 1.32, 0, g, false); fl.scale.y = 1.6; fl.userData.flame = true;
  M(C(0.12, 0.1, 0.18, 12), toon('#e8f4ff'), -0.3, 1.06, 0.1, g);
  return g;
}
function crate(w, d) {
  const g = new THREE.Group(); const c = toon('#c99a5b'), e = toon('#8f6533');
  const stack = Math.random() < 0.5 ? 2 : 1;
  for (let i = 0; i < stack; i++) {
    const s = i ? 0.75 : 1; const y = i ? 1 + 0.375 : 0.5; const gg = new THREE.Group(); gg.position.y = y; gg.rotation.y = i ? rnd(-0.4, 0.4) : 0; g.add(gg);
    M(B(w * s, s, d * s), c, 0, 0, 0, gg);
    for (const sx of [-1, 1]) M(B(0.08, s + 0.02, d * s + 0.02), e, sx * (w * s / 2 - 0.04), 0, 0, gg);
    const x = M(B(w * s * 1.15, 0.08, 0.02), e, 0, 0, d * s / 2 + 0.01, gg); x.rotation.z = 0.75;
  }
  return g;
}
function barrel() {
  const g = new THREE.Group(); const c = toon('#a86a3c'), r = toon('#6b6b7a');
  M(C(0.42, 0.42, 1.1, 18), c, 0, 0.55, 0, g);
  const mid = M(C(0.47, 0.47, 0.5, 18), c, 0, 0.55, 0, g); mid.scale.y = 1;
  for (const y of [0.2, 0.9]) M(new THREE.TorusGeometry(0.44, 0.03, 6, 20), r, 0, y, 0, g).rotation.x = Math.PI / 2;
  return g;
}
function plant() {
  const g = new THREE.Group(); M(C(0.32, 0.24, 0.5, 14), toon('#e07a5f'), 0, 0.25, 0, g);
  M(C(0.34, 0.34, 0.08, 14), toon('#c9654c'), 0, 0.5, 0, g);
  const lc = [toon('#5cbf6a'), toon('#47a85a'), toon('#7ad17f')];
  for (let i = 0; i < 6; i++) { const l = M(S(0.25, 12, 10), lc[i % 3], rnd(-0.2, 0.2), 0.75 + rnd(0, 0.5), rnd(-0.2, 0.2), g); l.scale.set(1, 1.4, 1); }
  return g;
}
function armchair(w, d) {
  const g = new THREE.Group(); const c = toon('#e27a8f'), c2 = toon('#c9637a');
  M(B(w, 0.45, d), c2, 0, 0.3, 0, g);
  const seat = M(B(w - 0.3, 0.2, d - 0.25), c, 0, 0.62, 0.08, g); seat.scale.y = 1;
  M(B(w, 0.9, 0.25), c2, 0, 0.9, -d / 2 + 0.12, g);
  for (const s of [-1, 1]) M(new THREE.CapsuleGeometry(0.14, d - 0.3, 4, 10), c, s * (w / 2 - 0.12), 0.72, 0, g).rotation.x = Math.PI / 2;
  return g;
}
function blocks() {
  const g = new THREE.Group(); const cs = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'];
  const pos = [[-0.15, 0.17, 0], [0.18, 0.17, 0.05], [0.0, 0.5, 0.02]];
  pos.forEach((p, i) => { const b = M(B(0.33, 0.33, 0.33), toon(cs[i]), ...p, g); b.rotation.y = rnd(-0.5, 0.5); });
  return g;
}
function vaseStack() {
  const g = new THREE.Group();
  const stoolCol = toon('#7a4a2e'), p1 = toon('#e0f4ff'), p2 = toon('#4a90e2'), gold = toon('#ffd65a');
  M(C(0.22, 0.2, 0.3, 12), stoolCol, 0, 0.15, 0, g);
  M(C(0.25, 0.25, 0.04, 12), stoolCol, 0, 0.32, 0, g);
  const v1 = M(S(0.22, 12, 10), p1, 0, 0.56, 0, g); v1.scale.set(1, 1.25, 1);
  M(C(0.12, 0.17, 0.15, 10), p2, 0, 0.77, 0, g);
  const v2 = M(S(0.16, 10, 8), p2, 0.02, 0.95, -0.01, g); v2.scale.set(1, 1.2, 1); v2.rotation.z = 0.08;
  const v3 = M(C(0.12, 0.07, 0.12, 10), gold, 0.04, 1.13, -0.02, g); v3.rotation.z = -0.12;
  return g;
}
export function buildFurniture(kind, hw, hd) {
  const w = hw * 2, d = hd * 2;
  switch (kind) {
    case 'bookshelf': return bookshelf(w, d);
    case 'libshelf': return libShelf(w, d);
    case 'wardrobe': return wardrobe(w, d);
    case 'table': return table(w, d);
    case 'crate': return crate(w, d);
    case 'barrel': return barrel();
    case 'plant': return plant();
    case 'armchair': return armchair(w, d);
    case 'blocks': return blocks();
    case 'vaseStack': return vaseStack();
  }
  return new THREE.Group();
}

export function buildCat() {
  const g = new THREE.Group();
  const fur = toon('#ff9f43'), dark = toon('#222');
  const body = M(S(0.2, 12, 10), fur, 0, 0.11, 0, g); body.scale.set(1.2, 0.75, 1.35);
  const tail = M(new THREE.TorusGeometry(0.2, 0.045, 8, 16, Math.PI * 1.4), fur, 0, 0.06, 0, g);
  tail.rotation.x = Math.PI / 2; tail.rotation.z = -0.5;
  M(S(0.13, 10, 8), fur, 0.15, 0.13, 0.15, g);
  for (const s of [-1, 1]) {
    const ear = M(new THREE.ConeGeometry(0.04, 0.07, 4), fur, 0.15 + s * 0.05, 0.22, 0.16, g);
    ear.rotation.y = s * 0.3;
  }
  for (const s of [-1, 1]) {
    const eye = M(B(0.035, 0.008, 0.008), dark, 0.21, 0.135, 0.15 + s * 0.035, g, false);
    eye.rotation.y = Math.PI / 4;
  }
  return g;
}

export function buildDuck() {
  const g = new THREE.Group(); const y = toon('#ffd43b'), o = toon('#ff922b'), dk = toon('#222');
  const b = M(S(0.2, 14, 10), y, 0, 0.16, 0, g); b.scale.set(1, 0.8, 1.25);
  M(S(0.13, 14, 10), y, 0, 0.36, 0.12, g);
  const bk = M(new THREE.ConeGeometry(0.06, 0.14, 8), o, 0, 0.34, 0.27, g); bk.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) M(S(0.025, 6, 6), dk, s * 0.06, 0.4, 0.22, g, false);
  return g;
}

// ---------- TREASURE ----------
const GEM_COLS = ['#ff4d6d', '#4dd6ff', '#5cff8a', '#c77dff', '#ffd23f'];
export function buildTreasure(kind) {
  const g = new THREE.Group(); const gold = toon('#ffcf3f', { metal: 1, emissive: '#c98a00', ei: 0.45 });
  if (kind === 'coins') {
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const c = M(C(0.13, 0.13, 0.04, 16), gold, rnd(-0.12, 0.12), 0.03 + i * 0.035, rnd(-0.12, 0.12), g); c.rotation.set(rnd(-0.15, 0.15), 0, rnd(-0.15, 0.15)); }
    const lean = M(C(0.13, 0.13, 0.04, 16), gold, 0.2, 0.13, 0, g); lean.rotation.z = 1.2;
  } else if (kind === 'gem') {
    const c = GEM_COLS[Math.floor(Math.random() * GEM_COLS.length)];
    const gm = M(new THREE.OctahedronGeometry(0.22), toon(c, { emissive: c, ei: 0.55 }), 0, 0.35, 0, g); gm.scale.set(1, 1.35, 1);
    g.userData.spin = gm;
  } else if (kind === 'vase') { // blue-and-white porcelain vase
    const pts = [[0.0, 0], [0.13, 0], [0.15, 0.04], [0.22, 0.2], [0.24, 0.34], [0.18, 0.5], [0.1, 0.6], [0.11, 0.66], [0.14, 0.7]].map(([r, y]) => new THREE.Vector2(r, y));
    M(new THREE.LatheGeometry(pts, 24), toon('#f4f6ff'), 0, 0, 0, g);
    for (const [y, r] of [[0.22, 0.226], [0.42, 0.214], [0.62, 0.105]]) M(new THREE.TorusGeometry(r, 0.018, 6, 28), toon('#3f63c9'), 0, y, 0, g, false).rotation.x = Math.PI / 2;
    M(S(0.06, 10, 8), toon('#3f63c9'), 0.21, 0.32, 0.06, g, false).scale.set(0.3, 1, 1);
  } else if (kind === 'watch') { // gold pocket watch with chain
    const w = new THREE.Group(); w.position.y = 0.2; w.rotation.x = -0.9; g.add(w);
    M(C(0.17, 0.17, 0.05, 24), gold, 0, 0, 0, w).rotation.x = Math.PI / 2;
    M(C(0.14, 0.14, 0.01, 24), toon('#fff8e6'), 0, 0, 0.027, w, false).rotation.x = Math.PI / 2;
    M(new THREE.BoxGeometry(0.012, 0.1, 0.01), toon('#2a1f33'), 0, 0.04, 0.035, w, false);
    M(new THREE.BoxGeometry(0.07, 0.012, 0.01), toon('#2a1f33'), 0.03, 0, 0.035, w, false);
    M(new THREE.TorusGeometry(0.035, 0.012, 6, 12), gold, 0, 0.2, 0, w, false);
    for (let i = 0; i < 6; i++) M(new THREE.TorusGeometry(0.03, 0.008, 4, 8), gold, 0.08 + i * 0.05, 0.23 + Math.sin(i) * 0.03, 0, w, false).rotation.y = i % 2 ? Math.PI / 2 : 0;
  } else if (kind === 'crown') {
    M(new THREE.CylinderGeometry(0.3, 0.27, 0.2, 20, 1, true), toon('#ffcf3f', { metal: 1, emissive: '#c98a00', ei: 0.5, side: 1 }), 0, 0.2, 0, g);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      M(new THREE.ConeGeometry(0.06, 0.2, 8), gold, Math.cos(a) * 0.28, 0.38, Math.sin(a) * 0.28, g);
      M(S(0.035, 8, 6), toon(GEM_COLS[i % 5], { emissive: GEM_COLS[i % 5], ei: 0.7 }), Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3, g, false);
    }
    M(C(0.27, 0.27, 0.03, 20), toon('#b0164a'), 0, 0.12, 0, g, false);
    g.scale.setScalar(1.3);
  } else if (kind === 'chest') {
    const wood = toon('#9b5e34'), band = toon('#ffcf3f', { metal: 1, emissive: '#c98a00', ei: 0.3 });
    M(B(0.9, 0.5, 0.6), wood, 0, 0.25, 0, g);
    for (const s of [-1, 1]) M(B(0.08, 0.52, 0.62), band, s * 0.3, 0.25, 0, g);
    const inner = M(B(0.82, 0.04, 0.52), toon('#ffe066', { emissive: '#ffb000', ei: 1.2 }), 0, 0.49, 0, g, false);
    const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); g.add(lid);
    const lm = M(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16, 1, false, 0, Math.PI), wood, 0, 0, 0.3, lid); lm.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) { const bb = M(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 16, 1, false, 0, Math.PI), band, s * 0.3, 0, 0.3, lid); bb.rotation.z = Math.PI / 2; }
    M(B(0.12, 0.16, 0.06), band, 0, 0.0, 0.62, lid);
    g.userData.lid = lid; g.userData.inner = inner;
  } else if (kind === 'ticker') { // cursed ticking clock: little dark mantel clock with a sickly green face
    const wood = toon('#3d2433');
    M(B(0.36, 0.42, 0.2), wood, 0, 0.21, 0, g);
    M(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 20, 1, false, -Math.PI / 2, Math.PI), wood, 0, 0.42, 0, g).rotation.x = Math.PI / 2;
    const face = M(C(0.13, 0.13, 0.02, 20), toon('#c8ffb0', { emissive: '#6dff4a', ei: 0.8 }), 0, 0.3, 0.105, g, false); face.rotation.x = Math.PI / 2;
    const hand = M(B(0.012, 0.1, 0.01), toon('#1a1020'), 0, 0.33, 0.12, g, false); g.userData.spin = null; g.userData.tick = hand;
    for (const s of [-1, 1]) M(S(0.04, 8, 6), gold, s * 0.14, 0.02, 0.08, g, false);
  } else if (kind === 'orb') { // whispering orb: glowing violet ball on a claw stand
    M(C(0.1, 0.14, 0.08, 12), toon('#2a1f33'), 0, 0.04, 0, g);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const c = M(new THREE.ConeGeometry(0.03, 0.14, 6), gold, Math.cos(a) * 0.1, 0.13, Math.sin(a) * 0.1, g, false); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
    const orb = M(S(0.17, 20, 16), toon('#b58cff', { emissive: '#7a3cff', ei: 1.1, rough: 0.15 }), 0, 0.27, 0, g, false);
    g.userData.spin = orb;
  } else if (kind === 'statue') { // heavy stone idol
    const stone = toon('#8d8a99'), dark = toon('#5c596b');
    M(B(0.4, 0.1, 0.4), dark, 0, 0.05, 0, g);
    const body = M(S(0.18, 14, 12), stone, 0, 0.28, 0, g); body.scale.set(1, 1.25, 0.9);
    M(S(0.13, 14, 12), stone, 0, 0.55, 0, g);
    for (const s of [-1, 1]) { M(S(0.05, 8, 6), dark, s * 0.17, 0.62, 0, g); M(S(0.022, 8, 6), toon('#ff5a5a', { emissive: '#ff2a2a', ei: 1.2 }), s * 0.05, 0.57, 0.11, g, false); }
  }
  return g;
}

// ---------- OLD MERCHANT (black market) ----------
// Hunched old man behind his counter: bald dome, round glasses, big white beard, bushy brows, fez, robe.
export function buildMerchant() {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const robe = toon('#6b3d7a'), robe2 = toon('#4f2b5c'), skin = toon('#f1c7a1'), beard = toon('#f4f1ea'), dark = toon('#2a1f33'), gold = toon('#ffcf3f', { metal: 1 });
  const torso = M(S(0.62, 20, 16), robe, 0, 0.9, 0, body); torso.scale.set(1.15, 1, 0.9);
  M(new THREE.TorusGeometry(0.5, 0.06, 8, 24), gold, 0, 0.72, 0, body).rotation.x = Math.PI / 2; // sash
  const head = new THREE.Group(); head.position.set(0, 1.62, 0.12); body.add(head);
  M(S(0.38, 20, 16), skin, 0, 0, 0, head);
  M(S(0.13, 12, 10), toon('#e8a98a'), 0, -0.05, 0.37, head); // nose
  for (const s of [-1, 1]) {
    M(S(0.12, 10, 8), skin, s * 0.37, -0.02, 0, head).scale.set(0.5, 1, 0.8); // ears
    M(new THREE.TorusGeometry(0.085, 0.014, 6, 18), gold, s * 0.14, 0.06, 0.34, head, false); // glasses
    M(S(0.03, 8, 6), dark, s * 0.14, 0.06, 0.35, head, false);
    const brow = M(S(0.09, 10, 8), beard, s * 0.15, 0.19, 0.31, head, false); brow.scale.set(1.4, 0.55, 0.6); brow.rotation.z = s * 0.25;
    const side = M(S(0.14, 10, 8), beard, s * 0.3, -0.05, 0.12, head); side.scale.set(0.7, 1.2, 0.9);
  }
  M(new THREE.BoxGeometry(0.1, 0.012, 0.012), gold, 0, 0.06, 0.35, head, false); // glasses bridge
  const beardG = new THREE.Group(); beardG.position.set(0, -0.22, 0.2); head.add(beardG);
  for (const [x, y, z, r] of [[0, 0, 0.05, 0.26], [-0.16, -0.05, 0, 0.18], [0.16, -0.05, 0, 0.18], [0, -0.22, 0.02, 0.2], [0, -0.38, 0, 0.13]]) M(S(r, 14, 10), beard, x, y, z, beardG);
  const mus = M(S(0.1, 10, 8), beard, 0, 0.12, 0.17, beardG, false); mus.scale.set(1.8, 0.5, 0.6);
  const mouth = M(S(0.05, 8, 6), toon('#7a1f3a'), 0, 0.03, 0.22, beardG, false); mouth.scale.set(1.4, 0.5, 0.5);
  const fez = M(C(0.17, 0.22, 0.24, 16), toon('#c0392b'), 0, 0.36, -0.02, head); fez.rotation.x = -0.15;
  M(C(0.01, 0.01, 0.16, 6), dark, 0.08, 0.46, -0.04, head, false).rotation.z = -0.9; // tassel
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.6, 1.15, 0.1); body.add(a);
    const am = M(new THREE.CapsuleGeometry(0.15, 0.45, 4, 10), robe2, 0, -0.25, 0.15, a); am.rotation.x = -1.1;
    M(S(0.11, 10, 8), skin, 0, -0.42, 0.45, a);
    arms.push(a);
  }
  // magnifying glass in the right hand (he inspects your loot)
  const lens = new THREE.Group(); lens.position.set(0, -0.42, 0.55); arms[1].add(lens);
  M(new THREE.TorusGeometry(0.1, 0.02, 6, 18), gold, 0, 0.12, 0.05, lens, false);
  M(new THREE.CircleGeometry(0.09, 18), toon('#bfe9ff', { opacity: 0.5 }), 0, 0.12, 0.05, lens, false);
  M(C(0.015, 0.015, 0.12, 6), toon('#7a4a2e'), 0, 0.02, 0.05, lens, false);
  return { group: g, body, head, arms, mouth, lens };
}

export function buildPowerup(kind) {
  const g = new THREE.Group();
  if (kind === 'feather') {
    const w = toon('#ffffff', { emissive: '#d8e6ff', ei: 0.4 });
    const f = M(S(0.22, 14, 10), w, 0, 0.45, 0, g); f.scale.set(0.35, 1.1, 0.12); f.rotation.z = 0.5;
    const st = M(C(0.015, 0.015, 0.5, 6), toon('#d6c0a0'), 0.1, 0.35, 0, g); st.rotation.z = 0.5;
  } else {
    const b = toon('#7cc8ff', { emissive: '#4aa8ff', ei: 0.8 });
    M(S(0.13, 14, 10), b, -0.05, 0.3, 0, g).scale.set(1.25, 0.9, 0.9);
    M(C(0.025, 0.025, 0.42, 6), b, 0.08, 0.5, 0, g);
    const fl = M(B(0.16, 0.06, 0.04), b, 0.15, 0.68, 0, g); fl.rotation.z = -0.5;
  }
  g.userData.spin = g;
  return g;
}

export function buildDoor(open = false) {
  const g = new THREE.Group(); const fr = toon('#6b3f24'), dr = toon('#4fbf7a'), gold = toon('#ffd65a', { metal: 1, emissive: '#aa7700', ei: 0.4 });
  M(B(0.2, 2.3, 0.2), fr, -0.7, 1.15, 0, g); M(B(0.2, 2.3, 0.2), fr, 0.7, 1.15, 0, g); M(B(1.6, 0.22, 0.2), fr, 0, 2.3, 0, g);
  const door = new THREE.Group(); door.position.set(-0.6, 0, 0.02); g.add(door);
  M(B(1.2, 2.1, 0.08), dr, 0.6, 1.05, 0, door);
  M(S(0.06, 10, 8), gold, 1.05, 1.05, 0.08, door);
  M(B(0.9, 0.04, 0.02), toon('#3e9a62'), 0.6, 1.5, 0.05, door); M(B(0.9, 0.04, 0.02), toon('#3e9a62'), 0.6, 0.6, 0.05, door);
  door.rotation.y = open ? -1.1 : -0.35;
  g.userData.door = door;
  return g;
}

export function buildWindow(tex) {
  const g = new THREE.Group(); const fr = toon('#f6e3c0');
  M(new THREE.PlaneGeometry(1.4, 1.75), new THREE.MeshBasicMaterial({ map: tex }), 0, 0, 0.01, g, false);
  M(B(1.6, 0.12, 0.12), fr, 0, 0.92, 0.05, g); M(B(1.6, 0.16, 0.18), fr, 0, -0.92, 0.07, g);
  M(B(0.12, 1.9, 0.12), fr, -0.76, 0, 0.05, g); M(B(0.12, 1.9, 0.12), fr, 0.76, 0, 0.05, g);
  M(B(0.06, 1.75, 0.06), fr, 0, 0, 0.05, g); M(B(1.4, 0.06, 0.06), fr, 0, 0.1, 0.05, g);
  const cur = toon('#d36b8a');
  g.userData.curtains = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * 0.95, 1.0, 0.15); g.add(piv); // hinge at the rod
    const c = M(S(0.35, 12, 10), cur, 0, -0.85, 0, piv); c.scale.set(0.5, 2.8, 0.35);
    g.userData.curtains.push(piv);
  }
  M(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), toon('#c99a5b'), 0, 1.02, 0.15, g).rotation.z = Math.PI / 2;
  return g;
}
