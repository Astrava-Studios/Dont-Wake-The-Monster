// Astrava Studios boot intro. Self-contained: no dependencies, no asset files (logo is vector, sound is synthesized),
// so any of our games can copy this one file. Usage:
//   import { playAstravaIntro } from './astrava-intro/astravaIntro.js';
//   await playAstravaIntro({ tapText: 'Tap to start' });
// Sequence (~6.7 s): starfield drifts -> warps into hyperspace while the logo outline is traced in light ->
// impact (bass hit, flash, shockwave, flare) and the logo lands -> ASTRAVA wordmark draws on -> STUDIOS slides in ->
// a shine sweeps across -> fade to black. Tap or any key skips it.

const NS = 'http://www.w3.org/2000/svg';
export const ASTRAVA_INTRO_TIMES = { warp: 0.3, trace: 0.8, impact: 2.3, text: 2.75, studios: 3.55, shine: 4.35, out: 5.9, end: 6.7 };
const T = ASTRAVA_INTRO_TIMES;

// ---------- vector logo (redrawn from the brand mark, viewBox units) ----------
const LOGO_A = 'M58 298 L211 18 L221 18 L361 298 L309 298 L214 122 L140 252 L234 252 L206 298 Z';
const LOGO_S = 'M512 45 L345 45 A45 45 0 0 0 300 90 L300 145 A45 45 0 0 0 345 190 L472 190 L472 252 L330 252 L330 298 L475 298 A45 45 0 0 0 520 253 L520 190 A45 45 0 0 0 475 145 L348 145 L348 92 L482 92 Z';
// geometric wordmark glyphs, 80 units tall, drawn with a stroke of ~10 (the A is the logo's bar-less Λ)
const GLYPHS = {
  A: [56, 'M2 80 L28 8 L54 80'],
  S: [56, 'M56 5 H15 Q5 5 5 15 V30 Q5 40 15 40 H41 Q51 40 51 50 V65 Q51 75 41 75 H0'],
  T: [56, 'M0 5 H56 M28 5 V80'],
  R: [56, 'M5 80 V5 H41 Q51 5 51 15 V32 Q51 42 41 42 H5 M28 42 L54 80'],
  V: [56, 'M2 0 L28 72 L54 0'],
  U: [56, 'M5 0 V65 Q5 75 15 75 H41 Q51 75 51 65 V0'],
  D: [56, 'M5 5 H38 Q51 5 51 18 V62 Q51 75 38 75 H5 Z'],
  I: [10, 'M5 0 V80'],
  O: [56, 'M15 5 H41 Q51 5 51 15 V65 Q51 75 41 75 H15 Q5 75 5 65 V15 Q5 5 15 5 Z'],
};

const CSS = `
.astrava-intro{position:fixed;inset:0;z-index:2147483000;background:#000;overflow:hidden;display:grid;place-items:center;
  -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;cursor:default;contain:strict}
.astrava-intro canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0}
.astrava-intro .ai-bg{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:0;
  background:radial-gradient(circle at 50% 50%,rgba(40,110,255,.42) 0%,rgba(18,60,190,.18) 22%,rgba(5,20,80,0) 48%)}
.astrava-intro .ai-shake{position:relative}
.astrava-intro .ai-stage{position:relative;width:min(78vw,88vh,820px)}
.astrava-intro svg{display:block;width:100%;height:auto;overflow:visible}
.astrava-intro .ai-logoL{position:absolute;inset:0;transform-origin:50% 28.9%;will-change:transform}
.astrava-intro .ai-logoL svg{position:absolute;left:0;top:0}
.astrava-intro .ai-halo{opacity:0;will-change:opacity}
.astrava-intro .ai-flare{position:absolute;left:50%;top:28.9%;width:240vw;height:3px;margin:-1.5px 0 0 -120vw;opacity:0;pointer-events:none;
  background:linear-gradient(90deg,rgba(80,150,255,0) 0%,rgba(80,150,255,.5) 30%,#e8f2ff 50%,rgba(80,150,255,.5) 70%,rgba(80,150,255,0) 100%);
  box-shadow:0 0 18px 4px rgba(70,140,255,.55);border-radius:50%}
.astrava-intro .ai-ring{position:absolute;left:50%;top:28.9%;width:24vmin;height:24vmin;margin:-12vmin 0 0 -12vmin;border-radius:50%;opacity:0;
  border:2px solid rgba(160,205,255,.9);box-shadow:0 0 24px rgba(80,150,255,.8),inset 0 0 24px rgba(80,150,255,.6)}
.astrava-intro .ai-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#fff 0%,#bcd6ff 35%,#2a5cff 100%);opacity:0;pointer-events:none}
.astrava-intro .ai-l,.astrava-intro .ai-rule{transform-box:fill-box;transform-origin:center}
.astrava-intro .ai-rule.l{transform-origin:right center}.astrava-intro .ai-rule.r{transform-origin:left center}
.astrava-intro .ai-gate{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:22px;
  font:600 13px/1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:#9fc3ff}
.astrava-intro .ai-gate svg{width:72px;opacity:.85;filter:drop-shadow(0 0 10px rgba(70,140,255,.7))}
.astrava-intro .ai-gate span{animation:aiPulse 1.6s ease-in-out infinite}
@keyframes aiPulse{0%,100%{opacity:.35}50%{opacity:1}}
`;

