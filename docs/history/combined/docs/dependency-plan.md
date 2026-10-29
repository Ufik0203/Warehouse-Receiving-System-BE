# Rencana dependency dan kompatibilitas

Review dokumentasi resmi: 2026-10-29, Asia/Jakarta. Ini rencana keluarga versi, bukan daftar versi yang sudah diinstal atau bukti build. Patch final dipilih pada Task 2 sesuai technical specification, dikunci persis di manifest/lockfile, lalu dicatat di sini. Jangan memakai `latest` tanpa batas major. Kompatibilitas dokumenter berarti engine/peer/API yang disebut sumber mendukung kombinasi; instalasi, typecheck, native binary dan runtime masih **NOT_RUN**.

| Komponen | Rencana versi | Dasar resmi dan gate implementasi |
| --- | --- | --- |
| Node.js / npm | Node 24.x; npm 10.x sebagai kandidat yang tersedia | Baseline sumber tetap Node 24. Host teramati 24.12.0/npm 10.4.0; itu bukan klaim patch terbaru. Pin patch Node 24 yang didukung dan npm exact saat scaffolding. [Node releases](https://nodejs.org/en/about/previous-releases), [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces). |
| TypeScript | 5.9.x; strict | Prisma 7 merekomendasikan TS 5.9; Zod 4 menguji TS >=5.5. Pakai satu versi compiler lintas workspace. [Prisma 7 upgrade](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [Zod requirements](https://zod.dev/#requirements). |
| Prisma CLI, Client, adapter | `prisma`, `@prisma/client`, `@prisma/adapter-pg`: satu patch 7.x yang sama | Tetap major 7 walaupun dokumentasi tanpa versi dapat mengarah ke 8. ESM, generator prisma-client, custom output, explicit env loading, driver adapter, generate dan seed eksplisit diperlukan. [Upgrade 7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7), [v7 drivers](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers). |
| PostgreSQL / pg | PostgreSQL 17.x, `pg` 8.x | Tetap PostgreSQL 17 dari sumber; adapter PostgreSQL memakai node-postgres. Pilih patch dan cek metadata adapter yang benar-benar dipin sebelum install. [Prisma v7 supported databases](https://www.prisma.io/docs/orm/v7/reference/supported-databases), [Prisma v7 PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql), [node-postgres](https://node-postgres.com/), [PostgreSQL maintenance](https://www.postgresql.org/support/versioning/). |
| Express / types | Express 5.x, `@types/express` 5.x, `@types/node` 24.x | Ikuti API Express 5 dan tipe runtime Node yang dipakai; jangan menarik types Express 4 sebagai tipe aplikasi. [Express 5 API](https://expressjs.com/en/5x/api/). |
| Redis client / server | `redis` 5.x, kandidat Redis server 8.x | Client 5.9.0 menyatakan Node >=18; periksa dukungan patch server/client sebelum pin image. Server exact dan image digest dipilih Task 2. [Client metadata 5.9.0](https://raw.githubusercontent.com/redis/node-redis/redis@5.9.0/packages/redis/package.json), [official client guide](https://redis.io/docs/latest/develop/clients/nodejs/). |
| Session | `express-session` 1.x, `connect-redis` 9.x | connect-redis 9.0.0: Node >=18, redis >=5, express-session >=1. Pasangan ini menerima Node 24 dan client redis 5. Konfigurasi TTL/touch tetap harus diuji untuk idle/absolute lifetime. [connect-redis 9 metadata](https://raw.githubusercontent.com/tj/connect-redis/v9.0.0/package.json), [session docs](https://expressjs.com/en/resources/middleware/session/). |
| CSRF | `csrf-sync` 4.2.1 sebagai kandidat | ESM/CJS exports tersedia dan pola synchronizer cocok dengan desain. Metadata pengembang memakai types Express 4; ini bukan bukti kompatibilitas tipe Express 5. Gate Task 3: typecheck middleware pada Express 5, bootstrap/regenerate/token invalidation integration tests. Jangan menambahkan suppression. [Official package metadata](https://raw.githubusercontent.com/Psifi-Solutions/csrf-sync/master/package.json), [official usage](https://github.com/Psifi-Solutions/csrf-sync). |
| Rate limiting | `express-rate-limit` 8.x + `rate-limit-redis` 4.2.2 sebagai kandidat | Limiter 8.1.0 peer Express >=4.11; Redis store 4.2.2 peer limiter >=6; Node >=16. Gunakan sendCommand dari client redis dan prefix terpisah. Tetapkan `passOnStoreError: false`, error handler memetakan gangguan store ke 503. [Limiter metadata](https://raw.githubusercontent.com/express-rate-limit/express-rate-limit/v8.1.0/package.json), [store metadata](https://raw.githubusercontent.com/express-rate-limit/rate-limit-redis/v4.2.2/package.json), [fail-closed configuration](https://express-rate-limit.mintlify.app/reference/configuration#passonstoreerror). |
| Password | `argon2` 0.44.x sebagai kandidat | Argon2id tersedia; native binary/build di Windows dan image Linux Node 24 wajib diverifikasi, bukan diasumsikan dari engine saja. Tetap memoryCost 19456, timeCost 2, parallelism 1. [Official implementation](https://github.com/ranisalt/node-argon2), [0.44.0 metadata](https://raw.githubusercontent.com/ranisalt/node-argon2/v0.44.0/package.json). |
| Validation | Zod 4.x | Mendukung TS >=5.5 dengan strict. Refinement terpisah diperlukan untuk Unicode code point dan uniqueness per ID; object strict untuk semua nested request. [Zod](https://zod.dev/). |
| React / ReactDOM / types | 19.x dengan pasangan patch React/ReactDOM yang sama; types 19.x | Router 7 peer React/ReactDOM >=18; Query v5 mendukung React >=18. React 19 berada dalam irisan itu. [Router 7 metadata](https://raw.githubusercontent.com/remix-run/react-router/react-router@7.9.5/packages/react-router/package.json), [Query installation](https://tanstack.com/query/v5/docs/framework/react/installation). |
| Routing | React Router 7.x, mode declarative SPA | Tidak memerlukan framework server atau actions yang menggantikan useMutation. Cek API versi 7 saat scaffolding, karena latest docs dapat berpindah major. [7.9.5 metadata](https://raw.githubusercontent.com/remix-run/react-router/react-router@7.9.5/packages/react-router/package.json). |
| Build frontend | Vite 7.x + `@vitejs/plugin-react` 5.x | Vite 7 butuh Node 20.19+/22.12+; Node 24 memenuhi. Plugin 5.1.0 peer Vite termasuk ^7.0.0 dan engine menerima Node >=22.12. [Vite 7 guide](https://v7.vite.dev/guide/), [plugin metadata](https://raw.githubusercontent.com/vitejs/vite-plugin-react/plugin-react@5.1.0/packages/plugin-react/package.json). |
| Server state | `@tanstack/react-query` 5.x | Tetap useQuery/useMutation, centralized keys, targeted invalidation dan retry false untuk receiving. [Official installation](https://tanstack.com/query/v5/docs/framework/react/installation). |
| Unit/integration tests | Vitest 4.x, Supertest 7.x | Vitest 4 butuh Vite >=6 dan Node >=20, sehingga Vite 7/Node 24 beririsan. Supertest dapat menguji Express app tanpa listener tetap. [Vitest 4](https://v4.vitest.dev/guide/), [Supertest](https://github.com/forwardemail/supertest). |
| Component tests | React Testing Library 16.x; DOM Testing Library 10.x; jsdom patch kompatibel Node 24 | Metadata RTL 16 mendukung React 18/19. Pilih jsdom sesuai engine dan verifikasi Vitest environment; belum ada install. [RTL 16 metadata](https://raw.githubusercontent.com/testing-library/react-testing-library/v16.3.0/package.json), [RTL documentation](https://testing-library.com/docs/react-testing-library/intro/). |
| Browser tests | `@playwright/test` 1.x | Pin package dan browser revision yang cocok, periksa OS host dan Linux image pada Task 6/7. [Playwright prerequisites](https://playwright.dev/docs/intro). |
| Lint | ESLint 9.x + typescript-eslint 8.x sebagai kandidat | Pin patch dengan peer TS 5.9/Node 24/ESLint 9 yang sesuai; jangan mengambil latest major otomatis. [Official supported dependencies](https://typescript-eslint.io/users/dependency-versions/). |
| Deployment | Docker Compose v2, nginx stable; PostgreSQL 17 dan Redis image dipin patch/digest | Compose sesuai baseline. Tidak mengubah arsitektur atau menambahkan deployment publik. Versi engine/Compose/nginx aktual dan clean-start baru dicatat saat dijalankan. [Compose docs](https://docs.docker.com/compose/intro/features-uses/), [nginx docs](https://nginx.org/en/docs/). |

## Gate Task 2

1. Periksa metadata versi yang akan dipin, engine/peer dependencies dan patch perbaikan keamanan dalam keluarga di atas. Catat exact versions, Node/npm dan image digest; rencana ini tidak menjanjikan bahwa patch contoh merupakan pilihan terbaru.
2. Buat manifest workspaces, pilih compatible patch Prisma CLI/Client/adapter yang sama, ESM dan TS strict. Hasilkan lockfile tanpa mengabaikan peer conflicts.
3. Verifikasi install bersih, `npm ls`, compiler, Prisma validate/generate, migrasi database kosong dan migrasi ulang. Semua langkah ini masih **NOT_RUN** pada Task 1.
4. Jangan menyatakan runtime session/CSRF/native Argon2 kompatibel sebelum smoke/integration checks. Ketidakpastian csrf-sync types adalah risiko integrasi Task 3, bukan alasan untuk mengganti library atau mengubah scope tanpa dasar.

Tidak ada dependency aplikasi yang diinstal pada Task 1. Alat Python validator OpenAPI diisolasi di folder sementara; bukan bagian npm workspaces atau runtime aplikasi.

## Versi dan kompatibilitas aktual Task 2

Tanggal verifikasi: 2026-10-29 (Asia/Jakarta). Manifest root/backend/frontend mengunci exact versions; dependency transitive dikunci package-lock.json. Daftar lengkap dependency langsung: [dependency-versions.json](dependency-versions.json).

| Komponen terpasang | Versi aktual |
| --- | --- |
| Runtime | Node 24.12.0 |
| npm untuk install/ci | 11.6.2, dijalankan melalui npx; npm global 10.4.0 tidak diubah |
| TypeScript | 5.9.3 |
| Prisma CLI / Client / adapter-pg | 7.10.1 / 7.10.1 / 7.10.1 |
| Express / pg / redis client / Zod | 5.3.0 / 8.23.1 / 5.12.1 / 4.6.7 |
| Argon2 / dotenv / tsx | 0.44.0 / 17.4.2 / 4.23.15 |
| React / ReactDOM / Router | 19.3.1 / 19.3.1 / 7.18.5 |
| TanStack Query / Vite / plugin-react | 5.105.0 / 7.3.7 / 5.2.0 |
| Vitest / Supertest | 4.1.12 / 7.3.1 |
| ESLint / typescript-eslint | 9.39.5 / 8.72.1 |
| Docker engine / Compose host | 29.8.0 / v5.5.1 |
| PostgreSQL / Redis server | 17.11 (Debian bookworm) / 8.2.11 |

Perubahan dari rencana npm 10: instalasi npm 10.4.0 dan percobaan npm 10.9.8 sama-sama gagal di @npmcli/arborist saat memuat peer set (`Cannot read properties of null (reading 'edgesOut')`). Tidak memakai legacy-peer-deps atau mengabaikan peer conflicts. npm 11.6.2 menyelesaikan install dan `npm ci`; metadata engine resminya `^20.17.0 || >=22.9.0` mencakup Node 24.12.0. packageManager dan engines repository diperbarui untuk npm 11; tidak ada update npm global.

Host sudah memiliki Compose v5.5.1. Konfigurasi mengikuti Compose Specification dan lulus `config -q` serta startup dua dependency. Tidak perlu menginstal/downgrade CLI ke v2 hanya untuk menyesuaikan label rencana. Full API/web deployment tetap Task 7.

Image yang sudah ditarik, dibaca versinya, lalu dipin di compose.yaml:

```text
postgres:17.11-bookworm@sha256:839fbb5a4942a7758dd93e18b42ea5649807491a0545b5eeeb8f0b8bb11857a5
redis:8.2.11-bookworm@sha256:99ffb973380cc2f47bca06bd094f7f8c7138a0879a63cb8939896a22b7a65bba
```

Kompatibilitas aktual yang telah dibuktikan: npm ci dan npm ls tanpa masalah peer, strict typecheck kedua workspace, Prisma validate/generate, build kedua aplikasi, hash/verify Argon2 native Windows melalui seed tests, koneksi adapter-pg/PostgreSQL serta client Redis, dan HTTP health/lifecycle. npm install/ci mengaudit 458 packages dengan 0 vulnerabilities pada saat command dijalankan. Ini bukan jaminan audit untuk rilis mendatang.

Peringatan nonfatal yang terlihat: ESLint 9.39.5 ditandai deprecated oleh registry, dan Rollup menghapus annotation komentar PURE dari dependency Zod 4.6.7 yang posisinya tidak dikenali. Command lint/build tetap exit 0; major versi dipertahankan sesuai rencana, tanpa suppression atau force install.

Belum diinstal/diuji: express-session/connect-redis/csrf-sync/limiter pada Task 3, frontend test libraries dan Playwright pada Task 6, serta native Linux Argon2/API Docker image pada Task 7. Tidak menyatakan kompatibilitas runtime bagian tersebut telah PASS.

## Task 2A — dependency fondasi UI

Tanggal: 2026-10-29 (Asia/Jakarta). Penambahan ini merupakan scope eksplisit pengguna, hanya workspace frontend. React dan React DOM telah dievaluasi sebelum instalasi; tidak perlu upgrade/downgrade karena versi existing 19.3.1 memenuhi peer >=19 HeroUI v3. Router 7.18.5, Query 5.105.0, types React/ReactDOM 19.3.0, Vite 7.3.7 dan plugin-react 5.2.0 tetap. npm 11.6.2 serta manifest/workspaces root dan dependency backend dipertahankan.

| Paket langsung | Versi final | Penempatan dan kompatibilitas |
| --- | --- | --- |
| @heroui/react | 3.2.6 | dependencies frontend; React/ReactDOM >=19, Tailwind >=4; API v3, termasuk public component subpaths. |
| @heroui/styles | 3.2.6 | dependencies frontend; stylesheet fondasi HeroUI v3, sesudah import Tailwind. |
| tailwindcss | 4.3.3 | devDependencies frontend; compiler CSS v4. |
| @tailwindcss/vite | 4.3.3 | devDependencies frontend; peer Vite ^5.2.0 atau ^6 atau ^7 atau ^8, sehingga menerima existing Vite 7.3.7. |

Versi exact ada di frontend/package.json, package-lock.json, dan dependency-versions.json. Metadata peer diperiksa dengan npm view menggunakan npm 11.6.2; npm ls frontend lengkap exit 0 tanpa problems. Instalasi final mengaudit 519 packages dan melaporkan 0 vulnerabilities saat dijalankan; bukan jaminan audit masa depan.

Kompatibilitas nyata lebih sempit daripada peer metadata: typecheck awal gagal pada React Aria Components 1.22.1 (GroupProps/OverlayArrowProps.id terhadap DOMProps) saat exactOptionalPropertyTypes true. Pin peer ke React Aria Components 1.21.1 / react-aria 3.52.1 dan percobaan HeroUI 3.0.5 dengan dependency bawaan juga tidak menyelesaikan GroupProps. Percobaan ini dibatalkan; manifest final tidak menyimpan dependency React Aria langsung. Penggantian kembali sempat ERESOLVE karena tree versi percobaan; uninstall/reinstall HeroUI menyelesaikan resolusi tanpa force atau legacy-peer-deps.

Keputusan final: gunakan HeroUI 3.2.6 dan konfigurasi frontend exactOptionalPropertyTypes false. strict true dan skipLibCheck false dipertahankan; baseline/backend tetap exactOptionalPropertyTypes true. Dampak optional undefined dan syarat evaluasi ulang dicatat pada technical-spec.md. Ini perubahan opsi typing frontend yang disengaja, bukan perubahan React/npm/workspace atau aturan bisnis.

Sumber resmi sesuai major/patch: [HeroUI 3.2.6 release](https://heroui.com/en/docs/react/releases/v3-2-6), [v3 installation/CSS order](https://heroui.com/en/docs/react/getting-started/quick-start), [v3 Vite tanpa provider](https://heroui.com/en/docs/react/getting-started/frameworks#vite), [Button v3](https://heroui.com/en/docs/react/components/button), [Card compound v3](https://heroui.com/en/docs/react/components/card), [Tailwind v4 Vite](https://tailwindcss.com/docs/installation/using-vite), [TypeScript optional-property option](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html).

Lint, typecheck dan production build frontend lulus. Chrome headless yang sudah terpasang dipakai untuk smoke desktop/mobile tanpa menambah dependency Playwright atau mengubah rencana browser suite bisnis Task 6. Bukti Task 2 tetap dipertahankan; bukti baru ada pada bagian Task 2A di testing.md.

## Dependency untuk dua repository mandiri

Backend dan frontend sekarang mendeklarasikan sendiri TypeScript 5.9.3, @types/node 24.19.2, ESLint/@eslint/js 9.39.5 dan typescript-eslint 8.72.1, yang sebelumnya hanya dideklarasikan root workspace. Versi Node/npm tetap 24.12.0/11.6.2. Dependency langsung lainnya tidak diubah; lihat manifest lokal dan dependency-versions.json yang diperbarui.

backend/package-lock.json dan frontend/package-lock.json dibuat menggunakan npm 11.6.2 dalam folder temporary independen, tanpa workspace/file link. Keduanya lulus npm ci dan dependency-tree check. Masing-masing lockfile mengunci transitive dependencies sesuai repository sendiri; tidak harus identik dengan hasil deduplikasi lockfile gabungan root. Root lockfile tetap dipertahankan dan diselaraskan, bukan dipakai sebagai dependency repository mandiri.

Tidak menginstal ulang aplikasi pada folder sumber atau mengubah metadata Git. Instalasi verifikasi dilakukan pada salinan tanpa node_modules/hasil build/env lokal/generated client, lalu lockfile hasilnya disalin ke folder repository sumber masing-masing. Seluruh tindakan Git diserahkan kepada pengguna; Task 3 belum dimulai.
