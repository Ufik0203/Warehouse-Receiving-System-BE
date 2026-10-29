# Persiapan Task 4: keputusan R-10/R-11/R-13

Tanggal: 2026-10-29 (Asia/Jakarta). Scope hanya review dan dokumentasi backend. DESIGN_RESOLVED berarti keputusan desain punya dasar, bukan endpoint atau tes runtime sudah selesai. Tidak mengubah source PROJECT_SPEC.md, frontend, dependency, migration, data atau metadata Git.

## R-10: kode dan status resource tidak ditemukan

**Masalah asal:** kode user/product belum dinamai dan arti produk tersedia pada create receiving belum terurai. Sumber hanya menetapkan resource-specific 404 serta kode receiving/item secara eksplisit.

**Requirement/endpoint:** FR-USER-02/03/04, FR-PROD-01, FR-REC-01/02/03, US-04/06 dan BR-R01/R09, NFR-02. GET/PATCH/DELETE /users/:id (Task 5), GET /products/:id, POST /receivings, GET /receivings/:id dan POST /receivings/:id/receipts (base /api/v1).

**Dasar dokumen:** PRD BR-P06 meniadakan update/delete produk; tidak ada lifecycle availability. API meminta productId valid dan tersedia, 404 resource-specific, deleted user tetap terbaca, USER_DELETED dan delete ulang 204. OpenAPI sudah menyediakan Error404 untuk detail/mutation user dan detail produk, tetapi POST /receivings belum mencantumkan 404. ERD hanya Product, tanpa isActive/deletedAt; ReceivingItem merujuk Product dengan FK RESTRICT. Technical-spec mewajibkan transaksi dan FK, bukan placeholder product. Testing mewajibkan invalid input ditolak dan operasi tanpa partial write.

**Keputusan/rekomendasi:** 404 USER_NOT_FOUND untuk target user yang tidak ada; 404 PRODUCT_NOT_FOUND untuk detail atau referensi produk yang tidak ada. Produk tersedia diartikan ada dalam tabel, tidak terkait stok/status baru. Penamaan dan pemetaan ini adalah desain interface teknis yang pengguna izinkan dipilih, bukan keputusan stakeholder mengenai produk. UUID/shape/range/duplicate invalid tetap 400 sebelum lookup domain; security dijalankan sebelum lookup, dependency failure 503. Seluruh referensi diperiksa sebelum write pada transaksi create yang sama. Tidak menjanjikan daftar missing IDs. Kode receiving/item serta precedence replay/completed tetap. Existing deleted user bukan missing: GET 200, PATCH 409 USER_DELETED, repeated DELETE 204.

**Status:** DESIGN_RESOLVED. Kontrak Markdown/OpenAPI diselaraskan termasuk menambah respons 404 POST /receivings. Runtime/rollback/error mapping tests NOT_RUN. Tidak memutuskan alur produk nonaktif/rusak/retur karena di luar scope.

## R-11: unit panjang teks non-password

**Masalah asal:** nama/reference/q/email memakai batas karakter tanpa unit runtime; JavaScript .length menghitung UTF-16 code unit, berbeda untuk karakter astral.

**Requirement/endpoint:** BR-P01/P02/P03, BR-U03/U06/U07, FR-USER-01/03, FR-PROD-01/02, FR-REC-01, NFR-02. POST/PATCH /users, POST /products, GET /products?q=..., POST /receivings; email login dipertahankan sesuai validasi existing. Password tidak diubah.

**Dasar dokumen:** PRD nama produk 1-120 setelah trim, SKU 1-40 ASCII setelah normalisasi; password eksplisit code point. API nama user 1-120, reference maksimal 160 default kosong, q maksimal 100, email maksimal 254 dan normalisasi masing-masing field. OpenAPI punya minLength/maxLength tetapi deskripsinya masih open. Technical-spec/Prisma menggunakan varchar(120/160/254/40), bukan batas byte. ERD tidak menetapkan grapheme atau normalisasi Unicode. Testing sudah meminta boundary/normalisasi, tetapi belum ada bukti business Unicode tests.

**Keputusan/rekomendasi:** gunakan Unicode code point untuk teks API setelah normalisasi field existing. Selaras dengan representasi karakter Unicode pada schema string dan kapasitas PostgreSQL; tidak memotong lebih cepat hanya karena UTF-16 surrogate pair. Angka batas tidak berubah. Tidak menambah NFC/NFKC, grapheme segmentation atau trim password. ASCII SKU tetap identik perilakunya. Reference/q boleh kosong sesuai kontrak. Contoh: 120 karakter astral lolos name, 121 ditolak; kombinasi base+combining mark dihitung dua code point.

**Status:** DESIGN_RESOLVED sebagai keputusan representasi teknis, bukan persetujuan kebutuhan panjang baru. Implementasi validator bisnis dan pengujian Unicode/DB round trip NOT_RUN. Pertanyaan bisnis tambahan tidak diperlukan untuk baseline tertulis.

## R-13: snapshot receiving detail

**Masalah asal:** header dan items dari SELECT terpisah di READ COMMITTED bisa menggabungkan keadaan sebelum/sesudah receipt commit. Satu transaksi READ COMMITTED saja belum menyelesaikannya.

