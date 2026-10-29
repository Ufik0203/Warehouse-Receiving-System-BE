# Testing Strategy and Evidence

> Sumber: [PROJECT_SPEC.md](../PROJECT_SPEC.md). Fondasi Task 2 telah diimplementasikan; autentikasi dan fitur bisnis belum tersedia. Status per pemeriksaan ada di docs/testing.md (relatif terhadap root proyek).

## Tujuan

Membuktikan bahwa implementasi memenuhi acceptance criteria, menjaga konsistensi stok, serta menegakkan authentication, CSRF, authorization, dan rate limiting.

## Testing layers

| Layer | Fokus |
| --- | --- |
| Unit | Domain rules, schema, mapper, hash canonicalization |
| Integration | Express + Prisma + PostgreSQL + Redis |
| Component | Form behavior dan state TanStack Query |
| End-to-end | Alur pengguna melalui browser |
| Deployment | Docker build, migration job, clean start, health |

Redis dan PostgreSQL nyata wajib dipakai untuk integration tests yang membuktikan session, limiter, transaction, dan concurrency.

## Authentication dan security tests

- CSRF bootstrap menghasilkan cookie session dan token.
- Login tanpa token ditolak.
- Login dengan token salah ditolak.
- Kredensial valid menghasilkan session ID baru.
- Pre-login session tidak dapat dipakai sebagai authenticated session.
- Response login tidak mengandung hash atau session ID.
- CSRF token session lama tidak berlaku setelah regeneration.
- /auth/me mengembalikan user aktif saat ini.
- Logout menghancurkan session.
- Session cookie lama ditolak setelah logout.
- Idle timeout berlaku.
- Absolute lifetime tetap berlaku meskipun session aktif digunakan.
- Role/status berubah menyebabkan session lama ditolak.
- Origin tidak dipercaya ditolak.
- Rate limiting menghasilkan 429 dan Retry-After.
- Dua instance API berbagi hit limiter melalui Redis.
- Kegagalan Redis menghasilkan 503 dan tidak menggunakan fallback in-memory.
- Cookie production memiliki Secure, HttpOnly, SameSite, Path, dan host-only behavior yang sesuai.
User management tests

- Operator tidak dapat membaca atau memodifikasi user management.
- Supervisor dapat membuat operator dan supervisor.
- Email berbeda kapitalisasi dianggap sama.
- Password tersimpan sebagai hash.
- Unknown fields ditolak.
- Update kosong ditolak.
- Email/password tidak dapat diubah melalui update endpoint.
- Self-demotion, self-disable, dan self-delete ditolak.
- Minimal satu supervisor aktif dipertahankan.
- Dua perubahan supervisor bersamaan tidak melanggar invariant.
- Soft delete menjaga referensi transaksi.
- User deleted tidak dapat login atau diaktifkan kembali.
- Delete ulang menghasilkan 204.
Receiving tests

| Kasus | Hasil yang diharapkan |
| --- | --- |
| Membuat dokumen expected 100 | Received 0, stok tidak berubah, OPEN |
| Receive 40 | Received 40, remaining 60, stock +40, PARTIAL |
| Receive 61 ketika remaining 60 | 409, seluruh data tidak berubah |
| Receive 60 | Received 100, remaining 0, total stock +100, COMPLETED |
| Receipt baru setelah completed | 409 |
| Replay final receipt | Receipt lama dikembalikan, stok tidak berubah |
| Satu item valid dan satu berlebih | Seluruh receipt rollback |
| Item dari dokumen lain | Ditolak tanpa perubahan |
| Quantity 0, negatif, pecahan, atau string | 400 |
| Item ID berulang | 400 |
| Key sama, payload berbeda | 409 |
| Key sama, actor berbeda | 409 |
| Payload sama, urutan item berbeda | Replay |
| Dua request sama secara bersamaan | Satu receipt dan satu pertambahan stok |
| Dua receipt masing-masing 7, expected 10 | Hanya satu diterima |
| Dua receipt 4 dan 6, expected 10 | Total tepat 10 |
| Dua dokumen menerima produk yang sama | Balance merupakan total kedua receipt |
| Database gagal setelah sebagian write | Semua perubahan rollback |

Late-failure test harus memicu kegagalan database setelah setidaknya satu write dilakukan, bukan hanya gagal pada validasi awal.

## Reconciliation tests

Jalankan pemeriksaan:
balance per product = jumlah ledger per product

## received per receiving item = jumlah ledger per receiving item

## 0 <= received <= expected

