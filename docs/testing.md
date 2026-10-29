# Testing dan bukti repository backend

Dokumen aktif ini diturunkan dari testing root tanpa memindahkan PASS ke scope yang tidak diuji. [Arsip testing asli](history/combined/docs/testing.md) mempertahankan seluruh command, percobaan gagal, exit code, output dan NOT_RUN asal; [manifest](history/manifest.json) memverifikasi byte arsip. [Verifikasi lokal tahap sebelumnya](verification.md) juga tetap tersedia.

## Ringkasan bukti dengan konteks asal

| Bukti asal | Status aktual pada saat itu | Batas konteks |
| --- | --- | --- |
| Task 1 | OpenAPI validator dan dokumen PASS; implementation NOT_RUN | Proyek gabungan, bukan runtime standalone |
| Task 2 backend | Typecheck/lint/build, 8 unit + 7 integration PASS; migrated empty DB, repeated deploy, seed preservation, real health/lifecycle PASS | Windows dan project Docker wrs-task2-cf98214e, DB wrs_task2_cf98214e_test; bukan eksekusi baru |
| Task 2 frontend | Typecheck/lint/build PASS | Fondasi sebelum Task 2A |
| Task 2A | Frontend lint/typecheck/build dan Chrome desktop/mobile smoke PASS | Konfigurasi final optional-property false; demo saja, bukan auth/business flows |
| Persiapan repository terpisah | Kedua npm ci/lint/typecheck/build/dependency tree PASS | Salinan temporary independen, tanpa env lokal atau parent workspace; unit/integration/browser tidak diulang |


Bukti lengkap dan screenshot/log ada di history/combined/docs/evidence dan history/combined/docs/testing.md. Semua referensi path temporary, flag workspace dan config root di dalam arsip adalah konteks historis, bukan petunjuk aktif. Task 2A backend tests dan audit penuh/browser lain tetap NOT_RUN sebagaimana sumber. Signal OS PTY Windows belum terkonfirmasi, meski jalur shutdown dipanggil langsung pada tes Task 2.

## Command aktif dari root repository

```powershell
npx --yes --offline=false --package=npm@11.6.2 npm ci --offline=false
npm run lint
npm run prisma:validate
npm run typecheck
npm run build
npm run test:unit
```

Command di atas adalah petunjuk, tidak dijalankan ulang pada pekerjaan dokumentasi ini. Di backend, codegen/validate offline tidak membutuhkan URL layanan; migration/seed/runtime tetap memerlukan env eksplisit. Di frontend, build tidak membutuhkan backend atau credential. Jangan memakai script yang belum ada pada package.json sebagai command siap pakai.

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
Deployment tests

- Docker image backend berhasil dibangun.
- PostgreSQL dan Redis healthy.
- Migration berjalan dari database kosong.
- Seed membuat akun tanpa secret hardcoded.
- API menunggu initialization berhasil.
- Readiness memeriksa PostgreSQL dan Redis.
- Restart API tidak menghilangkan session yang masih valid di Redis.
- Menjalankan migration deploy kembali tidak menduplikasi schema.
- Shutdown menutup HTTP server, Prisma, dan Redis dengan benar.

Pada tahap dokumentasi mandiri sebelum Task 3, seluruh tes fitur auth/CSRF/limiter/receiving/user management dan business browser flow berstatus **NOT_RUN**. Bukti Task 3 yang lebih baru dicatat terpisah di bawah; business/browser tetap belum diuji. Rencana frontend RTL/Playwright bukan bukti script test sudah tersedia. Database/balance/concurrency adalah enforcement backend; frontend memverifikasi behavior konsumen melalui kontrak, bukan memalsukan SQL proof.

## Status historis pekerjaan dokumentasi mandiri

Hanya pemeriksaan statis dokumentasi: referensi lokal, 87 ID requirement, hash snapshot sumber, kesamaan kontrak dan konteks arsip yang diperiksa. Typecheck/build/unit/integration/browser/DB/deployment **NOT_RUN** pada pekerjaan ini; PASS terdahulu tetap historis. Hasil pemeriksaan statis baru dicatat terpisah setelah command benar-benar dijalankan pada [evidence dokumentasi](evidence/documentation-check.json).

## Cara mencatat bukti selanjutnya

Catat Command, Environment, Date (Asia/Jakarta), Exit code, Observed output dan Requirement IDs. Jangan mengubah NOT_RUN menjadi PASS karena ada file tes atau salinan evidence. Jangan menghapus data/volume, menjalankan Git/GitHub atau menganggap artifact remote sudah sinkron tanpa perbandingan. Pertanyaan R-10/R-11/R-13 tetap dicatat pada spec-review.md sebelum behavior terdampak dikerjakan.

## Hasil aktual pemeriksaan dokumentasi mandiri

Pada 2026-10-29, `python docs/validation/check-docs.py` dijalankan dari root repository ini dan exit 0: 87 ID source/PRD/mapping konsisten, 13 Markdown aktif diperiksa, semua target link lokal tetap di dalam repository, 39 hash arsip cocok, hash kontrak cocok dan inventaris API Markdown/OpenAPI sama-sama 20 operasi. Perbandingan tambahan replika frontend dengan artefak backend lokal juga exit 0; ini bukan pemeriksaan freshness remote GitHub.

Metadata kontrak aktif kini memperjelas bahwa hanya health fondasi tersedia; endpoint auth/bisnis tetap rencana. File root/snapshot asli tidak diubah. Pemeriksaan di atas bersifat statis, bukan validator penuh schema OpenAPI atau bukti server/client berjalan. Validator schema, unit/integration/build/browser/deployment baru pada pekerjaan ini tetap NOT_RUN. Tidak ada perintah Git/GitHub, penghapusan data atau Task 3 yang dijalankan.


