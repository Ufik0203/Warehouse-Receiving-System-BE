# Sinkronisasi kontrak API lintas repository

Repository **backend** memiliki sumber utama `docs/api-contract.md` dan turunan `docs/openapi.yaml`. Dalam repository frontend, dua path bernama sama adalah replika read-only yang harus identik byte-for-byte. Aturan ini tidak menjadikan backend sebagai dependency file instalasi/build frontend. URL/owner repository GitHub belum ditetapkan di dokumentasi ini.

## Prosedur perubahan

1. Tetapkan perubahan requirement dan keputusan terbuka di backend terlebih dahulu; jangan menciptakan perilaku server di frontend. PRD menentukan intent bisnis; kontrak menetapkan request/response/error bersama.
2. Perbarui Markdown backend, lalu selaraskan OpenAPI pada perubahan yang sama. Gunakan validator OpenAPI yang tercantum di requirements tool dan catat hasil aktual. Jangan mengubah status NOT_RUN menjadi PASS hanya karena file diubah.
3. Pemilik proyek memindahkan **kedua file** melalui salinan checkout lokal atau artefak yang ia unduh manual, tanpa konversi newline atau edit metadata frontend. Perubahan staging, commit, remote, push, PR dan semua pekerjaan Git/GitHub hanya dilakukan manual oleh pengguna. Agent tidak boleh menjalankan perintah Git atau tool GitHub.
4. Perbarui hash pada `docs/contract-version.json` di backend, lalu salin manifest yang sama ke frontend. Jika hash pasangan file berubah, perbarui schema/DTO/client yang terdampak sesuai task yang diizinkan; tindakan ini tidak otomatis mengizinkan implementasi Task 3.
5. Pada masing-masing repository jalankan pemeriksaan lokal di bawah. Untuk membandingkan replika dengan artefak backend yang tersedia, berikan direktori artefak secara eksplisit pada opsi --contract-source. Tidak ada path folder saudara yang di-hardcode.

```powershell
python docs/validation/check-docs.py
# Opsional: direktori yang dipilih pengguna harus berisi dua file resmi backend.
python docs/validation/check-docs.py --contract-source C:\artefak-kontrak-backend
```

Pemeriksaan hash lokal memastikan file sesuai manifest; kesamaan dengan checkout backend yang lebih baru hanya dapat dibuktikan ketika artefak tersebut diberikan. Tanpa artefak versi terbaru, status freshness terhadap remote adalah NOT_RUN. Agent tidak mengambil remote, melakukan push, memasang hooks Git atau menyinkronkan lewat GitHub.

## OpenAPI

Untuk memvalidasi ulang schema (Python tool terpisah dari dependency aplikasi):

```powershell
python -m pip install --target .cache/doc-tools -r docs/validation/requirements.txt
$env:PYTHONPATH = Join-Path (Get-Location) '.cache/doc-tools'
python -m openapi_spec_validator docs/openapi.yaml
```

Instalasi/validator di atas adalah petunjuk, bukan bukti bahwa command dijalankan pada penyalinan dokumen ini. Hasil Task 1 tetap merupakan bukti historis dari proyek gabungan. Jangan memodifikasi replika frontend untuk menutup perbedaan server tanpa memperbarui sumber backend.

## Contoh pemindahan lokal oleh pemilik proyek

Pada backend, setelah kedua file diselaraskan dan schema divalidasi, tampilkan SHA256 berikut dan masukkan hasilnya ke files pada contract-version.json (jangan mengubah isi kontrak hanya untuk menyamakan hash):

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath docs/api-contract.md,docs/openapi.yaml
```

Pada **frontend saja**, pemilik memilih direktori artefak resmi backend yang telah ia sediakan manual. Salin pasangan file dan manifest tanpa transformasi encoding/newline:

```powershell
$backendArtifacts = Read-Host 'Direktori artefak kontrak backend yang resmi'
foreach ($name in @('api-contract.md', 'openapi.yaml', 'contract-version.json')) {
    Copy-Item -LiteralPath (Join-Path $backendArtifacts $name) -Destination (Join-Path 'docs' $name)
}
python docs/validation/check-docs.py --contract-source $backendArtifacts
```

Direktori tersebut hanya input sinkronisasi kontrak, bukan dependency instalasi/build. Jangan menjalankan contoh penyalinan frontend di backend atau menganggap artefak frontend sebagai sumber utama. Akses/update GitHub, version control dan publikasi perubahan tetap manual oleh pengguna; tidak ada perintah Git dalam prosedur ini.