## COMPLETED jika dan hanya jika seluruh item fully received

Pastikan pemeriksaan dilakukan setelah:

- Successful receiving.
- Rejected receiving.
- Duplicate replay.
- Concurrent requests.
- Injected database failure.
Frontend tests

- Login memperoleh pre-login CSRF terlebih dahulu.
- Login memakai mutation dan menggunakan CSRF baru dari response.
- Refresh mengambil /auth/me dan tetap mengenali session.
- Operator tidak melihat kontrol user management atau create product.
- Backend tetap menolak akses langsung yang tidak berizin.
- Receiving mutation menginvalidasi query yang benar.
- Mutation pending mencegah submit ganda dari UI.
- Tidak ada optimistic stock increment.
- Response hilang setelah commit tetap menghasilkan pending operation.
- Reload dan login ulang mempertahankan key serta payload operation tersebut.
- Replay menghasilkan stok tetap, bukan bertambah dua kali.
- Refetch failure setelah successful receipt tidak memicu receipt baru.
- Pergantian user tidak menampilkan query cache user sebelumnya.
Deployment tests

- Docker image backend dan frontend berhasil dibangun.
- PostgreSQL dan Redis healthy.
- Migration berjalan dari database kosong.
- Seed membuat akun tanpa secret hardcoded.
- API menunggu initialization berhasil.
- Readiness memeriksa PostgreSQL dan Redis.
- Restart API tidak menghilangkan session yang masih valid di Redis.
- Menjalankan migration deploy kembali tidak menduplikasi schema.
- Shutdown menutup HTTP server, Prisma, dan Redis dengan benar.
Evidence format

Setiap bukti memuat:
Command:
Environment:
Date:
Exit code:
Observed output:
Requirement IDs:

Status awal seluruh check:
NOT_RUN

Jangan menulis PASS berdasarkan keberadaan file tes.

## Known limitations awal

- Satu gudang dan satuan pcs.
- Tidak tersedia koreksi atau pembatalan penerimaan.
- Tidak tersedia reset password atau perubahan email.
- SessionStorage pending operation hilang jika tab/storage dihapus.
- Belum ada hasil load test atau SLA.
- Public deployment belum dilakukan.
- Pengujian dan Docker verification menunggu implementasi.
Daftar ini diperbarui setelah implementasi, bukan dihapus otomatis.

## Bukti aktual Task 1

Tanggal: 2026-10-29 (Asia/Jakarta). Environment: Windows PowerShell, Python 3.12.7, Node v24.12.0, npm 10.4.0. Alat dokumentasi: openapi-spec-validator 0.7.2, PyYAML 6.0.3, openapi-schema-validator 0.6.3. Tidak ada dependency aplikasi diinstal, database dibuat, atau runtime aplikasi dijalankan.

| Command / pemeriksaan | Exit code | Hasil aktual |
| --- | --- | --- |
| `python -m venv .tmp-doc-validation` kemudian interpreter tersebut menjalankan pip | 1 | ensurepip gagal; interpreter sementara tidak memiliki modul pip. Tidak dipakai sebagai validator. |
| `python -m pip install --target .tmp-doc-tools openapi-spec-validator==0.7.2` | 0 | Validator dan dependency alat berhasil dipasang terisolasi melalui pip; tidak mengubah manifest/lockfile aplikasi. |
| `node --version` / `npm --version` | 0 | v24.12.0 / 10.4.0; observasi host, bukan pilihan patch terbaru. |
| `python docs/validation/build-openapi.py` | 0 | Generated OpenAPI: 15 paths, 20 operations, 22 schemas. |
| `python -m openapi_spec_validator docs/openapi.yaml` — percobaan awal | 1 | Schema UpdateUserInput memuat required array kosong yang tidak sah pada OpenAPI 3.0; diperbaiki dengan menghilangkan required dan mempertahankan minProperties=1. |
| Command validator yang sama — percobaan kedua | 1 | Referensi Error400 belum cocok dengan nama key component; nama shared responses diperbaiki. |
| Command validator yang sama — sesudah perbaikan | 0 | `docs/openapi.yaml: OK`. |
| `python docs/validation/check-docs.py` | 0 | Source SHA256 tetap; set source/PRD/mapping tepat 87 ID unik, satu baris per ID, semua test implementasi NOT_RUN. Endpoint Markdown dan OpenAPI sama: 20 operasi/15 path. Field DTO, role, CSRF, cookie, limits, replay, 204 dan strict inputs diperiksa; 162 pemakaian contoh request/response lolos schema validation. |
| Pemeriksaan diagram dalam check-docs.py | 0 | Struktur tujuh entitas/sepuluh relasi ERD dan urutan lock/idempotency/completed/commit/response sequence lolos pemeriksaan statis. Ini bukan eksekusi parser Mermaid. |
| Review semantik dokumen dan diagram | N/A | Dilakukan; temuan dan batas keputusan dicatat pada spec-review.md. Rencana dependency ditinjau memakai sumber resmi yang ditautkan pada dependency-plan.md; bukan runtime proof. |

