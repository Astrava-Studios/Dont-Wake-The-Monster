// View layer: renders the pure sim (sim.js), turns its events into juice + sound, and hosts the UI.
// Debug hooks: ?seed=N ?night=N ?sim=SECONDS ?autoplay&speed=4 ?gallery ?noassets ?lowfx ?r.path=value
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
// Full screen on Android is handled natively (MainActivity: sticky immersive, bars come back only for a moment).

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import './style.css';
import { initFit } from './fit.js';
import { buildMerchant, buildPlayer, buildMonster, buildNest, buildFurniture, buildDuck, buildCat, buildTreasure, buildPowerup, buildDoor, buildWindow, toon, M } from './models.js';
import { generateLevel, mulberry, MONSTERS } from './level.js';
import { RULES, applyOverrides } from './rules.js';
import { createSim, step, dropLoot, useLullaby, useItem, nightResult, weightFactor, addNoise } from './sim.js';
import { makeBody } from './physics.js';
import { rentAmount, rentDueNow, nightsToRent, canPayRent, payRent, packKit, unpackKit, endRun } from './run.js';
import { createMarketView } from './marketView.js';
import { createHideoutView } from './hideoutView.js';
import { createMenuScene } from './menuScene.js';
import { createBestiaryView } from './bestiaryView.js';
import { createBot } from './bot.js';
import { SHOP, shopCost, BRANCHES, skillLocked } from './texts.js';
import { t, setLang, detectLang, applyStatic, LANGS, getLang, itemName, line, goodText, setText as setTextOf, lanternName, decorName, relicText } from './i18n.js';
import '@fontsource-variable/nunito';
import * as TX from './textures.js';
import { Input } from './input.js';
import { Sfx, audioReport } from './audio.js';
import { playAstravaIntro } from './astrava-intro/astravaIntro.js';
import { loadSave, writeSave as writeSaveReal } from './save.js';
const writeSave = (sv) => { if (!new URLSearchParams(location.search).has('demo')) writeSaveReal(sv); };
import * as AS from './assets.js';
import { buildHornbeast } from './hornbeast.js';
import { icon, monsterFace, hydrateIcons, flag, GOOD_ICON } from './icons.js';
import { measureRig, dressPlayer, animateCostume, lanternColor } from './costumes.js';
import { setBonus, stashLoot, collect, lanternStats, buyHouse, chooseHouse } from './hideout.js';
import { setDarkZones, setDarkLight, patchDark } from './darkness.js';
import { gpuName, detectTier, looks, createGovernor, measureRefresh } from './perf.js';
import { setLite, mergeStaticJob } from './lite.js';

const Q = new URLSearchParams(location.search);
applyOverrides(location.search);
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const isTouch = matchMedia('(pointer: coarse)').matches;
const LOWFX = Q.has('lowfx');
let userTapped = false;
const vibrate = (p) => { if (!userTapped || !save.vibrate) return; try { navigator.vibrate && navigator.vibrate(p); } catch {} };

// ---------------- persistent state ----------------
const save = loadSave(); save.hints ||= {};
save.vol ||= { music: save.music === false ? 0 : 0.8, sfx: save.sound === false ? 0 : 1 };
save.zoom ??= 0.25; save.vibrate ??= true;
// Graphics on Auto (the default) picks the quality from the device once the GPU is known (renderer below).
// Older saves stored the default quality without the player choosing it: those count as Auto too.
save.qualityAuto ??= !save.quality || save.quality === (isTouch ? 'med' : 'high');
save.quality ||= isTouch ? 'med' : 'high';
save.lang ||= detectLang(); setLang(save.lang);
save.stash ||= []; // stolen items waiting to be sold at the black market
if (save.run.activeNight != null || (save.run.kit && save.run.kit.length)) {
  // the app was closed in the middle of a night: unused supplies go back to the inventory and,
  // like quitting from the pause menu, that night is lost (no free re-roll of a bad night)
  unpackKit(save.run, save.run.kit || []);
  if (save.run.activeNight === save.run.night) save.run.night++;
  delete save.run.activeNight; writeSave(save);
}
const sfx = new Sfx(); sfx.vol = save.vol;
// every menu button gets a UI click (capture phase, before handlers that stop propagation)
document.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('button'); if (b && !b.classList.contains('act')) { sfx.init(); sfx.click(); } }, true);
const input = new Input($('touch'), $('joy'), $('knob'));
input.onStart = () => sfx.init();
document.addEventListener('pointerdown', () => { userTapped = true; sfx.init(); }, { passive: true });
// iOS Safari only lets audio start on the END of a tap (touchend / click), not on pointerdown: unlock there too
for (const ev of ['touchend', 'click', 'keydown']) document.addEventListener(ev, () => { userTapped = true; sfx.init(); }, { passive: true, capture: true });

// ---------------- renderer / scene / post ----------------
// perfStep: the step the frame-rate governor (perf.js) is on: shadows off / simple materials / 30 fps cap
let perfStep = { shadows: true, lite: false, cap: 0 };
const getQualityRatio = () => {
  const q = save.quality || 'med';
  if (q === 'low') return Math.min(devicePixelRatio, 1.0);
  if (q === 'med') return Math.min(devicePixelRatio, 1.5);
  return Math.min(devicePixelRatio, 2.0); // Mobile High: crisp native OLED resolution capped for mobile thermal safety
};
// Low, or the governor's lite step: Lambert instead of PBR materials (lite.js)
const liteOn = () => save.quality === 'low' || perfStep.lite;

const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('sim') || Q.has('gallery') });
const GPU = gpuName(renderer);
if (save.qualityAuto) save.quality = detectTier(renderer, isTouch);
save.hq = save.quality === 'high';
if (save.perfGpu !== GPU) { save.perfGpu = GPU; save.perfLook = 0; save.perfCap = false; } // the remembered look belongs to this device
renderer.setPixelRatio(getQualityRatio());
renderer.shadowMap.enabled = save.quality !== 'low';
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d1530');
// image-based light so the glTF materials read correctly (dimmed: it's night)
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
// Low skips the image-based light: at night it is ~1% of the light, but it costs every pixel several texture reads
scene.environment = save.quality === 'low' ? null : envTex;
scene.environmentIntensity = 0.32;
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
const hemi = new THREE.HemisphereLight('#7f93d9', '#2a1d3d', 0.2); scene.add(hemi);
const sun = new THREE.DirectionalLight('#a9bcff', 0.38); // moonlight key light (casts the shadows)
sun.castShadow = save.quality !== 'low';
const initialSm = save.quality === 'high' ? 1024 : 512;
sun.shadow.mapSize.set(initialSm, initialSm);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 50 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = save.quality === 'high' ? 2 : 1;
scene.add(sun, sun.target);
function syncShadows() {
  const q = save.quality || 'med';
  if (q === 'low' || !perfStep.shadows) {
    renderer.shadowMap.enabled = false; sun.castShadow = false;
  } else {
    sun.castShadow = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const sz = q === 'high' ? 1024 : 512;
    sun.shadow.mapSize.set(sz, sz);
    sun.shadow.radius = q === 'high' ? 2 : 1;
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  renderer.shadowMap.needsUpdate = true;
}
const moon = new THREE.DirectionalLight('#8fb0ff', 0.7); moon.position.set(-4, 8, -12); scene.add(moon);
const nestLight = new THREE.PointLight('#ffb36b', 9, 9, 2); scene.add(nestLight);
const lantern = new THREE.PointLight('#ffc978', 0, 8, 2); scene.add(lantern); // the thief's lantern: main way to see at night
// candle lights on tables (pooled; assigned per level)
const candles = [0, 1, 2].map(() => { const l = new THREE.PointLight('#ffa64d', 0, 5, 2); scene.add(l); return l; });
// night look: everything is dark blue, only light sources reveal the room. Dawn slowly brings warm light in.
const NIGHT = {
  normal: { hemi: 0.045, sun: 0.07, moon: 0.3, env: 0.015, lamp: 8, candle: 4, lantern: 10 },
  dark: { hemi: 0.04, sun: 0.04, moon: 0.2, env: 0.01, lamp: 0, candle: 0, lantern: 9 },
};

// The full post chain (AO, bloom, grading) is only built with ?bloom. By default the renderer draws straight to the
// screen and CSS does the vignette + flash, so the passes would only hold GPU memory.
const POST = Q.has('bloom') && !LOWFX;
const fxHidden = []; // sprites/particles hidden during the AO pass so they don't leave dark halos
const gradeUniforms = { tDiffuse: { value: null }, sat: { value: 1.12 }, contrast: { value: 1.06 }, lift: { value: 0.02 }, vig: { value: 0.55 },
  tint: { value: new THREE.Color(1, 1, 1) }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 0.25, 0.25) } };
