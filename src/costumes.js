// Costume pieces, built from primitives and hung on the Rogue's bones (head / chest) so they move with the animations.
// hat: on top of the hood · outfit: recolours the clothes + one accessory · bag: the loot sack's look · lantern: a little hand lantern.
import * as THREE from 'three';
import { toon } from './models.js';
import { RULES } from './rules.js';

const S = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
const C = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s);
const B = (x, y, z) => new THREE.BoxGeometry(x, y, z);
function M(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
const gold = () => toon('#ffcf3f', { metal: 1, emissive: '#c98a00', ei: 0.35 });
const glow = (c, ei = 1.2) => toon(c, { emissive: c, ei });
function star5(r, depth = 0.03) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
}

// ---------- hats: origin = top of the hood, w = head width ----------
const HATS = {
  ninja(g, w) { // headband with two tails
    const red = toon('#d8333f');
    M(new THREE.TorusGeometry(w * 0.47, w * 0.05, 8, 28), red, 0, -w * 0.24, 0, g).rotation.x = Math.PI / 2;
    M(C(w * 0.1, w * 0.1, w * 0.04, 12), toon('#c9ccd8', { metal: 1 }), 0, -w * 0.24, w * 0.47, g).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const tl = M(B(w * 0.09, w * 0.04, w * 0.42), red, s * w * 0.08, -w * 0.3, -w * 0.62, g); tl.rotation.set(-0.5, s * 0.3, 0); }
  },
  pirate(g, w) { // tricorn with a skull
    const blk = toon('#2a2230');
    M(C(w * 0.55, w * 0.6, w * 0.06, 3), blk, 0, w * 0.02, 0, g).rotation.y = Math.PI;
    M(C(w * 0.3, w * 0.38, w * 0.26, 16), blk, 0, w * 0.16, 0, g);
    M(new THREE.TorusGeometry(w * 0.37, w * 0.02, 6, 3), gold(), 0, w * 0.05, 0, g).rotation.set(Math.PI / 2, 0, Math.PI / 6);
    M(S(w * 0.07), toon('#f4f1ea'), 0, w * 0.17, w * 0.36, g);
  },
  cat(g, w) { // two pointy ears
    const blk = toon('#2b2433'), pink = toon('#ff9bc0');
    for (const s of [-1, 1]) {
      const e = M(new THREE.ConeGeometry(w * 0.16, w * 0.34, 4), blk, s * w * 0.26, w * 0.06, 0, g); e.rotation.z = -s * 0.25;
      const i = M(new THREE.ConeGeometry(w * 0.09, w * 0.22, 4), pink, s * w * 0.26, w * 0.04, w * 0.06, g); i.rotation.z = -s * 0.25;
    }
  },
  wizard(g, w) { // tall bent hat with stars
    const pur = toon('#5b3bb5');
    M(C(w * 0.62, w * 0.62, w * 0.04, 24), pur, 0, -w * 0.02, 0, g);
    const c1 = M(C(w * 0.22, w * 0.38, w * 0.4, 16), pur, 0, w * 0.2, 0, g); void c1;
    const tip = M(new THREE.ConeGeometry(w * 0.22, w * 0.5, 16), pur, w * 0.06, w * 0.62, -w * 0.04, g); tip.rotation.z = -0.35;
    M(new THREE.TorusGeometry(w * 0.37, w * 0.035, 6, 24), toon('#ffcf3f'), 0, w * 0.04, 0, g).rotation.x = Math.PI / 2;
    for (const [x, y] of [[-0.18, 0.25], [0.16, 0.4]]) M(star5(w * 0.07, w * 0.02), glow('#ffe680', 0.8), x * w, y * w, w * 0.28, g);
  },
  xmas(g, w) { // santa hat
    const red = toon('#e23b3b'), wht = toon('#fbfbff');
    M(new THREE.TorusGeometry(w * 0.4, w * 0.09, 10, 24), wht, 0, 0, 0, g).rotation.x = Math.PI / 2;
    const c = M(new THREE.ConeGeometry(w * 0.4, w * 0.75, 18), red, w * 0.05, w * 0.36, -w * 0.05, g); c.rotation.z = -0.3;
    M(S(w * 0.11), wht, w * 0.27, w * 0.68, -w * 0.08, g);
  },
  halloween(g, w) { // jack-o'-lantern hat
    const p = M(S(w * 0.36, 18, 14), toon('#ff8a1c', { emissive: '#ff5a00', ei: 0.15 }), 0, w * 0.18, 0, g); p.scale.y = 0.75;
    M(C(w * 0.04, w * 0.06, w * 0.14, 8), toon('#4a7a2a'), 0, w * 0.46, 0, g);
    for (const s of [-1, 1]) M(new THREE.ConeGeometry(w * 0.05, w * 0.07, 3), glow('#ffe066', 1.6), s * w * 0.12, w * 0.24, w * 0.33, g).rotation.x = Math.PI / 2;
    M(B(w * 0.22, w * 0.04, w * 0.04), glow('#ffe066', 1.6), 0, w * 0.1, w * 0.34, g);
  },
  angel(g, w) { // floating golden halo
    const h = M(new THREE.TorusGeometry(w * 0.3, w * 0.045, 10, 32), toon('#ffe680', { emissive: '#ffcc33', ei: 1.4 }), 0, w * 0.2, 0, g); h.rotation.x = Math.PI / 2;
    g.userData.float = h;
  },
  sheriff(g, w) { // cowboy hat with a star
    const br = toon('#9a6236'), dk = toon('#5a3519');
    const brim = M(C(w * 0.72, w * 0.72, w * 0.04, 28), br, 0, 0, 0, g); brim.scale.z = 0.85;
    M(C(w * 0.3, w * 0.36, w * 0.3, 18), br, 0, w * 0.17, 0, g);
    M(C(w * 0.365, w * 0.365, w * 0.06, 18), dk, 0, w * 0.06, 0, g);
    M(star5(w * 0.08, w * 0.02), gold(), 0, w * 0.16, w * 0.35, g);
  },
};
export function buildHat(set, w) { const g = new THREE.Group(); if (HATS[set]) HATS[set](g, w); return g; }