const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const div = (cls, parent) => { const d = document.createElement('div'); d.className = cls; parent.appendChild(d); return d; };

// a row of glyph paths centered on cx; returns the per-letter <g>s
function wordmark(parent, text, cx, y, scale, gap, stroke) {
  const width = [...text].reduce((w, ch, i) => w + GLYPHS[ch][0] + (i ? gap : 0), 0);
  const row = el('g', { transform: `translate(${cx - (width * scale) / 2} ${y}) scale(${scale})` }, parent);
  let x = 0; const letters = [];
  for (const ch of text) {
    const [w, d] = GLYPHS[ch];
    const g = el('g', { transform: `translate(${x} 0)` }, row);
    const inner = el('g', { class: 'ai-l' }, g);
    el('path', { d, pathLength: 1, fill: 'none', stroke: '#fff', 'stroke-width': stroke, 'stroke-linejoin': 'miter', 'stroke-miterlimit': 4, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, inner);
    letters.push(inner); x += w + gap;
  }
  return { row, letters, width: width * scale };
}

// Three stacked SVGs with the same viewBox, so the phone only repaints what changes:
// halo (the one blur, painted once, then only its opacity moves), logo (trace + fill, scaled as a layer), text.
function buildSvg(uid) {
  const mk = (cls) => el('svg', { viewBox: '0 0 640 450', class: cls, 'aria-hidden': 'true' });
  const shineGrad = (defs, id) => {
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    for (const [o, a] of [[0, 0], [0.5, 0.95], [1, 0]]) el('stop', { offset: o, 'stop-color': '#ffffff', 'stop-opacity': a }, g);
  };
  const shineRect = (parent, grad) => el('rect', { x: -260, y: -20, width: 180, height: 490, fill: `url(#${grad})`, opacity: 0 }, parent);
  const logoPos = 'translate(320 130) scale(0.8) translate(-289 -158)'; // logo centered at (320,130), 0.8x

  // halo
  const haloSvg = mk('ai-halo');
  const hdefs = el('defs', {}, haloSvg);
  const glow = el('filter', { id: `${uid}g`, x: '-30%', y: '-30%', width: '160%', height: '160%' }, hdefs);
  el('feGaussianBlur', { stdDeviation: 9 }, glow);
  const hg = el('g', { transform: logoPos, filter: `url(#${uid}g)` }, haloSvg);
  for (const d of [LOGO_A, LOGO_S]) el('path', { d, fill: '#3b86ff' }, hg);

  // logo: light trace (two soft strokes stand in for a blur), then the fill, then its own shine
  const logoSvg = mk('ai-logo');
  const ldefs = el('defs', {}, logoSvg);
  const fillG = el('linearGradient', { id: `${uid}f`, x1: 0, y1: 0, x2: 0, y2: 1 }, ldefs);
  el('stop', { offset: 0, 'stop-color': '#ffffff' }, fillG); el('stop', { offset: 1, 'stop-color': '#c8dcff' }, fillG);
  shineGrad(ldefs, `${uid}s1`);
  const lclip = el('clipPath', { id: `${uid}lc` }, ldefs);
  const logo = el('g', { transform: logoPos }, logoSvg);
  const trace = el('g', {}, logo);
  const traces = [];
  for (const [stroke, width, op] of [['#3d8bff', 16, 0.22], ['#5aa4ff', 7, 0.55], ['#e6f1ff', 2.6, 1]]) {
    for (const d of [LOGO_A, LOGO_S]) {
      traces.push(el('path', { d, pathLength: 1, fill: 'none', stroke, 'stroke-width': width, opacity: op, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, trace));
    }
  }
  const fill = el('g', { opacity: 0 }, logo);
  for (const d of [LOGO_A, LOGO_S]) { el('path', { d, fill: `url(#${uid}f)` }, fill); el('path', { d }, lclip); }
  const lshine = el('g', { 'clip-path': `url(#${uid}lc)` }, logo);
  const shineL = shineRect(el('g', { transform: 'translate(289 158) scale(1.25) translate(-320 -130)' }, lshine), `${uid}s1`); // back in stage units

  // text
  const svg = mk('ai-text'); svg.setAttribute('aria-label', 'Astrava Studios'); svg.setAttribute('role', 'img'); svg.removeAttribute('aria-hidden');
  const defs = el('defs', {}, svg);
  shineGrad(defs, `${uid}s2`);
  const clipTxt = el('clipPath', { id: `${uid}c` }, defs);
  el('rect', { x: 0, y: 290, width: 640, height: 80 }, clipTxt); el('rect', { x: 0, y: 396, width: 640, height: 30 }, clipTxt);
  const mask = el('mask', { id: `${uid}m`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 640, height: 450 }, defs);
  const text = el('g', { 'clip-path': `url(#${uid}c)` }, svg);
  const astrava = wordmark(text, 'ASTRAVA', 320, 290, 1, 26, 10);
  const studios = wordmark(text, 'STUDIOS', 320, 396, 0.37, 34, 11);
  const rules = [['l', 60, 320 - studios.width / 2 - 22], ['r', 320 + studios.width / 2 + 22, 580]].map(([side, x1, x2]) =>
    el('rect', { class: `ai-rule ${side}`, x: x1, y: 410, width: x2 - x1, height: 1.6, fill: '#6fa6ff', opacity: 0 }, svg));
  for (const g of studios.letters) g.firstChild.setAttribute('stroke', '#a9c9ff');
  const mtext = text.cloneNode(true); mtext.removeAttribute('clip-path');
  for (const p of mtext.querySelectorAll('path')) { p.removeAttribute('stroke-dasharray'); p.removeAttribute('stroke-dashoffset'); p.setAttribute('stroke', '#fff'); }
  mask.appendChild(mtext);
  const shineT = shineRect(el('g', { mask: `url(#${uid}m)` }, svg), `${uid}s2`);

  return { svg, logoSvg, haloSvg, fill, trace, traces, astrava, studios, rules, shines: [shineL, shineT] };
}

// ---------- starfield / warp / sparks on a canvas ----------
function starfield(canvas, reduced) {
  const ctx = canvas.getContext('2d');
  const mobile = Math.min(innerWidth, innerHeight) < 600;
  const N = mobile ? 260 : 460;
  const stars = Array.from({ length: N }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.95 + 0.05 }));
  const sparks = [];
  const BANDS = 6, bands = Array.from({ length: BANDS }, () => []);
  let w = 0, h = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5); w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  };
  resize();
  const speedAt = (t) => {
    if (reduced) return 0.03;
    if (t < T.warp) return 0.04;
    if (t < T.impact) { const k = (t - T.warp) / (T.impact - T.warp); return 0.04 + 3.4 * k * k * k; }
    return 0.015 + 0.6 * Math.exp(-(t - T.impact) * 6);
  };
  const burst = (cx, cy) => {
    for (let i = 0; i < (mobile ? 70 : 130); i++) {
      const a = Math.random() * Math.PI * 2, v = (0.25 + Math.random() ** 2 * 1.4) * Math.min(w, h);
      sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, life: 0.7 + Math.random() * 0.9, age: 0, hue: Math.random() < 0.3 ? 0 : 1 });
    }
  };
  let last = 0;
  const draw = (t, cy) => {
    const dt = Math.min(0.05, Math.max(0, t - last)); last = t;
    if (canvas.clientWidth !== w || canvas.clientHeight !== h) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const cx = w / 2, f = Math.max(w, h) * 0.55, v = speedAt(t);
    const trail = Math.min(0.5, v * 0.09);
    ctx.lineCap = 'round';
    // stars go into a few depth bands, one path and one stroke() per band (a stroke per star is too slow on phones)
    for (const band of bands) band.length = 0;
    for (const s of stars) {
      s.z -= v * dt;
      if (s.z < 0.03) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; }
      bands[Math.min(BANDS - 1, ((1 - s.z) * BANDS) | 0)].push(s);
    }
    bands.forEach((band, k) => {
      if (!band.length) return;
      const b = Math.min(1, ((k + 0.5) / BANDS) * 1.3 + 0.1);
      ctx.strokeStyle = `rgba(${170 + 85 * b | 0},${200 + 55 * b | 0},255,${b})`;
      ctx.lineWidth = ((k + 0.5) / BANDS) * 2.2 + 0.4;
      ctx.beginPath();
      for (const s of band) {
        const z2 = Math.min(1.2, s.z + trail);
        ctx.moveTo(cx + (s.x / z2) * f, cy + (s.y / z2) * f); ctx.lineTo(cx + (s.x / s.z) * f + 0.01, cy + (s.y / s.z) * f);
      }
      ctx.stroke();
    });
    if (sparks.length) {
      const drag = Math.exp(-dt * 2.6);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]; p.age += dt;
        if (p.age > p.life) { sparks.splice(i, 1); continue; }
        p.vx *= drag; p.vy *= drag; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      ctx.lineWidth = 1.6;
      for (const hue of [0, 1]) for (let k = 0; k < 4; k++) { // 2 colors x 4 fade steps
        ctx.beginPath(); let any = false;
        for (const p of sparks) {
          if (p.hue !== hue || Math.min(3, ((p.age / p.life) * 4) | 0) !== k) continue;
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); any = true;
        }
        if (!any) continue;
        const a = 1 - (k + 0.5) / 4;
        ctx.strokeStyle = hue ? `rgba(90,160,255,${a})` : `rgba(255,255,255,${a})`;
        ctx.stroke();
      }
    }
  };
  return { draw, burst };
}

