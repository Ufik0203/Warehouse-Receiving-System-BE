Saya susun ulang sebagai dokumen spesifikasi yang akan menjadi pegangan Codex, sesuai stack dan struktur folder yang kamu inginkan. Belum ada implementasi atau pengujian untuk rancangan baru ini.

Acuan kebutuhan: Technical Assessment_ AI-Driven Fullstack Developer(1).pdf

Untuk kontrak API, gunakan docs/api-contract.md sebagai equivalent API contract yang diperbolehkan PDF. Isinya saya rinci di bawah. Setelah kontraknya disepakati, Codex harus menghasilkan docs/openapi.yaml darinya sebelum mengimplementasikan endpoint.

Urutan penggunaannya:
1. Siapkan struktur repository.
2. Isi delapan dokumen berikut.
3. Tambahkan AGENTS.md sebagai instruksi proyek.
4. Jalankan Codex melalui tugas kecil secara bertahap.
5. Perbarui catatan implementasi dan hasil tes berdasarkan pekerjaan yang benar-benar dilakukan.
1. Tetapkan struktur repository terlebih dahulu

Gunakan npm workspaces dengan dua aplikasi: backend dan frontend.
Lokasi	Isi dan tanggung jawab
docs/	PRD, technical specification, ERD, API contract, diagram, AI workflow, testing
backend/prisma/schema.prisma	Konfigurasi generator dan datasource Prisma
backend/prisma/models/	Model Prisma yang dipisahkan berdasarkan domain
backend/prisma/migrations/	Migrasi Prisma beserta SQL constraint tambahan
backend/prisma/seeds/	Seed akun awal
backend/src/common/cache/	Konfigurasi session store dan rate-limit store Redis
backend/src/common/errors/	Error aplikasi dan pemetaan error
backend/src/common/middlewares/	Authentication, authorization, validation, request ID, error handler
backend/src/common/security/	Password hashing, CSRF, konfigurasi session dan rate limiting
backend/src/config/	Validasi dan pemuatan environment
backend/src/generated/prisma/	Prisma Client hasil generate
backend/src/lib/	Instance Prisma, Redis, dan logger
backend/src/modules/	Modul bisnis
backend/src/types/express-session.d.ts	Penambahan tipe data session
backend/src/types/express.d.ts	Tipe req.user dan req.requestId
backend/src/routes/	Penggabungan route aplikasi
backend/env/.env.example	Contoh konfigurasi tanpa secret
backend/env/.env	Konfigurasi lokal, diabaikan Git
backend/app.ts	Membentuk Express application tanpa menjalankan listener
backend/server.ts	Menjalankan server dan graceful shutdown
backend/docker/	Dockerfile dan kebutuhan container backend
backend/prisma.config.ts	Konfigurasi Prisma CLI
backend/tests/	Unit dan integration tests
frontend/src/app/router.tsx	Definisi route frontend
frontend/src/app/providers.tsx	QueryClientProvider dan provider aplikasi
frontend/src/assets/	Aset statis
frontend/src/components/layout/	Layout autentikasi dan dashboard
frontend/src/components/shared/	Komponen lintas fitur
frontend/src/config/env.ts	Validasi environment publik frontend
frontend/src/config/http-client.ts	HTTP client, credentials, CSRF, error normalization
frontend/src/config/query-client.ts	Konfigurasi TanStack Query
frontend/src/features/	Implementasi setiap fitur
frontend/src/hooks/	Hook global yang benar-benar digunakan lintas fitur
frontend/src/pages/	Komponen halaman route
frontend/src/styles/	Styles global
frontend/src/main.tsx	Entry point frontend
frontend/tests/	Component dan browser tests
frontend/docker/	Dockerfile dan konfigurasi nginx
compose.yaml	PostgreSQL, Redis, migration job, API, frontend
AGENTS.md	Aturan bagi Codex
README.md	Panduan menjalankan dan meninjau proyek


Modul backend yang dibutuhkan:
auth
users
products
receivings
inventory
health

Setiap modul bisnis menggunakan pola berikut:
<module>.schema.ts
<module>.repository.ts
<module>.mapper.ts
<module>.service.ts
<module>.controller.ts
<module>.route.ts

Pembagian tanggung jawabnya:
File	Tanggung jawab
schema.ts	Validasi body, params, query, dan tipe input
repository.ts	Akses Prisma dan SQL yang diperlukan
mapper.ts	Mengubah model database menjadi response DTO
service.ts	Aturan bisnis dan batas transaksi
controller.ts	Membaca request tervalidasi dan membentuk HTTP response
route.ts	Endpoint serta urutan middleware


Untuk health, buat hanya file yang diperlukan. Tidak perlu memaksakan repository atau mapper kosong.

Fitur frontend:
auth
users
products
receivings
inventory

Contoh isi fitur penerimaan:
features/receivings/api/receivings.api.ts
features/receivings/components/ReceivingForm.tsx
features/receivings/components/ReceivingItemsTable.tsx
features/receivings/components/ReceiveItemsForm.tsx
features/receivings/hooks/useReceivingsQuery.ts
features/receivings/hooks/useReceivingDetailQuery.ts
features/receivings/hooks/useCreateReceivingMutation.ts
features/receivings/hooks/useReceiveItemsMutation.ts
features/receivings/types/receivings.types.ts

2. Isi docs/prd.md

Dokumen ini menetapkan perilaku aplikasi. Detail teknis seperti Prisma transaction dan Redis key berada di technical specification.

Berikut isi yang dapat kamu gunakan.

Nama produk

Warehouse Receiving System.

Problem statement

Gudang mencatat barang masuk melalui spreadsheet. Proses tersebut menyulitkan petugas untuk membedakan jumlah barang yang diharapkan, jumlah yang sudah diterima, dan jumlah yang masih kurang.

Pengiriman dapat datang bertahap. Pencatatan ulang permintaan yang sama atau penerimaan melebihi jumlah yang diharapkan dapat menyebabkan ketidaksesuaian stok.

Aplikasi menyediakan pencatatan penerimaan barang, pembaruan stok, dan riwayat transaksi dengan aturan bisnis yang ditegakkan oleh backend.

Business objectives
- Menyediakan satu sumber pencatatan penerimaan barang.
- Mendukung penerimaan sebagian dan penuh.
- Mencegah penerimaan melebihi sisa jumlah yang diharapkan.
- Mencegah pengulangan permintaan menambah stok dua kali.
- Menyediakan stok dan riwayat transaksi yang dapat ditelusuri.
- Membatasi tindakan pengguna berdasarkan peran.
- Menyediakan aplikasi yang dapat dijalankan kembali dari lingkungan bersih.
User roles dan responsibilities

Aplikasi memiliki dua peran.
Aktivitas	OPERATOR	SUPERVISOR
Login dan logout	Ya	Ya
Melihat produk	Ya	Ya
Membuat produk	Tidak	Ya
Membuat dokumen penerimaan	Ya	Ya
Melihat dokumen dan detailnya	Ya	Ya
Mencatat penerimaan barang	Ya	Ya
Melihat stok dan transaksi	Ya	Ya
Melihat daftar dan detail user	Tidak	Ya
Membuat user	Tidak	Ya
Mengubah nama, role, dan status aktif user	Tidak	Ya
Menghapus user secara soft delete	Tidak	Ya


Supervisor bertanggung jawab atas pengelolaan akun dan master produk. Operator menjalankan proses penerimaan sehari-hari.

Pembagian ini merupakan keputusan desain untuk assessment karena PDF belum menjelaskan batas hak akses secara terperinci.

Functional requirements
ID	Requirement
FR-AUTH-01	Pengguna dapat login menggunakan email dan password.
FR-AUTH-02	Login menggunakan session yang disimpan di Redis.
FR-AUTH-03	Pengguna dapat logout dan session server dihancurkan.
FR-AUTH-04	Semua operasi perubahan data dilindungi CSRF, termasuk login.
FR-USER-01	Supervisor dapat membuat akun operator atau supervisor.
FR-USER-02	Supervisor dapat melihat daftar dan detail user.
FR-USER-03	Supervisor dapat mengubah nama, role, dan status aktif user.
FR-USER-04	Penghapusan user menggunakan soft delete.
FR-USER-05	Perubahan role, status aktif, atau penghapusan membatalkan session lama melalui pemeriksaan versi autentikasi.
FR-PROD-01	Pengguna dapat melihat daftar produk.
FR-PROD-02	Supervisor dapat membuat produk dengan SKU unik.
FR-REC-01	Pengguna dapat membuat dokumen penerimaan beserta item dan jumlah yang diharapkan.
FR-REC-02	Pengguna dapat melihat daftar dan detail dokumen penerimaan.
FR-REC-03	Pengguna dapat menerima sebagian atau seluruh jumlah yang tersisa.
FR-REC-04	Backend menolak penerimaan melebihi sisa jumlah.
FR-REC-05	Sistem memperbarui status dokumen secara otomatis.
FR-REC-06	Pengulangan permintaan penerimaan yang sama tidak menambah stok lagi.
FR-INV-01	Stok bertambah otomatis setelah penerimaan berhasil disimpan.
FR-INV-02	Semua pengguna terautentikasi dapat melihat stok.
FR-INV-03	Semua pengguna terautentikasi dapat melihat riwayat transaksi.
FR-OPS-01	Tersedia health check dan readiness check.
FR-OPS-02	Aplikasi dapat dijalankan menggunakan Docker Compose.


