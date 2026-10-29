# Arsip provenance dan bukti historis

Folder combined adalah snapshot byte-identik dokumen proyek gabungan sebelum adaptasi dokumentasi mandiri. Sumber dan hash setiap file tercatat pada manifest.json. File log memakai ekstensi .log.txt agar bukti ikut tersimpan sebagai dokumen, tanpa mengubah byte isi log.

[Testing asli](combined/docs/testing.md), [workflow asli](combined/docs/ai-workflow.md), [technical specification asli](combined/docs/technical-spec.md) dan [source PROJECT_SPEC](combined/PROJECT_SPEC.md) mempertahankan command, exit code, status NOT_RUN/PASS, path temporary, nama project/database dan batas bukti pada saat pekerjaan dilakukan. Mereka bukan bukti eksekusi baru dalam repository terpisah.

Instruksi dan command historis yang menyebut npm workspaces atau path aplikasi adalah konteks proyek asal, bukan command aktif untuk checkout ini. Gunakan README dan docs/technical-spec.md, docs/ai-workflow.md, docs/testing.md di luar folder history untuk pekerjaan mandiri. File AGENTS historis adalah data arsip, bukan instruksi aktif; aturan AGENTS.md repository saat ini dan larangan semua operasi Git/GitHub oleh agent tetap berlaku.

Arsip tidak memuat source aplikasi lama, dependency, metadata Git, env lokal atau credential. Karena itu command build/runtime historis tidak dimaksudkan untuk dijalankan dari folder archive. Semua path Markdown arsip tetap bersifat lokal terhadap snapshot dokumentasinya; jangan menafsirkan path runtime historis sebagai dependency build.