## Bukti aktual Task 3

Tanggal 2026-10-29, Asia/Jakarta. Audit awal menemukan health/fondasi saja, belum ada auth. Pekerjaan ini hanya backend; frontend, sumber PROJECT_SPEC.md, metadata Git dan evidence Task 2 tidak diubah. Tidak menjalankan perintah Git/GitHub.

Environment: Windows, Node 24.12.0, npm installer/audit 11.6.2; backend/node_modules lokal. Docker engine 29.8.0 berjalan. Layanan existing Task 2 dijalankan detached sesuai README tanpa menghapus data. Tes memakai project Compose baru `wrs-task3-067f8e38`, PostgreSQL 17.11 pada port 55440, database `wrs_task3_067f8e38_test`, Redis 8.2.11 pada port 56390, namespace `wrs:test:067f8e38` ditambah UUID per test. Credential acak berada hanya pada env/.env.task3 yang diabaikan; tidak dipublikasikan. Kedua container healthy dan dibiarkan berjalan; tidak ada database/volume yang dihapus atau FLUSHALL.

Command berikut benar-benar dijalankan dari root backend. Binary lokal dipanggil eksplisit untuk membuktikan pemeriksaan tidak memakai executable parent. Set BACKEND_ENV_FILE ke env/.env.task3 sebelum migrate/seed/integration.

| Command/pemeriksaan | Hasil aktual |
| --- | --- |
| docker info | PASS, engine berjalan; sandbox awal menolak akses API Docker, dijalankan ulang dengan izin eksekusi |
| docker compose --env-file env/.env.verification up -d --wait postgres redis | PASS, layanan existing Task 2 healthy, data dipertahankan |
| docker compose --env-file env/.env.task3 up -d --wait postgres redis | PASS, project verifikasi terisolasi, kedua layanan healthy |
| node node_modules/prisma/build/index.js migrate deploy | PASS exit 0, satu migrasi awal diterapkan pada DB tes baru; deploy ulang exit 0, No pending migrations to apply |
| node node_modules/tsx/dist/cli.mjs prisma/seeds/index.ts | PASS exit 0, existing accounts preserved; test fondasi juga menjalankan seed dua kali dan membandingkan hash/akun |
| node node_modules/eslint/bin/eslint.js . | PASS exit 0 |
| node node_modules/typescript/bin/tsc --noEmit | PASS exit 0, strict dan skipLibCheck=false |
| node node_modules/prisma/build/index.js validate --config prisma.generate.config.ts | PASS exit 0, schemas valid |
| node node_modules/prisma/build/index.js generate --config prisma.generate.config.ts | PASS exit 0, Prisma Client 7.10.1 |
| node node_modules/typescript/bin/tsc -p tsconfig.build.json | PASS exit 0, build final |
| node node_modules/vitest/vitest.mjs run --reporter=default --reporter=json --outputFile=docs/evidence/task3-tests.json | PASS exit 0, 4 file, 35 tes: 19 security integration, 7 foundation integration, 9 unit; durasi final 9.44 detik |
| npm audit memakai npm 11.6.2, root/prefix backend | PASS exit 0, found 0 vulnerabilities setelah express-rate-limit 8.7.1 |
| python -m openapi_spec_validator docs/openapi.yaml | PASS exit 0, docs/openapi.yaml: OK, validator 0.7.2 di .cache/doc-tools |
| python docs/validation/check-docs.py | PASS exit 0, 87 ID, 39 archive hashes, 20 operasi Markdown/OpenAPI dan hash kontrak cocok; bukan bukti frontend sinkron |
| Parser ignore lokal tanpa Git | PASS, 12 path output/secret diabaikan dan 16 contoh path source/template/migration/documentation dipertahankan |
| Pemeriksaan manifest/lockfile/local package resolution | PASS, semua direct dependency exact tersedia lokal; runtime import di backend/node_modules |
| SHA256 docs/source/PROJECT_SPEC.md | PASS, tetap 901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b |

[Output machine-readable Vitest](evidence/task3-tests.json) menyimpan assertion dan durasi aktual; tidak memuat credential/token. Health integration menjalankan listener HTTP nyata, readiness terhadap DB/Redis, dan shutdown. Kedua instance untuk shared limiter dibuat terpisah dalam proses tes dengan Redis/namespace yang sama; restart proses/host bukan bagian bukti ini.

### Cakupan security yang lulus

- Bootstrap token stabil, anonymous Redis TTL, no-store, HttpOnly/host-only/SameSite=Lax/Path=/; me anonymous/missing 401.
- Token hilang/salah/stale ditolak; Origin salah/hilang ditolak, Referer terpercaya diterima. JSON invalid/oversize/content type salah/unknown field/query ditolak.
- Login normalisasi email, password tidak di-trim, batas 128 code point, error credentials generik untuk wrong/unknown/inactive/deleted. SID/token diganti, key anonymous lama hilang, DTO tidak berisi authVersion/hash/session internal.
- Logout menunggu destroy, old SID ditolak. Gagal save/destroy store menghasilkan 503; logout gagal tidak mengklaim 204.
- Idle, anonymous dan absolute expiry memakai waktu dan TTL Redis nyata dengan durasi kecil yang diinjeksi saat tes; aktivitas tidak memperpanjang deadline absolute.
- PostgreSQL role/status/deleted/authVersion dimuat ulang. Authorization supervisor memakai probe hanya di test, tidak membuat endpoint fitur. Perubahan data account melalui API belum diimplementasikan.
- Limit global dibagi dua app; IP/login-pair/user limits 429 dengan Retry-After. Case IPv4-mapped IPv6 dan subnet IPv6 tidak melewati limit.
- Redis client nyata yang diputus menolak auth/limiter dengan 503, liveness tetap 200. Fault injection sendCommand/set/del pada client nyata membuktikan jalur store error; PostgreSQL port tak tersedia menghasilkan 503.
- HTTPS cookie __Host-/Secure dari proxy loopback terpercaya; HTTP dan spoofed forwarded dari proxy tidak dipercaya ditolak. Env proxy malformed/broad dan namespace tidak valid ditolak.

