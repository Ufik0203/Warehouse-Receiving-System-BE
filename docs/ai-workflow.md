# AI workflow repository backend mandiri

Instruksi ini berlaku dari root repository ini; tidak mengasumsikan manifest, file, konfigurasi atau source aplikasi saudara. Semua pekerjaan Git/GitHub hanya manual pengguna; agent tidak menjalankan perintah Git atau tool GitHub, termasuk read-only. Baca [AGENTS](../AGENTS.md), [PRD](prd.md), [technical-spec](technical-spec.md), [API Markdown](api-contract.md), [OpenAPI](openapi.yaml), [review](spec-review.md), [testing](testing.md) dan [sync](api-sync.md).

## Riwayat yang sudah ada

Task 1 review/OpenAPI, Task 2 fondasi, Task 2A UI dan persiapan repository telah dilakukan dalam konteks yang dicatat pada [arsip workflow asli](history/combined/docs/ai-workflow.md) dan [testing](testing.md). Snapshot asli mempertahankan rencana lama/command workspace sebagai bukti historis; jangan menjalankannya sebagai command checkout ini atau menyatakan bahwa seluruh fitur selesai. Pada pekerjaan dokumentasi ini tidak ada task aplikasi yang dijalankan.

## Tahap berikutnya, belum dijalankan

| Tahap sumber | Status | Scope repository ini |
| --- | --- | --- |
| Task 3 | NOT_STARTED; pengujian NOT_RUN | Redis sessions, CSRF bootstrap/login/logout/me, revocation, limiter; belum diimplementasikan |
| Task 4 | PLANNED; NOT_RUN | Products/receivings/inventory, row locks, canonical payload hashing, idempotency dan atomic ledger |
| Task 5 | PLANNED; NOT_RUN | Supervisor user management, advisory lock/actor recheck, self/last-supervisor invariants |
| Task 6 integration boundary | PLANNED; NOT_RUN | Sediakan kontrak/API untuk frontend; tidak mengerjakan UI di repo ini |
| Task 7 backend | PLANNED; NOT_RUN | Backend image/migration job, reproducible deployment, secret/proxy config dan runtime evidence |

## Checklist aktif

- [ ] Mulai Task 3 hanya setelah pengguna memberi instruksi eksplisit.
- [ ] Implementasikan auth/service/repository/mapper/router dan common middleware mengikuti PRD/kontrak, bukan asumsi.
- [ ] Redis-backed sessions, regenerate login, CSRF login/mutations, origin/Referer, TTL idle/absolute dan saved session sebelum response.
- [ ] Role/status/authVersion dari PostgreSQL; failed store -> 503 tanpa fallback; global/login/user limiters terpisah.
- [ ] Unit/integration nyata untuk fixation, stale token, logout/revocation/expiry, shared limiter dua API dan Redis outage.
- [ ] Tutup keputusan R-10/R-11/R-13 sebelum endpoint/input yang terkait, tanpa menambah scope stakeholder.
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
