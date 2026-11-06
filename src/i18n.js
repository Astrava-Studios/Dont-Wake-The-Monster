// Translations: English, 中文, Türkçe, Русский. Pure module (works in node for tests).
// t('key', {n: 5}) fills {n}. Static HTML uses data-i18n / data-i18n-html / data-i18n-aria / data-i18n-title.
import { MARKET_UI, MARKET_DATA } from './i18n-market.js';
import { HIDE_UI, HIDE_DATA } from './i18n-hideout.js';
export const LANGS = [
  { id: 'en', name: 'English' },
  { id: 'zh', name: '中文' },
  { id: 'tr', name: 'Türkçe' },
  { id: 'ru', name: 'Русский' },
];

const D = {
  en: {
    mSkills: 'Skills', mHideout: 'Hideout', mMarket: 'Market', mWardrobe: 'Wardrobe', mBook: 'Handbook',
    play: 'Play', loading: 'Loading… {p}%', ok: 'OK', back: 'Back', start: 'Start', resume: 'Resume',
    shop: 'Shop', help: 'How to play', settings: 'Settings', pause: 'Pause', quit: 'Give up', paused: 'Paused',
    lullaby: 'Lullaby', drop: 'Drop', dawnLeft: 'Time until dawn', bestNight: 'Best night',
    howTitle: 'How to play', how1: 'Small push: quiet<br>Full push: run', how2: 'Hurry while<br>it snores',
    how3: 'Freeze or hide<br>when it looks', how4: 'Bring the loot<br>to the door',
    setTitle: 'Settings', setMusic: 'Music', setSfx: 'Effects', setZoom: 'Camera', setVibrate: 'Vibration', setHq: 'Light effects', setLang: 'Language',
    setQuality: 'Graphics', qualityAuto: 'Auto', qualityLow: 'Low', qualityMed: 'Medium', qualityHigh: 'High',
    zoomNear: 'Near', zoomMid: 'Medium', zoomFar: 'Far',
    // in-game
    stop: 'STOP!', seen: 'SEEN!', go: 'GO!', run: 'RUN!',
    wake: 'IT WOKE UP! RUN!', dawnWake: 'DAWN! RUN!', caughtBanner: 'CAUGHT!', escapedBanner: 'ESCAPED!', emptyHint: 'Grab some loot first!',
    sleepwalkBanner: 'SLEEPWALKING! STAY CLEAR!', nightmare: 'Bad dream...',
    catAlert: 'HISS!', hintCat: 'Tiptoe past sleeping cats — running startles them!', wardrobeHidden: 'Hidden inside wardrobe!',
    pickRelic: 'Choose a Relic', nightT: 'Night', tonightT: 'Tonight', pickRelicSub: 'Pick one to start the night', relicLocked: 'Choose a relic first', activeRelics: 'Active Relics',
    hintMove: 'Small push: quiet · Full push: run', hintSqueak: 'Light planks squeak!', hintChest: 'The chest is opening... and creaking!',
    hintSnore: 'Snoring covers your noise: run now!', hintPeek: 'It is about to look! Freeze or hide!', hintChase: 'Drop loot to get lighter, run to the door!',
    // results
    escaped: 'Escaped!', caught: 'Caught!', again: 'Again',
  },
  zh: {
    mSkills: '技能', mHideout: '藏身处', mMarket: '黑市', mWardrobe: '衣柜', mBook: '秘典',
    play: '开始', loading: '加载中… {p}%', ok: '好的', back: '返回', start: '出发', resume: '继续',
    shop: '商店', help: '玩法', settings: '设置', pause: '暂停', quit: '放弃', paused: '已暂停',
    lullaby: '摇篮曲', drop: '丢下', dawnLeft: '距天亮', bestNight: '最佳夜晚',
    howTitle: '怎么玩？', how1: '轻推：安静<br>推满：奔跑', how2: '它打呼噜时<br>快走', how3: '它看过来时<br>停下或躲起来', how4: '带着宝藏<br>回到门口',
    setTitle: '设置', setMusic: '音乐', setSfx: '音效', setZoom: '镜头', setVibrate: '震动', setHq: '光影特效', setLang: '语言',
    setQuality: '画质', qualityAuto: '自动', qualityLow: '低', qualityMed: '中', qualityHigh: '高',
    zoomNear: '近', zoomMid: '中', zoomFar: '远',
    stop: '别动！', seen: '被发现！', go: '快走！', run: '快跑！',
    wake: '它醒了！快跑！', dawnWake: '天亮了！快跑！', caughtBanner: '被抓住了！', escapedBanner: '逃出来了！', emptyHint: '先拿点宝藏！',
    sleepwalkBanner: '怪物在梦游！离它远点！', nightmare: '做噩梦...',
    catAlert: '嘶！', hintCat: '踮脚走过睡着的猫咪——跑动会惊醒它们！', wardrobeHidden: '躲进了衣柜！',
    pickRelic: '选择一件遗物', nightT: '夜晚', tonightT: '今晚', pickRelicSub: '选择一件才能开始今晚', relicLocked: '请先选择遗物', activeRelics: '已激活遗物',
    hintMove: '轻推：安静 · 推满：奔跑', hintSqueak: '浅色木板会吱吱响！', hintChest: '宝箱正在打开……吱呀作响！',
    hintSnore: '打呼噜会盖住你的声音：现在快走！', hintPeek: '它要睁眼了！别动或躲起来！', hintChase: '丢下宝藏变轻，冲向门口！',
    escaped: '逃出来了！', caught: '被抓住了！', again: '再来',
  },
  tr: {
    mSkills: 'Yetenek', mHideout: 'Sığınak', mMarket: 'Karaborsa', mWardrobe: 'Gardırop', mBook: 'El Kitabı',
    play: 'Oyna', loading: 'Yükleniyor… {p}%', ok: 'Tamam', back: 'Geri', start: 'Başla', resume: 'Devam',
    shop: 'Dükkan', help: 'Nasıl oynanır', settings: 'Ayarlar', pause: 'Duraklat', quit: 'Pes et', paused: 'Durdu',
    lullaby: 'Ninni', drop: 'Bırak', dawnLeft: 'Şafağa kalan', bestNight: 'En iyi gece',
    howTitle: 'Nasıl oynanır?', how1: 'Az it: sessiz<br>Tam it: koş', how2: 'Horlarken<br>hızlan', how3: 'Bakınca dur<br>ya da saklan', how4: 'Ganimetle<br>kapıya dön',
    setTitle: 'Ayarlar', setMusic: 'Müzik', setSfx: 'Efektler', setZoom: 'Kamera', setVibrate: 'Titreşim', setHq: 'Işık efektleri', setLang: 'Dil',
    setQuality: 'Grafikler', qualityAuto: 'Oto', qualityLow: 'Düşük', qualityMed: 'Orta', qualityHigh: 'Yüksek',
    zoomNear: 'Yakın', zoomMid: 'Orta', zoomFar: 'Uzak',
    stop: 'DUR!', seen: 'GÖRDÜ!', go: 'KOŞ!', run: 'KAÇ!',
    wake: 'UYANDI! KAÇ!', dawnWake: 'ŞAFAK SÖKTÜ! KAÇ!', caughtBanner: 'YAKALANDIN!', escapedBanner: 'KAÇTIN!', emptyHint: 'Önce hazine!',
    sleepwalkBanner: 'UYURGEZER! UZAK DUR!', nightmare: 'Kâbus görüyor...',
    catAlert: 'TISSS!', hintCat: 'Uyuyan kedilerin yanından parmak ucunda geç — koşarsan uyanır!', wardrobeHidden: 'Dolabın içine saklandın!',
    pickRelic: 'Bir Tılsım Seç', nightT: 'Gece', tonightT: 'Bu gece', pickRelicSub: 'Geceye başlamak için birini seç', relicLocked: 'Önce bir tılsım seç', activeRelics: 'Aktif Tılsımlar',
    hintMove: 'Az it: sessiz · Tam it: koş', hintSqueak: 'Açık renkli tahtalar gıcırdar!', hintChest: 'Sandık açılıyor... gıcırdıyor!',
    hintSnore: 'Horlarken ses bastırılır: şimdi koş!', hintPeek: 'Gözünü açacak! Dur ya da saklan!', hintChase: 'Bırak ile hafifle, kapıya koş!',
    escaped: 'Kaçtın!', caught: 'Yakalandın!', again: 'Tekrar',
  },
  ru: {
    mSkills: 'Навыки', mHideout: 'Убежище', mMarket: 'Рынок', mWardrobe: 'Гардероб', mBook: 'Справочник',
    play: 'Играть', loading: 'Загрузка… {p}%', ok: 'ОК', back: 'Назад', start: 'Начать', resume: 'Продолжить',
    shop: 'Магазин', help: 'Как играть', settings: 'Настройки', pause: 'Пауза', quit: 'Сдаться', paused: 'Пауза',
    lullaby: 'Колыбельная', drop: 'Бросить', dawnLeft: 'До рассвета', bestNight: 'Лучшая ночь',
    howTitle: 'Как играть?', how1: 'Чуть толкни: тихо<br>До упора: бег', how2: 'Спеши, пока<br>он храпит', how3: 'Замри или спрячься,<br>когда смотрит', how4: 'Неси добычу<br>к двери',
    setTitle: 'Настройки', setMusic: 'Музыка', setSfx: 'Эффекты', setZoom: 'Камера', setVibrate: 'Вибрация', setHq: 'Эффекты света', setLang: 'Язык',
    setQuality: 'Графика', qualityAuto: 'Авто', qualityLow: 'Низ.', qualityMed: 'Сред.', qualityHigh: 'Выс.',
    zoomNear: 'Близко', zoomMid: 'Средне', zoomFar: 'Далеко',
    stop: 'СТОЙ!', seen: 'ЗАМЕТИЛ!', go: 'БЕГИ!', run: 'БЕГИ!',
    wake: 'ПРОСНУЛСЯ! БЕГИ!', dawnWake: 'РАССВЕТ! БЕГИ!', caughtBanner: 'ПОЙМАН!', escapedBanner: 'СБЕЖАЛ!', emptyHint: 'Сначала возьми сокровище!',
    sleepwalkBanner: 'ЛУНАТИТ! ДЕРЖИСЬ ПОДАЛЬШЕ!', nightmare: 'Кошмар...',
    catAlert: 'Ш-Ш-Ш!', hintCat: 'Проходи мимо кошек на цыпочках — бег напугает их!', wardrobeHidden: 'Спрятался в шкафу!',
    pickRelic: 'Выбери реликвию', nightT: 'Ночь', tonightT: 'Сегодня', pickRelicSub: 'Выбери одну, чтобы начать ночь', relicLocked: 'Сначала выбери реликвию', activeRelics: 'Активные реликвии',
    hintMove: 'Чуть толкни: тихо · До упора: бег', hintSqueak: 'Светлые доски скрипят!', hintChest: 'Сундук открывается... и скрипит!',
    hintSnore: 'Храп заглушает шум: беги сейчас!', hintPeek: 'Сейчас посмотрит! Замри или спрячься!', hintChase: 'Брось добычу, чтобы стать легче, и беги к двери!',
    escaped: 'Сбежал!', caught: 'Пойман!', again: 'Ещё раз',
  },
};

