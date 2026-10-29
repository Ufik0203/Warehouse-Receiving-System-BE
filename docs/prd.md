# Product Requirements ? Warehouse Receiving System

> Sumber: [PROJECT_SPEC.md](source/PROJECT_SPEC.md). Fondasi Task 2 telah diimplementasikan; autentikasi dan fitur bisnis belum tersedia. Status per pemeriksaan dan konteks asalnya ada di [testing.md](testing.md).

Dokumen ini menetapkan perilaku aplikasi. Detail teknis seperti Prisma transaction dan Redis key berada di technical specification.

Berikut isi yang dapat kamu gunakan.

## Nama produk

Warehouse Receiving System.

## Problem statement

Gudang mencatat barang masuk melalui spreadsheet. Proses tersebut menyulitkan petugas untuk membedakan jumlah barang yang diharapkan, jumlah yang sudah diterima, dan jumlah yang masih kurang.

Pengiriman dapat datang bertahap. Pencatatan ulang permintaan yang sama atau penerimaan melebihi jumlah yang diharapkan dapat menyebabkan ketidaksesuaian stok.

Aplikasi menyediakan pencatatan penerimaan barang, pembaruan stok, dan riwayat transaksi dengan aturan bisnis yang ditegakkan oleh backend.

## Business objectives

- Menyediakan satu sumber pencatatan penerimaan barang.
- Mendukung penerimaan sebagian dan penuh.
- Mencegah penerimaan melebihi sisa jumlah yang diharapkan.
- Mencegah pengulangan permintaan menambah stok dua kali.
- Menyediakan stok dan riwayat transaksi yang dapat ditelusuri.
- Membatasi tindakan pengguna berdasarkan peran.
- Menyediakan aplikasi yang dapat dijalankan kembali dari lingkungan bersih.
User roles dan responsibilities

Aplikasi memiliki dua peran.

| Aktivitas | OPERATOR | SUPERVISOR |
| --- | --- | --- |
| Login dan logout | Ya | Ya |
| Melihat produk | Ya | Ya |
| Membuat produk | Tidak | Ya |
| Membuat dokumen penerimaan | Ya | Ya |
| Melihat dokumen dan detailnya | Ya | Ya |
| Mencatat penerimaan barang | Ya | Ya |
| Melihat stok dan transaksi | Ya | Ya |
| Melihat daftar dan detail user | Tidak | Ya |
| Membuat user | Tidak | Ya |
| Mengubah nama, role, dan status aktif user | Tidak | Ya |
| Menghapus user secara soft delete | Tidak | Ya |

Supervisor bertanggung jawab atas pengelolaan akun dan master produk. Operator menjalankan proses penerimaan sehari-hari.

Pembagian ini merupakan keputusan desain untuk assessment karena PDF belum menjelaskan batas hak akses secara terperinci.

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-AUTH-01 | Pengguna dapat login menggunakan email dan password. |
| FR-AUTH-02 | Login menggunakan session yang disimpan di Redis. |
| FR-AUTH-03 | Pengguna dapat logout dan session server dihancurkan. |
| FR-AUTH-04 | Semua operasi perubahan data dilindungi CSRF, termasuk login. |
| FR-USER-01 | Supervisor dapat membuat akun operator atau supervisor. |
| FR-USER-02 | Supervisor dapat melihat daftar dan detail user. |
| FR-USER-03 | Supervisor dapat mengubah nama, role, dan status aktif user. |
| FR-USER-04 | Penghapusan user menggunakan soft delete. |
| FR-USER-05 | Perubahan role, status aktif, atau penghapusan membatalkan session lama melalui pemeriksaan versi autentikasi. |
| FR-PROD-01 | Pengguna dapat melihat daftar produk. |
| FR-PROD-02 | Supervisor dapat membuat produk dengan SKU unik. |
| FR-REC-01 | Pengguna dapat membuat dokumen penerimaan beserta item dan jumlah yang diharapkan. |
| FR-REC-02 | Pengguna dapat melihat daftar dan detail dokumen penerimaan. |
| FR-REC-03 | Pengguna dapat menerima sebagian atau seluruh jumlah yang tersisa. |
| FR-REC-04 | Backend menolak penerimaan melebihi sisa jumlah. |
| FR-REC-05 | Sistem memperbarui status dokumen secara otomatis. |
| FR-REC-06 | Pengulangan permintaan penerimaan yang sama tidak menambah stok lagi. |
| FR-INV-01 | Stok bertambah otomatis setelah penerimaan berhasil disimpan. |
| FR-INV-02 | Semua pengguna terautentikasi dapat melihat stok. |
| FR-INV-03 | Semua pengguna terautentikasi dapat melihat riwayat transaksi. |
| FR-OPS-01 | Tersedia health check dan readiness check. |
| FR-OPS-02 | Aplikasi dapat dijalankan menggunakan Docker Compose. |

