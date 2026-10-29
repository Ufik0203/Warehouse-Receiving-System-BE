# Review konsistensi Task 1

Tanggal: 2026-10-29 (Asia/Jakarta). Input: AGENTS.md, README.md, seluruh dokumen hasil pemisahan di docs/, serta PROJECT_SPEC.md untuk pemeriksaan sumber. Sumber tidak diubah. Review ini adalah penilaian spesifikasi, bukan bukti implementasi.

## Hasil per area

| Area | Temuan dan keputusan berdasarkan dokumen | Verifikasi lanjutan |
| --- | --- | --- |
| Requirement | 87 ID sumber sama dengan PRD: 22 FR, 12 US, 41 BR, 12 NFR. Setiap ID memiliki satu baris modul dan rencana verifikasi di requirement-mapping.md. US-10 dibaca bersama BR-I05/I06: replay juga mensyaratkan actor dan dokumen yang sama. | Pengujian implementasi semua ID NOT_RUN. |
| Hak akses | Kedua role: login/logout, read produk, create/read/receive receiving, stok/history. Supervisor saja: seluruh user management dan create produk. Tidak ada admin/registrasi publik. User deleted masih dapat dibaca supervisor. | API authorization wajib meskipun UI menyembunyikan kontrol. |
| User invariants | Semua mutation user memakai advisory lock transaksi yang sama dan recheck actor. Larangan self-demotion/deactivation/deletion serta minimal satu supervisor aktif berlaku bersama. Nama saja tidak menaikkan authVersion; perubahan role/status aktual dan delete menaikkannya. Delete ulang 204 tanpa increment tambahan. Email unik tetap mencakup deleted. | Concurrency real PostgreSQL, soft-delete FK, session lama pada request berikutnya. |
| Data model | Tujuh entitas cocok dengan ERD. InventoryTransaction adalah ledger receipt item; tidak perlu tabel ReceiptItem tambahan. ReceiptDto.items dipetakan dari ledger. `receivedBy` dipetakan dari receipts.actor_id, transaction actor dari receipt.actor_id; `createdBy` dari receiving.created_by. Bigint stok dikirim string. | Periksa mapper dan reconciliation. |
| Relasi dan constraint | Unique email/SKU/number, receiving+product, receiving+key dan receipt+item sesuai aturan. Unique komposit pendukung FK memastikan receipt/receiving/item/product selaras; seluruh historical FK RESTRICT. ERD menunjukkan relasi, bukan daftar seluruh SQL constraint. | Task 2 perlu SQL CHECK/composite FK dan inspection migrasi. Service memastikan minimal satu item/receipt dan tepat satu balance per produk; FK saja tidak menjamin child selalu ada. |
| Stok/status | Balance = SUM ledger per produk; received = SUM ledger per item; 0 <= received <= expected. OPEN tidak menerima barang, PARTIAL sudah menerima namun belum semua lengkap, COMPLETED iff semua penuh. Create product+balance nol atomik; create receiving tidak mengubah stok. | Rollback, reconciliation dan multi-item/concurrent receiving wajib. |
| Session | Redis otoritatif untuk session; user role/status/authVersion dari PostgreSQL setiap protected request. SID regenerate sesudah login; session baru disimpan sebelum response. Batas anonymous 15 menit, authenticated idle 30 menit, absolute 8 jam; Redis TTL/touch dan cookie dibatasi sisa absolute. Dependency failure 503, bukan 401. | Expiry dengan waktu terkendali, restart API, store outage dan no in-memory fallback. |
| CSRF | Anonymous bootstrap menyimpan session/token sebelum response; token stabil per session, baru sesudah regeneration. Login dan semua mutation wajib CSRF. Trusted Origin, fallback Referer; keduanya tidak dipercaya/hilang ditolak. Cookie HttpOnly, host-only, SameSite=Lax, secure HTTPS dan Path=/. | Token lama ditolak, login fixation, Origin fallback, no-store auth response. |
| Kontrak API | OpenAPI 3.0.3 mencakup 20 operasi, 15 path termasuk health di luar /api/v1. Semua input object nested strict, pagination/filter terinci, unknown query ditolak, PATCH nonempty, 204 tanpa body, shared error dan Retry-After. Cookie local/secure adalah alternatif, bukan keduanya wajib. Login membutuhkan cookie anonymous tanpa mengharuskan identitas terautentikasi. | Validator schema tidak membuktikan backend normalization/authorization/transaksi. |
| Receiving | READ COMMITTED; lock parent sebelum baca receipt/remaining. Replay diperiksa sebelum completed; payload canonical UUID lowercase dan item sort, hash mencakup doc+actor+items. Check semua item sebelum write; pakai transaction client untuk seluruh write; balances diperbarui atomik dengan urutan productId konsisten. | Same key satu receipt; distinct 7+7 expected 10 hanya satu sukses; 4+6 total 10; lintas dokumen produk sama tidak lost update. |
| Idempotency | Unique key scoped per receiving. Replay mengembalikan receipt historis immutable, timestamp dan urutan item deterministik, bukan current receiving snapshot. Actor berubah atau payload berubah -> 409. Replay tidak bypass auth/session/CSRF yang berlaku sekarang. Redis bukan stok/dedup store. | Replay setelah completed, reorder payload, changed actor/payload, lost response after commit. |
| Frontend | useQuery untuk read, useMutation termasuk auth; retry false pada receipt. Simpan key+payload sessionStorage per actor+receiving sebelum send; logout membersihkan query cache/CSRF memory namun tidak menghapus pending operation yang belum pasti. Token tidak dipersist. Success receipt tidak dibatalkan karena refetch gagal. | Browser lost-response, reload/reauth, user switching, targeted invalidation dan pending/error states. |
| Testing | Suite yang direncanakan mencakup domain, security, frontend dan deployment; integration wajib PostgreSQL/Redis nyata. Late failure sesudah minimal satu write, bukan validasi awal. Gunakan database _test dan namespace Redis; tidak FLUSHALL bersama. | Semua runtime checks NOT_RUN. Tidak ada PASS dari keberadaan rencana atau file tes. |
| Mermaid | ERD tujuh entitas dan sepuluh relasi selaras dengan model. State diagram mengizinkan OPEN langsung COMPLETED dan PARTIAL self-transition; replay tidak mengubah status. Sequence lock -> idempotency -> completed -> validate -> writes -> commit -> response konsisten; Redis hanya sebelum transaksi stok. | Pemeriksaan struktur dan urutan dijalankan. Review semantik dilakukan; parser/render Mermaid NOT_RUN. |