let composer = null, gtao = null, bloom = null, grade = { uniforms: gradeUniforms };
if (POST) {
composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
if (!isTouch) {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.1, samples: 12 });
  gtao.blendIntensity = 0.85;
  const r0 = gtao.render.bind(gtao);
  gtao.render = (...a) => { const vis = fxHidden.map((o) => o.visible); fxHidden.forEach((o) => { o.visible = false; }); r0(...a); fxHidden.forEach((o, i) => { o.visible = vis[i]; }); };
  composer.addPass(gtao);
}
bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.28, 0.45, 0.92); // low strength, high threshold
composer.addPass(bloom);
composer.addPass(new OutputPass());
grade = new ShaderPass({
  uniforms: gradeUniforms,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float sat, contrast, lift, vig, flash; uniform vec3 tint, flashCol; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, sat);
      col = (col - 0.5) * contrast + 0.5; col += lift * (1.0 - col); col *= tint;
      vec2 d = vUv - 0.5; col *= 1.0 - vig * dot(d, d) * 1.5;
      col = mix(col, flashCol, flash * 0.45);
      gl_FragColor = vec4(col, c.a); }`,
});
composer.addPass(grade);
}

const GLOW = TX.glowTex(), ZT = TX.zTex(), STAR = TX.starTex(), NOTE = TX.noteTex(), PUFF = TX.puffTex(), BEAM = TX.beamTex();
let world = new THREE.Group(); scene.add(world);
let levelTex = [];
let player = buildPlayer(); scene.add(player.group);

function useRoguePlayer() {
  const r = AS.rogue(); if (!r) return;
  const proc = player; scene.remove(proc.group);
  proc.sack.position.set(0, 0.62, -0.24); r.body.add(proc.sack); r.group.add(proc.blob);
  player = { ...r, sack: proc.sack, feet: [], cur: null };
  scene.add(player.group);
  rig = measureRig(player); dress();
}
let rig = null;
// put on the worn costume pieces + lantern look (save.meta.wear); `wearing` previews something else
function dress(wearing = save.meta.wear) { dressPlayer(player, rig, wearing); lantern.color.set(lanternColor(wearing.lantern)); }

// ---------------- fx pools ----------------
const fxRoot = new THREE.Group(); scene.add(fxRoot); fxHidden.push(fxRoot);
const rings = [];
for (let i = 0; i < 16; i++) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.visible = false; fxRoot.add(m); rings.push({ m, t: 1, max: 1, life: 1 });
}
const sparks = [];
for (let i = 0; i < 60; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: STAR, color: '#ffe066', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.visible = false; fxRoot.add(s); sparks.push({ s, v: new THREE.Vector3(), t: 0, life: 1, g: 6 });
}
const puffs = [];
for (let i = 0; i < 24; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF, color: '#e8d9c4', transparent: true, depthWrite: false, opacity: 0 }));
  s.visible = false; fxRoot.add(s); puffs.push({ s, t: 0, life: 0.6, v: new THREE.Vector3() });
}
const zs = [];
for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ZT, transparent: true, depthWrite: false })); fxRoot.add(s); zs.push({ s, t: i / 3 }); }
// floating dust motes in the warm light
const MOTES = 140;
const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ map: GLOW, color: '#ffe3b0', size: 0.09, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
fxRoot.add(motes); const moteSeed = Array.from({ length: MOTES }, () => [Math.random(), Math.random(), Math.random(), Math.random() * 6]);

// ---------------- game state ----------------
let mode = 'menu'; // menu | night | play | result | gallery
let L = null, S = null, MO = null, bot = null;
const run = { get night() { return save.run.night; }, set night(v) { save.run.night = v; } }; // the roguelite run (save.run)
let kitSel = []; // supplies picked on the night card
let time = 0, shake = 0, flash = 0, autoplay = Q.has('autoplay'), speed = +(Q.get('speed') || 1);
const props = { treasures: new Map(), ducks: new Map(), powerups: new Map(), cats: new Map(), door: null, clockHand: null, flames: [], curtains: [], squeakMeshes: new Map() };
const upg = (k) => save.upgrades[k] || 0;

// ---------------- world building ----------------
function clearWorld() {
  world.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  scene.remove(world); world = new THREE.Group(); scene.add(world); setDarkZones([]);
  levelTex.forEach((t) => t.dispose()); levelTex = [];
  props.treasures.clear(); props.ducks.clear(); props.powerups.clear(); props.cats.clear(); props.flames = []; props.curtains = []; props.squeakMeshes.clear(); 
  fxHidden.length = 1; // keep fxRoot
}
const tex = (t) => { levelTex.push(t); return t; };

function buildWorld(level, sim) {
  clearWorld(); simForBuild = sim || null;
  L = level; const { W, D, theme } = L;
  scene.background = new THREE.Color(theme.bg);
  const vr = mulberry(L.seed ^ 0x5eed); // visual-only rng: deterministic per level, separate from the sim
  // floor
  const ft = tex(TX.woodTex()); ft.repeat.set(W / 2, D / 2);
  M(new THREE.PlaneGeometry(W, D), toon('#ffffff', { map: ft, unique: true }), 0, 0, 0, world, false).rotation.x = -Math.PI / 2;
  const out = M(new THREE.PlaneGeometry(W + 60, D + 60), toon(theme.bg), 0, -0.02, 0, world, false); out.rotation.x = -Math.PI / 2;
  // walls
  const H = 3.6; const wt = tex(TX.wallTex(theme.wall, theme.wall2, theme.trim)); wt.repeat.set(W / 2.5, 1.4);
  const wt2 = tex(TX.wallTex(theme.wall, theme.wall2, theme.trim)); wt2.repeat.set(D / 2.5, 1.4);
  M(new THREE.BoxGeometry(W + 0.6, H, 0.3), toon('#ffffff', { map: wt, unique: true }), 0, H / 2, -D / 2 - 0.15, world, false);
  for (const s of [-1, 1]) M(new THREE.BoxGeometry(0.3, H * 0.62, D), toon('#ffffff', { map: wt2, unique: true }), s * (W / 2 + 0.15), H * 0.31, 0, world, false);
  const trim = toon('#5a3a2a');
  M(new THREE.BoxGeometry(W + 0.6, 0.25, 0.4), trim, 0, 0.12, -D / 2 - 0.1, world, false);
  for (const s of [-1, 1]) M(new THREE.BoxGeometry(0.4, 0.25, D), trim, s * (W / 2 + 0.1), 0.12, 0, world, false);
  M(new THREE.BoxGeometry(W + 0.8, 0.2, 0.45), toon(theme.trim), 0, H, -D / 2 - 0.1, world, false);
  for (const s of [-1, 1]) M(new THREE.BoxGeometry(0.45, 0.2, D), toon(theme.trim), s * (W / 2 + 0.1), H * 0.62, 0, world, false);
  // window + moonbeam
  const wx = clamp(L.nest.x + (L.nest.x > 0 ? -4.2 : 4.2), -W / 2 + 1.5, W / 2 - 1.5);
  const win = buildWindow(tex(TX.windowTex())); win.position.set(wx, 2.1, -D / 2 + 0.01); world.add(win);
  props.curtains = win.userData.curtains || [];
  const beamMat = new THREE.MeshBasicMaterial({ map: BEAM, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, color: '#b9ccff' });
  const beam = M(new THREE.PlaneGeometry(1.6, 4.2), beamMat, wx + 0.9, 0.02, -D / 2 + 2.2, world, false);
  beam.rotation.set(-Math.PI / 2, 0, 0.35); props.beam = beam; fxHidden.push(beam);
  const shaft = M(new THREE.PlaneGeometry(1.5, 3.2), beamMat.clone(), wx + 0.45, 1.3, -D / 2 + 1.1, world, false);
  shaft.material.opacity = 0.07; shaft.rotation.set(-0.95, 0.35, 0); fxHidden.push(shaft);
  // clock (its hand shows time until dawn)
  const clock = new THREE.Group(); clock.position.set(L.nest.x, 2.85, -D / 2 + 0.05); world.add(clock);
  M(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24), toon('#d36b8a'), 0, 0, 0, clock).rotation.x = Math.PI / 2;
  M(new THREE.PlaneGeometry(0.72, 0.72), new THREE.MeshBasicMaterial({ map: tex(TX.clockTex()), transparent: true }), 0, 0, 0.06, clock, false);
  const hand = new THREE.Group(); hand.position.z = 0.08; clock.add(hand);
  M(new THREE.BoxGeometry(0.04, 0.28, 0.02), toon('#2a1f33'), 0, 0.12, 0, hand, false); props.clockHand = hand;
  for (const s of [-1, 1]) M(new THREE.SphereGeometry(0.1, 10, 8), toon('#ffd65a', { metal: 1 }), s * 0.3, 0.45, 0, clock);
  // wall decor: big frame, small frames, wall shelves (only where no tall furniture is in front)
  const freeWallX = (x, half) => !L.obstacles.some((o) => o.z < -D / 2 + 1.2 && Math.abs(o.x - x) < o.hw + half) && Math.abs(x - wx) > 1.4 && Math.abs(x - L.nest.x) > 0.8;
  const fx = L.nest.x + (L.nest.x > 0 ? 2.8 : -2.8);
  const kFrame = AS.decor('frame');
  if (kFrame && Math.abs(fx) < W / 2 - 1) { kFrame.position.set(fx, 1.75, -D / 2 + 0.02); world.add(kFrame); }
  for (let x = -W / 2 + 1.5; x < W / 2 - 1; x += 1.7) {
    const r = vr(); if (!freeWallX(x, 0.7) || Math.abs(x - fx) < 1.2) continue;
    const d = r < 0.45 ? AS.decor('wallShelf') : r < 0.8 ? AS.decor('frameS') : null;
    if (d) { d.position.set(x, r < 0.45 ? 1.55 : 1.9 + vr() * 0.4, -D / 2 + 0.03); world.add(d); }
  }
  // rugs
  for (const r of L.rugs) {
    // patterned procedural rugs: the KayKit rug models read as flat single-colour sheets when stretched
    const t = tex(TX.rugTex(r.a, r.b, r.round));
    const geo = r.round ? new THREE.CircleGeometry(r.r, 40) : new THREE.PlaneGeometry(r.w, r.d);
    M(geo, toon('#ffffff', { map: t, unique: true }), r.x, 0.012, r.z, world, false).rotation.x = -Math.PI / 2;
  }
  // squeaky planks
  const sm = toon('#ffffff', { map: tex(TX.squeakTex()), unique: true }); const sg = new THREE.PlaneGeometry(0.98, 0.98);
  for (const k of L.squeak) {
    const [i, j] = k.split(',').map(Number);
    const m = M(sg, sm, -W / 2 + i + 0.5, 0.008, -D / 2 + j + 0.5, world, false); m.rotation.x = -Math.PI / 2; props.squeakMeshes.set(k, m);
  }
  // furniture (settles in with a little squash)
  let k = 0;
  for (const o of L.obstacles) {
    let g = L.theme.library && o.kind === 'bookshelf' ? buildFurniture('libshelf', o.baseHw, o.baseHd) : AS.furniture(o.kind, o.baseHw, o.baseHd) || buildFurniture(o.kind, o.baseHw, o.baseHd);
    g.position.set(o.x, 0, o.z); g.rotation.y = o.rot ? Math.PI / 2 : 0;
    if (o.kind === 'bookshelf' && o.rot) g.rotation.y = o.x > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.traverse((c) => { if (c.userData.flame) props.flames.push(c); });
    if (o.loose) g = addLoose(g, o.kind, o.x, o.z, o); else world.add(g);
    // the squash-in is skipped on the simple look: the room can then be baked into a few meshes right away
    if (liteOn()) { k++; continue; }
    g.userData.spawnAt = time + 0.05 + (k++) * 0.03; g.userData.settle = true; g.scale.setScalar(0.001);
  }
  // candle lights on the first tables
  const tables = L.obstacles.filter((o) => o.kind === 'table');
  candles.forEach((c, i) => { const tb = tables[i]; c.userData.on = !!tb; if (tb) c.position.set(tb.x, 1.55, tb.z); c.intensity = 0; });
  // deterministic floor clutter along the walls (non-blocking, never on the door path)
  const clutterN = Math.round((W + D) * 0.55);
  for (let i = 0, tries = 0; i < clutterN && tries < 200; tries++) {
    const side = Math.floor(vr() * 3); // 0 back, 1 left, 2 right
    const x = side === 0 ? -W / 2 + 0.8 + vr() * (W - 1.6) : (side === 1 ? -1 : 1) * (W / 2 - 0.45);
    const z = side === 0 ? -D / 2 + 0.45 : -D / 2 + 1 + vr() * (D - 2);
    if (Math.hypot(x - L.exit.x, z - L.exit.z) < 2.2 || Math.hypot(x - L.nest.x, z - L.nest.z) < L.nest.r + 0.6) continue;
    if (L.obstacles.some((o) => Math.abs(x - o.x) < o.hw + 0.35 && Math.abs(z - o.z) < o.hd + 0.35)) continue;
    const kind = AS.CLUTTER[Math.floor(vr() * AS.CLUTTER.length)];
    const c = AS.clutter(kind); if (!c) break;
    c.rotation.y = kind === 'chair' ? (side === 0 ? 0 : side === 1 ? Math.PI / 2 : -Math.PI / 2) : vr() * 6.28;
    addLoose(c, kind, x, z); i++;
  }
  // a few loose chairs out in the room: the thief can bump them over (noisy!)
  for (let i = 0, tries = 0; i < 2 + Math.floor(W / 6) && tries < 60; tries++) {
    const x = -W / 2 + 1.2 + vr() * (W - 2.4), z = -D / 2 + 1.5 + vr() * (D - 3);
    if (Math.hypot(x - L.exit.x, z - L.exit.z) < 2.4 || Math.hypot(x - L.nest.x, z - L.nest.z) < L.nest.r + 1.4 || Math.hypot(x - L.start.x, z - L.start.z) < 1.6) continue;
    if (L.obstacles.some((o) => Math.abs(x - o.x) < o.hw + 0.5 && Math.abs(z - o.z) < o.hd + 0.5)) continue;
    const c = AS.clutter('chair'); if (!c) break;
    c.rotation.y = vr() * 6.28; addLoose(c, 'chair', x, z); i++;
  }
  // nest + monster + standing lamp
  const nest = buildNest(theme); nest.position.set(L.nest.x, 0, L.nest.z); world.add(nest);
  MO = makeMonster(L.monster);
  nestLight.position.set(L.nest.x + 2, 2.6, L.nest.z + 2.5);
  const lamp = AS.decor('lamp');
  if (lamp) { const lx = L.nest.x + (L.nest.x > 0 ? -3.0 : 3.0); lamp.position.set(lx, 0, -D / 2 + 0.7); world.add(lamp); nestLight.position.set(lx, 2.0, -D / 2 + 1.2); }
  // exit door
  const door = buildDoor(false); door.position.set(L.exit.side * (L.W / 2 + 0.02), 0, L.exit.z); door.rotation.y = -L.exit.side * Math.PI / 2; world.add(door);
  props.door = door;
  const mat = M(new THREE.CircleGeometry(0.8, 32), new THREE.MeshBasicMaterial({ color: '#5cff9a', transparent: true, opacity: 0.35, depthWrite: false }), L.exit.x, 0.02, L.exit.z, world, false);
  mat.rotation.x = -Math.PI / 2; props.exitMat = mat; fxHidden.push(mat);
  const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: '#5cff9a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  eg.scale.set(1.3, 1.3, 1); eg.position.set(L.exit.x, 0.6, L.exit.z); world.add(eg); props.exitGlow = eg; fxHidden.push(eg);
  // sim-driven entities
  if (sim) {
    sim.treasures.forEach((t, i) => addTreasureView(t, 0.35 + i * 0.05));
    for (const d of sim.ducks) { const g = buildDuck(); g.position.set(d.x, 0, d.z); g.rotation.y = vr() * 6; world.add(g); props.ducks.set(d.id, { g, spin: 0 }); }
    for (const c of sim.cats || []) { const g = buildCat(); g.position.set(c.x, 0, c.z); g.rotation.y = c.yaw; world.add(g); props.cats.set(c.id, { g }); }
    for (const p of sim.powerups) { const g = buildPowerup(p.kind); g.position.set(p.x, 0, p.z); world.add(g); props.powerups.set(p.id, { g, x: p.x }); addGlow(g, p.kind === 'feather' ? '#ffffff' : '#7cc8ff', 1.4); }
  }
  // lighting per modifiers
  const N = NIGHT[L.has('dark') ? 'dark' : 'normal'];
  hemi.intensity = N.hemi; sun.intensity = N.sun; moon.intensity = N.moon; lantern.intensity = N.lantern; nestLight.intensity = N.lamp; scene.environmentIntensity = N.env;
  sun.color.set('#a9bcff');
  // motes live inside the room
  const pos = moteGeo.attributes.position.array;
  moteSeed.forEach(([a, b, c], i) => { pos[i * 3] = (a - 0.5) * W; pos[i * 3 + 1] = 0.3 + b * 2.8; pos[i * 3 + 2] = (c - 0.5) * D; });
  moteGeo.attributes.position.needsUpdate = true;
}

function addGlow(parent, color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); s.position.y = 0.35; parent.add(s); fxHidden.push(s); return s;
}
function addTreasureView(t, delay = 0) {
  const g = AS.treasure(t.kind) || buildTreasure(t.kind); g.position.set(t.x, 0, t.z); g.rotation.y = Math.random() * 6; world.add(g);
  if (t.kind !== 'chest') addGlow(g, t.kind === 'gem' ? '#ffffff' : '#ffd65a', t.kind === 'crown' ? 2.2 : 1.3);
  g.scale.setScalar(0.001);
  props.treasures.set(t.id, { g, kind: t.kind, bob: Math.random() * 6, spawnAt: time + delay, fly: null, base: 1 });
}
const monsterModel = (type) => buildHornbeast(type, AS.hornbeastMesh()) || buildMonster(type);
function makeMonster(type, home = { x: L.nest.x, z: L.nest.z, yaw: 0 }) {
  const m = monsterModel(type); m.group.position.set(home.x, 0.15, home.z); world.add(m.group);
  return { ...m, type, jolt: 0, scale0: type.scale, home };
}

// ---------------- night lifecycle ----------------
function makeSim(seed) {
  save.run.relics ||= [];
  return createSim({ night: run.night, seed, upgrades: save.upgrades, gear: save.run.gear, bonus: setBonus(save.meta.wear), house: save.meta.houses.includes(save.run.house) ? save.run.house : 'manor', relics: save.run.relics });
}
// the 3D room is built from (and its loose props are bound to) one sim: rebuild it whenever S is replaced
function buildNightWorld() { buildWorld(S.L, S); setDarkZones(S.L.darkZones); patchDark(scene); }
function newNight(seedOverride) {
  const seed = seedOverride ?? (Q.has('seed') && run.night === 1 ? +Q.get('seed') : (Math.random() * 1e9) | 0);
  gov.nextNight(); // a look change (shader recompile) only ever happens here, while the room is being built anyway
  S = makeSim(seed);
  buildNightWorld();
  bot = createBot({ greed: 9 });
  player.group.visible = true;
  if (player.mixer) { player.mixer.stopAllAction(); player.cur = null; }
  camSnap = true;
  showNightCard();
}

function showNightCard() {
  mode = 'night';
  $('ncNight').textContent = run.night;
  // tonight's monster as a playing card: its face on its own colour, name banner, one line about it and
  // four stat gauges (hearing, snore length, peeking, speed: 1-3 pips)
  const m = L.monster, lvOf = (v) => (v < 0.95 ? 1 : v > 1.05 ? 3 : 2);
  const stats = [['ear', m.hearing], ['zzz', m.snoreLen], ['eye', m.peekRate], ['run', m.speed]]
    .map(([ic, v]) => `<span class="mStat">${icon(ic)}<span class="pips">${[1, 2, 3].map((k) => `<i class="${k <= lvOf(v) ? 'f' : ''}"></i>`).join('')}</span></span>`).join('');
  $('ncMCard').style.setProperty('--mc', m.color);
  $('ncMCard').innerHTML = `<div class="mArt">${monsterFace('sleep', m.color, m.belly)}</div><div class="mName">${m.name}</div><div class="mTrait">${m.trait}</div><div class="mStats">${stats}</div>`;
  renderHousePicker();
  renderRelicPicker();
  $('ncMods').innerHTML = L.mods.length || L.darkZones.length ? `<div class="ncLbl">${t('tonightT')}</div><div class="modRow">${L.mods.map((md) => `<div class="mod" title="${md.desc}">${icon(md.icon)}<span>${md.name}</span></div>`).join('')}${L.darkZones.length ? `<div class="mod dark">${icon('hide')}<span>${t('darkRooms', { n: L.darkZones.length })}</span></div>` : ''}</div>` : '';
  const due = nightsToRent(save.run);
  $('ncRent').innerHTML = `<span class="pill rent ${due <= 1 ? 'soon' : ''}" title="${t('rent')}: ${rentAmount(save.run.rentIdx)} · ${t('rentIn', { n: due })}">${icon('bank')}<span class="num">${rentAmount(save.run.rentIdx)}</span><span class="pSub">${icon('moon')}<span class="num">${due}</span></span></span>`;
  renderKitPicker();
  show('nightCard'); hide('hud'); hide('menu');
}

// Relics: on nights 2, 4 and 6 three you don't own are offered. Choosing is required: the night card shows only
// the three cards (Start is disabled) until one is taken. The offer stays the same for this night (house switch,
// reload). Each relic is a playing card: art, name banner, its upside (green) and its price (red).
function relicOffer() {
  save.run.relics ||= [];
  const current = save.run.relics, unowned = Object.keys(RULES.relics).filter((r) => !current.includes(r));
  if (!unowned.length || ![2, 4, 6].includes(run.night) || save.run.relicNight === run.night) return null;
  const off = save.run.relicOffer;
  if (!off || off.night !== run.night || off.ids.some((id) => current.includes(id) || !RULES.relics[id])) {
    const pool = unowned.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    save.run.relicOffer = { night: run.night, ids: pool.slice(0, 3) }; writeSave(save);
  }
  return save.run.relicOffer.ids;
}
const relicPending = () => mode === 'night' && !!relicOffer();
// "Quiet steps, but bag -1": the texts put the upside first and the price after "but"
function relicParts(desc) {
  const p = desc.split(/,\s*(?:ama|but|но)\s+|，但是?/);
  if (p.length < 2) return [desc, ''];
  const con = p.slice(1).join(', ').trim().replace(/[.。]$/, '');
  return [p[0].trim(), con.charAt(0).toLocaleUpperCase(getLang()) + con.slice(1)];
}
const relicCardHtml = (id, i) => {
  const { name, desc } = relicText(id), [pro, con] = relicParts(desc);
  return `<button class="relicCard rc${i}" data-relic="${id}" style="--d:${i * 0.08}s"><span class="rcArt">${icon(RULES.relics[id].icon)}</span><span class="rcName">${name}</span>
    <span class="rcText"><span class="rcPro">${icon('up')}<span>${pro}</span></span>${con ? `<span class="rcCon">${icon('down')}<span>${con}</span></span>` : ''}</span></button>`;
};
function renderRelicPicker() {
  const el = $('ncRelics'), pick = $('ncPick'), card = $('nightCard').querySelector('.kcard'); if (!el) return;
  const choices = relicOffer();
  card.classList.toggle('picking', !!choices);
  $('sneakBtn').disabled = !!choices;
  pick.innerHTML = choices ? `<div class="rpHead"><div class="rpTitle">${icon('sparkle')}<span>${t('pickRelic')}</span>${icon('sparkle')}</div><div class="rpSub">${t('pickRelicSub')}</div></div>
    <div class="relicCards">${choices.map(relicCardHtml).join('')}</div>` : '';
  pick.querySelectorAll('[data-relic]').forEach((b) => { b.onclick = () => {
    if (pick.classList.contains('done')) return;
    const id = b.dataset.relic;
    pick.classList.add('done'); b.classList.add('chosen'); sfx.buy();
    setTimeout(() => { // let the chosen card fly up, then the briefing
      pick.classList.remove('done');
      save.run.relics.push(id); save.run.relicNight = run.night; delete save.run.relicOffer; writeSave(save);
      S = makeSim(S.L.seed); buildNightWorld(); // same room, new sim: the props must be bound to the new physics bodies
      renderRelicPicker(); banner(relicText(id).name, 1.1);
    }, 520);
  }; });
  const current = save.run.relics;
  el.innerHTML = current.length ? `<div class="ncLbl">${t('activeRelics')}</div><div class="modRow">${current.map((id) => `<span class="relicChip" title="${relicText(id).desc}">${icon(RULES.relics[id].icon)}<span>${relicText(id).name}</span></span>`).join('')}</div>` : '';
}
// pick up to 3 supplies from the inventory for tonight (default: the first ones you own)
function renderHousePicker() {
  const el = $('ncHouse'); const owned = save.meta.houses;
  const houseIcons = { manor: 'home', library: 'i_book', pirate: 's_pirate', alchemist: 's_wizard' };
  const houseKeys = { manor: 'houseManor', library: 'houseLibrary', pirate: 'housePirate', alchemist: 'houseAlchemist' };
  el.innerHTML = `<div class="ncLbl">${t('houseT')}</div><div class="houseRow">` + Object.keys(RULES.houses).map((id) => {
    const on = L.house === id, own = owned.includes(id), price = RULES.houses[id].price;
    return `<button class="houseBtn ${on ? 'on' : ''}" data-h="${id}">${icon(houseIcons[id] || 'home')}<span>${t(houseKeys[id] || 'houseManor')}</span>${own ? '' : `<small>${icon('lock')}<span class="coin"></span><span class="num">${price}</span></small>`}</button>`;
  }).join('') + '</div>';
  el.querySelectorAll('[data-h]').forEach((b) => { b.onclick = () => {
    const id = b.dataset.h; if (id === L.house) return;
    const ok = save.meta.houses.includes(id) ? chooseHouse(save, id) : buyHouse(save, id);
    if (!ok) { sfx.deny(); return; }
    writeSave(save); if (b.querySelector('small')) sfx.buy(); newNightSoon();
  }; });
}
function renderKitPicker() {
  const inv = save.run.inv, owned = Object.keys(RULES.consumables).filter((k) => k !== 'slots' && (inv[k] || 0) > 0);
  const el = $('ncKit'); if (!owned.length) { el.innerHTML = ''; kitSel = []; return; }
  kitSel = kitSel.filter((k) => owned.includes(k));
  if (!kitSel.length) for (const k of owned) for (let i = 0; i < inv[k] && kitSel.length < RULES.consumables.slots; i++) kitSel.push(k);
  const count = (k) => kitSel.filter((x) => x === k).length;
  el.innerHTML = `<div class="ncLbl">${t('kitTitle')}</div><div class="kitRow">${owned.map((k) => `<button class="kitPick ${count(k) ? 'on' : ''}" data-k="${k}" title="${goodText(k).name}">${icon(GOOD_ICON[k])}<span class="badge num">${count(k)}/${inv[k]}</span></button>`).join('')}</div>`;
  el.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => {
    const k = b.dataset.k, c = count(k);
    if (c < inv[k] && kitSel.length < RULES.consumables.slots) kitSel.push(k); else kitSel = kitSel.filter((x) => x !== k);
    renderKitPicker();
  }; });
}
function renderKitSlots() {
  const el = $('kitSlots'); if (!S) { el.innerHTML = ''; return; }
  el.innerHTML = S.kit.map((k, i) => `<button class="kround blue act" data-slot="${i}" aria-label="${goodText(k).name}">${icon(GOOD_ICON[k])}</button>`).join('');
  el.querySelectorAll('[data-slot]').forEach((b) => press(b, () => S && mode === 'play' && (useItem(S, +b.dataset.slot) || sfx.deny())));
}
// before a night starts: is the guild's rent due?
// Building a room takes a few hundred ms on a slow phone: let the tap's screen change paint first, then build,
// so the button answers at once instead of the whole UI freezing on the old screen.
const afterPaint = (fn) => requestAnimationFrame(() => setTimeout(fn, 0));
let nightQueued = false;
function newNightSoon() { if (nightQueued) return; nightQueued = true; afterPaint(() => { nightQueued = false; newNight(); }); }
function beginNight() {
  if (!rentDueNow(save.run)) { newNightSoon(); return; }
  mode = 'result'; S = null; hide('menu'); hide('hud'); resKind('rent');
  const amt = rentAmount(save.run.rentIdx), can = canPayRent(save.run);
  $('resTitle').textContent = t('rentDueTitle'); $('resStars').innerHTML = '';
  $('resLines').innerHTML = `<p class="resText">${t('rentDueText', { n: amt })}</p>`;
  $('resItems').innerHTML = ''; $('resTotal').innerHTML = `<div class="kpanel dark"><span class="coin"></span><span class="num">${save.coins}</span></div>`;
  $('resBtns').innerHTML = (can ? `<button class="kbtn green big" id="rentPay">${icon('bank')}<span>${t('pay')}</span><span class="coin"></span><span class="num">${amt}</span></button>` : '')
    + `<div class="rowBtns">${save.stash.length || !can ? `<button class="kbtn yellow" id="rentSell">${icon('stall')}<span>${t('sellFirst')}</span></button>` : ''}<button class="kbtn grey" id="rentGive">${t('giveUp')}</button></div>`;
  const pb = $('rentPay'); if (pb) pb.onclick = () => { payRent(save.run); writeSave(save); sfx.buy(); hide('result'); newNightSoon(); };
  const sb = $('rentSell'); if (sb) sb.onclick = () => { hide('result'); marketView.enter('run'); };
  $('rentGive').onclick = () => gameOver();
  show('result');
}
// the result card's look: win (gold), lose (red), rent (purple), over (dark)
const resKind = (k) => { $('result').querySelector('.kcard').className = 'kcard res ' + k; };
function gameOver() {
  const sum = endRun(save); writeSave(save); kitSel = [];
  mode = 'result'; S = null; sfx.lose(); resKind('over');
  $('resTitle').textContent = t('gameOver'); $('resStars').innerHTML = '';
  $('resLines').innerHTML = `<p class="resText">${t('gameOverText')}</p><div class="goRun"><div><b class="num">${sum.nights}</b>${t('sumNights')}</div><div><b class="num">${sum.sold}</b>${t('sumSold')}</div><div><b class="num">${sum.rentsPaid}</b>${t('sumRents')}</div></div>`;
  $('resItems').innerHTML = ''; $('resTotal').innerHTML = '';
  $('resBtns').innerHTML = `<button class="kbtn yellow big" id="newRunBtn">${icon('play')}<span>${t('newRun')}</span></button><div class="rowBtns"><button class="kround grey" id="menuBtn2">${icon('home')}</button></div>`;
  $('newRunBtn').onclick = () => { hide('result'); newNightSoon(); };
  $('menuBtn2').onclick = () => { hide('result'); toMenu(); };
  show('result');
}

function startPlay() {
  hide('nightCard'); show('hud'); mode = 'play'; gov.reset();
  if (S && !S.kitPacked) {
    S.kit = packKit(save.run, kitSel); S.kitPacked = true; save.run.activeNight = run.night;
    save.meta.monsterStats ||= {}; save.meta.monsterStats[S.L.monster.id] ||= { seen: 0, escaped: 0 }; save.meta.monsterStats[S.L.monster.id].seen++;
    writeSave(save);
  }
  renderKitSlots();
  $('nightNum').textContent = run.night;
  $('modIcons').innerHTML = L.mods.map((m) => `<span title="${m.name}">${icon(m.icon)}</span>`).join('');
  const rIcons = $('relicIcons');
  if (rIcons) {
    rIcons.innerHTML = (S.relics || []).map((id) => `<span class="relicBadge" title="${relicText(id).name}: ${relicText(id).desc}">${icon(RULES.relics[id].icon)}</span>`).join('');
  }
  if (!save.hints.move) setTimeout(() => hint('move', t('hintMove')), 1500);
  burst(new THREE.Vector3(S.player.x, 0.5, S.player.z), '#ffffff', 8, 'puff');
  updateHud();
}

// 4 tiny gauges instead of a sentence: hearing, snore length, how often it peeks, chase speed
function monsterGauges(m) {
  const lv = (v) => (v < 0.95 ? 1 : v > 1.05 ? 3 : 2);
  const dots = (n) => `<span class="dots">${[0, 1, 2].map((k) => `<u class="${k < n ? 'f' : ''}"></u>`).join('')}</span>`;
  return [['ear', m.hearing], ['zzz', m.snoreLen], ['eye', m.peekRate], ['run', m.speed]].map(([i, v]) => `<span>${icon(i)} ${dots(lv(v))}</span>`).join('');
}
function hint(key, text) { if (save.hints[key]) return; save.hints[key] = 1; writeSave(save); banner(text, 2.2); }

// ---------------- sim events -> juice + sound ----------------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpC = new THREE.Color();
function handleEvents(instant = false) {
  for (const e of S.events) {
    if (instant) { applyInstant(e); continue; }
    switch (e.type) {
      case 'step': sfx.step(e.n, e.tile, e.run, e.x, e.z); if (e.run) { puff(e.x, e.z); sfx.jingle(S.weight, e.x, e.z); } break;
      case 'noise': spawnRing(e.x, e.z, e.n); break;
      case 'bump': sfx.bump(e.mat, e.k, e.x, e.z); break;
      case 'topple': sfx.topple(e.mat, e.x, e.z); puff(e.x, e.z, 4); shake = Math.max(shake, 0.12); break;
      case 'squeak': {
        sfx.squeak(e.x, e.z); puff(e.x, e.z, 3);
        const sm = props.squeakMeshes.get(e.key); if (sm) sm.userData.flash = 1;
        hint('squeak', t('hintSqueak')); break;
      }
      case 'pickup': {
        const v = props.treasures.get(e.id);
        sfx.pickup(e.kind, e.x, e.z);
        floater('+ ' + itemName(e.kind), new THREE.Vector3(e.x, 1, e.z), '#ffe066');
        if (e.kind === 'chest') { burst(new THREE.Vector3(e.x, 0.6, e.z), '#ffd23f', 22, 'fountain'); }
        else burst(new THREE.Vector3(e.x, 0.5, e.z), e.kind === 'gem' ? '#9fe7ff' : '#ffe066', 10);
        if (v) { if (e.kind === 'chest') { v.done = true; } else v.fly = { t: 0, from: v.g.position.clone() }; }
        bumpHud('lootPill'); vibrate(15); break;
      }
      case 'creak': { const ct = S.treasures.find((q) => q.id === e.id); if (ct) (ct.kind === 'chest' ? sfx.creak(ct.x, ct.z) : sfx.rummage(ct.x, ct.z)); const v = props.treasures.get(e.id); if (v) v.wiggle = 1; } break;
      case 'power': {
        const v = props.powerups.get(e.id); if (v) { world.remove(v.g); props.powerups.delete(e.id); }
        sfx.power(e.kind, e.x, e.z); burst(new THREE.Vector3(e.x, 0.5, e.z), '#bfe9ff', 12);
        if (e.kind !== 'feather') bumpHud('lullBtn'); break;
      }
      case 'duck': { sfx.duckToy(e.x, e.z); spawnRing(e.x, e.z, 12); const v = props.ducks.get(e.id); if (v) { v.spin = 14; v.squash = 1; } vibrate(30); break; }
      case 'catHiss': {
        sfx.catHiss(e.x, e.z);
        spawnRing(e.x, e.z, 14, '#ff9999');
        burst(new THREE.Vector3(e.x, 0.4, e.z), '#ffb380', 10, 'sparks');
        floater(t('catAlert'), new THREE.Vector3(e.x, 0.8, e.z), '#ff8888');
        vibrate([60, 40, 60]);
        hint('cat', t('hintCat'));
        break;
      }
      case 'wardrobeEnter': {
        sfx.creak(e.x, e.z);
        if (!S.toldWardrobe) { S.toldWardrobe = true; banner(t('wardrobeHidden'), 1.2); }
        break;
      }
      case 'wardrobeExit': {
        sfx.creak(e.x, e.z);
        break;
      }
      case 'drop': addTreasureView({ id: e.id, kind: e.kind, x: e.x, z: e.z }); sfx.drop(e.x, e.z); floater('- ' + itemName(e.kind), new THREE.Vector3(S.player.x, 1, S.player.z), '#ff9b9b'); bumpHud('lootPill'); break;
      case 'monsterToss':
        sfx.rustle(e.x, e.z);
        spawnRing(e.x, e.z, 5, '#e0d0ff');
        break;
      case 'monsterNightmare':
        sfx.groan(e.x, e.z);
        shake = Math.max(shake, 0.18);
        vibrate(25);
        burst(new THREE.Vector3(e.x, 1.4, e.z), '#9e7fff', 8, 'puff');
        floater(t('nightmare'), new THREE.Vector3(e.x, 2.2, e.z), '#d6b8ff');
        break;
      case 'sleepwalkStart':
        sfx.yawn(e.x, e.z);
        banner(t('sleepwalkBanner'), 1.8);
        vibrate([40, 40]);
        MO.bubble.visible = true;
        break;
      case 'sleepwalkEnd':
        sfx.yawn(e.x, e.z);
        MO.bubble.visible = true;
        break;
      case 'lullaby':
        sfx.lullaby(); burstNotes();
        if (e.mode !== 'calm') { MO.stars.visible = true; sfx.dizzy(S.monster.x, S.monster.z); }
        break;
      case 'snore': sfx.snore(e.len, S.monster.homeX, S.monster.homeZ); hint('snore', t('hintSnore')); break;
      case 'hmm': sfx.hmm(S.monster.homeX, S.monster.homeZ); hint('peek', t('hintPeek')); break;
      case 'heart': sfx.heart(); break;
      case 'alarm': sfx.alarm(); break;
      case 'wake':
        banner(t(e.reason === 'dawn' ? 'dawnWake' : 'wake'), 1.6);
        { const rx = S.monster.x, rz = S.monster.z; setTimeout(() => sfx.roar(rx, rz), e.reason === 'dawn' ? 500 : 0); }
        shake = 0.7; flash = 1; grade.uniforms.flashCol.value.set(1, 0.2, 0.2); vibrate([80, 40, 160]);
        MO.bubble.visible = false; burst(MO.bubble.getWorldPosition(tmpV), '#bfe9ff', 8);
        MO.jolt = 1; spawnRing(MO.group.position.x, MO.group.position.z, 30, '#ff5a5a');
        break;
      case 'chase': hint('chase', t('hintChase')); break;
      case 'pounce': MO.jolt = 0.7; shake = Math.max(shake, 0.25); sfx.stomp(e.x, e.z); sfx.hmm(e.x, e.z); vibrate(40); break;
      case 'giveUp': sfx.yawn(S.monster.x, S.monster.z);  break;
      case 'asleep': MO.bubble.visible = true;  MO.stars.visible = false; break;
      case 'caught': sfx.thud(S.player.x, S.player.z); sfx.lose(); shake = 0.6; flash = 1; grade.uniforms.flashCol.value.set(1, 1, 1); vibrate([200, 60, 200]); banner(t('caughtBanner'), 1.6); break;
      case 'escaped': sfx.door(L.exit.x, L.exit.z); sfx.win(); vibrate(60); banner(t('escapedBanner'), 1.4); props.door.userData.door.rotation.y = -1.2; burst(new THREE.Vector3(L.exit.x, 1, L.exit.z), '#5cff9a', 16); break;
      case 'emptyHint': banner(t('emptyHint'), 0.8); break;
      case 'use':
        save.run.kit = S.kit.slice(); writeSave(save); renderKitSlots(); burst(new THREE.Vector3(S.player.x, 0.8, S.player.z), e.kind === 'smoke' ? '#c9c4d6' : e.kind === 'sleepdust' ? '#d8c8ff' : '#ffffff', e.kind === 'smoke' ? 26 : 12, 'puff');
        if (e.kind === 'smoke') { sfx.whoosh(); sfx.dizzy(S.monster.x, S.monster.z); MO.stars.visible = true; }
        else if (e.kind === 'sleepdust') { sfx.whoosh(); sfx.snore(2.4, S.monster.homeX, S.monster.homeZ); burst(new THREE.Vector3(S.monster.x, 1.6, S.monster.z), '#d8c8ff', 18, 'puff'); }
        else if (e.kind === 'lockpick') sfx.click(); else if (e.kind === 'feather') sfx.power('feather', S.player.x, S.player.z);
        floater(goodText(e.kind).name, new THREE.Vector3(S.player.x, 1.2, S.player.z), '#bfe9ff'); break;
      case 'crack': sfx.tone(1800, 0.06, { type: 'square', vol: 0.06 }); sfx.noise(0.08, { type: 'highpass', freq: 3000, vol: 0.08 }); floater(t('crack'), new THREE.Vector3(e.x, 1.2, e.z), '#ff9b9b'); vibrate(20); hint('crack', t('hintCrack')); break;
      case 'curse': sfx.tick(e.x, e.z, true); sfx.tick(e.x, e.z, true); spawnRing(e.x, e.z, 6, '#b58cff'); hint('curse', t('hintCurse')); break;
    }
  }
  S.events.length = 0;
}
// fast-forward (?sim): only keep the visual state consistent
function applyInstant(e) {
  if (e.type === 'pickup') { const v = props.treasures.get(e.id); if (v) { if (e.kind === 'chest') v.done = true; else { world.remove(v.g); props.treasures.delete(e.id); } } }
  if (e.type === 'power') { const v = props.powerups.get(e.id); if (v) { world.remove(v.g); props.powerups.delete(e.id); } }
  if (e.type === 'drop') addTreasureView({ id: e.id, kind: e.kind, x: e.x, z: e.z });
  if (e.type === 'wake') MO.bubble.visible = false;
  if (e.type === 'asleep') MO.bubble.visible = true;
}

function finishNight() {
  mode = 'result'; hide('hud'); input.release(); takeHeld = false;
  delete save.run.activeNight;
  const r = nightResult(S);
  unpackKit(save.run, S.kit); S.kit = []; renderKitSlots();
  const played = run.night; run.night++; // time passes either way; only the rent can end a run
  // loot as little cards that drop in one after another; lost loot is greyed out with a red cross
  const chip = (it, bad, i = 0) => `<div class="rItem ${bad ? 'bad' : ''}" style="--d:${0.35 + i * 0.08}s"><span class="lootIc">${icon('i_' + it.kind)}${bad ? `<span class="rX">${icon('cross')}</span>` : ''}</span><span>${itemName(it.kind)}</span></div>`;
  resKind(r.ok ? 'win' : 'lose');
  if (r.ok) {
    const { lost: noRoom } = stashLoot(save.run, r.items); const fresh = collect(save.meta, r.items.filter((it) => !noRoom.includes(it))); save.coins += r.bonus; save.escapes++; save.run.escapes++; save.run.stolen += r.items.length; save.bestNight = Math.max(save.bestNight, played);
    save.meta.monsterStats ||= {}; save.meta.monsterStats[S.L.monster.id] ||= { seen: 0, escaped: 0 }; save.meta.monsterStats[S.L.monster.id].escaped++;
    writeSave(save);
    $('resTitle').textContent = t('escaped');
    $('resItems').innerHTML = r.items.filter((it) => !noRoom.includes(it)).map((it, i) => chip(it, false, i)).join('') + (noRoom.length ? `<div class="rl bad">${icon('bag')}${t('stashLost')}</div>` + noRoom.map((it, i) => chip(it, true, i)).join('') : '');
    if (fresh.length) setTimeout(() => banner(t('newTrophy'), 1.4), 600);
    $('resLines').innerHTML = r.bonus ? `<div class="rl good">${icon('sparkles')}${t('bonus')} <span class="coin"></span><span class="num">+${r.bonus}</span></div>` : '';
    $('resTotal').innerHTML = `<span class="small">${icon('bag')}${t('toStash')}</span>`;
    $('resBtns').innerHTML = `<button class="kbtn yellow big" id="mkGo">${icon('stall')}<span>${t('market')}</span></button>
      <div class="rowBtns"><button class="kbtn green" id="nextBtn">${icon('moon')}<span class="num">${run.night}</span>${icon('play')}</button><button class="kround grey" id="menuBtn2">${icon('home')}</button></div>`;
    $('mkGo').onclick = () => { hide('result'); marketView.enter('run'); };
    $('nextBtn').onclick = () => { hide('result'); beginNight(); };
  } else {
    save.caught++; save.run.caught++; writeSave(save);
    $('resTitle').textContent = t('caught');
    $('resItems').innerHTML = r.lost.map((it, i) => chip(it, true, i)).join('');
    $('resLines').innerHTML = ''; $('resTotal').innerHTML = '';
    $('resBtns').innerHTML = `<button class="kbtn yellow big" id="againBtn">${icon('moon')}<span class="num">${run.night}</span>${icon('play')}</button>
      <div class="rowBtns">${save.stash.length ? `<button class="kbtn green" id="mkGo">${icon('stall')}<span>${t('market')}</span></button>` : ''}<button class="kround grey" id="menuBtn2">${icon('home')}</button></div>`;
    $('againBtn').onclick = () => { hide('result'); beginNight(); };
    const mg = $('mkGo'); if (mg) mg.onclick = () => { hide('result'); marketView.enter('run'); };
  }
  $('menuBtn2').onclick = () => { hide('result'); toMenu(); };
  $('resStars').innerHTML = [0, 1, 2].map((i) => `<i class="${i < r.stars ? 'on' : ''}"></i>`).join('');
  show('result');
}

// ---------------- loose props (physics lives in physics.js, stepped by the sim) ----------------
// wrap a model in a pivot that follows its body; returns the pivot (or the model when there is no sim)
let simForBuild = null;
function addLoose(g, kind, x, z, obstacle = null) {
  const sim = simForBuild;
  if (!sim) { g.position.set(x, 0, z); world.add(g); return g; }
  let body = obstacle ? sim.bodies.find((bd) => bd.obstacle === obstacle) : null;
  if (!body) { body = makeBody(kind, x, z); sim.bodies.push(body); }
  // bounding-box corners in pivot space: used to keep a tipped prop resting on the floor, never sinking into it
  g.position.set(0, 0, 0); g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g);
  const pivot = new THREE.Group(); pivot.position.set(x, 0, z); pivot.add(g); world.add(pivot);
  const corners = [];
  for (const cx of [bb.min.x, bb.max.x]) for (const cy of [bb.min.y, bb.max.y]) for (const cz of [bb.min.z, bb.max.z]) corners.push(new THREE.Vector3(cx, cy, cz));
  body.view = { pivot, corners };
  return pivot;
}
const qTip = new THREE.Quaternion(), qYaw = new THREE.Quaternion(), vAx = new THREE.Vector3(), vUp = new THREE.Vector3(0, 1, 0), vC = new THREE.Vector3();
function renderBodies() {
  if (!S || !S.bodies) return;
  for (const b of S.bodies) {
    const v = b.view; if (!v) continue;
    qYaw.setFromAxisAngle(vUp, b.yaw);
    if (b.tip > 0) { vAx.set(b.ax, 0, b.az).normalize(); qTip.setFromAxisAngle(vAx, b.tip); v.pivot.quaternion.multiplyQuaternions(qTip, qYaw); }
    else v.pivot.quaternion.copy(qYaw);
    let minY = 0;
    if (b.tip > 0) { minY = Infinity; for (const c of v.corners) { vC.copy(c).multiply(v.pivot.scale).applyQuaternion(v.pivot.quaternion); minY = Math.min(minY, vC.y); } }
    v.pivot.position.set(b.x, -minY, b.z);
  }
}

// ---------------- animation ----------------
function animate(dt) {
  // player
  const pl = S ? S.player : null;
  const pg = player.group;
  if (pl) { pg.position.set(pl.x, 0, pl.z); pg.rotation.y = pl.facing; }
  else if (L) { pg.position.set(L.start.x, 0, L.start.z); pg.rotation.y = -L.exit.side * Math.PI / 2; }
  const menuSneak = !pl && mode === 'menu' && menuScene.built;
  const m = pl ? pl.m : menuSneak ? menuScene.V.m : 0; const tip = m > 0.02 && m < RULES.player.tiptoeBelow;
  if (player.mixer) animateRogue(dt, m, tip);
  else {
    P_step += dt * (m > 0.02 ? 6 + m * 8 : 0);
    const bob = m > 0.02 ? Math.abs(Math.sin(P_step)) * (tip ? 0.04 : 0.1) : 0;
    player.body.position.y = bob; player.body.scale.y = tip ? 0.9 : 1; player.body.rotation.x = m > 0.6 ? 0.18 : tip ? 0.08 : 0;
    player.feet[0].position.z = m > 0.02 ? Math.sin(P_step) * 0.14 : 0.02; player.feet[1].position.z = m > 0.02 ? -Math.sin(P_step) * 0.14 : 0.02;
  }
  const ss = S ? 0.55 + Math.min(S.weight, 16) * 0.055 : 0.55;
  animateCostume(player, time);
  sackPunch = Math.max(0, sackPunch - dt * 4);
  const sp = 1 + Math.sin(sackPunch * Math.PI) * 0.35;
  player.sack.scale.set(ss * sp, ss / sp, ss * sp);
  player.sack.visible = S ? S.weight > 0 : mode === 'wardrobe';
  if (S) pg.visible = !((S.state === 'escaped' && S.endT > 0.7) || S.player.inWardrobe);
  const fa = S ? S.player.facing : 0; lantern.position.set(pg.position.x + Math.sin(fa) * 0.9, 1.7, pg.position.z + Math.cos(fa) * 0.9 + 0.3);

  // treasures: pop-in, bob, fly into the sack
  for (const [id, v] of props.treasures) {
    const t = S && S.treasures.find((x) => x.id === id);
    const pop = clamp((time - v.spawnAt) / 0.4, 0, 1); const s = pop <= 0 ? 0.001 : easeOutBack(pop);
    if (v.fly) {
      v.fly.t += dt / 0.32; const k = Math.min(1, v.fly.t);
      player.sack.getWorldPosition(tmpV);
      v.g.position.lerpVectors(v.fly.from, tmpV, k); v.g.position.y += Math.sin(k * Math.PI) * 1.2;
      v.g.scale.setScalar(Math.max(0.05, 1 - k * 0.8)); v.g.rotation.y += dt * 12;
      if (k >= 1) { world.remove(v.g); props.treasures.delete(id); sackPunch = 1; }
      continue;
    }
    if (v.kind === 'chest') {
      v.g.scale.setScalar(s);
      const lid = v.g.userData.lid; const prog = v.done ? 1 : t ? t.progress : 0;
      if (lid) { lid.userData.rx0 ??= lid.rotation.x; lid.rotation.x = lid.userData.rx0 - prog * 1.6; }
      v.wiggle = Math.max(0, (v.wiggle || 0) - dt * 5); v.g.rotation.z = Math.sin(time * 40) * 0.04 * v.wiggle;
      continue;
    }
    v.bob += dt * 2; v.g.position.y = 0.05 + Math.sin(v.bob) * 0.06; v.g.rotation.y += dt * 0.8; v.g.scale.setScalar(s);
  }
  if (S) {
    for (const d of S.ducks) { const v = props.ducks.get(d.id); if (!v) continue; v.g.position.set(d.x, 0, d.z); v.g.rotation.y += v.spin * dt; v.spin *= 0.92; v.squash = Math.max(0, (v.squash || 0) - dt * 3); v.g.scale.set(1 + v.squash * 0.3, 1 - v.squash * 0.4, 1 + v.squash * 0.3); }
    for (const c of S.cats || []) { const v = props.cats.get(c.id); if (!v) continue; v.g.position.set(c.x, 0, c.z); if (c.startled) { v.g.rotation.y = Math.atan2(c.vx, c.vz); v.g.position.y = Math.abs(Math.sin(time * 18)) * 0.12; } }
  }
  for (const v of props.powerups.values()) { v.g.position.y = 0.15 + Math.sin(time * 3 + v.x) * 0.1; v.g.rotation.y += dt * 1.5; }
  world.children.forEach((g) => { // furniture settle-in
    if (!g.userData.settle) return; const k = clamp((time - g.userData.spawnAt) / 0.45, 0, 1);
    if (k <= 0) { g.scale.setScalar(0.001); return; }
    const sq = Math.sin(k * Math.PI) * 0.18 * (1 - k); g.scale.set(1 + sq, k < 1 ? easeOutBack(k) - sq : 1, 1 + sq);
    if (k >= 1) { g.scale.set(1, 1, 1); g.userData.settle = false; }
  });
  for (const f of props.flames) f.scale.set(1 + Math.sin(time * 17 + f.id) * 0.15, 1.6 + Math.sin(time * 23) * 0.25, 1);
  props.curtains.forEach((c, i) => { c.rotation.z = Math.sin(time * 0.9 + i * 2) * 0.05; c.rotation.x = Math.sin(time * 0.7 + i) * 0.04; });
  const NL = NIGHT[L && L.has('dark') ? 'dark' : 'normal'];
  nestLight.intensity = NL.lamp * (1 + Math.sin(time * 7.3) * 0.03 + Math.sin(time * 13.1) * 0.02);
  const useCandles = save.quality === 'high';
  candles.forEach((c, i) => {
    c.visible = useCandles && !!c.userData.on;
    c.intensity = c.visible ? NL.candle * (1 + Math.sin(time * 11 + i * 2) * 0.08 + Math.sin(time * 23 + i) * 0.05) : 0;
  });
  const LS = lanternStats(save.run); lantern.distance = S ? LS.dist : 8;
  lantern.intensity = NL.lantern * (1 + Math.sin(time * 9) * 0.02) * (S ? LS.mult : 0.4);
  setDarkLight(pg.position.x, 1, pg.position.z, LS.darkR);
  if (!S && !L && hideoutView.built) {
    nestLight.intensity = 11;
    candles.forEach((c, i) => {
      c.visible = useCandles && !!c.userData.on;
      c.intensity = c.visible ? 3 * (1 + Math.sin(time * 11 + i * 2) * 0.08) : 0;
    });
  }
  hideoutView.update(dt); if (mode === 'menu') menuScene.update(dt);
  for (const sm of props.squeakMeshes.values()) if (sm.userData.flash > 0) { sm.userData.flash -= dt * 1.5; sm.position.y = 0.008 - Math.max(0, sm.userData.flash) * 0.04; }
  if (props.exitMat) {
    const ready = S && S.bag.length > 0;
    props.exitMat.material.opacity = (ready ? 0.45 : 0.18) + Math.sin(time * 4) * 0.1;
    props.exitGlow.material.opacity = ready ? 0.6 + Math.sin(time * 4) * 0.2 : 0.15;
  }
  if (props.clockHand && S) props.clockHand.rotation.z = -Math.min(1, S.t / L.dawnTime) * Math.PI * 2;
  // dawn tint
  if (S && L) {
    // dawn: moonlight turns into warm morning light over the last 40% of the night
    const k = clamp((S.t / L.dawnTime - 0.6) / 0.4, 0, 1);
    sun.color.setRGB(lerp(0.66, 1, k), lerp(0.74, 0.78, k), lerp(1, 0.55, k)); sun.intensity = lerp(NL.sun, 1.3, k * k);
    hemi.intensity = lerp(NL.hemi, 0.6, k * k);
    moon.color.setRGB(lerp(0.56, 1, k), lerp(0.69, 0.6, k), lerp(1, 0.4, k)); moon.intensity = NL.moon + k * 0.8;
    if (props.beam) props.beam.material.color.setRGB(lerp(0.72, 1, k), lerp(0.8, 0.75, k), lerp(1, 0.5, k));
  }
  // motes drift
  if (L && motes.visible) {
    const pos = moteGeo.attributes.position.array;
    for (let i = 0; i < MOTES; i++) { const ph = moteSeed[i][3]; pos[i * 3] += Math.sin(time * 0.3 + ph) * dt * 0.08; pos[i * 3 + 1] += Math.cos(time * 0.25 + ph) * dt * 0.05; }
    moteGeo.attributes.position.needsUpdate = true; motes.material.opacity = 0.35 + Math.sin(time * 0.7) * 0.1;
  }

  renderBodies();
  if (MO) animateMonster(dt);
  // Zzz
  const sleeping = MO && (S ? S.monster.state === 'sleep' && S.peek === 'none' : !(mode === 'menu' && menuScene.V.peek !== 'none'));
  if (MO) MO.head.getWorldPosition(tmpV);
  for (const z of zs) {
    z.s.visible = !!sleeping; if (!z.s.visible) continue;
    const sn = S && S.snoring;
    z.t += dt * (sn ? 0.55 : 0.3); if (z.t > 1) z.t -= 1;
    z.s.position.set(tmpV.x + 0.6 + z.t * 1.2 + Math.sin(z.t * 6) * 0.2, tmpV.y + 0.8 + z.t * 2.0, tmpV.z + 0.2);
    const sc = (0.35 + z.t * 0.6) * (sn ? 1.5 : 1); z.s.scale.set(sc, sc, 1); z.s.material.opacity = Math.sin(z.t * Math.PI);
  }
  // fx
  for (const r of rings) if (r.m.visible) {
    r.t += dt / r.life; if (r.t >= 1) { r.m.visible = false; continue; }
    const s = r.max * (0.2 + r.t * 0.8); r.m.scale.set(s, s, s); r.m.material.opacity = (1 - r.t) * 0.6;
  }
  for (const s of sparks) if (s.s.visible) {
    s.t += dt; if (s.t > s.life) { s.s.visible = false; continue; }
    s.v.y -= dt * s.g; s.s.position.addScaledVector(s.v, dt); if (s.s.position.y < 0.05) { s.s.position.y = 0.05; s.v.y *= -0.4; s.v.x *= 0.7; s.v.z *= 0.7; }
    const k = 1 - s.t / s.life; s.s.material.opacity = k; s.s.scale.setScalar(0.25 * k + 0.05);
  }
  for (const p of puffs) if (p.s.visible) {
    p.t += dt; const k = p.t / p.life; if (k >= 1) { p.s.visible = false; continue; }
    p.s.position.addScaledVector(p.v, dt); const sc = 0.25 + k * 0.5; p.s.scale.set(sc, sc, 1); p.s.material.opacity = (1 - k) * 0.45;
  }
  flash = Math.max(0, flash - dt * 6); grade.uniforms.flash.value = flash;
  // danger grading: vignette tightens with wake, red tint while chased, cool tint while snoring
  const w = S ? S.wake / 100 : 0; const chased = S && ['chase', 'wakeup'].includes(S.state);
  const peekSeen = S && S.peek === 'open' && !S.hidden;
  grade.uniforms.vig.value = lerp(grade.uniforms.vig.value, (S ? 1.0 : 0.6) + w * 0.5 + (chased || peekSeen ? 0.5 : 0), 0.08);
  const tint = grade.uniforms.tint.value;
  if (chased || peekSeen) tint.lerp(tmpC.setRGB(1.1, 0.88, 0.88), 0.08);
  else if (S && S.snoring) tint.lerp(tmpC.setRGB(0.94, 0.98, 1.08), 0.05);
  else tint.lerp(tmpC.setRGB(1, 1, 1), 0.05);
  const vigEl = $('vignette'), flashEl = $('flash');
  if (vigEl) vigEl.style.setProperty('--vig', (w * 0.45 + (chased || peekSeen ? 0.4 : 0.15)).toFixed(2));
  if (flashEl) flashEl.style.backgroundColor = flash > 0 ? `rgba(255, 45, 45, ${(flash * 0.4).toFixed(2)})` : 'transparent';
}
let P_step = 0, sackPunch = 0;

function animateRogue(dt, m, tip) {
  const a = player.actions; const st = S && S.state;
  let want = 'Idle_A', ts = 1;
  if (st === 'caught') want = 'Death_A';
  else if (st === 'escaped') { want = 'Running_A'; ts = 1.2; }
  else if (S && S.player.opening && m < 0.05) want = 'Interact';
  else if (m >= RULES.player.tiptoeBelow) { want = 'Running_A'; ts = (0.7 + m * 0.5) * (S ? weightFactor(S) : 1); }
  else if (m > 0.02) { want = 'Walking_A'; ts = 0.6 + m * 0.6; }
  if (!a[want]) want = 'Idle_A';
  if (player.cur !== want && a[want]) {
    a[want].reset().setEffectiveWeight(1).fadeIn(0.18).play();
    if (player.cur && a[player.cur]) a[player.cur].fadeOut(0.18);
    player.cur = want;
  }
  if (a[want]) a[want].timeScale = ts;
  player.body.scale.y = lerp(player.body.scale.y, tip ? 0.9 : 1, 0.2);
  player.mixer.update(dt);
}

function animateMonster(dt) {
  const ms = S ? S.monster : { state: 'sleep', stun: 0, t: 0, x: MO.home.x, z: MO.home.z, yaw: MO.home.yaw };
  const st = ms.state; const p = MO.pivot;
  MO.group.position.set(ms.x, 0.15, ms.z); MO.group.rotation.y = ms.yaw;
  MO.jolt = Math.max(0, MO.jolt - dt * 2.5);
  const j = Math.sin(MO.jolt * Math.PI * 2) * MO.jolt; // wake-up squash & stretch
  MO.group.scale.set(MO.scale0 * (1 - j * 0.15), MO.scale0 * (1 + j * 0.25), MO.scale0 * (1 - j * 0.15));
  const peek = S ? S.peek : menuScene.built && mode === 'menu' ? menuScene.V.peek : null;
  if (st === 'sleep') {
    const sn = S && S.snoring; const br = Math.sin(time * (sn ? 1.8 : 1.3));
    p.scale.set(1 + br * 0.015, 1 + br * (sn ? 0.06 : 0.035), 1); p.position.y = 0; p.rotation.set(0, 0, 0);
    MO.head.rotation.set(0.05 + br * 0.03, 0, Math.sin(time * 0.5) * 0.05);
    MO.bubble.scale.setScalar(0.6 + (br * 0.5 + 0.5) * (sn ? 1.6 : 0.9));
    const restless = S ? S.wake : 0;
    if (restless > 45) MO.head.rotation.z += Math.sin(time * 9) * 0.03 * (restless / 100);
    if (restless > 70) MO.tail.rotation.y = Math.sin(time * 3) * 0.2; else MO.tail.rotation.y = Math.sin(time * 0.8) * 0.06;
    const open = peek === 'open', warn = peek === 'warn';
    MO.eyesClosed.forEach((e, i) => { e.visible = !open; e.position.y = 0.18 + (warn ? Math.sin(time * 40 + i) * 0.03 : 0); });
    MO.eyesOpen.forEach((e) => { e.visible = open; e.scale.set(1, 0.75, 1); });
    MO.brows.forEach((b) => { b.visible = open || restless > 75; });
    MO.mouth.visible = false; MO.teeth.forEach((t) => { t.visible = false; }); MO.smile.visible = true;
    if (open) lookAtPlayer();
    if (ms.twitch > 0) {
      MO.arms.forEach((a, i) => { a.rotation.x = Math.sin(time * 35 + i) * 0.35; a.rotation.z = Math.cos(time * 30) * 0.2; });
      MO.head.rotation.z += Math.sin(time * 25) * 0.08;
    } else {
      MO.arms.forEach((a) => { a.rotation.x = 0; a.rotation.z = 0; });
    }
  } else if (st === 'sleepwalk') {
    const walk = Math.sin(time * 4);
    p.position.y = 0.35 + Math.abs(walk) * 0.12;
    p.rotation.z = walk * 0.04;
    p.rotation.x = -0.08;
    MO.head.rotation.set(0.18, 0, Math.sin(time * 2) * 0.06);
    MO.eyesClosed.forEach((e) => { e.visible = true; });
    MO.eyesOpen.forEach((e) => { e.visible = false; });
    MO.brows.forEach((b) => { b.visible = false; });
    MO.mouth.visible = false; MO.teeth.forEach((t) => { t.visible = false; }); MO.smile.visible = true;
    MO.bubble.visible = true;
    MO.arms.forEach((a, i) => { a.rotation.x = -1.1 + Math.sin(time * 4 + i * Math.PI) * 0.25; a.rotation.z = 0; });
    MO.tail.rotation.y = Math.sin(time * 3) * 0.15;
    if (Math.abs(walk) > 0.94 && !MO.stepped) { MO.stepped = true; sfx.stomp(ms.x, ms.z); }
    else if (Math.abs(walk) < 0.25) { MO.stepped = false; }
  } else {
    const stand = st === 'wakeup' ? Math.min(1, ms.t / 0.4) : 1;
    const moving = (st === 'chase' && ms.stun <= 0) || st === 'return';
    p.position.y = stand * 0.35 + (moving ? Math.abs(Math.sin(time * 9)) * 0.18 : 0);
    p.rotation.z = moving ? Math.sin(time * 9) * 0.07 : 0;
    p.rotation.x = st === 'caught' ? 0.25 : -stand * 0.12;
    p.scale.set(1, 1 + (st === 'wakeup' ? Math.sin(ms.t * 20) * 0.04 : 0), 1);
    MO.head.rotation.set(st === 'wakeup' ? -0.35 * stand : -0.1, 0, ms.stun > 0 ? Math.sin(time * 6) * 0.25 : 0);
    const sleepy = st === 'return';
    MO.eyesClosed.forEach((e) => { e.visible = sleepy; });
    MO.eyesOpen.forEach((e) => { e.visible = !sleepy; e.scale.set(1, 1, 1); });
    MO.brows.forEach((b) => { b.visible = !sleepy; });
    MO.mouth.visible = !sleepy; MO.mouth.scale.y = 0.6 + (st === 'wakeup' || st === 'caught' ? 0.4 : Math.abs(Math.sin(time * 5)) * 0.2);
    MO.teeth.forEach((t) => { t.visible = !sleepy; }); MO.smile.visible = sleepy;
    MO.arms.forEach((a, i) => { a.rotation.x = moving ? Math.sin(time * 9 + i * Math.PI) * 0.5 - 0.3 : -0.6 * stand; });
    MO.tail.rotation.y = Math.sin(time * 6) * 0.25;
    MO.stars.visible = ms.stun > 0; if (ms.stun > 0) MO.stars.rotation.y += dt * 4;
    if (!sleepy) lookAtPlayer();
    if (moving && Math.random() < dt * 6) puff(ms.x + (Math.random() - 0.5), ms.z + (Math.random() - 0.5), 1, 1.6);
  }
}
function lookAtPlayer() {
  MO.head.getWorldPosition(tmpV);
  const pp = S ? S.player : player.group.position;
  const dx = pp.x - tmpV.x, dz = pp.z - tmpV.z, d = Math.hypot(dx, dz) || 1, yaw = S ? S.monster.yaw : MO.group.rotation.y;
  const lx = clamp(dx / d * Math.cos(yaw) - dz / d * Math.sin(yaw), -1, 1);
  MO.pupils.forEach((pu) => { pu.position.x = lx * 0.07; pu.position.y = -0.03; });
}

function spawnRing(x, z, n, color) {
  const r = rings.find((q) => !q.m.visible) || rings[0];
  r.m.visible = true; r.t = 0; r.max = 0.6 + Math.min(n, 14) * 0.32; r.life = 0.5 + Math.min(n, 14) * 0.04;
  if (n > 20) { r.max = 9; r.life = 0.9; }
  r.m.position.set(x, 0.04, z);
  r.m.material.color.set(color || (n > 6 ? '#ff7a7a' : n > 2.5 ? '#ffd27a' : '#bfe6ff'));
}
function burst(pos, color, n, kind) {
  if (kind === 'puff') { for (let i = 0; i < n; i++) puff(pos.x + (Math.random() - 0.5) * 0.6, pos.z + (Math.random() - 0.5) * 0.6, 1, 1.3); return; }
  for (let i = 0; i < n; i++) {
    const s = sparks.find((q) => !q.s.visible); if (!s) return;
    s.s.visible = true; s.t = 0; s.life = 0.6 + Math.random() * 0.5; s.s.material.color.set(color); s.s.position.copy(pos);
    if (kind === 'fountain') { s.v.set((Math.random() - 0.5) * 2.5, 5 + Math.random() * 3, (Math.random() - 0.5) * 2.5); s.g = 12; s.life = 1.1; }
    else { s.v.set((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4); s.g = 6; }
  }
}
function puff(x, z, n = 1, size = 1) {
  for (let i = 0; i < n; i++) {
    const p = puffs.find((q) => !q.s.visible); if (!p) return;
    p.s.visible = true; p.t = 0; p.life = 0.5 + Math.random() * 0.3; p.s.position.set(x, 0.12, z);
    p.v.set((Math.random() - 0.5) * 0.6, 0.35 + Math.random() * 0.3, (Math.random() - 0.5) * 0.6); p.s.material.rotation = Math.random() * 6;
    p.s.scale.setScalar(0.25 * size);
  }
}
function burstNotes() {
  const from = new THREE.Vector3(S.player.x, 1.2, S.player.z);
  for (let i = 0; i < 6; i++) setTimeout(() => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: NOTE, transparent: true, depthWrite: false }));
    sp.scale.set(0.6, 0.6, 1); sp.position.copy(from); fxRoot.add(sp);
    const to = MO.group.position.clone(); to.y = 2.5; let t = 0;
    const tick = () => { t += 0.03; sp.position.lerpVectors(from, to, t); sp.position.y += Math.sin(t * Math.PI) * 1.5; if (t < 1) requestAnimationFrame(tick); else { fxRoot.remove(sp); sp.material.dispose(); } };
    tick();
  }, i * 120);
}

// ---------------- camera ----------------
let camSnap = true; const camLook = new THREE.Vector3(), _ct = new THREE.Vector3(), _co = new THREE.Vector3(), _cw = new THREE.Vector3();
function updateCamera(dt) {
  const portrait = innerWidth < innerHeight;
  let target, off;
  if (mode === 'menu' && !L && menuScene.built && menuScene.V.focus) { target = _ct.copy(menuScene.V.stallAt); off = _co.set(1.4, 1.2, 4.2); }
  else if (mode === 'menu' && !L && menuScene.built) {
    target = portrait ? _ct.set(-0.6, 0.4, -0.6) : _ct.set(-0.2, 1.1, -0.9);
    off = portrait ? _co.set(0, 4.8, 13.5) : _co.set(0, 2.5, 8.8);
  }
  else if ((mode === 'menu' || mode === 'hideout') && !L && hideoutView.built) {
    target = (mode === 'hideout' && !portrait) ? _ct.set(1.5, 1.2, -0.5) : _ct.set(0, 0.9, -0.4);
    off = portrait ? _co.set(0, 6.2, 12.5) : (mode === 'hideout' ? _co.set(0, 3.8, 8.5) : _co.set(0, 3.4, 7.8));
  }
  else if (mode === 'wardrobe') { const pp = player.group.position; target = portrait ? _ct.set(pp.x, -0.25, pp.z) : _ct.set(pp.x + 0.95, 0.7, pp.z); off = portrait ? _co.set(0, 1.05, 4.4) : _co.set(0, 0.6, 3.2); }
  else if (mode === 'market') { target = _ct.set(0, 1.35, 0.4); off = portrait ? _co.set(0, 2.4, 8.6) : _co.set(0, 1.7, 5.6); }
  else if (mode === 'gallery') { target = _ct.set(0, 0.3, 0.6); off = _co.set(0, 12, 6.5); }
  else if (mode === 'menu' || !L || !S) {
    const a = time * 0.12; const R = L ? Math.max(L.W, L.D) * 0.75 : 14;
    target = L ? _ct.set(L.nest.x * 0.5, 0, L.nest.z + 1.5) : _ct.set(0, 0, 0);
    off = _co.set(Math.sin(a) * R * 0.6, R * 0.75, Math.cos(a) * R * 0.5 + R * 0.55);
    if (portrait) off.multiplyScalar(1.35);
  } else if (mode === 'night') {
    target = _ct.set(0, 0, 0); const R = Math.max(L.W / (portrait ? 0.9 : 1.6), L.D);
    off = _co.set(0, R * 1.05, R * 0.75);
  } else {
    target = _ct.set(S.player.x, 0, S.player.z - 0.8);
    target.lerp(MO.group.position, ['chase', 'wakeup'].includes(S.state) ? 0.3 : 0.18); // keep the monster nearer the frame
    target.x = clamp(target.x, -L.W / 2 + (portrait ? 3 : 5), L.W / 2 - (portrait ? 3 : 5));
    target.z = clamp(target.z, -L.D / 2 + (portrait ? 4 : 3), L.D / 2 - 2.5);
    // settings 'Kamera': 0 = close, 1 = far. Default 0.25 is much closer than before on phones.
    off = portrait ? _co.set(0, 19, 11.5).multiplyScalar(lerp(0.5, 1.0, save.zoom)) : _co.set(0, 12.5, 8.2).multiplyScalar(lerp(0.72, 1.15, save.zoom));
  }
  const want = _cw.copy(target).add(off);
  const k = camSnap ? 1 : 1 - Math.exp(-dt * (mode === 'play' ? 5 : 2));
  camera.position.lerp(want, k); camLook.lerp(target, k); camSnap = false;
  if (shake > 0) { shake -= dt; camera.position.x += (Math.random() - 0.5) * shake * 0.6; camera.position.y += (Math.random() - 0.5) * shake * 0.6; }
  const sway = L && L.sway && mode === 'play';
  if (sway) camera.position.y += Math.sin(time * 1.4) * 0.08;
  camera.lookAt(camLook);
  if (sway) camera.rotateZ(Math.sin(time * 1.4) * 0.015); // after lookAt, which would reset it
  if (L) { sun.position.set(camLook.x + 6, 16, camLook.z + 9); sun.target.position.copy(camLook); }
}

// ---------------- HUD / DOM ----------------
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
let bannerTimer = 0;
function banner(text, dur = 1.2) { const b = $('banner'); b.textContent = text; b.classList.add('on'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('on'), dur * 1000); }
function bumpHud(id) { const el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
const floaters = [];
function floater(text, pos, color) {
  const el = document.createElement('div'); el.className = 'floater'; el.textContent = text; el.style.color = color;
  $('floaters').appendChild(el); floaters.push({ el, pos: pos.clone(), t: 0 });
}
function updateFloaters(dt) {
  const w = innerWidth, h = innerHeight;
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    if (f.persist) {
      tmpV.copy(f.pos).project(camera);
      const px = Math.round((tmpV.x * 0.5 + 0.5) * w), py = Math.round((-tmpV.y * 0.5 + 0.5) * h);
      f.el.style.fontSize = '12px';
      f.el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
      continue;
    }
    f.t += dt;
    if (f.t > 1.1) { f.el.remove(); floaters.splice(i, 1); continue; }
    tmpV.copy(f.pos); tmpV.y += 1 + f.t * 1.2; tmpV.project(camera);
    const pop = f.t < 0.12 ? 0.6 + f.t / 0.12 * 0.6 : 1.2 - Math.min(0.2, (f.t - 0.12));
    const px = Math.round((tmpV.x * 0.5 + 0.5) * w), py = Math.round((-tmpV.y * 0.5 + 0.5) * h);
    f.el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) scale(${pop})`;
    f.el.style.opacity = String(1 - Math.max(0, f.t - 0.6) / 0.5);
  }
}
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHud() {
  if (!S) return;
  const w = clamp(S.wake, 0, 100);
  $('wakeFill').style.width = `calc(${w}% + 6px)`; const wc = 'kfill ' + (S.snoring ? 'blue' : w < 45 ? 'green' : w < 75 ? 'yellow' : 'red'); if (hudCache.wc !== wc) { hudCache.wc = wc; $('wakeFill').className = wc; }
  const face = ['chase', 'wakeup'].includes(S.state) ? 'awake' : S.state === 'return' ? 'yawn' : S.peek === 'open' ? 'peek' : w < 45 ? 'sleep' : w < 75 ? 'drowsy' : 'angry';
  if (hudCache.face !== face + L.monster.id) { hudCache.face = face + L.monster.id; $('wakeFace').innerHTML = monsterFace(face, L.monster.color, L.monster.belly); } $('wakeFace').classList.toggle('shake', w > 75 && S.state === 'play');
  $('wakeBar').classList.toggle('snore', !!S.snoring);
  const left = L.dawnTime - S.t; setText('timeTxt', left < 15 ? String(Math.max(0, Math.ceil(left))) : ''); if (hudCache.dawn !== (left < 15)) { hudCache.dawn = left < 15; $('dawnIcon').innerHTML = icon(left < 15 ? 'sunrise' : 'moon'); }
  $('dawnRing').style.setProperty('--p', clamp(S.t / L.dawnTime * 100, 0, 100) + '%');
  setText('lootTxt', String(S.bag.length));
  updateTakeBtn(); setText('lullCount', String(S.lull));
  $('lullBtn').classList.toggle('hidden', S.lull <= 0); $('dropBtn').classList.toggle('off', !S.bag.length);
  let cls = '', txt = '';
  if (S.L.inDark(S.player.x, S.player.z)) hint('dark', t('hintDark'));
  if (['chase', 'wakeup'].includes(S.state)) { cls = 'chase'; txt = S.dawn ? icon('door') + t('run') : icon('run') + Math.ceil(Math.max(0, S.chaseT)); if (S.monster.stun > 0) txt = icon('dizzy'); }
  else if (S.state === 'return') { cls = 'snore'; txt = icon('bed'); }
  else if (S.peek === 'warn') { cls = 'peek'; txt = icon('warn') + t('stop'); }
  else if (S.peek === 'open') { if (S.hidden) { cls = 'hidden2'; txt = icon('hide'); } else { cls = 'peek'; txt = icon('eye') + (S.player.m > 0.1 ? t('seen') : ''); } }
  else if (S.feather > 0) { cls = 'feather'; txt = icon('feather') + Math.ceil(S.feather); }
  else if (S.snoring) { cls = 'snore'; txt = icon('zzz') + t('go'); }
  const tag = $('statusTag');
  if (hudCache.tag !== cls + txt) { hudCache.tag = cls + txt; tag.className = cls ? 'on ' + cls : ''; tag.innerHTML = txt; }
}
function debugLog() {
  const el = $('debuglog'); if (!el || !S) return;
  el.textContent = `night=${S.night} seed=${S.L.seed} t=${S.t.toFixed(1)} state=${S.state} wake=${S.wake.toFixed(0)} value=${S.value} bag=${S.bag.length} collected=${S.collected}/${S.total} monster=${S.L.monster.id} mods=${S.L.mods.map((m) => m.id).join(',') || '-'}`;
}

