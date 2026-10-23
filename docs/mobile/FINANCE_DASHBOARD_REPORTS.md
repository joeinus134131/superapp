# Keuangan mobile: dashboard dan laporan

Implementasi 22 Oktober 2026. Layar Keuangan kini memakai tab **Ringkasan, Riwayat, dan Laporan**. Periode bulanan/tahunan tetap dipakai bersama; label periode membuka pilihan bulanan/tahunan. Panah mengganti periode, dan tombol kembali ke periode sekarang hanya muncul ketika diperlukan.

## Yang tersedia

- Ringkasan: selisih uang masuk/keluar, total pemasukan/pengeluaran, maksimal tiga kategori pengeluaran terbesar, dan tiga transaksi terbaru. Grafik, rata-rata harian, rasio, serta perbandingan dipindahkan ke Laporan agar halaman awal lebih pendek. Selisih tetap diberi penjelasan bahwa angka ini bukan saldo rekening.
- Riwayat: daftar terbaru lebih dahulu dalam periode terpilih, filter semua/pemasukan/pengeluaran, filter kategori dari dashboard/laporan, paginasi, penambahan dan penghapusan transaksi.
- Laporan: ringkasan, tren dengan rincian nominal bulanan, seluruh kategori pemasukan/pengeluaran dan proporsinya, perbandingan periode sebelumnya, serta ekspor transaksi periode terpilih ke CSV.
- Fitur lainnya: bagian yang dapat dibuka/tutup untuk mengelola kategori dan membuka buku keuangan, inbox, serta riset. Fitur tersebut tetap tersedia tanpa mengambil ruang utama.
- Form pencatatan: tombol tambah membuka form dengan nominal dan kategori; jenis dapat diganti ke pemasukan. Tanggal default hari ini tetap terlihat, sedangkan catatan dan pengubahan tanggal dibuka dari “Catatan dan tanggal”. Pilihan kategori berada di dalam form, bukan modal bertumpuk; kategori khusus tetap dapat dipilih.
- Ketuk kartu pemasukan/pengeluaran atau kategori untuk membuka transaksi terkait. Semua angka berasal dari transaksi tersimpan, tanpa data contoh.
- Privasi: mengikuti `hideFinanceBalance`; nominal, rasio dan grafik disembunyikan, ekspor dinonaktifkan. Jumlah transaksi dan nama kategori tetap terlihat.
- Form mempertahankan input jika penyimpanan gagal. State transaksi diperbarui setelah penyimpanan terenkripsi berhasil. Kegagalan pembacaan menampilkan retry, bukan hanya layar kosong.
- CSV menggunakan IDR dan tanggal lokal, quoting serta pencegahan formula spreadsheet pada teks pengguna. Native membuka share sheet dan menghapus file cache sementara setelah selesai; web mengunduh berkas. Tidak mengunggah laporan otomatis ke layanan lain.

## Definisi angka

- Periode berdasarkan tanggal lokal perangkat: awal bulan/tahun inklusif, awal periode berikutnya eksklusif.
- Pemasukan/pengeluaran adalah penjumlahan transaksi dengan jenis terkait. Transaksi bertanggal mendatang dalam periode tetap dihitung; bukan ramalan ataupun saldo rekening bank.
- Arus kas bersih = pemasukan − pengeluaran.
- Sisa pemasukan (%) = arus kas bersih ÷ pemasukan × 100. Dapat negatif; tanpa pemasukan ditampilkan sebagai tidak tersedia.
- Rata-rata pengeluaran harian = pengeluaran ÷ seluruh jumlah hari kalender pada periode tersebut, termasuk tahun kabisat. Bukan rata-rata hanya hari yang memiliki transaksi.
- Perbandingan memakai seluruh periode sebelumnya. Periode berjalan belum lengkap; perubahan persentase tidak ditampilkan bila pembanding nol.
- Tren mode bulanan mencakup enam bulan berakhir pada bulan terpilih; mode tahunan mencakup Januari–Desember tahun terpilih. Ekspor selalu hanya periode yang dipilih, bukan seluruh rentang tren.
- Nominal nonnumerik/nonfinite/tidak positif, tanggal tidak valid, dan jenis transaksi tidak dikenal dikecualikan dengan jumlah peringatan. Tidak mengubah atau menghapus entri asli.