// ---------- outfits: clothes tint + one accessory (front = +z, back = -z of the chest) ----------
export const OUTFIT = {
  ninja: { cape: '#2b2d48', body: '#3b3e63', legs: '#2b2d48' },
  pirate: { cape: '#b3262f', body: '#f2ece0', legs: '#3a2b2b' },
  cat: { cape: '#2b2433', body: '#463a52', legs: '#2b2433' },
  wizard: { cape: '#5b3bb5', body: '#7b5ad6', legs: '#3f2a80' },
  xmas: { cape: '#d92f3a', body: '#f6f6ff', legs: '#2f8a46' },
  halloween: { cape: '#2a1f33', body: '#ff8a1c', legs: '#2a1f33' },
  angel: { cape: '#f5f3ff', body: '#fff6d6', legs: '#e9e6ff' },
  sheriff: { cape: '#8a5530', body: '#d9b27a', legs: '#4a5a8a' },
};
const ACC = {
  ninja(back) { for (const s of [-1, 1]) { const k = M(B(0.03, 0.42, 0.04), toon('#c9ccd8', { metal: 1 }), s * 0.06, 0.05, 0, back); k.rotation.z = s * 0.6; M(B(0.07, 0.07, 0.05), toon('#2a2230'), s * 0.06, 0.05, 0, back).rotation.z = s * 0.6; } },
  pirate(back, front) { M(B(0.5, 0.06, 0.05), toon('#ffcf3f'), 0, -0.12, 0, front).rotation.z = 0.35; },
  cat(back) { const tl = new THREE.Group(); tl.position.set(0, -0.32, 0); back.add(tl); for (let i = 0; i < 6; i++) M(S(0.045 - i * 0.003, 10, 8), toon('#2b2433'), 0, -0.02 + Math.sin(i * 0.6) * 0.06 + i * 0.045, -0.05 - i * 0.06, tl); back.userData.tail = tl; },
  wizard(back, front) { M(star5(0.06, 0.02), glow('#ffe680', 0.9), 0.09, -0.1, 0.01, front); },
  xmas(back, front) { for (const y of [0.1, -0.02]) M(S(0.035, 10, 8), toon('#fbfbff'), 0, y, 0.01, front); },
  halloween(back) { for (const s of [-1, 1]) { const wg = M(new THREE.ConeGeometry(0.12, 0.3, 3), toon('#2a1f33'), s * 0.16, 0.08, 0, back); wg.rotation.set(0, 0, s * 1.3); wg.scale.z = 0.25; } },
  angel(back) { for (const s of [-1, 1]) { const wg = new THREE.Group(); wg.position.set(s * 0.08, 0.1, 0); back.add(wg); for (let i = 0; i < 3; i++) { const f = M(S(0.11 - i * 0.02, 12, 10), toon('#ffffff', { emissive: '#dfe8ff', ei: 0.2 }), s * (0.08 + i * 0.09), 0.04 - i * 0.05, -0.02, wg); f.scale.set(1.3, 0.75, 0.3); } (back.userData.wings ||= []).push(wg); } },
  sheriff(back, front) { M(star5(0.075, 0.025), gold(), -0.1, 0.06, 0.01, front); },
};
export function buildOutfitAcc(set) {
  const back = new THREE.Group(), front = new THREE.Group();
  if (ACC[set]) ACC[set](back, front);
  return { back, front };
}

