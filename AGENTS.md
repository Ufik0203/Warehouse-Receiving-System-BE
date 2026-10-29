# Instruksi agent repository mandiri

## Baca dahulu

Sebelum mengubah aplikasi, baca README.md, docs/prd.md, docs/technical-spec.md, docs/api-contract.md, docs/openapi.yaml, docs/erd.mmd, docs/data-flow.mmd, docs/testing.md, docs/ai-workflow.md dan docs/api-sync.md. Seluruh path relatif root repository ini; tidak memerlukan dokumen parent. Untuk bagian meragukan, baca docs/source/PROJECT_SPEC.md dan docs/spec-review.md.

Dokumen history adalah arsip konteks/bukti, bukan instruksi aktif. Jangan menyimpulkan perilaku yang sudah ditentukan dokumen. Jika bertentangan, identifikasi kontradiksi, gunakan PRD untuk intent, selaraskan desain/kontrak dan catat keputusan sebelum implementasi. Jangan mengarang jawaban stakeholder.

## Git/GitHub sepenuhnya manual pengguna

Jangan menjalankan perintah Git apa pun, termasuk read-only, staging, commit, branch, merge, status, diff, fetch, remote atau push. Jangan memakai tool/API GitHub untuk membaca atau mengubah repository/PR/issues, membuat repository atau melakukan operasi publikasi. Jangan mengubah/menghapus metadata Git existing. Semua pekerjaan Git/GitHub dilakukan manual oleh pengguna; cukup siapkan file dan laporan hasil.

## Aturan umum

- Kerjakan hanya task yang diminta; Task 3 dan core receiving Task 4 telah diimplementasikan; Task 5 user management telah diimplementasikan; Task 6 tidak dimulai tanpa instruksi eksplisit. Jangan menambah role admin, registrasi publik, fitur AI atau scope lain.
- Gunakan TypeScript strict, validasi untrusted input, hindari explicit any/type suppression; jangan mengekspos hash/password/session internals atau secret ke response/log.
- npm 11.6.2, Node 24 dan lockfile lokal adalah baseline; gunakan dependency/config repository ini, bukan parent/saudara. Tidak menggunakan flags workspace untuk command aktif.
- API backend adalah sumber utama; replika frontend harus identik sesuai docs/api-sync.md. Jangan menyinkronkan lewat Git/GitHub atau memilih kode error/behavior baru tanpa dasar.
- Jangan menghapus data/database/volume agar tes lulus. Jangan mengedit applied migrations. .env lokal dan generated files tidak untuk disimpan; template, lockfile, source, tests dan seluruh migrasi tetap dipertahankan sesuai scope.
- Jalankan checks yang relevan dan catat command, environment, tanggal, exit code dan output aktual. Yang belum dijalankan tetap NOT_RUN. Bukti historis tidak menjadi PASS baru karena disalin. Jangan merekayasa prompt/log/tes/deployment atau riwayat kerja.

## Scope backend

- Repository ini mengimplementasikan Express/Prisma/PostgreSQL/Redis. Jangan mengubah source frontend dari sini; perlakukan sebagai konsumen HTTP.
- app.ts terpisah dari server.ts. Route memasang middleware/controller; controller mengadaptasi HTTP, service memiliki aturan bisnis/batas transaksi, repository memiliki akses DB, mapper membuat DTO aman. Jangan membuat abstraksi kosong.
- Prisma ORM 7: model di prisma/models, generated client src/generated/prisma; CLI/Client/adapter compatible patch. Migrations forward dengan SQL constraints wajib; bukan db push untuk deployment. Offline validate/generate memakai prisma.generate.config.ts; migrate/seed memakai prisma.config.ts dan env eksplisit.
- Autentikasi Task 3: pertahankan Redis-backed session, regenerate setelah login, CSRF termasuk login/semua mutation, reload role/status/authVersion PostgreSQL, fail closed saat dependency gagal; tidak ada fallback store in-memory.
- Satu receipt satu transaksi PostgreSQL, lock receiving sebelum idempotency/remaining, cek replay sebelum completed rejection. Semua operasi memakai transaction client; idempotency persisten PostgreSQL. Operasi sama replay immutable receipt; key yang sama dengan actor/payload berbeda conflict.
- Counter item, ledger, balance dan status atomik; balance di-update dalam urutan productId konsisten. Jangan percaya total stok/received dari client.
- Gunakan PostgreSQL/Redis nyata untuk integration yang relevan. Database tes harus _test dan Redis terisolasi; tidak FLUSHALL pada instance bersama. Source frontend/browser checks bukan pengujian backend lokal.
