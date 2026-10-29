# AI workflow repository backend mandiri

Instruksi ini berlaku dari root repository ini; tidak mengasumsikan manifest, file, konfigurasi atau source aplikasi saudara. Semua pekerjaan Git/GitHub hanya manual pengguna; agent tidak menjalankan perintah Git atau tool GitHub, termasuk read-only. Baca [AGENTS](../AGENTS.md), [PRD](prd.md), [technical-spec](technical-spec.md), [API Markdown](api-contract.md), [OpenAPI](openapi.yaml), [review](spec-review.md), [testing](testing.md) dan [sync](api-sync.md).

## Riwayat yang sudah ada

Task 1 review/OpenAPI, Task 2 fondasi, Task 2A UI dan persiapan repository telah dilakukan dalam konteks yang dicatat pada [arsip workflow asli](history/combined/docs/ai-workflow.md) dan [testing](testing.md). Snapshot asli mempertahankan rencana lama/command workspace sebagai bukti historis; jangan menjalankannya sebagai command checkout ini atau menyatakan bahwa seluruh fitur selesai. Pada pekerjaan dokumentasi ini tidak ada task aplikasi yang dijalankan.

## Status tahap aktif

| Tahap sumber | Status | Scope repository ini |
| --- | --- | --- |
| Task 3 | IMPLEMENTED; pemeriksaan aktual pada testing.md | Redis sessions, CSRF bootstrap/login/logout/me, revocation, authorization, shared limiter |
| Task 4 | IMPLEMENTED; hasil runtime pada testing.md | Products/receivings/inventory, row locks, canonical payload hashing, idempotency dan atomic ledger |
| Task 5 | IMPLEMENTED; hasil runtime pada testing.md | Supervisor user management, advisory lock/actor recheck, self/last-supervisor invariants |
| Task 6 integration boundary | PLANNED; NOT_RUN | Sediakan kontrak/API untuk frontend; tidak mengerjakan UI di repo ini |
| Task 7 backend | PLANNED; NOT_RUN | Backend image/migration job, reproducible deployment, secret/proxy config dan runtime evidence |

## Checklist aktif

- [x] Task 3 diizinkan eksplisit pengguna; audit awal hanya menemukan fondasi health, belum ada implementasi auth.
- [x] Implementasikan auth/service/repository/mapper/router dan common middleware mengikuti PRD/kontrak.
- [x] Redis-backed sessions, regenerate login, CSRF login/mutations, origin/Referer, TTL idle/absolute dan saved session sebelum response.
- [x] Role/status/authVersion dari PostgreSQL; failed store -> 503 tanpa fallback; global/login/user limiters terpisah.
- [x] Integration nyata untuk fixation, stale token, logout/revocation/expiry, shared limiter dua API dan Redis client outage; batas simulasi dicatat di testing.md.
- [x] Desain R-10/R-11/R-13 ditetapkan pada task4-readiness.md; implementasi/tes bisnis tetap NOT_RUN.
- [ ] Receiving tests kritis harus PASS sebelum integrasi stock mutations frontend: concurrent same/distinct keys, cross-document item/product, late failure dan reconciliation.
- [ ] Selaraskan sumber Markdown/OpenAPI, validasi schema dan minta pemilik menyalin artefak frontend sesuai api-sync.md.
- [ ] Catat hasil aktual, batas bukti dan NOT_RUN tersisa. Git/GitHub tetap manual pengguna.

## Command verifikasi yang tersedia

```powershell
npx --yes --offline=false --package=npm@11.6.2 npm ci --offline=false
npm run lint
npm run prisma:validate
npm run typecheck
npm run build
npm run test:unit
python docs/validation/check-docs.py
```

Tes database backend memerlukan env khusus _test dan Redis nyata sesuai README. Tidak menjalankan migrate/seed/test database hanya untuk mengecek dokumentasi. Script frontend component/e2e belum tersedia dan tetap NOT_RUN. Paket/data/schema aplikasi lain bukan dependency build repo ini.

## Execution log dokumentasi mandiri

- Date: 2026-10-29 (Asia/Jakarta).
- Input: dokumen root proyek sumber dan konfigurasi/package lokal.
- Output: AGENTS scope lokal; README, PRD, technical-spec, API pair, sync protocol, review/mapping/dependency, workflow/testing; source/provenance dan arsip evidence asli.
- Keputusan: backend canonical API, frontend replika byte-identik; command aktif tanpa flags workspace/path parent; histori tidak diubah menjadi PASS baru.
- Pemeriksaan: statis dokumentasi saja, hasil di docs/evidence/documentation-check.json setelah benar-benar dijalankan.
- Implementasi aplikasi, database, browser, Git/GitHub dan Task 3: NOT_RUN pada pekerjaan ini.

Untuk setiap task berikutnya catat task/tanggal/input/instruksi/file berubah/keputusan/command/hasil aktual/keterbatasan; pengguna mengurus seluruh riwayat Git manual. Tidak membuat atau mengarang commit/PR/log pengujian.


## Execution log Task 3

