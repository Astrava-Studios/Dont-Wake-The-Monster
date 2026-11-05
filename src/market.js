// Black market: an information game with the old merchant. Pure (no DOM) — tested in node.
//
// The merchant pays at most his CEILING = value × condition × payRatio(Haggle) × demand × mood.
// The player never sees the ceiling: Appraisal shows an estimate range of it (narrower with each level).
// Asking at the low / middle / high end of that range: under the ceiling he agrees, over it he rarely does —
// and each miss costs patience and the relationship. Knowing the price (Appraisal) is what makes asking safe.
import { RULES } from './rules.js';
import { mulberry } from './level.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r5 = (v) => Math.max(5, Math.round(v / 5) * 5);
const M = () => RULES.market;

// ---- context of one visit: { haggle, appraisal, mood, demand:{want, dislike}, rep }
export const payRatio = (haggle = 0) => M().payBase + M().payPerHaggle * haggle;
export function demandMult(kind, demand) {
  if (!demand) return 1;
  return kind === demand.want ? M().wantMult : kind === demand.dislike ? M().dislikeMult : 1;
}
// what he would pay on an average day (no mood): the thing Appraisal estimates
export const ceilingBase = (item, ctx = {}) => item.value * (item.cond ?? 1) * payRatio(ctx.haggle) * demandMult(item.kind, ctx.demand) * (ctx.pay || 1);
export const merchantMax = (item, ctx = {}) => ceilingBase(item, ctx) * (ctx.mood ?? 1);

// mood of a visit: random ± a bit, better with a good relationship
export const visitMood = (rng = Math.random, rep = 0) => M().moodMin + rng() * (M().moodMax - M().moodMin) + rep * M().moodPerRep;
// what he wants / doesn't want today: deterministic from the visit number
export function visitDemand(visit) {
  const kinds = Object.keys(RULES.items); const r = mulberry((visit * 7919 + 13) >>> 0);
  const want = kinds[Math.floor(r() * kinds.length)]; let dislike = kinds[Math.floor(r() * kinds.length)];
  if (dislike === want) dislike = kinds[(kinds.indexOf(want) + 3) % kinds.length];
  return { want, dislike };
}
export const clampRep = (rep) => clamp(rep, M().repMin, M().repMax);

// stable per-item estimate of his ceiling; `tighten` = extra appraisal levels (a successful flattery)
export function estimate(item, ctx = {}, tighten = 0, maxNow) {
  // Appraisal reads what he would pay TODAY (his mood included); his real ceiling can sit anywhere in the range,
  // so the low ask is nearly safe, the middle a fair bet and the high one a gamble — and all of them close in with skill
  const spread = Math.max(M().spreadMin, M().spreadBase - M().spreadPerLevel * ((ctx.appraisal || 0) + tighten));
  const max = maxNow ?? merchantMax(item, ctx);
  const r = mulberry(((item.seed || 1) ^ 0x5a17) >>> 0);
  const centre = max * (1 + (r() * 2 - 1) * spread);
  let lo = r5(centre * (1 - spread)), hi = r5(centre * (1 + spread));
  lo = Math.min(lo, Math.floor(max / 5) * 5); hi = Math.max(hi, Math.ceil(max / 5) * 5); // his real ceiling is always inside
  return { lo, hi, mid: r5((lo + hi) / 2), spread };
}

export function asksFor(deal) {
  const e = estimate(deal.item, deal.ctx, deal.tight, deal.max);
  deal.est = e;
  // three asks spread inside the estimate: his ceiling usually sits mid-range, so "middle" is the
  // knowledgeable ask and "high" a real gamble (tested in market.test.mjs)
  // never below what he already offers: the asks live between his offer and the top of the estimate
  const base = Math.max(e.lo, deal.offer), A = RULES.market.askAt;
  const at = (f) => Math.max(deal.offer + 5, r5(base + (Math.max(e.hi, base + 15) - base) * f));
  deal.asks = { askLo: at(A[0]), askMid: at(A[1]), askHi: at(A[2]) };
}

export function openDeal(item, ctx = {}, rng = Math.random) {
  const h = ctx.haggle || 0, max = merchantMax(item, ctx);
  const patience = M().patience + Math.floor(h * M().patiencePerHaggle);
  const deal = { item, ctx, h, max, offer: r5(max * (M().openMin + rng() * (M().openMax - M().openMin))),
    patience, patienceMax: patience, flattered: false, tight: 0, misses: 0, done: false, sold: false, price: 0, rounds: 0, rep: 0 };
  asksFor(deal);
  return deal;
}

// act: 'accept' | 'askLo' | 'askMid' | 'askHi' | 'flatter' | 'leave'. Returns the merchant's reply (+ price) for the dialog.
// deal.rep collects the relationship change of this deal (+1 sold, −1 per miss / refusal).
export function dealAct(deal, act, rng = Math.random) {
  if (deal.done) return { say: 'mBye' };
  deal.rounds++;
  if (act === 'accept') { deal.done = deal.sold = true; deal.price = deal.offer; deal.rep += 1; return { say: 'mSold', n: deal.price }; }
  if (act === 'leave') { deal.done = true; return { say: 'mKeep' }; }
  if (act === 'flatter') {
    if (deal.flattered) { deal.patience--; return endIfOut(deal, { say: 'mAlready' }); }
    deal.flattered = true;
    if (rng() < M().flatterBase + M().flatterPerHaggle * deal.h) {
      deal.max *= 1 + M().flatterMood; deal.tight = 1; asksFor(deal); // "let me look again": a narrower estimate
      return { say: 'mFlatterOk' };
    }
    deal.patience--; return endIfOut(deal, { say: 'mFlatterNo' });
  }
  const ask = deal.asks[act];
  if (!ask || ask <= deal.offer) return { say: 'mGrumble', n: deal.offer }; // asking for less than he offers
  if (ask <= deal.max) {
    if (rng() < M().acceptUnder) { deal.offer = ask; return { say: 'mAgree', n: ask }; }
    deal.patience--; return endIfOut(deal, { say: 'mGrumble', n: deal.offer });
  }
  const over = ask / deal.max - 1;
  if (rng() < clamp(M().overBase - over * M().overPenalty, 0, M().overCap)) { deal.offer = Math.max(deal.offer, r5(deal.max)); return { say: 'mFinal', n: deal.offer }; }
  // insulted: he lowers his offer, loses patience and remembers it
  deal.misses++; deal.offer = r5(deal.offer * (1 - M().missOfferCut)); deal.patience--; deal.rep -= 1; return endIfOut(deal, { say: 'mNo', n: deal.offer });
}
function endIfOut(deal, reply) {
  if (deal.patience <= 0) { deal.done = true; deal.rep -= 1; return { say: 'mRefuse' }; }
  return reply;
}

// sell without haggling: his opening offer
export const quickPrice = (item, ctx, rng) => openDeal(item, ctx, rng).offer;