## Validasi

- TypeScript mobile: `pnpm --dir mobile exec tsc --noEmit`.
- Jest mobile: `pnpm --dir mobile exec jest --runInBand`, termasuk tes kalkulasi finansial, batas periode, tanggal lokal, tahun kabisat, data tidak valid, serta keamanan isi CSV.
- Bundling Expo web dan Android diperiksa terpisah. Export Android bukan APK, bukan bukti aplikasi telah berjalan pada perangkat.
- Pemeriksaan iOS Simulator (iPhone 17, iOS 26.4): Ringkasan baru, form ringkas, pembukaan/pemilihan kategori di dalam form, dan penutupan form tanpa menyimpan berhasil diamati langsung. Kontrol UI sempat timeout sehingga seluruh alur native, laporan, font sistem besar, keyboard, serta share sheet belum dinyatakan lulus. Android belum diuji langsung untuk perubahan ini.
- Konflik sinkronisasi lokal/cloud yang dilaporkan sebelumnya tidak diubah oleh fitur laporan. Laporan mengikuti versi transaksi yang tersedia lokal; ini tidak berarti data sudah cocok dengan cloud.

## Pemeriksaan manual berikutnya

1. Buka Keuangan; ganti tab dan periode, termasuk Desember–Januari serta Februari tahun kabisat.
2. Tambah pemasukan/pengeluaran di periode lain; periksa ringkasan, tren, kategori, dan daftar transaksi.
3. Ketuk kategori, periksa jenis/periode/filter; hapus filter dan uji paginasi setelah penghapusan.
4. Aktifkan sembunyikan nominal, lalu pastikan angka/grafik tidak bocor dan ekspor tidak aktif.
5. Ekspor CSV di Android/iOS dan web; buka di aplikasi spreadsheet, periksa Unicode, deskripsi berkoma/kutip, dan nominal.
6. Periksa tema gelap, layar kecil, teks panjang, font besar, serta keyboard terbuka; pastikan tombol dan konten terakhir tetap dapat dijangkau.

## Penyederhanaan UX — 22 Oktober 2026

Tujuannya mengurangi pilihan dan statistik pada halaman pertama tanpa menghapus kemampuan laporan. Label tab memakai bahasa yang lebih dekat dengan aktivitas pengguna. Ringkasan menyediakan tautan ke seluruh riwayat dan laporan lengkap; informasi lanjutan tetap berada pada tab Laporan. Pengaturan periode tetap sama ketika berpindah tab. Perubahan ini tidak mengganti rumus laporan atau memindahkan/menghapus transaksi pengguna.

Tes regresi komponen mencakup pemisahan Ringkasan/Laporan, form minimal dan penggantian jenis transaksi, opsi tahun, akses kategori/buku, penyembunyian nominal/ekspor, kegagalan save yang mempertahankan draft, dan kategori khusus dalam satu modal form. Tes memakai fixture serta router/native primitives yang dimock; bukan E2E akun nyata. Tidak dilakukan penambahan/penghapusan transaksi nyata selama pemeriksaan UI.

Hasil pemeriksaan akhir penyederhanaan: TypeScript mobile exit 0; Jest mobile **10 suite/81 tes lulus** dengan `--runInBand --detectOpenHandles --testTimeout=30000`; `git diff --check` lulus. Batas waktu tes dinaikkan dari default 5 detik setelah satu tes kategori timeout pada Mac yang sedang berbeban tinggi; assertion tidak dikurangi. Perubahan tampilan ini belum diuji langsung pada Android dan tidak mengklaim seluruh alur native iOS lulus.
