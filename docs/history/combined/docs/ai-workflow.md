# AI Workflow

> Sumber: [PROJECT_SPEC.md](../PROJECT_SPEC.md). Fondasi Task 2 telah diimplementasikan; autentikasi dan fitur bisnis belum tersedia. Status per pemeriksaan ada di docs/testing.md (relatif terhadap root proyek).

Dokumen ini berisi rencana penggunaan Codex serta catatan pekerjaan aktual. Pisahkan keduanya.

## Tujuan

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

## Task 1 — Review spesifikasi dan buat rencana

Status: **COMPLETED** untuk review/rencana/OpenAPI; validasi dokumentasi **PASS**. Implementasi dan pengujian aplikasi **NOT_RUN**.

```text
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
```

## Task 2 — Scaffold dan database

Status: **COMPLETED** untuk fondasi Task 2. Verifikasi: lihat bukti aktual Task 2 di testing.md. Auth/endpoint bisnis tetap NOT_RUN.

```text
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
```

## Task 2A — Fondasi UI

Status: **COMPLETED**. Scope tambahan eksplisit pengguna: Tailwind CSS v4 dan HeroUI v3 pada frontend existing. Bukan implementasi halaman fitur bisnis.

- [x] Evaluasi versi React/ReactDOM 19.3.1 dan Vite 7.3.7 terhadap peer resmi HeroUI/Tailwind; mempertahankan npm 11.6.2 dan workspaces.
- [x] Pasang exact @heroui/react/styles 3.2.6 dan tailwindcss/@tailwindcss/vite 4.3.3 di frontend; simpan lockfile dan metadata versi.
- [x] Tambahkan plugin Tailwind pada Vite; stylesheet global di src/styles memuat Tailwind lebih dahulu, HeroUI setelahnya.
- [x] Gunakan Card compound dan Button API v3 untuk demo minimal pada FoundationPage; pertahankan router/providers dan QueryClient.
- [x] Catat pengecualian exactOptionalPropertyTypes false hanya frontend setelah konflik deklarasi React Aria; strict dan library checking tetap aktif, backend/root compiler tidak diubah.
- [x] Lint/typecheck/build frontend dan npm ls lulus; periksa UI production di Chrome headless desktop/mobile, utility CSS, tombol enabled/disabled, onPress, dan router fallback.
- [x] Simpan screenshot serta hasil browser di docs/evidence; tambahkan bukti Task 2A ke testing.md tanpa menimpa Task 2.

Execution log: 2026-10-29 (Asia/Jakarta), Codex/PowerShell. Input: AGENTS.md, dokumen arsitektur/requirement/kontrak/testing dan dependency plan. File aplikasi berubah: frontend/package.json, frontend/vite.config.ts, frontend/tsconfig.json, frontend/src/styles/global.css, frontend/src/pages/FoundationPage.tsx, package-lock.json. Dokumen berubah: technical-spec, dependency-plan, dependency-versions, workflow/testing dan README; evidence browser ditambahkan. PROJECT_SPEC.md tidak diubah. Tidak ada commit Git dibuat. Pengujian keyboard lengkap, audit aksesibilitas, browser lain, dan flow bisnis tetap NOT_RUN. Task 3 tetap belum dimulai.

## Persiapan dua repository mandiri sebelum Task 3

Status: **COMPLETED**, 2026-10-29 (Asia/Jakarta). Tugas tambahan pengguna ini tidak menjalankan Task 3.

- [x] Audit dependency workspace, konfigurasi TypeScript/ESLint dan binary/toolchain yang diwarisi root.
- [x] Tambahkan deklarasi dependency dev, packageManager/engines, npm/node config dan lockfile mandiri pada kedua folder.
- [x] Hilangkan extends TypeScript ke parent dan sediakan ESLint lokal; pertahankan strict dan pengecualian UI yang telah dicatat.
- [x] Pisahkan Prisma offline codegen/validate dari konfigurasi migration/seed/runtime; typecheck/build otomatis menghasilkan client.
- [x] Sediakan README dan docs verifikasi lokal, Compose backend serta ignore rules yang mempertahankan templates, lockfile, source, tests dan seluruh migrations.
- [x] Verifikasi npm ci/lint/typecheck/build dan dependency tree pada dua salinan temporary di luar source tree, tanpa parent workspace atau credential.
- [x] Pertahankan proyek sumber, dokumen, migration bytes dan metadata Git existing; tidak ada perintah Git atau operasi database/volume.