2026-10-29: pengguna mengizinkan Task 3 backend. Input seluruh spesifikasi lokal, audit implementasi existing dan dependency plan. Implementasi auth berlapis, middleware/cache/security, env/proxy/namespace dan dependency exact ditambahkan; frontend/endpoint bisnis tidak dikerjakan. Keputusan teknis dicatat di spec-review.md. Lint/typecheck/build, 35 tes, Prisma validate/generate/deploy ulang dan validator OpenAPI lulus; detail percobaan serta NOT_RUN tetap di testing.md. .gitignore tidak lagi mengabaikan docs/source; metadata Git tidak disentuh. Kontrak hanya memperbarui metadata endpoint tersedia dan manifest hash; sinkronisasi frontend belum dijalankan.

Gate Task 4: R-10/R-11/R-13 tetap terbuka sebelum behavior terkait; transaksi receiving, idempotency, concurrency dan reconciliation belum diuji. Jangan mulai endpoint bisnis atau user management dalam Task 3 ini.


## Persiapan Task 4 (review dokumentasi)

R-10/R-11/R-13 berstatus DESIGN_RESOLVED, bukan implementasi selesai; lihat [dasar dan cakupan](task4-readiness.md). Pengguna mengizinkan keputusan teknis, belum implementasi endpoint bisnis. Tidak ada perubahan business scope/dependency/migration/frontend.

Urutan implementasi berikutnya, semuanya belum dijalankan:

1. Validator/query/DTO produk dan receiving dengan code-point boundaries, UUID normalization dan error table R-10.
2. Products read/create dan balance nol atomik; authorization supervisor pada create.
3. Create receiving: validasi semua referensi sebelum insert atomik; list/read detail dengan transaksi baca R-13.
4. Receipt transaction: canonical hash, parent lock, replay sebelum completed, quantity checks, write counters/ledger/balances/status atomik dan urutan productId.
5. Inventory read/history, mapper bigint string dan actor historical sesuai kontrak.
6. Real integration: absent product 404/no write, Unicode boundaries, snapshot barrier antar-koneksi, same/distinct idempotency keys, late failure dan reconciliation. Jangan mengklaim PASS sebelum dijalankan.
7. Lint/typecheck/build, kontrak validator dan dokumentasi hasil aktual; frontend contract sync manual oleh pemilik. Git/GitHub tetap manual pengguna.


## Execution log implementasi Task 4

2026-10-29, pengguna mengizinkan core receiving backend. Audit awal: hanya auth/health, belum ada modul bisnis. PostgreSQL/Redis existing healthy; project Compose verifikasi baru disiapkan tanpa menghapus data/volume existing. Products/receivings/inventory berlapis, input validation dan DB error mapping ditambahkan. Tidak ada user management/fitur frontend atau dependency/migration baru.

- [x] Products read/detail/create, authorization supervisor, SKU normalization dan balance nol atomik.
- [x] Create/list receiving; validasi product references, strict inputs dan Unicode code point.
- [x] Detail snapshot read-only REPEATABLE READ melalui transaction client sama.
- [x] Receipt parent/item locks, persistent idempotency, replay sebelum completed dan atomic writes.
- [x] Inventory/history, bigint string, filter dan pagination.
- [x] Real integration untuk concurrency, late failure, replay, snapshot dan reconciliation; regresi Task 3.
- [x] Lint/typecheck/build, Prisma validate/generate/deploy ulang; bukti rinci pada testing.md.
- [ ] User 404/Unicode user-name validation Task 5 belum diimplementasikan; jangan mengklaim seluruh cakupan R-10/R-11 selesai.
- [ ] Frontend contract sync, browser flow dan deployment Linux/TLS tetap NOT_RUN.

Keputusan R-10/R-11/R-13 kini punya bukti runtime sesuai scope Task 4. Catatan review/NOT_RUN sebelum implementasi di atas tetap histori. Tidak melanjutkan Task 5/6 atau menjalankan Git/GitHub.


## Execution log Task 5

2026-10-29: pengguna mengizinkan user management backend. Audit awal tidak menemukan users module. Docker dan PostgreSQL/Redis existing healthy; project tes baru _test/Redis namespace terpisah dibuat tanpa menghapus volume/data. Modul users berlapis diimplementasikan; auth/core receiving tetap dipertahankan. Tidak menjalankan Git/GitHub atau melanjutkan frontend/Task 6.

- [x] Supervisor-only create/list/detail/update/soft delete, DTO aman dan strict input.
- [x] R-10 USER_NOT_FOUND; R-11 nama/password/email boundaries dan normalisasi sesuai kontrak.
- [x] Shared advisory lock dengan seed, actor recheck setelah lock dan transaksi account invariant.
- [x] Self restrictions, minimal supervisor, version increments actual-change dan repeated delete 204.
- [x] Tes nyata lock wait pg_locks, concurrent cross-demotion, SQL late failure, history/revocation.
- [x] Regresi Task 3/4; 71 tes, lint/typecheck/build, Prisma validate/generate/deploy ulang.
- [ ] Frontend contract sync, browser/E2E dan Task 6 tetap NOT_RUN.

Catatan belum-tersedia/NOT_RUN user management pada Task 4 di atas adalah histori, bukan status terbaru. Tidak mengubah bukti task sebelumnya. Perintah dan batas bukti terbaru ada pada testing.md.
