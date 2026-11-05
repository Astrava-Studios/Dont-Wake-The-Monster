# Ajan kuralları

## Worktree
- `main`'de çalışma. Her değişiklik: `git worktree add ../DontWakeTheMonster-wt/<dal> -b <dal>` (güncel `main`'den).
- `npm install` yapma: `cmd //c mklink /J node_modules ..\..\DontWakeTheMonster\node_modules`. `Assets/` için ana klasörü kullan.
- Bitince ana klasörde `git merge --no-ff <dal>`, sonra `cmd //c rmdir node_modules` (önce junction), `git worktree remove`, `git branch -d`.
- Push yalnızca kullanıcı isterse. Yarım worktree'yi silmeden sor.

## Token tasarrufu
- Büyük dosyaları (`src/main.js`, `src/style.css`) bütün okuma: önce `grep`, sonra ilgili satırlar.
- Komut çıktısını kıs: `-q`, `--silent`, `| tail`.
- Doğrulamayı metinle yap (`read_page`, konsol, JS). Ekran görüntüsünü yalnızca görsel değişiklikte, küçük boyutta al.
