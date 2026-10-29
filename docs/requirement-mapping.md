# Mapping requirement ke modul dan verifikasi

Snapshot rencana Task 1; status per baris adalah status suite requirement lengkap saat mapping dibuat. Bukti fondasi yang dijalankan pada Task 2 ada di [testing.md](history/combined/docs/testing.md#bukti-aktual-task-2); PASS fondasi tidak menyatakan fitur bisnis/security lengkap sudah lulus.

Tanggal review: 2026-10-29 (Asia/Jakarta). Sumber normatif: PRD; dibandingkan dengan PROJECT_SPEC.md.

87 ID unik: 22 FR, 12 US, 41 BR, 12 NFR. Setiap baris adalah rencana verifikasi; seluruh pengujian implementasi **NOT_RUN**. Integration menggunakan PostgreSQL dan Redis nyata dengan database `_test` dan namespace Redis terpisah.

| ID | Requirement sumber | Modul / tanggung jawab | Rencana verifikasi | Status |
| --- | --- | --- | --- | --- |
| FR-AUTH-01 | Pengguna dapat login menggunakan email dan password. | auth; common/security; frontend/auth | Integration: login valid/salah/nonaktif/deleted dan regenerasi SID | NOT_RUN |
| FR-AUTH-02 | Login menggunakan session yang disimpan di Redis. | auth; common/security; frontend/auth | Integration: session berada di Redis, bertahan restart API | NOT_RUN |
| FR-AUTH-03 | Pengguna dapat logout dan session server dihancurkan. | auth; common/security; frontend/auth | Integration: logout menghancurkan store dan cookie lama ditolak | NOT_RUN |
| FR-AUTH-04 | Semua operasi perubahan data dilindungi CSRF, termasuk login. | auth; common/security; frontend/auth | Integration: semua mutation termasuk login menolak token hilang/salah | NOT_RUN |
| FR-USER-01 | Supervisor dapat membuat akun operator atau supervisor. | users; auth | Integration: supervisor membuat kedua role; operator 403 | NOT_RUN |
| FR-USER-02 | Supervisor dapat melihat daftar dan detail user. | users; auth | Integration: supervisor list/detail termasuk deleted; operator 403 | NOT_RUN |
| FR-USER-03 | Supervisor dapat mengubah nama, role, dan status aktif user. | users; auth | Integration: update whitelist, role/status/name dan input kosong | NOT_RUN |
| FR-USER-04 | Penghapusan user menggunakan soft delete. | users; auth | Integration: soft delete mempertahankan FK dan riwayat | NOT_RUN |
| FR-USER-05 | Perubahan role, status aktif, atau penghapusan membatalkan session lama melalui pemeriksaan versi autentikasi. | users; auth | Integration: versi lama 401 pada request berikutnya | NOT_RUN |
| FR-PROD-01 | Pengguna dapat melihat daftar produk. | products; frontend/products | Integration: kedua role list, pagination dan pencarian | NOT_RUN |
| FR-PROD-02 | Supervisor dapat membuat produk dengan SKU unik. | products; frontend/products | Integration: supervisor create, SKU ternormalisasi unik, operator 403 | NOT_RUN |
| FR-REC-01 | Pengguna dapat membuat dokumen penerimaan beserta item dan jumlah yang diharapkan. | receivings; inventory; frontend/receivings | Integration: create 1-50 item berbeda; stock tetap nol | NOT_RUN |
| FR-REC-02 | Pengguna dapat melihat daftar dan detail dokumen penerimaan. | receivings; inventory; frontend/receivings | Integration: list/filter dan detail snapshot konsisten | NOT_RUN |
| FR-REC-03 | Pengguna dapat menerima sebagian atau seluruh jumlah yang tersisa. | receivings; inventory; frontend/receivings | Integration: expected 100, receive 40 lalu 60 | NOT_RUN |
| FR-REC-04 | Backend menolak penerimaan melebihi sisa jumlah. | receivings; inventory; frontend/receivings | Integration: receive 61 saat sisa 60 -> 409 tanpa write | NOT_RUN |
| FR-REC-05 | Sistem memperbarui status dokumen secara otomatis. | receivings; inventory; frontend/receivings | Integration: OPEN/PARTIAL/COMPLETED dari seluruh item | NOT_RUN |
| FR-REC-06 | Pengulangan permintaan penerimaan yang sama tidak menambah stok lagi. | receivings; inventory; frontend/receivings | Integration: replay identik tanpa ledger/balance tambahan | NOT_RUN |
| FR-INV-01 | Stok bertambah otomatis setelah penerimaan berhasil disimpan. | inventory; receivings | Integration: balance dan ledger bertambah hanya saat commit | NOT_RUN |
| FR-INV-02 | Semua pengguna terautentikasi dapat melihat stok. | inventory; receivings | Integration: kedua role membaca stok termasuk nol | NOT_RUN |
| FR-INV-03 | Semua pengguna terautentikasi dapat melihat riwayat transaksi. | inventory; receivings | Integration: kedua role membaca history/filter dan actor deleted | NOT_RUN |
| FR-OPS-01 | Tersedia health check dan readiness check. | health; deployment | Deployment: live/ready, schema/DB/Redis putus -> ready 503 | NOT_RUN |
| FR-OPS-02 | Aplikasi dapat dijalankan menggunakan Docker Compose. | health; deployment | Deployment: clean Compose, migration/seed selesai sebelum API | NOT_RUN |
| US-01 | Sebagai pengguna, saya ingin login. | auth | E2E/integration: login valid baru, salah 401 generik, akun terlarang ditolak | NOT_RUN |
| US-02 | Sebagai supervisor, saya ingin membuat user. | users; auth | Integration: normalize email, role wajib, Argon2 hash, safe DTO | NOT_RUN |
| US-03 | Sebagai supervisor, saya ingin mengubah role user. | users; auth | Integration: role update mencabut sesi dan operator 403 | NOT_RUN |
| US-04 | Sebagai supervisor, saya ingin menghapus user. | users; inventory | Integration: deletedAt/isActive dan history tetap tersedia | NOT_RUN |
| US-05 | Sebagai supervisor, saya ingin membuat produk. | products; inventory | Integration: SKU valid unik, balance nol | NOT_RUN |
| US-06 | Sebagai operator, saya ingin membuat dokumen. | receivings | Integration: receiving minimal satu, produk unik, expected valid, stok tetap | NOT_RUN |
| US-07 | Sebagai operator, saya ingin menerima sebagian pengiriman. | receivings; inventory | Integration/E2E: expected 100 receive 40 -> 40/60 PARTIAL stock +40 | NOT_RUN |
| US-08 | Sebagai operator, saya ingin menyelesaikan penerimaan. | receivings; inventory | Integration/E2E: receive sisa 60 -> COMPLETED total stock 100 | NOT_RUN |
| US-09 | Sebagai operator, saya ingin sistem menolak jumlah berlebih. | receivings; inventory | Integration: receive 61 saat sisa 60, semua tabel tidak berubah | NOT_RUN |
| US-10 | Sebagai operator, saya ingin aman saat mengulang permintaan. | receivings; frontend/receivings | Integration/E2E: replay key/payload sama, satu ledger; lost-response retry | NOT_RUN |
| US-11 | Sebagai pengguna, saya ingin melihat transaksi. | inventory; frontend/inventory | Integration/E2E: history memuat product/delta/doc/receipt/actor/waktu | NOT_RUN |
| US-12 | Sebagai reviewer, saya ingin menjalankan proyek. | health; deployment | Deployment: dari bersih database migrated/seeded, API/web dan readiness sukses | NOT_RUN |
| BR-U01 | Role hanya OPERATOR dan SUPERVISOR. | users; auth; common/security | Unit/integration: enum hanya dua role; role lain 400 | NOT_RUN |
| BR-U02 | Tidak ada registrasi publik. | users; auth; common/security | Contract/route audit: tidak ada public registration | NOT_RUN |
| BR-U03 | Email dinormalisasi dengan trim dan lowercase sebelum disimpan. | users; auth; common/security | Unit/integration: trim lowercase email sebelum lookup dan simpan | NOT_RUN |
| BR-U04 | Email tetap unik meskipun user sudah dihapus. | users; auth; common/security | Integration: create email deleted/beda kapitalisasi -> 409 | NOT_RUN |
| BR-U05 | Password tidak boleh di-trim atau dinormalisasi. | users; auth; common/security | Unit/integration: whitespace password dipertahankan persis | NOT_RUN |
| BR-U06 | Password baru memiliki panjang 12–128 karakter Unicode, dihitung berdasarkan code point. | users; auth; common/security | Unit: batas 11/12/128/129 code point termasuk astral Unicode | NOT_RUN |
| BR-U07 | Update user pada versi ini hanya mencakup nama, role, dan status aktif. | users; auth; common/security | Integration: hanya name/role/isActive; unknown field 400 | NOT_RUN |
| BR-U08 | Perubahan email dan reset password belum termasuk scope. | users; auth; common/security | Contract audit: update email/password 400; tidak ada reset endpoint | NOT_RUN |
| BR-U09 | Supervisor tidak boleh menurunkan role, menonaktifkan, atau menghapus dirinya sendiri. | users; auth; common/security | Integration: self-demotion/deactivate/delete -> conflict | NOT_RUN |
| BR-U10 | Sistem harus mempertahankan minimal satu supervisor aktif yang tidak terhapus. | users; auth; common/security | Concurrency: dua supervisor mengubah akun bersamaan; tetap satu aktif | NOT_RUN |
| BR-U11 | User terhapus tidak dapat diaktifkan kembali melalui endpoint update. | users; auth; common/security | Integration: update deleted -> USER_DELETED; tidak restore | NOT_RUN |
| BR-U12 | Request baru dari session dengan versi autentikasi lama harus ditolak. Request yang telah berjalan sebelum pencabutan dapat selesai. | users; auth; common/security | Integration: request baru versi lama ditolak; in-flight boleh selesai | NOT_RUN |
| BR-P01 | SKU dinormalisasi dengan trim dan uppercase. | products; inventory | Unit: trim uppercase SKU sebelum validasi | NOT_RUN |
| BR-P02 | SKU memiliki panjang 1–40 karakter dan cocok dengan [A-Z0-9_-]+. | products; inventory | Unit: batas 0/1/40/41 dan regex setelah normalisasi | NOT_RUN |
| BR-P03 | Nama produk memiliki panjang 1–120 karakter setelah trim. | products; inventory | Unit: nama trim, batas 0/1/120/121; unit panjang masih terbuka | NOT_RUN |
| BR-P04 | Satuan versi pertama hanya pcs. | products; inventory | Integration: unit pcs; field unit dari client ditolak | NOT_RUN |
| BR-P05 | Produk baru memiliki stok nol. | products; inventory | Integration: create product dan balance nol atomik | NOT_RUN |
| BR-P06 | Perubahan dan penghapusan produk belum termasuk scope. | products; inventory | Contract audit: tidak ada update/delete product | NOT_RUN |
| BR-R01 | Satu dokumen memiliki 1–50 produk berbeda. | receivings; inventory | Unit/integration: 0/1/50/51 produk dan duplicate UUID ternormalisasi | NOT_RUN |
| BR-R02 | Expected quantity adalah integer antara 1 dan 1.000.000. | receivings; inventory | Unit: expected 0/1/1000000/1000001, pecahan/string ditolak | NOT_RUN |
| BR-R03 | Expected quantity tidak dapat diubah setelah dokumen dibuat. | receivings; inventory | Contract audit: tidak ada update expected; client field ditolak | NOT_RUN |
| BR-R04 | Quantity pada receipt merupakan tambahan penerimaan, bukan total kumulatif. | receivings; inventory | Integration: receive 40 lalu 60 adalah delta total 100 | NOT_RUN |
| BR-R05 | Setiap quantity receipt adalah integer positif. | receivings; inventory | Unit: quantity nol/negatif/pecahan/string ditolak | NOT_RUN |
| BR-R06 | receivedQuantity tidak boleh melebihi expectedQuantity. | receivings; inventory | Integration/concurrency: received selalu <= expected | NOT_RUN |
| BR-R07 | Receipt dapat mencakup sebagian item dokumen. | receivings; inventory | Integration: receipt subset satu item dari dokumen multi-item | NOT_RUN |
| BR-R08 | Satu item tidak boleh muncul dua kali dalam satu receipt. | receivings; inventory | Unit/integration: item ID berulang termasuk case UUID -> 400 | NOT_RUN |
| BR-R09 | Receipt dengan beberapa item harus berhasil seluruhnya atau tidak mengubah data apa pun. | receivings; inventory | Integration: satu valid dan satu berlebih rollback seluruh receipt | NOT_RUN |
| BR-R10 | Status OPEN berarti belum ada barang diterima. | receivings; inventory | Integration: seluruh received nol -> OPEN | NOT_RUN |
| BR-R11 | Status PARTIAL berarti sudah ada barang diterima tetapi belum semua item lengkap. | receivings; inventory | Integration: sebagian diterima dan belum lengkap -> PARTIAL | NOT_RUN |
| BR-R12 | Status COMPLETED berarti semua item diterima penuh. | receivings; inventory | Integration: semua item penuh iff COMPLETED | NOT_RUN |
| BR-R13 | Penyelesaian dokumen dilakukan otomatis. | receivings; inventory | Integration: selesai otomatis tanpa manual complete | NOT_RUN |
| BR-R14 | Dokumen completed menolak receipt baru. | receivings; inventory | Integration: completed dengan key baru -> 409 | NOT_RUN |
| BR-R15 | Pengulangan receipt lama yang valid tetap diperbolehkan meskipun dokumen sudah completed. | receivings; inventory | Integration: replay final setelah completed -> 200 tanpa write | NOT_RUN |
| BR-R16 | Receipt tersimpan tidak dapat diedit atau dihapus melalui aplikasi. | receivings; inventory | Contract audit: receipt tidak punya update/delete | NOT_RUN |
| BR-I01 | Stok bertambah saat transaksi penerimaan berhasil commit. | receivings; inventory; frontend/receivings | Integration: kegagalan database setelah write rollback balance/ledger/counter/receipt | NOT_RUN |
| BR-I02 | Pembuatan dokumen tidak mengubah stok. | receivings; inventory; frontend/receivings | Integration: create dokumen tidak mengubah stok | NOT_RUN |
| BR-I03 | Setiap receipt menggunakan Idempotency-Key berupa UUID. | receivings; inventory; frontend/receivings | Contract/unit: key wajib UUID, hilang/malformed -> 400 | NOT_RUN |
| BR-I04 | Key berlaku dalam satu dokumen penerimaan. | receivings; inventory; frontend/receivings | Integration: UUID key sama di dua dokumen tidak saling conflict | NOT_RUN |
| BR-I05 | Key, actor, dokumen, dan payload identik menghasilkan receipt yang sama. | receivings; inventory; frontend/receivings | Integration/concurrency: key+actor+doc+payload sama satu receipt; reorder replay | NOT_RUN |
| BR-I06 | Key sama dengan actor atau payload berbeda menghasilkan conflict. | receivings; inventory; frontend/receivings | Integration: key sama actor/payload berubah -> 409 | NOT_RUN |
| BR-I07 | Redis tidak menjadi sumber kebenaran stok atau bukti receipt sudah diproses. | receivings; inventory; frontend/receivings | Architecture/integration: PostgreSQL otoritatif; tidak ada cache stok/dedup Redis | NOT_RUN |
| NFR-01 | Seluruh kode aplikasi backend dan frontend menggunakan TypeScript strict. | cross-cutting; deployment; frontend | Static: strict compiler backend/frontend, tanpa suppression/explicit any | NOT_RUN |
| NFR-02 | Backend menegakkan seluruh validasi bisnis tanpa bergantung pada frontend. | cross-cutting; deployment; frontend | Integration: bypass UI, malformed/unknown fields tetap ditolak backend | NOT_RUN |
| NFR-03 | Operasi receiving menggunakan transaksi PostgreSQL dan aman terhadap request bersamaan. | cross-cutting; deployment; frontend | Integration: row lock, same/distinct key, lintas dokumen satu produk, reconciliation | NOT_RUN |
| NFR-04 | Session tersimpan di Redis; cookie session bersifat HttpOnly. | cross-cutting; deployment; frontend | Integration/deployment: Redis session, HttpOnly, host-only, SameSite/Secure | NOT_RUN |
| NFR-05 | Terdapat perlindungan CSRF dan rate limiting berbasis Redis. | cross-cutting; deployment; frontend | Integration: CSRF dan shared Redis limiter dua API, 429 Retry-After | NOT_RUN |
| NFR-06 | Password, session ID, CSRF token, dan connection string tidak boleh muncul dalam log. | cross-cutting; deployment; frontend | Security log capture: password/SID/token/connection string tidak bocor | NOT_RUN |
| NFR-07 | UI menyediakan loading, empty, validation, pending, dan error states. | cross-cutting; deployment; frontend | Component/E2E: loading, empty, validation, pending, error | NOT_RUN |
| NFR-08 | Mutasi data frontend menggunakan TanStack Query useMutation. | cross-cutting; deployment; frontend | Static/component: semua mutation useMutation, query invalidation tepat | NOT_RUN |
| NFR-09 | Dependency dikunci melalui lockfile dan versi aktual dicatat. | cross-cutting; deployment; frontend | Dependency audit: exact versions, package-lock, npm ci reproducible | NOT_RUN |
| NFR-10 | Tersedia automated tests untuk aturan bisnis kritis dan keamanan autentikasi. | cross-cutting; deployment; frontend | Test inventory: suite auth/security/domain kritis dieksekusi dan dicatat | NOT_RUN |
| NFR-11 | Kegagalan Redis menghasilkan penolakan terkontrol; aplikasi tidak beralih diam-diam ke session atau limiter in-memory. | cross-cutting; deployment; frontend | Integration: Redis putus -> 503, tanpa fallback/bypass | NOT_RUN |
| NFR-12 | Deployment dapat direproduksi dengan environment variables, migrasi, Dockerfile, dan Compose. | cross-cutting; deployment; frontend | Deployment: env validation, clean migration, build, Compose, shutdown | NOT_RUN |


## Scope lokal

Semua 87 ID tetap tercatat. Label modul backend/frontend pada mapping menunjukkan pemilik requirement sistem, bukan path dependency ke repository lain. Status NOT_RUN di mapping adalah snapshot rencana Task 1; bukti fondasi yang benar-benar dijalankan dan batas scope-nya tersedia pada [testing.md](testing.md).