## User stories dan acceptance criteria

| ID | User story | Acceptance criteria |
| --- | --- | --- |
| US-01 | Sebagai pengguna, saya ingin login. | Kredensial valid menghasilkan session baru; kredensial salah menghasilkan 401 dengan pesan umum; akun nonaktif atau terhapus tidak dapat login. |
| US-02 | Sebagai supervisor, saya ingin membuat user. | Email dinormalisasi dan unik; role harus valid; password disimpan sebagai hash; response tidak mengandung password atau hash. |
| US-03 | Sebagai supervisor, saya ingin mengubah role user. | Perubahan tersimpan; session lama user tersebut ditolak pada request berikutnya; operator tidak dapat menjalankan tindakan ini. |
| US-04 | Sebagai supervisor, saya ingin menghapus user. | User dinonaktifkan dan diberi deletedAt; riwayat penerimaan yang merujuk user tetap tersedia. |
| US-05 | Sebagai supervisor, saya ingin membuat produk. | SKU valid dan unik setelah normalisasi; produk baru memiliki stok nol. |
| US-06 | Sebagai operator, saya ingin membuat dokumen. | Dokumen memiliki minimal satu item, produk tidak berulang, expected quantity valid, dan stok belum berubah. |
| US-07 | Sebagai operator, saya ingin menerima sebagian pengiriman. | Expected 100 dan penerimaan 40 menghasilkan received 40, remaining 60, status PARTIAL, dan stok bertambah 40. |
| US-08 | Sebagai operator, saya ingin menyelesaikan penerimaan. | Setelah menerima sisa 60, status menjadi COMPLETED, remaining nol, dan total pertambahan stok 100. |
| US-09 | Sebagai operator, saya ingin sistem menolak jumlah berlebih. | Ketika remaining 60, permintaan 61 ditolak dan tidak ada perubahan pada stok, item, receipt, atau transaksi. |
| US-10 | Sebagai operator, saya ingin aman saat mengulang permintaan. | Key dan payload yang sama mengembalikan receipt semula tanpa transaksi stok tambahan. |
| US-11 | Sebagai pengguna, saya ingin melihat transaksi. | Transaksi menampilkan produk, jumlah, dokumen sumber, receipt, pelaku, dan waktu. |
| US-12 | Sebagai reviewer, saya ingin menjalankan proyek. | Instruksi dari kondisi bersih menghasilkan database termigrasi, akun awal, aplikasi berjalan, dan readiness berhasil. |

## Business rules

## User dan autentikasi

- BR-U01: Role hanya OPERATOR dan SUPERVISOR.
- BR-U02: Tidak ada registrasi publik.
- BR-U03: Email dinormalisasi dengan trim dan lowercase sebelum disimpan.
- BR-U04: Email tetap unik meskipun user sudah dihapus.
- BR-U05: Password tidak boleh di-trim atau dinormalisasi.
- BR-U06: Password baru memiliki panjang 12–128 karakter Unicode, dihitung berdasarkan code point.
- BR-U07: Update user pada versi ini hanya mencakup nama, role, dan status aktif.
- BR-U08: Perubahan email dan reset password belum termasuk scope.
- BR-U09: Supervisor tidak boleh menurunkan role, menonaktifkan, atau menghapus dirinya sendiri.
- BR-U10: Sistem harus mempertahankan minimal satu supervisor aktif yang tidak terhapus.
- BR-U11: User terhapus tidak dapat diaktifkan kembali melalui endpoint update.
- BR-U12: Request baru dari session dengan versi autentikasi lama harus ditolak. Request yang telah berjalan sebelum pencabutan dapat selesai.
Produk

- BR-P01: SKU dinormalisasi dengan trim dan uppercase.
- BR-P02: SKU memiliki panjang 1–40 karakter dan cocok dengan [A-Z0-9_-]+.
- BR-P03: Nama produk memiliki panjang 1–120 karakter setelah trim.
- BR-P04: Satuan versi pertama hanya pcs.
- BR-P05: Produk baru memiliki stok nol.
- BR-P06: Perubahan dan penghapusan produk belum termasuk scope.
Penerimaan

