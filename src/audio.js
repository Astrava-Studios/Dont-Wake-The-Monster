// Procedural audio: WebAudio synthesis only, no files needed.
//  master ── limiter ── out
//    ├─ sfxBus ─(per-voice stereo pan + distance)─┐
//    ├─ musicBus ── duck ── muffle(lowpass) ──────┤ → reverb send
//    │     ├─ calm layer (music box lullaby, bass + tick tension layers)
//    │     └─ chase layer (drums, bass ostinato, staccato lead)
//    └─ ambBus (room tone, clock, house creaks, birds)
// Optional samples: drop CC0 files (e.g. Kenney Audio) into public/sfx/ and list them in
// public/sfx/manifest.json as {"coin":"coin.ogg", ...}; a listed name replaces its synth voice.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz
const rnd = (a, b) => a + Math.random() * (b - a);
const jit = (p = 0.06) => 1 + (Math.random() * 2 - 1) * p; // random pitch for impacts

// median pitch (Hz) of the voiced parts, normalised autocorrelation (first strong peak, so no octave jumps)
// Cheap enough for a slow phone (the full-rate version froze the first tap for ~2 s): the signal is averaged
// down to ~12 kHz (plenty for a 60–500 Hz voice), at most 40 voiced frames are looked at, and each lag is
// correlated once.
export function voicePitch(d, sr) {
  const step = Math.max(1, Math.floor(sr / 12000)), rate = sr / step, n = Math.floor(d.length / step);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < step; k++) s += d[i * step + k]; x[i] = s / step; }
  const F = Math.round(rate * 0.04), voiced = [], f = [];
  for (let s = 0; s + F < n; s += F * 2) { let e = 0; for (let k = 0; k < F; k++) e += x[s + k] * x[s + k]; if (e / F >= 1e-4) voiced.push(s); }
  const pick = voiced.length <= 40 ? voiced : Array.from({ length: 40 }, (_, i) => voiced[Math.floor((i * voiced.length) / 40)]);
  const lo = Math.round(rate / 500), hi = Math.round(rate / 60);
  for (const s of pick) {
    const r = (lag) => { let c = 0, a = 0, b = 0; for (let k = 0; k + lag < F; k++) { c += x[s + k] * x[s + k + lag]; a += x[s + k] * x[s + k]; b += x[s + k + lag] * x[s + k + lag]; } return c / Math.sqrt(a * b + 1e-12); };
    let prev = r(lo - 1), cur = r(lo);
    for (let lag = lo; lag < hi; lag++) { const next = r(lag + 1); if (cur > 0.6 && cur >= prev && cur >= next) { f.push(rate / lag); break; } prev = cur; cur = next; }
  }
  f.sort((a, b) => a - b); return f.length ? Math.round(f[Math.floor(f.length / 2)]) : 0;
}

// a recording with its long pauses squeezed to ~0.1 s (mono), so a continuous playback never goes silent mid-line
export function compactSpeech(ctx, b) {
  const sr = b.sampleRate, n = b.length, d = new Float32Array(n);
  for (let ch = 0; ch < b.numberOfChannels; ch++) { const x = b.getChannelData(ch); for (let k = 0; k < n; k++) d[k] += x[k] / b.numberOfChannels; }
  const hop = Math.round(sr / 100), fr = Math.floor(n / hop), env = new Float32Array(fr); let pk = 0;
  for (let f = 0; f < fr; f++) { let e = 0; for (let k = 0; k < hop; k++) e += d[f * hop + k] ** 2; env[f] = Math.sqrt(e / hop); pk = Math.max(pk, env[f]); }
  const on = pk * 0.05, keep = new Uint8Array(fr);
  for (let f = 0; f < fr; f++) if (env[f] > on) for (let k = Math.max(0, f - 4); k <= Math.min(fr - 1, f + 6); k++) keep[k] = 1; // 40 ms before, 60 ms after each sound
  // in every silent run keep only its first 100 ms
  for (let f = 0, run = 0; f < fr; f++) { if (keep[f]) { run = 0; continue; } if (++run <= 10) keep[f] = 2; }
  const out = new Float32Array(n); let o = 0; const fade = Math.round(sr * 0.008);
  for (let f = 0; f < fr; ) {
    if (!keep[f]) { f++; continue; }
    let g = f; while (g < fr && keep[g]) g++;
    const a = f * hop, z = g * hop, len = z - a;
    for (let k = 0; k < len; k++) { const w = Math.min(1, k / fade, (len - 1 - k) / fade); out[o + k] += d[a + k] * w; }
    o += len; f = g;
  }
  const nb = ctx.createBuffer(1, Math.max(1, o), sr); nb.getChannelData(0).set(out.subarray(0, Math.max(1, o)));
  return nb;
}

// syllable boundaries [start, length] (seconds) inside a speech buffer: voiced regions split at loudness dips
export function voiceSyllables(b) {
  const d = b.getChannelData(0), sr = b.sampleRate, hop = Math.round(sr / 100), env = [];
  for (let i = 0; i + hop < d.length; i += hop) { let s = 0; for (let j = 0; j < hop; j++) s += d[i + j] * d[i + j]; env.push(Math.sqrt(s / hop)); }
  const sm = env.map((_, i) => { let s = 0, n = 0; for (let k = -2; k <= 2; k++) if (env[i + k] !== undefined) { s += env[i + k]; n++; } return s / n; });
  const pk = Math.max(...sm), on = pk * 0.1, out = [];
  // walk each voiced stretch, cutting every 0.1–0.22 s at its quietest moment
  for (let i = 0; i < sm.length; ) {
    if (sm[i] <= on) { i++; continue; }
    let end = i; while (end < sm.length && sm[end] > on) end++;
    let a = i;
    while (end - a >= 8) {
      let z = end;
      if (end - a > 24) { z = a + 10; for (let k = a + 10; k <= a + 22; k++) if (sm[k] < sm[z]) z = k; }
      if (z - a >= 7 && Math.max(...sm.slice(a, z)) > on * 2) out.push([a / 100, (z - a) / 100]);
      a = z;
    }
    i = end;
  }
  return out;
}