## Kontradiksi, kekurangan dan penyelesaiannya

| ID review | Masalah | Dasar dan hasil | Dampak / status |
| --- | --- | --- | --- |
| R-01 | “Delapan dokumen” vs sembilan file | Sumber menjelaskan delapan dokumen dan AGENTS tambahan. Sembilan keluaran awal benar. | Selesai; editorial. |
| R-02 | OpenAPI dirujuk tetapi belum ada | Task 1 memang memerintahkan konversi sebelum endpoint. Sekarang tersedia dan divalidasi. | Selesai. |
| R-03 | “CRUD user” dapat disalahartikan | PRD BR-U07/U08/U11 dan exact API whitelist membatasi update; delete soft, tanpa restore/reset/email update. | Selesai; tidak memperluas scope. |
| R-04 | Authorization sebelum receiving transaction vs recheck actor pada user mutation | BR-U12 memperbolehkan request yang sudah berjalan selesai; recheck supervisor setelah advisory lock tetap wajib khusus account invariants. | Selesai; bukan kontradiksi. |
| R-05 | SessionData optional anonymousCreatedAt tidak disebut pada session authenticated baru | Flow login eksplisit membuat session baru dengan userId, authVersion, authenticatedAt dan token baru. anonymousCreatedAt hanya untuk fase anonymous; tidak disalin sebagai dasar absolute authenticated lifetime. | Selesai sebagai konsekuensi regeneration; tidak mengubah TTL bisnis. |
| R-06 | Semua mutation wajib JSON, tetapi logout dan DELETE tidak memiliki request body | Kontrak body tidak ditambahkan. Tetap kirim Content-Type application/json pada mutation; logout/DELETE boleh tanpa body. Tidak mewajibkan object kosong atau schema baru. OpenAPI tidak memakai parameter Content-Type (reserved); aturan dijelaskan dalam deskripsi. | Klarifikasi teknis dari gabungan dua aturan sumber. Tes middleware perlu memastikan no-body mutation sah. |
| R-07 | SKU raw lowercase/space vs regex uppercase | BR-P01 menormalisasi lebih dahulu; regex berlaku hasil trim+uppercase. OpenAPI mendeskripsikan normalized pattern, tidak memakai raw uppercase pattern yang salah menolak input valid. | Selesai; tambah tes normalisasi. |
| R-08 | maxLength password JS UTF-16 vs Unicode code point | BR-U06 eksplisit code point; implementasi wajib refinement code point, bukan sekadar `.length` JS. Login minimum 1 berbeda dari create minimum 12 sesuai API; bukan kontradiksi. | Selesai; unit tests karakter astral dan batas wajib. |
| R-09 | Keunikan productId/receivingItemId tidak dapat diwakili uniqueItems saja | Dua object dengan ID sama dan quantity berbeda tetap harus ditolak. Backend memeriksa ID setelah normalisasi; OpenAPI description mencatat aturan property uniqueness. | Selesai; schema validator tidak membuktikan aturan ini. |
| R-10 | Kode not-found user/produk dan produk tidak tersedia saat create receiving tidak dirinci | Kontrak hanya menyebut resource-specific 404; receiving/item punya nama kode eksplisit. Tidak mengarang USER_NOT_FOUND/PRODUCT_NOT_FOUND atau precedence error. | DESIGN_RESOLVED pada persiapan Task 4: resource-specific 404, lihat task4-readiness.md; implementasi/tes NOT_RUN. |
| R-11 | Unit panjang nama/reference dan teks non-password tidak eksplisit | Batas numerik dipertahankan; SQL varchar(n) tetap sesuai desain. OpenAPI mengungkap character limits dan normalisasi; keputusan runtime unit teks Unicode perlu diselaraskan sebelum validator input. | DESIGN_RESOLVED: Unicode code point setelah normalisasi existing; implementasi/tes Task 4 NOT_RUN. |
| R-12 | Source diagram CSS serta rujukan eksternal tanpa URL | Mermaid dipulihkan dari aturan tertulis, bukan menafsirkan CSS sebagai source. Dependency/API resmi diperiksa pada Task 1 dan ditautkan. PDF assessment tidak tersedia, sehingga kepatuhan terhadap isi PDF belum dapat diverifikasi mandiri. | Semantik diagram direview; render dan review PDF NOT_RUN. |
| R-13 | Detail receiving harus snapshot konsisten walau READ COMMITTED dipakai mutasi | Mutasi row-lock dan query detail adalah tanggung jawab berbeda. Jangan membaca header dan item melalui dua snapshot lepas. Pilih satu SQL snapshot atau transaksi read dengan snapshot konsisten saat implementasi. | DESIGN_RESOLVED: transaksi baca REPEATABLE READ, transaction client yang sama; tes interleaving NOT_RUN. |
| R-14 | Contoh versi dependency bukan install proof | Irisan engine/peer resmi mendukung rencana, tetapi csrf-sync types Express 5, native Argon2 dan transitive dependencies belum diuji. | Gate pada Task 2/3; tidak menyatakan runtime kompatibel sebelum checks. |

