// Keeping the game playable on entry-level phones.
//  1. detectTier(): a starting quality from the device (GPU name, RAM, CPU cores), used while the player
//     leaves Graphics on "Auto". Weak Mali / old Adreno / PowerVR GPUs start on Low.
//  2. createGovernor(): watches the median frame time while a night is played. Two knobs:
//     - the look (on Auto: full → no shadows → simple materials). Changing it recompiles every shader, a freeze
//       of a second or more on a slow phone, so it only ever changes between nights, while the next room is built.
//     - a steady 30 fps cap. Free to switch, so it reacts within the night: slow frames → capped at once
//       (a steady 30 feels smoother than a rate jumping between 25 and 50); headroom → it tries 60 again.
//     A night that needed the cap makes the next night one look simpler; a night with plenty of headroom tries
//     one look better. A simpler look that bought nothing (a browser capped at 30 fps anyway) is undone.
//     The resolution is never lowered: a blurry picture made the game unplayable. The state is remembered.

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

// The looks the governor may pick from, best first: { shadows, lite }. shadows=false / lite=true switch the shadow
// map off / use the simple materials (lite.js) on top of what the quality does anyway. Only on Auto does the
// governor touch the look; a quality the player picked is kept (only the 30 fps cap applies).
export const CAP30 = 1000 / 30;
export function looks(auto, quality) {
  const s = [{ shadows: true, lite: false }];
  if (auto && quality !== 'low') s.push({ shadows: false, lite: false }, { shadows: false, lite: true });
  return s;
}

const WINDOW = 1.2; // seconds of frames per decision
const WARMUP = 2.5; // seconds ignored after a night starts (texture uploads, the room settling in)
const median = (a) => { const f = a.slice().sort((x, y) => x - y); return f[f.length >> 1]; };

export function createGovernor({ looks: L, look = 0, cap = false, apply }) {
  const G = { looks: L, look: Math.max(0, Math.min(L.length - 1, look | 0)), cap: !!cap, frames: [], acc: 0, warm: WARMUP,
    good: 0, capFails: 0, upNights: 0, lookFails: 0, check: null, noGain: false, night: null };
  const newNight = () => ({ windows: 0, slow: 0, fast: 0, uncapped: [] });
  G.night = newNight();
  G.step = () => ({ ...G.looks[G.look], cap: G.cap ? CAP30 : 0 });
  const push = (why) => apply(G.step(), why);
  const clear = () => { G.frames.length = 0; G.acc = 0; };
  G.setCap = (on, why) => { if (G.cap === !!on) return false; G.cap = !!on; clear(); G.warm = 0.3; push(why); return true; };
  G.setLook = (lv, why) => { lv = Math.max(0, Math.min(G.looks.length - 1, lv)); if (lv === G.look) return false; G.look = lv; push(why); return true; };
  G.setLooks = (s) => { G.looks = s; G.look = Math.min(G.look, s.length - 1); push('looks'); };
  G.reset = () => { clear(); G.warm = WARMUP; G.good = 0; };
  G.full = (why) => { G.look = 0; G.cap = false; G.check = null; G.noGain = false; G.night = newNight(); push(why); };
  // dt: seconds since the last rendered frame; frameMs: the shortest interval we render at (display refresh)
  G.sample = (dt, frameMs) => {
    if (G.warm > 0) { G.warm -= dt; return; }
    G.frames.push(dt * 1000); G.acc += dt;
    if (G.acc < WINDOW) return;
    const med = median(G.frames); clear();
    const T = Math.max(frameMs || 16.7, 1000 / 121, G.cap ? CAP30 : 0);
    const slow = med > Math.max(T * 1.3, 1000 / 46);
    const N = G.night; N.windows++;
    if (!G.cap) N.uncapped.push(med);
    if (slow) N.slow++;
    if (!G.cap && slow) { // can't hold 60: a steady 30 right away (no shader change, no freeze)
      if (G.good < 0) G.capFails++; // the last try at 60 didn't hold: wait longer before the next one
      G.good = 0; G.setCap(true, 'slow ' + med.toFixed(1) + 'ms');
    } else if (!slow && med <= Math.max(T * 1.12, 1000 / 55)) {
      if (!G.cap) { N.fast++; if (G.good < 0) G.good = 0; return; }
      if (++G.good >= 6 * 2 ** Math.min(G.capFails, 4)) { G.good = -1; G.setCap(false, 'try 60 at ' + med.toFixed(1) + 'ms'); }
    } else if (G.cap) G.good = 0;
  };
  // Between nights (call before the next room is built): the only place the look changes.
  G.nextNight = () => {
    const N = G.night; G.night = newNight();
    if (N.windows < 4) return; // barely played: nothing learned
    const med = N.uncapped.length ? median(N.uncapped) : 0;
    if (G.check) { // the last night went one look simpler: did that make frames faster?
      const c = G.check; G.check = null;
      if (med && c.med && c.med / med < 1.06) { G.noGain = true; G.setLook(c.from, 'no gain'); return; }
    }
    const neededCap = G.cap || N.slow > N.windows * 0.25;
    if (neededCap && !G.noGain && G.look < G.looks.length - 1) {
      if (G.upNights < 0) G.lookFails++;
      G.upNights = 0; G.check = { from: G.look, med };
      G.cap = false; // judge the simpler look at full rate first
      G.setLook(G.look + 1, 'next night simpler') || push('uncap');
    } else if (!neededCap && G.look > 0 && N.fast >= N.windows * 0.9) {
      if (++G.upNights >= 2 ** Math.min(G.lookFails, 4)) { G.upNights = -1; G.setLook(G.look - 1, 'next night nicer'); }
    } else if (G.upNights > 0) G.upNights = 0;
  };
  G.state = () => ({ look: G.look, cap: G.cap });
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