// ---------- iOS ----------
// iPhone/iPad (iPadOS reports itself as a Mac with touch)
const IOS = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
// a tiny silent WAV (0.1 s): playing it through an <audio> element makes iOS treat the page as media
function silentWavUrl() {
  const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); s(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
// the ringer (silent) switch mutes Web Audio unless the page plays as media: iOS 17+ has audioSession,
// older versions switch over when a looping silent <audio> element is playing
function playAsMedia(sfx) {
  if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch {} return; }
  if (typeof document === 'undefined') return;
  if (!sfx.mediaEl) { const a = sfx.mediaEl = document.createElement('audio'); a.src = silentWavUrl(); a.loop = true; a.setAttribute('playsinline', ''); a.setAttribute('x-webkit-airplay', 'deny'); }
  if (sfx.mediaEl.paused) { const p = sfx.mediaEl.play(); if (p && p.catch) p.catch(() => {}); }
}

// ---------- merchant voice files ----------
const VOICE_BASE = () => (import.meta.env ? import.meta.env.BASE_URL : '/') + 'sfx/voice/';
async function fetchBytes(url) {
  try {
    const r = await fetch(url); if (!r.ok || (r.headers.get('content-type') || '').includes('text/html')) return null; // dev server answers misses with index.html
    return await r.arrayBuffer();
  } catch { return null; }
}
// your own recordings: TuccarVoice / mort / mort2…mort5 in any of these formats, all looked up at once
async function fetchVoiceBytes() {
  const names = ['TuccarVoice', 'mort', 'mort2', 'mort3', 'mort4', 'mort5'], exts = ['m4a', 'mp3', 'wav', 'ogg', 'webm'];
  const found = await Promise.all(names.map(async (n) => { for (const e of exts) { const b = await fetchBytes(VOICE_BASE() + n + '.' + e); if (b) return b; } return null; }));
  return { own: found.filter(Boolean), pack: [] };
}
const fetchPackBytes = async () => (await Promise.all(['talk_short', 'talk_medium', 'talk_long', 'talk_player1', 'talk_player2'].map((f) => fetchBytes(VOICE_BASE() + f + '.mp3')))).filter(Boolean);

export class Sfx {
  constructor() {
    this.ctx = null; this.enabled = true; this.musicOn = true;
    this.listener = { x: 0, z: 0, half: 9 }; this.samples = {};
    this.mode = 'calm'; this.intensity = 0; this.muffled = false;
    this.step16 = 0; this.nextT = 0;
    this.voiceState = 'loading'; // loading | own | pack | none
    this.voiceReady = new Promise((r) => { this._voiceDone = r; });
    this.voiceBytes = typeof window !== 'undefined' && typeof fetch !== 'undefined' ? fetchVoiceBytes() : null;
  }