- BR-R01: Satu dokumen memiliki 1–50 produk berbeda.
- BR-R02: Expected quantity adalah integer antara 1 dan 1.000.000.
- BR-R03: Expected quantity tidak dapat diubah setelah dokumen dibuat.
- BR-R04: Quantity pada receipt merupakan tambahan penerimaan, bukan total kumulatif.
- BR-R05: Setiap quantity receipt adalah integer positif.
- BR-R06: receivedQuantity tidak boleh melebihi expectedQuantity.
- BR-R07: Receipt dapat mencakup sebagian item dokumen.
- BR-R08: Satu item tidak boleh muncul dua kali dalam satu receipt.
- BR-R09: Receipt dengan beberapa item harus berhasil seluruhnya atau tidak mengubah data apa pun.
- BR-R10: Status OPEN berarti belum ada barang diterima.
- BR-R11: Status PARTIAL berarti sudah ada barang diterima tetapi belum semua item lengkap.
- BR-R12: Status COMPLETED berarti semua item diterima penuh.
- BR-R13: Penyelesaian dokumen dilakukan otomatis.
- BR-R14: Dokumen completed menolak receipt baru.
- BR-R15: Pengulangan receipt lama yang valid tetap diperbolehkan meskipun dokumen sudah completed.
- BR-R16: Receipt tersimpan tidak dapat diedit atau dihapus melalui aplikasi.
Stok dan duplicate protection

- BR-I01: Stok bertambah saat transaksi penerimaan berhasil commit.
- BR-I02: Pembuatan dokumen tidak mengubah stok.
- BR-I03: Setiap receipt menggunakan Idempotency-Key berupa UUID.
- BR-I04: Key berlaku dalam satu dokumen penerimaan.
- BR-I05: Key, actor, dokumen, dan payload identik menghasilkan receipt yang sama.
- BR-I06: Key sama dengan actor atau payload berbeda menghasilkan conflict.
- BR-I07: Redis tidak menjadi sumber kebenaran stok atau bukti receipt sudah diproses.
Non-functional requirements

| ID | Kebutuhan |
| --- | --- |
| NFR-01 | Seluruh kode aplikasi backend dan frontend menggunakan TypeScript strict. |
| NFR-02 | Backend menegakkan seluruh validasi bisnis tanpa bergantung pada frontend. |
| NFR-03 | Operasi receiving menggunakan transaksi PostgreSQL dan aman terhadap request bersamaan. |
| NFR-04 | Session tersimpan di Redis; cookie session bersifat HttpOnly. |
| NFR-05 | Terdapat perlindungan CSRF dan rate limiting berbasis Redis. |
| NFR-06 | Password, session ID, CSRF token, dan connection string tidak boleh muncul dalam log. |
| NFR-07 | UI menyediakan loading, empty, validation, pending, dan error states. |
| NFR-08 | Mutasi data frontend menggunakan TanStack Query useMutation. |
| NFR-09 | Dependency dikunci melalui lockfile dan versi aktual dicatat. |
| NFR-10 | Tersedia automated tests untuk aturan bisnis kritis dan keamanan autentikasi. |
| NFR-11 | Kegagalan Redis menghasilkan penolakan terkontrol; aplikasi tidak beralih diam-diam ke session atau limiter in-memory. |
| NFR-12 | Deployment dapat direproduksi dengan environment variables, migrasi, Dockerfile, dan Compose. |

## Scope

Termasuk:

- Login, logout, session, CSRF, role-based authorization.
- CRUD user sesuai aturan di atas.
- Pembuatan dan daftar produk.
- Pembuatan, daftar, dan detail dokumen penerimaan.
- Partial dan full receiving.
- Inventory balance dan transaction history.
- Redis session store dan rate limiting.
- Pengujian, dokumentasi, containerization.
Di luar scope:

- Multi-warehouse.
- Barang keluar, stock adjustment, retur, atau pembatalan receipt.
- Supplier master, purchase order, barcode, batch, serial number, expiry.
- Registrasi publik, reset password melalui email, MFA.
- Fitur AI di dalam aplikasi.
- Dashboard analitik tambahan.
- Public deployment, kecuali diminta hiring team.
Assumptions, constraints, unresolved questions

Asumsi:

- Hanya satu gudang.
- Semua barang menggunakan satuan pieces.
- Tidak ada stok awal selain nol.
- Kedua role dapat membuat dan menerima dokumen.
- Supervisor mengelola user dan produk.
- Timestamp disimpan dalam UTC.
Constraint:

- Target effort assessment 8–12 jam.
- Submission window maksimal tiga hari kalender.
- Kebenaran receiving diprioritaskan.
- Tambahan user management, Redis, session, dan CSRF merupakan scope yang dipilih kandidat.
Pertanyaan untuk stakeholder:

- Apakah operator boleh membuat dokumen?
- Apakah supervisor boleh mengelola supervisor lain?
- Bagaimana penanganan barang rusak atau berlebih?
- Apakah diperlukan koreksi penerimaan?
- Apakah satuan pecahan akan digunakan?
- Berapa perkiraan jumlah user dan transaksi?
Selama belum ada jawaban, implementasi mengikuti keputusan eksplisit dalam PRD ini.


## Boundary repository mandiri

PRD ini mempertahankan semua requirement sistem. Implementasikan hanya scope repository backend. Aplikasi lain tetap boundary integrasi; jangan menambah role/fitur atau mengubah aturan bisnis. Source lokal dan bukti asal dijelaskan pada [provenance.md](provenance.md).