function toMenu() {
  mode = 'menu'; hide('hud'); hide('result'); hide('pause'); show('menu');
  S = null;
  L = null; MO = null; menuScene.build(); MO = makeMonster(menuScene.V.monster, menuScene.V.home); camSnap = true;
  $('stashBadge').textContent = save.stash.length; $('stashBadge').classList.toggle('hidden', !save.stash.length);
  $('menuStats').innerHTML = `<div class="kpanel dark"><span class="coin"></span><span class="num">${save.coins}</span></div><div class="kpanel">${icon('moon')}<span class="num">${run.night}</span></div>` + (save.bestNight ? `<div class="kpanel" title="${t('bestNight')}">${icon('trophy')}<span class="num">${save.bestNight}</span></div>` : '');
}

// ---------------- ?gallery ----------------
function showGallery() {
  mode = 'gallery'; hide('menu'); hide('how'); clearWorld(); S = null; L = null; player.group.visible = false;
  scene.background = new THREE.Color('#2a2046');
  const floor = M(new THREE.PlaneGeometry(40, 40), toon('#5a4a7a'), 0, 0, 0, world, false); floor.rotation.x = -Math.PI / 2;
  const items = AS.galleryList().filter((x) => !x.key.startsWith('anim'));
  const procedural = ['bookshelf', 'blocks', 'duck', 'gem', 'crown', 'monster', 'thief'];
  const all = [...items.map((x) => ({ label: x.key, ok: x.ok, make: () => (x.key === 'rogue' ? AS.galleryModel('rogue') : AS.galleryModel(x.key)) })),
    ...procedural.map((k) => ({ label: k + ' (kod)', ok: true, make: () => {
      if (k === 'bookshelf' || k === 'blocks') return buildFurniture(k, k === 'bookshelf' ? 0.6 : 0.32, 0.3);
      if (k === 'duck') return buildDuck(); if (k === 'gem' || k === 'crown') return buildTreasure(k);
      if (k === 'monster') { const g = monsterModel(MONSTERS[0]).group; g.scale.setScalar(0.35); return g; }
      return buildPlayer().group;
    } }))];
  const cols = Math.ceil(Math.sqrt(all.length * 1.4)); const sp = 1.7;
  const lines = [];
  all.forEach((it, i) => {
    const x = (i % cols - (cols - 1) / 2) * sp, z = (Math.floor(i / cols) - Math.floor(all.length / cols) / 2) * sp;
    const g = it.ok ? it.make() : null;
    if (g) { g.position.set(x, 0, z); world.add(g); }
    lines.push(`${it.ok ? 'ok ' : 'MISSING '}${it.label}`);
    floater(it.label, new THREE.Vector3(x, -0.95, z + 0.75), it.ok ? '#ffffff' : '#ff6b6b'); floaters[floaters.length - 1].persist = true;
  });
  hemi.intensity = 1.2; sun.intensity = 1.8; scene.environmentIntensity = 0.6;
  $('debuglog').textContent = `gallery: ${items.filter((x) => x.ok).length}/${items.length} glTF loaded; ${lines.filter((l) => l.startsWith('MISSING')).join(', ') || 'none missing'}`;
  camSnap = true;
}

