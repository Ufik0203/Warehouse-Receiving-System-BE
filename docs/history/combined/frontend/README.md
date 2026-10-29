# Warehouse Receiving System — Frontend

Repository frontend mandiri: Node.js 24.12.0, npm 11.6.2, React/ReactDOM 19.3.1, Vite 7, TypeScript strict, React Router, TanStack Query v5, Tailwind CSS v4 dan HeroUI v3. Halaman `/` hanya contoh fondasi UI Task 2A; halaman bisnis dan Task 3 belum dikerjakan.

Folder ini dapat menjadi root repository tersendiri. Instalasi/build tidak memerlukan file konfigurasi, package.json, dependency atau lockfile dari folder induk/backend. Dokumentasi assessment lengkap tetap dipertahankan dalam proyek sumber; README ini memuat seluruh instruksi yang diperlukan untuk fondasi frontend mandiri.

## Install dan verifikasi

Jalankan dari root repository frontend:

```powershell
npx --yes --offline=false --package=npm@11.6.2 npm ci --offline=false
npm run lint
npm run typecheck
npm run build
npm run preview
```

Jika npm 11.6.2 sudah tersedia, gunakan `npm ci` langsung. package-lock.json milik frontend mengunci dependency mandiri. Tidak memakai flag `-w frontend` pada repository terpisah. Build tidak memerlukan backend, database atau file env lokal.

## Development dan konfigurasi API

```powershell
npm run dev
```

Buka http://localhost:5173. Template `.env.example` berisi `VITE_API_BASE_URL=/api/v1`; nilai ini juga menjadi default saat file env belum ada. Bila perlu, salin template menjadi `.env`. Jangan menaruh credential, DATABASE_URL atau session secret pada environment publik browser.

Vite mem-proxy `/api` dan `/health` ke http://localhost:3000 pada backend terpisah yang dijalankan sendiri. Ini dependency jaringan saat fitur API dijalankan, bukan dependency file/build. Halaman contoh saat ini hanya state lokal dan tidak memanggil API. Vite preview hanya untuk melihat build statis; proxy development bukan deployment API production.

## Struktur dan keputusan UI

- src/main.tsx memuat CSS global, Providers dan AppRouter.
- src/app/router.tsx mempertahankan BrowserRouter dan fallback route. src/app/providers.tsx mempertahankan QueryClientProvider; server reads/mutations mendatang tetap useQuery/useMutation.
- src/styles/global.css mengimpor Tailwind terlebih dahulu, kemudian @heroui/styles. Vite memakai @tailwindcss/vite, bukan setup Tailwind v3 atau plugin HeroUI v2.
- Card compound dan Button memakai API HeroUI v3. HeroUIProvider/Framer Motion tidak dibutuhkan untuk setup ini.
- TypeScript strict dan noUncheckedIndexedAccess aktif, skipLibCheck false. exactOptionalPropertyTypes false hanya frontend karena konflik tipe React Aria yang ditemukan pada Task 2A; optional properties dapat menerima undefined eksplisit. Backend tidak memakai pengecualian ini.
- Semua dependency development, termasuk TypeScript, tipe Node dan ESLint, dinyatakan langsung dalam package.json frontend. ESLint dan tsconfig lokal tidak mewarisi konfigurasi induk.

## Batas verifikasi

Lint/typecheck/build mandiri diperiksa pada tahap persiapan repository. Smoke browser desktop/mobile untuk UI yang sama telah dijalankan pada Task 2A di proyek sumber; audit aksesibilitas lengkap, browser lain dan alur bisnis tetap NOT_RUN. Tidak ada implementasi autentikasi, receiving, stok atau user management pada tahap ini.

## File untuk repository

Pertahankan source, tests bila ditambahkan, package-lock.json, konfigurasi dan `.env.example`. .gitignore mengecualikan node_modules, dist, cache, laporan tes dan env lokal. Seluruh staging/commit/remote/push dilakukan manual oleh pemilik proyek; metadata Git tidak diubah oleh pekerjaan persiapan ini.

Hasil pemeriksaan mandiri: [docs/verification.md](docs/verification.md).