**Requirement/endpoint:** FR-REC-02, FR-REC-05, BR-R06/R10/R11/R12, NFR-03; GET /receivings/:id dan konsistensi ReceivingDetailDto dari POST /receivings. Receipt replay tetap BR-I05 dan FR-REC-06.

**Dasar dokumen:** API/OpenAPI eksplisit header+items dari snapshot konsisten. PRD menetapkan status dan counter yang koheren. ERD memisahkan Receiving dan ReceivingItem; receipt memperbarui counter/status atomik. Technical-spec mewajibkan READ COMMITTED + row locks untuk mutation receipt, tidak melarang isolation berbeda pada read. Testing reconciliation/concurrency menuntut state koheren, tetapi snapshot interleaving belum diuji.

**Keputusan/rekomendasi:** GET detail memakai transaksi baca REPEATABLE READ melalui Prisma interactive transaction; repository menerima transaction client yang sama untuk semua SELECT header/items/product projection. Tidak memakai global client atau row lock di dalam read. Service memiliki transaction boundary, mapper tidak query. Opsi READ ONLY sebagai statement pertama dapat memperkuat enforcement. Snapshot sejak statement data pertama, bukan jaminan paling baru saat response dikirim. Lebih mudah dipertahankan dibanding merangkai SQL JSON aggregation khusus atau mengasumsikan Prisma include selalu satu statement. Buat transaksi singkat. POST create membentuk detail dengan client transaksi write-nya sendiri sebelum commit dan merespons setelah commit; tidak membuka read transaksi terpisah sebelum commit. Receipt tetap READ COMMITTED/lock dan replay historis immutable.

**Status:** DESIGN_RESOLVED. PostgreSQL 17 menjamin SELECT berurutan dalam REPEATABLE READ melihat snapshot sama. Tipe Prisma 7.10.1 lokal mendukung isolationLevel dan enum RepeatableRead. Tes runtime multi-connection/interleaving dan constraint reconciliation tetap NOT_RUN.

## Acuan resmi dan batas verifikasi

- [PostgreSQL 17 isolation](https://www.postgresql.org/docs/17/transaction-iso.html): per-statement READ COMMITTED vs stable snapshot REPEATABLE READ.
- [PostgreSQL 17 character types](https://www.postgresql.org/docs/17/datatype-character.html): varchar membatasi karakter, bukan byte.
- [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3): Schema Object memuat minLength/maxLength dari schema string.
- API Prisma diperiksa pada tipe lokal 7.10.1. URL dokumentasi Prisma live mengarah ke ORM 8; tidak digunakan untuk mengubah API/versi ORM 7.

## Gate implementasi

Tidak ada keputusan bisnis tertunda untuk ketiga temuan pada baseline ini. Jika kelak diminta produk nonaktif, grapheme-based limit atau perubahan aturan stok, itu perubahan requirement terpisah yang memerlukan keputusan pengguna. Tidak mengklaim persetujuan tersebut sekarang.

Task 4 siap dimulai setelah instruksi implementasi pengguna. Desain sudah ditetapkan; endpoint bisnis, runtime snapshot, error mapping, Unicode boundaries, receiving concurrency/idempotency dan rollback masih NOT_RUN. Task 3 evidence tetap historis dan tidak ditimpa. Kontrak frontend belum diubah/dibandingkan: pemilik perlu menyalin api-contract.md, openapi.yaml, contract-version.json sesuai api-sync.md.


## Verifikasi aktual artefak

Validator OpenAPI 0.7.2, checker dokumentasi dan checker khusus persiapan Task 4 semuanya exit 0. Rincian perintah, percobaan awal dan batas bukti berada pada [testing](testing.md#bukti-persiapan-task-4-dokumentasi-saja). Schema-only Unicode boundary dan deskripsi snapshot tidak membuktikan implementasi runtime. Contoh detail OPEN di OpenAPI diselaraskan kembali dengan counter dan remaining existing, bukan aturan bisnis baru.


## Status setelah implementasi Task 4

Bagian DESIGN_RESOLVED/NOT_RUN di atas adalah bukti tahap persiapan. Implementasi Task 4 kini mempunyai bukti runtime pada [testing.md](testing.md#bukti-aktual-task-4): R-10 product/receiving lookup, R-11 nama produk/reference/q/SKU dan R-13 snapshot dua koneksi. Cakupan user endpoint USER_NOT_FOUND serta user-name validation tetap Task 5/NOT_RUN. Desain tidak diubah. Tidak mengklaim frontend/E2E atau seluruh temuan lintas modul telah teruji.


## Tindak lanjut Task 5

USER_NOT_FOUND kini terbukti untuk GET/PATCH/DELETE user, serta Unicode name/password/email boundaries sesuai scope Task 5. Desain R-10/R-11 tidak diubah; bukti runtime baru terpisah pada [testing Task 5](testing.md#bukti-aktual-task-5). Status user-management NOT_RUN pada bagian Task 4 adalah histori. Scope frontend/browser/deployment yang belum dijalankan tetap NOT_RUN.