User stories dan acceptance criteria
ID	User story	Acceptance criteria
US-01	Sebagai pengguna, saya ingin login.	Kredensial valid menghasilkan session baru; kredensial salah menghasilkan 401 dengan pesan umum; akun nonaktif atau terhapus tidak dapat login.
US-02	Sebagai supervisor, saya ingin membuat user.	Email dinormalisasi dan unik; role harus valid; password disimpan sebagai hash; response tidak mengandung password atau hash.
US-03	Sebagai supervisor, saya ingin mengubah role user.	Perubahan tersimpan; session lama user tersebut ditolak pada request berikutnya; operator tidak dapat menjalankan tindakan ini.
US-04	Sebagai supervisor, saya ingin menghapus user.	User dinonaktifkan dan diberi deletedAt; riwayat penerimaan yang merujuk user tetap tersedia.
US-05	Sebagai supervisor, saya ingin membuat produk.	SKU valid dan unik setelah normalisasi; produk baru memiliki stok nol.
US-06	Sebagai operator, saya ingin membuat dokumen.	Dokumen memiliki minimal satu item, produk tidak berulang, expected quantity valid, dan stok belum berubah.
US-07	Sebagai operator, saya ingin menerima sebagian pengiriman.	Expected 100 dan penerimaan 40 menghasilkan received 40, remaining 60, status PARTIAL, dan stok bertambah 40.
US-08	Sebagai operator, saya ingin menyelesaikan penerimaan.	Setelah menerima sisa 60, status menjadi COMPLETED, remaining nol, dan total pertambahan stok 100.
US-09	Sebagai operator, saya ingin sistem menolak jumlah berlebih.	Ketika remaining 60, permintaan 61 ditolak dan tidak ada perubahan pada stok, item, receipt, atau transaksi.
US-10	Sebagai operator, saya ingin aman saat mengulang permintaan.	Key dan payload yang sama mengembalikan receipt semula tanpa transaksi stok tambahan.
US-11	Sebagai pengguna, saya ingin melihat transaksi.	Transaksi menampilkan produk, jumlah, dokumen sumber, receipt, pelaku, dan waktu.
US-12	Sebagai reviewer, saya ingin menjalankan proyek.	Instruksi dari kondisi bersih menghasilkan database termigrasi, akun awal, aplikasi berjalan, dan readiness berhasil.


Business rules

User dan autentikasi
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
ID	Kebutuhan
NFR-01	Seluruh kode aplikasi backend dan frontend menggunakan TypeScript strict.
NFR-02	Backend menegakkan seluruh validasi bisnis tanpa bergantung pada frontend.
NFR-03	Operasi receiving menggunakan transaksi PostgreSQL dan aman terhadap request bersamaan.
NFR-04	Session tersimpan di Redis; cookie session bersifat HttpOnly.
NFR-05	Terdapat perlindungan CSRF dan rate limiting berbasis Redis.
NFR-06	Password, session ID, CSRF token, dan connection string tidak boleh muncul dalam log.
NFR-07	UI menyediakan loading, empty, validation, pending, dan error states.
NFR-08	Mutasi data frontend menggunakan TanStack Query useMutation.
NFR-09	Dependency dikunci melalui lockfile dan versi aktual dicatat.
NFR-10	Tersedia automated tests untuk aturan bisnis kritis dan keamanan autentikasi.
NFR-11	Kegagalan Redis menghasilkan penolakan terkontrol; aplikasi tidak beralih diam-diam ke session atau limiter in-memory.
NFR-12	Deployment dapat direproduksi dengan environment variables, migrasi, Dockerfile, dan Compose.


Scope

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
3. Isi docs/technical-spec.md

Baseline teknologi
Bagian	Pilihan
Runtime backend	Node.js 24
Backend	Express 5 + TypeScript strict
ORM	Prisma ORM 7
Database	PostgreSQL 17
Session dan limiter store	Redis
Frontend	React + TypeScript + Vite
Routing frontend	React Router
Server state frontend	TanStack Query v5
Validation	Zod
Session	express-session + connect-redis
CSRF	Synchronizer token melalui csrf-sync
Password	Argon2id
Rate limiting	express-rate-limit + rate-limit-redis
Backend testing	Vitest + Supertest
Frontend testing	React Testing Library + Playwright
Deployment	Docker Compose dan nginx


Versi patch harus dipilih saat scaffolding, diperiksa kompatibilitasnya, lalu dikunci dalam lockfile. Prisma CLI, Client, dan adapter harus menggunakan versi yang kompatibel.

Arsitektur dan dependency direction

Alur request:
Route → Middleware → Controller → Service → Repository → Prisma/PostgreSQL

Ketentuannya:
- Controller tidak mengakses Prisma secara langsung.
- Repository tidak menerima Request atau Response Express.
- Service menentukan aturan bisnis dan transaction boundary.
- Mapper mengubah database model menjadi DTO.
- Mapper tidak menjalankan query atau mengubah database.
- Service boleh mengoordinasikan beberapa repository dalam satu transaksi.
- Repository yang berjalan dalam transaksi harus menerima Prisma.TransactionClient.
- Operasi dalam transaksi tidak boleh menggunakan Prisma Client global sebagai jalan pintas.
- Tidak membuat generic base repository jika belum diperlukan.
app.ts membentuk aplikasi dan menerima dependency yang dibutuhkan untuk pengujian.

server.ts memuat konfigurasi, menghubungkan dependency, menjalankan listener, dan menangani shutdown.

Konfigurasi Prisma multi-file

Untuk Prisma multi-file, arahkan CLI ke folder schema agar model di subfolder ikut terbaca. Prisma Client dihasilkan ke lokasi yang kamu minta. Pola folder dan custom output ini didukung dokumentasi Prisma. Prisma Documentation