Hash sumber aktual:

```text
SHA256 PROJECT_SPEC.md
901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b
```

Output pemeriksaan akhir:

```text
docs/openapi.yaml: OK
PASS: source SHA256 unchanged; source/PRD/mapping agree on 87 unique IDs, all implementation checks NOT_RUN
PASS: OpenAPI 3.0.3 validator; Markdown parity 20 operations / 15 paths; DTO fields, roles, CSRF, cookies, limits, replay, 204, strict inputs; 162 examples validated
PASS: Markdown fences; diagram structure/order cross-check. Mermaid parser/rendering: NOT_RUN; runtime/concurrency/DB/security/frontend/deployment: NOT_RUN
```

Keterkaitan requirement: pemeriksaan set ID menyentuh traceability seluruh 87 ID; validator/kontrak memeriksa artefak API untuk FR-AUTH, FR-USER, FR-PROD, FR-REC, FR-INV, FR-OPS. Tidak satu pun PASS dokumentasi di atas merupakan PASS implementasi requirement tersebut. Mapping per requirement tetap NOT_RUN.

## Menjalankan ulang pemeriksaan dokumentasi

Alat ini hanya memeriksa dokumentasi, bukan dependency aplikasi. Folder `.tmp-doc-tools` dan `.tmp-doc-validation` dibersihkan setelah verifikasi Task 1. Siapkan ulang target alat terisolasi bila ingin mengulang:

```powershell
python -m pip install --target .tmp-doc-tools -r docs/validation/requirements.txt
$env:PYTHONPATH = Join-Path (Get-Location) '.tmp-doc-tools'
python docs/validation/build-openapi.py
python -m openapi_spec_validator docs/openapi.yaml
python docs/validation/check-docs.py
```

build-openapi.py menghasilkan artefak YAML berdasarkan struktur DTO Markdown dan detail eksplisit kontrak; penambahan/pengubahan aturan harus meninjau generator dan Markdown bersama. check-docs.py membandingkan inventaris operasi dan DTO inti, memeriksa batas/security tertentu serta contoh; review semantik tetap diperlukan. Alat tidak menjalankan normalisasi backend, memeriksa SQL, menguji error precedence, atau membuktikan authorization/concurrency.

| Pemeriksaan yang belum dijalankan | Status |
| --- | --- |
| Mermaid parser dan rendering ketiga diagram | NOT_RUN |
| npm install/ci aplikasi, npm ls dan lockfile reproducibility | NOT_RUN |
| Compiler/lint/build aplikasi dan kompatibilitas native Argon2/Express 5 CSRF | NOT_RUN |
| Prisma validate/generate, SQL constraints, migrasi/seed nyata | NOT_RUN |
| Unit/integration/security/concurrency/reconciliation runtime | NOT_RUN |
| Component/browser/lost-response tests | NOT_RUN |
| Docker build, clean startup, readiness, shutdown | NOT_RUN |
| Review isi PDF assessment dan load test/SLA | NOT_RUN |

## Bukti aktual Task 2

Tanggal: 2026-10-29 (Asia/Jakarta). Environment host: Windows, Node 24.12.0; npm global 10.4.0, npm install/ci terverifikasi 11.6.2 melalui npx. Docker engine 29.8.0 dan Compose v5.5.1. Versi paket exact dicatat pada dependency-versions.json dan package-lock.json. Bukti ini menggantikan status NOT_RUN fondasi yang dicatat pada snapshot Task 1, bukan mengklaim fitur bisnis sudah teruji.

### Isolasi dan keadaan data

