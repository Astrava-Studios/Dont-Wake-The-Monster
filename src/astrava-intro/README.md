# Astrava Studios açılış sahnesi

Tüm Astrava oyunlarında kullanılacak açılış (~6,7 sn). Tek dosya: `astravaIntro.js`. Bağımlılığı ve asset dosyası yok. Logo vektör olarak çizildi, sesler WebAudio ile anlık üretiliyor.

**Akış:** yıldız alanı → hiper-uzay atlayışı ve logonun ışıkla çizilmesi → patlama (bas vuruşu, flaş, şok dalgası, yatay flare, sarsıntı) → ASTRAVA yazısı → STUDIOS → parlama geçişi → karartma.

## Başka bir oyuna ekleme

1. `astravaIntro.js` dosyasını kopyala.
2. `index.html` içinde `<body>`'nin ilk çocuğu olarak ekle (JS yüklenene kadar oyun ekranı görünmesin):
   ```html
   <div id="astrava-boot" style="position:fixed;inset:0;background:#000;z-index:2147483000"></div>
   ```
3. Açılışta çağır (oyun arkada yüklenmeye devam edebilir):
   ```js
   import { playAstravaIntro } from './astravaIntro.js';
   await playAstravaIntro({ volume: 0.9, skippable: false, tapText: 'Başlamak için dokun' });
   startGameAudio(); // intro bitince oyun sesini dokunmadan başlat
   ```
   Çağırmadığın durumlarda (debug vb.) `#astrava-boot`'u kendin kaldır.

## Seçenekler

| ad | varsayılan | açıklama |
|---|---|---|
| `volume` | `0.9` | ana ses |
| `audio` | `true` | `false` = sessiz |
| `skippable` | `true` | 0,6 sn sonra dokunma / tuş ile atlanır |
| `blockInput` | `true` | intro sürerken dokunuşlar oyuna ulaşmaz |
| `tapText` | `'Tap to start'` | tarayıcı sesi kilitliyse çıkan "dokun" yazısı |
| `mount` | `document.body` | nereye eklenecek |

Ses kilidi: Capacitor (Android WebView) içinde ses dokunmadan çalar. Normal tarayıcıda kullanıcı daha önce siteye dokunmadıysa önce logo ve `tapText` gösterilir, dokununca intro sesli başlar.

Zamanlama `ASTRAVA_INTRO_TIMES` içinde (saniye).