// ---------------- skill tree ----------------
let shopSel = 'socks';
function renderShop() {
  const MAX = RULES.upgrades.max, up = save.upgrades;
  $('shopCoins').textContent = save.coins;
  // Two branches, each a row of nodes joined by a line (left to right = unlock order). A node: its icon in a
  // round button, its name and five level pips. Locked nodes are grey with a lock; one you can afford glows.
  // The panel on the right explains the selected skill and holds the only buy button.
  const pips = (lv, cls = '') => `<span class="pips ${cls}">${Array.from({ length: MAX }, (_, i) => `<i class="${i < lv ? 'f' : ''}"></i>`).join('')}</span>`;
  const node = (k, col) => { const it = SHOP.find((s) => s.k === k), lv = upg(k), locked = skillLocked(k, up);
    const can = !locked && lv < MAX && save.coins >= shopCost(k, lv);
    return `<button class="node ${locked ? 'locked' : ''} ${k === shopSel ? 'sel' : ''} ${can ? 'can' : ''} ${lv >= MAX ? 'max' : ''}" data-k="${k}" title="${it.nm}"><span class="kround ${locked ? 'grey' : col}">${icon(it.ic)}${locked ? `<span class="nLock">${icon('lock')}</span>` : ''}</span><span class="nNm">${it.nm}</span>${pips(lv)}</button>`; };
  const tree = BRANCHES.map((b) => `<div class="branch ${b.id}"><div class="bHead">${icon(b.id === 'thief' ? 'paw' : 'stall')}<span>${t(b.id === 'thief' ? 'branchThief' : 'branchTrade')}</span></div><div class="bRow">${b.skills.map((k) => node(k, b.id === 'thief' ? 'green' : 'blue')).join('<i class="link"></i>')}</div></div>`).join('');
  const it = SHOP.find((s) => s.k === shopSel), lv = upg(shopSel), locked = skillLocked(shopSel, up), max = lv >= MAX, c = shopCost(shopSel, lv);
  const req = RULES.upgrades.req[shopSel];
  const action = locked ? `<div class="lockTxt">${icon('lock')}<span>${t('locked', { skill: SHOP.find((s) => s.k === req[0]).nm, n: req[1] })}</span></div>`
    : max ? `<div class="maxTxt">${icon('check')}<span>${t('maxed')}</span></div>`
    : `<button class="kbtn yellow" id="buySkill" ${save.coins < c ? 'disabled' : ''}>${icon('up')}<span class="coin"></span><span class="num">${c}</span></button>`;
  const branchCol = BRANCHES.find((b) => b.skills.includes(shopSel)).id === 'thief' ? 'green' : 'blue';
  $('shopList').innerHTML = `<div class="tree">${tree}</div>
    <div class="skillInfo"><div class="sTop"><span class="kround ${locked ? 'grey' : branchCol}">${icon(it.ic)}</span><div><div class="nm">${it.nm}</div><div class="lvRow">${pips(lv, 'big')}<span class="num">${lv}/${MAX}</span></div></div></div><div class="ds">${it.ds()}</div>${action}</div>`;
  $('shopList').querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { shopSel = b.dataset.k; renderShop(); }; });
  const bb = $('buySkill'); if (bb) bb.onclick = () => {
    if (save.coins < c || skillLocked(shopSel, up) || upg(shopSel) >= MAX) return;
    save.coins -= c; save.upgrades[shopSel] = upg(shopSel) + 1; writeSave(save); sfx.buy(); renderShop();
  };
}

