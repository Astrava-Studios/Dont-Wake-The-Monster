// How often does a chase end in a catch? The bot wakes the monster at a spot deep in the room
// (bag loaded) and runs for the door the way a player would.
//   node scripts/catchrate.mjs [seeds=60] [r.chase.speedBase=4.0 ...]
import { createSim, step, wakeUp } from '../src/sim.js';
import { createBot } from '../src/bot.js';
import { applyOverrides } from '../src/rules.js';
const args = process.argv.slice(2), ov = args.filter((a) => a.startsWith('r.')); applyOverrides('?' + ov.join('&'));
if (ov.length) console.log('overrides:', ov.join(' '));
const seeds = +(args.find((a) => !a.startsWith('r.')) || 60);
const rows = [];
for (const night of [1, 2, 3, 5, 8]) {
  const res = { near: [0, 0], mid: [0, 0], far: [0, 0] };
  for (let s = 1; s <= seeds; s++) {
    const S = createSim({ night, seed: s * 7919 + night }); const L = S.L;
    // a reachable treasure spot = where a player would be when it wakes
    const t = S.treasures.filter((x) => !x.onBed)[s % Math.max(1, S.treasures.length - 1)]; if (!t) continue;
    S.player.x = t.x; S.player.z = t.z;
    S.bag = [{ kind: 'vase', value: 100, weight: 3 }]; S.weight = 3; S.leftExit = true;
    const dExit = Math.hypot(t.x - L.exit.x, t.z - L.exit.z), dMon = Math.hypot(t.x - L.nest.x, t.z - L.nest.z);
    wakeUp(S, 'noise'); const think = createBot();
    for (let i = 0; i < 30 * 40 && !S.done && ['wakeup', 'chase'].includes(S.state); i++) step(S, 1 / 30, think(S, 1 / 30));
    const b = dMon < 5 ? 'near' : dMon < 9 ? 'mid' : 'far';
    res[b][0]++; if (S.state === 'caught') res[b][1]++;
  }
  const pct = ([n, c]) => n ? `${Math.round(c / n * 100)}% (${n})` : '-';
  rows.push({ night, 'monster <5m': pct(res.near), '5-9m': pct(res.mid), '>9m': pct(res.far) });
}
console.log('caught % when it wakes, by distance from the monster (sample size)'); console.table(rows);
