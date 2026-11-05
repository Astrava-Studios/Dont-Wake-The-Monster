// Run-economy report: a bot plays whole roguelite runs (nights → black market → skills → rent) until the rent ends them.
//   node scripts/economy.mjs [runs=40] [maxNights=40]  (+ r.rent.every=6 … overrides)
import { playNight } from '../src/bot.js';
import { nightResult } from '../src/sim.js';
import { openDeal, dealAct, visitMood, visitDemand, clampRep } from '../src/market.js';
import { newRun, rentDueNow, rentAmount, payRent } from '../src/run.js';
import { RULES, applyOverrides } from '../src/rules.js';
import { shopCost, skillLocked } from '../src/texts.js';
import { mulberry } from '../src/level.js';

const ov = process.argv.slice(2).filter((a) => a.startsWith('r.')); applyOverrides('?' + ov.join('&'));
// --rent=1000,2800,6000 tries another rent curve
const rentArg = process.argv.find((a) => a.startsWith('--rent=')); if (rentArg) RULES.rent.amounts = rentArg.slice(7).split(',').map(Number);
const args = process.argv.slice(2).filter((a) => !a.startsWith('r.') && !a.startsWith('--'));
const RUNS = +(args[0] || 40), MAXN = +(args[1] || 40);
const BUY_ORDER = ['appraisal', 'socks', 'haggle', 'feet', 'appraisal', 'haggle', 'back', 'appraisal', 'haggle', 'charm'];

function sellAll(run, r) {
  run.visit++; const mood = visitMood(r, run.rep), demand = visitDemand(run.visit);
  const ctx = { haggle: run.upgrades.haggle || 0, appraisal: run.upgrades.appraisal || 0, mood, demand };
  for (const it of run.stash.splice(0)) {
    const d = openDeal(it, ctx, r);
    for (const a of ['askLo', 'askMid']) { if (d.done) break; if (d.asks[a] > d.offer) dealAct(d, a, r); }
    if (!d.done) dealAct(d, 'accept', r);
    run.rep = clampRep(run.rep + d.rep);
    if (d.sold) { run.coins += d.price; run.sold += d.price; } else run.stash.push(it);
  }
}
function shop(run) { // keep enough for the next rent, spend the rest on skills
  const reserve = rentAmount(run.rentIdx);
  for (const k of BUY_ORDER) {
    const lv = run.upgrades[k] || 0; if (lv >= RULES.upgrades.max || skillLocked(k, run.upgrades)) continue;
    const c = shopCost(k, lv); if (run.coins - c >= reserve) { run.coins -= c; run.upgrades[k] = lv + 1; }
  }
}
const rows = [], ends = [], period = [];
for (let i = 0; i < RUNS; i++) {
  const r = mulberry(1000 + i); const run = newRun(); let ended = MAXN;
  while (run.night <= MAXN) {
    if (rentDueNow(run)) { sellAll(run, r); if (!payRent(run)) { ended = run.night - 1; break; } }
    const S = playNight({ night: run.night, seed: i * 7919 + run.night, upgrades: run.upgrades, gear: run.gear }, { greed: 6 });
    const res = nightResult(S);
    if (res.ok) { run.stash.push(...res.items); run.coins += res.bonus; run.stolen += res.items.length; }
    const before = run.sold; sellAll(run, r); const pk = Math.floor((run.night - 1) / RULES.rent.every); period[pk] = (period[pk] || 0) + (run.sold - before) / RUNS; shop(run); run.night++;
  }
  ends.push(ended); rows.push({ run: i, nights: ended, rentsPaid: run.rentIdx, sold: run.sold, skills: Object.values(run.upgrades).reduce((a, b) => a + b, 0) });
}
ends.sort((a, b) => a - b);
const q = (p) => ends[Math.floor(p * (ends.length - 1))];
console.log(`runs=${RUNS}  rent every ${RULES.rent.every} nights: ${RULES.rent.amounts.join(', ')} ...`);
console.log(`nights survived  p10=${q(0.1)}  median=${q(0.5)}  p90=${q(0.9)}  (max ${MAXN})`);
const hist = {}; for (const r of rows) hist[r.rentsPaid] = (hist[r.rentsPaid] || 0) + 1;
console.log('rents paid → runs:', hist);
const avg = (k) => Math.round(rows.reduce((a, r) => a + r[k], 0) / rows.length);
console.log('avg income per rent period:', period.map((v, k) => `#${k + 1}: ${Math.round(v)}`).join('  '));
console.log(`avg sold per run ${avg('sold')}  avg skill levels ${avg('skills')}`);