// ---------------- UI wiring ----------------
$('playBtn').onclick = () => { hide('menu'); if (!save.hints.mortStory && !autoplay && !Q.has('demo')) marketView.story('next'); else beginNight(); };
$('sneakBtn').onclick = () => { if (relicPending()) { sfx.deny(); hint('relic', t('relicLocked')); return; } startPlay(); };
const marketView = createMarketView({
  $, show, hide, icon, t, line, itemName, save, writeSave, sfx, M, toon, AS, buildMerchant, buildTreasure, buildFurniture,
  scene, hemi, sun, moon, lantern, nestLight, candles, get player() { return player; },
  clearWorld: () => { clearWorld(); return world; }, world: () => world,
  setMode: (m) => { mode = m; S = null; MO = null; L = null; ['menu', 'hud', 'result', 'nightCard', 'shop', 'how', 'settings', 'pause'].forEach(hide); camSnap = true; },
  nextNight: () => run.night, floaterScreen: (txt) => banner(txt, 1), goodText,
  shake: (v) => { shake = Math.max(shake, v); },
  onLeave: (where) => { if (where === 'next') beginNight(); else toMenu(); },
});
// the Market is the merchant's stall in the menu scene (no button): click the stall or its sign
function openStall() {
  if (mode !== 'menu' || menuScene.V.focus) return;
  sfx.click(); menuScene.V.focus = true; menuScene.hover(false); $('menu').style.cursor = ''; hide('menu');
  setTimeout(() => { if (mode === 'menu') marketView.enter('menu'); }, 420); // the camera leans in first
}
const onStall = (e) => !(e.target.closest && e.target.closest('button')) && menuScene.pick(e.clientX, e.clientY);
$('menu').addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const hot = onStall(e); if (hot !== menuScene.V.hot) { menuScene.hover(hot); $('menu').style.cursor = hot ? 'pointer' : ''; } });
$('menu').addEventListener('click', (e) => { if (onStall(e)) openStall(); });
$('stallTag').onclick = openStall;
$('stallTag').onpointerenter = () => menuScene.hover(true); $('stallTag').onpointerleave = () => menuScene.hover(false);
const hideoutView = createHideoutView({
  $, show, hide, icon, t, setText: setTextOf, lanternName, decorName, itemName, save, writeSave, sfx, M, toon, AS, buildTreasure, buildFurniture,
  scene, hemi, sun, moon, lantern, nestLight, candles, get player() { return player; },
  clearWorld: () => { clearWorld(); menuScene.leave(); MO = null; return world; }, dress: (w) => dress(w), floaterScreen: (txt) => banner(txt, 1), toMenu: () => toMenu(),
  setMode: (m) => { mode = m; S = null; MO = null; ['menu', 'hud', 'result', 'nightCard', 'shop', 'how', 'settings', 'pause'].forEach(hide); camSnap = Q.has('demo'); },
});
const menuScene = createMenuScene({
  M, toon, AS, buildNest, buildTreasure, buildFurniture, buildMerchant, GLOW, camera, canvas: renderer.domElement, tag: () => $('stallTag'),
  scene, hemi, sun, moon, lantern, nestLight, candles, get player() { return player; },
  clearWorld: () => { clearWorld(); hideoutView.leaveScene(); return world; },
  snore: () => { if (!document.hidden) sfx.snore(2.2, undefined, undefined, 0.4); },
});
$('wardrobeBtn').onclick = () => hideoutView.openWardrobe();
$('hideoutBtn').onclick = () => hideoutView.openHideout();
const bestiaryView = createBestiaryView({
  save, d: { toMenu: () => toMenu() }, sfx, hide, show
});
$('bestiaryBtn').onclick = () => bestiaryView.openBestiary();
$('shopBtn').onclick = () => { hide('menu'); renderShop(); show('shop'); };
$('howBtn').onclick = () => { hide('menu'); show('how'); };
// ---------------- settings ----------------
const zoomName = (z) => t(z < 0.34 ? 'zoomNear' : z < 0.67 ? 'zoomMid' : 'zoomFar');
function applySettings() {
  sfx.setVolumes(save.vol.music, save.vol.sfx);
  if (bloom) bloom.enabled = save.hq; if (gtao) gtao.enabled = save.hq;
}
function applyQuality() {
  if (save.qualityAuto) save.quality = detectTier(renderer, isTouch);
  const q = save.quality || (isTouch ? 'med' : 'high');
  save.quality = q;
  save.hq = q === 'high';
  scene.environment = q === 'low' ? null : envTex;
  gov.setLooks(perfLooks()); // also syncs shadows + materials through applyPerf
  applySettings();
  resize();
  syncShadows();
  sfx.lowPower = q === 'low'; // picked up when the audio context is created (first tap)
  sfx.setReverb(q !== 'low');
  if (motes) motes.visible = q !== 'low';
}
function syncSettings() {
  const set = (id, v) => { const el = $(id); el.value = Math.round(v * 100); el.style.setProperty('--v', el.value + '%'); };
  set('setMusic', save.vol.music); set('setSfx', save.vol.sfx); set('setZoom', save.zoom);
  $('setMusicV').textContent = Math.round(save.vol.music * 100); $('setSfxV').textContent = Math.round(save.vol.sfx * 100); $('setZoomV').textContent = zoomName(save.zoom);
  $('setVibrate').classList.toggle('on', save.vibrate);
  const curQ = save.qualityAuto ? 'auto' : save.quality || (isTouch ? 'med' : 'high');
  const qList = [
    { id: 'auto', label: t('qualityAuto') },
    { id: 'low', label: t('qualityLow') },
    { id: 'med', label: t('qualityMed') },
    { id: 'high', label: t('qualityHigh') },
  ];
  const qContainer = $('qualityBtns');
  if (qContainer) {
    qContainer.innerHTML = qList.map((q) => `<button class="qBtn ${q.id === curQ ? 'on' : ''}" data-q="${q.id}">${q.label}</button>`).join('');
    qContainer.querySelectorAll('[data-q]').forEach((b) => {
      b.onclick = () => {
        save.qualityAuto = b.dataset.q === 'auto';
        if (!save.qualityAuto) save.quality = b.dataset.q;
        gov.full('settings'); // a fresh choice starts in full; the governor steps down again if it has to
        writeSave(save);
        applyQuality();
        syncSettings();
      };
    });
  }
  $('langBtns').innerHTML = LANGS.map((l) => `<button class="flagBtn ${l.id === getLang() ? 'on' : ''}" data-lang="${l.id}" title="${l.name}" aria-label="${l.name}">${flag(l.id)}</button>`).join('');
  $('langBtns').querySelectorAll('[data-lang]').forEach((b) => { b.onclick = () => changeLang(b.dataset.lang); });
}
// switch language live: static texts, settings panel, menu, HUD
function changeLang(id) {
  save.lang = id; setLang(id); writeSave(save); applyStatic(); syncSettings();
  for (const k in hudCache) delete hudCache[k];
  if (S) updateHud();
  $('menuStats').innerHTML = $('menuStats').innerHTML.replace(/title="[^"]*"/, `title="${t('bestNight')}"`);
}
function openSettings() { syncSettings(); show('settings'); }
let sfxTestT = 0;
$('setMusic').oninput = (e) => { save.vol.music = e.target.value / 100; applySettings(); syncSettings(); };
$('setSfx').oninput = (e) => { save.vol.sfx = e.target.value / 100; applySettings(); syncSettings(); if (performance.now() - sfxTestT > 180) { sfxTestT = performance.now(); sfx.pickup('coins'); } };
$('setZoom').oninput = (e) => { save.zoom = e.target.value / 100; syncSettings(); };
['setMusic', 'setSfx', 'setZoom'].forEach((id) => { $(id).onchange = () => writeSave(save); });
$('setVibrate').onclick = () => { save.vibrate = !save.vibrate; writeSave(save); syncSettings(); if (save.vibrate) vibrate(40); };
$('settingsBtn').onclick = () => { hide('menu'); openSettings(); };
$('pauseSettings').onclick = () => { hide('pause'); openSettings(); };
$('settingsClose').onclick = () => { writeSave(save); hide('settings'); if (paused) show('pause'); else if (mode === 'menu') show('menu'); };
// frame-rate governor (perf.js): shadows / materials / 30 fps cap while a night runs slow, back up with headroom.
// It never touches the resolution.
const perfLooks = () => looks(save.qualityAuto, save.quality);
let liteApplied = false;
function syncLite() { const on = liteOn(); if (on || liteApplied) setLite(scene, on); liteApplied = on; }
function applyPerf(step, why) {
  const lookChanged = step.shadows !== perfStep.shadows || step.lite !== perfStep.lite;
  perfStep = step;
  if (lookChanged || why === 'looks' || why === 'settings') { syncShadows(); syncLite(); } // the cap alone needs neither
  if (why !== 'looks' && (save.perfLook !== gov.look || save.perfCap !== gov.cap)) { save.perfLook = gov.look; save.perfCap = gov.cap; writeSave(save); }
  if (Q.has('perf')) console.log('[perf]', JSON.stringify(step), why);
}
const gov = createGovernor({ looks: perfLooks(), look: save.perfLook || 0, cap: !!save.perfCap, apply: applyPerf });
perfStep = gov.step();
// 120 Hz panels: play at 60 fps (half the GPU work and heat); 60 / 90 Hz run at their own rate
let refreshMs = 16.7, refreshCap = 0;
measureRefresh((ms) => { refreshMs = Math.min(ms, 16.7); refreshCap = ms < 10 ? 1000 / 60 : 0; }); // boot jank only lengthens frames
const playMinMs = () => Math.max(refreshCap, perfStep.cap || 0);
applyQuality();
document.querySelectorAll('[data-close]').forEach((b) => { b.onclick = () => {
  hide(b.dataset.close);
  if (b.dataset.close === 'how') { save.seenHow = true; writeSave(save); if (mode === 'menu') show('menu'); }
  if (b.dataset.close === 'shop') toMenu();
}; });
const press = (el, fn) => el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); userTapped = true; sfx.init(); fn(); });
press($('dropBtn'), () => S && mode === 'play' && (dropLoot(S) || sfx.deny()));
press($('lullBtn'), () => S && mode === 'play' && (useLullaby(S) || sfx.deny()));
press($('pauseBtn'), () => pause(true));
$('resumeBtn').onclick = () => pause(false);
$('quitBtn').onclick = () => { hide('pause'); paused = false; if (S) { unpackKit(save.run, S.kit); S.kit = []; } delete save.run.activeNight; run.night++; writeSave(save); toMenu(); }; // leaving a night = the night is lost
window.addEventListener('keydown', (e) => {
  if (mode !== 'play' || !S) return;
  if (e.code === 'Space') useLullaby(S);
  if (/^Digit[1-3]$/.test(e.code)) useItem(S, +e.code.slice(5) - 1) || sfx.deny();
  if (e.code === 'KeyQ') dropLoot(S);
  if (e.code === 'Escape' || e.code === 'KeyP') pause(!paused);
});
let paused = false;
function pause(v) { if (mode !== 'play') return; sfx.whoosh(); paused = v; v ? show('pause') : hide('pause'); input.release(); }
// in the background: pause the night and silence the audio (looping room tone, snores…), wake it again on return
function onBackground(bg) { if (bg && mode === 'play' && !autoplay && !paused) pause(true); sfx.setBackground(bg); }
document.addEventListener('visibilitychange', () => onBackground(document.hidden));
// Android back button: pause a night, otherwise close the open panel; on the menu it sends the app to the background
const BACK = [['settings', '#settingsClose'], ['pause', '#resumeBtn'], ['how', '[data-close]'], ['shop', '[data-close]'],
  ['market', '#mkHome, [data-a="leave"], #mkStory'], ['wardrobe', '#wdBack'], ['hideoutUI', '#hoBack'], ['bestiaryUI', '#bmBack'], ['result', '#menuBtn2']];