// monsters, night modifiers, shop, tips: keyed by id; {p}/{x} are filled from RULES by the caller
const DATA = {
  en: {
    monsters: {
      grumbo: ['Grumbo', 'A balanced sleeper. A classic monster.'], snorzilla: ['Snorzilla', 'Long snores — run while it snores!'],
      fluffnir: ['Fluffnir', 'Light sleeper, but a slow runner.'], blazeroo: ['Blazetail', 'Deep sleeper, but a very fast runner!'],
      glumpa: ['Peeky Glumpa', 'Hears less, but peeks often.'],
      bookwyrm: ['Bookwyrm', 'Hears every page turn, but chases slowly.'],
      barnaby: ['Captain Barnaby', 'A pirate kraken. Sleeps lightly amidst the rolling waves.'],
      oozefang: ['Prof. Oozefang', 'An arcane slime beast. High alertness and quick peeking.'],
    },
    mods: {
      squeaky: ['Squeaky Floors', 'Creaky planks everywhere.'], golden: ['Golden Night', 'Treasure is worth x{x}!'],
      dark: ['Power Outage', 'Only your lantern lights the way.'], toys: ['Toy Mess', 'Squeaky toys all over the floor.'],
      lucky: ['Lucky Breeze', 'One more item in the room.'], restless: ['Restless Night', 'The monster calms down slowly.'],
      hoard: ['Dragon Hoard', 'Much more treasure.'], short: ['Short Night', 'Dawn comes early, but loot is x{x}.'],
    },
    shop: {
      socks: ['Soft Socks', 'Step & pickup noise -{p}% per level'], back: ['Strong Back', 'Bag weight penalty -{p}% per level'],
      feet: ['Quick Feet', 'Move speed +{p}% per level'], lullaby: ['Music Box', 'Start every night with +{p} lullaby'],
      charm: ['Lucky Charm', 'Treasure value +{p}% per level'],
    },
    relics: {
      feather_step: ['Feather Step', 'Steps -40% quieter, but bag capacity -1.'],
      greedy_fingers: ['Greedy Claws', 'Looting is +35% faster, but rummaging is 50% louder.'],
      golden_compass: ['Golden Compass', 'Loot is +25% more valuable, but dawn is 12s earlier.'],
      owl_eye: ['Night Owl Eye', 'Monster peek warning lasts 1.2s longer, but speed -6%.'],
      snore_whistle: ['Snore Whistle', 'Snoring muffles all noise, but wake spikes +8 when it stops.'],
    },
    tips: [
      'A small joystick push means tiptoe — quiet but slow.', 'While it snores (blue bar) your noise is muffled: time to run!',
      'When it opens an eye, freeze or hide behind a cabinet, barrel or crate.', 'Rugs soak up noise. Light, nailed planks squeak.',
      'Being chased? Press Drop to throw your heaviest loot and speed up.', 'A lullaby calms a sleeping monster and stuns a chasing one.',
      'The crown is worth the most — right under the monster\'s nose!', 'Hold Take next to an item to grab it — rummaging makes noise.',
      'The closer you are to the monster, the louder every sound is.',
      'The monster senses its hoard shrinking: the more you take, the lighter it sleeps.', 'Up close the monster lunges — keep your distance!',
    ],
  },
  zh: {
    monsters: {
      grumbo: ['咕噜宝', '睡得很均衡，经典的怪兽。'], snorzilla: ['呼噜怪', '呼噜打得很长——趁它打呼噜快跑！'],
      fluffnir: ['毛团团', '睡得浅，但跑得慢。'], blazeroo: ['焰尾', '睡得沉，但跑得飞快！'], glumpa: ['偷看格伦帕', '听力差，但经常偷看。'], bookwyrm: ['书虫龙', '能听见翻书声，但追得慢。'],
      barnaby: ['巴纳比船长', '海盗海怪。在海浪摇晃中警觉地打盹。'], oozefang: ['软泥獠牙教授', '奥术史莱姆巨兽。警觉度极高，频繁睁眼。'],
    },
    mods: {
      squeaky: ['吱吱地板', '到处都是会响的木板。'], golden: ['黄金之夜', '宝藏价值 x{x}！'], dark: ['停电', '只有你的灯笼能照路。'],
      toys: ['玩具乱堆', '地上满是会叫的玩具。'], lucky: ['幸运微风', '房间里多一件物品。'], restless: ['不安之夜', '怪兽很难平静下来。'],
      hoard: ['巨龙宝库', '宝藏多得多。'], short: ['短夜', '天亮得早，但收获 x{x}。'],
    },
    shop: {
      socks: ['软袜子', '脚步与拾取声 -{p}% / 级'], back: ['强壮后背', '背包负重惩罚 -{p}% / 级'], feet: ['敏捷双脚', '移动速度 +{p}% / 级'],
      lullaby: ['音乐盒', '每晚开始时 +{p} 首摇篮曲'], charm: ['幸运符', '宝藏价值 +{p}% / 级'],
    },
    relics: {
      feather_step: ['羽毛轻步', '脚步声音 -40%，但背包容量 -1。'],
      greedy_fingers: ['贪婪之爪', '拾取速度 +35%，但翻动声音增加 50%。'],
      golden_compass: ['黄金罗盘', '宝藏价值 +25%，但天亮提早 12 秒。'],
      owl_eye: ['猫头鹰之眼', '睁眼预警时间延长 1.2 秒，但移动速度 -6%。'],
      snore_whistle: ['呼噜魔笛', '呼噜声几乎完全掩盖噪音，但呼噜停止时警觉度立即 +8。'],
    },
    tips: [
      '轻推摇杆就是踮脚走——安静但慢。', '它打呼噜时（蓝色条）你的声音会被盖住：快跑！', '它睁眼时，停下或躲到柜子、木桶、箱子后面。',
      '地毯能吸收声音。浅色带钉子的木板会吱吱响。', '被追了？按“丢下”扔掉最重的宝藏，跑得更快。', '摇篮曲能让睡着的怪兽平静，让追你的怪兽发晕。',
      '王冠最值钱——但就在怪兽鼻子底下！', '在物品旁按住“拿”才能拿走——翻找会发出声音。', '离怪兽越近，每个声音都越响。',
      '怪兽能感觉到宝藏在变少：你拿得越多，它睡得越浅。', '靠近时怪兽会猛扑——保持距离！',
    ],
  },
  tr: {
    monsters: {
      grumbo: ['Grumbo', 'Dengeli uyur. Klasik bir canavar.'], snorzilla: ['Horzilla', 'Uzun uzun horlar — horlarken koş!'],
      fluffnir: ['Pofuduk', 'Hafif uyur ama yavaş koşar.'], blazeroo: ['Alevkuyruk', 'Derin uyur ama çok hızlı koşar!'],
      glumpa: ['Gözcü Glumpa', 'Az duyar ama sık sık göz atar.'],
      bookwyrm: ['Kitap Kurdu', 'Her sayfa çevrilişini duyar ama yavaş kovalar.'],
      barnaby: ['Kaptan Barnaby', 'Korsan ahtapot-canavar. Sallanan dalgalarda hafif uyur.'],
      oozefang: ['Prof. Balçıkdiş', 'Büyülü balçık canavarı. Çok keskin duyar ve sık göz açar.'],
    },
    mods: {
      squeaky: ['Gıcırtılı Döşeme', 'Her yer gıcırdayan tahtalarla dolu.'], golden: ['Altın Gece', 'Hazineler x{x} değerli!'],
      dark: ['Elektrik Kesik', 'Sadece fenerin yolu aydınlatıyor.'], toys: ['Oyuncak Karmaşası', 'Yerler ötücü oyuncak dolu.'],
      lucky: ['Şanslı Esinti', 'Odada bir eşya fazla.'], restless: ['Huzursuz Gece', 'Canavar zor sakinleşiyor.'],
      hoard: ['Ejderha İstifi', 'Çok daha fazla hazine var.'], short: ['Kısa Gece', 'Şafak erken, ama ganimet x{x}.'],
    },
    shop: {
      socks: ['Yumuşak Çorap', 'Adım ve toplama sesi -%{p} / seviye'], back: ['Güçlü Sırt', 'Çanta ağırlık cezası -%{p} / seviye'],
      feet: ['Çevik Ayaklar', 'Hareket hızı +%{p} / seviye'], lullaby: ['Ninni Kutusu', 'Her geceye +{p} ninni ile başla'],
      charm: ['Şans Tılsımı', 'Hazine değeri +%{p} / seviye'],
    },
    relics: {
      feather_step: ['Tüy Adım', 'Adım sesi -%40 sessiz, ama çanta kapasitesi -1.'],
      greedy_fingers: ['Açgözlü Pençe', 'Eşyaları alma +%35 hızlı, ama karıştırma sesi +%50 fazla.'],
      golden_compass: ['Altın Pusula', 'Hazine +%25 daha değerli, ama şafak 12 sn erken söker.'],
      owl_eye: ['Gece Kuşu Gözü', 'Göz açma uyarısı 1.2 sn daha erken başlar, ama hız -%6.'],
      snore_whistle: ['Horlama Düdüğü', 'Horlarken ses neredeyse sıfırlanır, ama bitince +8 sıçrar.'],
    },
    tips: [
      'Joystick\'i az itersen parmak ucunda yürürsün — sessiz ama yavaş.', 'Canavar horlarken (mavi çubuk) ses bastırılır: işte koşma zamanı!',
      'Göz açınca dur ya da dolap, varil, kasa gibi uzun bir eşyanın arkasına saklan.', 'Halılar sesini emer. Açık renkli, çivili tahtalar gıcırdar.',
      'Kovalanırken Bırak düğmesiyle en ağır eşyayı at, hızlan.', 'Ninni uyuyan canavarı sakinleştirir, kovalayanı sersemletir.',
      'Taç en değerli hazine ama canavarın burnunun dibinde!', 'Eşyayı almak için yanında Al\'a basılı tut — karıştırmak ses çıkarır.',
      'Canavara yaklaştıkça çıkardığın her ses daha yüksek duyulur.',
      'Canavar hazinesinin azaldığını sezer: ne kadar çok alırsan o kadar hafif uyur.', 'Yakına gelince canavar atılır — mesafeni koru!',
    ],
  },
  ru: {
    monsters: {
      grumbo: ['Грумбо', 'Спит спокойно. Классический монстр.'], snorzilla: ['Храпзилла', 'Долго храпит — беги, пока храпит!'],
      fluffnir: ['Пушистик', 'Чутко спит, но медленно бегает.'], blazeroo: ['Огнехвост', 'Спит крепко, но бегает очень быстро!'],
      glumpa: ['Глазастый Глумпа', 'Слышит хуже, но часто подглядывает.'],
      bookwyrm: ['Книжный червь', 'Слышит каждую страницу, но гонится медленно.'],
      barnaby: ['Капитан Барнаби', 'Пиратский кракен. Чутко спит под качку волн.'],
      oozefang: ['Проф. Слизезуб', 'Магический слизневый зверь. Острый слух и частые взгляды.'],
    },
    mods: {
      squeaky: ['Скрипучий пол', 'Повсюду скрипучие доски.'], golden: ['Золотая ночь', 'Сокровища стоят x{x}!'],
      dark: ['Нет света', 'Путь освещает только твой фонарь.'], toys: ['Бардак с игрушками', 'Пол усыпан пищащими игрушками.'],
      lucky: ['Удачный ветерок', 'В комнате на одну вещь больше.'], restless: ['Беспокойная ночь', 'Монстр долго успокаивается.'],
      hoard: ['Драконий клад', 'Гораздо больше сокровищ.'], short: ['Короткая ночь', 'Рассвет раньше, но добыча x{x}.'],
    },
    shop: {
      socks: ['Мягкие носки', 'Шум шагов и подбора -{p}% за уровень'], back: ['Крепкая спина', 'Штраф за вес сумки -{p}% за уровень'],
      feet: ['Быстрые ноги', 'Скорость +{p}% за уровень'], lullaby: ['Музыкальная шкатулка', 'Начинай каждую ночь с +{p} колыбельной'],
      charm: ['Талисман удачи', 'Ценность сокровищ +{p}% за уровень'],
    },
    relics: {
      feather_step: ['Перо в шаге', 'Шаги на 40% тише, но вместимость мешка -1.'],
      greedy_fingers: ['Жадные когти', 'Сбор на 35% быстрее, но шум при поиске на 50% громче.'],
      golden_compass: ['Золотой компас', 'Добыча на 25% дороже, но рассвет на 12 сек раньше.'],
      owl_eye: ['Глаз совы', 'Предупреждение о взгляде на 1.2 сек дольше, но скорость -6%.'],
      snore_whistle: ['Свисток храпа', 'Храп глушит почти весь шум, но при окончании шкала подскакивает на +8.'],
    },
    tips: [
      'Чуть толкни джойстик — пойдёшь на цыпочках: тихо, но медленно.', 'Пока он храпит (синяя полоса), шум заглушается: самое время бежать!',
      'Открыл глаз? Замри или спрячься за шкафом, бочкой или ящиком.', 'Ковры поглощают шум. Светлые доски с гвоздями скрипят.',
      'Погоня? Нажми «Бросить», чтобы выкинуть самое тяжёлое и ускориться.', 'Колыбельная успокаивает спящего монстра и оглушает того, кто гонится.',
      'Корона — самое ценное, но лежит прямо у носа монстра!', 'Чтобы взять вещь, держи «Взять» рядом с ней — возня шумит.',
      'Чем ближе к монстру, тем громче любой звук.',
      'Монстр чувствует, как тает его клад: чем больше берёшь, тем чутче он спит.', 'Вблизи монстр делает рывок — держи дистанцию!',
    ],
  },
};