Execution log: Codex/PowerShell, input AGENTS dan dokumen spesifikasi/config existing. File utama: backend/frontend package.json+package-lock, local tool configs, README/docs, ignore rules; backend prisma.generate.config.ts dan script hint; root lockfile serta catatan dokumentasi. Verifier: docs/validation/verify-standalone.py. Hasil aktual ada pada testing.md dan docs/evidence/standalone/results.json. Satu percobaan helper terhenti karena encoding output Windows; diperbaiki dan diulang penuh. Seluruh Git staging/commit/remote/push diserahkan kepada pengguna. Task 3 belum dimulai.

## Task 3 — Session, CSRF, authorization, rate limiting

Status: **PLANNED**; verifikasi: **NOT_RUN**.

```text
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
```

## Task 4 — Core receiving backend

Status: **PLANNED**; verifikasi: **NOT_RUN**.

```text
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
```

## Task 5 — User management

Status: **PLANNED**; verifikasi: **NOT_RUN**.

```text
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
```

## Task 6 — Frontend

Status: **PLANNED**; verifikasi: **NOT_RUN**.

```text
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
```

## Task 7 — Deployment dan final review

Status: **PLANNED**; verifikasi: **NOT_RUN**.

```text
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
```

## Execution log template

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

Prompt Task 1 telah digunakan untuk review dokumentasi. Prompt Task 2 telah digunakan untuk scaffold/database; prompts Task 3-7 tetap PLANNED sampai benar-benar dijalankan.

## Cara menjalankannya dengan Codex

Mulai dengan Task 1 dari docs/ai-workflow.md. Setelah hasilnya kamu review, lanjutkan task berikutnya satu per satu.

Untuk setiap tahap, minta Codex mengembalikan:

1. Requirement yang diselesaikan.
2. File yang berubah.
3. Keputusan penting.
4. Perintah verifikasi yang dijalankan.
5. Hasil aktual.
6. Keterbatasan atau blocker.

Dengan susunan ini, Codex mendapat aturan bisnis, kontrak data, batas arsitektur, perilaku keamanan, serta kriteria pengujian yang konkret sebelum mulai menulis aplikasi.

## Hasil aktual Task 1 (2026-10-29)