## Pertanyaan stakeholder sumber

| Pertanyaan | Keputusan sementara yang sudah tertulis | Dampak bila stakeholder mengubahnya |
| --- | --- | --- |
| Operator boleh membuat dokumen? | Ya, role matrix dan asumsi PRD. | Authorization, UI dan tests perlu diselaraskan. Tidak menunggu jawaban untuk implementasi baseline. |
| Supervisor boleh mengelola supervisor lain? | Ya, FR-USER-01 dan BR-U09/U10; self dan last-supervisor restrictions tetap berlaku. | Jika dibatasi, ubah PRD/API/tests dahulu. |
| Barang rusak/berlebih? | Over-receipt ditolak; proses barang rusak tidak didefinisikan. | Perlu kebutuhan baru jika ingin alur disposisi; jangan menambah saat ini. |
| Koreksi penerimaan? | Receipt immutable; koreksi, cancel, retur/adjustment di luar scope. | Memerlukan desain ledger koreksi dan kontrak baru bila diminta kelak. |
| Satuan pecahan? | Tidak, unit pcs dan quantity integer. | Perubahan tipe quantity, constraints dan UI jika scope berubah. |
| Jumlah user/transaksi? | Belum diketahui. Batas pagination dan limiter tetap nilai eksplisit sumber. | Capacity/load test dan SLA belum dapat ditetapkan; NOT_RUN. |

## Gate ke Task 2

Tidak ada blocker spesifikasi untuk scaffold dan database. Pertanyaan R-10/R-11 harus ditutup sebelum endpoint/input validation terkait; R-13 ditentukan saat query detail dibuat. Exact dependency patches, Redis/nginx image dan hasil kompatibilitas aktual adalah pekerjaan Task 2, bukan keputusan stakeholder yang dikarang pada Task 1. Belum ada izin memperluas scope, mengimplementasikan endpoint, atau mulai Task 2 pada turn ini.

## Tindak lanjut Task 2