let lang = 'tr';
export const getLang = () => lang;
export function setLang(l) { lang = D[l] ? l : 'en'; if (typeof document !== 'undefined') document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang; }
export function detectLang() {
  const n = (typeof navigator !== 'undefined' && navigator.language || 'en').toLowerCase();
  return n.startsWith('tr') ? 'tr' : n.startsWith('zh') ? 'zh' : n.startsWith('ru') ? 'ru' : 'en';
}
const fill = (s, p) => s.replace(/\{(\w+)\}/g, (_, k) => (p[k] ?? ''));
export function t(key, p = {}) { return fill(D[lang][key] ?? MARKET_UI[lang][key] ?? HIDE_UI[lang][key] ?? D.en[key] ?? MARKET_UI.en[key] ?? HIDE_UI.en[key] ?? key, p); }
export const setText = (id, p = {}) => { const [name, desc] = HIDE_DATA[lang].sets[id] || HIDE_DATA.en.sets[id]; return { name, desc: fill(desc, p) }; };
export const lanternName = (id) => HIDE_DATA[lang].lanterns[id] || HIDE_DATA.en.lanterns[id] || id;
export const decorName = (id) => HIDE_DATA[lang].decor[id] || HIDE_DATA.en.decor[id] || id;
export const monsterText = (id) => { const [name, trait] = DATA[lang].monsters[id] || DATA.en.monsters[id]; return { name, trait }; };
export const modText = (id, p = {}) => { const [name, desc] = DATA[lang].mods[id] || DATA.en.mods[id]; return { name, desc: fill(desc, p) }; };
export const relicText = (id) => { const [name, desc] = (DATA[lang].relics && DATA[lang].relics[id]) || DATA.en.relics[id] || [id, '']; return { name, desc }; };
export const shopText = (id, p = {}) => { const [name, desc] = DATA[lang].shop[id] || MARKET_DATA[lang].shop[id]; return { name, desc: fill(desc, p) }; };
export const goodText = (id, p = {}) => { const [name, desc] = MARKET_DATA[lang].goods[id] || MARKET_DATA.en.goods[id]; return { name, desc: fill(desc, p) }; };
export const itemName = (kind) => MARKET_DATA[lang].items[kind] || MARKET_DATA.en.items[kind] || kind;
// merchant line: random variant (pass rng for tests)
export function line(key, p = {}, rng = Math.random) { const v = MARKET_DATA[lang].lines[key] || MARKET_DATA.en.lines[key] || [key]; return fill(v[Math.floor(rng() * v.length)], p); }
export const tips = () => DATA[lang].tips;

