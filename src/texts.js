// Player-facing texts. Numbers come from RULES so a text can never lie (see test/promises.test.mjs).
// Words come from i18n.js, so every text follows the chosen language.
import { RULES } from './rules.js';
import { shopText, tips } from './i18n.js';
const U = RULES.upgrades, pct = (x) => Math.round(x * 100);
const item = (k, ic, p) => ({ k, ic, get nm() { return shopText(k).name; }, ds: () => shopText(k, { p: p() }).desc });

export const SHOP = [
  item('socks', 'sock', () => pct(U.socks.per)),
  item('back', 'weight', () => pct(U.back.per)),
  item('feet', 'shoe', () => pct(U.feet.per)),
  item('lullaby', 'note', () => U.lullaby.per),
  item('charm', 'clover', () => pct(U.charm.per)),
  item('appraisal', 'zoom', () => pct(U.appraisal.per)),
  item('haggle', 'bolt', () => pct(U.haggle.per)),
];
// skill tree branches (order = top to bottom); parents come from RULES.upgrades.req
export const BRANCHES = [
  { id: 'thief', skills: ['socks', 'feet', 'back', 'lullaby'] },
  { id: 'trade', skills: ['appraisal', 'haggle', 'charm'] },
];
export function skillLocked(k, up) { const r = RULES.upgrades.req[k]; return r ? (up[r[0]] || 0) < r[1] : false; }
export const shopCost = (k, lv) => Math.round(U[k].base * Math.pow(U.costGrowth, lv));
export const getTips = () => tips();
