# Ajanlar için kurallar

## Çalışma akışı: her değişiklik kendi worktree'sinde

`main` dalında doğrudan çalışma. Her değişiklik için yeni bir dal ve worktree aç, işi orada yap, bitince `main`'e merge et ve worktree'yi sil.

1. **Aç:** ana klasörden, güncel `main` üzerinden
   ```bash
   git switch main && git pull
   git worktree add ../DontWakeTheMonster-wt/<dal-adi> -b <dal-adi>
   cd ../DontWakeTheMonster-wt/<dal-adi> && npm install
   ```
   Dal adı kısa ve işi anlatsın: `menu-layout`, `fix-ios-audio`.
2. **Çalış:** tüm düzenlemeler, testler (`npm test`) ve commit'ler bu worktree'de yapılır. Ana klasördeki `main`'e dokunma.
3. **Merge et:** iş bitip testler geçince ana klasöre dön
   ```bash
   cd ../../DontWakeTheMonster
   git switch main && git pull
   git merge --no-ff <dal-adi>
   ```
   Çakışma çıkarsa ana klasörde çöz, testleri tekrar çalıştır.
4. **Temizle:** merge'den sonra worktree'yi ve dalı sil
   ```bash
   git worktree remove ../DontWakeTheMonster-wt/<dal-adi>
   git branch -d <dal-adi>
   ```
5. **Push:** `main`'i yalnızca kullanıcı isterse push et.

Notlar:
- Git'e girmeyen dosyalar (`node_modules`, `Assets/`, `dist/`) yeni worktree'ye gelmez. `npm install` şart, `Assets/` gerekiyorsa ana klasördeki yolu kullan.
- Aynı anda birden fazla iş varsa her biri kendi worktree'sinde ve dalında olur. İki iş aynı dosyalara dokunuyorsa sırayla merge et.
- Yarım kalan ya da vazgeçilen bir worktree'yi silmeden önce kullanıcıya sor.