export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

// for tests: every language has every key, with the same {placeholders}
export function checkDictionaries() {
  const problems = [];
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const l of Object.keys(D)) for (const k of Object.keys(D.en)) {
    if (!(k in D[l])) problems.push(`${l}: missing ${k}`); else if (ph(D[l][k]) !== ph(D.en[k])) problems.push(`${l}: placeholders differ in ${k}`);
  }
  for (const l of Object.keys(DATA)) for (const sec of ['monsters', 'mods', 'shop']) for (const id of Object.keys(DATA.en[sec])) {
    if (!DATA[l][sec][id]) problems.push(`${l}: missing ${sec}.${id}`);
    else if (ph(DATA[l][sec][id][1]) !== ph(DATA.en[sec][id][1])) problems.push(`${l}: placeholders differ in ${sec}.${id}`);
  }
  for (const l of Object.keys(DATA)) if (DATA[l].tips.length !== DATA.en.tips.length) problems.push(`${l}: tip count`);
  for (const l of Object.keys(D)) {
    if (!MARKET_UI[l] || !MARKET_DATA[l]) { problems.push(`${l}: no market texts`); continue; }
    if (!HIDE_UI[l] || !HIDE_DATA[l]) { problems.push(`${l}: no hideout texts`); continue; }
    for (const k of Object.keys(HIDE_UI.en)) if (!(k in HIDE_UI[l])) problems.push(`${l}: missing ${k}`); else if (ph(HIDE_UI[l][k]) !== ph(HIDE_UI.en[k])) problems.push(`${l}: placeholders differ in ${k}`);
    for (const g of ['sets', 'lanterns', 'decor']) for (const k of Object.keys(HIDE_DATA.en[g])) { const v = HIDE_DATA[l][g][k]; if (!v) problems.push(`${l}: missing ${g} ${k}`); else if (g === 'sets' && ph(v[1]) !== ph(HIDE_DATA.en.sets[k][1])) problems.push(`${l}: placeholders differ in set ${k}`); }
    for (const k of Object.keys(MARKET_UI.en)) if (!(k in MARKET_UI[l])) problems.push(`${l}: missing ${k}`); else if (ph(MARKET_UI[l][k]) !== ph(MARKET_UI.en[k])) problems.push(`${l}: placeholders differ in ${k}`);
    for (const k of Object.keys(MARKET_DATA.en.items)) if (!MARKET_DATA[l].items[k]) problems.push(`${l}: missing item ${k}`);
    for (const k of Object.keys(MARKET_DATA.en.shop)) if (!MARKET_DATA[l].shop[k]) problems.push(`${l}: missing shop ${k}`);
    for (const k of Object.keys(MARKET_DATA.en.goods)) { const g = MARKET_DATA[l].goods && MARKET_DATA[l].goods[k]; if (!g) problems.push(`${l}: missing goods ${k}`); else if (ph(g[1]) !== ph(MARKET_DATA.en.goods[k][1])) problems.push(`${l}: placeholders differ in goods ${k}`); }
    for (const k of Object.keys(MARKET_DATA.en.lines)) {
      const v = MARKET_DATA[l].lines[k]; if (!v || !v.length) { problems.push(`${l}: missing line ${k}`); continue; }
      const want = ph(MARKET_DATA.en.lines[k][0]); for (const x of v) if (ph(x) !== want) problems.push(`${l}: placeholders differ in line ${k}`);
    }
  }
  return problems;
}