Requirement yang dicakup sebagian/seluruh backend auth: FR-AUTH-01..04, US-01, FR-USER-05 (enforcement version; mutation users masih Task 5), NFR-01/02/04/05. Mapping 87 ID tetap snapshot rencana awal; hasil backend ini tidak mengklaim frontend/E2E atau seluruh mutation masa depan sudah PASS.

### Percobaan awal dan koreksi

- Seed lewat Prisma CLI langsung sempat gagal karena tsx tidak ada di PATH shell; menjalankan entry seed lewat binary tsx lokal lulus. Bukan kegagalan DB.
- Typecheck pertama mendeteksi tipe header set-cookie di tes; diperbaiki dan pemeriksaan akhir lulus.
- Vitest sandbox gagal spawn EPERM; dijalankan ulang di luar pembatasan sandbox dan lulus.
- Paket express-rate-limit rencana 8.1.0 menghasilkan 2 high vulnerabilities; diganti 8.7.1, audit akhir 0. Validasi paket sempat memperingatkan wrapper helper IP tak dikenali; helper dipanggil langsung dalam keyGenerator dan regression IPv6 ditambahkan. Run final bersih dari warning tersebut.
- Pip default tidak menemukan distribusi; install validator di cache dengan index PyPI eksplisit lulus. Tidak ada dependency Python aplikasi atau folder parent yang digunakan.
- Pemeriksaan resolusi pertama memakai require.resolve pada @types (tidak punya runtime entry) gagal; diperbaiki menjadi cek package.json lokal untuk paket tipe dan resolve runtime hanya dependency runtime. Hasil akhir lulus.

### Batas bukti dan NOT_RUN

| Pemeriksaan | Status/alasan |
| --- | --- |
| Browser/frontend/E2E auth, replika kontrak frontend | NOT_RUN, scope backend saja; pemilik perlu menyalin api-contract.md, openapi.yaml dan contract-version.json manual |
| Production Linux/container API/nginx/TLS certificate nyata | NOT_RUN; cookie HTTPS hanya diuji dengan proxy terkontrol Supertest |
| Mematikan server Redis/PG secara fisik saat request in-flight | NOT_RUN; client nyata ditutup, endpoint DB tak tersedia dan fault injection store sudah diuji |
| Restart proses API/host mempertahankan SID | NOT_RUN; dua instance app berbagi limiter diuji, bukan lifecycle restart proses |
| Capture semua output log dan fuzzing secret menyeluruh (NFR-06) | NOT_RUN; DTO/error payload aman diuji, implementasi tidak mencetak raw error/credential |
| Receiving/concurrency/idempotency/user management | NOT_RUN, Task 4/5 belum dikerjakan |
| Fresh isolated npm ci baru pada Task 3 | NOT_RUN; install lokal dan lock/resolution diperiksa; bukti isolated ci terdahulu tetap historis |

Tidak ada blocker runtime auth yang ditemukan. Task 4 masih memerlukan keputusan R-10 kode/status error bisnis, R-11 unit panjang teks non-password, dan R-13 strategi snapshot query detail. Kerjakan bagian independen sambil menetapkan keputusan terkait; jangan mengarang jawaban stakeholder.


## Bukti persiapan Task 4 (dokumentasi saja)

Tanggal 2026-10-29, Asia/Jakarta. R-10/R-11/R-13 berstatus DESIGN_RESOLVED berdasarkan [review persiapan](task4-readiness.md), menggantikan status terbuka yang tercatat pada laporan Task 3 di atas. Tidak mengubah atau mengulang bukti runtime Task 3. Tidak mengimplementasikan endpoint, menginstal dependency, menjalankan Git/GitHub, menyentuh frontend, database/volume atau sumber PROJECT_SPEC.md.

Kontrak diperjelas: kode resource 404 dan respons 404 POST /receivings, unit panjang Unicode code point, snapshot detail REPEATABLE READ. Contoh ReceivingDetailDto OPEN yang sebelumnya expected=1/received=1/remaining=1 diperbaiki menjadi expected=1/received=0/remaining=1; aturan status/aritmetika existing dipertahankan. Tidak ada perubahan DTO, batas numerik, role, quantity, idempotency atau schema database.

Command aktual dari root backend memakai Python tool cache yang sudah tersedia (bukan install baru):

```powershell
$env:PYTHONUTF8 = '1'
$env:PYTHONPATH = Join-Path (Get-Location) '.cache/doc-tools'
python -m openapi_spec_validator docs/openapi.yaml
python docs/validation/check-task4-readiness.py
python docs/validation/check-docs.py
```