Isi konfigurasi yang harus diwujudkan:
schema directory: backend/prisma/
main schema: backend/prisma/schema.prisma
model files: backend/prisma/models/*.prisma
migrations: backend/prisma/migrations/
seed entry: backend/prisma/seeds/index.ts
generated client: backend/src/generated/prisma/

Aturan:
- Generator menggunakan prisma-client.
- Output relatif dari schema.prisma adalah ../src/generated/prisma.
- Prisma Client hasil generate tidak diedit manual.
- Environment lokal dimuat dari backend/env/.env.
- Runtime Prisma menggunakan adapter PostgreSQL yang sesuai dengan Prisma 7.
- Build dan Docker build menjalankan Prisma generate.
- Generated client tidak diimpor oleh frontend.
- Gunakan ESM dengan konfigurasi TypeScript dan import yang konsisten.
Desain database

Semua identifier entitas menggunakan UUID. Timestamp menggunakan PostgreSQL timestamptz.

Nama model Prisma menggunakan PascalCase. Nama tabel dan kolom PostgreSQL menggunakan snake_case melalui mapping Prisma.
Tabel	Kolom
users	id uuid PK, email varchar(254) UNIQUE, name varchar(120), password_hash text, role enum, is_active boolean, auth_version integer, deleted_at timestamptz NULL, created_at timestamptz, updated_at timestamptz
products	id uuid PK, sku varchar(40) UNIQUE, name varchar(120), unit varchar(8), created_at timestamptz
receivings	id uuid PK, number varchar(40) UNIQUE, reference varchar(160), status enum, created_by uuid FK users, created_at timestamptz, updated_at timestamptz
receiving_items	id uuid PK, receiving_id uuid FK, product_id uuid FK, expected_quantity integer, received_quantity integer
receipts	id uuid PK, receiving_id uuid FK, actor_id uuid FK users, idempotency_key uuid, payload_hash char(64), received_at timestamptz
inventory_transactions	id uuid PK, receipt_id uuid, receiving_id uuid, receiving_item_id uuid, product_id uuid, quantity integer, created_at timestamptz
inventory_balances	product_id uuid PK/FK, available_quantity bigint, updated_at timestamptz


Default:
- ID dibuat oleh server/database.
- users.is_active = true.
- users.auth_version = 1.
- users.deleted_at = null.
- products.unit = pcs.
- receivings.status = OPEN.
- receivings.reference = "".
- receiving_items.received_quantity = 0.
- inventory_balances.available_quantity = 0.
Nomor dokumen:
RCV-<UUID uppercase lengkap>

Panjangnya 40 karakter dan dibuat server.

Constraint database

Wajib diwujudkan melalui Prisma dan SQL migration:
UNIQUE users(email)
CHECK users(email = lower(email))
CHECK users(auth_version >= 1)

UNIQUE products(sku)
CHECK products(sku matches ^[A-Z0-9_-]+$)
CHECK products(unit = 'pcs')

UNIQUE receiving_items(receiving_id, product_id)
UNIQUE receiving_items(id, receiving_id, product_id)
CHECK receiving_items(expected_quantity BETWEEN 1 AND 1000000)
CHECK receiving_items(received_quantity >= 0)
CHECK receiving_items(received_quantity <= expected_quantity)

UNIQUE receipts(receiving_id, idempotency_key)
UNIQUE receipts(id, receiving_id)

UNIQUE inventory_transactions(receipt_id, receiving_item_id)
CHECK inventory_transactions(quantity BETWEEN 1 AND 1000000)

CHECK inventory_balances(available_quantity >= 0)

Composite foreign key:
- (receipt_id, receiving_id) pada inventory transaction merujuk (id, receiving_id) pada receipt.
- (receiving_item_id, receiving_id, product_id) merujuk kombinasi yang sama pada receiving item.
Tujuannya memastikan receipt, receiving item, dokumen, dan produk dalam satu transaksi benar-benar konsisten.

Semua referensi historis menggunakan delete restriction. User hanya dihapus secara soft delete.

Index tambahan:
users(role, is_active)
users(created_at, id)

receivings(status, created_at, id)
receivings(created_at, id)

receiving_items(product_id)

receipts(actor_id)

inventory_transactions(product_id, created_at, id)
inventory_transactions(receiving_id, created_at, id)
inventory_transactions(receiving_item_id)
inventory_transactions(created_at, id)

Inventory strategy

Gunakan dua representasi:
- inventory_transactions: ledger penerimaan.
- inventory_balances: saldo untuk pembacaan stok.
Keduanya diperbarui dalam transaksi PostgreSQL yang sama.

Invariant:
inventory_balances.available_quantity
=
SUM(inventory_transactions.quantity) untuk produk tersebut

Invariant tambahan:
receiving_items.received_quantity
=
SUM(inventory_transactions.quantity) untuk receiving item tersebut

availableQuantity dikirim sebagai decimal string, karena kolom database menggunakan bigint.

Contoh:
{
  "availableQuantity": "100"
}

Saldo stok tidak di-cache di Redis pada versi ini.

Session authentication

Session hanya menyimpan identitas minimum:
interface SessionData {
  userId?: string;
  authVersion?: number;
  authenticatedAt?: number;
  anonymousCreatedAt?: number;
  csrfToken?: string;
}

Role otoritatif dibaca dari database pada setiap request terautentikasi.

Gunakan:
- Redis session store.
- resave: false.
- saveUninitialized: false.
- Rolling cookie untuk idle session.
- Cookie HttpOnly.
- Cookie host-only, tanpa atribut Domain.
- SameSite=Lax.
- Secure cookie untuk deployment HTTPS.
- Nama cookie lokal wrs.sid.
- Nama cookie HTTPS production __Host-wrs.sid, dengan Path /.
Cookie browser membawa session identifier; isi session disimpan di server. Konfigurasi secure cookie dan trusted proxy harus sesuai deployment. Express.js

Kebijakan waktu yang dipilih:
Session	Batas
Anonymous/pre-login	Maksimal 15 menit
Authenticated idle timeout	30 menit
Authenticated absolute lifetime	8 jam sejak login


TTL Redis dan cookie expiration harus konsisten. TTL session terautentikasi tidak boleh melampaui sisa absolute lifetime. connect-redis mendukung TTL dan mekanisme touch; pengaturannya harus disesuaikan dengan kebijakan ini. GitHub

Pada setiap protected request:
1. Pastikan session memiliki userId.
2. Periksa absolute lifetime.
3. Ambil user dari PostgreSQL.
4. Pastikan aktif dan belum terhapus.
5. Bandingkan session.authVersion dengan user.authVersion.
6. Isi req.user dari data database.
7. Jalankan authorization.
Session tidak valid menghasilkan 401. Kegagalan akses Redis/PostgreSQL menghasilkan 503, bukan dianggap kredensial salah.

Login dan CSRF flow

Gunakan synchronizer token yang terikat session. Token dikirim melalui JSON response dan dikembalikan frontend melalui X-CSRF-Token. Login juga dilindungi menggunakan pre-login session. Setelah login berhasil, buat session baru untuk mencegah session fixation. Pola ini mengikuti panduan OWASP dan tersedia melalui csrf-sync. OWASP Cheat Sheet Series

Alur yang ditetapkan:
1. Frontend meminta GET /api/v1/auth/csrf-token.
2. Backend membuat anonymous session bila diperlukan.
3. Backend membuat token acak minimal 32 byte dan menyimpannya dalam session.
4. Backend menyimpan session sebelum mengirim token.
5. Frontend menyimpan token dalam memory.
6. Frontend mengirim login dengan cookie dan header CSRF.
7. Backend memvalidasi CSRF, input, rate limit, dan password.
8. Setelah kredensial valid, backend menjalankan session regeneration.
9. Session baru diisi userId, authVersion, dan authenticatedAt.
10. Buat CSRF token baru untuk session baru.
11. Simpan session baru sebelum mengirim response login.
12. Response berisi user dan CSRF token baru.
Ketentuan tambahan:
- Token stabil selama session tersebut berlaku.
- GET /csrf-token mengembalikan token yang masih berlaku, bukan selalu merotasinya.
- POST, PATCH, PUT, dan DELETE wajib menjalani pemeriksaan CSRF.
- Token tidak dikirim melalui URL atau ditulis ke log.
- Mutating request wajib memakai JSON.
- Periksa Origin terhadap APP_ORIGIN; bila tidak ada, gunakan origin dari Referer.
- Request perubahan data tanpa Origin/Referer yang dipercaya ditolak dalam aplikasi ini.
- GET bisnis tidak mengubah state bisnis.
- Endpoint CSRF bootstrap hanya menginisialisasi state keamanan session.
Logout menghancurkan session Redis, menunggu hasilnya, lalu menghapus cookie dengan atribut yang sesuai.

Password security

Password menggunakan Argon2id dengan salt otomatis. Baseline minimal:
memoryCost: 19456 KiB
timeCost: 2
parallelism: 1

Parameter tersebut mengikuti rekomendasi minimum OWASP; waktu hashing perlu diperiksa di lingkungan implementasi. OWASP Cheat Sheet Series

Tidak menyimpan plaintext password, tidak mengembalikan hash, dan menggunakan pesan login umum untuk kredensial salah maupun akun yang tidak dapat digunakan.

User management dan session revocation
- Create user mewajibkan role eksplisit.
- Update hanya menerima name, role, isActive.
- Perubahan role/status yang benar-benar terjadi menaikkan authVersion.
- Soft delete mengisi deletedAt, mengubah isActive=false, dan menaikkan authVersion.
- Perubahan nama saja tidak membatalkan session.
- Semua user-management mutation mengambil satu PostgreSQL transaction advisory lock yang sama.
- Setelah lock diperoleh, periksa kembali actor masih supervisor aktif.
- Evaluasi invariant minimal satu supervisor aktif di dalam transaksi tersebut.
- Penghapusan ulang user yang sudah terhapus menghasilkan 204 tanpa perubahan tambahan.
Penggunaan lock di sini mencegah dua supervisor melakukan perubahan bersamaan yang melanggar invariant akun.

Redis dan rate limiting

Redis digunakan untuk:
wrs:sess:*            session
wrs:rl:global:*       global IP limiter
wrs:rl:login-ip:*     login IP limiter
wrs:rl:login-pair:*   login IP + normalized-email limiter
wrs:rl:user:*         authenticated-user limiter

Setiap limiter memiliki store/prefix terpisah. rate-limit-redis menyediakan shared store bagi express-rate-limit. GitHub

Batas awal yang dipilih:
Limiter	Batas
Seluruh /api/v1 per IP	300 request/menit
Login per IP	10 request/15 menit
Login per IP + email	5 request/15 menit
Protected API per user	120 request/menit


Ketentuan:
- Login limiter menghitung percobaan tanpa membocorkan keberadaan email.
- Key email menggunakan hash dari email yang dinormalisasi.
- Penanganan IP menggunakan dukungan IPv4/IPv6 dari library.
- Response limit adalah 429 dengan Retry-After.
- Gangguan store menghasilkan 503; limit tidak dilewati.
- Atur passOnStoreError agar request ditolak saat store gagal.
- trust proxy harus sesuai topologi proxy, bukan menerima seluruh forwarded header tanpa batas.
- Health endpoints tidak melewati session dan limiter bisnis.
Konfigurasi perilaku store error dan respons limiter tersedia pada dokumentasi library. express-rate-limit

Receiving transaction

Gunakan Prisma interactive transaction. Locking yang membutuhkan SQL dijalankan melalui parameterized raw query pada transaction client yang sama. Prisma mendukung kedua mekanisme tersebut. prisma.io

Urutannya wajib:
1. Authentication, authorization, CSRF, dan validasi input selesai.
2. Normalisasi UUID menjadi lowercase.
3. Urutkan payload item berdasarkan receivingItemId.
4. Hitung SHA-256 dari:
   - Receiving ID.
   - Actor ID.
   - Array item yang telah dinormalisasi.
5. Mulai transaksi PostgreSQL READ COMMITTED.
6. Lock row receiving menggunakan SELECT ... FOR UPDATE.
7. Cari receipt berdasarkan (receivingId, idempotencyKey).
8. Jika ditemukan:
   - Hash sama: kembalikan receipt lama tanpa write.
   - Hash berbeda: 409 IDEMPOTENCY_CONFLICT.
9. Jika belum ditemukan, tolak dokumen completed.
10. Baca dan lock item dokumen.
11. Validasi seluruh item dan remaining quantity sebelum melakukan write.
12. Buat receipt.
13. Increment received quantity setiap item.
14. Buat inventory transaction setiap item.
15. Increment inventory balance menggunakan operasi database atomik.
16. Update balance dalam urutan productId yang konsisten untuk mengurangi deadlock antar dokumen.
17. Hitung status dokumen dari seluruh item.
18. Update dokumen.
19. Commit.
20. Kirim response receipt.
Larangan:
- Membaca remaining quantity sebelum lock lalu memakainya untuk mengambil keputusan.
- Menyimpan idempotency hanya di Redis.
- Melakukan network call atau hashing password di dalam receiving transaction.
- Menulis sebagian perubahan di luar transaction client.
- Mengembalikan sukses sebelum commit.
Replayed receipt diperiksa sebelum penolakan status completed.

Response replay berisi receipt historis yang immutable, bukan snapshot dokumen yang sudah berubah akibat receipt lain.

State transitions
#chatgpt-mermaid-_r_16l_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-_r_16l_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_16l_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_16l_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_16l_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-_r_16l_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-_r_16l_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-_r_16l_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-_r_16l_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-_r_16l_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-_r_16l_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-_r_16l_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_16l_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_16l_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-_r_16l_ p{margin:0;}#chatgpt-mermaid-_r_16l_ defs [id$="-barbEnd"]{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_16l_ g.stateGroup text{fill:rgb(31, 78, 148);stroke:none;font-size:10px;}#chatgpt-mermaid-_r_16l_ g.stateGroup text{fill:rgb(237, 237, 237);stroke:none;font-size:10px;}#chatgpt-mermaid-_r_16l_ g.stateGroup .state-title{font-weight:bolder;fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_16l_ g.stateGroup rect{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);}#chatgpt-mermaid-_r_16l_ g.stateGroup line{stroke:rgb(175, 175, 175);stroke-width:1;}#chatgpt-mermaid-_r_16l_ .transition{stroke:rgb(175, 175, 175);stroke-width:1;fill:none;}#chatgpt-mermaid-_r_16l_ .stateGroup .composit{fill:transparent;border-bottom:1px;}#chatgpt-mermaid-_r_16l_ .stateGroup .alt-composit{fill:#e0e0e0;border-bottom:1px;}#chatgpt-mermaid-_r_16l_ .state-note{stroke:rgb(58, 132, 63);fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_16l_ .state-note text{fill:rgb(237, 237, 237);stroke:none;font-size:10px;}#chatgpt-mermaid-_r_16l_ .stateLabel .box{stroke:none;stroke-width:0;fill:rgb(9, 23, 44);opacity:0.5;}#chatgpt-mermaid-_r_16l_ .edgeLabel .label rect{fill:rgb(9, 23, 44);opacity:0.5;}#chatgpt-mermaid-_r_16l_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-_r_16l_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-_r_16l_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-_r_16l_ .edgeLabel .label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_16l_ .label div .edgeLabel{color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_16l_ .stateLabel text{fill:rgb(237, 237, 237);font-size:10px;font-weight:bold;}#chatgpt-mermaid-_r_16l_ .node circle.state-start{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_16l_ .node .fork-join{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_16l_ .node circle.state-end{fill:rgb(31, 78, 148);stroke:transparent;stroke-width:1.5;}#chatgpt-mermaid-_r_16l_ .end-state-inner{fill:transparent;stroke-width:1.5;}#chatgpt-mermaid-_r_16l_ .node rect{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-_r_16l_ .node polygon{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-_r_16l_ [id$="-barbEnd"]{fill:rgb(175, 175, 175);}#chatgpt-mermaid-_r_16l_ .statediagram-cluster rect{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-_r_16l_ .cluster-label,#chatgpt-mermaid-_r_16l_ .nodeLabel{color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_16l_ .statediagram-cluster rect.outer{rx:5px;ry:5px;}#chatgpt-mermaid-_r_16l_ .statediagram-state .divider{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-_r_16l_ .statediagram-state .title-state{rx:5px;ry:5px;}#chatgpt-mermaid-_r_16l_ .statediagram-cluster.statediagram-cluster .inner{fill:transparent;}#chatgpt-mermaid-_r_16l_ .statediagram-cluster.statediagram-cluster-alt .inner{fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_16l_ .statediagram-cluster .inner{rx:0;ry:0;}#chatgpt-mermaid-_r_16l_ .statediagram-state rect.basic{rx:5px;ry:5px;}#chatgpt-mermaid-_r_16l_ .statediagram-state rect.divider{stroke-dasharray:10,10;fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_16l_ .note-edge{stroke-dasharray:5;}#chatgpt-mermaid-_r_16l_ .statediagram-note rect{fill:rgb(48, 48, 48);stroke:rgb(58, 132, 63);stroke-width:1px;rx:0;ry:0;}#chatgpt-mermaid-_r_16l_ .statediagram-note rect{fill:rgb(48, 48, 48);stroke:rgb(58, 132, 63);stroke-width:1px;rx:0;ry:0;}#chatgpt-mermaid-_r_16l_ .statediagram-note text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_16l_ .statediagram-note .nodeLabel{color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_16l_ .statediagram .edgeLabel{color:red;}#chatgpt-mermaid-_r_16l_ [id$="-dependencyStart"],#chatgpt-mermaid-_r_16l_ [id$="-dependencyEnd"]{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);stroke-width:1;}#chatgpt-mermaid-_r_16l_ .statediagramTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_16l_ [data-look="neo"].statediagram-cluster rect{fill:rgb(9, 23, 44);stroke:url(#chatgpt-mermaid-_r_16l_-gradient);stroke-width:1;}#chatgpt-mermaid-_r_16l_ [data-look="neo"].statediagram-cluster rect.outer{rx:5px;ry:5px;filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_16l_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-_r_16l_ [data-look="neo"].node rect,#chatgpt-mermaid-_r_16l_ [data-look="neo"].cluster rect,#chatgpt-mermaid-_r_16l_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-_r_16l_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_16l_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-_r_16l_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-_r_16l_-gradient);stroke-width:1px;}#chatgpt-mermaid-_r_16l_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_16l_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-_r_16l_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-_r_16l_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_16l_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-_r_16l_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-_r_16l_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_16l_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-_r_16l_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_16l_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}OPENPARTIALCOMPLETEDCreateReceive someReceive allReceive moreReceive remaining




Tidak ada endpoint manual complete, reopen, cancel, edit expected quantity, atau delete receipt.

Frontend dan TanStack Query

Semua server-state read menggunakan useQuery. Semua operasi perubahan state server menggunakan useMutation, termasuk login dan logout.

Query key:
["auth", "me"]

["users", "list", filters]
["users", "detail", userId]

["products", "list", filters]
["products", "detail", productId]

["receivings", "list", filters]
["receivings", "detail", receivingId]

["inventory", "list", filters]
["inventory", "transactions", filters]

Invalidasi:
Mutation	Query yang diperbarui
Login	Set data auth/me, gunakan CSRF baru
Logout	Hapus seluruh query cache dan CSRF memory
Create/update/delete user	User list dan detail terkait
Create product	Product list dan inventory list
Create receiving	Receiving list
Receive items	Receiving detail, receiving list, inventory list, transaction history


TanStack Query mendukung invalidasi query terkait melalui callback mutation. Promise invalidasi dapat ditunggu agar status mutation tetap pending sampai pembaruan selesai. TanStack Query React Docs

Ketentuan mutation penerimaan:
- retry: false secara eksplisit.
- Buat idempotency key sebelum mengirim mutation.
- Simpan key dan payload bersama sebagai satu pending operation.
- Simpan pending operation di sessionStorage, dipisahkan berdasarkan actor dan receiving ID.
- Tidak menyimpan password, session ID, atau CSRF token dalam pending operation.
- Jika response hilang atau terjadi 5xx, retry menggunakan key dan payload yang sama.
- Reload, login ulang, atau logout tidak boleh otomatis membuat key baru untuk operasi yang belum diketahui hasilnya.
- IDEMPOTENCY_CONFLICT memerlukan pemeriksaan riwayat; jangan otomatis mengirim ulang dengan key baru.
- Tidak melakukan optimistic increment stok.
- Kegagalan refetch setelah mutation sukses ditampilkan sebagai masalah refresh, bukan mengubah status receipt menjadi gagal.
- Pada 401, hentikan protected queries dan hapus cached data user sebelumnya.
- CSRF token kedaluwarsa dapat diambil ulang; mutating request hanya boleh diulang sekali setelah error CSRF yang dipastikan terjadi sebelum service dijalankan.
Migration dan deployment
- Migrasi dibuat dengan Prisma Migrate.
- Check constraint dan composite FK tambahan harus ada dalam SQL migration.
- migrate dev hanya untuk development.
- Deployment menggunakan migrate deploy.
- Jangan mengubah migration yang sudah diterapkan.
- Seed dijalankan eksplisit.
- Seed tidak mereset password akun yang sudah ada.
- Semua secret berasal dari environment.
- Gunakan satu migration/seed job sebelum API siap melayani.
- Redis dan PostgreSQL tidak diekspos ke internet.
4. Isi docs/erd.mmd

Diagram berikut menjelaskan relasi. Constraint lintas kolom tetap mengikuti technical specification.
#chatgpt-mermaid-_r_17e_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-_r_17e_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_17e_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_17e_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_17e_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-_r_17e_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-_r_17e_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-_r_17e_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-_r_17e_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-_r_17e_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-_r_17e_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-_r_17e_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_17e_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_17e_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-_r_17e_ p{margin:0;}#chatgpt-mermaid-_r_17e_ .entityBox{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);}#chatgpt-mermaid-_r_17e_ .relationshipLabelBox{fill:rgb(48, 48, 48);opacity:0.7;background-color:rgb(48, 48, 48);}#chatgpt-mermaid-_r_17e_ .relationshipLabelBox rect{opacity:0.5;}#chatgpt-mermaid-_r_17e_ .labelBkg{background-color:rgba(48, 48, 48, 0.5);}#chatgpt-mermaid-_r_17e_ .edgeLabel{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-_r_17e_ .edgeLabel .label rect{fill:rgb(0, 0, 0);}#chatgpt-mermaid-_r_17e_ .edgeLabel .label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_17e_ .edgeLabel .label{fill:rgb(31, 78, 148);font-size:14px;}#chatgpt-mermaid-_r_17e_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_17e_ .edge-pattern-dashed{stroke-dasharray:8,8;}#chatgpt-mermaid-_r_17e_ .node rect,#chatgpt-mermaid-_r_17e_ .node circle,#chatgpt-mermaid-_r_17e_ .node ellipse,#chatgpt-mermaid-_r_17e_ .node polygon{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-_r_17e_ .relationshipLine{stroke:rgb(175, 175, 175);stroke-width:1px;fill:none;}#chatgpt-mermaid-_r_17e_ .marker{fill:none!important;stroke:rgb(175, 175, 175)!important;stroke-width:1;}#chatgpt-mermaid-_r_17e_ [data-look=neo].labelBkg{background-color:rgba(48, 48, 48, 0.5);}#chatgpt-mermaid-_r_17e_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-_r_17e_ [data-look="neo"].node rect,#chatgpt-mermaid-_r_17e_ [data-look="neo"].cluster rect,#chatgpt-mermaid-_r_17e_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-_r_17e_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_17e_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-_r_17e_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-_r_17e_-gradient);stroke-width:1px;}#chatgpt-mermaid-_r_17e_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_17e_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-_r_17e_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-_r_17e_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_17e_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-_r_17e_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-_r_17e_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_17e_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-_r_17e_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_17e_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}UseruuididPKvarcharemailUKvarcharnametextpassword_hashenumrolebooleanis_activeintauth_versiontimestamptzdeleted_attimestamptzcreated_attimestamptzupdated_atReceivinguuididPKvarcharnumberUKvarcharreferenceenumstatusuuidcreated_byFKtimestamptzcreated_attimestamptzupdated_atReceiptuuididPKuuidreceiving_idFKuuidactor_idFKuuididempotency_keycharpayload_hashtimestamptzreceived_atProductuuididPKvarcharskuUKvarcharnamevarcharunittimestamptzcreated_atInventoryBalanceuuidproduct_idPK,FKbigintavailable_quantitytimestamptzupdated_atReceivingItemuuididPKuuidreceiving_idFKuuidproduct_idFKintexpected_quantityintreceived_quantityInventoryTransactionuuididPKuuidreceipt_idFKuuidreceiving_idFKuuidreceiving_item_idFKuuidproduct_idFKintquantitytimestamptzcreated_atcreatesrecordshasexpected_inmovescontainsreceivesproducesfulfilled_by




Tambahkan catatan berikut di technical specification, bukan di sintaks ERD:
- Satu produk hanya sekali dalam satu receiving.
- Satu key hanya sekali dalam satu receiving.
- Satu receiving item hanya sekali dalam satu receipt.
- Composite foreign key memastikan receipt, dokumen, item, dan produk saling sesuai.
- User tidak dihapus secara fisik.
- Inventory transaction tidak memiliki endpoint update/delete.
5. Isi docs/api-contract.md

Ini merupakan kontrak API yang harus diterjemahkan Codex menjadi docs/openapi.yaml.

General conventions
Base path: /api/v1
Content-Type: application/json
Authentication: session cookie
CSRF header: X-CSRF-Token
Receiving idempotency header: Idempotency-Key
Property naming: camelCase
Timestamp: ISO-8601 UTC
ID: UUID

Semua object request bersifat strict: field tidak dikenal ditolak.

Format sukses:
interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

Format error:
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Array<{
      path: string;
      message: string;
    }>;
  };
}

Pagination:
page: integer 1..1000000, default 1
limit: integer 1..100, default 20

Unknown query parameter ditolak dengan 400.

Response DTO
type Role = "OPERATOR" | "SUPERVISOR";

type ReceivingStatus =
  | "OPEN"
  | "PARTIAL"
  | "COMPLETED";

interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductDto {
  id: string;
  sku: string;
  name: string;
  unit: "pcs";
  createdAt: string;
}

interface ReceivingDto {
  id: string;
  number: string;
  reference: string;
  status: ReceivingStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ReceivingItemDto {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
}

interface ReceivingDetailDto extends ReceivingDto {
  items: ReceivingItemDto[];
}

interface ReceiptDto {
  id: string;
  receivingId: string;
  receivedBy: string;
  receivedAt: string;
  items: Array<{
    receivingItemId: string;
    productId: string;
    quantity: number;
  }>;
}

interface InventoryDto {
  productId: string;
  sku: string;
  productName: string;
  unit: "pcs";
  availableQuantity: string;
  updatedAt: string;
}

interface InventoryTransactionDto {
  id: string;
  receiptId: string;
  receivingId: string;
  receivingNumber: string;
  receivingItemId: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  actorId: string;
  actorName: string;
  createdAt: string;
}

password, passwordHash, authVersion, session ID, dan payload hash tidak boleh muncul dalam user/business response.

Authentication endpoints
Method dan path	Auth	CSRF	Request	Sukses
GET /auth/csrf-token	Anonymous atau authenticated	Tidak	Tidak ada	200 ApiResponse<{ csrfToken: string }>
POST /auth/login	Anonymous	Ya	{ email, password }	200 ApiResponse<{ user: UserDto, csrfToken: string }>
GET /auth/me	Ya	Tidak	Tidak ada	200 ApiResponse<UserDto>
POST /auth/logout	Ya	Ya	Tidak ada	204, tanpa body


Login validation:
- Email valid, maksimal 254 karakter, trim dan lowercase.
- Password harus string nonempty dengan batas 128 code point.
- Password tidak di-trim.
- Pesan kegagalan tidak membedakan akun tidak ada, nonaktif, terhapus, atau password salah.
- Login sukses mengirim Set-Cookie untuk session baru.
GET /auth/csrf-token dan seluruh response autentikasi menggunakan Cache-Control: no-store.

User endpoints

Seluruh endpoint berikut hanya untuk supervisor.
Method dan path	Request	Sukses
GET /users	Query pagination, role?, isActive?, includeDeleted?	200 PaginatedResponse<UserDto>
GET /users/:id	UUID	200 ApiResponse<UserDto>
POST /users	Create user body	201 ApiResponse<UserDto>
PATCH /users/:id	Update user body	200 ApiResponse<UserDto>
DELETE /users/:id	UUID	204


Query:
- role: enum role.
- isActive: literal true atau false.
- includeDeleted: literal true atau false, default false.
- Daftar default mencakup user aktif dan nonaktif yang belum terhapus.
- Urutan createdAt DESC, id DESC.
- Detail user terhapus masih dapat dibaca supervisor untuk keperluan penelusuran.
Create:
interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

Validation:
- Nama 1–120 karakter setelah trim.
- Email valid, maksimal 254 karakter.
- Password 12–128 Unicode code point.
- Role wajib dikirim.
- isActive, deletedAt, dan authVersion tidak boleh ditentukan client.
Update:
interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

Minimal satu field harus dikirim.

Konflik:
EMAIL_ALREADY_EXISTS
SELF_ACCOUNT_RESTRICTION
LAST_ACTIVE_SUPERVISOR
USER_DELETED

Semua mutation user membutuhkan CSRF.

Product endpoints
Method dan path	Role	Request	Sukses
GET /products	Kedua role	Pagination, q?	200 PaginatedResponse<ProductDto>
GET /products/:id	Kedua role	UUID	200 ApiResponse<ProductDto>
POST /products	Supervisor	{ sku, name }	201 ApiResponse<ProductDto>


q:
- Optional.
- Trim.
- Maksimal 100 karakter.
- Pencarian case-insensitive berdasarkan potongan SKU atau nama.
- Urutan produk sku ASC, id ASC.
Create product dan inventory balance nol harus berada dalam transaksi yang sama.

Conflict SKU menggunakan 409 SKU_ALREADY_EXISTS.

Receiving endpoints
Method dan path	Request	Sukses
GET /receivings	Pagination, status?	200 PaginatedResponse<ReceivingDto>
GET /receivings/:id	UUID	200 ApiResponse<ReceivingDetailDto>
POST /receivings	Create receiving body	201 ApiResponse<ReceivingDetailDto>
POST /receivings/:id/receipts	Receive body dan idempotency header	201 baru atau 200 replay


Kedua role boleh mengakses endpoint ini.

List diurutkan createdAt DESC, id DESC.

Detail header dan item harus berasal dari snapshot database yang konsisten.

Create request:
interface CreateReceivingInput {
  reference?: string;
  items: Array<{
    productId: string;
    expectedQuantity: number;
  }>;
}

Validation:
- Reference maksimal 160 karakter setelah trim; default string kosong.
- Item 1–50.
- Product ID valid dan tersedia.
- Product ID tidak berulang.
- Expected quantity integer 1–1.000.000.
- Client tidak boleh mengirim status atau received quantity.
Receive request:
interface ReceiveItemsInput {
  items: Array<{
    receivingItemId: string;
    quantity: number;
  }>;
}

Header wajib:
Idempotency-Key: <UUID>
X-CSRF-Token: <session-bound-token>

Validation:
- Item 1–50.
- Receiving item ID berbeda.
- Semua item berasal dari receiving yang diminta.
- Quantity integer 1–1.000.000.
- Quantity tidak melebihi remaining.
- Tidak menerima field total stok atau total received dari client.
Response baru:
201 Created
Idempotency-Replayed: false

Response pengulangan:
200 OK
Idempotency-Replayed: true

Keduanya menggunakan ApiResponse<ReceiptDto>.

Body replay harus identik dengan response receipt pertama, termasuk timestamp dan urutan item yang deterministik.

Error receiving:
Kondisi	Status	Code
Receiving tidak ada	404	RECEIVING_NOT_FOUND
Item bukan bagian dokumen	404	RECEIVING_ITEM_NOT_FOUND
Melebihi remaining	409	OVER_RECEIPT
Dokumen completed, operasi baru	409	RECEIVING_COMPLETED
Key sama, payload/actor berbeda	409	IDEMPOTENCY_CONFLICT


Inventory endpoints
Method dan path	Request	Sukses
GET /inventory	Pagination, q?	200 PaginatedResponse<InventoryDto>
GET /inventory/transactions	Pagination, productId?, receivingId?	200 PaginatedResponse<InventoryTransactionDto>


Inventory:
- Memuat produk dengan stok nol.
- q mengikuti aturan pencarian produk.
- Urutan sku ASC, productId ASC.
Transaction history:
- Filter ID harus UUID.
- Bila filter UUID valid tidak memiliki transaksi, kembalikan daftar kosong.
- Urutan createdAt DESC, id DESC.
- Quantity merupakan delta positif.
- Actor tetap memiliki ID yang dapat ditelusuri meskipun akunnya nonaktif atau terhapus.
Health endpoints

Berada di luar base path bisnis:
GET /health/live

{
  "status": "ok"
}

GET /health/ready

{
  "status": "ready",
  "dependencies": {
    "postgres": "up",
    "redis": "up"
  }
}

Readiness memeriksa koneksi database, akses schema yang diperlukan, dan Redis PING.

Jika belum siap, gunakan 503 dengan format error standar.

Shared errors
Status	Code
400	VALIDATION_ERROR, INVALID_JSON
401	UNAUTHENTICATED, SESSION_EXPIRED, INVALID_CREDENTIALS
403	FORBIDDEN, CSRF_INVALID, ORIGIN_NOT_ALLOWED
404	Resource-specific not found
409	Business-specific conflict
413	PAYLOAD_TOO_LARGE
415	UNSUPPORTED_MEDIA_TYPE
429	RATE_LIMITED
503	DEPENDENCY_UNAVAILABLE, TRANSACTION_RETRY_REQUIRED
500	INTERNAL_ERROR


JSON body maksimal 64 KiB.

Lock timeout atau deadlock yang sudah rollback boleh dipetakan ke 503 TRANSACTION_RETRY_REQUIRED. Client tetap menggunakan idempotency key semula saat retry.

Persyaratan OpenAPI hasil konversi

Codex harus menghasilkan OpenAPI yang mencakup:
- Seluruh endpoint di atas.
- Request/response schema.
- Required fields, enum, min/max, format UUID dan timestamp.
- Cookie authentication.
- CSRF header pada seluruh mutation, termasuk login.
- Idempotency header khusus receive.
- Seluruh response status yang relevan.
- Contoh request dan response.
- Error schema bersama.
- Response header Idempotency-Replayed.
- Status 204 tanpa response body.
6. Isi docs/data-flow.mmd

Diagram ini menunjukkan proses receiving serta peran Redis yang terpisah dari transaksi stok.
PostgreSQLReceiving serviceRedisExpressReactPostgreSQLReceiving serviceRedisExpressReact#chatgpt-mermaid-_r_1di_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-_r_1di_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_1di_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_1di_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_1di_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-_r_1di_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-_r_1di_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-_r_1di_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-_r_1di_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-_r_1di_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-_r_1di_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-_r_1di_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_1di_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_1di_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-_r_1di_ p{margin:0;}#chatgpt-mermaid-_r_1di_ .actor{stroke:rgb(31, 78, 148);fill:rgb(9, 23, 44);stroke-width:1;}#chatgpt-mermaid-_r_1di_ rect.actor.outer-path[data-look="neo"]{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_1di_ rect.note[data-look="neo"]{stroke:rgb(58, 132, 63);fill:rgb(48, 48, 48);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_1di_ text.actor>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-_r_1di_ .actor-line{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_1di_ .innerArc{stroke-width:1.5;stroke-dasharray:none;}#chatgpt-mermaid-_r_1di_ .messageLine0{stroke-width:1.5;stroke-dasharray:none;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_1di_ .messageLine1{stroke-width:1.5;stroke-dasharray:2,2;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_1di_ [id$="-arrowhead"] path{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_1di_ .sequenceNumber{fill:#505050;}#chatgpt-mermaid-_r_1di_ [id$="-sequencenumber"]{fill:rgb(175, 175, 175);}#chatgpt-mermaid-_r_1di_ [id$="-crosshead"] path{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_1di_ .messageText{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-_r_1di_ .labelBox{stroke:rgba(255, 255, 255, 0.15);fill:rgb(0, 0, 0);filter:none;}#chatgpt-mermaid-_r_1di_ .labelText,#chatgpt-mermaid-_r_1di_ .labelText>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-_r_1di_ .loopText,#chatgpt-mermaid-_r_1di_ .loopText>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-_r_1di_ .sectionTitle,#chatgpt-mermaid-_r_1di_ .sectionTitle>tspan{fill:rgb(237, 237, 237);stroke:none;}#chatgpt-mermaid-_r_1di_ .loopLine{stroke-width:2px;stroke-dasharray:2,2;stroke:rgba(255, 255, 255, 0.15);fill:rgba(255, 255, 255, 0.15);}#chatgpt-mermaid-_r_1di_ .note{stroke:rgb(58, 132, 63);fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_1di_ .noteText,#chatgpt-mermaid-_r_1di_ .noteText>tspan{fill:rgb(237, 237, 237);stroke:none;font-weight:normal;}#chatgpt-mermaid-_r_1di_ .activation0{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-_r_1di_ .activation1{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-_r_1di_ .activation2{fill:rgb(48, 48, 48);stroke:hsl(0, 0%, 8.8235294118%);}#chatgpt-mermaid-_r_1di_ .actorPopupMenu{position:absolute;}#chatgpt-mermaid-_r_1di_ .actorPopupMenuPanel{position:absolute;fill:rgb(9, 23, 44);box-shadow:0px 8px 16px 0px rgba(0,0,0,0.2);filter:drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4));}#chatgpt-mermaid-_r_1di_ .actor-man circle,#chatgpt-mermaid-_r_1di_ line{fill:rgb(9, 23, 44);stroke-width:2px;}#chatgpt-mermaid-_r_1di_ g rect.rect{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));stroke:rgb(31, 78, 148);}#chatgpt-mermaid-_r_1di_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-_r_1di_ [data-look="neo"].node rect,#chatgpt-mermaid-_r_1di_ [data-look="neo"].cluster rect,#chatgpt-mermaid-_r_1di_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-_r_1di_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_1di_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-_r_1di_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-_r_1di_-gradient);stroke-width:1px;}#chatgpt-mermaid-_r_1di_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_1di_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-_r_1di_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-_r_1di_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_1di_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-_r_1di_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-_r_1di_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_1di_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-_r_1di_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_1di_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}alt[Invalid operation][Valid operation]alt[Matching receipt exists][Key conflicts][New receipt]POST receipt with cookie, CSRF and key1Check rate limit and load session2Session and limiter result3Read current user and auth version4Current authorization data5Validate auth, CSRF, role and payload6Receive validated items7BEGIN and lock receiving8Find receipt by receiving and key9Original receipt and payload hash10End transaction without writes11Original immutable receipt12200 replay13ROLLBACK14Idempotency conflict15409 conflict16Lock items and validate remaining17ROLLBACK18Business error19Error without stock changes20Insert receipt and transactions21Update item quantities and balances22Update receiving status23COMMIT24New receipt25201 created26Invalidate affected TanStack queries27




Penjelasan tambahan di technical specification:
- Redis bukan bagian dari transaksi inventory.
- Gangguan pengiriman response setelah commit merupakan hasil yang belum diketahui client.
- Client menyelesaikannya melalui replay key yang sama.
- Frontend mengambil kembali state server setelah receipt terkonfirmasi.
7. Isi docs/ai-workflow.md

Dokumen ini berisi rencana penggunaan Codex serta catatan pekerjaan aktual. Pisahkan keduanya.

Tujuan

Menggunakan Codex untuk mengimplementasikan spesifikasi secara bertahap, meninjau hasilnya, menjalankan pengujian, dan menjaga konsistensi dokumentasi.

Project inputs
AGENTS.md
docs/prd.md
docs/technical-spec.md
docs/api-contract.md
docs/openapi.yaml, setelah dihasilkan
docs/erd.mmd
docs/data-flow.mmd
docs/testing.md

Status awal
Specification: drafted
Implementation: not started for this specification
Automated verification: NOT_RUN
Docker verification: NOT_RUN

Jangan memindahkan hasil pengujian proyek lain atau rancangan sebelumnya sebagai bukti rancangan ini.

Task 1 — Review spesifikasi dan buat rencana
Read AGENTS.md and every document under docs/.

Review consistency between:
- Business rules.
- Role permissions.
- Database entities and constraints.
- Session and CSRF lifecycle.
- API request/response contracts.
- Receiving transaction and idempotency.
- Frontend query invalidation.
- Testing requirements.

List concrete contradictions or missing implementation decisions.
Apply the documented defaults where already specified.
Do not invent additional product scope.

Produce:
1. A requirement-to-module mapping.
2. An implementation checklist.
3. A dependency/version compatibility plan.
4. docs/openapi.yaml derived from docs/api-contract.md.

Validate the generated OpenAPI document.
Do not implement business endpoints in this task.

Task 2 — Scaffold dan database
Implement the repository structure specified in technical-spec.md.

Use:
- Express and React with strict TypeScript.
- Prisma ORM 7 with multi-file models.
- PostgreSQL.
- Redis.
- npm workspaces.

Create the Prisma models, migrations, seed entry, validated environment
configuration, Prisma/Redis clients, backend app/server separation,
frontend provider/router foundation, and dependency health checks.

Include SQL check constraints and composite foreign keys that are not
fully expressible in Prisma schema syntax.

Do not replace Prisma Migrate with db push for deployment.
Do not add business features outside the PRD.

Verify:
- Type checking.
- Prisma validate.
- Prisma generate.
- Migration on a clean database.
- Migration deploy repeated safely.
- Environment validation rejects missing secrets.

Task 3 — Session, CSRF, authorization, rate limiting
Implement authentication from the API contract.

Use Redis-backed express-session and a session-bound synchronizer
CSRF token, including pre-login CSRF protection.

Implement:
- CSRF bootstrap.
- Login with session regeneration.
- Current-user endpoint.
- Logout with confirmed session destruction.
- Idle and absolute expiration.
- Current-user and authVersion checks on protected requests.
- Role authorization.
- Redis-backed rate limits.
- Safe dependency failure handling.

Add integration tests using real Redis and PostgreSQL.

Prove that:
- Session ID changes after login.
- Old pre-login session cannot authenticate.
- Missing or invalid CSRF rejects mutations.
- Redis failure does not bypass authentication or rate limits.
- Logout invalidates the session.

Task 4 — Core receiving backend
Implement products, receiving documents, receipts, inventory balances,
and transaction history according to the specifications.

Use a single Prisma interactive transaction per receipt.

Lock the receiving before idempotency lookup and remaining-quantity
decisions. Use transaction-scoped repositories throughout.

Implement persistent idempotency in PostgreSQL.
Return the original receipt on replay, including after completion.

Add integration tests for:
- Partial and full receiving.
- Over-receiving.
- Cross-document item misuse.
- Multi-item atomicity.
- Concurrent same-key requests.
- Concurrent distinct requests.
- Cross-document updates of the same product.
- Late database failure and rollback.
- Balance and ledger reconciliation.

Do not proceed with frontend stock mutations until these tests pass.

Task 5 — User management
Implement supervisor-only user management.

Follow the exact create/update/delete contract.
Use soft deletion and preserve historical foreign keys.

Protect:
- Self-demotion, self-deactivation, self-deletion.
- Last active supervisor invariant.
- Concurrent supervisor account changes.
- Old sessions after role/status changes.

Use transaction-scoped PostgreSQL advisory locking for account
management invariants and recheck the acting supervisor inside
the transaction.

Do not add public registration, email changes, password reset,
or an additional administrator role.

Add authorization and session-revocation integration tests.

Task 6 — Frontend
Implement the frontend using the specified feature-based structure.

Use TanStack Query:
- useQuery for server reads.
- useMutation for login, logout, and all business mutations.
- Centralized typed query keys.
- Targeted invalidation after successful mutations.

Implement login, user management, product list/create, receiving
list/create/detail, partial/full receipt, inventory, and history.

The HTTP client must send session credentials and CSRF tokens
only to the trusted application API.

Preserve pending receipt key and payload across navigation,
reload, and reauthentication.

Do not optimistically increment inventory.
Separate mutation success from a subsequent refetch failure.

Add browser tests including a committed receipt whose response
is deliberately lost, followed by a same-key retry.

Task 7 — Deployment dan final review
Create and verify reproducible Docker deployment.

Provide PostgreSQL, Redis, migration/seed job, API, and frontend.

Run:
- Lint.
- Type checking.
- Prisma validation and generation.
- Unit tests.
- Integration tests.
- Browser tests.
- Production builds.
- Clean Docker Compose startup.
- Health/readiness checks.

Review the implementation against PRD IDs and API contracts.
Update docs/testing.md with actual commands and outcomes.
Record limitations and unexecuted checks explicitly.
Do not claim a successful command unless it was executed.

Execution log template

Untuk setiap task yang benar-benar dijalankan, catat:
Task:
Date:
Agent/interface:
Input documents:
Instruction:
Changed files:
Important decisions:
Commands executed:
Observed results:
Remaining issues:
Related Git commit:
Status:

Prompts di atas berstatus planned sampai benar-benar digunakan.
8. Isi docs/testing.md

Tujuan

Membuktikan bahwa implementasi memenuhi acceptance criteria, menjaga konsistensi stok, serta menegakkan authentication, CSRF, authorization, dan rate limiting.

Testing layers
Layer	Fokus
Unit	Domain rules, schema, mapper, hash canonicalization
Integration	Express + Prisma + PostgreSQL + Redis
Component	Form behavior dan state TanStack Query
End-to-end	Alur pengguna melalui browser
Deployment	Docker build, migration job, clean start, health


Redis dan PostgreSQL nyata wajib dipakai untuk integration tests yang membuktikan session, limiter, transaction, dan concurrency.

Authentication dan security tests
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
Kasus	Hasil yang diharapkan
Membuat dokumen expected 100	Received 0, stok tidak berubah, OPEN
Receive 40	Received 40, remaining 60, stock +40, PARTIAL
Receive 61 ketika remaining 60	409, seluruh data tidak berubah
Receive 60	Received 100, remaining 0, total stock +100, COMPLETED
Receipt baru setelah completed	409
Replay final receipt	Receipt lama dikembalikan, stok tidak berubah
Satu item valid dan satu berlebih	Seluruh receipt rollback
Item dari dokumen lain	Ditolak tanpa perubahan
Quantity 0, negatif, pecahan, atau string	400
Item ID berulang	400
Key sama, payload berbeda	409
Key sama, actor berbeda	409
Payload sama, urutan item berbeda	Replay
Dua request sama secara bersamaan	Satu receipt dan satu pertambahan stok
Dua receipt masing-masing 7, expected 10	Hanya satu diterima
Dua receipt 4 dan 6, expected 10	Total tepat 10
Dua dokumen menerima produk yang sama	Balance merupakan total kedua receipt
Database gagal setelah sebagian write	Semua perubahan rollback


Late-failure test harus memicu kegagalan database setelah setidaknya satu write dilakukan, bukan hanya gagal pada validasi awal.

Reconciliation tests

Jalankan pemeriksaan:
balance per product = jumlah ledger per product

received per receiving item = jumlah ledger per receiving item

0 <= received <= expected

COMPLETED jika dan hanya jika seluruh item fully received

Pastikan pemeriksaan dilakukan setelah:
- Successful receiving.
- Rejected receiving.
- Duplicate replay.
- Concurrent requests.
- Injected database failure.
Frontend tests
- Login memperoleh pre-login CSRF terlebih dahulu.
- Login memakai mutation dan menggunakan CSRF baru dari response.
- Refresh mengambil /auth/me dan tetap mengenali session.
- Operator tidak melihat kontrol user management atau create product.
- Backend tetap menolak akses langsung yang tidak berizin.
- Receiving mutation menginvalidasi query yang benar.
- Mutation pending mencegah submit ganda dari UI.
- Tidak ada optimistic stock increment.
- Response hilang setelah commit tetap menghasilkan pending operation.
- Reload dan login ulang mempertahankan key serta payload operation tersebut.
- Replay menghasilkan stok tetap, bukan bertambah dua kali.
- Refetch failure setelah successful receipt tidak memicu receipt baru.
- Pergantian user tidak menampilkan query cache user sebelumnya.
Deployment tests
- Docker image backend dan frontend berhasil dibangun.
- PostgreSQL dan Redis healthy.
- Migration berjalan dari database kosong.
- Seed membuat akun tanpa secret hardcoded.
- API menunggu initialization berhasil.
- Readiness memeriksa PostgreSQL dan Redis.
- Restart API tidak menghilangkan session yang masih valid di Redis.
- Menjalankan migration deploy kembali tidak menduplikasi schema.
- Shutdown menutup HTTP server, Prisma, dan Redis dengan benar.
Evidence format

Setiap bukti memuat:
Command:
Environment:
Date:
Exit code:
Observed output:
Requirement IDs:

Status awal seluruh check:
NOT_RUN

Jangan menulis PASS berdasarkan keberadaan file tes.

Known limitations awal
- Satu gudang dan satuan pcs.
- Tidak tersedia koreksi atau pembatalan penerimaan.
- Tidak tersedia reset password atau perubahan email.
- SessionStorage pending operation hilang jika tab/storage dihapus.
- Belum ada hasil load test atau SLA.
- Public deployment belum dilakukan.
- Pengujian dan Docker verification menunggu implementasi.
Daftar ini diperbarui setelah implementasi, bukan dihapus otomatis.
9. Isi README.md

README harus menjadi pintu masuk reviewer. Karena implementasi belum dibuat, bagian perintah berikut merupakan kontrak script yang harus diwujudkan Codex, bukan klaim bahwa script tersebut sudah tersedia.

Project overview

Warehouse Receiving System menggunakan:
Express + TypeScript
React + TypeScript
Prisma + PostgreSQL
Redis sessions
CSRF protection
Redis-backed rate limiting
TanStack Query
Docker Compose

Fitur:
- Session login/logout.
- User management berdasarkan role.
- Product creation/listing.
- Partial dan full receiving.
- Inventory balance dan transaction history.
- Duplicate protection.
- Automated tests dan reproducible deployment.
Documentation map
Dokumen	Tujuan
docs/prd.md	Kebutuhan dan acceptance criteria
docs/technical-spec.md	Rancangan teknis dan aturan implementasi
docs/erd.mmd	Relasi data
docs/api-contract.md	Kontrak API sumber
docs/openapi.yaml	Kontrak machine-readable hasil konversi
docs/data-flow.mmd	Alur receiving
docs/ai-workflow.md	Instruksi serta catatan penggunaan AI
docs/testing.md	Strategi, bukti, dan keterbatasan pengujian
AGENTS.md	Instruksi coding agent


Prerequisites
- Node.js 24.
- npm sesuai versi yang dicatat repository.
- Docker dan Docker Compose v2.
- Git.
Environment

Environment backend lokal berada di:
backend/env/.env

Template:
NODE_ENV=development
DEPLOYMENT_MODE=local

PORT=3000
APP_ORIGIN=http://localhost:5173

DATABASE_URL=
REDIS_URL=

SESSION_SECRET=
SESSION_COOKIE_SECURE=false
SESSION_IDLE_SECONDS=1800
SESSION_ABSOLUTE_SECONDS=28800
ANONYMOUS_SESSION_SECONDS=900

POSTGRES_USER=warehouse
POSTGRES_DB=warehouse
POSTGRES_PASSWORD=

REDIS_PASSWORD=

SEED_SUPERVISOR_NAME=
SEED_SUPERVISOR_EMAIL=
SEED_SUPERVISOR_PASSWORD=

SEED_OPERATOR_NAME=
SEED_OPERATOR_EMAIL=
SEED_OPERATOR_PASSWORD=

Ketentuan:
- Isi seluruh credential sebelum menjalankan.
- Gunakan secret acak minimal 32 byte untuk session signing.
- Jangan commit .env.
- Client browser tidak menerima database URL, Redis URL, atau session secret.
- Untuk local development, URL database/Redis menggunakan host port.
- Compose mengoverride URL agar menggunakan service hostname internal.
- SESSION_COOKIE_SECURE=false hanya untuk local HTTP.
- HTTPS deployment menggunakan secure cookie dan origin HTTPS.
Environment frontend:
VITE_API_BASE_URL=/api/v1

Local execution

Setelah scaffold tersedia:
npm ci

Salin backend/env/.env.example menjadi backend/env/.env, lalu isi konfigurasinya.

Jalankan dependency:
docker compose --env-file backend/env/.env up -d postgres redis

Generate dan migrasikan:
npm run prisma:generate -w backend
npm run db:migrate:deploy -w backend
npm run db:seed -w backend

Jalankan di terminal terpisah:
npm run dev -w backend

npm run dev -w frontend

Buka:
http://localhost:5173

Vite mem-proxy /api ke backend. Gunakan hostname yang sama secara konsisten agar cookie dan Origin tidak bermasalah.

Required scripts

Backend:
dev
build
start
lint
typecheck
prisma:validate
prisma:generate
db:migrate:dev
db:migrate:deploy
db:seed
test:unit
test:integration

Frontend:
dev
build
lint
typecheck
test:unit
test:e2e

Root:
lint
typecheck
build

db:migrate:deploy mengoperasikan target DATABASE_URL. test:integration wajib menggunakan konfigurasi database dan namespace Redis khusus tes.

Testing commands
npm run lint
npm run typecheck
npm run test:unit -w backend
npm run test:integration -w backend
npm run test:unit -w frontend
npm run test:e2e -w frontend
npm run build

Instruksi test harus menjelaskan:
- Cara menjalankan PostgreSQL dan Redis khusus tes.
- Database tes wajib bernama dengan akhiran _test.
- Namespace Redis tes dipisahkan dari aplikasi.
- Tes tidak menjalankan FLUSHALL pada Redis bersama.
- Browser tests menggunakan akun dan data disposable.
- Bukti aktual disimpan atau diringkas dalam docs/testing.md.
Docker execution

Service yang harus tersedia:
postgres
redis
migrate
api
web

Clean start:
docker compose --env-file backend/env/.env up --build -d

Pemeriksaan:
docker compose --env-file backend/env/.env ps -a

docker compose --env-file backend/env/.env logs migrate api web

Buka:
http://localhost:8080

Untuk Docker lokal, APP_ORIGIN harus sesuai:
APP_ORIGIN=http://localhost:8080

Health:
curl http://localhost:8080/health/live

curl http://localhost:8080/health/ready

Urutan startup:
1. PostgreSQL dan Redis healthy.
2. Migration/seed job selesai dengan exit code 0.
3. API mulai melayani dan readiness berhasil.
4. Frontend gateway tersedia.
Normal stop:
docker compose --env-file backend/env/.env down

Perintah tersebut mempertahankan volume data.

Demonstration
1. Login sebagai supervisor.
2. Buat operator melalui user management.
3. Buat produk SKU WDG-001.
4. Buat receiving expected 100.
5. Receive 40.
6. Tunjukkan status PARTIAL dan stok 40.
7. Tunjukkan backend menolak receive 61.
8. Receive 60.
9. Tunjukkan status COMPLETED dan stok 100.
10. Tunjukkan dua transaksi: +40 dan +60.
11. Tunjukkan replay receipt tidak menambah stok.
12. Login sebagai operator dan tunjukkan pembatasan akses.
13. Tunjukkan hasil tes dan readiness.
Deployment notes
- Public deployment bersifat opsional berdasarkan PDF.
- Untuk HTTPS, aktifkan secure cookie dan trusted proxy yang tepat.
- PostgreSQL dan Redis tidak diekspos publik.
- Redis memakai authentication dan konfigurasi yang sesuai untuk session.
- Migration tidak dijalankan oleh setiap API replica.
- Seed tidak mengganti password user yang telah tersedia.
- Catat keterbatasan serta langkah deployment yang belum diverifikasi.
10. Tambahkan AGENTS.md

File ini penting karena PDF juga meminta relevant project instruction files.

Gunakan isi berikut:
# Agent instructions

## Read first

Before changing application code, read:

1. docs/prd.md
2. docs/technical-spec.md
3. docs/api-contract.md
4. docs/openapi.yaml, when available
5. docs/erd.mmd
6. docs/data-flow.mmd
7. docs/testing.md

Do not infer business behavior already defined by these documents.

If documents contradict each other:
- Identify the concrete contradiction.
- Use the PRD for business intent.
- Update the technical design and contract consistently.
- Record the decision before implementing affected behavior.

## Scope

Implement only the assessment scope and the explicitly requested additions:
- Supervisor-managed users.
- Session authentication.
- CSRF.
- Redis session storage and rate limiting.
- Express/React TypeScript.
- Prisma.
- TanStack Query.

Do not add unrelated features or an extra administrator role.

## Architecture

- Follow the documented folder structure.
- Keep app.ts separate from server.ts.
- Route wires middleware and controller.
- Controller handles HTTP adaptation.
- Service owns business rules and transaction boundaries.
- Repository owns database access.
- Mapper creates safe response DTOs.
- Do not introduce empty abstractions.

## TypeScript

- Use strict TypeScript.
- Avoid explicit any and type suppression.
- Validate untrusted data before using it.
- Keep database models separate from public DTOs.
- Never expose password hashes or session internals.

## Database

- Use Prisma ORM 7 and compatible dependencies.
- Use multi-file models under prisma/models.
- Generate the client into src/generated/prisma.
- Add forward migrations.
- Include required SQL constraints.
- Do not edit applied migrations.
- Do not use db push as deployment migration strategy.

## Authentication

- Use Redis-backed server sessions.
- Regenerate session after successful login.
- Protect login and all mutations with CSRF.
- Reload user role/status/authVersion from PostgreSQL.
- Fail safely on Redis outages.
- Never fall back to in-memory production sessions or rate limits.

## Receiving

- One receipt uses one PostgreSQL transaction.
- Lock receiving before idempotency and quantity decisions.
- Check existing receipt before rejecting completed status.
- Use the transaction client for every transaction operation.
- Persist idempotency in PostgreSQL.
- Same operation replays the original receipt.
- Changed operation with the same key returns conflict.
- Update item counters, ledger, balances, and status atomically.
- Keep balance updates in deterministic product order.
- Never trust client-provided stock or received totals.

## Frontend

- Use useQuery for server reads.
- Use useMutation for server mutations.
- Centralize query keys and HTTP security behavior.
- Preserve pending receipt key and payload.
- Do not optimistically increase inventory.
- Distinguish committed mutation from refetch failure.
- Clear cached user data on authentication loss.
- Backend authorization remains mandatory.

## Verification and evidence

- Add meaningful tests for changed business behavior.
- Run checks appropriate to the task.
- Use real PostgreSQL/Redis for relevant integration tests.
- Record actual commands and results.
- Leave unexecuted checks marked NOT_RUN.
- Never fabricate prompts, logs, test passes, deployment, or work history.
- Keep Git commits small and descriptive.

Cara menjalankannya dengan Codex

Mulai dengan Task 1 dari docs/ai-workflow.md. Setelah hasilnya kamu review, lanjutkan task berikutnya satu per satu.

Untuk setiap tahap, minta Codex mengembalikan:
1. Requirement yang diselesaikan.
2. File yang berubah.
3. Keputusan penting.
4. Perintah verifikasi yang dijalankan.
5. Hasil aktual.
6. Keterbatasan atau blocker.

Dengan susunan ini, Codex mendapat aturan bisnis, kontrak data, batas arsitektur, perilaku keamanan, serta kriteria pengujian yang konkret sebelum mulai menulis aplikasi.