- Project Docker baru: `wrs-task2-cf98214e`.
- Database baru: `wrs_task2_cf98214e_test`; PostgreSQL hanya di host loopback port 55439. Redis terpisah di loopback port 56389. Tidak memakai service PostgreSQL Windows yang sudah ada (teramati stopped).
- File credential: `backend/env/.env.verification`, diabaikan Git; nilai acak tidak dicetak di dokumen/log. Flag `RUN_FOUNDATION_INTEGRATION=true` diperlukan.
- Sebelum startup, pencarian volume dengan label project baru kosong. `verify:database` kemudian memastikan public schema memiliki nol tabel sebelum deploy pertama.
- Tidak ada database/volume dihapus. Setelah seluruh pemeriksaan, hanya container project ini dihentikan. Volume yang tetap ada: `wrs-task2-cf98214e_postgres_data` dan `wrs-task2-cf98214e_redis_data`.
- API smoke-test port 3301 sudah dihentikan. Test listener ephemeral pada integration ditutup melalui jalur shutdown yang menutup Prisma dan Redis.

### Command dan hasil

Pada command aplikasi yang memerlukan config, environment ditetapkan dengan:

```powershell
$env:BACKEND_ENV_FILE = Join-Path (Get-Location) 'backend/env/.env.verification'
```

| Command / pemeriksaan | Exit code aktual | Hasil |
| --- | --- | --- |
| `npm install --offline=false` dengan npm 10.4.0 | 1 | Gagal internal Arborist: Cannot read properties of null (reading edgesOut). |
| `npx --yes --offline=false --package=npm@10.9.8 npm install --offline=false` | 1 | Gagal resolver internal yang sama. Tidak memakai legacy-peer-deps/force. |
| Percobaan npm 11.6.2 sebelum engines manifest diperbarui | 1 | EBADENGINE karena manifest masih meminta npm <11; range diperbarui berdasarkan kompatibilitas resmi. |
| `npx --yes --offline=false --package=npm@11.6.2 npm install --offline=false` | 0 | 455 packages ditambahkan, 458 diaudit, 0 vulnerabilities. |
| Command npm 11.6.2 `install --package-lock-only --offline=false` | 0 | Lockfile diselaraskan sesudah manifest dikunci exact. |
| `npx --yes --offline=false --package=npm@11.6.2 npm ci --offline=false` | 0 | Instalasi ulang dari lockfile berhasil; 455 packages ditambahkan, 458 diaudit, 0 vulnerabilities. |
| `npm ls --all --json` | 0 | Dependency tree tidak memiliki problems; output sementara diperiksa sebagai JSON. |
| `npm run typecheck` | 0 | Backend dan frontend strict TypeScript lulus; termasuk source seed/tests/scripts. Tidak memakai skipLibCheck atau type suppression untuk menyembunyikan incompatibility. |
| `npm run lint` | 0 | ESLint lulus pada source/config fondasi. |
| `npm run prisma:validate -w backend` | 0 | Seluruh schema di folder prisma valid, termasuk relation komposit yang berbagi receivingId/productId. |
| `npm run prisma:generate -w backend` | 0 | Prisma Client 7.10.1 dihasilkan di backend/src/generated/prisma. |
| `node node_modules/prisma/build/index.js migrate diff --config backend/prisma.config.ts --from-empty --to-schema backend/prisma --script` | 0 setelah eskalasi | Menghasilkan initial SQL; sembilan CHECK ditambahkan sebelum migrasi diterapkan. Schema engine awal gagal spawn EPERM dalam sandbox. |
| `docker compose -p wrs-task2-cf98214e --env-file backend/env/.env.verification config -q` | 0 | Konfigurasi Compose valid. |
| Compose project yang sama `up -d --wait postgres redis` | 0 | PostgreSQL 17.11 dan Redis 8.2.11 healthy, volume baru. Versi dibaca dari image sebelum pin tag/digest. |
| `npm run verify:database -w backend` | 0 setelah eskalasi | Public schema semula kosong. Deploy pertama menerapkan 202610290001_initial, deploy kedua No pending migrations to apply. Snapshot definisi kolom, constraint dan riwayat migrasi tetap identik. |
| `npm run db:seed -w backend`, dijalankan dua kali | 0 / 0 | Kedua command berhasil; existing accounts preserved. |
| `npm run test:foundation` | 0 | 2 file, 8 tests passed. Environment validation dan safe errors, seed input/code points, health bodies/400/503 dan belum adanya business/auth routes. |
| `npm run test:integration -w backend` | 0 | 1 file, 7 tests passed dengan PostgreSQL dan Redis nyata. Rincian di bawah. |
| `npm run build` | 0 setelah eskalasi | Backend generate+tsc dan frontend tsc+Vite build berhasil. Backend dibangun ulang setelah perubahan health validator terakhir. |
| `node backend/dist/server.js` dengan env verifikasi | Proses berjalan | API listen pada port 3301 sesudah dependencies siap. Invoke-RestMethod ke live/ready exit 0 dengan body kontrak tepat. Listener dihentikan setelah smoke test. |
| `node backend/dist/server.js` dengan BACKEND_ENV_FILE menunjuk .env.example | 1, diharapkan | Environment kosong ditolak: DATABASE_URL, REDIS_URL dan SESSION_SECRET disebut jelas tanpa mencetak value. |
| Compose project verifikasi `stop postgres redis`, kemudian `docker volume ls` dengan label project | 0 | Container dihentikan, kedua volume tetap tersedia. |
| `Get-FileHash -Algorithm SHA256 PROJECT_SPEC.md` | 0 | Hash tetap 901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b. |

