# Warehouse Receiving System

## Persiapan dua repository mandiri sebelum Task 3

`backend/` dan `frontend/` sekarang masing-masing memiliki manifest dependency lengkap, package-lock.json, konfigurasi TypeScript/ESLint/npm lokal, .gitignore dan README. Keduanya telah diinstal dan dibangun dalam salinan temporary di luar workspace tanpa file induk. Lihat [README backend](backend/README.md) dan [README frontend](frontend/README.md) untuk command dari root repository masing-masing.

Root workspaces, konfigurasi dan dokumentasi di proyek sumber tetap dipertahankan sebagai convenience ketika kedua aplikasi masih berada bersama. Lockfile root hanya untuk mode gabungan; gunakan lockfile lokal saat folder backend/frontend menjadi repository tersendiri. Tidak ada perintah Git dijalankan, dan metadata Git existing tidak diubah. Seluruh staging/commit/remote/push dilakukan manual. Task 3 belum dimulai.

> Sumber: [PROJECT_SPEC.md](PROJECT_SPEC.md). Task 2: fondasi backend/frontend dan database tersedia. Endpoint autentikasi/bisnis belum diimplementasikan. Bukti verifikasi aktual ada di docs/testing.md.

Repository menggunakan npm workspaces `backend` dan `frontend`. Tahap ini menyediakan health/readiness dan fondasi aplikasi. Daftar fitur bisnis di bawah adalah target PRD, bukan fitur yang sudah dapat digunakan.

## Project overview

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

| Dokumen | Tujuan |
| --- | --- |
| docs/prd.md | Kebutuhan dan acceptance criteria |
| docs/technical-spec.md | Rancangan teknis dan aturan implementasi |
| docs/erd.mmd | Relasi data |
| docs/api-contract.md | Kontrak API sumber |
| docs/openapi.yaml | Kontrak machine-readable hasil konversi |
| docs/data-flow.mmd | Alur receiving |
| docs/ai-workflow.md | Instruksi serta catatan penggunaan AI |
| docs/testing.md | Strategi, bukti, dan keterbatasan pengujian |
| AGENTS.md | Instruksi coding agent |

## Prerequisites

- Node.js 24.
- npm 11.6.2 untuk instalasi yang terverifikasi; lihat packageManager dan docs/dependency-versions.json.
- Docker dengan plugin Compose Specification; host terverifikasi memakai Compose v5.5.1 (lihat docs/dependency-plan.md).
- Git.
Environment

Environment backend lokal berada di:
backend/env/.env

Template:

```text
NODE_ENV=development
DEPLOYMENT_MODE=local
```

```text
PORT=3000
APP_ORIGIN=http://localhost:5173
```

```text
DATABASE_URL=
REDIS_URL=
```

```text
SESSION_SECRET=
SESSION_COOKIE_SECURE=false
SESSION_IDLE_SECONDS=1800
SESSION_ABSOLUTE_SECONDS=28800
ANONYMOUS_SESSION_SECONDS=900
```

```text
POSTGRES_USER=warehouse
POSTGRES_DB=warehouse
POSTGRES_PASSWORD=
```

```text
REDIS_PASSWORD=
```

```text
SEED_SUPERVISOR_NAME=
SEED_SUPERVISOR_EMAIL=
SEED_SUPERVISOR_PASSWORD=
```

```text
SEED_OPERATOR_NAME=
SEED_OPERATOR_EMAIL=
SEED_OPERATOR_PASSWORD=
```

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

```text
VITE_API_BASE_URL=/api/v1
```

## Local execution

Instalasi dari lockfile memakai npm 11.6.2 tanpa mengganti npm global:

```powershell
npx --yes --offline=false --package=npm@11.6.2 npm ci --offline=false
```

Salin `backend/env/.env.example` menjadi `backend/env/.env`, lalu isi credential, connection URLs, signing secret minimal 32 byte, dan kedua akun seed. Jangan memakai credential verifikasi untuk penggunaan lain.

Untuk Compose default, database URL memakai host `127.0.0.1`, port `POSTGRES_PORT`, dan nama `POSTGRES_DB`; Redis URL memakai port `REDIS_PORT` dan password yang sama dengan `REDIS_PASSWORD`. Percent-encode password dalam URL. Hanya `postgres` dan `redis` yang tersedia di Compose Task 2. Port dipublikasikan pada loopback. API dan Vite dijalankan pada host.

Jalankan dependency:

```text
docker compose --env-file backend/env/.env up -d postgres redis
```

Generate dan migrasikan:

```text
npm run prisma:validate -w backend
npm run prisma:generate -w backend
npm run db:migrate:deploy -w backend
npm run db:seed -w backend
```