| Pemeriksaan aktual | Hasil |
| --- | --- |
| Validator OpenAPI 0.7.2 | PASS exit 0, docs/openapi.yaml: OK |
| check-task4-readiness.py | PASS exit 0: 6 mapping 404, batas schema name 120/121 astral, schema reference/q, deskripsi snapshot, 2 contoh detail koheren, YAML tanpa duplicate key, manifest hash dan source hash |
| check-docs.py | PASS exit 0: 87 ID, 14 Markdown aktif, 39 archive hashes, 20 operasi Markdown/OpenAPI, seluruh link lokal dan manifest hash |
| Tipe Prisma 7.10.1 lokal | Diperiksa: $transaction menerima isolationLevel dan enum RepeatableRead tersedia; bukan eksekusi transaksi runtime |
| Dokumentasi resmi PostgreSQL 17/OpenAPI 3.0.3 | Dibaca untuk isolation, character type dan schema length; tautan pada review/technical-spec |

Bukti khusus baru: [task4-readiness-check.json](evidence/task4-readiness-check.json). Pemeriksaan ini memvalidasi artefak desain, tidak membuktikan validator aplikasi atau transaksi telah bekerja. Run awal script editing berhenti karena encoding default Python Windows, tanpa perubahan file; digunakan UTF-8 eksplisit. Validator awal mendeteksi colon scalar YAML yang perlu quoting; checker semantik kemudian mendeteksi duplicate description q yang menimpa aturan panjang. Keduanya diperbaiki dan run final seluruh command di atas exit 0. Tidak mengubah kegagalan awal menjadi klaim PASS sebelum diperbaiki.

### Rencana verifikasi implementasi, seluruhnya NOT_RUN

- R-10: authenticated/authorized request dengan UUID valid missing target menghasilkan kode/status per endpoint; invalid UUID/duplicate productId tetap 400. POST receiving multi-item dengan satu missing product menghasilkan 404 dan tidak meninggalkan receiving/item/stock write. DB failure 503. Task 5 menjaga deleted user GET 200/PATCH 409/DELETE ulang 204. Filter bukan target detail tidak mendapat lookup 404 tambahan.
- R-11: uji ASCII, astral, combining mark, whitespace normalisasi, batas name 120/121, reference 160/161, q 100/101, email 254/255 sesuai format valid dan SKU ASCII 40/41; simpan/baca kembali teks Unicode pada PostgreSQL. Password/auth regression tetap mengikuti BR-U06. Schema-only PASS di atas bukan business-validator PASS.
- R-13: PostgreSQL dua koneksi, gunakan barrier deterministik: read header dalam snapshot lalu writer commit receipt sebelum read items. Respons harus sepenuhnya snapshot lama (atau snapshot baru bila first read setelah commit), tidak campuran; request baru sesudah commit melihat data baru. Cek status/counters/remaining koheren dan mapper tidak query global di luar transaction. POST create memetakan data dalam transaksi sama dan tidak mengirim respons sebelum commit. Jangan mengandalkan sleep sebagai bukti interleaving.
- Receiving mutation concurrency/idempotency/late-failure/reconciliation, lint/typecheck/build/tes aplikasi baru: NOT_RUN pada review ini. Bukti Task 3 tetap 35 tes pada saat eksekusinya.
- Sinkronisasi/perbandingan frontend: NOT_RUN; pemilik perlu menyalin docs/api-contract.md, docs/openapi.yaml dan docs/contract-version.json dari backend secara identik sesuai api-sync.md.

Tidak ada pertanyaan bisnis tertunda untuk baseline tiga temuan ini. Task 4 siap masuk implementasi setelah instruksi pengguna; belum dijalankan pada review ini.


## Bukti aktual Task 4

Tanggal 2026-10-29 (Asia/Jakarta). Pengguna mengizinkan implementasi core receiving pada backend mandiri. Audit awal menemukan auth/health saja; modules products/receivings/inventory belum ada. Tidak ada operasi Git/GitHub, perubahan metadata Git, frontend/folder induk, dependency/lockfile atau applied migration. Task 5/6 tidak dijalankan. Bukti Task 2/3 dan NOT_RUN historis di atas dipertahankan; catatan persiapan Task 4 di atas bukan status runtime terbaru.

### Lingkungan dan isolasi

Windows, Node 24.12.0, baseline npm 11.6.2, dependency/backend node_modules lokal. Docker engine 29.8.0 berjalan; dependency existing Task 3 healthy. Compose backend dipakai untuk project baru `wrs-task4-1fa1a1ad`, PostgreSQL 17.11 host 55441/database `wrs_task4_1fa1a1ad_test`, Redis 8.2.11 host 56391/namespace `wrs:test:task4:1fa1a1ad` ditambah UUID per konteks test. Env/.env.task4 lokal diabaikan, tidak dicetak sebagai evidence credential. Kedua container akhir healthy dan dibiarkan berjalan. Tidak ada FLUSHALL atau penghapusan database/volume existing; fixture core test dipertahankan di database verifikasi. Re-run memakai identifier unik, bukan membersihkan data agar tes lulus.

### Perintah dan hasil aktual

Command benar-benar dijalankan dari root backend. Binary lokal dipanggil eksplisit agar tidak memakai executable workspace/parent. Untuk migrate/seed/integration, BACKEND_ENV_FILE menunjuk env/.env.task4.

