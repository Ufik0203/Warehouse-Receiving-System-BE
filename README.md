# Warehouse Receiving System - Backend

API penerimaan gudang: session authentication/CSRF, supervisor-managed users, produk, receiving partial/full, inventory dan ledger transaksi. OPERATOR dan SUPERVISOR dapat membuat/menerima receiving serta melihat stok/history; hanya SUPERVISOR membuat produk dan mengelola user. Contoh expected 100 diterima 40 lalu60 menghasilkan PARTIAL lalu COMPLETED, stok 100. Receipt memakai transaksi PostgreSQL dan idempotency UUID agar retry tidak menggandakan stok.

Stack: Express 5.3.0, TypeScript 5.9.3 strict, Prisma CLI/Client/adapter7.10.1, PostgreSQL 17.11, Redis 8.2.11. app.ts terpisah dari server.ts; route/controller/service/repository/mapper memisahkan HTTP, aturan bisnis, transaksi, database dan DTO aman.

Repository pasangan: **Warehouse-Receiving-System-FE**. URL GitHub pasangan belum tercantum dalam metadata/dokumen yang tersedia saat penulisan; tidak ditebak. OpenAPI backend adalah sumber utama kontrak; konsumen frontend harus memakai kontrak yang sama.

## Hubungan dua repository

Kedua aplikasi memiliki package.json, package-lock.json, node_modules, konfigurasi dan Dockerfile masing-masing. Tidak membutuhkan npm workspaces atau konfigurasi parent. Untuk full application, siapkan kedua checkout; nama folder bebas. Contoh layout yang cocok dengan default build context Compose:

```text
workspace/
  backend/    # checkout Warehouse-Receiving-System-BE
  frontend/   # checkout Warehouse-Receiving-System-FE
```

Compose full deployment berada di checkout backend, `deploy/compose.yaml`. Backend context `..` dihitung dari folder deploy; FRONTEND_CONTEXT default `../../frontend` menunjuk sibling frontend. Jika memakai nama folder lain, isi FRONTEND_CONTEXT dengan path relatif dari folder deploy atau path absolut root checkout frontend. Install/build frontend sendiri tidak memerlukan checkout backend; integrasi runtime dan full deployment memerlukannya.

## Setup dari checkout bersih

Prasyarat: **Node.js 24.12.0**, **npm 11.6.2** (engines Node>=24.12.0 <25 dan npm>=11.6.2 <12), Docker Desktop/Engine Linux containers serta Docker Compose v2 yang mendukung --wait/health dependencies. Contoh command menggunakan **PowerShell**. Docker tidak diperlukan untuk generate/typecheck/build/unit, tetapi diperlukan untuk dependency development dan pengujian integrasi contoh ini.

Semua command berikut dari **root checkout backend**, tempat package.json ini berada:

```powershell
node --version
npm --version
npm ci
npm run prisma:validate
npm run prisma:generate
```

Gunakan npm versi baseline sebelum npm ci; lockfile tidak boleh diganti dengan install tanpa lock. `.npmrc` mengaktifkan engine-strict. Generate/validate memakai prisma.generate.config.ts tanpa DATABASE_URL/koneksi DB; model multi-file berada di prisma/models, output src/generated/prisma dihasilkan lokal dan tidak disimpan. Typecheck/build juga menjalankan generate, jadi tidak memerlukan generated client dari komputer pembuat.

### Environment development

```powershell
if (-not (Test-Path 'env/.env')) { Copy-Item 'env/.env.example' 'env/.env' }
notepad env/.env
```

Isi field credential yang masih kosong secara privat. File lokal diabaikan .gitignore/.dockerignore; jangan menyalin credential tes/deployment ke sini.