// ---------- synthesized score ----------
function impulse(ctx, sec, decay) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return b;
}

function score(ctx, t0, volume) {
  const sr = ctx.sampleRate;
  const out = ctx.createGain(); out.gain.value = volume;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.3;
  out.connect(comp); comp.connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 3.4, 2.6);
  const wet = ctx.createGain(); wet.gain.value = 0.55; verb.connect(wet); wet.connect(out);
  const nb = ctx.createBuffer(2, sr * 3, sr);
  for (let ch = 0; ch < 2; ch++) { const d = nb.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  const at = (s) => t0 + s;
  const gain = (v, ...dests) => { const g = ctx.createGain(); g.gain.value = v; for (const d of dests) g.connect(d); return g; };
  const send = (node, dry, wetAmt) => { node.connect(gain(dry, out)); node.connect(gain(wetAmt, verb)); };
  const osc = (type, f, s, e, dest, detune = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(dest); o.start(at(s)); o.stop(at(e)); return o; };
  const noise = (s, e, dest) => { const n = ctx.createBufferSource(); n.buffer = nb; n.loop = true; n.connect(dest); n.start(at(s), Math.random()); n.stop(at(e)); return n; };
  const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const env = (param, pts) => { // [[time, value, 'lin'|'exp'|'set']]
    param.setValueAtTime(pts[0][1], at(pts[0][0]));
    for (const [s, v, k] of pts.slice(1)) {
      if (k === 'set') param.setValueAtTime(v, at(s));
      else if (k === 'lin') param.linearRampToValueAtTime(v, at(s));
      else param.exponentialRampToValueAtTime(Math.max(v, 1e-4), at(s));
    }
  };
  const I = T.impact;

  // deep space drone under everything
  { const g = gain(0); const lp = filt('lowpass', 320); lp.connect(g); send(g, 1, 0.3);
    osc('sine', 55, 0, T.end, lp); osc('sine', 55.4, 0, T.end, lp); osc('sine', 82.4, 0, T.end, lp);
    env(g.gain, [[0, 0], [1.6, 0.09, 'lin'], [I, 0.06, 'lin'], [T.out, 0.05, 'lin'], [T.end, 0, 'lin']]); }

  // riser: sweeping noise + climbing detuned saws + a high glide, cut dead at the impact
  { const bp = filt('bandpass', 250, 3); const g = gain(0); bp.connect(g); send(g, 1, 0.4); noise(T.warp, I + 0.05, bp);
    env(bp.frequency, [[T.warp, 250], [I, 7000, 'exp']]);
    env(g.gain, [[T.warp, 1e-4], [I - 0.03, 0.55, 'exp'], [I, 0, 'lin']]);
    const lp = filt('lowpass', 200, 2); const sg = gain(0); lp.connect(sg); send(sg, 1, 0.3);
    for (const dt of [-12, 12]) { const o = osc('sawtooth', 55, T.warp, I + 0.05, lp, dt); env(o.frequency, [[T.warp, 55], [I, 220, 'exp']]); }
    env(lp.frequency, [[T.warp, 200], [I, 3200, 'exp']]);
    env(sg.gain, [[T.warp, 1e-4], [I - 0.03, 0.13, 'exp'], [I, 0, 'lin']]);
    const hg = gain(0); send(hg, 0.6, 0.6); const ho = osc('sine', 440, T.trace, I + 0.05, hg);
    env(ho.frequency, [[T.trace, 440], [I, 1760, 'exp']]); env(hg.gain, [[T.trace, 1e-4], [I - 0.03, 0.035, 'exp'], [I, 0, 'lin']]); }

  // impact: sub drop, distorted punch, crack, a big major "braam" and a metallic ring
  { const g = gain(0); send(g, 1, 0.15); const o = osc('sine', 160, I, I + 3.2, g);
    env(o.frequency, [[I, 160], [I + 0.45, 36, 'exp']]); env(g.gain, [[I, 0], [I + 0.005, 1, 'lin'], [I + 3.1, 1e-4, 'exp']]); }
  { const ws = ctx.createWaveShaper(); const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * 6); } ws.curve = c;
    const g = gain(0); ws.connect(g); send(g, 1, 0.2); const o = osc('triangle', 95, I, I + 0.6, ws);
    env(o.frequency, [[I, 95], [I + 0.3, 42, 'exp']]); env(g.gain, [[I, 0.5], [I + 0.55, 1e-4, 'exp']]); }
  { const lp = filt('lowpass', 5000); const g = gain(0); lp.connect(g); send(g, 1, 0.7); noise(I, I + 0.8, lp);
    env(lp.frequency, [[I, 5000], [I + 0.5, 400, 'exp']]); env(g.gain, [[I, 0.9], [I + 0.7, 1e-4, 'exp']]); }
  { const lp = filt('lowpass', 180, 1.5); const g = gain(0); lp.connect(g); send(g, 0.9, 0.6);
    for (const f of [73.42, 110, 146.83, 185, 220, 293.66]) for (const dt of [-8, 8]) osc('sawtooth', f, I, I + 4.4, lp, dt);
    env(lp.frequency, [[I, 180], [I + 0.12, 2600, 'exp'], [I + 3.6, 350, 'exp']]);
    env(g.gain, [[I, 0], [I + 0.01, 0.2, 'lin'], [I + 4.3, 1e-4, 'exp']]); }
  for (const [f, len] of [[1187, 2.2], [1729, 1.8], [2389, 1.6], [3121, 1.3], [4410, 1.0]]) {
    const g = gain(0); send(g, 0.4, 1); osc('sine', f, I, I + len, g); env(g.gain, [[I, 0.035], [I + len - 0.05, 1e-4, 'exp']]);
  }

  // warm pad that carries the logo hold
  { const lp = filt('lowpass', 1800); const g = gain(0); lp.connect(g); send(g, 0.8, 0.7);
    for (const f of [146.83, 220, 329.63, 369.99, 440]) { osc('triangle', f, I + 0.2, T.end + 0.3, lp, -5); osc('triangle', f, I + 0.2, T.end + 0.3, lp, 5); }
    env(g.gain, [[I + 0.2, 0], [I + 1.4, 0.028, 'lin'], [T.out, 0.028, 'lin'], [T.end + 0.2, 0, 'lin']]); }

  // whoosh panning across as the wordmark writes itself, plus tiny ticks per letter
  { const bp = filt('bandpass', 600, 1.2); const g = gain(0); const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    bp.connect(g); if (pan) { g.connect(pan); send(pan, 1, 0.5); env(pan.pan, [[T.text, -0.8], [T.text + 0.95, 0.8, 'lin']]); } else send(g, 1, 0.5);
    noise(T.text, T.text + 1.0, bp);
    env(bp.frequency, [[T.text, 600], [T.text + 0.45, 5000, 'exp'], [T.text + 0.95, 1500, 'exp']]);
    env(g.gain, [[T.text, 1e-4], [T.text + 0.35, 0.22, 'exp'], [T.text + 0.95, 1e-4, 'exp']]); }
  for (let i = 0; i < 7; i++) { const s = T.text + 0.12 + i * 0.07; const g = gain(0); send(g, 0.5, 0.8); osc('sine', 2600 + i * 90, s, s + 0.1, g); env(g.gain, [[s, 0.03], [s + 0.09, 1e-4, 'exp']]); }
  { const s = T.studios; const bp = filt('bandpass', 3000, 0.8); const g = gain(0); bp.connect(g); send(g, 0.6, 0.6); noise(s, s + 0.7, bp);
    env(g.gain, [[s, 1e-4], [s + 0.2, 0.08, 'exp'], [s + 0.65, 1e-4, 'exp']]); }

  // shine: a bright D-major sparkle with a feedback echo
  { const dl = ctx.createDelay(1); dl.delayTime.value = 0.18; const fb = gain(0.35); dl.connect(fb); fb.connect(dl); dl.connect(gain(0.5, out, verb));
    [1174.66, 1479.98, 1760, 2349.32, 2959.96].forEach((f, i) => {
      const s = T.shine + i * 0.06; const g = gain(0); g.connect(dl); send(g, 0.5, 0.9);
      osc('sine', f, s, s + 1.1, g); osc('triangle', f * 2, s, s + 0.4, gain(0.15, g));
      env(g.gain, [[s, 0.055], [s + 1.05, 1e-4, 'exp']]);
    }); }

  return {
    fade(sec) { const n = ctx.currentTime; out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(out.gain.value, n); out.gain.linearRampToValueAtTime(0, n + sec); },
  };
}