function onBack() {
  if (mode === 'play' && !paused) { pause(true); return; }
  for (const [id, sel] of BACK) {
    const el = $(id); if (!el || el.classList.contains('hidden')) continue;
    const b = el.querySelector(sel); if (b && !b.disabled) { b.click(); return; }
  }
  if (!$('nightCard').classList.contains('hidden')) { hide('nightCard'); toMenu(); return; }
  if (Capacitor.isNativePlatform()) App.minimizeApp().catch(() => {});
}
window.__back = onBack; // test hook
if (Capacitor.isNativePlatform()) {
  App.addListener('backButton', onBack);
  App.addListener('pause', () => onBackground(true));
  App.addListener('resume', () => onBackground(false));
}

// ---------------- main loop ----------------
function resize() {
  const w = innerWidth, h = innerHeight;
  const pr = getQualityRatio();
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  if (composer) {
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
  }
  camera.aspect = w / h; camera.fov = w < h ? 56 : 42; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
initFit();

// hold-to-take: on-screen button (touch) or E / Enter (keyboard)
let takeHeld = false;
const takeBtn = $('takeBtn');
takeBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); userTapped = true; sfx.init(); takeHeld = true; takeBtn.classList.add('held'); });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) takeBtn.addEventListener(ev, () => { takeHeld = false; takeBtn.classList.remove('held'); });
function updateTakeBtn() {
  const id = S && ['play', 'chase', 'wakeup', 'return'].includes(S.state) ? S.player.near : null;
  takeBtn.classList.toggle('hidden', id == null);
  if (id == null) return;
  const it = S.treasures.find((q) => q.id === id); takeBtn.style.setProperty('--p', Math.round((it ? it.progress : 0) * 100) + '%');
  takeBtn.classList.toggle('off', !!S.player.full); if (S.player.full) hint('full', t('bagFull'));
  if (!save.hints.take) hint('take', t('hintTake'));
}
function simTick(dt) {
  const inp = autoplay ? bot(S, dt) : { ...input.get(), take: takeHeld || !!(input.keys.KeyE || input.keys.Enter) };
  step(S, dt, inp); handleEvents();
  if (S.done && mode === 'play') finishNight();
}
// positional ambience driven by sim state: monster footsteps, the dawn clock, birds, a creaky old house
const A = { stompT: 0, tickK: -1 };
function audioAmbience(dt) {
  if (paused || S.done) return;
  const ms = S.monster;
  if ((ms.state === 'chase' && ms.stun <= 0) || ms.state === 'return') {
    A.stompT -= dt; if (A.stompT <= 0) { A.stompT = ms.state === 'return' ? 0.55 : 0.34; sfx.stomp(ms.x, ms.z); }
  }
  const left = L.dawnTime - S.t, rate = left < 15 ? 2 : 1, k = Math.floor(S.t * rate);
  if (k !== A.tickK) { A.tickK = k; sfx.tick(L.nest.x, -L.D / 2, left < 15); }
  if (left < 12 && Math.random() < dt * 0.8) sfx.bird();
  if (S.state === 'play' && Math.random() < dt / 18) sfx.houseCreak();
}
let last = performance.now(), hudT = 0, liteSweepT = 0;
let introOn = false; // the Astrava intro covers the screen: draw nothing underneath so the phone can give it every frame
// Once the furniture has settled in, bake everything in the room that never moves again into one mesh per
// material (lite.js): ~300 draw calls become a few dozen, the biggest CPU cost on entry-level phones.
function mergeWorld() {
  world.userData.merged = true;
  if (Q.has('nomerge')) return;
  const dyn = new Set();
  const add = (x) => { if (!x) return; if (x.isObject3D) { dyn.add(x); return; } if (typeof x === 'object') for (const v of Object.values(x)) if (v && v.isObject3D) dyn.add(v); };
  for (const v of Object.values(props)) { if (v instanceof Map) v.forEach(add); else if (Array.isArray(v)) v.forEach(add); else add(v); }
  for (const b of S.bodies || []) if (b.view) dyn.add(b.view.pivot);
  fxHidden.forEach((o) => dyn.add(o));
  if (MO) dyn.add(MO.group);
  mergeJob = { world, it: mergeStaticJob(world, (o) => dyn.has(o)) };
}
let mergeJob = null;
// a few ms of merging per frame, so the night card and its buttons stay responsive while the room is baked
function runMerge(budgetMs) {
  if (!mergeJob) return;
  if (mergeJob.world !== world) { mergeJob = null; return; } // the room was rebuilt meanwhile
  const t0 = performance.now();
  for (;;) {
    const r = mergeJob.it.next();
    if (r.done) { if (Q.has('perf')) console.log('[perf] merged', r.value.before, '→', r.value.after, 'meshes'); mergeJob = null; return; }
    if (performance.now() - t0 > budgetMs) return;
  }
}
// Shader warm-up: whenever a new room (menu, hideout, market, night) is built, its shaders are compiled in the
// background (KHR_parallel_shader_compile) while the last frame stays on screen. Drawing right away would stall
// the page until every shader is compiled — the freeze after tapping a button on slow phones.
// The compile starts after a short timeout, so the screen the button opened (night card, wardrobe...) is painted
// first. A night room is also held back until it is baked (runMerge), so its ~2000 loose meshes are never drawn.
let warmWorld = null, compiling = false, holdUntil = 0;
function warmUp() {
  warmWorld = world;
  if (!renderer.compileAsync || Q.has('nowarm')) return;
  if (liteOn()) setLite(scene, true); // swap before compiling and baking: only the materials that will be drawn
  compiling = true; holdUntil = performance.now() + 2500; // never hold the picture longer than this
  const w = world, done = () => { if (warmWorld === w) compiling = false; };
  setTimeout(() => { if (warmWorld === w) renderer.compileAsync(scene, camera).then(done, done); }, 30);
}
const holding = () => (compiling || (liteOn() && mergeJob && mergeJob.world === world)) && performance.now() < holdUntil;
function frame(now) {
  requestAnimationFrame(frame);
  if (introOn) { last = now; return; }
  if (mode !== 'play' && now - last < 1000 / 32) return; // menus, market, hideout: 30 fps is plenty and saves battery
  const minMs = mode === 'play' ? playMinMs() : 0;
  if (minMs && now - last < minMs - 2) return; // -2: rAF timestamps jitter around the vsync
  const raw = (now - last) / 1000;
  let dt = Math.min(0.05, raw); last = now;
  if (mode === 'play' && !paused && !document.hidden && S && !autoplay) gov.sample(raw, Math.max(refreshMs, refreshCap));
  if ((liteSweepT -= raw) <= 0) { liteSweepT = 0.5; if (liteOn()) setLite(scene, true); } // new objects (treasures, costumes) get the simple materials too
  if (world !== warmWorld) warmUp();
  if (L && S && !world.userData.merged && !world.children.some((g) => g.userData.settle)) mergeWorld();
  runMerge(holding() ? 12 : 4); // nothing is drawn while holding: merge faster
  if (holding()) { const tx = levelTex.find((x) => !x.userData.up); if (tx) { renderer.initTexture(tx); tx.userData.up = true; } } // upload one room texture per frame instead of all on the first one
  if (paused) dt = 0;
  time += dt;
  if (mode === 'play' && S) {
    const n = autoplay ? Math.max(1, Math.round(speed)) : 1;
    for (let i = 0; i < n && mode === 'play'; i++) simTick(dt);
    hudT -= dt; if (hudT <= 0) { hudT = 0.05; updateHud(); debugLog(); }
    sfx.setListener(S.player.x, S.player.z, L.W / 2); audioAmbience(dt);
    sfx.update(dt, { mode: ['chase', 'wakeup'].includes(S.state) ? 'chase' : 'calm', intensity: S.wake / 100, muffled: S.snoring });
  } else sfx.update(dt, { mode: ['menu', 'market', 'wardrobe', 'hideout'].includes(mode) ? 'calm' : 'quiet' });
  marketView.update(dt);
  input.enabled = mode === 'play' && !paused;
  animate(dt); updateCamera(dt); updateFloaters(dt);
  if (holding() && mode !== 'play') return; // keep the last frame until the new room is compiled (and baked)
  if (composer) composer.render(dt);
  else renderer.render(scene, camera);
}

