// Black market screen: 3D shop with the old merchant + stash list + haggling dialog.
// Logic lives in market.js (pure, tested); this file only draws and wires buttons.
import * as THREE from 'three';
import { estimate, openDeal, dealAct, visitMood, visitDemand, quickPrice, clampRep, asksFor } from './market.js';
import { rentAmount, rentDueNow, nightsToRent, payRent, buyGear, buyConsumable } from './run.js';
import { GOOD_ICON } from './icons.js';
import { RULES } from './rules.js';
import { setBonus } from './hideout.js';

// the number each good's description shows (−15 %, +3, 10 s …)
export function goodParam(id) {
  const g = RULES.gear[id], c = RULES.consumables[id];
  if (g) return g.stepNoise ? Math.round((1 - g.stepNoise) * 100) : g.rummageNoise ? Math.round((1 - g.rummageNoise) * 100) : g.capacity;
  return c.time ?? c.stun ?? 0;
}

export function createMarketView(d) {
  const { $, show, hide, icon, t, line, itemName, goodText, save, writeSave, sfx } = d;
  const V = { sylT: 0, story: 0, active: false, from: 'menu', tab: 'sell', deal: null, typing: null, talkT: 0, merchant: null, counterItem: null, t: 0 };
  const run = () => save.run;
  const demand = () => visitDemand(run().visit);
  const ctx = () => ({ haggle: save.upgrades.haggle || 0, appraisal: save.upgrades.appraisal || 0, mood: run().mood ?? 1, demand: demand(), rep: run().rep, pay: setBonus(save.meta.wear).pay || 1 });
  const fmtEst = (it) => { const e = estimate(it, ctx()); return `${e.lo}–${e.hi}`; };
  // the merchant remembers every deal of this visit (saved, so leaving + reopening or reloading never re-rolls
  // his offer, his patience or a failed flattery); refused items stay refused until the next visit
  const KEEP = ['offer', 'patience', 'patienceMax', 'flattered', 'tight', 'max', 'misses'];
  function memo() {
    const r = run();
    if (!r.marketMemo || r.marketMemo.visit !== r.visit) r.marketMemo = { visit: r.visit, deals: {}, refused: [] };
    return r.marketMemo;
  }
  const isRefused = (it) => memo().refused.includes(it.seed);
  function remember(D) { const o = {}; for (const k of KEEP) o[k] = D[k]; memo().deals[D.item.seed] = o; }

  // ---------- 3D shop ----------
  function buildShop() {
    const w = d.clearWorld(); const { M, toon, AS, buildMerchant, buildTreasure } = d;
    d.scene.background = new THREE.Color('#120c18');
    const floor = M(new THREE.PlaneGeometry(14, 10), toon('#5a3d2b'), 0, 0, 0, w, false); floor.rotation.x = -Math.PI / 2;
    const rug = M(new THREE.CircleGeometry(2.2, 32), toon('#7a2f3f'), -0.5, 0.01, 2.6, w, false); rug.rotation.x = -Math.PI / 2;
    M(new THREE.RingGeometry(1.9, 2.05, 40), toon('#e0b040'), -0.5, 0.012, 2.6, w, false).rotation.x = -Math.PI / 2;
    M(new THREE.BoxGeometry(14, 5, 0.3), toon('#3b2a3f'), 0, 2.5, -2.2, w);
    for (const s of [-1, 1]) M(new THREE.BoxGeometry(0.3, 5, 10), toon('#33243a'), s * 5, 2.5, 2.5, w);
    // counter
    M(new THREE.BoxGeometry(4.2, 1.05, 1.0), toon('#6b4126'), 0, 0.52, 0.8, w);
    M(new THREE.BoxGeometry(4.4, 0.1, 1.15), toon('#8a5632'), 0, 1.08, 0.8, w);
    M(new THREE.BoxGeometry(2.0, 0.02, 1.0), toon('#4b6b3a'), 0, 1.14, 0.8, w, false); // felt mat
    // shelves full of dusty goods
    for (const s of [-1, 1]) {
      const cab = AS.furniture('wardrobe', 0.8, 0.4) || d.buildFurniture('wardrobe', 0.8, 0.4); cab.position.set(s * 3.2, 0, -1.7); w.add(cab);
      ['bottle', 'book', 'candle'].forEach((k, i) => { const o = AS.treasure(k) || buildTreasure(k); if (o) { o.position.set(s * 3.2 - 0.5 + i * 0.5, 1.72, -1.7); o.scale.multiplyScalar(0.8); w.add(o); } });
      const crate = AS.furniture('crate', 0.5, 0.5) || d.buildFurniture('crate', 0.5, 0.5); crate.position.set(s * 4.1, 0, 1.2); w.add(crate);
      const barrel = AS.furniture('barrel', 0.45, 0.45) || d.buildFurniture('barrel', 0.45, 0.45); barrel.position.set(s * 4.2, 0, 2.8); w.add(barrel);
    }
    for (const x of [-1.6, 1.6]) { const c = AS.treasure('candle') || buildTreasure('candle'); if (c) { c.position.set(x, 1.13, 0.6); w.add(c); } }
    const lampCord = M(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), toon('#222'), 0, 4.4, 0.4, w, false); void lampCord;
    M(new THREE.ConeGeometry(0.45, 0.4, 16, 1, true), toon('#c9a04a', { side: 1 }), 0, 3.7, 0.4, w);
    M(new THREE.SphereGeometry(0.12, 10, 8), toon('#fff2c0', { emissive: '#ffcc66', ei: 2 }), 0, 3.55, 0.4, w, false);
    // the merchant
    V.merchant = buildMerchant(); V.merchant.group.position.set(0, 0.32, -0.35); w.add(V.merchant.group);
    // lights: warm lamp above the counter + two candles, very little ambient
    d.hemi.intensity = 0.06; d.sun.intensity = 0.05; d.moon.intensity = 0.1; d.scene.environmentIntensity = 0.02; d.lantern.intensity = 0;
    d.nestLight.position.set(0, 3.4, 0.6); d.nestLight.intensity = 14;
    d.candles.forEach((c, i) => { c.userData.on = i < 2; c.position.set(i ? 1.6 : -1.6, 1.6, 0.6); });
    // the thief waits in front of the counter
    d.player.group.visible = true; d.player.group.position.set(-2.0, 0, 3.1); d.player.group.rotation.y = Math.PI * 0.8;
    d.player.sack.visible = save.stash.length > 0;
  }
  function putOnCounter(kind) {
    if (V.counterItem) { V.counterItem.parent && V.counterItem.parent.remove(V.counterItem); V.counterItem = null; }
    if (!kind) return;
    const o = d.AS.treasure(kind) || d.buildTreasure(kind); if (!o) return;
    // fit on the counter beside him (never hiding the merchant)
    const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3()); const k = 0.6 / Math.max(sz.x, sz.y, sz.z, 0.01);
    o.scale.multiplyScalar(Math.min(1.6, k)); o.position.set(1.05, 1.15, 1.0); d.world().add(o); V.counterItem = o;
  }

  // ---------- dialog ----------
  // with a recording, his voice runs as one continuous phrase while the text types out (38 letters/s)
  function say(text) {
    const line = V.typing = { text, i: 0, acc: 0 }; $('mkSay').textContent = ''; V.talkT = 1;
    V.voiced = sfx.talk(text.length / 38 + 0.15);
    // his recording is still loading: stay quiet, then speak the rest of this line as soon as it is ready
    if (!V.voiced && sfx.voiceState === 'loading') sfx.voiceReady.then(() => {
      if (!V.active || V.typing !== line) return;
      const left = (line.text.length - line.i) / 38 + 0.15;
      if (left > 0.35) V.voiced = sfx.talk(left);
    });
  }
  function update(dt) {
    if (!V.active) return;
    V.t += dt;
    if (V.typing) {
      V.typing.acc += dt * 38;
      while (V.typing.acc >= 1 && V.typing.i < V.typing.text.length) {
        V.typing.acc -= 1; V.typing.i++;
      }
      // big fat man gibberish: "bla bla, blöl bolob..." one syllable every few letters, pauses on punctuation
      V.sylT -= dt;
      const ch = V.typing.text[V.typing.i - 1] || '';
      if (V.voiced || sfx.voiceState !== 'none') { /* his recording plays (or is about to): never the synth voice */ }
      else if (/[.,!?…—]/.test(ch)) V.sylT = Math.max(V.sylT, 0.18);
      else if (V.sylT <= 0 && ch.trim()) { const len = sfx.mumble({ pitch: 82 + Math.random() * 22, long: Math.random() < 0.12 }) || 0.14; V.sylT = len + 0.01 + Math.random() * 0.04; }
      $('mkSay').textContent = V.typing.text.slice(0, V.typing.i);
      if (V.typing.i >= V.typing.text.length) V.typing = null;
    }
    const m = V.merchant; if (!m) return;
    const talking = !!V.typing;
    m.body.scale.y = 1 + Math.sin(V.t * 1.6) * 0.015;
    m.head.rotation.set(talking ? Math.sin(V.t * 9) * 0.06 : Math.sin(V.t * 0.7) * 0.03, Math.sin(V.t * 0.4) * 0.15, 0);
    m.mouth.scale.y = talking ? 0.3 + Math.abs(Math.sin(V.t * 18)) * 0.9 : 0.4;
    const inspect = !!V.deal; m.arms[1].rotation.x = THREE.MathUtils.lerp(m.arms[1].rotation.x, inspect ? -0.7 : 0, 0.08);
    if (V.counterItem) V.counterItem.rotation.y += dt * 0.6;
  }

  // ---------- UI ----------
  function coins() { $('mkCoins').textContent = save.coins; }
  // tabs + today's demand + rent: the strip above both tabs
  function strip() {
    const r = run(), dm = demand(), due = rentDueNow(r), amt = rentAmount(r.rentIdx);
    const rent = due
      ? `<button class="chip rent due" id="mkPayRent" ${r.coins < amt ? 'disabled' : ''}>${icon('bank')}<span>${t('pay')}</span><span class="coin"></span><span class="num">${amt}</span></button>`
      : `<span class="chip rent">${icon('bank')}<span class="num">${amt}</span><span>· ${t('rentIn', { n: nightsToRent(r) })}</span></span>`;
    return `<div class="mkStrip"><div class="mkTabs"><button class="tab ${V.tab === 'sell' ? 'on' : ''}" data-tab="sell">${t('sellTab')}</button><button class="tab ${V.tab === 'buy' ? 'on' : ''}" data-tab="buy">${t('buyTab')}</button></div>
      <div class="chips"><span class="chip good" title="${t('wants')}">${icon('i_' + dm.want)}<span>${t('wants')}</span><b>+${Math.round((RULES.market.wantMult - 1) * 100)}%</b></span>
        <span class="chip bad" title="${t('dislikes')}">${icon('i_' + dm.dislike)}<span>${t('dislikes')}</span><b>−${Math.round((1 - RULES.market.dislikeMult) * 100)}%</b></span>${rent}</div></div>`;
  }
  function exits() {
    return V.from === 'run'
      ? `<button class="kbtn yellow" id="mkNext">${icon('moon')}<span class="num">${d.nextNight()}</span>${icon('play')}</button><button class="kround grey" id="mkHome">${icon('home')}</button>`
      : `<button class="kbtn grey" id="mkHome">${icon('home')}<span>${t('leave')}</span></button>`;
  }
  function wire() {
    const sh = $('mkSheet');
    sh.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { V.tab = b.dataset.tab; sfx.click(); render(); }; });
    const pr = $('mkPayRent'); if (pr) pr.onclick = () => {
      const amt = rentAmount(run().rentIdx);
      if (!payRent(run())) { sfx.deny(); return; }
      writeSave(save); sfx.buy(); d.floaterScreen('−' + amt); say(line('mSold', { n: amt })); render();
    };
    $('mkHome').onclick = () => leave('menu');
    const nx = $('mkNext'); if (nx) nx.onclick = () => leave('next');
  }
  const render = () => (V.tab === 'buy' ? renderBuy() : renderStash());
  function renderStash() {
    V.deal = null; putOnCounter(null); coins();
    const st = save.stash, dm = demand();
    const cards = st.map((it, i) => {
      const tag = it.kind === dm.want ? 'want' : it.kind === dm.dislike ? 'dislike' : '';
      const dmg = (it.cond ?? 1) < 0.999 ? `<span class="dmg" title="${t('damaged')}">${icon('crack')}${Math.round((it.cond ?? 1) * 100)}%</span>` : '';
      return `<button class="itemCard ${tag} ${isRefused(it) ? 'off' : ''}" data-i="${i}">${dmg}${icon('i_' + it.kind)}<span class="inm">${itemName(it.kind)}</span><span class="iest"><span class="coin"></span><span class="num">${fmtEst(it)}</span></span></button>`;
    }).join('');
    $('mkSheet').innerHTML = `${strip()}<div class="mkHead"><span>${icon('bag')}${t('stash')}</span><span class="small">${t('estCeil')}</span></div>
      ${st.length ? `<div class="itemGrid">${cards}</div>` : `<p class="mkEmpty">${t('emptyStash')}</p>`}
      <div class="mkBtns">${st.length ? `<button class="kbtn green" id="mkSellAll"><span class="coin"></span><span>${t('sellAll')}</span></button>` : ''}${exits()}</div>`;
    $('mkSheet').querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => startDeal(+b.dataset.i); });
    const sa = $('mkSellAll'); if (sa) sa.onclick = sellAll;
    wire();
  }
  function renderBuy() {
    V.deal = null; putOnCounter(null); coins();
    const r = run();
    const row = (id, price, right) => { const g = goodText(id, { p: goodParam(id) }); return `<div class="goodRow"><span class="gi">${icon(GOOD_ICON[id])}</span><div class="gt"><b>${g.name}</b><small>${g.desc}</small></div>${right}</div>`; };
    const buyBtn = (kind, id, price) => `<button class="kbtn ${save.coins >= price ? 'green' : 'grey'} lb" data-buy="${kind}:${id}" ${save.coins < price ? 'disabled' : ''}><span class="coin"></span><span class="num">${price}</span></button>`;
    const gear = Object.entries(RULES.gear).map(([id, g]) => row(id, g.price, r.gear[id] ? `<span class="owned">${icon('check')}${t('owned')}</span>` : buyBtn('gear', id, g.price))).join('');
    const sup = Object.entries(RULES.consumables).filter(([, c]) => c && c.price).map(([id, c]) => row(id, c.price, `${r.inv[id] ? `<span class="have num">${t('have', { n: r.inv[id] })}</span>` : ''}${buyBtn('sup', id, c.price)}`)).join('');
    $('mkSheet').innerHTML = `${strip()}<div class="goodList"><div class="mkHead"><span>${icon('shoe')}${t('gearH')}</span></div>${gear}
      <div class="mkHead"><span>${icon('dust')}${t('suppliesH')}</span></div>${sup}</div><div class="mkBtns">${exits()}</div>`;
    $('mkSheet').querySelectorAll('[data-buy]').forEach((b) => { b.onclick = () => {
      const [kind, id] = b.dataset.buy.split(':');
      const ok = kind === 'gear' ? buyGear(r, id) : buyConsumable(r, id);
      if (!ok) { sfx.deny(); return; }
      writeSave(save); sfx.buy(); say(line('mSold', { n: kind === 'gear' ? RULES.gear[id].price : RULES.consumables[id].price })); renderBuy();
    }; });
    wire();
  }
  function startDeal(i) {
    const it = save.stash[i]; if (!it || isRefused(it)) { sfx.deny(); return; }
    V.deal = openDeal(it, ctx(), Math.random); V.deal.index = i;
    const old = memo().deals[it.seed]; if (old) { Object.assign(V.deal, old); asksFor(V.deal); } // carry on where you left off
    putOnCounter(it.kind);
    say(line('offer', { item: itemName(it.kind), n: V.deal.offer }));
    renderDeal();
  }
  function renderDeal() {
    const D = V.deal, it = D.item, A = D.asks;
    const dots = Array.from({ length: D.patienceMax }, (_, k) => `<u class="${k < D.patience ? 'f' : ''}"></u>`).join('');
    const ask = (a, cls, key) => `<button class="kbtn ${cls}" data-a="${a}" ${A[a] <= D.offer ? 'disabled' : ''}>${t(key, { n: A[a] })}</button>`;
    const dmg = (it.cond ?? 1) < 0.999 ? ` <span class="dmg">${icon('crack')}${Math.round(it.cond * 100)}%</span>` : '';
    $('mkSheet').innerHTML = `<div class="dealCard">${icon('i_' + it.kind)}<div><div class="inm">${itemName(it.kind)}${dmg}</div><div class="iest">${t('estCeil')}: <span class="coin"></span><span class="num">${D.est.lo}–${D.est.hi}</span></div></div>
        <div class="offer"><span class="coin"></span><span class="num">${D.offer}</span></div></div>
      <div class="patience">${t('patience')} <span class="dots">${dots}</span></div>
      <div class="choices three">
        <button class="kbtn green" data-a="accept">${t('cAccept', { n: D.offer })}</button>
        ${ask('askLo', 'blue', 'cAskLo')}${ask('askMid', 'yellow', 'cAskMid')}${ask('askHi', 'red', 'cAskHi')}
        <button class="kbtn grey" data-a="flatter" ${D.flattered ? 'disabled' : ''}>${t('cFlatter')}</button>
        <button class="kbtn grey" data-a="leave">${t('cLeave')}</button>
      </div>`;
    $('mkSheet').querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => act(b.dataset.a); });
  }
  function act(a) {
    const D = V.deal; if (!D) return;
    if (a === 'leave') { // stepping back keeps the deal as it is: he remembers his offer and his mood
      remember(D); run().rep = clampRep(run().rep + D.rep); D.rep = 0; writeSave(save);
      say(line('mKeep', { n: D.offer, item: itemName(D.item.kind) })); V.deal = null; renderStash(); return;
    }
    const r = dealAct(D, a, Math.random);
    say(line(r.say, { n: r.n ?? D.offer, item: itemName(D.item.kind) }));
    if (r.say === 'mNo' || r.say === 'mGrumble' || r.say === 'mFlatterNo' || r.say === 'mAlready') sfx.deny();
    if (D.done) {
      run().rep = clampRep(run().rep + D.rep);
      if (D.sold) {
        save.coins += D.price; run().sold += D.price;
        save.meta.itemStats ??= {}; save.meta.itemStats[D.item.kind] ??= { stolen: 0, bestPrice: 0 };
        save.meta.itemStats[D.item.kind].bestPrice = Math.max(save.meta.itemStats[D.item.kind].bestPrice, D.price);
        save.stash.splice(D.index, 1); sfx.buy(); d.player.sack.visible = save.stash.length > 0;
      }
      else if (r.say === 'mRefuse') memo().refused.push(D.item.seed);
      delete memo().deals[D.item.seed];
      writeSave(save);
      const keep = V.deal; V.deal = null; coins();
      setTimeout(() => { if (V.active && !V.deal && keep) renderStash(); }, 1300);
      $('mkSheet').querySelectorAll('button').forEach((b) => { b.disabled = true; });
      return;
    }
    remember(D); run().rep = clampRep(run().rep + D.rep); D.rep = 0; writeSave(save);
    renderDeal();
  }
  function sellAll() {
    let sum = 0; const keep = []; const c = ctx();
    for (const it of save.stash) {
      if (isRefused(it)) { keep.push(it); continue; }
      const old = memo().deals[it.seed]; if (old) delete memo().deals[it.seed];
      const p = old ? old.offer : quickPrice(it, c, Math.random); sum += p;
      save.meta.itemStats ??= {}; save.meta.itemStats[it.kind] ??= { stolen: 0, bestPrice: 0 };
      save.meta.itemStats[it.kind].bestPrice = Math.max(save.meta.itemStats[it.kind].bestPrice, p);
    }
    if (!sum) { sfx.deny(); return; }
    save.coins += sum; run().sold += sum; save.stash = keep; writeSave(save); sfx.buy();
    say(line('mSold', { n: sum })); d.floaterScreen('+' + sum); d.player.sack.visible = keep.length > 0; renderStash();
  }
  function enter(from = 'menu') {
    if (!save.hints.mortStory) { story(from === 'run' ? 'next' : 'menu'); return; }
    const r = run();
    // one visit per night: the merchant's mood and wishes only change with the next night
    if (r.visitNight !== r.night) { r.visit++; r.visitNight = r.night; r.mood = visitMood(Math.random, r.rep); memo(); writeSave(save); }
    V.active = true; V.from = from; V.tab = rentDueNow(r) || save.stash.length ? 'sell' : 'buy';
    d.setMode('market'); buildShop(); show('market'); coins();
    say(line(!save.stash.length ? 'empty' : r.rep >= 2 ? 'greetGood' : r.rep <= -2 ? 'greetBad' : 'greet')); render();
  }
  // first visit of the game: Mort explains the debt (and threatens you)
  const STORY = 5;
  function renderStory() {
    say(line('story' + V.story));
    const last = V.story >= STORY;
    $('mkSheet').innerHTML = `<div class="storyDots">${Array.from({ length: STORY }, (_, k) => `<u class="${k < V.story ? 'f' : ''}"></u>`).join('')}</div>
      <div class="mkBtns"><button class="kbtn ${last ? 'red' : 'yellow'}" id="mkStory"><span>${t(last ? 'storyOk' : 'storyNext')}</span>${last ? '' : icon('play')}</button></div>`;
    $('mkStory').onclick = () => {
      if (V.typing) { $('mkSay').textContent = V.typing.text; V.typing = null; sfx.talkStop(); return; } // first tap finishes the sentence
      sfx.click();
      if (!last) { V.story++; if (V.story === 4) { sfx.thud(); d.shake && d.shake(0.25); } renderStory(); return; }
      save.hints.mortStory = 1; writeSave(save); V.story = 0; leave(V.after || 'next');
    };
  }
  function story(after = 'next') {
    V.active = true; V.from = 'story'; V.after = after; V.story = 1;
    d.setMode('market'); buildShop(); show('market'); coins(); renderStory();
  }
  function leave(where) {
    sfx.talkStop(); V.typing = null; V.voiced = false;
    V.active = false; V.deal = null; putOnCounter(null); hide('market');
    d.onLeave(where);
  }
  return { enter, story, update, get active() { return V.active; } };
}
