# Don't Wake the Monster 👹💤

Mobil öncelikli, sevimli 3D bir gizlilik oyunu. Three.js ile yapıldı. Bütün modeller, dokular ve sesler kodla üretiliyor, harici dosya yok.

## Çalıştırma
```bash
npm install
npm run dev      # telefondan da açmak için aynı Wi-Fi'da http://<bilgisayar-ip>:5173
npm run build    # dist/ klasörüne üretim çıktısı
```

## Kontroller
- **Dokunmatik:** ekranda herhangi bir yere basıp sürükle. Az itersen parmak ucunda yürürsün (sessiz), tam itersen koşarsın (gürültülü).
- **Butonlar:** 🎒 Bırak (en ağır eşyayı yere bırakır, hızlanırsın) · 🎵 Ninni (canavarı sakinleştirir; kovalarken sersemletir) · 📣 Bağır (gecede bir kez; canavarı bilerek uyandırır).
- **Klavye:** WASD/oklar, Shift = parmak ucu, Space = ninni, R = bağır, Q = bırak, P/Esc = duraklat.

## Hırsızlık ve ticaret
- **Eşyalar:** altın yok; 9 çeşit eşya çalınıyor: nadir kitap, gümüş şamdan, antika şişe, porselen vazo, tablo, cep saati, değerli taş, mücevher kutusu, canavarın tacı. Her birinin gerçek değeri gizli ve bir aralık içinde rastgele belirleniyor (`rules.js` > `items`).
- **Almak emek ister:** bir gecede 3-6 eşya var. Eşyanın yanında **Al** düğmesine (klavyede E) basılı tutmak gerekiyor; mücevher kutusu ve taç uzun sürüyor. Karıştırmak ses çıkarıyor ve canavar bakarken alırsan seni görüyor.
- **Zula:** kaçınca çalınanlar zulaya gidiyor; yıldızlar Şöhret parası kazandırıyor. Yakalanırsan o gecenin eşyaları gidiyor.
- **Karaborsa:** yaşlı tüccar Mort bir dükkânda oturuyor. Eşyayı seçince inceleyip teklif veriyor; kabul edebilir, biraz ya da çok daha fazlasını isteyebilir, iltifat edebilir ya da vazgeçebilirsin. Sabrı biterse o ziyarette o eşyayı almıyor. Bütün pazarlık mantığı `src/market.js` içinde ve node'da test ediliyor.
- **Yetenek ağacı:** Hırsız dalı (Yumuşak Çorap > Çevik Ayaklar > Güçlü Sırt > Ninni Kutusu) ve Tüccar dalı (Değer Biçme > Pazarlık > Şans Tılsımı). Değer Biçme tahmin aralığını daraltıyor; Pazarlık tüccarın ödeyebileceği en yüksek fiyatı ve sabrını artırıyor.