Tes integration tujuh kasus membuktikan:

1. Real HTTP listener menjadi ready dan dapat ditutup melalui shutdown yang sama dengan signal handler; server tidak lagi listen setelah shutdown.
2. Health app membaca PostgreSQL/schema dan Redis PING nyata, menghasilkan response 200 sesuai kontrak.
3. Database tetap memiliki dua akun; rerun seed dengan nama/password input yang sengaja berbeda mempertahankan seluruh baris dan hash lama. Password awal tetap lolos Argon2 verify. Hash tidak dicetak saat assertion gagal.
4. Sembilan CHECK ada dalam katalog PostgreSQL dan kedua composite FK memakai ON DELETE RESTRICT.
5. Quantity nol dan ledger yang receipt-nya berasal dari dokumen berbeda ditolak database; seluruh fixture transaksi rollback, tanpa residual product.
6. Koneksi PostgreSQL ke port yang tidak tersedia menghasilkan readiness 503 sementara liveness 200.
7. Client Redis nyata yang telah ditutup menghasilkan readiness 503.

Output ringkas yang teramati:

```text
PASS: dedicated verification database has zero public tables before migration.
All migrations have been successfully applied.
No pending migrations to apply.
PASS: repeated migration deploy preserved all column/constraint definitions and migration history.
Seed completed; existing accounts preserved.
Test Files  2 passed (2)
Tests       8 passed (8)
Test Files  1 passed (1)
Tests       7 passed (7)
{"status":"ok"}
{"status":"ready","dependencies":{"postgres":"up","redis":"up"}}
Invalid environment: DATABASE_URL: Invalid URL; DATABASE_URL: Must be a PostgreSQL URL; REDIS_URL: Invalid URL; REDIS_URL: Must be a Redis URL; SESSION_SECRET: Must contain at least 32 bytes
```

### Kegagalan yang diperbaiki dan batas bukti

- Sandbox menolak child process schema engine/esbuild/tsx/Vitest dengan spawn EPERM; command yang diperlukan dijalankan ulang dengan izin eskalasi dan hasil lulus dicatat terpisah. Kegagalan ini tidak disebut PASS sebelum rerun.
- Percobaan awal environment kosong hanya menghasilkan Invalid URL karena refinement memanggil URL constructor sebelum validasi selesai. Predicate dibuat aman terhadap input invalid; tes unit diperbarui dan command startup diulang, kini menyebut nama field secara jelas.
- Ctrl+C melalui PTY Windows tidak menghasilkan shutdown yang dapat dikonfirmasi. Listener smoke test dihentikan secara terarah setelah identitas proses diverifikasi; ini tidak diklaim sebagai bukti signal handling. Jalur shutdown diuji langsung dengan resource nyata melalui startServer/shutdown integration.
- Build frontend menampilkan warning annotation PURE dari dependency Zod, dan registry memberi deprecation warning ESLint 9.39.5. Build/lint tetap exit 0; tidak menonaktifkan check atau mengabaikan peer conflicts.
- Test integration ini khusus fondasi. Ia tidak membuktikan atomic receiving, revocation/authentication, CSRF, rate limiting, browser UI atau deployment API/web.

| Pemeriksaan tahap berikutnya | Status setelah Task 2 |
| --- | --- |
| Session/CSRF/limiter, csrf-sync dengan Express 5, revocation/security tests | NOT_RUN |
| Receiving service/concurrency/idempotency/reconciliation dengan endpoint bisnis | NOT_RUN |
| User management authorization/concurrency | NOT_RUN |
| Frontend component/browser/lost-response flows | NOT_RUN |
| Signal OS pada PTY Windows yang terkonfirmasi | NOT_RUN |
| Native Argon2 Linux, API/frontend Docker images, full Compose deployment | NOT_RUN |
| Mermaid parser/rendering, PDF assessment, load test/SLA | NOT_RUN |