| Command | Hasil aktual |
| --- | --- |
| docker info --format '{{.ServerVersion}}' | PASS exit 0, 29.8.0 |
| docker compose --env-file env/.env.task3 ps | PASS exit 0, postgres/redis healthy sebelum persiapan |
| docker compose --env-file env/.env.task4 up -d --wait postgres redis | PASS exit 0, dependency tes terisolasi healthy |
| node node_modules/prisma/build/index.js migrate deploy | PASS exit 0, initial migration existing diterapkan ke DB tes baru; deploy ulang: No pending migrations to apply |
| node node_modules/tsx/dist/cli.mjs prisma/seeds/index.ts | PASS exit 0; dua akun seed, credential dari environment; foundation regression memverifikasi seed ulang tidak mengganti hash |
| node node_modules/eslint/bin/eslint.js . | PASS exit 0, konfigurasi lokal |
| node node_modules/typescript/bin/tsc --noEmit | PASS exit 0, strict/skipLibCheck=false |
| node node_modules/prisma/build/index.js validate --config prisma.generate.config.ts | PASS exit 0, schemas valid |
| node node_modules/prisma/build/index.js generate --config prisma.generate.config.ts | PASS exit 0, generated client 7.10.1 |
| node node_modules/typescript/bin/tsc -p tsconfig.build.json | PASS exit 0, build final |
| node node_modules/vitest/vitest.mjs run --reporter=default --reporter=json --outputFile=docs/evidence/task4-tests.json | PASS exit 0, 6 file, 58 tes, 16.27 detik: 20 core integration + 19 auth integration + 7 foundation integration + 12 unit |
| docker compose --env-file env/.env.task4 ps | PASS exit 0, postgres healthy dan redis healthy sesudah verifikasi |
| python -m openapi_spec_validator docs/openapi.yaml | PASS exit 0, docs/openapi.yaml: OK; validator 0.7.2 dari .cache/doc-tools existing |
| python docs/validation/check-task4-readiness.py | PASS exit 0; 6 design mappings, Unicode schema boundaries, 2 coherent detail examples, snapshot description, YAML duplicate key check, source/contract hashes |
| python docs/validation/check-docs.py | PASS exit 0; 87 requirement IDs, 39 archive hashes, 20 operasi Markdown/OpenAPI, link lokal dan manifest hash |

[Laporan assertion/durasi aktual](evidence/task4-tests.json) terpisah dari task3-tests.json. Validator Python memerlukan PYTHONPATH=.cache/doc-tools dan PYTHONUTF8=1 sesuai perintah tahap persiapan; tidak ada install dependency baru.

### Cakupan dan hasil runtime

| Area | Bukti aktual Task 4 |
| --- | --- |
| R-10 scope Task 4 | PRODUCT_NOT_FOUND pada detail/missing product create receiving, RECEIVING_NOT_FOUND pada detail/receipt, RECEIVING_ITEM_NOT_FOUND pada item lintas dokumen. Invalid input 400 sebelum lookup; missing product tidak menyisakan receiving. Service DB unavailable 503. USER_NOT_FOUND masih Task 5/NOT_RUN. |
| R-11 scope Task 4 | Nama astral 120 lolos PostgreSQL round trip, 121 ditolak; combining mark 120 code point diterima. Reference astral 160/161, q 100/101 dan SKU 40/41, trim/uppercase dan strict unknown input diuji. User name/email Task 5 tidak diklaim selesai. |
| R-13 | Barrier deterministik menghentikan read setelah header; transaksi writer di koneksi lain berhasil commit receipt sebelum read items diteruskan. SHOW transaction_isolation = repeatable read dan read_only = on. Repository item memakai client yang sama. Respons lama tetap OPEN/received=0; request baru COMPLETED/received=10. Tidak memakai sleep untuk interleaving. |
| Products/security | Operator create 403, supervisor create 201, SKU ternormalisasi conflict 409, zero balance atomik, safe DTO, missing session 401 dan missing CSRF 403. |
| Receiving | Create OPEN/received=0/stock=0, partial 40 lalu full 60 dari expected 100; over 61 saat remaining 60 ditolak tanpa perubahan state. Subset item receipt sah, status menunggu semua item penuh. Client state/totals tidak dipercaya. |
| Validation | Invalid quantity 0/negative/fraction/string/>1000000, duplicate ID setelah normalisasi case, missing/invalid idempotency key, foreign item, invalid UUID, empty items, 51 items dan unknown input/query ditolak. |
| Idempotency | Same key replay dengan payload item urutan terbalik dan UUID uppercase mengembalikan body historis identik. Replay final/earlier receipt tetap benar setelah COMPLETED/receipt lain; actor/quantity berbeda conflict tanpa write. Key yang sama pada dokumen berbeda tetap membuat dua receipt independen. |
| Concurrency | Concurrent HTTP same key: satu 201 dan satu 200, satu receipt/stock increment. Distinct key 7+7 expected 10: satu 201/satu 409. 4+6: keduanya 201/COMPLETED. Dua dokumen untuk produk sama dengan urutan payload berlawanan menjaga balance total 10. |
| Late failure | Spy repository hanya untuk tes memicu SQL CHECK failure pada update balance kedua, setelah receipt, dua counter/ledger writes dan balance pertama. Sebelum error, transaksi melihat receipt=1/ledger=2. Setelah rollback, header/items/receipts/ledger/balances identik state sebelum operasi. Tidak menambah hook endpoint/flag production. |
| Reconciliation | Setelah setiap core test, query PostgreSQL memeriksa semua produk: balance=SUM ledger, item received=SUM ledger dan 0..expected; COMPLETED iff semua penuh, OPEN iff semua nol. Juga berlaku sesudah successful/rejected/replayed/concurrent/failed receipt. |
| Reads/history | Pagination/filter/unknown query, zero balances, valid missing UUID filter menghasilkan daftar kosong, bigint string, actor ID/name dan receipt/document reference. q memakai pencarian substring literal: %, _ dan backslash di-escape untuk LIKE, bukan pola client. |
| Regresi auth | Seluruh 19 auth integration Task 3 lulus kembali; endpoint bisnis memakai session/user limiter yang sama, old authVersion ditolak, missing CSRF/origin mutation ditolak dan Redis client nyata diputus menghasilkan 503 pada business reads. |
| Retry/error safety | Unit test P2034-equivalent SQL states deadlock/serialization/lock timeout dipetakan ke TRANSACTION_RETRY_REQUIRED tanpa raw detail; unexpected programming errors diteruskan ke safe 500 handler. |