// The intro plays its score as ONE prerecorded buffer (astrava-intro.wav, rendered from score() below), so a phone's
// audio thread only streams it and the boot work running alongside cannot make it crackle. Without the file the
// score is rendered offline first, and only as a last resort synthesized live.
// To regenerate the WAV after changing score(), in the dev server console:
//   (await import('/src/astrava-intro/astravaIntro.js')).downloadScoreWav()
const SOUND_URL = new URL('./astrava-intro.wav', import.meta.url).href;

function loadTrack(actx, url) {
  return fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then((ab) => new Promise((res, rej) => { const p = actx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); }))
    .catch(() => renderScore(actx.sampleRate));
}

export function encodeWav(buf) {
  const ch = buf.numberOfChannels, n = buf.length, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true);
  out.setUint16(22, ch, true); out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < ch; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 32767, true);
  return new Blob([out.buffer], { type: 'audio/wav' });
}

export async function downloadScoreWav(sampleRate = 44100) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(encodeWav(await renderScore(sampleRate))); a.download = 'astrava-intro.wav'; a.click();
}

export function renderScore(sampleRate) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return Promise.resolve(null);
  try {
    const oc = new OAC(2, Math.ceil((T.end + 3.6) * sampleRate), sampleRate);
    score(oc, 0, 1);
    const p = oc.startRendering();
    if (p && p.then) return p.catch(() => null);
    return new Promise((res) => { oc.oncomplete = (e) => res(e.renderedBuffer); }); // old WebKit: callback only
  } catch { return Promise.resolve(null); }
}

