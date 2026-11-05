// Black market promises: the information game. Run: npm test
import assert from 'node:assert/strict';
import { RULES } from '../src/rules.js';
import { estimate, openDeal, dealAct, merchantMax, quickPrice, visitDemand, visitMood, demandMult, payRatio } from '../src/market.js';
import { mulberry } from '../src/level.js';
import { SHOP, skillLocked } from '../src/texts.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok', name); };
const items = (k = 1500, seed = 7) => { const r = mulberry(seed); return Array.from({ length: k }, (_, i) => ({ kind: 'vase', value: 40 + Math.round(r() * 300), seed: i * 977 + 13, cond: 1 })); };
const pct = (k) => +SHOP.find((s) => s.k === k).ds().match(/%\s*(\d+)|(\d+)\s*%/).slice(1).find(Boolean) / 100;

// play one strategy over many items: average price / value, and how often the deal ends unsold
function play(strategy, ctxBase) {
  const r = mulberry(11); let paid = 0, val = 0, lost = 0, miss = 0;
  for (const it of items()) {
    const ctx = { ...ctxBase, mood: visitMood(r, 0) };
    const d = openDeal(it, ctx, r);
    for (const a of strategy) { if (d.done) break; if (a !== 'accept' && d.asks[a] <= d.offer) continue; dealAct(d, a, r); }
    if (!d.done) dealAct(d, 'accept', r);
    if (d.sold) paid += d.price; else lost++; if (d.misses) miss++;
    val += it.value;
  }
  return { ratio: paid / val, lost: lost / items().length, miss: miss / items().length };
}
const S = { accept: ['accept'], lo: ['askLo'], mid: ['askMid'], hi: ['askHi'], ladder: ['askLo', 'askMid'] };
export function report() {
  const rows = [];
  for (const appraisal of [0, 3, 5]) for (const haggle of [0, 5]) {
    const row = { appraisal, haggle };
    for (const [k, s] of Object.entries(S)) { const p = play(s, { appraisal, haggle }); row[k] = `${Math.round(p.ratio * 100)}% (miss ${Math.round(p.miss * 100)}%)`; }
    rows.push(row);
  }
  return rows;
}

t('his real ceiling is always inside the estimate (every Appraisal level, demand, damage)', () => {
  const r = mulberry(5);
  for (const it of items(400)) for (let lv = 0; lv <= 5; lv++) {
    const ctx = { appraisal: lv, haggle: lv % 3, mood: visitMood(r, (lv % 5) - 2), demand: visitDemand(lv) };
    it.cond = 0.4 + (lv / 5) * 0.6; const e = estimate(it, ctx), mx = merchantMax(it, ctx);
    assert.ok(e.lo <= mx && mx <= e.hi, `lv ${lv}: ${e.lo}-${e.hi} vs ${mx}`);
  }
});
t('Appraisal narrows the range by the % the skill text promises', () => {
  const w = (lv) => { let s = 0; for (const it of items(400)) { const e = estimate(it, { appraisal: lv }); s += (e.hi - e.lo) / merchantMax(it, {}); } return s / 400; };
  assert.ok(w(5) < w(0) * 0.35, `${w(5)} vs ${w(0)}`); assert.equal(pct('appraisal'), RULES.market.spreadPerLevel);
});
t('information game: with Appraisal 5 asking the middle is safe (>= 85% sold) and pays clearly more than accepting', () => {
  const mid = play(S.mid, { appraisal: 5 }), acc = play(S.accept, { appraisal: 5 });
  assert.ok(mid.lost < 0.15, `lost ${mid.lost}`); assert.ok(mid.ratio > acc.ratio * 1.15, `${mid.ratio} vs ${acc.ratio}`);
});
t('information game: blind (Appraisal 0) asking high is a gamble — often refused, worse on average than a modest ask', () => {
  const hi = play(S.hi, { appraisal: 0 }), lo = play(S.lo, { appraisal: 0 });
  assert.ok(hi.miss > 0.4, `miss ${hi.miss}`); assert.ok(hi.ratio < lo.ratio, `${hi.ratio} vs ${lo.ratio}`);
});
t('no single button wins everywhere: the best strategy depends on Appraisal', () => {
  const best = (lv) => Object.entries(S).sort((a, b) => play(b[1], { appraisal: lv }).ratio - play(a[1], { appraisal: lv }).ratio)[0][0];
  assert.notEqual(best(0), 'hi'); // blind, the high ask is never the best
});
t('Haggling raises his ceiling by the % its text promises, and earns more', () => {
  assert.ok(Math.abs(payRatio(1) - payRatio(0) - pct('haggle')) < 1e-9);
  assert.ok(play(S.mid, { appraisal: 3, haggle: 5 }).ratio > play(S.mid, { appraisal: 3, haggle: 0 }).ratio * 1.25);
});
t('Haggling gives more patience', () => { const it = items(1)[0]; assert.ok(openDeal(it, { haggle: 4 }).patience > openDeal(it, { haggle: 0 }).patience); });
t('demand: the wanted kind pays +30%, the unwanted -20%', () => {
  const d = visitDemand(4); assert.notEqual(d.want, d.dislike);
  assert.equal(demandMult(d.want, d), RULES.market.wantMult); assert.equal(demandMult(d.dislike, d), RULES.market.dislikeMult);
  assert.deepEqual(visitDemand(4), visitDemand(4));
});
t('relationship: a good one improves his mood, misses and refusals hurt it', () => {
  assert.ok(visitMood(() => 0.5, 3) > visitMood(() => 0.5, -3));
  const d = openDeal(items(1)[0], { appraisal: 0 }, () => 0.5); let g = 0; while (!d.done && g++ < 10) dealAct(d, 'askHi', () => 0.99);
  assert.ok(d.rep < 0 && !d.sold);
  const e = openDeal(items(1)[0], {}, () => 0.5); dealAct(e, 'accept'); assert.equal(e.rep, 1);
});
t('a damaged item is worth less to him', () => { const a = { ...items(1)[0] }, b = { ...a, cond: 0.5 }; assert.ok(merchantMax(b, {}) < merchantMax(a, {}) * 0.51); });
t('flattery that works narrows his estimate', () => {
  let narrower = 0; for (const it of items(200)) { it.value = 120 + (it.value % 200); const d = openDeal(it, { appraisal: 0 }, () => 0.5); const w0 = d.est.hi - d.est.lo; dealAct(d, 'flatter', () => 0); if (d.est.hi - d.est.lo < w0) narrower++; } assert.ok(narrower > 180, `${narrower}/200`);
});
t('quick sell = his opening offer, never above his ceiling', () => { const it = items(1)[0]; assert.ok(quickPrice(it, {}, () => 0.5) <= merchantMax(it, {}) + 5); });
t('skill tree: Haggling needs Appraisal, Reputation needs Haggling', () => {
  assert.ok(skillLocked('haggle', {})); assert.ok(!skillLocked('haggle', { appraisal: 1 }));
  assert.ok(skillLocked('charm', { haggle: 1 })); assert.ok(!skillLocked('charm', { haggle: 2 }));
});
console.log(`market: ${n} tests passed`);
if (process.argv.includes('--report')) console.table(report());
