# Fixture parser bank — DRAFT, belum terdaftar sebagai template aktif

Status: **awaiting_anonymized_sample**. Lihat `bank_templates.go` (`BankTemplateCatalog`: `parser_ready:false`).
File di folder ini TIDAK otomatis mengaktifkan parser. Registrasi hanya via `BankTemplates.Register` dengan manifest + matcher eksplisit + review manusia.

## Aturan sanitasi (wajib sebelum commit sampel asli)

- Ganti nama orang/merchant asli → `MERCHANT CONTOH` / `Nama Disamarkan`.
- Masking rekening: hanya suffix 4 digit boleh tersisa (`****1234`). Jangan commit nomor penuh, NIK, OTP, PIN, saldo penuh bila tidak perlu.
- Tandai `sample_class`: `synthetic_only` (format buatan, aman) atau `reviewed_anonymized` (dari email asli yang sudah disamarkan + direview).
- `sample_sha256` = SHA256 byte teks sampel (LF, tanpa BOM). Hitung dengan: `shasum -a 256 <file>`.

## Cara promosi ke template aktif (P2)

1. Pengguna memilih 2 bank pertama + menyediakan 3–5 sampel tersamarkan per format (notifikasi + statement).
2. Tulis parser deterministik (regex/template) + `matches()` sempit (misal subject/sender + pola nominal), bukan `bank_hint` saja.
3. Daftarkan dengan `ParserID/Version` + `SampleSHA256` + `SampleClass`, tambah golden test `bank_templates_test.go`.
4. Ukur akurasi field (amount/currency/date/account/status) vs label manual; target awal ≥95% untuk 2 template MVP0, sisanya tetap `manual_review_required`.
5. Jangan klaim `parser_ready:true` di katalog sebelum langkah 1–4 lolos.

Lihat contoh: `bri_notif_id.sanitized.txt`, `bni_notif_id.sanitized.txt` + `.expected.json` + `manifest.example.json`.