// ---------- bags: the loot sack ----------
const BAG = {
  classic: ['#d1a463', '#a87b42', '#ffd65a'], ninja: ['#3b3e63', '#2b2d48', '#d8333f'], pirate: ['#8a5a32', '#3a2b2b', '#ffcf3f'],
  cat: ['#463a52', '#2b2433', '#ff9bc0'], wizard: ['#5b3bb5', '#3f2a80', '#ffe680'], xmas: ['#d92f3a', '#2f8a46', '#fbfbff'],
  halloween: ['#ff8a1c', '#4a7a2a', '#2a1f33'], angel: ['#f5f3ff', '#ffe680', '#ffe680'], sheriff: ['#9a6236', '#5a3519', '#ffcf3f'],
};
export function fillBag(sack, set) {
  for (const c of [...sack.children]) sack.remove(c);
  const [a, b, p] = BAG[set] || BAG.classic;
  M(S(0.25, 20, 14), toon(a), 0, 0, 0, sack);
  M(new THREE.ConeGeometry(0.08, 0.15, 10), toon(b), 0, 0.27, 0, sack);
  M(new THREE.TorusGeometry(0.06, 0.018, 6, 14), toon(b), 0, 0.2, 0, sack).rotation.x = Math.PI / 2;
  const patch = set === 'sheriff' || set === 'wizard' ? M(star5(0.08, 0.02), toon(p, { metal: set === 'sheriff' ? 1 : 0, emissive: p, ei: 0.4 }), 0.12, 0.06, -0.21, sack)
    : M(S(0.07, 10, 8), toon(p, { emissive: p, ei: 0.25 }), 0.12, 0.08, -0.2, sack);
  if (set !== 'sheriff' && set !== 'wizard') patch.scale.set(1, 1, 0.4); else patch.rotation.y = Math.PI;
  if (set === 'cat') for (const s of [-1, 1]) M(new THREE.ConeGeometry(0.06, 0.12, 4), toon(b), s * 0.12, 0.22, 0, sack).rotation.z = -s * 0.3;
  if (set === 'angel') for (const s of [-1, 1]) { const wg = M(S(0.08, 10, 8), toon('#ffffff'), s * 0.24, 0.06, 0, sack); wg.scale.set(1.4, 0.7, 0.3); }
  if (set === 'halloween') for (const s of [-1, 1]) M(new THREE.ConeGeometry(0.035, 0.05, 3), glow('#ffe066', 1.4), s * 0.08, 0.06, 0.24, sack).rotation.x = Math.PI / 2;
  if (set === 'xmas') { M(B(0.52, 0.05, 0.05), toon('#2f8a46'), 0, 0, 0.23, sack); M(B(0.05, 0.52, 0.05), toon('#2f8a46'), 0, 0, 0.23, sack); }
}

