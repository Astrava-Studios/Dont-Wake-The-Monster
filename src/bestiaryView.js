// Bestiary & Museum: "Thief's Handbook" (Hırsızın El Kitabı)
// Pure view component: renders monsters lore & stolen artifacts museum
import { ALL_MONSTERS } from './level.js';
import { RULES } from './rules.js';
import { monsterText, itemName, t } from './i18n.js';
import { icon, monsterFace } from './icons.js';

export function createBestiaryView({ save, d, sfx, hide, show }) {
  const $ = (id) => document.getElementById(id);
  let activeTab = 'monsters';

  function openBestiary() {
    activeTab = 'monsters';
    hide('menu');
    show('bestiaryUI');
    render();
  }

  function closeBestiary() {
    hide('bestiaryUI');
    show('menu');
  }

  function render() {
    $('bmCoins').textContent = save.coins;
    const tabs = `
      <div class="mkTabs">
        <button class="tab ${activeTab === 'monsters' ? 'on' : ''}" data-bt="monsters">${icon('paw')}<span>${t('monstersT')}</span></button>
        <button class="tab ${activeTab === 'treasures' ? 'on' : ''}" data-bt="treasures">${icon('trophy')}<span>${t('trophiesT')}</span></button>
      </div>`;

    let body = '';
    if (activeTab === 'monsters') {
      body = ALL_MONSTERS.map((m) => {
        const stats = save.meta.monsterStats?.[m.id] || { seen: 0, escaped: 0 };
        const text = monsterText(m.id);
        const homeKey = m.wyrm ? 'houseLibrary' : m.pirate ? 'housePirate' : m.alchemist ? 'houseAlchemist' : 'houseManor';
        const homeIcon = m.wyrm ? 'i_book' : m.pirate ? 's_pirate' : m.alchemist ? 's_wizard' : 'home';
        
        // Gauge dots for stats
        const lv = (v) => (v < 0.95 ? 1 : v > 1.05 ? 3 : 2);
        const dots = (n) => `<span class="dots">${[0, 1, 2].map((k) => `<u class="${k < n ? 'f' : ''}"></u>`).join('')}</span>`;
        const gauges = [
          ['ear', m.hearing], ['zzz', m.snoreLen], ['eye', m.peekRate], ['run', m.speed]
        ].map(([i, v]) => `<span>${icon(i)} ${dots(lv(v))}</span>`).join(' ');

        return `
          <div class="goodRow monsterRow">
            <div class="bmFaceWrap">${monsterFace('sleep', m.color, m.belly)}</div>
            <div class="gt">
              <b>${text.name}</b> <small class="homeBadge">${icon(homeIcon)} ${t(homeKey)}</small>
              <div class="monsterTrait">${text.trait}</div>
              <div class="bmGauges">${gauges}</div>
            </div>
            <div class="bmStats">
              <span class="bmStatChip seen">${t('loreSeen', { n: stats.seen })}</span>
              <span class="bmStatChip esc">${t('loreEscaped', { n: stats.escaped })}</span>
            </div>
          </div>`;
      }).join('');
    } else {
      // Treasures / Museum
      const RARITY_LABELS = {
        1: { name: 'Tier 1', cls: 't1' },
        2: { name: 'Tier 2', cls: 't2' },
        3: { name: 'Tier 3', cls: 't3' },
        cursed: { name: 'Cursed', cls: 'tc' },
      };

      body = Object.entries(RULES.items).map(([kind, info]) => {
        const discovered = save.meta.collection.includes(kind);
        const stats = save.meta.itemStats?.[kind] || { stolen: discovered ? 1 : 0, bestPrice: 0 };
        const name = discovered ? itemName(kind) : t('undiscovered');
        const rarity = kind === 'crown' ? { name: 'Legendary', cls: 'tl' } : (RARITY_LABELS[info.tier] || { name: 'Rare', cls: 't2' });

        return `
          <div class="goodRow treasureRow ${discovered ? '' : 'locked'}">
            <span class="gi ${discovered ? '' : 'sil'}">${icon(discovered ? ('i_' + kind) : 'lock')}</span>
            <div class="gt">
              <b>${name}</b> <small class="rarityTag ${rarity.cls}">${rarity.name}</small>
              <small>${discovered ? `${t('collectionT')}: ${stats.stolen || 1}` : '???'}</small>
            </div>
            <div class="bmStats">
              <span class="bmStatChip price">${discovered ? (stats.bestPrice ? `<span class="coin"></span>${stats.bestPrice}` : t('bestSold', { n: info.value[1] })) : '???'}</span>
            </div>
          </div>`;
      }).join('');
    }

    $('bmSheet').innerHTML = `
      ${tabs}
      <div class="goodList bestiaryList">${body}</div>
      <div class="mkBtns">
        <button class="kbtn grey" id="bmBack">${icon('home')}<span>${t('back')}</span></button>
      </div>`;

    $('bmSheet').querySelectorAll('[data-bt]').forEach((b) => {
      b.onclick = () => {
        activeTab = b.dataset.bt;
        sfx.whoosh();
        render();
      };
    });

    $('bmBack').onclick = () => {
      sfx.click();
      closeBestiary();
    };
  }

  return { openBestiary, closeBestiary, render };
}