Tidak ada blocker lingkungan tersisa untuk memulai implementasi Task 3. Layanan verifikasi sengaja dihentikan sesudah tes; jalankan kembali Compose project yang sama untuk tes lanjutan, atau gunakan project/database baru bila hendak mengulang bukti database kosong. Pertanyaan R-10/R-11/R-13 tetap terbuka sebelum endpoint bisnis terkait dan tidak diselesaikan secara spekulatif pada Task 2.

Pemeriksaan statis penutup dengan Python juga exit 0: hash PROJECT_SPEC.md tetap sama; seluruh versi dependency langsung exact dan cocok dengan lockfile; Markdown code fences seimbang; credential acak verifikasi tidak ditemukan dalam 67 file source/dokumentasi non-secret yang diperiksa. File env aktual, node_modules, dist, generated client dan cache dikecualikan dari pemindaian source tersebut.

## Bukti aktual Task 2A

Task: **Task 2A — Fondasi UI**. Tanggal: 2026-10-29 (Asia/Jakarta). Bukti ini ditambahkan sesudah Task 2; tidak menggantikan hasil database, seed, health atau lifecycle Task 2.

Environment: Windows, Node 24.12.0, npm install 11.6.2 melalui npx sesuai packageManager existing. React/ReactDOM 19.3.1, Vite 7.3.7, plugin-react 5.2.0, Router 7.18.5, Query 5.105.0 dan types React/ReactDOM 19.3.0 dipertahankan. Dependency final: @heroui/react/styles 3.2.6, tailwindcss/@tailwindcss/vite 4.3.3, seluruhnya exact pada workspace frontend dan lockfile.

| Command / pemeriksaan | Exit code aktual | Hasil |
| --- | --- | --- |
| npm 11.6.2 `view @heroui/react@3 version peerDependencies --json` | 0 | HeroUI v3 memerlukan React/ReactDOM >=19 dan Tailwind >=4; existing React memenuhi, tanpa perubahan versi React. Metadata plugin Tailwind 4.3.3 juga menerima Vite ^7. |
| `npx --yes --offline=false --package=npm@11.6.2 npm install -w frontend --save-exact @heroui/react@3.2.6 @heroui/styles@3.2.6 --offline=false` dan install dev tailwindcss/@tailwindcss/vite 4.3.3 | 0 | HeroUI/styles runtime dan compiler/plugin dev ditambahkan ke frontend. Root npm/workspaces dan paket backend tidak diubah. |
| Typecheck/build awal, sebelum keputusan optional-property | 1 | Deklarasi React Aria GroupProps/OverlayArrowProps tidak cocok dengan DOMProps.id saat exactOptionalPropertyTypes true. Ini kegagalan nyata yang tidak diklaim PASS. |
| Percobaan peer pin React Aria Components 1.21.1/react-aria 3.52.1 dan HeroUI 3.0.5 | Install 0; typecheck 1 | GroupProps tetap tidak kompatibel. Percobaan dibatalkan; dependency pin percobaan tidak tertinggal pada manifest final. |
| Reinstall langsung dari tree versi percobaan ke HeroUI 3.2.6 | 1 | ERESOLVE; diselesaikan dengan uninstall/reinstall HeroUI tanpa force/legacy-peer-deps. Install final exit 0, audit 519 packages, 0 vulnerabilities pada waktu command dijalankan. |
| `npm run lint -w frontend` | 0 | ESLint frontend lulus. |
| `npm run typecheck -w frontend` setelah konfigurasi kompatibilitas | 0 | strict true, skipLibCheck false dan noUncheckedIndexedAccess true; hanya exactOptionalPropertyTypes frontend diubah false. Backend/root tetap true untuk opsi itu. |
| `npm run build -w frontend` | 0 setelah eskalasi | Vite 7.3.7 membangun 433 modules; CSS 421.37 kB (gzip 39.05 kB), JS 433.39 kB (gzip 136.46 kB). Warning PURE komentar Zod tetap nonfatal seperti Task 2. Percobaan sandbox sebelumnya gagal spawn EPERM; dijalankan ulang dengan izin child process. |
| `npm ls -w frontend --depth=0` dan `npm ls -w frontend --all --json` | 0 | Dependency terpasang sesuai manifest dan tree tanpa problems; peer tidak diabaikan. |
| `node .cache/task-2a-browser.mjs` (helper sementara Chrome DevTools Protocol) | 0 | Production preview localhost:4173 dan Chrome headless memakai profile baru terisolasi. Desktop/mobile, computed CSS, pointer click/onPress, disabled state, router fallback, zero runtime exceptions dan tidak ada API bisnis lulus. Helper menutup preview/browser setelah selesai. |
| Inspeksi visual screenshot desktop/mobile | N/A | Dilakukan. Teks/card/tombol terlihat, layout mobile terbungkus tanpa overflow horizontal. Ini bukan full accessibility audit. |
| `Get-FileHash -Algorithm SHA256 PROJECT_SPEC.md` | 0 | Tetap 901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b. |