| Variabel | Nilai/aturan development |
| --- | --- |
| NODE_ENV, DEPLOYMENT_MODE | development dan local. |
| PORT, APP_ORIGIN | 3000 dan http://localhost:5175 tanpa path/trailing slash. |
| SESSION_COOKIE_SECURE, TRUST_PROXY | false untuk HTTP lokal; TRUST_PROXY kosong. |
| COMPOSE_PROJECT_NAME | wrs-development-laptop; guard dev menolak project lain. |
| POSTGRES_USER, POSTGRES_DB | warehouse_dev dan warehouse_development sesuai template. |
| POSTGRES_PORT, REDIS_PORT | 55450 dan56400 pada host127.0.0.1, sesuai URL runtime. |
| POSTGRES_PASSWORD, REDIS_PASSWORD | Credential acak lokal, tidak ada nilai bawaan. |
| DATABASE_URL | URL PostgreSQL privat ke127.0.0.1:55450, database warehouse_development; user/password cocok dengan field Compose. |
| REDIS_URL | URL Redis privat ke127.0.0.1:56400; password cocok dengan REDIS_PASSWORD. |
| REDIS_NAMESPACE | wrs:dev:laptop. |
| SESSION_SECRET | Secret acak lokal minimal 32 byte. |
| SEED_SUPERVISOR_*, SEED_OPERATOR_* | Isi NAME/EMAIL/PASSWORD kedua akun; email berbeda; nama 1-120 dan password 12-128 Unicode code point. Password tidak di-trim. |
| SESSION_IDLE_SECONDS, SESSION_ABSOLUTE_SECONDS, ANONYMOUS_SESSION_SECONDS | Template 1800/28800/900; idle tidak boleh melebihi absolute. |

Bangun URL credential secara privat dan percent-encode bagian credential; jangan mencetak URL tersebut. Seed mempertahankan record existing termasuk password hash; mengubah password di env **tidak** mengubah password akun lama. Tidak ada reset password/registrasi publik pada scope ini. Akun login awal dibuka sendiri dari env/.env, bagian SEED_SUPERVISOR_* / SEED_OPERATOR_*.

## Execution: development lokal

Nyalakan Docker Desktop terlebih dahulu, lalu pada terminal backend:

```powershell
npm run dev
```

Pada terminal terpisah di checkout frontend, setelah setup frontend:

```powershell
npm run dev
```

Buka **http://localhost:5175**. Backend listen **3000**; Vite meneruskan request relatif /api/v1 dan /health ke **http://127.0.0.1:3000**. Host browser tetap localhost, jangan menggantinya dengan127.0.0.1 karena APP_ORIGIN harus cocok persis. Cookie wrs.sid HttpOnly/SameSite=Lax/host-only dan non-Secure hanya untuk local HTTP; CSRF dan authorization tetap ditegakkan.

scripts/dev.ts melakukan sekali per command: validasi env/.env/override -> cek port 3000 -> cek engine Docker -> Compose root compose.yaml project wrs-development-laptop up detached/wait PostgreSQL+Redis -> Prisma generate -> verifikasi current_database melalui URL host -> migrate deploy -> seed idempotent -> tsx watch server.ts. Tidak reset data/volume. Restart akibat perubahan source hanya me-restart API, tidak mengulang seluruh setup. Startup dari mesin baru membuat dependency project ini bila belum ada.

Untuk cek environment/health, dari backend:

```powershell
npm run env:check
Invoke-WebRequest 'http://localhost:3000/health/live'
Invoke-WebRequest 'http://localhost:3000/health/ready'
Invoke-WebRequest 'http://localhost:5175/health/ready'
```

Health200 tidak membuktikan login: /api/v1/auth/me sebelum login harus401; bootstrap /auth/csrf-token lalu login dengan Origin/CSRF, me 200, reload dan logout adalah alur autentikasi. Kontrak lengkap pada OpenAPI.

Ctrl+C di terminal backend/frontend untuk menghentikan prosesnya. Dependency tetap hidup; jika tidak dipakai, hentikan hanya project development tanpa menghapus volume:

```powershell
docker compose -p wrs-development-laptop --env-file env/.env stop postgres redis
```

Untuk generate/migration/seed manual, command tersedia di bawah; periksa target env dahulu. npm run dev sudah menangani migration deploy/seed, tidak perlu menjalankannya manual setiap start. `npm start` menjalankan dist/server.js setelah build, tanpa persiapan Docker/migrasi/seed otomatis.

