# Evaluasi Whenya melalui iOS Simulator

## Menjalankan ulang

Dari root repository:

```sh
pnpm --dir mobile dev:simulator
```

Launcher memeriksa runtime iOS, membuat perangkat **Whenya iPhone** bila belum ada, menyalakannya, dan membuka Simulator.app. Jika Metro Whenya sudah aktif di port 8081, launcher mengambil tautan proyek, mengunduh Expo Go yang cocok melalui downloader Expo CLI proyek, lalu memasang dan membuka aplikasi pada UUID perangkat Whenya yang tepat. Jika belum ada server, launcher menjalankan Expo Go melalui localhost. Terminal Metro harus tetap berjalan agar Fast Refresh tersedia.

Jika port 8081 digunakan proyek lain, launcher menolak memakai server tersebut. Gunakan port lain:

```sh
WHENYA_METRO_PORT=8082 pnpm --dir mobile dev:simulator
```

## Prasyarat

- macOS dan Xcode lengkap, dengan developer directory mengarah ke Xcode.
- Runtime iOS terpasang. Pada Apple Silicon, perintah resmi Xcode untuk memasangnya:

```sh
xcodebuild -downloadPlatform iOS -architectureVariant arm64
```

- Dependency proyek sudah terpasang. Expo CLI mengambil Expo Go yang cocok dengan SDK proyek jika belum ada di cache.
- Konfigurasi aplikasi tetap memakai konfigurasi pengembangan lokal yang ada. Login dilakukan sendiri di UI aplikasi; jangan menaruh password di script atau dokumentasi.

## Fast Refresh

Setelah Whenya terbuka, simpan perubahan komponen React Native untuk melihat pembaruan. Jika tidak muncul, buka menu pengembang Simulator dengan **Cmd+D**, pastikan Fast Refresh aktif, atau tekan **r** di terminal Expo untuk reload. Perubahan dependency native memerlukan build native yang sesuai; Fast Refresh hanya memperbarui JavaScript dan aset yang didukung runtime.

## Evaluasi tampilan

- Mulai dari layar masuk, lalu dashboard dengan akun/data uji yang memang diizinkan.
- Periksa tema terang/gelap, teks panjang, empty/loading/error state, modal, keyboard terbuka, dan konten terakhir di atas tab bawah.
- Ubah ukuran teks melalui Settings iOS untuk menguji pembesaran teks. Ganti model simulator lewat Xcode/Simulator untuk perbandingan layar kecil dan besar; perangkat default launcher memakai iPhone 17 bila device type tersebut tersedia.
- Uji pencarian jurnal, goal → tugas → fokus, retry, dan Undo dengan data uji. Aksi ini tetap dapat memicu sinkronisasi akun, sehingga simulator bukan lingkungan data terisolasi secara otomatis.
- Catat layar, model, versi iOS, skala teks, langkah reproduksi, dan hasil aktual. Simulator tidak menggantikan uji Android, keyboard/performa perangkat fisik, atau remote push nyata.

## Status setup sesi 22 Oktober 2026

- Runtime **iOS 26.4 (23E244), arm64** berhasil diunduh dan terpasang pada Xcode 26.4.
- Perangkat **Whenya iPhone**, model iPhone 17, UUID `0CED7C0A-CF81-46EB-B251-0227BAE69495`, berhasil dinyalakan.
- **Expo Go 57.0.9** berhasil dipasang. Proyek SDK 57 dibuka melalui `exp://127.0.0.1:8081` dari Metro yang sebelumnya sudah berjalan.
- Dashboard Whenya benar-benar terlihat melalui kontrol UI Simulator; endpoint Metro `/json/list` juga menunjukkan koneksi React Native dari Whenya iPhone.
- Fast Refresh aktif di menu developer. Uji perubahan teks sementara pada sapaan dashboard langsung terlihat; teks dikembalikan dan diverifikasi kembali. Tidak ada perubahan copy uji yang sengaja dipertahankan.
- `node --check mobile/scripts/ios-simulator.mjs`, pemeriksaan whitespace, serta preflight dependency/koneksi Supabase lulus. Downloader memakai API internal Expo CLI versi proyek yang terkunci; periksa kembali integrasi ini saat menaikkan versi Expo CLI.

### Kondisi aktual yang belum dianggap selesai

- Boot awal memunculkan **Data Migration Failed** dari iOS, dengan kode keluar `simctl bootstatus` tetap 0. Dilakukan restart perangkat dan layanan CoreSimulator tanpa menghapus data. Setelah itu instalasi Expo Go, pembukaan Whenya, dan Fast Refresh berhasil, tetapi peringatan migrasi sistem belum dibuktikan teratasi. Launcher memperingatkan status ini dan memakai keberhasilan instalasi/pembukaan sebagai pemeriksaan layanan aplikasi, bukan menyamarkan peringatannya.
- Dashboard instalasi ini menampilkan banner **Some data is unavailable. Tap to reload.** dan **Finance unavailable**. Itu hasil observasi nyata, bukan empty state yang dinyatakan lulus. Tidak dilakukan login dengan kredensial pengguna atau pembuatan data akun selama setup. Penyebab banner dan alur autentikasi awal memerlukan pemeriksaan lanjutan; keberhasilan setup simulator tidak membuktikan seluruh data aplikasi sehat.
- Belum dilakukan audit menyeluruh semua halaman, font besar, keyboard, Android, atau akun cloud nyata. Pengamatan setup ini tidak menutup checklist validasi UI/UX secara keseluruhan.

Acuan: [setup simulator Expo](https://docs.expo.dev/get-started/set-up-your-environment/?device=simulated&platform=ios), [pengelolaan runtime Xcode](https://developer.apple.com/documentation/Xcode/downloading-and-installing-additional-xcode-components).
