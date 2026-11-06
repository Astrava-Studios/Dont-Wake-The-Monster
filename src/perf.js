// Keeping the game playable on entry-level phones.
//  1. detectTier(): a starting quality from the device (GPU name, RAM, CPU cores), used while the player
//     leaves Graphics on "Auto". Weak Mali / old Adreno / PowerVR GPUs start on Low.
//  2. createGovernor(): dynamic resolution. While a night is played it watches the median frame time; when
//     frames run slow it steps down a ladder (smaller render scale, on Auto also no shadows), and when there is
//     headroom again it slowly steps back up. The step it settles on is remembered for the next launch.
//     A step that does not make frames faster (a browser capped at 30 fps in battery saver) is undone, so a
//     capped phone isn't blurred for nothing.

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

// The ladder: each step is { scale, shadows }. scale multiplies the quality's pixel ratio; shadows=false turns
// the shadow map off on top of what the quality allows. dropShadows (Auto with shadows on): after the first
// small resolution step the shadows go (big cost, small loss), only then more pixels.
export function ladder(dropShadows) {
  const s = [{ scale: 1, shadows: true }, { scale: 0.85, shadows: true }];
  if (dropShadows) s.push({ scale: 0.85, shadows: false });
  for (const scale of [0.72, 0.62, 0.55]) s.push({ scale, shadows: !dropShadows });
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
    G.frames.length = 0; G.acc = 0; G.warm = 0.6; // let the new size / shaders settle before judging it
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
    const T = Math.max(frameMs || 16.7, 1000 / 121);
    if (G.probe) { // judge the last step down: did it buy anything?
      if (G.probe.med / med < 1.06) { G.set(G.probe.from, 'no gain'); G.frozen = 30; }
      G.probe = null; return;
    }
    const slow = med > Math.max(T * 1.3, 1000 / 46);
    if (slow && G.frozen <= 0 && G.level < G.steps.length - 1) {
      if (G.justUp) G.upFails++; // the last step up didn't hold: wait longer before the next try
      G.justUp = false; G.good = 0;
      const from = G.level;
      G.set(G.level + 1, 'slow ' + med.toFixed(1) + 'ms'); G.probe = { from, med };
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