  // ---------- graph ----------
  init(ctx) {
    if (this.ctx) { this.unlock(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ctx && !AC) return;
    if (IOS && !ctx) playAsMedia(this); // before the context exists, so it starts in the media session
    const c = this.ctx = ctx || new AC();
    const len = c.sampleRate * 2; const nb = c.createBuffer(1, len, c.sampleRate); const d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.2;
    lim.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0; this.master.connect(lim);
    // small-room reverb from a synthesized impulse (lightweight on mobile)
    const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    this.verb = c.createConvolver();
    this.verb.buffer = this.impulse(isTouch ? 0.35 : 1.2, 3.2, isTouch ? 1 : 2);
    this.verbOut = c.createGain(); this.verbOut.gain.value = 0.22; this.verb.connect(this.verbOut); this.verbOut.connect(this.master);
    this.vol ||= { music: 0.8, sfx: 1 };
    this.sfxBus = c.createGain(); this.sfxBus.gain.value = 0.85 * this.vol.sfx; this.sfxBus.connect(this.master);
    this.sfxSend = c.createGain(); this.sfxSend.gain.value = 0.35; this.sfxBus.connect(this.sfxSend); this.sfxSend.connect(this.verb);
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.55 * this.vol.music;
    this.duckG = c.createGain(); this.muffle = c.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 16000;
    this.musicBus.connect(this.duckG); this.duckG.connect(this.muffle); this.muffle.connect(this.master);
    const ms = c.createGain(); ms.gain.value = 0.25; this.muffle.connect(ms); ms.connect(this.verb);
    this.calmBus = c.createGain(); this.calmBus.connect(this.musicBus);
    this.chaseBus = c.createGain(); this.chaseBus.gain.value = 0; this.chaseBus.connect(this.musicBus);
    this.tensionBus = c.createGain(); this.tensionBus.gain.value = 0; this.tensionBus.connect(this.calmBus);
    this.ambBus = c.createGain(); this.ambBus.gain.value = 0.7 * this.vol.sfx; this.ambBus.connect(this.master);
    // room tone: very quiet brown-ish noise
    const rt = c.createBufferSource(); rt.buffer = nb; rt.loop = true;
    const rf = c.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 220;
    const rg = this.roomTone = c.createGain(); rg.gain.value = 0.05; rt.connect(rf); rf.connect(rg); rg.connect(this.ambBus); rt.start();
    this.nextT = c.currentTime + 0.1;
    if (!ctx) { this.loadSamples(); this.loadVoice(); this.unlock(); }
  }
  // Called on every tap. iOS only starts (or restarts after a phone call: state 'interrupted') a context
  // inside a real tap, and wants a sound started in that same tap. Cheap once the context is running.
  unlock() {
    const c = this.ctx; if (!c || this.bg || !c.resume) return;
    if (IOS) playAsMedia(this);
    if (c.state === 'running') return;
    const p = c.resume(); if (p && p.catch) p.catch(() => {});
    try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch {}
  }
  impulse(sec, decay, channels = 2) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(channels, n, c.sampleRate);
    for (let ch = 0; ch < channels; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 80 ? i / 80 : 1); }
    return b;
  }
  setReverb(enabled) { if (this.verbOut) this.verbOut.gain.value = enabled ? 0.22 : 0; }
  async loadSamples() {
    try {
      const base = import.meta.env.BASE_URL + 'sfx/';
      const r = await fetch(base + 'manifest.json');
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return;
      const list = await r.json();
      const probe = typeof Audio !== 'undefined' ? new Audio() : null;
      const ogg = !!(probe && probe.canPlayType('audio/ogg; codecs="vorbis"'));
      const decode = async (f) => {
        for (const ext of ogg ? ['ogg', 'wav'] : ['wav', 'ogg']) {
          try { const res = await fetch(base + f + '.' + ext); if (!res.ok) continue; return await this.ctx.decodeAudioData(await res.arrayBuffer()); } catch {}
        }
        return null;
      };
      const cache = new Map(); // the same file can back several voices
      await Promise.all(Object.entries(list).filter(([k]) => !k.startsWith('_')).map(async ([name, e]) => {
        const ent = typeof e === 'string' ? { files: [e.replace(/\.(ogg|wav)$/, '')] } : e;
        const bufs = (await Promise.all(ent.files.map((f) => { if (!cache.has(f)) cache.set(f, decode(f)); return cache.get(f); }))).filter(Boolean);
        if (bufs.length) this.samples[name] = { bufs, vol: ent.vol ?? 1, pitch: ent.pitch || [0.95, 1.05], layer: !!ent.layer, last: -1 };
      }));
      this.sampleCount = Object.keys(this.samples).length;
    } catch {}
  }
  // merchant voice: CC-BY 3.0 "PlayerTalkingSFX" by Colodical (public/sfx/voice/CREDITS.txt).
  // The recordings are continuous gibberish; we cut them into syllables at the dips of the loudness envelope.
  // Your own recording wins: TuccarVoice / mort / mort2…mort5 .(m4a|mp3|wav|ogg|webm) in public/sfx/voice/;
  // otherwise the CC-BY pack is used. Recordings are played as continuous phrases (see talk()).
  async loadVoice() {
    try {
      const decode = async (bytes) => { try { return await this.ctx.decodeAudioData(bytes.slice(0)); } catch { return null; } };
      const got = (await this.voiceBytes) || { own: [], pack: [] };
      const own = (await Promise.all(got.own.map(decode))).filter(Boolean);
      // the CC-BY pack is only a fallback when your own recording is missing or cannot be decoded on this device
      const pack = own.length ? [] : (await Promise.all((got.pack.length ? got.pack : await fetchPackBytes()).map(decode))).filter(Boolean);
      const bufs = own.length ? own : pack;
      const clips = [];
      const yieldNow = () => new Promise((r) => setTimeout(r, 0)); // split the analysis so taps and frames get through
      for (const raw of bufs) {
        await yieldNow();
        const b = compactSpeech(this.ctx, raw);
        await yieldNow();
        const syl = voiceSyllables(b); if (!syl.length) continue;
        await yieldNow();
        // phrase starts: syllables that follow a pause, so speech never begins mid-word
        const starts = syl.filter((sy, i) => i === 0 || sy[0] - (syl[i - 1][0] + syl[i - 1][1]) > 0.08).map((sy) => Math.max(0, sy[0] - 0.03));
        // a gentle slow-down makes him a bit bigger; a high voice (the fallback pack) is slowed more
        const f0 = voicePitch(b.getChannelData(0), b.sampleRate), rate = !f0 ? 0.9 : f0 < 170 ? 0.93 : Math.max(0.6, 118 / f0);
        let pk = 0; const d = b.getChannelData(0); for (let k = 0; k < d.length; k++) pk = Math.max(pk, Math.abs(d[k]));
        clips.push({ buf: b, starts, rate, gain: pk > 1e-3 ? 0.7 / pk : 1 });
        this.voiceInfo = { source: own.length ? 'own' : 'pack', f0, rate: +rate.toFixed(2), phrases: starts.length };
      }
      if (clips.length) this.voice = clips;
      this.voiceState = clips.length ? (own.length ? 'own' : 'pack') : 'none';
    } catch { this.voiceState = this.voice ? this.voiceState : 'none'; }
    this._voiceDone(this.voiceState);
  }
  // plays a sample voice; returns true when it fully replaces the synth (false for layered or missing voices)
  sample(name, o = {}) {
    const e = this.samples[name]; if (!e || !this.ok) return false;
    let i = Math.floor(Math.random() * e.bufs.length); if (e.bufs.length > 1 && i === e.last) i = (i + 1) % e.bufs.length;
    if (o.len) { // fit a wanted length: one of the two closest takes (never the last one), nudged by playback rate
      const near = e.bufs.map((b, k) => k).filter((k) => k !== e.last || e.bufs.length < 3).sort((a, b) => Math.abs(e.bufs[a].duration - o.len) - Math.abs(e.bufs[b].duration - o.len));
      i = near[Math.floor(Math.random() * Math.min(2, near.length))];
    }
    e.last = i;
    const c = this.ctx, src = c.createBufferSource(); src.buffer = e.bufs[i];
    const fit = o.len ? Math.min(1.3, Math.max(0.8, e.bufs[i].duration / o.len)) : 1;
    src.playbackRate.value = (o.rate || 1) * fit * (e.pitch[0] + Math.random() * (e.pitch[1] - e.pitch[0]));
    const g = c.createGain(); g.gain.value = (o.vol ?? 0.6) * e.vol; src.connect(g); g.connect(this.out(o));
    src.start(c.currentTime + (o.delay || 0));
    return !e.layer;
  }
  // music / sfx volume 0..1 from the settings panel (ambience follows sfx)
  setVolumes(music, sfx) {
    this.vol = { music, sfx };
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(0.55 * music, t, 0.05); this.sfxBus.gain.setTargetAtTime(0.85 * sfx, t, 0.05); this.ambBus.gain.setTargetAtTime(0.7 * sfx, t, 0.05);
  }
  setEnabled(v) { this.enabled = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.05); }
  setMusic(v) { this.musicOn = v; if (this.musicBus) this.musicBus.gain.setTargetAtTime(v ? 0.55 : 0, this.ctx.currentTime, 0.1); }
  get ok() { return !!this.ctx && this.enabled; }
  setListener(x, z, half) { this.listener.x = x; this.listener.z = z; if (half) this.listener.half = half; }

  // output node for a voice: positional sounds get stereo pan + distance falloff
  out(o = {}) {
    if (o.dest) return o.dest;
    if (o.x === undefined) return this.sfxBus;
    const c = this.ctx, L = this.listener;
    const p = c.createStereoPanner(); p.pan.value = Math.max(-0.85, Math.min(0.85, (o.x - L.x) / L.half));
    const g = c.createGain(); g.gain.value = Math.max(0.3, Math.min(1, 1.25 - Math.hypot(o.x - L.x, o.z - L.z) / 14));
    p.connect(g); g.connect(this.sfxBus); return p;
  }
  env(g, t, vol, dur, att = 0.005) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, att + 0.01));
  }
  tone(freq, dur, o = {}) {
    if (!this.ok) return; const c = this.ctx, t = (o.at ?? c.currentTime) + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.detune) osc.detune.value = o.detune;
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    this.env(g, t, o.vol ?? 0.2, dur, o.att);
    let node = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 0.7; osc.connect(f); node = f; }
    node.connect(g); g.connect(this.out(o)); osc.start(t); osc.stop(t + dur + 0.05);
  }
  noise(dur, o = {}) {
    if (!this.ok) return; const c = this.ctx, t = (o.at ?? c.currentTime) + (o.delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.freq || 1000, t); f.Q.value = o.q || 1;
    if (o.slide) f.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const g = c.createGain(); this.env(g, t, o.vol ?? 0.2, dur, o.att);
    s.connect(f); f.connect(g); g.connect(this.out(o)); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  duck(amount = 0.35, dur = 1.2) {
    if (!this.ctx) return; const g = this.duckG.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setTargetAtTime(amount, t, 0.03); g.setTargetAtTime(1, t + dur, 0.4);
  }

  // ---------- player ----------
  step(n, tile, run, x, z) {
    if (this.sample(tile === 'rug' ? 'stepRug' : 'stepWood', { x, z, vol: 0.2 + Math.min(1, n / 5) * 0.5 })) return;
    const v = Math.min(1, n / 5), p = { x, z };
    if (tile === 'rug') { this.noise(0.09, { ...p, freq: 480 * jit(), vol: 0.06 + 0.16 * v, att: 0.01 }); return; }
    this.noise(0.035, { ...p, type: 'bandpass', freq: (run ? 1400 : 2200) * jit(0.12), q: 2.2, vol: 0.09 + 0.3 * v });
    this.tone(95 * jit(0.1), 0.07, { ...p, vol: 0.08 + 0.25 * v, slide: 60 });
  }
  jingle(weight, x, z) { // loot rattling in the sack while running
    const k = Math.min(1, weight / 10); if (k <= 0) return;
    for (let i = 0; i < 2 + Math.floor(k * 3); i++) this.tone(rnd(2600, 4800), 0.09, { x, z, vol: 0.012 + 0.025 * k, delay: i * 0.025 });
  }
  squeak(x, z) { this.sample('plank', { x, z, vol: 0.5 }); if (this.sample('squeak', { x, z })) return; this.tone(380 * jit(), 0.42, { type: 'sawtooth', vol: 0.05, slide: 620, lp: 1800, x, z }); this.tone(260 * jit(), 0.32, { type: 'square', vol: 0.03, slide: 470, lp: 1400, delay: 0.14, x, z }); }
  creak(x, z) { if (this.sample('creak', { x, z })) return; this.tone(rnd(150, 210), 0.38, { type: 'sawtooth', vol: 0.045, slide: rnd(240, 300), lp: 1200, q: 4, x, z }); }
  duckToy(x, z) { if (this.sample('duck', { x, z })) return; const f = jit(0.08); this.tone(1050 * f, 0.12, { type: 'square', vol: 0.07, slide: 1750 * f, lp: 3500, x, z }); this.tone(1750 * f, 0.22, { type: 'square', vol: 0.07, slide: 850 * f, lp: 3500, delay: 0.13, x, z }); }

  // ---------- loose props ----------
  // something bumped: wood knocks, barrels boom, pots clink, toys clack, metal rings, cushions thump
  bump(mat, k = 0.5, x, z) {
    const p = { x, z }, v = 0.5 + k * 0.5;
    if (mat === 'wood' || mat === 'toy') {
      if (!this.sample('plank', { x, z, vol: (mat === 'toy' ? 0.35 : 0.7) * v, rate: mat === 'toy' ? 1.7 : 1.15 })) {
        this.tone(rnd(160, 230) * (mat === 'toy' ? 1.8 : 1), 0.09, { ...p, type: 'triangle', vol: 0.3 * v, slide: 90, lp: 1500 });
        this.noise(0.05, { ...p, type: 'bandpass', freq: rnd(900, 1400), q: 3, vol: 0.2 * v });
      }
    } else if (mat === 'barrel') {
      this.sample('plank', { x, z, vol: 0.6 * v, rate: 0.7 });
      this.tone(rnd(70, 90), 0.3, { ...p, vol: 0.35 * v, slide: 50, lp: 400 }); // hollow boom
    } else if (mat === 'pot') {
      this.sample('plank', { x, z, vol: 0.3 * v, rate: 1.4 });
      this.tone(rnd(900, 1200), 0.12, { ...p, type: 'triangle', vol: 0.12 * v }); this.noise(0.04, { ...p, type: 'bandpass', freq: 2500, q: 2, vol: 0.1 * v });
    } else if (mat === 'metal') {
      if (!this.sample('goblet', { x, z, vol: 0.35 * v, rate: 1.4 })) this.tone(rnd(1700, 2300), 0.25, { ...p, type: 'triangle', vol: 0.12 * v });
      this.tone(rnd(2900, 3600), 0.18, { ...p, vol: 0.05 * v, delay: 0.01 });
    } else { if (!this.sample('drop', { x, z, vol: 0.35 * v, rate: 0.8 })) this.noise(0.12, { ...p, freq: 350, vol: 0.2 * v, att: 0.01 }); }
  }
  // fell over: a clattering crash
  topple(mat, x, z) {
    const p = { x, z };
    if (mat === 'wood' || mat === 'toy' || mat === 'barrel') {
      const low = mat === 'barrel';
      this.sample('stomp', { x, z, vol: low ? 0.9 : 0.6, rate: low ? 1.1 : 1.6 }) || this.tone(75, 0.25, { ...p, vol: 0.35, slide: 40 });
      [0, 0.12, 0.2, 0.26].forEach((d, i) => { const k = 1 - i * 0.22; if (!this.sample('plank', { x, z, vol: 0.7 * k, rate: (low ? 0.75 : mat === 'toy' ? 1.6 : 1.1) * jit(0.1), delay: d })) this.tone(rnd(140, 260), 0.1, { ...p, type: 'triangle', vol: 0.25 * k, slide: 80, lp: 1400, delay: d }); });
    } else if (mat === 'pot') {
      // clay pot cracks: thud + shards
      this.sample('stomp', { x, z, vol: 0.6, rate: 1.3 });
      if (!this.sample('gem', { x, z, vol: 0.6, rate: 0.7 })) for (let i = 0; i < 5; i++) this.tone(rnd(1800, 3600), 0.12, { ...p, vol: 0.06, delay: 0.05 + i * 0.04 });
      this.noise(0.3, { ...p, type: 'bandpass', freq: 3000, q: 1, vol: 0.1, delay: 0.04 });
    } else if (mat === 'metal') { [0, 0.09, 0.16].forEach((d, i) => this.sample('goblet', { x, z, vol: 0.5 * (1 - i * 0.3), delay: d }) || this.tone(rnd(1500, 2600), 0.4, { ...p, type: 'triangle', vol: 0.12 * (1 - i * 0.25), delay: d })); }
    else this.bump('soft', 1, x, z);
    this.duck(0.7, 0.4);
  }

  // ---------- merchant voice ----------
  // one gibberish syllable ("bla", "blö", "bo", "mmh") from a big, fat man: a low buzzy voice through
  // two vowel formants, with smooth envelopes so nothing clicks
  mumble(o = {}) {
    if (!this.ok) return 0;
    const c = this.ctx, t = c.currentTime + 0.01 + (o.delay || 0);
    const VOW = [[730, 1090], [570, 1580], [450, 850], [400, 1700], [640, 1190]]; // a, ö, o, ü, ɑ
    const [f1, f2] = VOW[Math.floor(Math.random() * VOW.length)];
    const dur = rnd(0.1, 0.16) * (o.long ? 1.7 : 1), base = (o.pitch || 95) * jit(0.08), vol = 0.16 * (o.vol ?? 1);
    // amplitude: starts closed (the "b"), opens fast, decays smoothly
    const g = c.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setTargetAtTime(vol * 0.7, t + 0.03, dur * 0.5); g.gain.setTargetAtTime(0, t + dur, 0.03);
    const end = t + dur + 0.2;
    const src = c.createOscillator(); src.type = 'sawtooth';
    src.frequency.setValueAtTime(base * 0.92, t); src.frequency.linearRampToValueAtTime(base * (Math.random() < 0.3 ? 1.18 : 1.02), t + dur * 0.4); src.frequency.linearRampToValueAtTime(base * 0.86, t + dur);
    const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.setValueAtTime(base, t); // chest rumble
    const subG = c.createGain(); subG.gain.value = 0.35; sub.connect(subG); subG.connect(g);
    // the "b/l" → vowel: formants glide from closed lips to the open vowel
    for (const [ff, q, gv] of [[f1, 5, 1.6], [f2, 8, 0.7]]) {
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
      f.frequency.setValueAtTime(ff * 0.45, t); f.frequency.exponentialRampToValueAtTime(ff, t + 0.05);
      const fg = c.createGain(); fg.gain.value = gv; src.connect(f); f.connect(fg); fg.connect(g);
    }
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; const lg = c.createGain(); lg.gain.value = 0.35; src.connect(lp); lp.connect(lg); lg.connect(g);
    g.connect(this.out(o));
    src.start(t); sub.start(t); src.stop(end); sub.stop(end);
    return dur;
  }
  // The merchant talks for `sec` seconds: one continuous stretch of the recording, started at a phrase,
  // faded in and out softly. A new line cuts the old one off (with a short fade). Returns false without a recording.
  talk(sec, o = {}) {
    if (!this.ok || !this.voice) return false;
    this.talkStop(0.04);
    const c = this.ctx, t = c.currentTime + 0.02, V = this.voice;
    const clip = V[Math.floor(Math.random() * V.length)], rate = clip.rate * jit(0.02);
    const need = sec * rate + 0.2, fits = clip.starts.filter((a) => a + need <= clip.buf.duration);
    const pool = fits.length ? fits : clip.starts.slice(0, 1);
    const off = pool[Math.floor(Math.random() * pool.length)];
    const src = c.createBufferSource(); src.buffer = clip.buf; src.playbackRate.value = rate;
    if (!fits.length) { src.loop = true; src.loopStart = 0; src.loopEnd = clip.buf.duration; } // very long line: wrap around
    // clean and warm: a little more chest, a little less hiss, gentle levelling
    const ls = c.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 180; ls.gain.value = 3;
    const hs = c.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 6000; hs.gain.value = -3;
    const cp = c.createDynamicsCompressor(); cp.threshold.value = -20; cp.ratio.value = 3; cp.attack.value = 0.01; cp.release.value = 0.15;
    const g = c.createGain(), vol = 0.8 * clip.gain * (o.vol ?? 1), end = t + Math.max(0.2, sec);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.04);
    g.gain.setValueAtTime(vol, end - 0.15); g.gain.linearRampToValueAtTime(0, end);
    src.connect(ls); ls.connect(hs); hs.connect(cp); cp.connect(g); g.connect(this.out(o));
    src.start(t, off); src.stop(end + 0.05);
    this.talking = { src, g, end };
    return true;
  }
  talkStop(fade = 0.12) {
    const k = this.talking; if (!k || !this.ctx) return; this.talking = null;
    const t = this.ctx.currentTime; if (t >= k.end) return;
    k.g.gain.cancelScheduledValues(t); k.g.gain.setValueAtTime(k.g.gain.value, t); k.g.gain.linearRampToValueAtTime(0, t + fade);
    try { k.src.stop(t + fade + 0.02); } catch {}
  }

  // ---------- loot ----------
  pickup(kind, x, z) {
    if (this.sample(kind, { x, z })) return;
    const p = { x, z }, f = jit(0.04);
    if (kind === 'coins') { this.tone(1318 * f, 0.14, { type: 'triangle', vol: 0.15, ...p }); this.tone(1976 * f, 0.32, { type: 'triangle', vol: 0.13, delay: 0.07, ...p }); this.noise(0.08, { type: 'highpass', freq: 6000, vol: 0.05, ...p }); }
    else if (kind === 'gem') [1568, 2093, 2637, 3136].forEach((h, i) => this.tone(h * f, 0.4, { vol: 0.1, delay: i * 0.06, ...p }));
    else if (kind === 'goblet') { this.tone(880 * f, 0.5, { type: 'triangle', vol: 0.14, ...p }); this.tone(1320 * f, 0.45, { vol: 0.08, delay: 0.015, ...p }); this.tone(140, 0.12, { vol: 0.15, slide: 70, ...p }); }
    else if (kind === 'crown') [784, 988, 1175, 1568, 1976].forEach((h, i) => this.tone(h, 0.5, { type: 'triangle', vol: 0.12, delay: i * 0.075, ...p }));
    else if (kind === 'chest') { [523, 659, 784, 1047, 1319, 1568].forEach((h, i) => this.tone(h, 0.45, { type: 'triangle', vol: 0.11, delay: i * 0.06, ...p })); for (let i = 0; i < 8; i++) this.tone(rnd(2000, 4200), 0.15, { vol: 0.04, delay: 0.2 + i * 0.05, ...p }); }
    else { this.noise(0.12, { type: 'bandpass', freq: 1800, q: 1, vol: 0.08, ...p }); this.tone(660 * f, 0.18, { type: 'triangle', vol: 0.1, ...p }); this.tone(990 * f, 0.25, { type: 'triangle', vol: 0.08, delay: 0.06, ...p }); }
    this.duck(0.75, 0.35);
  }
  rummage(x, z) { this.noise(0.16, { type: 'bandpass', freq: 900 + Math.random() * 800, q: 0.9, vol: 0.07, x, z, att: 0.02 }); this.tone(1500 + Math.random() * 900, 0.05, { vol: 0.03, x, z, delay: 0.05 }); }
  drop(x, z) { if (this.sample('drop', { x, z })) { this.sample('coins', { x, z, vol: 0.35 }); return; } this.tone(110 * jit(), 0.12, { vol: 0.2, slide: 60, x, z }); this.pickup('coins', x, z); }
  power(kind, x, z) {
    this.sample('power', { x, z });
    if (kind === 'feather') { this.noise(0.5, { type: 'bandpass', freq: 800, slide: 5000, q: 1.5, vol: 0.1, att: 0.15, x, z }); [1760, 2349, 2794].forEach((h, i) => this.tone(h, 0.4, { vol: 0.07, delay: 0.1 + i * 0.07, x, z })); }
    else [660, 880, 1320].forEach((h, i) => this.tone(h, 0.28, { vol: 0.12, slide: h * 1.5, delay: i * 0.06, x, z }));
  }
  lullaby() { if (!this.ok) return; this.duck(0.15, 1.6); [72, 76, 79, 76, 74, 71, 72].forEach((n, i) => this.bell(NOTE(n + 12), this.ctx.currentTime + i * 0.2, 0.1, this.sfxBus)); }

  // ---------- monster ----------
  snore(len = 1.8, x, z, k = 1) { // k: loudness (the menu plays it soft)
    if (!this.ok) return; if (this.sample('snore', { x, z, vol: 0.7 * k, len: len + 0.35 })) return; // takes carry ~0.35 s of tail
    const c = this.ctx, t = c.currentTime, out = this.out({ x, z });
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(46, t); o.frequency.linearRampToValueAtTime(60, t + len * 0.6); o.frequency.linearRampToValueAtTime(42, t + len);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 320; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2 * k, t + len * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + len);
    const lfo = c.createOscillator(); lfo.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 0.12 * k; lfo.connect(lg); lg.connect(g.gain);
    o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.1); lfo.start(t); lfo.stop(t + len + 0.1);
    this.noise(len, { freq: 600, q: 0.7, vol: 0.06 * k, att: len * 0.5, x, z });
    this.noise(0.9, { type: 'bandpass', freq: 500, slide: 1400, q: 1, vol: 0.03 * k, att: 0.5, delay: len + 0.4, x, z }); // whistle on the out-breath
  }
  hmm(x, z) { if (this.sample('hmm', { x, z, vol: 0.7 })) return; this.tone(130, 0.5, { vol: 0.22, slide: 185, lp: 600, x, z }); this.tone(185, 0.4, { vol: 0.16, slide: 145, lp: 600, delay: 0.42, x, z }); }
  roar(x, z) {
    if (!this.ok) return; this.duck(0.12, 1.6); if (this.sample('roar', { x, z, vol: 0.9 })) return;
    const c = this.ctx, t = c.currentTime, out = this.out({ x, z });
    const ws = c.createWaveShaper(); const cv = new Float32Array(256); for (let i = 0; i < 256; i++) cv[i] = Math.tanh((i / 128 - 1) * 5); ws.curve = cv;
    const g = c.createGain(); this.env(g, t, 0.65, 1.5, 0.05);
    for (const [f0, f1] of [[160, 60], [163, 62], [80, 40]]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 1.4); o.connect(ws); o.start(t); o.stop(t + 1.6); }
    for (const [ff, q] of [[700, 3], [1200, 4]]) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(ff, t); f.frequency.exponentialRampToValueAtTime(ff * 0.5, t + 1.4); f.Q.value = q; ws.connect(f); f.connect(g); }
    g.connect(out);
    this.noise(1.2, { type: 'bandpass', freq: 900, slide: 300, q: 0.8, vol: 0.18, att: 0.05, x, z });
    this.tone(55, 0.5, { vol: 0.5, slide: 30, x, z }); // sub thump
  }
  stomp(x, z) { if (this.sample('stomp', { x, z, vol: 0.8 })) return; this.tone(70 * jit(0.1), 0.18, { vol: 0.28, slide: 38, x, z }); this.noise(0.09, { freq: 300, vol: 0.08, x, z }); }
  yawn(x, z) { if (this.sample('yawn', { x, z, vol: 0.7 })) return; this.tone(240, 1.3, { vol: 0.16, slide: 110, lp: 900, att: 0.3, x, z }); }
  groan(x, z) { if (this.sample('groan', { x, z, vol: 0.7 })) return; this.tone(115, 0.7, { vol: 0.22, slide: 75, lp: 400, x, z }); this.noise(0.4, { freq: 260, vol: 0.08, x, z }); }
  rustle(x, z) { this.noise(0.3, { type: 'bandpass', freq: 650, q: 2, vol: 0.09, x, z }); }
  catHiss(x, z) {
    this.noise(0.38, { type: 'bandpass', freq: 4500, q: 2.5, vol: 0.16, x, z });
    this.tone(1400, 0.25, { type: 'sawtooth', vol: 0.12, slide: 700, lp: 3000, x, z });
  }
  dizzy(x, z) { for (let i = 0; i < 4; i++) this.tone(2400 + (i % 2) * 500, 0.1, { vol: 0.06, delay: i * 0.13, x, z }); }
  heart() { this.tone(68, 0.16, { vol: 0.32, slide: 44 }); this.tone(62, 0.16, { vol: 0.24, slide: 40, delay: 0.19 }); }

  // ---------- ambience ----------
  tick(x, z, urgent) { if (this.sample('tick', { x, z, vol: urgent ? 0.7 : 0.4, rate: urgent ? 1.15 : 1 })) return; this.noise(0.025, { type: 'bandpass', freq: urgent ? 4200 : 3200, q: 2, vol: urgent ? 0.16 : 0.09, x, z }); this.tone(urgent ? 2400 : 1900, 0.03, { vol: urgent ? 0.05 : 0.03, x, z }); }
  houseCreak() { if (this.sample('houseCreak', { dest: this.ambBus, vol: 1 })) return; this.tone(rnd(90, 140), rnd(0.6, 1.1), { type: 'sawtooth', vol: 0.02, slide: rnd(150, 200), lp: 700, q: 6, att: 0.2, dest: this.ambBus }); }
  bird() { const f = rnd(2600, 3600); for (let i = 0; i < 3; i++) this.tone(f * jit(0.1), 0.08, { vol: 0.05, slide: f * 1.3, delay: i * 0.11, dest: this.ambBus }); }
  alarm() { this.duck(0.2, 1.5); for (let i = 0; i < 12; i++) this.tone(i % 2 ? 1800 : 2250, 0.08, { type: 'square', vol: 0.06, lp: 5000, delay: i * 0.11 }); }

  // ---------- ui / stingers ----------
  click() { if (this.sample('click')) return; this.tone(1100, 0.05, { vol: 0.08, slide: 1500 }); this.noise(0.02, { type: 'highpass', freq: 5000, vol: 0.03 }); }
  whoosh() { if (this.sample('toggle')) return; this.noise(0.25, { type: 'bandpass', freq: 400, slide: 2500, q: 1.2, vol: 0.06, att: 0.08 }); }
  buy() { this.sample('confirm', { vol: 0.5 }); this.pickup('coins'); this.tone(2637, 0.35, { vol: 0.07, delay: 0.15 }); }
  deny() { if (this.sample('deny')) return; this.tone(220, 0.15, { type: 'square', vol: 0.05, lp: 900 }); this.tone(165, 0.2, { type: 'square', vol: 0.05, lp: 900, delay: 0.12 }); }
  win() { this.duck(0.1, 1.8); [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.14, delay: i * 0.09 })); }
  door(x, z) { if (this.sample('door', { x, z })) return; this.creak(x, z); }
  thud(x, z) { if (this.sample('stomp', { x, z, vol: 1, rate: 1.4 })) return; this.tone(80, 0.25, { vol: 0.4, slide: 40, x, z }); }
  lose() { this.duck(0.1, 2); [392, 370, 349, 262].forEach((f, i) => this.tone(f, i === 3 ? 0.9 : 0.35, { type: 'square', vol: 0.07, lp: 1600, delay: i * 0.22 })); }

  // ---------- music ----------
  bell(freq, t, vol, dest) { // music-box tine: sine + inharmonic partial, quick decay
    this.tone(freq, 1.4, { at: t, vol, dest, att: 0.003 }); this.tone(freq * 2.76, 0.5, { at: t, vol: vol * 0.25, dest, att: 0.002 }); this.tone(freq * 5.4, 0.18, { at: t, vol: vol * 0.08, dest, att: 0.001 });
  }
  pad(notes, t, dur, vol, dest) { for (const n of notes) for (const d of [-7, 7]) this.tone(NOTE(n), dur, { at: t, type: 'triangle', vol, att: dur * 0.35, detune: d, lp: 1100, dest }); }
  kick(t, dest) { this.tone(140, 0.22, { at: t, vol: 0.3, slide: 42, dest }); }
  snare(t, dest) { this.noise(0.14, { at: t, type: 'bandpass', freq: 1800, q: 0.8, vol: 0.15, dest }); this.tone(190, 0.08, { at: t, vol: 0.08, slide: 120, dest }); }
  hat(t, dest, v = 0.06) { this.noise(0.03, { at: t, type: 'highpass', freq: 8000, vol: v, dest }); }

  // call every frame: mode 'calm' | 'chase' | 'quiet'; intensity 0..1 (how awake the monster is)
  // app in the background: stop every sound (looping room tone too); back in front: carry on
  setBackground(bg) {
    this.bg = bg;
    if (this.mediaEl) { if (bg) this.mediaEl.pause(); else { const q = this.mediaEl.play(); if (q && q.catch) q.catch(() => {}); } }
    if (!this.ctx) return;
    const p = bg ? this.ctx.suspend() : this.ctx.resume(); if (p && p.catch) p.catch(() => {}); // a refused resume is retried on the next tap
  }
  update(dt, { mode = 'calm', intensity = 0, muffled = false } = {}) {
    if (!this.ctx || this.bg) return;
    const c = this.ctx, t = c.currentTime;
    if (mode !== this.mode) {
      this.calmBus.gain.setTargetAtTime(mode === 'calm' ? 1 : mode === 'quiet' ? 0.35 : 0, t, 0.25);
      this.chaseBus.gain.setTargetAtTime(mode === 'chase' ? 1 : 0, t, 0.15);
      if (mode === 'chase') { this.step16 = 0; this.nextT = t + 0.05; }
      this.mode = mode;
    }
    const tension = Math.max(0, (intensity - 0.35) / 0.65); // only schedule a ramp when it really changes (not 60 per second)
    if (this.tension == null || Math.abs(tension - this.tension) > 0.01) { this.tension = tension; this.tensionBus.gain.setTargetAtTime(tension, t, 0.4); }
    if (muffled !== this.muffled) { this.muffle.frequency.setTargetAtTime(muffled ? 700 : 16000, t, 0.15); this.muffled = muffled; }
    this.schedule(t + 0.15);
  }
  // look-ahead sequencer (also usable with an OfflineAudioContext for tests)
  schedule(until) {
    if (!this.ok) return;
    if (this.nextT < this.ctx.currentTime - 0.5) this.nextT = this.ctx.currentTime + 0.05; // after a tab sleep
    while (this.nextT < until) {
      const chase = this.mode === 'chase';
      const spb = 60 / (chase ? 152 : 76) / 2; // eighth notes
      if (chase) this.chaseStep(this.step16, this.nextT, spb); else this.calmStep(this.step16, this.nextT, spb);
      this.nextT += spb; this.step16 = (this.step16 + 1) % 32;
    }
  }
  calmStep(s, t, spb) {
    // C major lullaby: C - Am - F - G, one chord per 8 eighths
    const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    const bar = Math.floor(s / 8) % 4, b = s % 8, ch = chords[bar];
    if (b === 0) this.pad(ch, t, spb * 8.5, 0.03, this.calmBus);
    const mel = [[76, 0, 79, 0, 77, 76, 74, 0], [72, 0, 76, 0, 74, 72, 71, 0], [69, 0, 72, 0, 77, 76, 74, 0], [71, 0, 74, 0, 79, 0, 0, 0]][bar];
    if (mel[b]) this.bell(NOTE(mel[b] + 12), t, 0.085, this.calmBus);
    if (b === 0 || b === 4) this.bell(NOTE(ch[0]), t, 0.05, this.calmBus);
    // tension layer: pizzicato bass + clock-like ticks, faded in as the monster stirs
    if (b % 2 === 0) this.tone(NOTE(ch[0] - 12), 0.18, { at: t, type: 'triangle', vol: 0.12, lp: 600, dest: this.tensionBus });
    this.hat(t, this.tensionBus, b % 2 ? 0.02 : 0.04);
  }
  chaseStep(s, t, spb) {
    // A minor chase: Am - F - G - E, kick/snare/hats, bass ostinato, staccato lead
    const roots = [45, 41, 43, 40]; const bar = Math.floor(s / 8) % 4, b = s % 8, r = roots[bar];
    if (b === 0 || b === 3 || b === 4) this.kick(t, this.chaseBus);
    if (b === 2 || b === 6) this.snare(t, this.chaseBus);
    this.hat(t, this.chaseBus, b % 2 ? 0.04 : 0.07);
    this.tone(NOTE(b % 2 ? r + 12 : r), spb * 0.9, { at: t, type: 'sawtooth', vol: 0.07, lp: 700, q: 3, dest: this.chaseBus });
    const lead = [69, 0, 72, 69, 76, 0, 74, 72][b];
    if (lead) this.tone(NOTE(lead + (bar === 3 ? -1 : 0) + 12), spb * 0.6, { at: t, type: 'square', vol: 0.035, lp: 2400, dest: this.chaseBus });
  }
}