// boot: preload KayKit models (procedural fallback for any that fail), then menu or a debug entry point
hydrateIcons();
const playLabel = (t) => { $('playBtn').querySelector('span').textContent = t; };
applyStatic();
$('playBtn').disabled = true; playLabel(t('loading', { p: 0 }));
// Astrava Studios intro on every cold start, not skippable, over the splash while the models load underneath
// (off for debug / automation entry points). Game audio starts by itself right after it, no tap needed
// (the app WebView allows autoplay; a browser only after the intro's own tap-to-start gate).
if (['nointro', 'night', 'sim', 'demo', 'gallery', 'screen', 'autoplay'].some((k) => Q.has(k))) { document.getElementById('astrava-boot')?.remove(); sfx.init(); }
else { introOn = true; playAstravaIntro({ volume: 0.9 * save.vol.sfx, audio: save.vol.sfx > 0, skippable: false, tapText: t('tapStart'), onReveal: () => { introOn = false; } }).then(() => sfx.init()); }
// splash: progress bar + rotating gameplay hints until the models are in, then fade to the menu
const splashTips = ['hintSnore', 'hintPeek', 'hintSqueak', 'hintCat', 'hintChase', 'hintMove'].map((k) => t(k));
let splashTipAt = Math.floor(Math.random() * splashTips.length);
const showSplashTip = () => { $('splashTip').textContent = splashTips[splashTipAt++ % splashTips.length]; };
const splashTimer = setInterval(() => { $('splashTip').classList.add('fade'); setTimeout(() => { showSplashTip(); $('splashTip').classList.remove('fade'); }, 350); }, 3500);
showSplashTip();
const splashProgress = (p) => {
  const pct = Math.round(p * 100);
  $('splashFill').style.width = pct + '%'; $('splashPct').textContent = pct + '%'; $('splash').setAttribute('aria-valuenow', pct);
};
const endSplash = () => { splashProgress(1); clearInterval(splashTimer); const el = $('splash'); el.classList.add('done'); setTimeout(() => el.remove(), 500); };
requestAnimationFrame(frame);
AS.loadAssets((p) => { playLabel(t('loading', { p: Math.round(p * 100) })); splashProgress(p); }, { skip: Q.has('noassets') }).then(() => {
  endSplash();
  useRoguePlayer();
  $('playBtn').disabled = false; playLabel(t('play'));
  if (Q.has('gallery')) return showGallery();
  if (Q.has('demo')) { // ?demo[&wear=angel][&screen=wardrobe|hideout|market]: a filled hideout for screenshots (not saved)
    save.run.coins = 6000; save.seenHow = true; save.run.hideout.repair = true; if (Q.get('lang')) { setLang(Q.get('lang')); applyStatic(); }
    save.run.stash = [{ kind: 'vase', value: 220, weight: 3, seed: 11, cond: 0.7 }, { kind: 'gem', value: 300, weight: 1, seed: 12, cond: 1 }, { kind: 'book', value: 60, weight: 1, seed: 13, cond: 1 }];
    save.meta.collection = Object.keys(RULES.items).slice(0, 9); save.meta.decor = Object.keys(RULES.hideout.decor);
    const ws = Q.get('wear'); if (ws) { for (const sl of RULES.costumes.slots) { save.meta.costumes.push(ws + '.' + sl); save.meta.wear[sl] = ws; } }
    if (Q.get('house')) { save.meta.houses.push(Q.get('house')); save.run.house = Q.get('house'); }
    if (Q.get('lup')) { save.run.hideout.range = save.run.hideout.bright = +Q.get('lup'); }
    if (Q.get('lantern')) { save.meta.lanterns.push(Q.get('lantern')); save.meta.wear.lantern = Q.get('lantern'); }
    dress();
  }
  toMenu();
  if (Q.get('screen') === 'wardrobe') hideoutView.openWardrobe(); else if (Q.get('screen') === 'hideout') hideoutView.openHideout(); else if (Q.get('screen') === 'market') { hide('menu'); marketView.enter('menu'); } else if (Q.get('screen') === 'night') { hide('menu'); beginNight(); }
  if (Q.has('night') || Q.has('sim') || autoplay) {
    hide('how'); hide('menu'); run.night = +(Q.get('night') || run.night);
    newNight(Q.has('seed') ? +Q.get('seed') : undefined); startPlay();
    if (Q.has('sim')) { // fast-forward with the bot, synchronously, then draw that moment
      const think = createBot({ greed: 9 }); const secs = +Q.get('sim');
      for (let t = 0; t < secs && !S.done; t += 1 / 30) { step(S, 1 / 30, think(S, 1 / 30)); handleEvents(true); }
      if (Q.has('todark') && S.L.darkZones[0]) { const dz = S.L.darkZones[0]; S.player.x = dz.x + dz.hw * 0.4; S.player.z = dz.z; } // ?todark: stand in a dark section
      time += 5; for (let i = 0; i < 30; i++) animate(1 / 30); updateHud(); debugLog(); camSnap = true; updateCamera(1);
    }
    return;
  }
  if (!save.seenHow) setTimeout(() => show('how'), 300);
});