// ---------- public API ----------
export function playAstravaIntro(opts = {}) {
  const { volume = 0.9, skippable = true, blockInput = true, tapText = 'Tap to start', mount = document.body, audio = true, onReveal } = opts;
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Promise((resolve) => {
    if (!document.getElementById('astrava-intro-css')) {
      const st = document.createElement('style'); st.id = 'astrava-intro-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const root = document.createElement('div'); root.className = 'astrava-intro';
    const boot = document.getElementById('astrava-boot'); // optional black cover in index.html, so nothing flashes before this runs
    mount.appendChild(root); if (boot) boot.remove();

    const canvas = document.createElement('canvas'); root.appendChild(canvas);
    const bg = div('ai-bg', root);
    const shakeEl = div('ai-shake', root);
    const stage = div('ai-stage', shakeEl);
    const uid = 'ai' + Math.random().toString(36).slice(2, 7);
    const parts = buildSvg(uid);
    stage.appendChild(parts.svg);
    const logoL = div('ai-logoL', stage); logoL.appendChild(parts.haloSvg); logoL.appendChild(parts.logoSvg);
    const ring = div('ai-ring', stage), flare = div('ai-flare', stage);
    const flash = div('ai-flash', root);
    stage.style.visibility = 'hidden';

    const AC = window.AudioContext || window.webkitAudioContext;
    let actx = null;
    try { if (audio && AC) actx = new AC(); } catch { actx = null; }
    const track = actx ? loadTrack(actx, opts.soundUrl || SOUND_URL) : Promise.resolve(null);
    const anims = [];
    let started = false, starting = false, finished = false, t0 = 0, raf = 0, out = null, live = null, gate = null, sf = null, skipAt = Infinity;

    const onInput = (e) => {
      if (blockInput) e.stopImmediatePropagation(); // keep the game from reacting (and starting its own music) underneath
      if (gate) { unlockAudio(); return; }
      if (skippable && started && (e.type === 'pointerdown' || e.type === 'keydown') && performance.now() > skipAt) finish(0.35);
    };
    const EV = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'keydown', 'keyup'];
    for (const ev of EV) window.addEventListener(ev, onInput, { capture: true });

    const unlockAudio = () => {
      if (!actx) return;
      try { const s = actx.createBufferSource(); s.buffer = actx.createBuffer(1, 1, 22050); s.connect(actx.destination); s.start(0); } catch {}
      const p = actx.resume(); if (p && p.then) p.then(() => { if (actx.state === 'running') start(); }, () => {});
      if (actx.state === 'running') start();
    };

    let lead = 0; // seconds the visuals wait so they land with the sound after the device's output latency
    const a = (node, frames, delay, duration, extra = {}) => {
      const an = node.animate(frames, { delay: (delay + lead) * 1000, duration: duration * 1000, fill: 'both', easing: 'cubic-bezier(.2,.7,.2,1)', ...extra });
      anims.push(an); return an;
    };

    async function start() {
      if (started || starting || finished) return;
      starting = true;
      if (gate) { gate.remove(); gate = null; }
      const buf = actx && actx.state === 'running' ? await track : null;
      if (finished) return;
      started = true;
      if (actx && actx.state === 'running') {
        out = actx.createGain(); out.gain.value = volume; out.connect(actx.destination);
        if (buf) { const src = actx.createBufferSource(); src.buffer = buf; src.connect(out); src.start(actx.currentTime + 0.02); }
        else live = score(actx, actx.currentTime + 0.02, volume); // no offline rendering: synthesize live
        lead = 0.02 + Math.min(0.25, (actx.outputLatency || 0) + (actx.baseLatency || 0));
      }
      stage.style.visibility = '';
      t0 = performance.now() + lead * 1000; skipAt = t0 + 600;
      sf = starfield(canvas, reduced);
      const { fill, trace, traces, astrava, studios, rules, shines, haloSvg } = parts;
      const I = T.impact;
      a(canvas, [{ opacity: 0 }, { opacity: 1 }], 0, 0.8, { easing: 'ease-out' });
      // trace the outline in light, then let it go when the fill lands
      traces.forEach((p, i) => a(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], T.trace + (i % 2) * 0.18, I - T.trace - 0.25, { easing: 'cubic-bezier(.45,0,.3,1)' }));
      a(trace, [{ opacity: 0.0 }, { opacity: 1, offset: 0.15 }, { opacity: 1 }], T.trace, I - T.trace, { easing: 'linear' });
      a(trace, [{ opacity: 1 }, { opacity: 0 }], I, 0.7, { fill: 'forwards' });
      // the logo layer scales on the compositor (its content stays still after the impact)
      a(logoL, [{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], T.trace, I - T.trace, { easing: 'ease-in' });
      a(logoL, [{ transform: 'scale(1.16)' }, { transform: 'scale(1)' }], I, 0.75, { fill: 'forwards' });
      a(logoL, [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }], I + 0.75, T.out - I - 0.75, { easing: 'linear', fill: 'forwards' });
      a(fill, [{ opacity: 0 }, { opacity: 1 }], I, 0.06, { easing: 'linear' });
      a(haloSvg, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0.45 }], I, 1.6);
      a(bg, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0.7 }], I, 2.2);
      a(flash, [{ opacity: 0 }, { opacity: 0.85, offset: 0.06 }, { opacity: 0 }], I - 0.03, 0.75, { easing: 'ease-out' });
      a(ring, [{ opacity: 0.9, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(7)' }], I, 1.1, { easing: 'cubic-bezier(.1,.6,.3,1)' });
      a(flare, [{ opacity: 0, transform: 'scaleX(.05) scaleY(1)' }, { opacity: 1, transform: 'scaleX(1) scaleY(1.4)', offset: 0.12 }, { opacity: 0, transform: 'scaleX(1.3) scaleY(.4)' }], I, 1.5, { easing: 'ease-out' });
      if (!reduced) a(shakeEl, [[0, 0], [-7, 3], [6, -3], [-5, 3], [4, -2], [-2, 1], [0, 0]].map(([x, y]) => ({ transform: `translate(${x}px,${y}px)` })), I, 0.38, { easing: 'linear' });
      // wordmark
      astrava.letters.forEach((g, i) => {
        const s = T.text + i * 0.07;
        a(g.firstChild, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], s, 0.6, { easing: 'cubic-bezier(.5,0,.2,1)' });
        a(g, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], s, 0.45);
      });
      studios.letters.forEach((g, i) => {
        g.firstChild.setAttribute('stroke-dashoffset', 0);
        a(g, [{ opacity: 0, transform: `translateX(${(i - 3) * 30}px)` }, { opacity: 1, transform: 'translateX(0)' }], T.studios, 0.9, { easing: 'cubic-bezier(.15,.8,.2,1)' });
      });
      rules.forEach((r) => a(r, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)' }], T.studios + 0.2, 0.8));
      for (const sh of shines) a(sh, [{ opacity: 1, transform: 'skewX(-18deg) translateX(0px)' }, { opacity: 1, transform: 'skewX(-18deg) translateX(1100px)' }], T.shine, 0.95, { easing: 'cubic-bezier(.4,0,.2,1)' });
      // out
      a(stage, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.06)' }], T.out, T.end - T.out, { easing: 'ease-in' });
      a(bg, [{ opacity: 0.7 }, { opacity: 0 }], T.out, T.end - T.out, { easing: 'ease-in', fill: 'forwards' });
      a(canvas, [{ opacity: 1 }, { opacity: 0 }], T.out, T.end - T.out, { easing: 'ease-in', fill: 'forwards' });

      // logo center on screen, measured once (and again on resize), not every frame
      let cy = 0, cx = 0;
      const measure = () => { const r = stage.getBoundingClientRect(), rr = root.getBoundingClientRect(); cy = r.top + r.height * (130 / 450) - rr.top; cx = rr.width / 2; };
      measure(); addEventListener('resize', measure);
      let burstDone = false;
      const tick = (now) => {
        if (finished) return;
        const t = (now - t0) / 1000;
        if (!burstDone && t >= I) { burstDone = true; sf.burst(cx, cy); }
        const h = root.clientHeight;
        sf.draw(t, t < I ? h / 2 + (cy - h / 2) * Math.min(1, Math.max(0, t) / I) : cy);
        if (t >= T.end) { removeEventListener('resize', measure); return finish(0.5, true); }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    // natural end: the black cover fades off the game while the reverb rings out; skip: sound fades with it
    function finish(fadeSec, natural = false) {
      if (finished) return; finished = true;
      cancelAnimationFrame(raf);
      for (const ev of EV) window.removeEventListener(ev, onInput, { capture: true });
      if (!natural) {
        if (live) live.fade(fadeSec);
        if (out) { const n = actx.currentTime; out.gain.cancelScheduledValues(n); out.gain.setValueAtTime(out.gain.value, n); out.gain.linearRampToValueAtTime(0, n + fadeSec); }
      }
      const tail = natural ? 3.5 : fadeSec + 0.2;
      if (actx) setTimeout(() => { try { actx.close(); } catch {} }, tail * 1000);
      if (onReveal) try { onReveal(); } catch {} // the game can start drawing again as the cover fades off
      const done = () => { for (const an of anims) an.cancel(); root.remove(); resolve(); };
      if (fadeSec) root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fadeSec * 1000, fill: 'forwards' }).onfinish = done;
      else done();
    }

    // autoplay policy: on the web the context stays suspended until a tap; in the app WebView it just runs
    if (!actx) { start(); return; }
    if (actx.state === 'running') { start(); return; }
    const p = actx.resume(); if (p && p.then) p.then(() => { if (actx.state === 'running') start(); }, () => {});
    setTimeout(() => {
      if (started || starting || finished) return;
      if (actx.state === 'running') return start();
      gate = document.createElement('div'); gate.className = 'ai-gate';
      const g = el('svg', { viewBox: '40 0 500 316' }, gate);
      for (const d of [LOGO_A, LOGO_S]) el('path', { d, fill: 'none', stroke: '#7fb0ff', 'stroke-width': 7, 'stroke-linejoin': 'round' }, g);
      const s = document.createElement('span'); s.textContent = tapText; gate.appendChild(s);
      root.appendChild(gate);
    }, 250);
  });
}
