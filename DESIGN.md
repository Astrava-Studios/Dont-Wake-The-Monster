# Don't Wake the Monster
Hayal: Minik bir hırsız, uyuyan sevimli bir canavarın odasından onu uyandırmadan değerli eşyalar çalar ve karaborsada yaşlı bir tüccara pazarlıkla satar.
Döngü: gece (sız, eşyayı bul, Al'a basılı tut, ritmi oku) → kaçış ya da kovalama → karaborsa (tüccarla pazarlık) → yetenek ağacı → sonraki gece
Eylemler: yürü/parmak ucu/koş · Al (basılı tut) · göz açınca dur/saklan · Bırak · Ninni · kapıdan çık · karaborsada kabul/daha fazla iste/iltifat/vazgeç
Kazanma: ganimetle kapıdan çık. Kaybetme: canavar yakalar → gecenin ganimeti gider. Kira ödenemezse koşu biter.
Çeşitlilik: seed'li oda + tema, 5 canavar tipi (duyma, horlama, bakma, hız), 8 gece etkisi, gece başına artan duyarlılık, sandık, lanetli eşyalar, kalıntılar, karaborsa pazarlığı.
Oturum: bir gece 30–90 sn, bir koşu 5–10 dk.

## Kurallar ve yapı
- Bütün sayılar `src/rules.js`. Mantık `src/sim.js` (saf, node'da çalışır). `src/bot.js` aynı API ile oynar.
- `npm test`: sim + söz testleri (dükkan yüzdeleri, ipuçları, canavar özellikleri, gece etkileri, sonuç ekranı).
- `npm run balance` (ya da `node scripts/balance.mjs 40 1,3,5,8 99 r.chase.speedBase=4.5`): bot denge raporu.
- Debug: `?seed=N ?night=N ?sim=SANIYE ?autoplay&speed=4 ?gallery ?noassets ?lowfx ?r.yol=değer`, konsolda `window.GAME`, `#debuglog`.

## İlk sayılar (bot ile ayarlandı, 40 seed)
| şey | değer |
|---|---|
| koşu hızı | 4.6 |
| canavar kovalama hızı | 4.3 + 0.1/gece |
| uyanınca kalkma | 0.5 sn |
| yakalama yarıçapı | 1.8 |
| gece başına duyarlılık | +%13 |
| horlama ses çarpanı | 0.32 |

| bot | gece 1 | gece 3 | gece 5 | gece 8 |
|---|---|---|---|---|
| açgözlü: kaçış | %85 | %75 | %80 | %75 |
| temkinli: kaçış | %98 | %95 | %93 | %83 |

Zorlaştırma (bot ile ölçüldü): hazine sezgisi (+%80 duyma, hazinenin hepsi alınınca), şafağa doğru 2 kat sık göz atma, parmak ucunda sakinleşme 0.9→0.4/sn, atılış (3 birimde, 0.5 sn, x1.6 hız), kovalama hızı +0.15/gece. Ortalama ganimet yaklaşık %40 düştü.

Bot kusursuz duruyor ve saklanıyor. Gerçek oyuncu daha sık yakalanır. Bu yüzden zorluk botta "zor ama kazanılabilir" seviyesinde bırakıldı.

## Karaborsa (rules.js > market)
Tüccar en fazla `değer × (0.70 + 0.05 × Pazarlık) × ruh hali` öder ve bunun %60-75'iyle açar. Fazlasını istersen: tavanın altındaysa %90 kabul eder, üstündeyse şans `0.30 + 0.06 × Pazarlık − aşım × 2.5` olur; tutmazsa sabrı 1 azalır (2 + Pazarlık/2). Tek seferlik iltifat %35 + %8×Pazarlık şansla tavanı %6 artırır. Değer Biçme tahmin aralığını ±%55'ten seviye başına 10 puan daraltır (en az ±%6); gerçek değer her zaman aralığın içinde kalır (test ediliyor).
