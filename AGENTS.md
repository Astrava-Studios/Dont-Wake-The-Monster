# Ajan kuralları

## Worktree
- `main`'de çalışma. Her değişiklik: `git worktree add ../DontWakeTheMonster-wt/<dal> -b <dal>` (güncel `main`'den).
- `npm install` yapma: `cmd //c mklink /J node_modules ..\..\DontWakeTheMonster\node_modules`. `Assets/` için ana klasörü kullan.
- Bitince dalda commit et, `git push -u origin <dal>` ve `gh pr create --fill` ile PR aç (ayrıca sorma). Sonra PR linkiyle merge için kullanıcıdan onay iste. Onay gelmeden merge etme.
- Onaydan sonra önce worktree'de `cmd //c rmdir node_modules` (junction varsa; yoksa gh ana `node_modules`'u silebilir). Sonra ana klasörde `gh pr merge <no> --merge --delete-branch` ve `git pull -q`. gh merge'ü GitHub'da yapar, uzak ve yerel dalı, worktree'yi de siler. Ayrı push ya da silme gerekmez.
- Yarım worktree'yi silmeden sor.

## Token tasarrufu
- Büyük dosyaları (`src/main.js`, `src/style.css`) bütün okuma: önce `grep`, sonra ilgili satırlar.
- Komut çıktısını kıs: `-q`, `--silent`, `| tail`.
- Doğrulamayı metinle yap (`read_page`, konsol, JS). Ekran görüntüsünü yalnızca görsel değişiklikte, küçük boyutta al.