Pengguna telah mengizinkan Task 2 pada turn berikutnya; batas izin pada paragraf historis di atas adalah snapshot Task 1. Fondasi selesai tanpa memilih kode error bisnis atau mekanisme query receiving. R-10/R-11/R-13 tetap terbuka untuk endpoint terkait. Model mempertahankan varchar(n) sumber; validasi nama seed hanya menjaga kapasitas penyimpanan PostgreSQL, tanpa mengubah kontrak API.

R-14 kini memiliki bukti aktual untuk dependency fondasi, adapter PostgreSQL, Redis client dan Argon2 Windows. Risiko csrf-sync/Express 5 dan Redis session/limiter belum diuji karena belum diinstal atau diimplementasikan pada Task 2. Itu gate Task 3, bukan blocker scaffold yang masih tertinggal.


## Status pada repository mandiri

Dokumen ini mempertahankan review sumber. R-10/R-11/R-13 kini DESIGN_RESOLVED pada persiapan Task 4; runtime tetap NOT_RUN. Semua file aktif dirujuk relatif terhadap repository ini; catatan path/workflow proyek gabungan adalah konteks historis. Task 3 sudah diimplementasikan sesuai tindak lanjut di bawah; semua operasi Git/GitHub hanya manual pengguna. Lihat [workflow aktif](ai-workflow.md).

## Keputusan teknis Task 3 — 2026-10-29

- Tidak ada pertanyaan bisnis terbuka yang memblokir auth. Password dihitung dalam Unicode code point, tidak di-trim; email dinormalisasi trim/lowercase dan dibatasi 254 sesuai kontrak. R-10/R-11/R-13 tetap terbuka untuk Task 4/5.
- Redis namespace default `wrs` mempertahankan prefix desain. `REDIS_NAMESPACE` yang terpisah wajib untuk tes; tidak ada FLUSHALL atau fallback memory. Tambahan `lastActivityAt` hanya state server untuk enforcement idle, tidak masuk DTO.
- `TRUST_PROXY` default kosong/false; hanya IP/CIDR eksplisit atau loopback yang diterima. Deployment HTTPS memerlukan hop/proxy yang benar-benar dipercaya dan Secure cookie; header forwarded dari proxy tidak dipercaya ditolak.
- Session baru disimpan sebelum bootstrap/login response; protected request memuat ulang PostgreSQL dan menyimpan aktivitas sebelum handler. Logout menunggu destroy; kegagalan store menghasilkan 503, bukan sukses palsu.
- express-rate-limit 8.7.1 menggantikan rencana 8.1.0: audit mengidentifikasi bypass IPv4-mapped IPv6 dan dependency ip-address rentan pada versi lama. Patch dalam major 8 mempertahankan API; audit setelah perubahan melaporkan 0 vulnerability.
- Kontrak hanya berubah pada metadata ketersediaan health/auth; bentuk endpoint, DTO, status dan security requirement tidak berubah. Frontend tidak diubah/dibandingkan pada task ini; pasangan kontrak dan manifest baru perlu disalin manual sesuai api-sync.md.
- R-14 kompatibilitas runtime Express 5/session/CSRF/limiter telah diuji pada Windows dengan PostgreSQL/Redis nyata; production Linux/nginx dan TLS browser tetap NOT_RUN.


## Status terbaru persiapan Task 4

R-10/R-11/R-13 diselesaikan sebagai desain teknis pada [review rinci](task4-readiness.md). Status terbuka pada catatan Task 1/2/3 di atas adalah historis. Tidak ada persetujuan bisnis stakeholder yang diasumsikan. Implementasi/tes endpoint bisnis tetap NOT_RUN.


## Tindak lanjut implementasi Task 4

R-10 product/receiving lookup, R-11 teks scope produk/receiving/query dan R-13 read-only snapshot telah mempunyai bukti runtime pada testing.md. Status DESIGN_RESOLVED pada tabel tetap menyatakan desain lintas endpoint; USER_NOT_FOUND dan validator user Task 5 belum dijalankan/diimplementasikan. API metadata ketersediaan diperbarui; DTO/status/security contract tidak berubah. Tidak ada schema/migration/dependency baru atau perluasan scope.


## Tindak lanjut Task 5

USER_NOT_FOUND kini terbukti untuk GET/PATCH/DELETE user, serta Unicode name/password/email boundaries sesuai scope Task 5. Desain R-10/R-11 tidak diubah; bukti runtime baru terpisah pada [testing Task 5](testing.md#bukti-aktual-task-5). Status user-management NOT_RUN pada bagian Task 4 adalah histori. Scope frontend/browser/deployment yang belum dijalankan tetap NOT_RUN.