### Troubleshooting

| Gejala | Pemeriksaan/tindakan |
| --- | --- |
| Missing/invalid environment | Buat env/.env dari template; isi URL, secret, cookie dan seed. Jangan membagikan isi env. |
| Conflicting terminal overrides | Loader umum memakai process env sebelum file; wrapper dev menolak konflik. Hapus hanya variabel yang disebut (misalnya BACKEND_ENV_FILE), buka terminal bersih, ulangi. |
| Docker engine unavailable | Nyalakan Docker Desktop, tunggu engine ready, ulangi npm run dev. |
| Port 3000/5175 terpakai | Identifikasi pemilik lewat Get-NetTCPConnection/netstat. Hentikan hanya proses sendiri; startup tidak membunuh aplikasi lain atau berpindah port. |
| Origin/CSRF403 | Pastikan browser localhost:5175, APP_ORIGIN sama, SESSION_COOKIE_SECURE=false dan token baru setelah login. Jangan mematikan validasi. |
| Proxy500 | Pastikan backend 3000 ready; override Vite lama ke3306 harus dihapus. Vite biasa menolak alternate API_PROXY_TARGET. |
| PostgreSQL/Redis tidak ready | Periksa docker compose -p wrs-development-laptop --env-file env/.env ps serta log dependency secara lokal, kesamaan host-port/URL/password, dan schema. Jangan reset volume untuk memperbaiki credential. |
| Warning workspace config | Jalankan dari checkout mandiri, bukan parent workspaces lama. Pada proyek sumber ini registration workspace parent sudah dilepas; config parent lain dapat kembali memengaruhi npm. |

Menghapus override spesifik di PowerShell tidak menampilkan nilainya:

```powershell
Remove-Item Env:BACKEND_ENV_FILE -ErrorAction SilentlyContinue
# Hapus DATABASE_URL/REDIS_URL/variabel lain hanya bila konflik dilaporkan, lalu ulangi dev.
```

## Testing

