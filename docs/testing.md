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