### Keputusan typing yang memengaruhi bukti

Frontend exactOptionalPropertyTypes false mengizinkan optional prop diberi undefined secara eksplisit; ini pengecualian terhadap pemeriksaan tambahan Task 2. strict true tetap memenuhi baseline TypeScript strict. Tidak mengubah React atau types React, tidak menonaktifkan library declaration checking, dan tidak memakai @ts-ignore, explicit any atau patch node_modules. Pengecualian serta dampaknya dicatat pada technical-spec/dependency-plan; perlu ditinjau kembali ketika tipe upstream diperbaiki. PASS typecheck di atas berlaku untuk konfigurasi final ini, bukan untuk exactOptionalPropertyTypes true.

### Bukti browser

- Browser aktual: Chrome/156.0.8078.73 headless.
- Desktop 1280×900; mobile emulation 390×844.
- Utility Tailwind terukur: padding main 24px, padding blok 16px, radius blok 12px, background emerald nontransparent.
- HeroUI button memiliki class button--primary dan background accent nontransparent; button kedua disabled. Pointer click nyata mengubah status lokal dari 0 menjadi 1 kali.
- Route tidak dikenal menampilkan fallback router existing. Tidak ada Runtime.exceptionThrown dan tidak ada request ke /api/ selama smoke check.
- [Screenshot desktop](evidence/task-2a-desktop.png), [screenshot mobile](evidence/task-2a-mobile.png), [hasil browser terstruktur](evidence/task-2a-browser.json).

Output browser teramati:

```text
PASS: Chrome desktop/mobile smoke, computed styles, HeroUI onPress/disabled, router fallback; no runtime exceptions or business API calls.
```

Halaman contoh tidak memakai data bisnis, tidak menambah route bisnis dan tidak mengganti QueryClientProvider atau BrowserRouter. Counter merupakan state lokal, bukan server mutation. Bukti ini memeriksa integrasi UI dasar, bukan keseluruhan komponen HeroUI atau alur produk.

| Pemeriksaan di luar smoke Task 2A | Status |
| --- | --- |
| Keyboard interaction lengkap dan audit aksesibilitas | NOT_RUN |
| Firefox/Safari/Edge dan perangkat mobile fisik | NOT_RUN |
| Dark theme dan seluruh varian/komponen HeroUI | NOT_RUN |
| Browser suite autentikasi/receiving/user management | NOT_RUN |
| Backend/database test ulang untuk perubahan UI ini | NOT_RUN; bukti Task 2 tetap historis |

## Verifikasi persiapan dua repository mandiri

Tanggal: 2026-10-29 (Asia/Jakarta), sebelum Task 3. Backend/frontend tetap berada di proyek sumber, tetapi konfigurasi dan dependency build kini tersedia pada masing-masing folder. Tidak ada perintah Git, migration, seed, Docker atau operasi database/volume dijalankan pada tahap ini.

### Metode isolasi

`python docs/validation/verify-standalone.py` membuat salinan baru dalam direktori temporary di luar workspace sumber. Run yang berhasil memakai `C:\Users\mario\AppData\Local\Temp\wrs-standalone-aqndopox`. Tidak menyalin .git, node_modules, dist, cache, env lokal atau generated Prisma Client. Parent salinan tidak memiliki package.json/workspaces; setiap dependency langsung juga diperiksa ada secara fisik dalam node_modules repository itu sendiri.

DATABASE_URL, REDIS_*, POSTGRES_*, SESSION_*, SEED_*, BACKEND_ENV_FILE, NODE_PATH dan flag integration dikeluarkan dari environment command verifikasi. Backend typecheck/build menggunakan config codegen tanpa datasource, bukan dummy credential atau koneksi database. Template env tetap disertakan. Source dan salinan temporary tidak dihapus setelah pemeriksaan.