// ---------- hand lantern ----------
export function buildLantern(id) {
  const col = (RULES.lanterns[id] || RULES.lanterns.classic).color;
  const g = new THREE.Group(); const frame = id === 'royal' ? gold() : toon('#3a3340', { metal: 1 });
  M(C(0.06, 0.07, 0.02, 8), frame, 0, -0.08, 0, g);
  M(C(0.05, 0.05, 0.13, 10), toon(col, { emissive: col, ei: 2.2 }), 0, 0, 0, g);
  M(new THREE.ConeGeometry(0.075, 0.06, 8), frame, 0, 0.1, 0, g);
  M(new THREE.TorusGeometry(0.03, 0.008, 6, 12), frame, 0, 0.15, 0, g);
  g.userData.glass = g.children[1];
  return g;
}

// ---------- hanging pieces on the rig ----------
// anchors are measured once in the rest pose: a point on the model in group space → bone-local position, plus the
// rotation/scale that makes a child built in group units stand upright on that bone
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _box = new THREE.Box3();
function anchor(player, boneName, point) {
  const bone = player.model.getObjectByName(boneName) || player.model.getObjectByName(boneName.replace(/[.]/g, '')); if (!bone) return null;
  player.group.updateWorldMatrix(true, true);
  const p = player.group.localToWorld(point.clone()); const local = bone.worldToLocal(p);
  bone.getWorldQuaternion(_q); const gq = player.group.getWorldQuaternion(new THREE.Quaternion());
  bone.getWorldScale(_s); const gs = player.group.getWorldScale(new THREE.Vector3());
  return { bone, pos: local, quat: _q.clone().invert().multiply(gq), scale: gs.x / _s.x };
}
function hang(a, obj) {
  if (!a) return; obj.position.copy(a.pos); obj.quaternion.copy(a.quat); obj.scale.multiplyScalar(a.scale); a.bone.add(obj);
}
// measure the rig once (call in the rest pose, right after the model is loaded)
export function measureRig(player) {
  const g = player.group, rot = g.rotation.y; g.rotation.y = 0; g.updateWorldMatrix(true, true);
  const toGroup = (o) => { _box.setFromObject(o); const inv = g.matrixWorld.clone().invert(); return _box.clone().applyMatrix4(inv); };
  const head = player.model.getObjectByName('RogueHooded_Head'), body = player.model.getObjectByName('RogueHooded_Body');
  const hb = toGroup(head), bb = toGroup(body), hc = hb.getCenter(new THREE.Vector3()), bc = bb.getCenter(new THREE.Vector3());
  const w = hb.max.x - hb.min.x;
  const rig = {
    w,
    hat: anchor(player, 'head', new THREE.Vector3(hc.x, hb.max.y - w * 0.13, hc.z)),
    back: anchor(player, 'chest', new THREE.Vector3(bc.x, bc.y + (bb.max.y - bb.min.y) * 0.15, bb.min.z + 0.02)),
    front: anchor(player, 'chest', new THREE.Vector3(bc.x, bc.y + (bb.max.y - bb.min.y) * 0.15, bb.max.z)),
    hand: anchor(player, 'handslot.r', new THREE.Vector3(0, 0, 0)),
    mats: {},
  };
  // the hand anchor: keep the lantern under the hand slot itself
  if (rig.hand) rig.hand.pos.set(0, 0, 0);
  player.model.traverse((m) => {
    if (!m.isMesh || !m.material || !m.material.map) return;
    m.material = m.material.clone(); rig.mats[m.name] = { mesh: m, map: m.material.map };
  });
  rig.recolored = {};
  g.rotation.y = rot; return rig;
}
// the Rogue's clothes are the green part of its texture atlas: swap that hue for the outfit's colours
// (cloak colour for the hood + cape, a second colour for the darker cloth), keep skin and leather as they are
function recolorAtlas(tex, o) {
  const img = tex && tex.image; if (!img || !img.width) return tex;
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0); const id = cx.getImageData(0, 0, cv.width, cv.height), px = id.data;
  const hsl = {}, out = { r: 0, g: 0, b: 0 }, a = new THREE.Color(o.cape).getHSL({}), b = new THREE.Color(o.body).getHSL({}), c = new THREE.Color();
  for (let i = 0; i < px.length; i += 4) {
    c.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, THREE.SRGBColorSpace).getHSL(hsl, THREE.SRGBColorSpace);
    const hue = hsl.h * 360; if (hue < 70 || hue > 190 || hsl.s < 0.12) continue;
    const t = hsl.l < 0.22 ? b : a; // deep shadows of the cloth take the second colour
    const l = Math.min(0.97, Math.max(0.04, hsl.l + (t.l - 0.33) * 0.95));
    c.setHSL(t.h, Math.min(1, t.s * (0.6 + hsl.s * 0.6)), l, THREE.SRGBColorSpace);
    c.getRGB(out, THREE.SRGBColorSpace); px[i] = out.r * 255; px[i + 1] = out.g * 255; px[i + 2] = out.b * 255;
  }
  cx.putImageData(id, 0, 0);
  const nt = new THREE.CanvasTexture(cv); nt.flipY = tex.flipY; nt.colorSpace = tex.colorSpace; nt.wrapS = tex.wrapS; nt.wrapT = tex.wrapT;
  nt.magFilter = tex.magFilter; nt.minFilter = tex.minFilter; nt.channel = tex.channel; nt.needsUpdate = true;
  return nt;
}
// put on what save.meta.wear says
export function dressPlayer(player, rig, wearing = {}) {
  if (!rig) return;
  for (const k of ['hatObj', 'accBack', 'accFront', 'lanternObj']) { const o = player[k]; if (o && o.parent) o.parent.remove(o); player[k] = null; }
  if (wearing.hat && rig.hat) { player.hatObj = buildHat(wearing.hat, rig.w); hang(rig.hat, player.hatObj); }
  const o = OUTFIT[wearing.outfit];
  for (const m of Object.values(rig.mats)) {
    const map = o ? (rig.recolored[wearing.outfit] ||= recolorAtlas(m.map, o)) : m.map;
    if (m.mesh.material.map !== map) { m.mesh.material.map = map; m.mesh.material.needsUpdate = true; }
  }
  if (wearing.outfit) {
    const acc = buildOutfitAcc(wearing.outfit); player.accBack = acc.back; player.accFront = acc.front;
    hang(rig.back, acc.back); hang(rig.front, acc.front);
  }
  if (player.sack) fillBag(player.sack, wearing.bag || 'classic');
  if (rig.hand) { const wrap = new THREE.Group(), l = buildLantern(wearing.lantern || 'classic'); l.position.y = -0.16; l.scale.setScalar(1.15); wrap.add(l); player.lanternObj = wrap; hang(rig.hand, wrap); }
}
// small idle motion for halos, wings and tails
export function animateCostume(player, time) {
  const h = player.hatObj && player.hatObj.userData.float;
  if (h) { h.userData.y0 ??= h.position.y; h.position.y = h.userData.y0 + Math.sin(time * 2.5) * 0.02; }
  const b = player.accBack; if (!b) return;
  if (b.userData.wings) b.userData.wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (0.2 + Math.sin(time * 3) * 0.15); });
  if (b.userData.tail) b.userData.tail.rotation.y = Math.sin(time * 2) * 0.4;
}
export const lanternColor = (id) => (RULES.lanterns[id] || RULES.lanterns.classic).color;
