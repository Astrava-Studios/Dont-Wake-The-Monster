// Every gameplay number lives here. Code reads RULES; balancing = editing numbers.
// URL overrides for quick tests: ?r.player.speed=6  ?r.noise.snoreMask=0.5
export const RULES = {
  player: {
    speed: 4.6,          // units/s at full stick
    tiptoeBelow: 0.6,    // stick magnitude below this = tiptoe
    tiptoeMin: 0.35, tiptoeFactor: 0.85,
    radius: 0.32,
    stepsBase: 1.6, stepsPerMag: 3.0, // footsteps per second = base + mag*perMag
    wardrobeAfter: 0.5, // stand still this long next to a wardrobe to slip inside
    pickupRadius: 0.75, powerRadius: 0.8, duckRadius: 0.5,
    weightSlow: 0.035, maxSlow: 0.5, // speed *= 1 - min(maxSlow, weight*weightSlow)
  },
  noise: {
    tiptoe: 0.55, runMin: 1.4, runMax: 3.8,
    rugMult: 0.3,
    squeakTiptoe: 6, squeakRun: 10,
    weightLoud: 0.05,             // per weight unit
    duck: 13, duckFeather: 3,
    chestCreak: 2.2, chestCreakEvery: 0.45, chestTime: 2.0,
    drop: 2,
    snoreMask: 0.32,              // noise multiplier while snoring
    featherMult: 0.12, featherTime: 9,
    distNear: 1.75, distFar: 0.45, distFalloff: 9, // dist factor = clamp(near - d/falloff, far, near)
  },
  calm: { still: 5.5, stillAfter: 0.7, tiptoe: 0.4, restlessMult: 0.45, lullaby: 40 },
  snore: { cycle: 5.2, len: 1.9 },
  peek: { dawnBoost: 1, gate: 45, lateGate: 25, lateNight: 5, warn: 0.8, open: 1.5, seenRate: 42, nextMin: 3.5, nextRand: 4, first: 6 },
  quirks: {
    tossMin: 9, tossRand: 7,             // rolls and turns in bed every 9-16s
    nightmareMin: 16, nightmareRand: 12,  // nightmare shiver and groan
    sleepwalkNight: 2, sleepwalkMin: 22, sleepwalkRand: 14, sleepwalkSpeed: 1.35, sleepwalkDur: 5.5,
  },
  relics: {
    feather_step:   { id: 'feather_step', icon: 'feather', stepNoise: 0.6, capacity: -1 },
    greedy_fingers: { id: 'greedy_fingers', icon: 'paw', takeSpeed: 1.35, rummageNoise: 1.5 },
    golden_compass: { id: 'golden_compass', icon: 'gem', valueMult: 1.25, dawnDelta: -12 },
    owl_eye:        { id: 'owl_eye', icon: 'eye', warnExtra: 1.2, speed: 0.94 },
    snore_whistle:  { id: 'snore_whistle', icon: 'bed', snoreMask: 0.15, wakeSpike: 8 },
  },
  // tuned with scripts/balance.mjs (40 seeds): greedy bot escapes ~85% night 1 -> ~75% night 8, cautious ~98% -> ~83%
  chase: { speedBase: 4.3, speedPerNight: 0.15, timeBase: 8, timePerNight: 0.35, catchRadius: 1.8, wakeDelay: 0.5,
    returnSpeed: 0.5, sleepWake: 55, pounceRange: 3, pounceMult: 1.6, pounceTime: 0.5, pounceCooldown: 2.5, stunTime: 3.2, nightCap: 10,
    monsterRadius: 0.8, repath: 0.3,
    returnRewake: 25, rewakeTime: 0.6 }, // heard noise while it walks back to bed: 25 turns it around, chasing 60 % of a normal chase
  night: { dawnBase: 85, dawnPerNight: 4, wakePerNight: 0.13, wakeNightCap: 12, hoardSense: 0.8 }, // hoardSense: extra hearing when the whole hoard is gone
  level: {
    roomW: { base: 8, perNight: 0.6, max: 12 }, roomD: { base: 6, perNight: 0.45, max: 9 }, // half-sizes before rounding
    itemBase: 2, itemPerNight: 0.5, itemMax: 6, hoardExtra: 2, // few items: every one is work
    squeakBase: 6, squeakPerNight: 1.5, squeakyMult: 2.5,
    toysExtra: 7, midBase: 4, midPerNight: 0.6, midMax: 10,
    chestFromNight: 2, twoChestsFromNight: 6,
    valuePerNight: 0.08, // item values grow +8% per night so late nights pay for their risk
    cursedFromNight: 3, cursedChance: 0.4, // at most one cursed item per night
  },
  // stealable items: the real value is rolled inside [min, max] and stays hidden (appraisal estimates it)
  // take = seconds of holding "Take" next to it; noise = sound when it comes loose; tier: 1 common .. 3 rare
  // fragile: cracks while running / when dropped. curse: makes noise while carried (every s, noise), hear = monster hears better
  items: {
    book: { value: [30, 70], weight: 1, take: 0.9, noise: 2, tier: 1 },
    candle: { value: [40, 90], weight: 2, take: 1.0, noise: 3, tier: 1 },
    bottle: { value: [15, 130], weight: 1, take: 0.7, noise: 3, tier: 1, fragile: true },
    vase: { value: [60, 170], weight: 3, take: 1.5, noise: 4, tier: 2, fragile: true },
    painting: { value: [50, 240], weight: 2, take: 1.8, noise: 3, tier: 2, fragile: true },
    watch: { value: [90, 190], weight: 1, take: 1.3, noise: 2, tier: 2, fragile: true },
    gem: { value: [130, 270], weight: 1, take: 2.0, noise: 4, tier: 3 },
    chest: { value: [160, 340], weight: 2, take: 2.8, noise: 5, tier: 3 }, // jewellery box (KayKit gold chest)
    crown: { value: [320, 520], weight: 3, take: 2.4, noise: 6, tier: 3 },
    // cursed / noisy: very valuable, but a burden to carry
    ticker: { value: [260, 420], weight: 2, take: 1.6, noise: 4, tier: 'cursed', curse: { every: 6, noise: 3 } },
    orb: { value: [300, 480], weight: 1, take: 1.8, noise: 3, tier: 'cursed', curse: { every: 4, noise: 1.6, hear: 1.15 } },
    statue: { value: [280, 440], weight: 5, take: 2.2, noise: 6, tier: 'cursed' },
  },
  damage: { runCrack: 0.02, crackLoss: 0.15, dropLoss: 0.3, minCond: 0.4 },
  bag: { capacity: 6 }, // total weight you can carry; Big Bag adds more
  take: { radius: 1.05, tickEvery: 0.45, tickNoise: 2.6, decay: 0.6, dropped: 0.5 },
  mods: { golden: 1.5, short: 1.3, shortDawn: 0.7 },
  // black market (see market.js). spread = estimate range +-% (Appraisal narrows it)
  // tuned with test/market.test.mjs: ceiling = value × cond × (payBase + payPerHaggle·Haggle) × demand × mood
  market: { payBase: 0.6, payPerHaggle: 0.06, openMin: 0.55, openMax: 0.7, patience: 2, patiencePerHaggle: 0.5,
    acceptUnder: 0.9, overBase: 0.15, overPenalty: 3, overCap: 0.5, missOfferCut: 0.1, askAt: [0.1, 0.4, 0.75],
    flatterBase: 0.35, flatterPerHaggle: 0.08, flatterMood: 0.05, moodMin: 0.92, moodMax: 1.08, moodPerRep: 0.025, repMin: -3, repMax: 3,
    wantMult: 1.3, dislikeMult: 0.8, spreadBase: 0.55, spreadPerLevel: 0.1, spreadMin: 0.06 },
  // sold by the merchant. gear lasts the whole run; consumables are used up (max 3 carried into a night)
  gear: {
    slippers: { price: 250, stepNoise: 0.85 }, cloak: { price: 300, rummageNoise: 0.75 }, bigbag: { price: 350, capacity: 3 },
  },
  consumables: {
    slots: 3,
    sleepdust: { price: 60, time: 10 }, feather: { price: 35, time: 9 }, lullaby: { price: 45 },
    lockpick: { price: 40, takeMult: 0.5 }, smoke: { price: 70, stun: 3 },
  },
  // rent to the guild, paid through the merchant every `every` nights; not paying = the run ends
  // tuned with scripts/economy.mjs: the bot's median run survives 25 nights (5 rents), p10 15, p90 45+
  rent: { every: 5, amounts: [600, 1500, 3500, 6500, 10000], growth: 1.35 },
  // costumes (kept after a game over): 8 sets × hat / outfit / bag. Wearing all 3 pieces of one set gives its small bonus.
  costumes: {
    slots: ['hat', 'outfit', 'bag'],
    sets: {
      ninja: { prices: [450, 700, 400], bonus: { stepNoise: 0.95 } },     // steps 5 % quieter
      pirate: { prices: [500, 750, 450], bonus: { pay: 1.05 } },         // merchant pays 5 % more
      cat: { prices: [400, 650, 400], bonus: { take: 0.92 } },           // takes items 8 % faster
      wizard: { prices: [550, 800, 450], bonus: { kitTime: 1.2 } },      // sleep dust + feather last 20 % longer
      xmas: { prices: [500, 750, 500], bonus: { capacity: 1 } },         // bag +1
      halloween: { prices: [450, 700, 450], bonus: { peekGap: 1.12 } },  // monster peeks 12 % less often
      angel: { prices: [600, 900, 500], bonus: { calm: 1.12 } },         // wake meter falls 12 % faster
      sheriff: { prices: [500, 750, 450], bonus: { speed: 1.05 } },      // 5 % faster
    },
  },
  // lantern looks: only the colour of the light changes
  lanterns: {
    classic: { price: 0, color: '#ffc978' }, ghost: { price: 400, color: '#86ffc0' }, moon: { price: 500, color: '#a8ccff' },
    candy: { price: 600, color: '#ff9fe2' }, ember: { price: 800, color: '#ff8a4a' }, royal: { price: 1200, color: '#ffe680' },
  },
  // houses: the Old Library is unlocked once with coins (kept forever). Bigger, long shelf aisles, completely dark
  // sections (only your lantern shows them; the monster cannot see you there), better loot, the Bookwyrm.
  houses: {
    manor: { price: 0 },
    library: { price: 3000, valueMult: 1.5, dawnExtra: 12, wExtra: 2, dExtra: 1, darkZones: [1, 2, 3], darkValue: 1.35, squeakMult: 1.2, wyrmChance: 0.55 },
    pirate: { price: 5000, valueMult: 1.75, dawnExtra: 6, wExtra: 3, dExtra: 0, squeakMult: 1.4, swayFloor: true, pirateChance: 0.6 },
    alchemist: { price: 8500, valueMult: 2.0, dawnExtra: 18, wExtra: 2, dExtra: 2, darkZones: [2, 3, 4], darkValue: 1.5, magicGlow: true, alchChance: 0.65 },
  },
  // lantern upgrades (part of the run, like the hideout): range = how far you see in the dark, brightness = light strength
  lanternUp: {
    range: { prices: [500, 1200, 2500], darkR: [2.4, 3.0, 3.6, 4.2], dist: [8, 9.5, 11, 12.5] },
    bright: { prices: [400, 1000, 2200], mult: [1, 1.2, 1.4, 1.6] },
  },
  // the hideout: upgrades belong to the run (the guild takes them at a game over); decor is kept forever
  hideout: {
    stash: { base: 8, per: 4, prices: [400, 900, 1800] },
    repair: { price: 600, costPer: 0.45 }, // repairing costs 45 % of the value that was lost
    decor: { rug: 150, plant: 200, lamp: 300, poster: 250, fishbowl: 500, armchair: 650, globe: 800, throne: 1500 },
  },
  // stars on escape pay reputation coins: per night number
  score: { stealthBonus: 15, sweepBonus: 30, nearSweepAt: 1, boldBonus: 10 }, // boldBonus: escaped after screaming (× night)
  // scream: wake the monster on purpose. It runs to where the scream came from, looks around, then walks back to bed.
  // Only while its bed is empty can the crown lying on it be taken. see = how far it spots you while searching (never in
  // the dark, in a wardrobe or behind tall furniture), seeTravel = same on the way there; hear = noise that makes it come
  // at you while it hunts; lureMax = seconds it may run before searching anyway; react = extra pause when it spots you;
  // hearDecay = heard noise fading per second (quiet rummaging far away stays under 'hear', running does not)
  scream: { perNight: 1, react: 0.5, search: 4.5, see: 5.5, seeTravel: 3, hear: 18, hearDecay: 6, lureMax: 9 },
  upgrades: {
    max: 5, costGrowth: 1.7,
    socks: { base: 120, per: 0.12 },   // noise -12% per level
    back: { base: 100, per: 0.15 },    // weight penalty -15% per level
    feet: { base: 150, per: 0.06 },    // speed +6% per level
    lullaby: { base: 220, per: 1 },    // +1 lullaby at night start
    charm: { base: 180, per: 0.10 },   // item value +10% per level (better loot)
    appraisal: { base: 90, per: 0.10 },  // estimate range -10% per level
    haggle: { base: 120, per: 0.06 },    // merchant ceiling +6% of value per level, +1 patience per 2 levels
    // skill tree: a skill unlocks when its parent reaches the level given
    req: { feet: ['socks', 1], back: ['feet', 1], lullaby: ['back', 2], haggle: ['appraisal', 1], charm: ['haggle', 2] },
  },
};

// apply ?r.a.b=value overrides
export function applyOverrides(search) {
  const p = new URLSearchParams(search);
  for (const [k, v] of p) {
    if (!k.startsWith('r.')) continue;
    const path = k.slice(2).split('.'); let o = RULES;
    for (let i = 0; i < path.length - 1; i++) { o = o[path[i]]; if (!o) break; }
    const last = path[path.length - 1];
    if (o && last in o && typeof o[last] === 'number' && !isNaN(+v)) o[last] = +v;
  }
}