Jalankan di terminal terpisah:

```text
npm run dev -w backend
```

```text
npm run dev -w frontend
```

Buka:

```text
http://localhost:5173
```

Vite mem-proxy /api ke backend. Gunakan hostname yang sama secara konsisten agar cookie dan Origin tidak bermasalah.

## Script saat ini dan kontrak script tahap berikutnya

Script yang tersedia sekarang tercantum di package.json. test:integration saat ini hanya suite fondasi yang memerlukan database khusus dan flag eksplisit. Daftar berikut tetap menjadi kontrak script keseluruhan proyek; script frontend tests akan ditambahkan pada Task 6.

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

## Testing commands target suite lengkap

Frontend/component/browser tests di bawah belum tersedia; gunakan blok pemeriksaan fondasi Task 2 untuk command yang sudah dijalankan.

```text
npm run lint
npm run typecheck
npm run test:unit -w backend
npm run test:integration -w backend
npm run test:unit -w frontend
npm run test:e2e -w frontend
npm run build
```

Instruksi test harus menjelaskan:

- Cara menjalankan PostgreSQL dan Redis khusus tes.
- Database tes wajib bernama dengan akhiran _test.
- Namespace Redis tes dipisahkan dari aplikasi.
- Tes tidak menjalankan FLUSHALL pada Redis bersama.
- Browser tests menggunakan akun dan data disposable.
- Bukti aktual disimpan atau diringkas dalam docs/testing.md.
## Docker execution aplikasi (rencana Task 7; belum tersedia)

Target service setelah Task 7 (saat ini hanya postgres dan redis):
postgres
redis
migrate
api
web

Clean start:

```text
docker compose --env-file backend/env/.env up --build -d
```

Pemeriksaan:

```text
docker compose --env-file backend/env/.env ps -a
```

```text
docker compose --env-file backend/env/.env logs migrate api web
```

Buka:

```text
http://localhost:8080
```

Untuk Docker lokal, APP_ORIGIN harus sesuai:

```text
APP_ORIGIN=http://localhost:8080
```

Health:

```text
curl http://localhost:8080/health/live
```

```text
curl http://localhost:8080/health/ready
```

Urutan startup:

1. PostgreSQL dan Redis healthy.
2. Migration/seed job selesai dengan exit code 0.
3. API mulai melayani dan readiness berhasil.
4. Frontend gateway tersedia.
Normal stop:

```text
docker compose --env-file backend/env/.env down
```

Perintah tersebut mempertahankan volume data.

## Demonstration (setelah fitur bisnis selesai)

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

## Status dokumentasi