| Command pada masing-masing root repository terisolasi | Backend | Frontend |
| --- | --- | --- |
| npm ci, dijalankan dengan npm 11.6.2 melalui npx | PASS, exit 0 | PASS, exit 0 |
| npm run lint | PASS, exit 0 | PASS, exit 0 |
| npm run typecheck | PASS, exit 0; Prisma Client 7.10.1 dihasilkan dahulu | PASS, exit 0 |
| npm run build | PASS, exit 0; generate + tsc | PASS, exit 0; tsc + Vite 7.3.7 |
| npm ls --all --json | PASS, exit 0, tanpa problems | PASS, exit 0, tanpa problems |
| Dependency langsung tersedia lokal dan versi sesuai manifest exact | PASS | PASS |

Command aktual memakai prefix berikut pada salinan masing-masing, bukan flags workspace:

```text
npx --yes --offline=false --package=npm@11.6.2 npm ci --offline=false
npx --yes --offline=false --package=npm@11.6.2 npm run lint
npx --yes --offline=false --package=npm@11.6.2 npm run typecheck
npx --yes --offline=false --package=npm@11.6.2 npm run build
npx --yes --offline=false --package=npm@11.6.2 npm ls --all --json
```

Lockfile mandiri dibuat terlebih dahulu dengan `npm install --package-lock-only --ignore-scripts --offline=false` di salinan, lalu disalin ke backend/package-lock.json dan frontend/package-lock.json. Audit backend saat install: 406 packages ditambahkan, 407 diaudit, 0 vulnerabilities; frontend: 242 ditambahkan, 243 diaudit, 0 vulnerabilities. Ini snapshot saat command berjalan. Root lockfile juga diselaraskan menggunakan package-lock-only/ignore-scripts agar mode workspace sumber tetap konsisten.

Backend memiliki metadata lockfile atas nama @wrs/backend; frontend @wrs/frontend. Pemeriksaan statis exit 0 memastikan tidak ada workspace link atau resolved file/../ dalam kedua lockfile. Hash lockfile lokal cocok dengan salinan yang diuji. Seluruh file dalam backend/prisma/migrations diperiksa byte-for-byte sama dengan salinan; tidak ada applied migration yang diedit.

Parser ignore memeriksa .gitignore masing-masing tanpa menjalankan Git: node_modules/dist/cache/env lokal/generated Prisma Client diabaikan; package-lock.json, .env.example (termasuk template env nested), source, tests, migration SQL dan migration_lock.toml tetap tidak diabaikan. Hasil: PASS, exit 0.

### Kegagalan helper dan batas bukti

- Percobaan pertama helper berhenti dengan UnicodeEncodeError saat mencetak tanda centang keluaran Prisma pada konsol cp1252 Windows. Log child command sudah tertulis; helper diperbaiki memakai UTF-8 dan diulang penuh pada salinan baru. Run akhir exit 0 dan hasil kedua repository dicatat dalam [results.json](evidence/standalone/results.json).
- Pemeriksaan pembanding migrasi awal mendapat PermissionError saat membaca temporary directory di luar sandbox. Command diulang dengan izin baca yang sesuai dan exit 0; tidak mengubah database atau file metadata Git.
- Warning deprecated ESLint dan annotation PURE Zod nonfatal tetap terlihat seperti tahap sebelumnya. Tidak mengubah versi langsung yang telah disepakati atau melewati peer conflicts.
- Frontend menghasilkan 433 modules, CSS 421.37 kB dan JS 433.39 kB; assets build sama dengan fondasi UI Task 2A.
- Lockfile standalone menyelesaikan dependency transitive secara independen; tidak mengasumsikan hasil deduplikasi root workspace. Dependency langsung tetap versi exact yang sama.

| Pemeriksaan yang tidak dijalankan ulang | Status |
| --- | --- |
| Unit/integration/runtime backend dan frontend browser | NOT_RUN |
| Migrasi/seed ulang, koneksi PostgreSQL/Redis dan Docker Compose lokal baru | NOT_RUN |
| Operasi Git, staging/commit/remote/push, GitHub provisioning | NOT_RUN; diserahkan manual kepada pengguna |
| Task 3 auth/session/CSRF/limiter | NOT_RUN |

PROJECT_SPEC.md tetap SHA256 901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b. Root workspaces, dokumen sumber, database/volume dan metadata Git existing dipertahankan. README mandiri serta ringkasan verifikasi lokal juga tersedia dalam backend/ dan frontend/ agar instruksi install/build tidak bergantung pada dokumentasi parent.