- [Mapping 87 requirement](requirement-mapping.md): satu ID per baris, modul dan rencana verifikasi; semua pemeriksaan implementasi NOT_RUN.
- [Review konsistensi](spec-review.md): hak akses, database, session/CSRF, kontrak, concurrency, idempotency, frontend/testing, diagram dan register pertanyaan.
- [Rencana dependency](dependency-plan.md): keluarga versi dengan irisan engine/peer dari dokumentasi resmi, patch exact ditetapkan saat scaffolding.
- [OpenAPI 3.0.3](openapi.yaml): 20 operasi/15 path, 22 schema; seluruh endpoint Markdown, safe DTO, strict request nested, error, cookie alternatif, CSRF, idempotency dan 204.
- [Bukti verifikasi](testing.md#bukti-aktual-task-1): command dan output aktual; tidak ada endpoint atau dependency aplikasi dibuat.

## Checklist implementasi berurutan

Checklist ini merinci Task 2-7. Langkah 1-4 telah diselesaikan pada Task 2; langkah fitur berikutnya masih direncanakan.

1. [x] Task 2: pilih/pin patch Node/npm, Prisma CLI/Client/adapter yang sama dan dependency sesuai dependency-plan; catat engine/peer dan hasil npm ls, buat workspaces/lockfile, strict TypeScript/ESM dan lint.
2. [x] Buat struktur backend/frontend yang ditentukan; pisahkan app.ts/server.ts; config env tervalidasi; jangan membuat abstractions kosong.
3. [x] Definisikan tujuh model multi-file, enum, default, UUID/timestamptz, index, UNIQUE, CHECK dan composite FK RESTRICT. Buat forward migration dan client custom output.
4. [x] Seed akun dari env tanpa mengganti password akun existing. Validasi required secrets, Prisma validate/generate dan migrasi database kosong/ulang; periksa constraint SQL aktual. Sediakan Prisma/Redis clients dan health/readiness.
5. [ ] Task 3: sesi Redis/cookie local+HTTPS, bootstrap anonymous dan CSRF stabil, login regeneration+save, idle/absolute TTL/touch, logout destroy+clear. anonymousCreatedAt tidak diteruskan sebagai clock authenticated.
6. [ ] Implementasikan authVersion/user reload, authorization, request ID, safe errors/log redaction, JSON 64 KiB, trusted Origin/Referer, Redis global/login/user rate limits dan controlled 503 tanpa fallback. Tutup risiko tipe csrf-sync pada Express 5 dengan typecheck nyata.
7. [ ] Jalankan integration security dengan PostgreSQL/Redis nyata: fixation, token lama, timeout, logout, revocation, dua API shared limiter, store outage, cookie dan secret-free logs. Catat hasil aktual.
8. [ ] Sebelum endpoint produk/user/receiving: tetapkan technical error codes/precedence yang belum dirinci (R-10), unit panjang teks non-password (R-11), lalu selaraskan kontrak dan OpenAPI. Jangan mengarang keputusan stakeholder.
9. [ ] Task 4: create/list/detail produk; product+balance nol atomik. Create/list/detail receiving, snapshot konsisten (R-13), expected immutable; kedua role sesuai matrix.
10. [ ] Implementasikan receiving READ COMMITTED: canonical hash, parent lock sebelum idempotency, replay sebelum completed check, lock item, seluruh validasi sebelum write, transaction-scoped repositories, ledger/counters/balance/status atomik, deterministic product order, response setelah commit.
11. [ ] Jalankan receiving integration/reconciliation: 40+60, over-receipt, cross-document item, multi-item rollback, same-key concurrency, distinct 7+7/4+6, dua receiving satu produk, late DB failure setelah write. Frontend stock mutation dilarang dilanjutkan sebelum suite ini PASS.
12. [ ] Task 5: user CRUD terbatas supervisor; advisory lock bersama, actor recheck, last active supervisor, self restrictions, unique email deleted, authVersion dan repeat delete 204. Jalankan authorization/session-revocation/concurrent supervisor tests.
13. [ ] Task 6: router/provider/feature modules, trusted API HTTP client credentials+CSRF, query keys, useQuery/useMutation untuk seluruh read/mutation termasuk login/logout; state loading/empty/validation/pending/error.
14. [ ] Implementasikan receipt pending key+payload sessionStorage per actor/receiving, retry false, same-key recovery setelah response hilang/reload/reauth, cache isolation, targeted invalidation dan refetch error terpisah dari receipt success. Tidak optimistic stock increment.
15. [ ] Jalankan component/browser flows dengan disposable accounts/data, termasuk committed receipt yang responsenya sengaja hilang dan replay setelah reauthentication; validasi operator UI dan backend rejection.
16. [ ] Task 7: Dockerfile/build generate Prisma, PostgreSQL/Redis health, satu migration/seed job sebelum API, nginx gateway, env/HTTPS/proxy, graceful shutdown. Jalankan clean Compose dan readiness, restart session persistence, migration ulang aman.
17. [ ] Jalankan lint/typecheck, Prisma validate/generate, unit/integration/component/browser, production builds dan clean deployment. Bandingkan hasil dengan seluruh 87 baris mapping dan API contract; perbarui testing.md/README/version record dengan evidence, keterbatasan dan NOT_RUN tersisa.

## Execution log ? Task 1

- Task: review spesifikasi, mapping, checklist, dependency plan dan OpenAPI.
- Date: 2026-10-29 (Asia/Jakarta).
- Agent/interface: Codex melalui IDE/PowerShell.
- Input documents: AGENTS.md, README.md, seluruh tujuh dokumen awal docs/, PROJECT_SPEC.md.
- Instruction: instruksi Task 1 dan permintaan pengguna; dokumentasi saja, tanpa dependency aplikasi.
- Changed files: docs/requirement-mapping.md, docs/spec-review.md, docs/dependency-plan.md, docs/openapi.yaml, docs/validation/*; docs/ai-workflow.md, docs/technical-spec.md, docs/api-contract.md, docs/testing.md, README.md diselaraskan.
- Important decisions: gunakan PRD untuk intent, batas API eksplisit, normalisasi sebelum validasi SKU, tidak menyamakan schema validation dengan bukti transaksi, pertahankan scope dan open questions tanpa keputusan stakeholder baru.
- Commands executed / observed results: lihat bukti aktual Task 1 di testing.md, termasuk kegagalan validator awal dan hasil perbaikan.
- Remaining issues: R-10/R-11/R-13 dan gate compatibility runtime pada spec-review.md; seluruh pengujian aplikasi/deployment dan render Mermaid NOT_RUN.
- Related Git commit: tidak dibuat.
- Status: COMPLETED untuk Task 1; Task 2 belum dijalankan.

## Execution log Task 2 - scaffold dan database

- Date: 2026-10-29 (Asia/Jakarta).
- Inputs: AGENTS.md, PRD, technical-spec, ERD, API Markdown/OpenAPI, data-flow, testing, spec-review dan dependency-plan.
- Implemented: root workspaces/strict TypeScript/ESLint/lockfile; backend app/server, environment validation, Prisma/Redis clients, health/readiness, lifecycle; frontend router/providers/QueryClient; model multi-file, initial migration, seed dan local Compose PostgreSQL/Redis.
- Changed paths: package.json/package-lock.json, root configs, backend/, frontend/, compose.yaml; README dan dokumen evidence/version/checklist yang terkait.
- Decisions: R-10/R-11/R-13 belum memerlukan keputusan kontrak pada fondasi; tidak membuat endpoint bisnis. Seed name memakai kapasitas varchar PostgreSQL dan password code point sesuai sumber. Advisory lock account invariant bernilai 735910001, diekspor untuk dipakai ulang Task 5. Client Prisma/adapter/CLI dipin ke patch sama.
- Dependency adjustment: npm 10.4.0 dan 10.9.8 gagal di Arborist optional-peer resolution (edgesOut). npm 11.6.2 berhasil install/ci; global npm tidak diganti. Compose host v5.5.1 dapat memvalidasi/menjalankan konfigurasi yang memakai Compose Specification, sehingga tidak menurunkan host ke v2.
- Verification: lint/typecheck, build backend+frontend, Prisma validate/generate, empty migration + unchanged second deploy, seed twice + preservation with changed seed input, health/readiness real dependencies dan shutdown path. Hasil/command aktual ada di testing.md.
- Safety: project/database/volume verifikasi baru, nama database _test dan port terpisah, tidak menghapus database/volume lama. Secrets hanya di env yang diabaikan Git, tidak dicetak dalam evidence.
- Not executed: pengiriman signal OS yang terkonfirmasi pada PTY Windows, browser/component tests, session/CSRF/limiter/business tests, full Docker API/web build/deployment; tetap NOT_RUN.
- Git commit: tidak dibuat.
- Status: Task 2 COMPLETED. Task 3 belum dimulai; tidak ada blocker infrastruktur yang tersisa untuk memulainya. Kompatibilitas tipe csrf-sync/Express 5 dan perilaku Redis session/limiter menjadi gate aktual Task 3.