### Requirement yang diimplementasikan pada scope backend

FR-PROD-01/02, FR-REC-01..06, FR-INV-01..03; US-05..11 bagian backend; BR-P01..06, BR-R01..16, BR-I01..07. Enforcement auth/CSRF/role dan NFR-01/02/03/10 didukung regresi dan pemeriksaan di atas. Ini tidak mengubah status requirement lintas frontend menjadi PASS, dan tidak mengklaim user management Task 5 selesai. Mapping 87 requirement tetap rencana sumber; hasil aktual task berada pada dokumen ini.

### Percobaan awal, warning dan batas bukti

Typecheck awal tes menemukan mock Promise biasa tidak cocok dengan fluent Prisma return type; repository method yang digunakan sebagai boundary test diubah menjadi async Promise biasa. Dua assertion fixture awal salah (expected SKU belum uppercase, expected key pagination belum diurutkan); diperbaiki tanpa mengubah aturan aplikasi. Run awal 14/16 lalu 16/16, run penuh 57/57, run final 58/58 setelah tambahan literal-search regression dan shared key antar-dokumen. Hanya hasil final yang menjadi bukti keadaan terakhir.

Warning aktual: pg 8.23.1 memperingatkan client.query saat query lain masih executing, deprecated untuk pg 9. Trace dengan NODE_OPTIONS=--trace-deprecation menunjukkan PgTransaction.performIO/queryRaw dari @prisma/adapter-pg dan interpreter Prisma runtime. Kode service/repository tidak memakai Promise.all untuk SQL pada transaction client yang sama. Dugaan terkait scheduling relation queries internal belum dibuktikan lebih jauh; warning tidak disembunyikan. Semua tes dan invariant lulus pada versi pinned sekarang. Upgrade pg 9 atau perbaikan internal adapter memerlukan verifikasi tersendiri; tidak meng-upgrade dependency di task ini.

| Pemeriksaan belum dijalankan | Status |
| --- | --- |
| User management dan USER_NOT_FOUND/user-name validation | NOT_RUN, scope Task 5 |
| Frontend/browser/E2E dan perbandingan replika kontrak | NOT_RUN, frontend tidak disentuh; sinkronisasi manual pemilik diperlukan |
| Production Linux/nginx/TLS/container API dan multi-process load/stress berkepanjangan | NOT_RUN; concurrency yang diuji adalah HTTP paralel terhadap app dengan PostgreSQL nyata |
| Deadlock/lock timeout dipaksa pada PostgreSQL | NOT_RUN; mapping error diuji unit, concurrency normal tidak memicu deadlock |
| Session restart proses, capture log/fuzzing secret menyeluruh | NOT_RUN, batas bukti Task 3 tetap |
| Mematikan server Redis/PG saat request in-flight | NOT_RUN; tes memutus Redis client nyata dan memakai port PG tidak tersedia, plus actual SQL late failure |
| Fresh isolated npm ci/audit dependency baru | NOT_RUN pada Task 4; tidak ada perubahan dependency/lockfile, bukti Task 3 tetap historis |

Tidak ada blocker spesifikasi/runtime yang ditemukan untuk memulai Task 5 setelah instruksi pengguna. Task 5 tetap perlu implementasi advisory lock/actor recheck, self/last-supervisor invariants, user CRUD whitelist/soft delete/authVersion dan tes nyata terkait. Warning adapter di atas perlu dipantau, bukan alasan mengklaim pemeriksaan yang belum dijalankan PASS.

### Artefak yang dipertahankan

- docs/source/PROJECT_SPEC.md: SHA256 901d39dc9ed68be7aa86fbcecf177c16fd57d0e767ace0360f2c74f825cfef8b.
- docs/evidence/task3-tests.json: SHA256 79e449ca6171396df90ccd861db5b11197d1e0e8071862ebb2403b5dee622976, sama dengan bukti persiapan Task 4.
- Initial migration tetap, SHA256 8d5b6518dfafb1b4d96b9a84e4341deffecc75f4636960430d296da0651ef345; tidak ada forward migration baru karena schema sudah mencukupi.
- package-lock.json SHA256 51f39b285038a3c10f4a8f231444bd1cea888ab9b17ec4aa2cdf8a85070b31c4; tidak ada dependency baru.

Kontrak hanya memperbarui metadata ketersediaan core endpoints; desain error/length/snapshot, DTO, role/status/security requirement dipertahankan. Sumber backend api-contract.md/openapi.yaml dan contract-version.json telah diperbarui; ketiga file frontend dengan nama yang sama perlu disalin manual sesuai api-sync.md. Tidak mengklaim replika sudah sinkron.


## Bukti aktual Task 5

