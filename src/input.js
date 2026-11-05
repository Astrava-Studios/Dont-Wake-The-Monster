// Dynamic virtual joystick (touch/mouse) + keyboard (WASD/arrows, Shift = tiptoe)
export class Input {
  constructor(zone, base, knob) {
    this.zone = zone; this.base = base; this.knob = knob;
    this.max = 52; this.id = null; this.jx = 0; this.jy = 0; this.keys = {}; this.enabled = true;
    zone.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.id !== null) return;
      this.id = e.pointerId; this.ox = e.clientX; this.oy = e.clientY;
      base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px';
      base.classList.add('on'); knob.style.transform = 'translate(0,0)';
      try { zone.setPointerCapture(e.pointerId); } catch {}
      this.onStart && this.onStart();
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === this.id) this.move(e); });
    const end = (e) => { if (e.pointerId === this.id) this.release(); };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.release(); });
  }
  release() { this.id = null; this.jx = this.jy = 0; this.base.classList.remove('on', 'run'); }
  move(e) {
    let dx = e.clientX - this.ox, dy = e.clientY - this.oy;
    const d = Math.hypot(dx, dy);
    if (d > this.max) { dx *= this.max / d; dy *= this.max / d; }
    this.jx = dx / this.max; this.jy = dy / this.max;
    this.knob.style.transform = `translate(${dx}px,${dy}px)`;
    this.base.classList.toggle('run', Math.hypot(this.jx, this.jy) > 0.6);
  }
  get() {
    if (!this.enabled) return { x: 0, y: 0 };
    if (this.id !== null) {
      const m = Math.hypot(this.jx, this.jy);
      if (m < 0.12) return { x: 0, y: 0 };
      return { x: this.jx, y: this.jy };
    }
    const k = this.keys;
    const x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const y = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    const m = Math.hypot(x, y);
    if (!m) return { x: 0, y: 0 };
    const s = (k.ShiftLeft || k.ShiftRight) ? 0.45 : 1;
    return { x: x / m * s, y: y / m * s };
  }
}