// console / test hook
window.GAME = {
  get S() { return S; }, get sfx() { return sfx; }, get L() { return L; }, get MO() { return MO; }, get player() { return player; }, RULES,
  startNight(n, seed) { hide('menu'); hide('how'); hide('result'); run.night = n; newNight(seed); startPlay(); },
  get save() { return save; }, setMode: (m) => { mode = m; }, dress: (w) => dress(w || save.meta.wear), beginNight: () => beginNight(), gameOver: () => gameOver(), finishNight: () => finishNight(),
  audioReport: () => audioReport(sfx.samples),
  tick(sec, inp) { for (let i = 0; i < sec * 60; i++) { if (mode === 'play' && S) { step(S, 1 / 60, inp || (autoplay ? bot(S, 1 / 60) : input.get())); handleEvents(); if (S.done && mode === 'play') finishNight(); } time += 1 / 60; animate(1 / 60); } updateCamera(1); updateHud(); debugLog(); if (composer) composer.render(1 / 60); else renderer.render(scene, camera); },
  setAutoplay(v) { autoplay = v; },
  get perf() { return { gpu: GPU, quality: save.quality, auto: save.qualityAuto, look: gov.look, cap: gov.cap, step: perfStep, lite: liteOn(), refreshMs, playMinMs: playMinMs(), pixelRatio: renderer.getPixelRatio(), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length }; }, gov,
};
window.__dwtm = window.GAME;