Tanggal 2026-10-29, Asia/Jakarta. Scope hanya user management backend. Audit awal belum menemukan modul users; auth/core receiving existing dipertahankan. Tidak menjalankan Git/GitHub, mengubah metadata Git, frontend/folder induk, source PROJECT_SPEC.md, dependency/lockfile atau applied migration. Tidak melanjutkan Task 6. Bukti Task 2/3/4 serta status NOT_RUN historis tetap dipertahankan, bukan ditimpa sebagai PASS baru.

### Lingkungan dan isolasi

Windows, Node 24.12.0, baseline npm 11.6.2, seluruh binary/dependency lokal backend. Docker engine 29.8.0; PostgreSQL/Redis Task 4 existing healthy. Compose backend disiapkan sebagai project baru `wrs-task5-bc403960`, PostgreSQL 17.11 host 55442/database `wrs_task5_bc403960_test`, Redis 8.2.11 host 56392/namespace `wrs:test:task5:bc403960` ditambah UUID per test context. Env/.env.task5 lokal diabaikan dan credential tidak dicetak sebagai evidence. Dua container akhir healthy dan dibiarkan berjalan. Database/volume existing tidak dihapus; tidak FLUSHALL. Akun/fixture baru tetap berada dalam database tes, identifier dibuat unik agar re-run tidak memerlukan penghapusan data.

### Command dan hasil aktual

Command berikut dijalankan dari root backend menggunakan binary lokal. BACKEND_ENV_FILE menunjuk env/.env.task5 untuk migrate/seed/integration.

| Command | Hasil |
| --- | --- |
| docker info --format '{{.ServerVersion}}' | PASS exit 0, engine 29.8.0 |
| docker compose --env-file env/.env.task4 ps | PASS exit 0, dependency existing healthy |
| docker compose --env-file env/.env.task5 up -d --wait postgres redis | PASS exit 0, dependency terisolasi healthy |
| node node_modules/prisma/build/index.js migrate deploy | PASS exit 0, initial migration existing diterapkan pada DB baru; deploy ulang: No pending migrations to apply |
| node node_modules/tsx/dist/cli.mjs prisma/seeds/index.ts | PASS exit 0, akun awal berasal dari env |
| node node_modules/eslint/bin/eslint.js . | PASS exit 0 |
| node node_modules/typescript/bin/tsc --noEmit | PASS exit 0, TypeScript strict/skipLibCheck=false |
| node node_modules/vitest/vitest.mjs run tests/integration/users.test.ts | PASS exit 0, 13 tes khusus sebelum tambahan boundary email pada run final |
| node node_modules/vitest/vitest.mjs run --reporter=default --reporter=json --outputFile=docs/evidence/task5-tests.json | PASS exit 0, 7 file, 71 tes, 17.43 detik: users 13 + auth 19 + core receiving 20 + foundation 7 + unit 12 |
| node node_modules/prisma/build/index.js validate --config prisma.generate.config.ts | PASS exit 0, schemas valid |
| node node_modules/prisma/build/index.js generate --config prisma.generate.config.ts | PASS exit 0, Client 7.10.1 |
| node node_modules/typescript/bin/tsc -p tsconfig.build.json | PASS exit 0, build final |
| docker compose --env-file env/.env.task5 ps | PASS exit 0, postgres healthy/redis healthy |
| python -m openapi_spec_validator docs/openapi.yaml | PASS exit 0, docs/openapi.yaml: OK |
| python docs/validation/check-task4-readiness.py | PASS exit 0, desain 404/Unicode/snapshot dan hash kontrak/sumber konsisten |
| python docs/validation/check-docs.py | PASS exit 0, 87 IDs, 39 archive hashes, 20 operasi, link lokal dan manifest kontrak cocok |

Validator Python memakai PYTHONUTF8=1 dan PYTHONPATH=.cache/doc-tools yang sudah tersedia; tidak menginstal dependency baru. Detail assertion/durasi: [task5-tests.json](evidence/task5-tests.json). Ringkasan lingkungan/hasil/hash evidence terdahulu: [task5-verification.json](evidence/task5-verification.json).

### Bukti perilaku yang lulus

