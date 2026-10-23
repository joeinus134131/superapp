# Perbaikan konflik sinkronisasi mobile

Implementasi 22 Oktober 2026. Tidak ada data akun nyata yang dipilih, diganti, atau dihapus saat pengerjaan kode ini.

## Penyebab

- Mesin sinkronisasi memakai satu snapshot per modul. Data lokal dan cloud yang sama-sama berubah terhadap baseline, atau berbeda pada sinkronisasi pertama tanpa baseline, memerlukan pemilihan versi.
- Penyimpanan lokal menjadwalkan sync otomatis; `SyncService` juga menjalankan sinkronisasi. Konflik sebelumnya terus dicoba lagi tanpa status jeda.
- Penulisan unduhan modul terenkripsi ikut memicu jadwal sync baru.
- Efek dashboard yang bergantung pada daftar tugas juga memanggil ulang registrasi notifikasi dan pemeriksaan login harian.

## Perubahan

- Satu koordinator menyerialkan sync manual dan otomatis. Pilihan manual yang menunggu proses background tidak hilang.
- Konflik menjadi status `conflict` yang tersimpan per akun. Sync otomatis dijeda selama konflik belum diselesaikan, termasuk setelah aplikasi dimulai ulang. Percobaan manual tetap bisa mengambil versi terbaru dari cloud.
- Simpan lokal saat sync sedang berlangsung dapat mengantrekan satu proses lanjutan sehingga perubahan terbaru tidak hilang dari antrean.
- Unduhan modul terenkripsi memakai `skipSync`; tidak menjadwalkan upload ulang hanya karena dibaca dari cloud.
- Beranda dan Keuangan menunjukkan pemberitahuan konflik menuju Profil. Status Profil ikut diperbarui melalui event.
- Profil → **Sinkronkan akun cloud** membuka perbandingan konflik per modul. Pilihan lokal/cloud tidak dipilihkan otomatis, dan semua modul perlu ditinjau. Detail lengkap dapat dibuka; detail transaksi mengikuti pengaturan sembunyikan nominal.
- Sebelum pilihan diterapkan, kedua versi dan pilihan pengguna disimpan sebagai cadangan terenkripsi khusus akun. Disimpan maksimal lima batch terbaru. Jika cadangan gagal, penerapan dibatalkan.
- Cadangan dapat dibagikan dari Profil sebagai JSON melalui share sheet atau unduhan web. JSON berisi kedua versi untuk peninjauan/pemulihan manual; belum ada tombol restore otomatis. Ekspor tidak tersedia ketika nominal disembunyikan.
- Pilihan kedaluwarsa ditolak jika hash lokal atau revisi/checksum cloud berubah. Pengguna harus meninjau ulang versi terbaru.
- Sesi cloud harus sesuai akun lokal. Pergantian akun dan penulisan data terenkripsi memiliki pemeriksaan pemilik; status dan cadangan akun lain tidak dipakai.
- Registrasi notifikasi dan pemeriksaan login harian dipisah dari efek pembaruan data dashboard. Pesan push tidak tersedia pada Expo Go tetap merupakan pesan kemampuan lingkungan, bukan konflik data.

## Alur pengguna

1. Muat ulang aplikasi yang berisi kode terbaru.
2. Buka Profil dan pilih **Sinkronkan akun cloud**.
3. Bandingkan lokal/cloud per modul dan pilih versi yang benar. Tidak ada penggabungan atau penjumlahan XP otomatis.
4. Tekan **Cadangkan & terapkan pilihan**. Kode memeriksa ulang versi, membuat cadangan, lalu menyinkronkan.
5. Setelah berhasil, sync otomatis kembali aktif dan layar terkait memuat ulang data unduhan. Jika ditunda atau gagal, data lokal tetap tersedia.

## Validasi

- TypeScript mobile lulus.
- 34 tes mobile lulus: koordinator, jeda persisten, antrean pilihan manual, data terbaru saat sync berjalan, kegagalan jaringan, isolasi akun, cadangan terenkripsi, dan penulisan unduhan tanpa menjadwalkan sync ulang.
- 14 tes mesin sinkronisasi shared lulus: konflik, perubahan cloud/lokal setelah ditinjau, pilihan campuran per modul, serta pembatalan saat cadangan gagal.
- Seluruh suite shared: 145 tes lulus, satu tes gagal pada `tokenSystem.test.js` (`isPremiumUser` setelah reward harian). File token dan tes tersebut tidak diubah dalam perbaikan ini.
- Bundling Android diperiksa; ini bukan APK dan bukan pengujian pada akun/perangkat nyata.
- Masih diperlukan pengujian dua perangkat/akun cloud nyata, offline/reconnect, share sheet cadangan, dan tampilan pada layar kecil/font besar.
