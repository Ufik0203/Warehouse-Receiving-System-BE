# Warehouse Receiving System — Backend

Repository backend mandiri: Node.js 24.12.0, npm 11.6.2, Express 5, TypeScript strict, Prisma ORM 7, PostgreSQL 17 dan Redis 8. Autentikasi/endpoint bisnis belum diimplementasikan; Task 3 belum dimulai. Endpoint saat ini hanya `GET /health/live` dan `GET /health/ready`.

Seluruh file untuk instalasi dan build berada dalam repository ini. Tidak memerlukan package.json, node_modules, konfigurasi atau lockfile dari folder induk/frontend. Folder ini boleh disalin sebagai root repository tersendiri. Dokumentasi mandiri tersedia pada docs/; provenance dan arsip lokal mempertahankan dokumen proyek asal. Tidak perlu mengakses folder induk untuk membaca spesifikasi atau menjalankan command fondasi.

## Install dan build

Dari root repository backend:

```powershell
npx --yes --offline=false --package=npm@11.6.2 npm ci --offline=false
npm run lint
npm run prisma:validate
npm run typecheck
npm run build
npm run test:unit
```

Jika npm 11.6.2 sudah tersedia, `npm ci` dapat dipakai langsung. Versi exact dependency ada pada package.json dan package-lock.json. Semua command di bawah dijalankan dari root repository ini.

`prisma:validate` dan `prisma:generate` memakai prisma.generate.config.ts, yang tidak memerlukan DATABASE_URL, secret, PostgreSQL atau Redis. `typecheck` dan `build` menghasilkan Prisma Client terlebih dahulu, sehingga clone baru tidak memerlukan generated files yang di-commit. Generated client berada di src/generated/prisma dan tidak boleh diedit manual.

## Konfigurasi lokal dan menjalankan server

Salin `env/.env.example` menjadi `env/.env`. Isi DATABASE_URL, REDIS_URL, signing secret minimal 32 byte, APP_ORIGIN dan pengaturan cookie. URL database harus memakai PostgreSQL; URL Redis memakai redis/rediss. Process environment lebih diprioritaskan daripada file. BACKEND_ENV_FILE dapat menunjuk file eksplisit; path file itu harus berada dalam lingkungan yang memang ingin digunakan.

Compose lokal tersedia dalam repository ini. Isi POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD dan REDIS_PASSWORD; pilih POSTGRES_PORT/REDIS_PORT yang belum dipakai. URL runtime memakai host loopback dan port host yang sama. Percent-encode password di dalam URL. Compose memakai project default `warehouse-receiving-backend`, berbeda dari proyek sumber; database/volume sumber tidak dipindah atau dihapus.

```powershell
docker compose --env-file env/.env up -d --wait postgres redis
npm run env:check
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Migration dan seed memakai prisma.config.ts, sehingga membutuhkan DATABASE_URL nyata. Seed memerlukan kedua set SEED_SUPERVISOR_* dan SEED_OPERATOR_* dari environment; tidak memiliki password bawaan dan tidak mengganti akun/hash lama. Tidak ada migration atau seed otomatis saat install/build. Pilih DATABASE_URL dengan sengaja sebelum menjalankan command perubahan database.

Server production hasil build dijalankan dengan `npm start`. Server memeriksa PostgreSQL/schema dan Redis sebelum listen; shutdown menutup HTTP, Prisma dan Redis. Periksa `http://localhost:3000/health/live` dan `/health/ready` sesuai PORT. Frontend merupakan repository/aplikasi terpisah; APP_ORIGIN default pada template merujuk Vite localhost:5173. Integrasi frontend saat ini melalui proxy Vite, bukan CORS lintas origin.

Untuk menghentikan dependency tanpa menghapus volume:

```powershell
docker compose --env-file env/.env stop postgres redis
```

## Struktur dan aturan pengembangan

- app.ts membentuk Express app dengan dependency injection; server.ts menangani konfigurasi, koneksi, listener dan shutdown.
- src/config, src/lib dan src/modules/health memuat fondasi runtime. Controller/service/repository/mapper fitur bisnis mengikuti spesifikasi assessment saat fitur tersebut dikerjakan.
- prisma/schema.prisma dan prisma/models/*.prisma membentuk multi-file schema. prisma/migrations berisi seluruh forward migrations dan CHECK/composite FK tambahan; jangan mengubah migrasi yang sudah diterapkan.
- prisma/seeds berasal dari env, memakai Argon2id dan advisory lock akun bersama. Password tidak di-trim; role hanya OPERATOR/SUPERVISOR, user deleted tidak dipulihkan oleh seed.
- src/generated/prisma dihasilkan CLI Prisma 7; CLI, Client dan adapter memakai patch sama.
- tests/unit dan tests/integration dipertahankan. Strict TypeScript, noUncheckedIndexedAccess, exactOptionalPropertyTypes dan pemeriksaan library tetap aktif. Jangan mengekspos password/hash/session internals atau mencetak connection string.

## Verifikasi database terisolasi

Unit tests tidak memerlukan database. Integration tests memerlukan PostgreSQL/Redis nyata, database khusus berakhiran `_test` dan RUN_FOUNDATION_INTEGRATION=true. Siapkan file env verifikasi baru sendiri, bukan menyalin credential lokal ke repository.

```powershell
$env:BACKEND_ENV_FILE = (Resolve-Path 'env/.env.verification').Path
npm run verify:database
npm run db:seed
npm run db:seed
npm run test:integration
```

verify:database hanya untuk public schema kosong; ia menolak data/tabel existing dan tidak menghapusnya. Ia memeriksa deploy pertama dan deploy ulang tanpa perubahan schema/history. Suite integration fondasi mengharapkan tepat dua akun awal; fixture constraint rollback. Jangan menjalankannya pada database yang berisi data aplikasi. Pemeriksaan database tidak diulang pada tahap persiapan repository ini; lihat [testing.md](docs/testing.md) untuk bukti Task 2 dengan konteks proyek asal.

## File untuk repository

Pertahankan package-lock.json, source, tests, konfigurasi, template env dan **seluruh prisma/migrations**. .gitignore mengecualikan dependency, dist, cache, coverage, env lokal dan generated client. Metadata Git existing tidak diubah; staging/commit/remote/push dilakukan manual oleh pemilik proyek.

Hasil pemeriksaan mandiri: [docs/verification.md](docs/verification.md).


## Dokumentasi mandiri dan instruksi agent

- [AGENTS.md](AGENTS.md): instruksi khusus scope repository ini; semua Git/GitHub hanya manual pengguna.
- [PRD](docs/prd.md) dan [mapping 87 requirement](docs/requirement-mapping.md).
- [Technical specification](docs/technical-spec.md), [workflow aktif](docs/ai-workflow.md), [testing/bukti](docs/testing.md).
- [API Markdown](docs/api-contract.md), [OpenAPI](docs/openapi.yaml), [sinkronisasi kontrak](docs/api-sync.md).
- [ERD](docs/erd.mmd) dan [data flow](docs/data-flow.mmd), sebagai desain backend atau boundary konsumen sesuai scope.
- [Dependency plan](docs/dependency-plan.md), [review keputusan](docs/spec-review.md), [provenance](docs/provenance.md), [arsip asli](docs/history/README.md).

API backend adalah sumber utama; frontend menyimpan salinan identik. Pemeriksaan dokumentasi lokal tanpa akses remote:

```powershell
python docs/validation/check-docs.py
```
