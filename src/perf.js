// Keeping the game playable on entry-level phones.
//  1. detectTier(): a starting quality from the device (GPU name, RAM, CPU cores), used while the player
//     leaves Graphics on "Auto". Weak Mali / old Adreno / PowerVR GPUs start on Low.
//  2. createGovernor(): while a night is played it watches the median frame time; when frames run slow it steps
//     down a ladder (on Auto: shadows off, then simple materials; last: a steady 30 fps), and when there is
//     headroom again it slowly steps back up. The step it settles on is remembered for the next launch.
//     The resolution is never lowered: a blurry picture made the game unplayable. A step that does not make
//     frames faster (a browser already capped at 30 fps in battery saver) is undone.

const WEAK_GPU = /mali-(4\d\d|t[678]\d\d|g31|g51|g52|g57)|adreno[^0-9]*([1-5]\d\d|60\d|61[0-2])\b|powervr|sgx|ge8\d\d\d|vivante|videocore|llvmpipe|swiftshader/i;

export function gpuName(renderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  } catch { return ''; }
}

export function detectTier(renderer, isTouch) {
  const gpu = gpuName(renderer);
  const mem = navigator.deviceMemory || 0, cores = navigator.hardwareConcurrency || 0;
  if (WEAK_GPU.test(gpu)) return 'low';
  if (!isTouch) return 'high';
  if ((mem && mem <= 2) || (cores && cores <= 4)) return 'low';
  return 'med';
}

// The ladder: each step is { shadows, lite, cap }. shadows=false / lite=true switch the shadow map off / use the
// simple materials (lite.js) on top of what the quality does anyway; cap = shortest frame in ms (33.3 = 30 fps).
// auto: the player left Graphics on Auto, so the governor may take shadows and materials down too. A steady
// 30 fps feels smoother than a frame rate jumping between 25 and 50, so it is the last step for everyone.
export const CAP30 = 1000 / 30;
export function ladder(auto, quality) {
  const s = [{ shadows: true, lite: false, cap: 0 }];
  if (auto && quality !== 'low') {
    s.push({ shadows: false, lite: false, cap: 0 });
    s.push({ shadows: false, lite: true, cap: 0 });
  }
  s.push({ ...s[s.length - 1], cap: CAP30 });
  return s;
}

const WINDOW = 1.2; // seconds of frames per decision
const WARMUP = 2.5; // seconds ignored after a night starts (shader compiles, texture uploads)

export function createGovernor({ steps, level = 0, apply }) {
  const G = { steps, level: 0, frames: [], acc: 0, warm: WARMUP, good: 0, probe: null, frozen: 0, upFails: 0, justUp: false };
  G.step = () => G.steps[G.level];
  G.set = (lv, why) => {
    lv = Math.max(0, Math.min(G.steps.length - 1, lv));
    if (lv === G.level) return false;
    G.level = lv; apply(G.step(), G.level, why);
    G.frames.length = 0; G.acc = 0; G.warm = 0.6; // let new shaders settle before judging it
    return true;
  };
  G.setSteps = (s) => { G.steps = s; G.level = Math.min(G.level, s.length - 1); apply(G.step(), G.level, 'steps'); };
  G.reset = () => { G.frames.length = 0; G.acc = 0; G.warm = WARMUP; G.good = 0; G.probe = null; };
  G.level = Math.max(0, Math.min(steps.length - 1, level | 0));
  // dt: seconds since the last rendered frame; frameMs: the shortest interval we render at (display refresh or our cap)
  G.sample = (dt, frameMs) => {
    if (G.warm > 0) { G.warm -= dt; return; }
    if (G.frozen > 0) G.frozen -= dt;
    G.frames.push(dt * 1000); G.acc += dt;
    if (G.acc < WINDOW) return;
    const f = G.frames.sort((a, b) => a - b), med = f[f.length >> 1]; // median: one hitch doesn't count
    G.frames.length = 0; G.acc = 0;
    const T = Math.max(frameMs || 16.7, 1000 / 121, G.step().cap || 0);
    if (G.probe) { // judge the last step down: did it buy anything?
      if (G.probe.med / med < 1.06) { G.set(G.probe.from, 'no gain'); G.frozen = 30; }
      G.probe = null; return;
    }
    const slow = med > Math.max(T * 1.3, 1000 / 46);
    if (slow && G.frozen <= 0 && G.level < G.steps.length - 1) {
      if (G.justUp) G.upFails++; // the last step up didn't hold: wait longer before the next try
      G.justUp = false; G.good = 0;
      const from = G.level;
      G.set(G.level + 1, 'slow ' + med.toFixed(1) + 'ms');
      if (!G.step().cap) G.probe = { from, med }; // a 30 fps cap is judged by its smoothness, not by speed
    } else if (!slow && med <= Math.max(T * 1.12, 1000 / 55) && G.level > 0) {
      G.justUp = false;
      if (++G.good >= 6 * 2 ** Math.min(G.upFails, 4)) { G.good = 0; G.set(G.level - 1, 'fast ' + med.toFixed(1) + 'ms'); G.justUp = true; }
    } else { G.good = 0; if (!slow) G.justUp = false; }
  };
  return G;
}

// Display refresh interval from rAF timestamps (60 / 90 / 120 Hz phones).
export function measureRefresh(cb) {
  const ts = [];
  const tick = (t) => {
    ts.push(t);
    if (ts.length < 24) { requestAnimationFrame(tick); return; }
    const d = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b); cb(d[d.length >> 2]); // low quartile: busy frames only run long
  };
  requestAnimationFrame(tick);
}
