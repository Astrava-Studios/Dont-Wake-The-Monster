// Bot balance report: escape rate, haul and wake-ups per night over many seeds.
//   node scripts/balance.mjs [seeds=40] [nights=1,2,3,5,8]
import { playNight } from '../src/bot.js';
import { nightResult } from '../src/sim.js';
import { applyOverrides } from '../src/rules.js';
// extra args like r.chase.speedBase=4.4 override rules for this run
const ov = process.argv.slice(2).filter((a) => a.startsWith('r.'));
applyOverrides('?' + ov.join('&')); if (ov.length) console.log('overrides:', ov.join(' '));
process.argv = process.argv.filter((a) => !a.startsWith('r.'));

const seeds = +(process.argv[2] || 40);
const nights = (process.argv[3] || '1,2,3,5,8').split(',').map(Number);
const greed = +(process.argv[4] || 9); // bag weight at which the bot heads home
console.log(`bot greed=${greed}, ${seeds} seeds/night`);
const rows = [];
for (const night of nights) {
  let esc = 0, woke = 0, haul = 0, score = 0, loss = { noise: 0, dawn: 0 }, tsum = 0;
  for (let s = 1; s <= seeds; s++) {
    const S = playNight({ night, seed: s * 7919 + night }, { greed });
    if (S.state === "escaped") { esc++; haul += S.value; score += S.collected; }
    else loss[S.dawn ? 'dawn' : 'noise']++;
    if (S.woke) woke++; tsum += S.t;
  }
  rows.push({ night, escape: (esc / seeds * 100).toFixed(0) + '%', woke: (woke / seeds * 100).toFixed(0) + '%',
    avgHaul: esc ? Math.round(haul / esc) : 0, items: esc ? (score / esc).toFixed(1) : 0, caughtNoise: loss.noise, caughtDawn: loss.dawn, avgTime: (tsum / seeds).toFixed(0) + 's' });
}
console.table(rows);