Sembilan file dokumentasi telah dipisahkan dari `PROJECT_SPEC.md`, yang tetap menjadi dokumen sumber. `docs/openapi.yaml` telah dibuat dan divalidasi pada Task 1. Catatan ketidakkonsistenan dan keputusan terbuka tersedia di [technical specification](docs/technical-spec.md#ketidakkonsistenan-dan-keputusan-yang-masih-terbuka). Perintah scaffold/host execution sudah tersedia. Perintah full Docker deployment dan demonstrasi bisnis masih rencana. Bukti Task 2 memisahkan pemeriksaan fondasi PASS dari pemeriksaan fitur berikutnya yang NOT_RUN.

Acuan kebutuhan dalam sumber: `Technical Assessment_ AI-Driven Fullstack Developer(1).pdf`. `docs/api-contract.md` merupakan equivalent API contract; setelah disepakati, `docs/openapi.yaml` harus dihasilkan sebelum implementasi endpoint.

## Hasil Task 1

- [Mapping 87 requirement](docs/requirement-mapping.md).
- [Review konsistensi dan pertanyaan terbuka](docs/spec-review.md).
- [Rencana dependency dengan sumber resmi](docs/dependency-plan.md).
- [OpenAPI](docs/openapi.yaml) dan [bukti validasi](docs/testing.md#bukti-aktual-task-1).
- [Checklist implementasi berurutan](docs/ai-workflow.md#checklist-implementasi-berurutan).

Task 2 telah dilaksanakan; lihat status fondasi dan bukti terbaru di bawah. Fitur autentikasi/bisnis dan pengujiannya tetap belum tersedia.

## Status aktual Task 2

Tambahan **Task 2A — Fondasi UI**: halaman `/` kini menampilkan contoh Tailwind CSS 4.3.3 dan Card/Button HeroUI 3.2.6. React/React DOM tetap 19.3.1. Ini demo UI tanpa fitur atau API bisnis. Jalankan `npm run dev -w frontend`, atau build lalu `npm run preview -w frontend`. [Bukti Task 2A](docs/testing.md#bukti-aktual-task-2a) mencakup desktop/mobile Chrome. Pengecualian typing frontend `exactOptionalPropertyTypes: false` dijelaskan pada technical-spec; strict tetap aktif.

- Express 5/TypeScript strict dengan app.ts untuk DI/testing dan server.ts untuk startup/shutdown. Endpoint yang tersedia hanya GET /health/live dan GET /health/ready. Semua path auth/bisnis belum tersedia.
- React/TypeScript, router declarative dan QueryClientProvider sudah dibangun; UI saat ini hanya halaman fondasi.
- Prisma 7 multi-file, tujuh model, UUID/timestamptz, composite FK RESTRICT, indeks/unique dan sembilan SQL CHECK sudah termigrasi di database verifikasi.
- Seed membuat akun dari environment secara atomik, memakai shared advisory lock dan Argon2id. Seed ulang mempertahankan semua field/hash akun yang sudah ada, termasuk akun nonaktif/terhapus; seed tidak mengaktifkan atau mereset akun lama. Tidak ada password bawaan.
- Pertanyaan error API, panjang teks input bisnis dan snapshot receiving tetap terbuka sebelum endpoint terkait; tidak dijadikan keputusan kontrak pada Task 2. Seed name dibatasi menurut kapasitas varchar PostgreSQL, tanpa menetapkan validator API mendatang.
- Semua versi manifest exact, package-lock.json disimpan, instalasi npm ci lulus. Versi aktual tersedia di [dependency-versions.json](docs/dependency-versions.json).

Pemeriksaan fondasi:

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:foundation
```

Periksa environment tanpa menyalakan server:

```powershell
npm run env:check -w backend
```

Health pada API host:

```powershell
curl.exe http://localhost:3000/health/live
curl.exe http://localhost:3000/health/ready
```

Server hanya mulai listen setelah koneksi PostgreSQL, schema yang diperlukan dan Redis siap. Startup invalid env/dependency menghasilkan nonzero exit dan pesan tanpa secret. Readiness yang gagal menghasilkan 503 error standar; liveness tetap independen. Shutdown menunggu request HTTP, lalu menutup Prisma dan Redis, dengan deadline 10 detik. Signal handler SIGINT/SIGTERM tersedia; jalur shutdown diuji langsung dengan dependency nyata, sedangkan pengiriman signal dari PTY Windows belum terkonfirmasi.

## Verifikasi database terisolasi

Jangan arahkan tes ke database aplikasi. Untuk verifikasi migrasi kosong baru, gunakan env file baru yang diabaikan Git, nama database unik berakhiran `_test`, Compose project name baru, dan port host yang belum dipakai. Tetapkan `RUN_FOUNDATION_INTEGRATION=true`. `.env.example` dapat menjadi template; isi semua credential dan akun seed sendiri. Gunakan nama project/volume baru dan jangan menghapus volume lama agar tes bisa berjalan.

```powershell
# Ganti path ini dengan env file verifikasi baru berisi konfigurasi lengkap.
$verificationEnv = (Resolve-Path 'backend/env/.env.verification').Path
$env:BACKEND_ENV_FILE = $verificationEnv
$verificationProject = 'wrs-task2-verification-baru'
docker compose -p $verificationProject --env-file $verificationEnv up -d --wait postgres redis
npm run verify:database -w backend
npm run db:seed -w backend
npm run db:seed -w backend
npm run test:integration -w backend
```

`verify:database` menolak database tanpa akhiran `_test`, flag yang hilang, atau public schema yang sudah mempunyai tabel. Ia tidak menghapus data: sebelum migrasi menuntut nol tabel, kemudian membandingkan definisi kolom, constraint dan riwayat migrasi sebelum/sesudah deploy ulang. Rerun pada database yang sudah dimigrasi memang ditolak; siapkan project/database baru bila ingin mengulangi bukti kondisi kosong.

Suite integration fondasi juga mengharapkan tepat dua akun awal dan tidak boleh dipakai pada database tes yang sudah berisi fixture fitur lain. Tes constraint membuat fixture hanya dalam transaksi yang pasti rollback. Tidak ada FLUSHALL, penghapusan database, atau penghapusan volume.

Untuk menghentikan hanya layanan verifikasi sambil mempertahankan volume:

```powershell
docker compose -p $verificationProject --env-file $verificationEnv stop postgres redis
```

Environment dan project aktual yang digunakan pada Task 2 dicatat dalam docs/testing.md. File env aktual tidak di-commit. Full Docker API/web deployment, browser tests, session/CSRF dan endpoint bisnis tetap menunggu tahap berikutnya.
