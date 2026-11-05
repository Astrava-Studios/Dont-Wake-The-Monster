// Old Library vs manor: the bot plays 40 seeds per night in each house.
//   node scripts/library.mjs
import { playNight } from '../src/bot.js';
import { nightResult } from '../src/sim.js';
const rows = [];
for (const night of [1, 3, 5, 8]) for (const house of ['manor', 'library']) {
  let esc = 0, val = 0, woke = 0, t = 0; const N = 40;
  for (let s = 1; s <= N; s++) {
    const S = playNight({ night, seed: s * 977 + night, house }, { greed: 9 }); const r = nightResult(S);
    if (r.ok) { esc++; val += r.items.reduce((a, b) => a + b.value, 0); } if (S.woke) woke++; t += S.t;
  }
  rows.push({ night, house, escape: Math.round(esc / N * 100) + '%', woke: Math.round(woke / N * 100) + '%', avgHaul: Math.round(val / Math.max(1, esc)), avgTime: Math.round(t / N) + 's' });
}
console.table(rows);