Command dari root backend, setelah npm ci:

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:unit
```

Unit tidak memerlukan DB/Redis. Integration memakai PostgreSQL/Redis nyata; tidak menjalankan dev wrapper atau fixture integrasi pada database development/deployment. Gunakan terminal khusus tes dan database disposable berakhiran `_test` dengan namespace Redis `wrs:test:...`. Jangan memakai file .env.taskN milik pembuat sebagai prasyarat.

### Menyiapkan integration dari template yang disertakan

```powershell
if (-not (Test-Path 'env/.env.test-review')) { Copy-Item 'env/.env.example' 'env/.env.test-review' }
notepad env/.env.test-review
```

Isi credential acak sendiri dan kedua akun seed. Ubah NODE_ENV=test, COMPOSE_PROJECT_NAME=wrs-review-tests, POSTGRES_DB=wrs_review_test, POSTGRES_PORT=55460, REDIS_PORT=56410, REDIS_NAMESPACE=wrs:test:review. Pilih project/port baru bila contoh sudah dipakai; sesuaikan URL host localhost/127.0.0.1 serta database/user/password dengan field service. APP_ORIGIN boleh http://localhost:5173 untuk target E2E; DEPLOYMENT_MODE=local/SESSION_COOKIE_SECURE=false. Tambahkan RUN_FOUNDATION_INTEGRATION=true ke file. Jangan arahkan ke data aplikasi yang ingin dipertahankan.

```powershell
$env:BACKEND_ENV_FILE = (Resolve-Path 'env/.env.test-review').Path
$env:RUN_FOUNDATION_INTEGRATION = 'true'
docker compose -p wrs-review-tests --env-file env/.env.test-review up -d --wait postgres redis
npm run prisma:generate
npm run verify:database
npm run db:seed
npm run test:integration
# Sesudah selesai, bersihkan override pada terminal tes:
Remove-Item Env:RUN_FOUNDATION_INTEGRATION -ErrorAction SilentlyContinue
Remove-Item Env:BACKEND_ENV_FILE -ErrorAction SilentlyContinue
```

verify:database hanya untuk schema public **kosong**; ia memeriksa target `_test`, menjalankan migrate deploy dua kali dan membandingkan schema/history. Ia menolak tabel existing tanpa menghapusnya. Untuk DB tes yang sudah dimigrasi dan sengaja dipakai ulang, jalankan `npm run db:migrate:deploy` menggantikan verify:database, lalu seed/test; fixture dapat menambah data. Gunakan DB/project tes baru untuk clean migration check. Seed ulang aman tidak menduplikasi email/mengganti password. Seed email/password harus tetap cocok dengan akun existing agar suite login dapat berjalan. Integration mencakup auth/security, user invariant/revocation, receiving concurrency/idempotency/rollback, reconciliation dan constraint; Vitest fileParallelism=false. Untuk berhenti: Ctrl+C runner, lalu stop dependency project tes saja bila tidak dibutuhkan.

### Hasil historis dan validasi README

Bukti implementasi pada [docs/testing.md](docs/testing.md): unit terakhir19 PASS, Linux Task 7 backend 75 PASS (sebelum3 tes guard dev ditambahkan), pengujian Docker operasional14 PASS, frontend 13 components dan10 browser desktop/mobile PASS. Ini run berbeda, bukan satu suite/versi yang sama. Tidak mengklaim 78 full backend suite sudah dijalankan. Pada pekerjaan README ini, suite aplikasi/build/deploy/login ulang **NOT_RUN**; hanya validasi statis instruksi/path/tautan/syntax, tanpa server tambahan atau perubahan DB. Bukti JSON/screenshot historis lokal tidak dibutuhkan untuk menjalankan suite. Playwright pada repository frontend adalah pengujian E2E sistem, bukan script backend.

## Deployment Docker lokal

Seluruh command bagian ini dijalankan **dari root checkout backend**, termasuk bila membaca README frontend. Docker Desktop/Engine dan Compose v2 harus aktif. Ini berbeda dari Compose dependency development pada compose.yaml di root backend.

Buat file lokal dari template yang disertakan, tanpa menimpa file existing:

```powershell
if (-not (Test-Path 'deploy/.env')) { Copy-Item 'deploy/.env.example' 'deploy/.env' }
notepad deploy/.env
```

Isi privat sebelum build/up:

| Variabel | Pengaturan deployment lokal |
| --- | --- |
| COMPOSE_PROJECT_NAME | Project tersendiri, default wrs-local; jangan reuse project tes/development. |
| FRONTEND_CONTEXT | Root checkout frontend, relatif terhadap deploy/compose.yaml atau absolut. |
| WEB_PORT, APP_ORIGIN | Default 8080 dan http://localhost:8080; ubah keduanya bersama bila port berbeda. |
| APP_SUBNET, GATEWAY_IP | Subnet yang belum dipakai dan IP gateway dalam subnet; template 172.29.70.0/24 dan 172.29.70.10. |
| POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD | Identitas database deployment dan credential lokal sendiri. |
| REDIS_PASSWORD, REDIS_NAMESPACE | Credential Redis dan namespace deployment, terpisah dari tes/development. |
| DATABASE_URL | URL PostgreSQL privat memakai host internal postgres, port 5432, database/user/password sesuai field service. |
| REDIS_URL | URL Redis privat memakai host internal redis, port 6379 dan credential sesuai REDIS_PASSWORD. |
| SESSION_SECRET | Nilai acak minimal 32 byte; jangan masukkan ke source, frontend atau laporan. |
| SEED_SUPERVISOR_*, SEED_OPERATOR_* | name/email/password akun awal; dua email berbeda, password 12-128 Unicode code point. |
| DEPLOYMENT_MODE, SESSION_COOKIE_SECURE | local dan false untuk HTTP lokal. |

Percent-encode credential pada URL secara lokal. Jangan memakai localhost pada URL antarcontainer. File Compose --env-file tidak sama dengan BACKEND_ENV_FILE loader Node; jangan memakai env development/test sebagai deployment. Process environment dapat menimpa interpolasi Compose: gunakan terminal bersih dari override task lain. Mengganti env tidak otomatis mengganti password PostgreSQL di volume existing atau password akun seed lama.

```powershell
docker compose -f deploy/compose.yaml --env-file deploy/.env build
docker compose -f deploy/compose.yaml --env-file deploy/.env up -d --wait
docker compose -f deploy/compose.yaml --env-file deploy/.env ps -a
Invoke-WebRequest 'http://localhost:8080/health/live'
Invoke-WebRequest 'http://localhost:8080/health/ready'
docker compose -f deploy/compose.yaml --env-file deploy/.env logs --tail 80 migrate api web
```

Sesuaikan URL health jika WEB_PORT diubah. Buka **http://localhost:8080** dan login memakai akun seed dalam deploy/.env yang diisi pemilik. Build pertama memerlukan jaringan untuk image/npm/OS packages. Dockerfile memakai Node 24.12.0/npm 11.6.2 dan npm ci dari lockfile lokal; Prisma Client digenerate offline saat build. Image Node, PostgreSQL 17.11, Redis 8.2.11 dan nginx 1.30.6 dipin digest pada konfigurasi.

Urutan aktual `up`: PostgreSQL/Redis healthy -> service **migrate** menjalankan migration deploy **dan seed** hingga exit0 -> **api** readiness healthy -> **web**. Job migrate memakai target Dockerfile sendiri, bukan dijalankan tiap replica API. API/image tidak menjalankan npm run dev. Untuk deploy perubahan migration atau rerun job eksplisit, dengan target deployment sudah diperiksa dan dependency healthy:

```powershell
docker compose -f deploy/compose.yaml --env-file deploy/.env run --rm migrate
```

Web adalah nginx static server/gateway port internal 8080, publish hanya 127.0.0.1:WEB_PORT. API3000, PostgreSQL 5432 dan Redis 6379 hanya jaringan container. `/api/v1` dan `/health` diproxy tanpa menghapus prefix; reload deep route memakai SPA fallback. Gateway meneruskan Origin, menimpa forwarded headers dan hanya IP gateway yang dipercaya API. Tidak ada automatic mutation retry. Root filesystem API/web read-only dengan tmpfs; keduanya non-root.

Untuk menghentikan tanpa kehilangan data, lalu menjalankan kembali:

```powershell
docker compose -f deploy/compose.yaml --env-file deploy/.env stop
docker compose -f deploy/compose.yaml --env-file deploy/.env up -d --wait
```

`up` mengikuti dependency order di atas dan dapat menjalankan ulang job yang sudah exit; seed tetap idempotent dan tidak mengganti password existing. Jangan reset/drop database, menghapus volume atau memakai prune sebagai langkah rutin. Periksa/redaksi log sebelum dibagikan; jangan membagikan resolved Compose config atau container environment yang mengandung secret.

Deployment ini **HTTP lokal**, terpisah dari production publik. HTTPS nanti membutuhkan terminasi TLS/certificate nyata, APP_ORIGIN https yang benar, DEPLOYMENT_MODE=https, SESSION_COOKIE_SECURE=true dan trusted proxy sesuai topologi. Hanya mengganti env pada listener HTTP tidak cukup. HTTPS/TLS browser, VPS/domain/public hosting **NOT_RUN**.

## Dokumentasi submission

Hanya tujuh dokumen berikut yang diperlukan dari folder docs:

- [PRD](docs/prd.md): requirement, role dan aturan bisnis.
- [Technical specification](docs/technical-spec.md): arsitektur dan keputusan teknis.
- [ERD](docs/erd.mmd): diagram entitas/relasi Mermaid.
- [OpenAPI](docs/openapi.yaml): kontrak request, response dan error API.
- [Data flow](docs/data-flow.mmd): diagram alur Mermaid.
- [AI workflow](docs/ai-workflow.md): tahapan implementasi dan checklist.
- [Testing](docs/testing.md): perintah, hasil historis, kegagalan awal dan batas verifikasi.

README ini memuat instruksi operasional yang diperlukan; tidak membutuhkan panduan tambahan, manifest, screenshot atau script di docs yang tidak disertakan. Referensi historis dalam dokumen testing tidak berarti file evidence lokal ikut submission. Source, tests, template environment, Dockerfile, konfigurasi dan semua migrasi Prisma di luar docs tetap diperlukan. Semua pekerjaan Git/GitHub dilakukan manual oleh pemilik.

## Keterbatasan

Tidak ada public registration, reset/change password, restore user, delete/arsip/status aktif product, manual complete/cancel receipt atau stock adjustment. Log/audit error menyeluruh, matriks setiap UI state dan receipt in-flight tepat saat revocation belum seluruhnya diverifikasi. HTTPS/public hosting, Firefox/WebKit/Safari, mobile fisik, load/stress/SLA, fuzzing dan accessibility audit menyeluruh NOT_RUN. Warning internal pg query-in-flight dan Vite PURE/chunk besar tercatat pada testing; tidak dinyatakan selesai. Tidak ditemukan input build/unit/integration yang membutuhkan file docs di luar tujuh dokumen; report E2E baru ditulis ke folder ignored sebagai output, bukan input checkout.

## Pemeriksaan README pada 2026-10-29

PASS pemeriksaan statis nama npm scripts terhadap package.json, keberadaan template/config, tepat tujuh tautan dokumen submission yang tersedia, serta syntax seluruh blok PowerShell. Audit source/config tidak menemukan input build/test pada docs yang diabaikan; E2E menulis report/screenshot baru sebagai output. Secret environment lokal tidak ditemukan dalam isi README. Suite aplikasi dan startup/deployment dari checkout bersih tidak diulang pada pekerjaan dokumentasi ini: **NOT_RUN**. Hanya README backend/frontend diubah; tidak membuat server, mengubah konfigurasi, menjalankan Git, atau mengubah database/volume.

## Penyempurnaan setelah Task 7: edit produk

SUPERVISOR dapat memperbaiki SKU/nama melalui Edit pada daftar produk dan PATCH /api/v1/products/:id. Produk terpakai tetap boleh diedit; SKU unik, normalisasi/batas existing berlaku. Inventory/detail/history menampilkan label produk terkini, sedangkan receipt/stock/replay tidak berubah. Tidak menambah delete/arsip/status aktif. Kontrak terbaru pada docs/openapi.yaml dan hasil verifikasi2026-10-30 pada docs/testing.md.

## Riwayat Edit Produk

SUPERVISOR dapat membuka tombol **Riwayat Edit** pada daftar produk menuju `/products/:id/history`. Halaman khusus ini menampilkan identitas produk, waktu server, nama pelaku saat perubahan, field dan nilai sebelum/sesudah, serta loading/empty/error/pagination. GET `/api/v1/products/:id/history` supervisor-only memakai page/limit(default20,max100); bukan `/inventory/transactions`.

Migrasi forward `202610300002_product_edit_history` menambah tabel permanen. Product update dan log ditulis dalam satu transaksi dengan row lock; no-op/failed edit tidak menghasilkan log. Actor soft-delete/rename tidak menghilangkan nama snapshot. Log hanya tersedia mulai fitur ini aktif; perubahan masa lalu tidak direkayasa. Tidak ada edit/delete log atau delete/archive produk. Receipt/stock/idempotency tidak berubah.

Development npm run dev akan deploy migrasi pending sekali sebelum watcher; jangan reset database. Untuk runtime manual dari backend gunakan env target yang telah diperiksa dan npm run db:migrate:deploy sebelum npm start. Docker menggunakan job migrate pada image baru, lalu readiness kini memeriksa tabel log. Production Docker rebuild/deployment untuk fitur tambahan ini NOT_RUN; lihat docs/testing.md untuk verifikasi tes nyata.
