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

Seluruh tes fitur auth/CSRF/limiter/receiving/user management dan business browser flow tetap **NOT_RUN**; Task 3 belum dimulai. Rencana frontend RTL/Playwright bukan bukti script test sudah tersedia. Database/balance/concurrency adalah enforcement backend; frontend memverifikasi behavior konsumen melalui kontrak, bukan memalsukan SQL proof.

## Status pekerjaan dokumentasi saat ini

Hanya pemeriksaan statis dokumentasi: referensi lokal, 87 ID requirement, hash snapshot sumber, kesamaan kontrak dan konteks arsip yang diperiksa. Typecheck/build/unit/integration/browser/DB/deployment **NOT_RUN** pada pekerjaan ini; PASS terdahulu tetap historis. Hasil pemeriksaan statis baru dicatat terpisah setelah command benar-benar dijalankan pada [evidence dokumentasi](evidence/documentation-check.json).

## Cara mencatat bukti selanjutnya

Catat Command, Environment, Date (Asia/Jakarta), Exit code, Observed output dan Requirement IDs. Jangan mengubah NOT_RUN menjadi PASS karena ada file tes atau salinan evidence. Jangan menghapus data/volume, menjalankan Git/GitHub atau menganggap artifact remote sudah sinkron tanpa perbandingan. Pertanyaan R-10/R-11/R-13 tetap dicatat pada spec-review.md sebelum behavior terdampak dikerjakan.

## Hasil aktual pemeriksaan dokumentasi mandiri

Pada 2026-10-29, `python docs/validation/check-docs.py` dijalankan dari root repository ini dan exit 0: 87 ID source/PRD/mapping konsisten, 13 Markdown aktif diperiksa, semua target link lokal tetap di dalam repository, 39 hash arsip cocok, hash kontrak cocok dan inventaris API Markdown/OpenAPI sama-sama 20 operasi. Perbandingan tambahan replika frontend dengan artefak backend lokal juga exit 0; ini bukan pemeriksaan freshness remote GitHub.

Metadata kontrak aktif kini memperjelas bahwa hanya health fondasi tersedia; endpoint auth/bisnis tetap rencana. File root/snapshot asli tidak diubah. Pemeriksaan di atas bersifat statis, bukan validator penuh schema OpenAPI atau bukti server/client berjalan. Validator schema, unit/integration/build/browser/deployment baru pada pekerjaan ini tetap NOT_RUN. Tidak ada perintah Git/GitHub, penghapusan data atau Task 3 yang dijalankan.
