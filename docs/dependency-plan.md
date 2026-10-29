# Dependency repository backend

Manifest dan package-lock.json repository ini menjadi sumber versi terpasang, tanpa dependency dari manifest induk. Node 24.12.0 dan npm 11.6.2 dipertahankan; install memakai npm 11.6.2. [Versi machine-readable](dependency-versions.json) dan [alasan/pengujian dependency asal](history/combined/docs/dependency-plan.md) disertakan lokal.

| Paket | Versi exact | Jenis |
| --- | --- | --- |
| @prisma/adapter-pg | 7.10.1 | dependencies |
| argon2 | 0.44.0 | dependencies |
| dotenv | 17.4.2 | dependencies |
| express | 5.3.0 | dependencies |
| pg | 8.23.1 | dependencies |
| redis | 5.12.1 | dependencies |
| zod | 4.6.7 | dependencies |
| @prisma/client | 7.10.1 | dependencies |
| prisma | 7.10.1 | devDependencies |
| @types/express | 5.0.6 | devDependencies |
| @types/pg | 8.23.1 | devDependencies |
| @types/supertest | 6.0.3 | devDependencies |
| supertest | 7.3.1 | devDependencies |
| tsx | 4.23.15 | devDependencies |
| vitest | 4.1.12 | devDependencies |
| typescript | 5.9.3 | devDependencies |
| @types/node | 24.19.2 | devDependencies |
| eslint | 9.39.5 | devDependencies |
| @eslint/js | 9.39.5 | devDependencies |
| typescript-eslint | 8.72.1 | devDependencies |

Dependency dev yang semula diwarisi root telah dinyatakan langsung. Lockfile ini menyelesaikan transitive dependencies secara mandiri dan tidak boleh diganti dengan lockfile gabungan. Perubahan versi selanjutnya perlu cek engine/peer dan bukti aktual. Tidak memakai force/legacy-peer-deps atau mengubah baseline tanpa alasan.

Prisma CLI/Client/adapter memakai patch 7.10.1 yang sama. Session/CSRF/limiter telah dipasang dan diuji pada Task 3; lihat tambahan di bawah. Native Argon2 Windows pernah diuji dalam konteks Task 2; native Linux masih NOT_RUN.

Pengujian historis tidak diulang pada pekerjaan dokumentasi ini. Lihat [testing.md](testing.md); semua Git/GitHub manual pengguna.


## Dependency Task 3

| Paket | Exact |
| --- | --- |
| express-session | 1.19.0 |
| connect-redis | 9.0.0 |
| csrf-sync | 4.2.1 |
| express-rate-limit | 8.7.1 |
| rate-limit-redis | 4.2.2 |
| @types/express-session (dev) | 1.18.2 |

Engine dan peer versi terpasang kompatibel dengan Node 24, Express 5 dan Redis client 5; strict TypeScript dengan skipLibCheck=false lulus. npm 11.6.2 dan lockfile lokal dipertahankan. Tidak memakai force atau legacy-peer-deps.

Rencana express-rate-limit 8.1.0 diperbarui menjadi 8.7.1 karena audit menemukan advisory bypass IPv4-mapped IPv6 serta dependency ip-address; audit install akhir: 0 vulnerabilities. Detail API diverifikasi melalui deklarasi tipe paket terpasang dan dokumentasi resmi [Express session](https://expressjs.com/en/resources/middleware/session.html), [rate-limit](https://express-rate-limit.mintlify.app/reference/configuration), dan [Redis store](https://redis.io/learn/develop/node/nodecrashcourse/sessionstorage). Kebijakan cookie/TTL/CSRF tetap mengikuti PRD dan kontrak lokal.