## Sığınak ve gardırop
- Menü artık sığınağın kendisi: yatak, zula yığını (zulayla büyür), ganimet rafı (kaçırdığın her eşya türü), tamir masası, gardırop ve satın aldığın dekorlar.
- **Sığınak geliştirmeleri** koşuya aittir, oyun bitince lonca alır: büyük zula (8 → 12 → 16 → 20 eşya; sığmayan ganimet kalır), tamir masası (çatlak eşyayı kayıp değerin %45'ine onarır).
- **Kalıcı olanlar:** 8 kostüm seti (şapka, kıyafet, çanta), 6 fener rengi, 8 dekor ve ganimet rafı. Bir setin 3 parçasını birden giyince küçük bonus verir: Ninja adım sesi −%5, Korsan tüccar +%5, Kedi Hırsız alma hızı +%8, Büyücü uyku tozu/tüy +%20, Yılbaşı çanta +1, Cadılar Bayramı göz atma −%12, Melek sakinleşme +%12, Şerif hız +%5.
- Kostüm parçaları Rogue'un kafa ve göğüs kemiklerine takılı. Kıyafetler dokudaki yeşil kumaşın rengini değiştirir (`src/costumes.js`).

## Eski Kütüphane
- Gece kartından ev seçilir. Kütüphane bir kez 3000 altınla açılır ve oyun bitse de açık kalır.
- Daha büyük bir ev: uzun kitap rafı sıraları ve aralarında koridorlar, eşyalar %50 daha değerli, şafak 12 sn daha geç.
- **Tamamen karanlık bölmeler** (1 → 2 → 3, gece ilerledikçe): bölmenin içi kapkaradır, yalnızca fenerin yarıçapı görünür. Canavar göz attığında seni orada göremez. Her bölmede fazladan bir eşya var ve oradaki eşyalar %35 daha değerli (`src/darkness.js` shader eki).
- **Kitap Kurdu:** gözlüklü, gece şapkalı ve sırtında kitap taşıyan canavar. Çok iyi duyar, uzun horlar, yavaş kovalar. Kütüphane gecelerinin %55'inde çıkar.
- **Fener geliştirmeleri** (sığınakta, koşuya ait): fitil, karanlıkta görüş yarıçapını 2.4 → 4.2 m'ye çıkarır; cam, ışık gücünü ×1 → ×1.6'ya çıkarır.
- Bot ölçümü (`node scripts/library.mjs`): kütüphane %25–45 daha kazançlı ama canavar daha sık uyanıyor.

## Mekanikler
| Sistem | Açıklama |
|---|---|
| Uyanma çubuğu | Adımlar, toplanan eşyalar, gıcırtılı tahtalar ve oyuncak ördekler doldurur. Sesin etkisi canavara yakınlaştıkça artar. |
| Horlama ritmi | Canavar horlarken ses %68 bastırılır. Bu ritme göre hareket etmek gerekir. |
| Göz atma | Çubuk %45'i geçince canavar göz açıp bakar. Ya durursun ya da uzun bir eşyanın arkasına saklanırsın. |
| Çanta ağırlığı | Hazine arttıkça yavaşlarsın ve daha çok ses çıkarırsın. Risk/ödül dengesi buradan gelir. |
| Bağırma ve taç | **Canavarın tacı** yatağında, canavarın yanında durur; canavar yataktayken alınamaz. Gecede bir kez 📣 Bağır: canavar uyanır ve sesin geldiği yere koşar, orada birkaç saniye etrafa bakar. Bu sırada karanlıkta, gardıropta ya da uzun bir eşyanın arkasında saklanırsan seni göremez. Ararken sesleri de duyar. Yatak boşken tacı alabilirsin. Seni görürse kısa bir şaşkınlıktan sonra kovalar. Ninni onu doğrudan yatağına yollar. Bağırarak kaçmak "gizli" yıldızını kaybettirir ama yerine Cüretkâr yıldızı ve küçük bir Şöhret bonusu verir. İlk gecelerde ipuçları adım adım anlatır (yatağın yanında, bağırınca, ararken, yatak boşken). |
| Kovalama | Canavar A* ile yol bulup peşine düşer; yaklaşınca kısa bir atılış yapar. Bir süre sonra yorulup yatağına döner. Yatağına dönerken hâlâ huysuzdur: yeterince ses duyarsa geri döner ve yeniden kovalar. Şafak sökerse pes etmez. |
| Gardırop | Gardırobun yanında yarım saniye kıpırdamadan durursan içine girersin; canavar göz attığında seni göremez. Yalnızca canavar uyurken işe yarar. |
| Uyurgezerlik | 2. geceden sonra canavar bazen uykusunda yürür; çarparsan uyanır. Yatağına dönünce uyanma çubuğu olduğu gibi kalır. |
| Hazine sezgisi | Canavar hazinesinin azaldığını sezer: aldığın her parça onu daha hafif uyutur. Şafağa doğru daha sık göz atar. |
| Gece ışığı | Oda karanlık; fener, mumlar, yatak lambası ve ay ışığıyla görürsün. Elektrik Kesik gecelerinde sadece fener yanar. Ekranın dışında kalan canavarın yönünü kenardaki ok gösterir. |
| Şafak zamanlayıcısı | Duvardaki saat ilerler. Süre dolunca alarm çalar. |
| Zula ve kira | Kaçınca çalınanlar zulaya gider ve karaborsada satılır. Yakalanırsan o gecenin eşyaları gider. Her 5 gecede bir loncaya kira ödenir; ödenemezse koşu biter. Gece ortasında oyundan çıkmak (ya da uygulamayı kapatmak) o geceyi kaybettirir, kullanılmayan malzemeler geri gelir. |
| Çeşitlilik | Her gece farklı oda yerleşimi, renk teması, 5 canavar tipi ve 8 gece etkisi (Elektrik Kesik, Altın Gece vb.) |
| Yıldızlar | Kaçış, hiç uyandırmama ve hepsini toplama; son ikisi gece numarasıyla çarpılan Şöhret parası verir. |
| Kalıntılar | 2., 4. ve 6. gecelerde sahip olmadığın kalıntılardan rastgele 3'ü arasından biri seçilir. |
| Pazarlık hafızası | Tüccar bir ziyaret boyunca her pazarlığı hatırlar: vazgeçip aynı eşyayı yeniden açınca teklif, sabır ve iltifat sıfırlanmaz. |
| Android | Geri tuşu geceyi duraklatır ya da açık paneli kapatır; uygulama arka plana alınınca oyun duraklar ve ses kesilir. |

## Telefona paketleme (Android / iOS)
Web oyunu Capacitor ile native uygulamaya sarılabilir:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Don't Wake the Monster" com.example.dwtm --web-dir dist
npm run build
npx cap add android      # Android Studio gerekir
npx cap sync
npx cap open android
```
iOS için `npx cap add ios` gerekir (macOS + Xcode).

## 3D modeller
`public/models/` içinde KayKit (Kay Lousberg, CC0) paketlerinden seçilmiş glTF modeller var. Hepsini `src/assets.js` yüklüyor, boyutlandırıyor ve oyuna yerleştiriyor:
- **Oyuncu:** Rogue_Hooded + Rig_Medium animasyonları (Idle_A, Walking_A, Running_A, Interact, Death_A)
- **Mobilya ve dekor:** dolap, masa ve mum, koltuk, varil, kasa yığını, kaktüs, ayaklı lamba, tablolar, duvar rafları, yastık, kitap, şişe, sandalye
- **Hazine:** para yığınları, altın külçe, altın sandık (kapağı açılıyor)

Canavar, taç, mücevher, kitaplık, halılar ve oyuncak ördek hâlâ kodla üretiliyor, çünkü paketlerde karşılıkları yok. Bir model yüklenemezse oyun otomatik olarak kodla üretilen modele geçiyor. Bütün paketleri gezmek için:
```bash
node Assets/goat-game-creator/explorer/server.mjs --dir Assets --port 4848
```

## Arayüz
Arayüz Kenney UI Pack (CC0) görselleriyle yapıldı: `public/ui/` içinde düğmeler, paneller, yıldızlar ve Kenney Future yazı tipi var. Görseller CSS `border-image` (9-dilim) ile ölçekleniyor, bu yüzden köşeler her boyutta keskin kalıyor. Kenney Future'da ğ, ş, ı ve İ harfleri olmadığı için yalnızca sayılarda ve İngilizce başlıkta kullanılıyor; metinler Nunito ile yazılıyor. Arayüzde emoji yok; bütün simgeler `src/icons.js` içinde çizilmiş SVG ikonlar, canavar yüzü de canavarın rengini alan 6 ruh hali çiziminden oluşuyor. Oyun içi göstergede yazı yok, yalnızca simge ve sayı var: gece rozeti, uyanma çubuğu, şafak halkası, altın paneli ve simgeli düğmeler. Gece kartında canavarın özellikleri 4 küçük gösterge olarak çiziliyor, sonuç ekranında ise 3 yıldız var (kaçış, hiç uyandırmama, hepsini toplama).

## Dil ve yazı tipi
- **Diller:** İngilizce, Çince (简体中文), Türkçe ve Rusça. Ayarlar'da dil adları yerine bayraklar var. Oyun ilk açılışta cihaz diline göre seçiyor; Ayarlar > Dil bölümünden anında değiştirilebiliyor ve seçim saklanıyor. Bütün metinler `src/i18n.js` içinde. Testler her dilde bütün anahtarların bulunduğunu ve dükkan yüzdelerinin `rules.js` ile tuttuğunu kontrol ediyor.
- **Yazı tipi:** Nunito, `@fontsource-variable/nunito` paketiyle oyunun içine gömülü; Türkçe harflerin hepsi var ve internet gerekmiyor. Çince metinler telefonun sistem Çince yazı tipiyle (PingFang SC, Noto Sans SC, Microsoft YaHei) gösteriliyor. Kenney Future yalnızca sayılarda ve İngilizce başlıkta kullanılıyor.

## Ses
Sesler `src/audio.js` içinde WebAudio ile çalınıyor: bir kısmı Kenney kayıtları, geri kalanı sentez.
- **Karıştırıcı:** müzik, efekt ve ortam kanalları, küçük oda yankısı, kırpılmayı önleyen limitleyici. Sesler odadaki yerine göre sağa/sola konumlanıyor ve uzaklaştıkça kısılıyor.
- **Müzik:** sızarken müzik kutusu ninnisi çalıyor; canavar huzursuzlandıkça bas ve tik katmanı açılıyor, horlarken müzik boğuklaşıyor. Kovalamada davul, bas ve staccato melodiye geçiyor. Kükreme ve sonuç müzikleri müziği kısa süre kısıyor.
- **Detay:** zemine göre adım sesi (tahta/halı), her darbede rastgele perde, koşarken çantada şıngırdayan altın, canavarın ağır adımları, şafak yaklaştıkça hızlanan saat tiki, şafakta kuşlar, ara sıra gıcırdayan ev.
- **Ayarlar:** menüdeki ve duraklatma ekranındaki çark düğmesiyle açılıyor: müzik ve efekt ses düzeyi, kamera yakınlığı, titreşim ve ışık efektleri. Hepsi cihazda saklanıyor.
- **Ölçüm:** tarayıcı konsolunda `await GAME.audioReport()` her sesi çevrimdışı üretip tepe seviyesini ve ortalama yüksekliğini ölçer; sessiz ya da kırpılan ses varsa işaretler.
- **Kenney örnekleri:** `public/sfx/` içinde Kenney Impact Sounds, Interface Sounds ve RPG Audio paketlerinden (CC0) seçilmiş 50 ses var: tahta/halı adımları, gıcırtılar, altın, mücevher, çan, sandık mandalı, ağır darbeler, kapı ve arayüz sesleri. `manifest.json` her ses için varyant listesi, ses düzeyi ve rastgele perde aralığı tutuyor. `layer: true` olanlar sentez sesle birlikte çalıyor (örneğin taç = çan + fanfar). Cihaz .ogg çalabiliyorsa .ogg (0.6 MB), çalamıyorsa (eski iPhone Safari) aynı seslerin .wav kopyası (1.5 MB) yükleniyor. Örnek yüklenemezse o ses sentezle çalıyor. Ördek, ninni, horlama, kükreme ve müzik sentez olarak kaldı.

## Geliştirme kuralları (goat-game-creator yöntemi)
Tasarım ve denge sayıları için [DESIGN.md](DESIGN.md) dosyasına bak.
```bash
npm test                 # sim + söz testleri + karaborsa (pazarlık, tahmin aralığı, yetenek ağacı)
npm run balance          # bot 40 seed oynar: kaçış, uyandırma, ganimet
```
Debug adresleri: `?night=5&seed=7&sim=20` (botla 20 sn ilerlet, çiz), `?autoplay&speed=4`, `?gallery` (bütün modeller + eksik raporu), `?noassets`, `?lowfx`, `?r.chase.speedBase=5`, `?demo&wear=ninja&lantern=ghost&lang=ru&house=library&lup=2&screen=wardrobe|hideout|market|night`, gece adresine `&todark` (karanlık bölmeye ışınla) (dolu sığınak, kayda yazmaz).
Ekran görüntüsü: `node goat-game-creator/starter/scripts/shot.mjs "http://localhost:5173/?night=3&seed=7&sim=14" shots/x.png --size 1280x720`

## Dosyalar
- `src/rules.js`: bütün sayılar
- `src/sim.js`: saf oyun mantığı (step(dt), olaylar, sonuç)
- `src/bot.js`: açgözlü bot
- `src/texts.js`: kurallardan üretilen oyuncu metinleri
- `src/assets.js`: glTF yükleme, boyutlandırma, karakter animasyonları
- `src/main.js`: oyun döngüsü, durum makinesi, kamera, arayüz, dükkan
- `src/level.js`: prosedürel oda üretimi, canavar/etki tabloları, A*, çarpışma, görüş hattı
- `src/models.js`: toon materyalli 3D modeller (karakter, canavar, mobilyalar, hazineler)
- `src/textures.js`: canvas ile üretilen dokular
- `src/audio.js`: ses karıştırıcı, sentez sesler, müzik sıralayıcı, isteğe bağlı örnek yükleyici, ses ölçüm raporu
- `src/input.js`: dinamik joystick ve klavye
- `src/save.js`: localStorage kaydı