| Area | Bukti aktual |
| --- | --- |
| Authorization/security | GET tanpa session 401. OPERATOR ditolak 403 pada list/detail/create/PATCH/DELETE. Supervisor membuat kedua role. Semua mutation termasuk DELETE tanpa body ditolak 403 tanpa CSRF. Middleware session/global/user limiter Task 3 tetap digunakan. |
| R-10 | Missing UUID target GET/PATCH/DELETE menghasilkan 404 USER_NOT_FOUND; UUID/query invalid tetap 400. Deleted row masih ada dan detail 200, bukan not-found. |
| R-11 dan password | Nama astral 120 round trip DB, 121 ditolak; combining mark 120 code point diterima. Password astral 12/128 diterima, 11/129 ditolak. Email 254 diterima, 255 ditolak. Nama/email trim dan lowercase sesuai field; password whitespace tidak diubah, Argon2 verify password asli true dan versi trim false. |
| Whitelist/DTO | Unknown field/create authVersion, role tambahan, update kosong, email/password/deletedAt via PATCH dan boolean string ditolak. Password di DB berupa hash, bukan plaintext. Create/list/detail memakai tepat delapan field UserDto; authVersion/hash/session internals tidak masuk response. |
| Uniqueness | Email dengan variasi kapitalisasi conflict 409 EMAIL_ALREADY_EXISTS, termasuk saat pemilik email telah soft-deleted. |
| List/filter/sorting | List default meliputi aktif/nonaktif tanpa deleted; filter role/isActive/includeDeleted literal, pagination dan createdAt DESC/id DESC diverifikasi. includeDeleted menampilkan deleted; detail supervisor tetap dapat membacanya. |
| Self restriction | Self-demotion, self-disable (termasuk perubahan nama bersamaan) dan self-delete 409 SELF_ACCOUNT_RESTRICTION; seluruh row tetap identik setelah ditolak. |
| Last supervisor/concurrency | Fixture tes mengisolasi dua supervisor aktif, menonaktifkan sementara supervisor lain lalu mengembalikannya dalam finally. Dua transaksi cross-demotion bersamaan: satu berhasil, satu FORBIDDEN setelah recheck; tersisa tepat satu supervisor. Last actor tetap tidak dapat demote/disable/delete diri. Setelah setiap user test count aktif >=1. |
| Guard LAST_ACTIVE_SUPERVISOR | Test-only repository injection membuat transaksi menonaktifkan semua supervisor setelah update, lalu count nyata nol. Guard menghasilkan 409 LAST_ACTIVE_SUPERVISOR dan seluruh transaksi rollback. Tidak menambah hook/flag production dan tidak mengklaim ini input API normal. |
| Actor menunggu lock | Holder transaksi memperoleh advisory lock, mutation kedua antre. pg_backend_pid dan pg_locks memastikan advisory lock kedua NOT granted (bukan sekadar sleep). Holder mengubah status, role atau deleted actor lalu commit; mutation yang menunggu ditolak 403 setelah lock, target name tidak berubah. Diuji untuk ketiga jenis kehilangan akses dengan PostgreSQL nyata. |
| Atomic authVersion | Nama dan role/status no-op tidak mengubah versi/session. Perubahan role+status bersama menaikkan versi sekali; aktivasi ulang dan role change berikutnya mencabut session lama pada /auth/me. Soft delete menaikkan versi dan old SID ditolak. |
| Soft delete/history | Delete pertama isActive=false/deletedAt/version+1. Deleted login ditolak generik 401, PATCH/restore ditolak 409 USER_DELETED. Delete ulang 204 tanpa perubahan deletedAt/updatedAt/version. FK receiving/receipt/ledger tetap ada; history actor dan receiving.createdBy tetap dapat ditelusuri. |
| Late failure | Setelah repository benar-benar mengubah role/name/version, SQL auth_version=0 memicu CHECK failure PostgreSQL. Respons service 503 dan seluruh row termasuk authVersion identik sebelum operasi. Tidak ada partial update. |
| Regresi | Seluruh 19 auth integration, 20 receiving integration, 7 foundation dan 12 unit lulus ulang pada database tes Task 5. Concurrency/idempotency/rollback/reconciliation inventory tetap lulus. |

Foundation seed test disesuaikan karena Task 5 menambah akun secara sah: ia memeriksa tepat dua akun seed berdasarkan email, bukan mengasumsikan seluruh database hanya punya dua user. Perbandingan seluruh row sebelum/sesudah seed ulang dan verifikasi password seed tetap dilakukan, sehingga akun tambahan/hash existing tidak dihapus atau ditimpa agar tes lulus.

### Keputusan, requirement dan batas bukti

Tidak mengubah requirement. Service mutation memakai account lock existing 735910001, actor recheck, seluruh operasi melalui transaction client. Hash di luar transaksi/lock. Self restriction diperiksa sebelum write; final count menjaga minimal satu supervisor. Perubahan name saja/no-op tidak revoke; role/status aktual revoke sekali. Detail keputusan urutan pada technical-spec.md. R-10/R-11 kini punya bukti user-management di atas; R-13 tidak berubah dan regresi receiving tetap lulus.

Requirement scope backend yang ditangani: FR-USER-01..05, US-02/03/04, BR-U01..12, serta NFR-01/02/04/05/10 terkait. Ini bukan klaim seluruh 87 requirement atau behavior frontend/E2E/deployment sudah PASS.

Warning deprecation pg 8.23.1 dari jalur internal Prisma/adapter yang sudah dicatat Task 4 masih muncul saat relational queries. Tidak disembunyikan atau dianggap hilang; semua 71 tes lulus pada versi pinned. Tidak mengubah dependency untuk menutupi warning. Upgrade pg 9 dan diagnosis scheduling internal lebih lanjut belum diuji.

| Pemeriksaan tersisa | Status |
| --- | --- |
| Frontend contract comparison/sync dan UI/browser/E2E | NOT_RUN, frontend tidak diubah; pemilik menyalin api-contract.md, openapi.yaml, contract-version.json secara identik manual |
| Task 6 | NOT_RUN, tidak dilanjutkan |
| Deployment Linux/nginx/TLS/container API dan stress/load berkepanjangan | NOT_RUN |
| Forced deadlock/lock timeout nyata, restart host/API dan full secret-log fuzzing | NOT_RUN; batas bukti Task 3/4 tetap |
| Mematikan PostgreSQL/Redis server fisik saat in-flight request | NOT_RUN; outage/client-failure regression existing tetap lulus |
| Fresh isolated npm ci atau audit dependency baru Task 5 | NOT_RUN, tidak ada dependency/lockfile baru |

Tidak ada blocker backend yang ditemukan untuk memulai Task 6 setelah instruksi pengguna. Frontend belum dikerjakan dan artefak kontraknya belum dibandingkan. Metadata ketersediaan endpoint kini menyatakan seluruh 20 operasi tersedia; bentuk DTO, security, error/status dan business rules tetap. Sumber backend Markdown/OpenAPI dan manifest telah selaras/divalidasi. Bukti task sebelumnya tidak ditimpa.
