// The hideout: a cozy attic that is the menu's background. Bed, loot pile (grows with the stash), trophy shelf
// (every kind you ever stole), repair table, wardrobe and the decor you bought. Plus two panels:
// Wardrobe (costumes + lantern looks, tried on live) and Hideout (stash size, repair table, decor).
// Logic lives in hideout.js (pure, tested); this file only draws and wires buttons.
import * as THREE from 'three';
import { RULES } from './rules.js';
import { lanternUpPrice, buyLanternUp, lanternStats, lanternLevel } from './hideout.js';
import { stashCap, stashPrice, buyStash, buyRepair, repairCost, repairItem, buyDecor, buyPiece, ownsPiece, piecePrice, wear, fullSet, bonusPercent, buyLantern, wearLantern } from './hideout.js';
import { SET_ICON, DECOR_ICON } from './icons.js';
import { lanternColor } from './costumes.js';

export function createHideoutView(d) {
  const { $, show, hide, icon, t, setText, lanternName, decorName, itemName, save, writeSave, sfx } = d;
  const V = { built: false, t: 0, tab: 'hat', htab: 'up', preview: null, sel: null, fish: null, flames: [] };
  const SETS = Object.keys(RULES.costumes.sets), KINDS = Object.keys(RULES.items);

  // ---------- 3D attic ----------
  function build() {
    const w = d.clearWorld(); const { M, toon, AS } = d; V.built = true; V.flames = []; V.fish = null;
    d.scene.background = new THREE.Color('#2a1d33');
    const wood = toon('#7a5236'), dark = toon('#4e3322'), wall = toon('#4a3355'), wall2 = toon('#3c2a47');
    const floor = M(new THREE.PlaneGeometry(8.6, 14), wood, 0, 0, 3, w, false); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    for (let i = -4; i <= 4; i++) M(new THREE.BoxGeometry(0.03, 0.005, 14), dark, i, 0.003, 3, w, false);
    M(new THREE.BoxGeometry(8.6, 9, 0.2), wall, 0, 4.5, -3.6, w);
    for (const s of [-1, 1]) { const sw = M(new THREE.BoxGeometry(0.2, 9, 14), wall2, s * 4.3, 4.5, 3.4, w); void sw; }
    for (const x of [-3.2, -1.1, 1.1, 3.2]) M(new THREE.BoxGeometry(0.22, 0.22, 7.4), dark, x, 4.1, 0.1, w); // roof beams
    M(new THREE.BoxGeometry(8.6, 0.25, 0.25), dark, 0, 4.25, -3.45, w);
    // round window with the moon
    const win = new THREE.Group(); win.position.set(-0.6, 2.85, -3.48); w.add(win);
    M(new THREE.CircleGeometry(0.62, 28), toon('#1d2a55', { emissive: '#22336a', ei: 0.6 }), 0, 0, 0, win, false);
    M(new THREE.CircleGeometry(0.2, 20), toon('#fff6d0', { emissive: '#fff0b0', ei: 2 }), 0.2, 0.16, 0.01, win, false);
    M(new THREE.TorusGeometry(0.64, 0.06, 8, 32), dark, 0, 0, 0.02, win);
    M(new THREE.BoxGeometry(1.25, 0.05, 0.04), dark, 0, 0, 0.03, win); M(new THREE.BoxGeometry(0.05, 1.25, 0.04), dark, 0, 0, 0.03, win);
    // bed
    const bed = new THREE.Group(); bed.position.set(-2.9, 0, -2.75); w.add(bed);
    M(new THREE.BoxGeometry(2.1, 0.42, 1.25), dark, 0, 0.21, 0, bed); M(new THREE.BoxGeometry(0.12, 1.0, 1.3), dark, -1.05, 0.5, 0, bed);
    M(new THREE.BoxGeometry(1.95, 0.2, 1.15), toon('#f0e6d6'), 0.03, 0.5, 0, bed);
    M(new THREE.BoxGeometry(1.3, 0.12, 1.2), toon('#7b5ad6'), 0.35, 0.62, 0, bed);
    const pil = M(new THREE.SphereGeometry(0.28, 14, 10), toon('#fffaf0'), -0.7, 0.68, 0, bed); pil.scale.set(1, 0.45, 1.5);
    // loot pile: a chest + one sack per stashed item (up to 10)
    const pile = new THREE.Group(); pile.position.set(3.0, 0, -2.5); w.add(pile);
    const ch = AS.treasure('chest') || d.buildTreasure('chest'); if (ch) { ch.scale.multiplyScalar(0.9); pile.add(ch); }
    const n = Math.min(10, save.stash.length);
    for (let i = 0; i < n; i++) { const a = i * 2.4, r = 0.75 + (i % 3) * 0.18; const sk = M(new THREE.SphereGeometry(0.24, 14, 10), toon(i % 2 ? '#d1a463' : '#c08f50'), Math.cos(a) * r, 0.2 + (i > 6 ? 0.3 : 0), Math.sin(a) * r * 0.6 + 0.3, pile); sk.scale.y = 0.85; }
    // trophy shelf: one slot per item kind, filled when you have ever escaped with it
    const shelf = new THREE.Group(); shelf.position.set(1.15, 0, -3.35); w.add(shelf);
    const per = Math.ceil(KINDS.length / 2);
    for (let r = 0; r < 2; r++) {
      const y = 1.25 + r * 0.95; M(new THREE.BoxGeometry(2.9, 0.08, 0.42), dark, 0, y, 0.1, shelf);
      for (let i = 0; i < per; i++) {
        const k = KINDS[r * per + i]; if (!k) continue; const x = -1.3 + i * (2.6 / (per - 1));
        if (!save.meta.collection.includes(k)) { M(new THREE.CircleGeometry(0.06, 10), toon('#2a1f33'), x, y + 0.2, -0.1, shelf, false); continue; }
        const o = AS.treasure(k) || d.buildTreasure(k); if (!o) continue;
        const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()); o.scale.multiplyScalar(0.34 / Math.max(sz.x, sz.y, sz.z, 0.01));
        o.position.set(x, y + 0.05, 0.12); shelf.add(o);
      }
    }
    for (const s of [-1, 1]) M(new THREE.BoxGeometry(0.08, 2.3, 0.42), dark, s * 1.45, 1.15 + 0.4, 0.1, shelf);
    // wardrobe at the left wall
    const wr = AS.furniture('wardrobe', 0.75, 0.35) || d.buildFurniture('wardrobe', 0.75, 0.35); wr.position.set(-3.75, 0, -0.5); wr.rotation.y = Math.PI / 2; w.add(wr);
    // repair table (run upgrade)
    if (save.run.hideout.repair) {
      const tb = AS.furniture('table', 0.7, 0.45) || d.buildFurniture('table', 0.7, 0.45); tb.position.set(3.25, 0, 0.5); tb.rotation.y = -Math.PI / 2; w.add(tb);
      const ham = new THREE.Group(); ham.position.set(3.15, 0.9, 0.3); ham.rotation.y = 0.6; w.add(ham);
      M(new THREE.BoxGeometry(0.5, 0.05, 0.05), toon('#9a6236'), 0, 0, 0, ham); M(new THREE.BoxGeometry(0.08, 0.1, 0.18), toon('#8a8fa0', { metal: 1 }), 0.25, 0.02, 0, ham);
      M(new THREE.TorusGeometry(0.07, 0.025, 6, 12), toon('#8a8fa0', { metal: 1 }), 3.3, 0.9, 0.85, w).rotation.x = Math.PI / 2;
    }
    // bought decor (kept forever)
    const has = (id) => save.meta.decor.includes(id);
    if (has('rug')) { const rg = M(new THREE.CircleGeometry(1.5, 40), toon('#b04a5a'), 0, 0.012, 2.5, w, false); rg.rotation.x = -Math.PI / 2; const r2 = M(new THREE.RingGeometry(1.05, 1.2, 40), toon('#ffcf3f'), 0, 0.014, 2.5, w, false); r2.rotation.x = -Math.PI / 2; }
    if (has('plant')) { const p = AS.furniture('plant', 0.3, 0.3) || d.buildFurniture('plant', 0.3, 0.3); p.position.set(-3.2, 0, 1.7); w.add(p); }
    if (has('lamp')) { const l = AS.decor('lamp'); if (l) { l.position.set(3.6, 0, -1.2); w.add(l); } M(new THREE.SphereGeometry(0.16, 12, 10), toon('#fff2c0', { emissive: '#ffcc66', ei: 2 }), 3.6, 2.1, -1.2, w, false); }
    if (has('poster')) { const pg = new THREE.Group(); pg.position.set(-2.9, 2.55, -3.48); w.add(pg); M(new THREE.PlaneGeometry(0.95, 1.25), toon('#ffe7a6'), 0, 0, 0, pg, false); M(new THREE.CircleGeometry(0.3, 20), toon('#8e6bd8'), 0, 0.05, 0.01, pg, false); for (const s of [-1, 1]) M(new THREE.CircleGeometry(0.06, 10), toon('#ffffff'), s * 0.11, 0.1, 0.02, pg, false); M(new THREE.PlaneGeometry(0.7, 0.12), toon('#c0392b'), 0, -0.45, 0.01, pg, false); }
    if (has('fishbowl')) {
      const st = AS.furniture('crate', 0.3, 0.3) || d.buildFurniture('crate', 0.3, 0.3); st.position.set(3.1, 0, 2.1); w.add(st);
      M(new THREE.SphereGeometry(0.3, 18, 14), new THREE.MeshStandardMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.35, roughness: 0.1 }), 3.1, 0.95, 2.1, w, false);
      V.fish = M(new THREE.SphereGeometry(0.07, 10, 8), toon('#ff8a1c', { emissive: '#ff5a00', ei: 0.3 }), 3.1, 0.92, 2.1, w, false); V.fish.scale.set(1.5, 1, 0.7);
    }
    if (has('armchair')) { const a = AS.furniture('armchair', 0.5, 0.5) || d.buildFurniture('armchair', 0.5, 0.5); a.position.set(-2.3, 0, 2.5); a.rotation.y = Math.PI * 0.8; w.add(a); }
    if (has('globe')) { const g = new THREE.Group(); g.position.set(-3.3, 0, 0.7); w.add(g); M(new THREE.CylinderGeometry(0.2, 0.25, 0.05, 12), dark, 0, 0.03, 0, g); M(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), dark, 0, 0.38, 0, g); const gl = M(new THREE.SphereGeometry(0.28, 18, 14), toon('#3f8ad6'), 0, 0.85, 0, g); M(new THREE.SphereGeometry(0.16, 10, 8), toon('#5cbf5c'), 0.12, 0.92, 0.14, g, false); V.globe = gl.parent; }
    if (has('throne')) { const th = new THREE.Group(); th.position.set(-0.6, 0, -3.0); w.add(th); const gd = toon('#ffcf3f', { metal: 1, emissive: '#c98a00', ei: 0.3 }); M(new THREE.BoxGeometry(0.9, 0.5, 0.8), gd, 0, 0.25, 0, th); M(new THREE.BoxGeometry(0.9, 1.3, 0.15), gd, 0, 0.9, -0.35, th); M(new THREE.BoxGeometry(0.75, 0.12, 0.65), toon('#b0164a'), 0, 0.55, 0.03, th); for (const s of [-1, 0, 1]) M(new THREE.ConeGeometry(0.08, 0.2, 8), gd, s * 0.3, 1.65, -0.35, th); }
    // candles + lights: a warm attic, the moon through the window
    for (const [x, z] of [[-1.5, -3.1], [2.4, -1.7]]) { const c = AS.treasure('candle') || d.buildTreasure('candle'); if (c) { c.position.set(x, 0, z); w.add(c); } }
    d.hemi.intensity = 0.32; d.sun.intensity = 0.25; d.moon.intensity = 0.35; d.scene.environmentIntensity = 0.12; d.lantern.intensity = 0;
    d.nestLight.position.set(0, 3.3, 0.4); d.nestLight.intensity = 11;
    d.candles.forEach((c, i) => { c.userData.on = i < 2; c.position.set(i ? 2.4 : -1.5, 0.9, i ? -1.7 : -3.1); c.intensity = i < 2 ? 3 : 0; });
    const p = d.player; p.group.visible = true; p.group.position.set(0, 0, 2.6); p.group.rotation.y = 0; p.sack.visible = false;
  }
  function update(dt) {
    if (!V.built) return; V.t += dt;
    if (V.fish) { const a = V.t * 1.3; V.fish.position.set(3.1 + Math.cos(a) * 0.15, 0.92 + Math.sin(a * 2) * 0.03, 2.1 + Math.sin(a) * 0.15); V.fish.rotation.y = -a; }
    if (V.globe) V.globe.rotation.y += dt * 0.3;
  }
  const leaveScene = () => { V.built = false; };

  // ---------- wardrobe ----------
  const coins = (id) => { $(id).textContent = save.coins; };
  function openWardrobe() {
    V.preview = { ...save.meta.wear }; V.sel = null; V.tab = 'hat';
    d.setMode('wardrobe'); hide('menu'); show('wardrobe'); renderWardrobe();
  }
  function bonusLine(w) {
    const s = fullSet(w);
    return s ? `<div class="setLine on">${icon(SET_ICON(s))}<b>${t('fullSet', { set: setText(s).name })}</b><span>${setText(s, { p: bonusPercent(s) }).desc}</span></div>`
      : `<div class="setLine">${icon('sparkle')}<span>${t('noSet')}</span></div>`;
  }
  function renderWardrobe() {
    coins('wdCoins'); const m = save.meta, P = V.preview, tab = V.tab;
    const tabs = [['hat', 'tophat'], ['outfit', 'shirt'], ['bag', 'bag'], ['lantern', 'lanternI']]
      .map(([k, ic]) => `<button class="tab ${tab === k ? 'on' : ''}" data-wt="${k}">${icon(ic)}<span>${t(k === 'bag' ? 'bagT' : k === 'lantern' ? 'lanternT' : k)}</span></button>`).join('');
    let cards = '', buy = '';
    if (tab === 'lantern') {
      cards = Object.keys(RULES.lanterns).map((id) => {
        const own = m.lanterns.includes(id), on = P.lantern === id, worn = m.wear.lantern === id;
        return `<button class="wCard ${on ? 'on' : ''} ${own ? '' : 'locked'}" data-l="${id}"><span class="swatch" style="--c:${lanternColor(id)}">${icon('lanternI')}</span><span class="wn">${lanternName(id)}</span>${worn ? `<span class="wst">${icon('check')}</span>` : own ? '' : `<span class="wpr"><span class="coin"></span><span class="num">${RULES.lanterns[id].price}</span></span>`}</button>`;
      }).join('');
      if (V.sel && !m.lanterns.includes(V.sel)) buy = buyBtn(RULES.lanterns[V.sel].price, lanternName(V.sel));
    } else {
      const none = `<button class="wCard ${!P[tab] ? 'on' : ''}" data-s=""><span class="swatch">${icon('cross')}</span><span class="wn">${t('none')}</span></button>`;
      cards = none + SETS.map((s) => {
        const own = ownsPiece(m, s, tab), on = P[tab] === s, worn = m.wear[tab] === s;
        return `<button class="wCard ${on ? 'on' : ''} ${own ? '' : 'locked'}" data-s="${s}"><span class="swatch">${icon(SET_ICON(s))}</span><span class="wn">${setText(s).name}</span>${worn ? `<span class="wst">${icon('check')}</span>` : own ? '' : `<span class="wpr"><span class="coin"></span><span class="num">${piecePrice(s, tab)}</span></span>`}</button>`;
      }).join('');
      if (V.sel && !ownsPiece(m, V.sel, tab)) buy = buyBtn(piecePrice(V.sel, tab), setText(V.sel).name);
    }
    const sel = tab !== 'lantern' && V.sel ? `<div class="selBonus">${icon(SET_ICON(V.sel))}<span>${t('setBonus')}: ${setText(V.sel, { p: bonusPercent(V.sel) }).desc}</span></div>` : '';
    $('wdSheet').innerHTML = `<div class="mkTabs four">${tabs}</div>${bonusLine(P)}<div class="wGrid">${cards}</div>${sel}
      <div class="mkBtns">${buy}<button class="kbtn grey" id="wdBack">${icon('home')}<span>${t('back')}</span></button></div><p class="fine">${t('keptForever')}</p>`;
    $('wdSheet').querySelectorAll('[data-wt]').forEach((b) => { b.onclick = () => { V.tab = b.dataset.wt; V.sel = null; V.preview = { ...save.meta.wear }; d.dress(V.preview); renderWardrobe(); }; });
    $('wdSheet').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => pickSet(b.dataset.s || null); });
    $('wdSheet').querySelectorAll('[data-l]').forEach((b) => { b.onclick = () => pickLantern(b.dataset.l); });
    const bb = $('wdBuy'); if (bb) bb.onclick = buySelected;
    $('wdBack').onclick = closeWardrobe;
  }
  const buyBtn = (price, name) => `<button class="kbtn ${save.coins >= price ? 'green' : 'grey'}" id="wdBuy" ${save.coins < price ? 'disabled' : ''}><span>${t('buy')}</span><span class="coin"></span><span class="num">${price}</span></button>`;
  function pickSet(set) {
    const slot = V.tab; V.sel = set; V.preview = { ...save.meta.wear, [slot]: set };
    if (set == null || ownsPiece(save.meta, set, slot)) { wear(save.meta, slot, set); writeSave(save); V.sel = set; }
    d.dress(V.preview); sfx.whoosh(); renderWardrobe();
  }
  function pickLantern(id) {
    V.sel = id; V.preview = { ...save.meta.wear, lantern: id };
    if (save.meta.lanterns.includes(id)) { wearLantern(save.meta, id); writeSave(save); }
    d.dress(V.preview); sfx.whoosh(); renderWardrobe();
  }
  function buySelected() {
    const ok = V.tab === 'lantern' ? buyLantern(save, V.sel) && wearLantern(save.meta, V.sel) : buyPiece(save, V.sel, V.tab) && wear(save.meta, V.tab, V.sel);
    if (!ok) { sfx.deny(); return; }
    writeSave(save); sfx.buy(); d.floaterScreen(t('worn')); V.preview = { ...save.meta.wear }; d.dress(V.preview); renderWardrobe();
  }
  function closeWardrobe() { hide('wardrobe'); d.dress(save.meta.wear); d.toMenu(); }

  // ---------- hideout panel ----------
  function openHideout() { V.htab = 'up'; d.setMode('hideout'); hide('menu'); show('hideoutUI'); renderHideout(); }
  function renderHideout() {
    coins('hoCoins'); const r = save.run, m = save.meta;
    const tabs = `<div class="mkTabs"><button class="tab ${V.htab === 'up' ? 'on' : ''}" data-ht="up">${icon('tools')}<span>${t('upgradesT')}</span></button><button class="tab ${V.htab === 'decor' ? 'on' : ''}" data-ht="decor">${icon('d_rug')}<span>${t('decorT')}</span></button></div>`;
    const priceBtn = (id, price) => `<button class="kbtn ${save.coins >= price ? 'green' : 'grey'} lb" data-hb="${id}" ${save.coins < price ? 'disabled' : ''}><span class="coin"></span><span class="num">${price}</span></button>`;
    const row = (ic, name, desc, right) => `<div class="goodRow"><span class="gi">${icon(ic)}</span><div class="gt"><b>${name}</b><small>${desc}</small></div>${right}</div>`;
    const lvl = (k) => '★'.repeat(lanternLevel(r, k)) + '☆'.repeat(RULES.lanternUp[k].prices.length - lanternLevel(r, k));
    const upBtn = (k) => { const p = lanternUpPrice(r, k); return p == null ? `<span class="owned">${t('maxedT')}</span>` : priceBtn('l:' + k, p); };
    let body;
    if (V.htab === 'up') {
      const sp = stashPrice(r), damaged = r.stash.map((it, i) => ({ it, i })).filter((x) => (x.it.cond ?? 1) < 0.999);
      body = row('i_chest', t('stashSize'), t('stashSizeD', { n: stashCap(r) }) + ` · ${r.stash.length}/${stashCap(r)}`, sp == null ? `<span class="owned">${t('maxedT')}</span>` : priceBtn('stash', sp))
        + row('tools', t('repairT'), t('repairD'), r.hideout.repair ? `<span class="owned">${icon('check')}${t('owned')}</span>` : priceBtn('repair', RULES.hideout.repair.price))
        + (r.hideout.repair ? (damaged.length ? damaged.map(({ it, i }) => row('i_' + it.kind, itemName(it.kind), `${icon('crack')}${Math.round(it.cond * 100)}%`, `<button class="kbtn ${save.coins >= repairCost(it) ? 'blue' : 'grey'} lb" data-rep="${i}" ${save.coins < repairCost(it) ? 'disabled' : ''}>${t('repairBtn')} <span class="coin"></span><span class="num">${repairCost(it)}</span></button>`)).join('') : `<p class="fine">${t('nothingToRepair')}</p>`) : '')
        + row('lanternI', t('lanternRange') + ' ' + lvl('range'), t('lanternRangeD', { n: lanternStats(r).darkR.toFixed(1) }), upBtn('range'))
        + row('sparkle', t('lanternBright') + ' ' + lvl('bright'), t('lanternBrightD', { n: lanternStats(r).mult.toFixed(1) }), upBtn('bright'))
        + row('shelf', t('collectionT'), t('collectionD', { n: m.collection.length, m: KINDS.length }), '')
        + `<p class="fine">${icon('warn')}${t('lostAtGameOver')}</p>`;
    } else {
      body = Object.entries(RULES.hideout.decor).map(([id, price]) => row(DECOR_ICON[id], decorName(id), t('keptForever'), m.decor.includes(id) ? `<span class="owned">${icon('check')}${t('owned')}</span>` : priceBtn('d:' + id, price))).join('')
        + `<p class="fine">${t('keptForever')}</p>`;
    }
    $('hoSheet').innerHTML = `${tabs}<div class="goodList">${body}</div><div class="mkBtns"><button class="kbtn grey" id="hoBack">${icon('home')}<span>${t('back')}</span></button></div>`;
    $('hoSheet').querySelectorAll('[data-ht]').forEach((b) => { b.onclick = () => { V.htab = b.dataset.ht; renderHideout(); }; });
    $('hoSheet').querySelectorAll('[data-hb]').forEach((b) => { b.onclick = () => {
      const id = b.dataset.hb;
      const ok = id === 'stash' ? buyStash(save.run) : id === 'repair' ? buyRepair(save.run) : id.startsWith('l:') ? buyLanternUp(save.run, id.slice(2)) : buyDecor(save, id.slice(2));
      if (!ok) { sfx.deny(); return; }
      writeSave(save); sfx.buy(); build(); renderHideout();
    }; });
    $('hoSheet').querySelectorAll('[data-rep]').forEach((b) => { b.onclick = () => {
      if (!repairItem(save.run, +b.dataset.rep)) { sfx.deny(); return; }
      writeSave(save); sfx.buy(); sfx.click(); renderHideout();
    }; });
    $('hoBack').onclick = () => { hide('hideoutUI'); d.toMenu(); };
  }
  return { build, update, leaveScene, openWardrobe, openHideout, get built() { return V.built; } };
}