// Render each sound offline and measure it: proves nothing is silent and nothing clips.
export async function audioReport(samples = {}) { // pass the live Sfx samples to measure Kenney voices too
  const SR = 22050; const rows = [];
  const cases = {
    stepWood: (s) => s.step(4, 'wood', true, 2, 0), stepRug: (s) => s.step(1, 'rug', false), jingle: (s) => s.jingle(8, 0, 0),
    squeak: (s) => s.squeak(), creak: (s) => s.creak(), duckToy: (s) => s.duckToy(),
    coins: (s) => s.pickup('coins'), gem: (s) => s.pickup('gem'), goldBars: (s) => s.pickup('goblet'), crown: (s) => s.pickup('crown'), chest: (s) => s.pickup('chest'),
    feather: (s) => s.power('feather'), lullaby: (s) => s.lullaby(), snore: (s) => s.snore(1.9), hmm: (s) => s.hmm(), roar: (s) => s.roar(),
    stomp: (s) => s.stomp(), yawn: (s) => s.yawn(), groan: (s) => s.groan(), rustle: (s) => s.rustle(), catHiss: (s) => s.catHiss(), dizzy: (s) => s.dizzy(), heart: (s) => s.heart(), tick: (s) => s.tick(0, 0, true),
    bird: (s) => s.bird(), houseCreak: (s) => s.houseCreak(), drop: (s) => s.drop(), door: (s) => s.door(), thud: (s) => s.thud(), deny: (s) => s.deny(), whoosh: (s) => s.whoosh(), buy: (s) => s.buy(), alarm: (s) => s.alarm(), click: (s) => s.click(), win: (s) => s.win(), lose: (s) => s.lose(),
    musicCalm: (s) => { s.mode = 'calm'; s.schedule(4); }, musicTense: (s) => { s.mode = 'calm'; s.tensionBus.gain.value = 1; s.schedule(4); },
    musicChase: (s) => { s.mode = 'chase'; s.calmBus.gain.value = 0; s.chaseBus.gain.value = 1; s.schedule(4); },
  };
  for (const [name, fn] of Object.entries(cases)) {
    const oc = new OfflineAudioContext(2, SR * 4, SR); const s = new Sfx(); s.init(oc); s.roomTone.gain.value = 0; s.nextT = 0; s.samples = samples;
    fn(s); const buf = await oc.startRendering();
    let peak = 0, sum = 0; const d = buf.getChannelData(0), e = buf.getChannelData(1);
    for (let i = 0; i < d.length; i++) { const a = Math.max(Math.abs(d[i]), Math.abs(e[i])); peak = Math.max(peak, a); sum += d[i] * d[i]; }
    const rms = Math.sqrt(sum / d.length);
    rows.push({ name, src: Object.keys(samples).length ? (samples[{ stepWood: 'stepWood', stepRug: 'stepRug', coins: 'coins', gem: 'gem', goldBars: 'goblet', crown: 'crown', chest: 'chest', squeak: 'squeak', creak: 'creak', stomp: 'stomp', tick: 'tick', click: 'click', drop: 'drop', door: 'door', thud: 'stomp', deny: 'deny', whoosh: 'toggle', houseCreak: 'houseCreak', feather: 'power', snore: 'snore', roar: 'roar', hmm: 'hmm', groan: 'groan', yawn: 'yawn' }[name]] ? 'kenney' : 'synth') : 'synth', peak: +peak.toFixed(3), rmsDb: +(20 * Math.log10(rms + 1e-9)).toFixed(1), ok: peak > 0.005 && peak < 0.99 });
  }
  return rows;
}
