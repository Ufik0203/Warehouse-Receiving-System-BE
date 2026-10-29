# Verifikasi backend mandiri

Tanggal: 2026-10-29 (Asia/Jakarta), sebelum Task 3. Node 24.12.0 dan npm 11.6.2. Source backend disalin ke folder temporary di luar proyek sumber; .git, node_modules, dist, env lokal dan generated Prisma Client tidak disertakan. Tidak ada package.json/workspaces atau node_modules pada parent salinan. Credential dan URL layanan tidak diberikan.

| Command dari root backend terisolasi | Exit code | Hasil |
| --- | --- | --- |
| npm ci dengan npm 11.6.2 | 0 | PASS; 406 packages diinstal, 407 diaudit, 0 vulnerabilities saat command dijalankan. |
| npm run lint | 0 | PASS; ESLint memakai konfigurasi dan paket lokal. |
| npm run typecheck | 0 | PASS; menghasilkan Prisma Client 7.10.1 melalui prisma.generate.config.ts, kemudian strict tsc. |
| npm run build | 0 | PASS; generate dan tsc build tanpa DATABASE_URL/database/server Redis. |
| npm ls --all --json | 0 | PASS; tidak ada problems. Seluruh dependency langsung ditemukan secara fisik di node_modules lokal salinan. |

Lockfile mandiri tidak berisi workspace link atau dependency file dari luar repository. Migrasi di salinan diperiksa byte-for-byte sama dengan proyek sumber. Ignore rules diperiksa dengan parser ignore tanpa menjalankan Git: dependency/build/cache/env/generated client diabaikan; lockfile, env template, tests dan seluruh migrations dipertahankan.

Unit/integration/runtime/database tests tidak diulang pada tahap ini: **NOT_RUN**. Tidak menjalankan migration, seed, Docker, perintah Git, staging/commit/remote/push atau penghapusan data/volume. Hasil runtime Task 2 tetap tersedia pada dokumentasi proyek sumber. Browser tidak relevan untuk pemeriksaan backend ini.


## Bukti asal tersedia lokal

Dokumentasi dan evidence proyek sumber kini ikut disertakan sebagai [arsip testing asli](history/combined/docs/testing.md) serta [manifest provenance](history/manifest.json). Tidak perlu folder induk untuk membaca bukti lama. Penyalinan ini bukan eksekusi ulang command di atas; status aslinya dipertahankan. Scope/status terbaru dan pemeriksaan dokumentasi ada pada [testing.md](testing.md).
