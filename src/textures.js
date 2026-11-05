import * as THREE from 'three';

function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) ? 1 : 2;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 2x2 unit wooden floor tile: 4 planks with grain + seams
export function woodTex() {
  return canvasTex(256, 256, (g, w) => {
    const cols = ['#c4874f', '#b97c47', '#cb9058', '#b37645'];
    for (let i = 0; i < 4; i++) {
      const y0 = i * 64;
      g.fillStyle = cols[i]; g.fillRect(0, y0, w, 64);
      g.strokeStyle = 'rgba(90,45,20,0.14)'; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        g.beginPath(); const y = y0 + 6 + k * 9 + Math.random() * 3; g.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.04 + k * 2 + i) * 2);
        g.stroke();
      }
      g.fillStyle = 'rgba(70,35,15,0.55)'; g.fillRect(0, y0 + 61, w, 3);
      const off = (i % 2) * 128 + 60; g.fillRect(off % w, y0, 3, 64);
    }
  }, true);
}

// a single "squeaky" plank tile: lighter, worn, with visible nails
export function squeakTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e2b47c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,70,30,0.35)'; g.lineWidth = 2;
    for (let k = 0; k < 7; k++) { g.beginPath(); const y = 10 + k * 16; g.moveTo(0, y); g.bezierCurveTo(40, y + 5, 80, y - 5, w, y + 2); g.stroke(); }
    g.strokeStyle = 'rgba(80,40,15,0.6)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#5b4a40';
    for (const [x, y] of [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(60,30,10,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(50, 40); g.lineTo(62, 58); g.lineTo(56, 75); g.lineTo(70, 92); g.stroke();
  });
}

export function wallTex(c1, c2, trim) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, h);
    g.fillStyle = c2; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 32, h);
    g.fillStyle = trim; g.globalAlpha = 0.35;
    for (let y = 16; y < h; y += 64) for (let x = 16; x < w; x += 64) {
      g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 6, y); g.lineTo(x, y + 7); g.lineTo(x - 6, y); g.fill();
      g.beginPath(); g.arc(x + 32, y + 32, 3, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }, true);
}

export function rugTex(a, b, round) {
  return canvasTex(256, 256, (g, w, h) => {
    if (round) {
      const cols = [a, b, a, '#fff4e0', b, a];
      cols.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - i * 20, 0, 7); g.fill(); });
      g.fillStyle = b; for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; g.beginPath(); g.arc(w / 2 + Math.cos(an) * 70, h / 2 + Math.sin(an) * 70, 7, 0, 7); g.fill(); }
    } else {
      g.fillStyle = a; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#fff4e0'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
      g.strokeStyle = b; g.lineWidth = 10; g.strokeRect(30, 30, w - 60, h - 60);
      g.fillStyle = b;
      for (let y = 60; y < h - 50; y += 34) for (let x = 60; x < w - 50; x += 34) { g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 9, y); g.lineTo(x, y + 9); g.lineTo(x - 9, y); g.fill(); }
    }
  });
}

export function windowTex() {
  return canvasTex(128, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b2a6b'); gr.addColorStop(1, '#4a3c8f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) { g.globalAlpha = 0.4 + Math.random() * 0.6; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.globalAlpha = 1; g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(85, 45, 20, 0, 7); g.fill();
    g.fillStyle = '#2a3577'; g.beginPath(); g.arc(95, 38, 18, 0, 7); g.fill();
  });
}

export function zTex() {
  return canvasTex(64, 64, (g) => {
    g.font = 'bold 50px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = '#4b3a8a'; g.strokeText('Z', 32, 34);
    g.fillStyle = '#e8f0ff'; g.fillText('Z', 32, 34);
  });
}

export function glowTex() {
  return canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
}

// soft moonbeam: bright near the window edge (top), fading out
export function beamTex() {
  return canvasTex(64, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(190,210,255,0.9)'); gr.addColorStop(1, 'rgba(190,210,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const s = g.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(0.2, 'rgba(0,0,0,0)'); s.addColorStop(0.8, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = s; g.fillRect(0, 0, w, h);
  });
}

export function puffTex() {
  return canvasTex(64, 64, (g) => {
    for (let i = 0; i < 5; i++) {
      const x = 22 + Math.random() * 20, y = 22 + Math.random() * 20, r = 12 + Math.random() * 8;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  });
}

export function starTex() {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = '#fff'; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 30, a = i / 10 * Math.PI * 2 - Math.PI / 2; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    g.fill();
  });
}

export function noteTex() {
  return canvasTex(64, 64, (g) => {
    g.font = 'bold 48px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#3a2a7a'; g.strokeText('♪', 32, 34);
    g.fillStyle = '#9fd8ff'; g.fillText('♪', 32, 34);
  });
}

export function clockTex() {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff8e6'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
    g.fillStyle = '#4b3a8a';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48, i % 3 ? 3 : 6, 0, 7); g.fill(); }
  });
}

export function frameTex(seed) {
  return canvasTex(128, 128, (g, w, h) => {
    const skies = [['#ffd1a8', '#ff9fb2'], ['#a8e0ff', '#c9b5ff'], ['#c6f5c4', '#7fd1c9']];
    const [a, b] = skies[seed % 3];
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(1, b);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (seed % 2) { // monster portrait
      g.fillStyle = '#8e6bd8'; g.beginPath(); g.ellipse(64, 80, 40, 34, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(50, 72, 9, 0, 7); g.arc(78, 72, 9, 0, 7); g.fill();
      g.fillStyle = '#222'; g.beginPath(); g.arc(52, 74, 4, 0, 7); g.arc(80, 74, 4, 0, 7); g.fill();
      g.fillStyle = '#ffeec9'; g.beginPath(); g.moveTo(40, 52); g.lineTo(34, 30); g.lineTo(50, 48); g.fill(); g.beginPath(); g.moveTo(88, 52); g.lineTo(94, 30); g.lineTo(78, 48); g.fill();
    } else { // hills
      g.fillStyle = '#5aa86a'; g.beginPath(); g.ellipse(40, 120, 70, 40, 0, 0, 7); g.fill();
      g.fillStyle = '#4a9460'; g.beginPath(); g.ellipse(100, 125, 60, 35, 0, 0, 7); g.fill();
      g.fillStyle = '#fff3a0'; g.beginPath(); g.arc(96, 36, 14, 0, 7); g.fill();
    }
  });
}
