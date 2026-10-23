# OAuth Google — mobile Whenya

Keputusan 23 Oktober 2026: hanya Google ditampilkan pada login/registrasi web dan mobile. Apple ditunda karena enrollment Developer Program belum selesai. Pemeriksaan `oauth:check` hanya mewajibkan Google; panduan Apple di bawah disimpan sebagai referensi untuk aktivasi mendatang, bukan persyaratan rilis saat ini.

Status verifikasi 22 Oktober 2026: implementasi mobile sudah diperbaiki; dashboard Supabase masih menampilkan Google dan Apple nonaktif. Belum ada login nyata ke kedua provider yang terverifikasi. Proyek Google pilihan pengguna terkonfirmasi sebagai `idnmakerspace` / `idnmakerspace-df294`; pengguna menyatakan sudah memperoleh client ID dan secret Google. Form provider Google sudah dibuka untuk pengisian langsung oleh pemilik kredensial.

Dashboard Apple yang sedang login menampilkan **Join the Apple Developer Program / Enroll today**; keanggotaan aktif belum terlihat pada akun ini. Perlu menyelesaikan enrollment atau memakai akun/team yang sudah aktif sebelum membuat Services ID dan signing key. Jangan menyimpulkan keanggotaan aktif hanya dari keberadaan akun atau aplikasi Apple Developer.

Pemeriksaan ulang 23 Oktober 2026: pengguna mengonfirmasi baru memiliki akun Apple, belum menyelesaikan enrollment. Pengguna menyatakan Google sudah disimpan, tetapi endpoint settings proyek ini masih melaporkan `google: false`; form provider yang terbuka juga masih OFF dan Client IDs kosong. Karena itu aktivasi Google belum dapat dianggap berhasil. Perlu memastikan penyimpanan dilakukan pada proyek `superapp_new` (`bdtsztphkqmpzrqascdl`) di menu Sign In / Providers → Google.

URL Configuration Supabase saat diperiksa: redirect allowlist kosong; Site URL memakai alamat Expo LAN lama. Empat redirect sudah disiapkan di form, belum disimpan: kedua callback mobile di bawah, `https://app.idnmakerspace.com`, dan `http://localhost:3000`. Perubahan allowlist menunggu persetujuan; Site URL belum diubah.

## Konfigurasi aplikasi

| Kebutuhan | Nilai |
| --- | --- |
| Bundle ID iOS / package Android | `com.selfone.mobile` |
| Scheme | `selfone` |
| Callback aplikasi | `selfone://auth/callback` |
| Redirect reset password | `selfone://auth/callback?intent=recovery` |
| Callback provider | Salin dari Supabase Auth → Providers; biasanya `https://<project-ref>.supabase.co/auth/v1/callback` |

Tambahkan kedua redirect aplikasi di Supabase Auth → URL Configuration → Redirect URLs. Callback provider di Google/Apple berbeda dari callback aplikasi: provider kembali ke Supabase, lalu Supabase kembali ke aplikasi.

ENV mobile hanya berisi URL Supabase dan anon/publishable key publik sesuai konfigurasi proyek. Client secret Google, secret Apple, dan private key `.p8` disimpan di sisi provider/Supabase; jangan masukkan ke variabel `EXPO_PUBLIC_*`, repository, atau chat.

## Google

1. Pastikan Project ID dari proyek `idnmakerspace` yang dipilih benar.
2. Di Google Auth Platform, lengkapi Branding, Audience, dan Data Access untuk login dasar. Jika aplikasi masih Testing, tambahkan akun penguji yang akan dipakai.
3. Buat OAuth client bertipe **Web application** untuk alur browser melalui Supabase ini. Tambahkan callback provider Supabase sebagai Authorized redirect URI. Jika Google meminta origin web, gunakan origin aplikasi web yang benar; jangan memasukkan scheme mobile sebagai JavaScript origin.
4. Isi client ID dan client secret pada provider Google di Supabase, lalu aktifkan dan simpan.
5. Uji menggunakan development build mobile. Alur ini tidak memakai native Google SDK; konfigurasi fingerprint Android bukan pengganti callback Web OAuth di atas.

## Apple — ditunda

1. Periksa keanggotaan aktif di Apple Developer Account, Team ID, serta akses Certificates, Identifiers & Profiles.
2. Daftarkan/pastikan App ID `com.selfone.mobile` dan kemampuan Sign in with Apple pada App ID tersebut.
3. Buat Services ID yang dipilih pemilik proyek untuk browser OAuth, hubungkan dengan primary App ID. Daftarkan domain auth Supabase dan return URL callback provider yang disalin dari dashboard. Jangan gunakan `selfone://` sebagai return URL Apple.
4. Buat Sign in with Apple key, simpan `.p8` dengan aman, dan catat Key ID/Team ID. Buat client secret sesuai dokumentasi Supabase, lalu isi Services ID/client secret pada provider Apple dan aktifkan.
5. Jadwalkan pembaruan secret sebelum kedaluwarsa; secret OAuth Apple perlu dirotasi paling lambat setiap enam bulan.

Implementasi saat ini memakai browser OAuth, belum memakai `expo-apple-authentication` atau tombol native Apple. Ketersediaan provider tidak membuktikan client secret, domain, atau konfigurasi Apple sudah benar; tetap perlu login nyata.

## Development build dan pemeriksaan

Expo Go dapat dipakai mengevaluasi tampilan, tetapi login OAuth dengan custom scheme memerlukan development build. Dependensi `expo-dev-client` dan `expo-web-browser` sudah ditambahkan; binary native baru belum dibangun dalam verifikasi ini.

```sh
pnpm --dir mobile run oauth:check --offline
pnpm --dir mobile run oauth:check
pnpm --dir mobile run build:dev
pnpm --dir mobile run dev:client
```

`build:dev` memakai EAS dan memerlukan akun/proyek EAS yang sesuai. Profil development iOS saat ini khusus Simulator; perangkat iPhone fisik membutuhkan profil build perangkat dan signing yang sesuai. Alternatif lokal: `pnpm --dir mobile ios` dengan Xcode/CocoaPods atau `pnpm --dir mobile android` dengan Android SDK. Launcher `dev:simulator` yang lama menjalankan Expo Go.

Pemeriksaan offline memeriksa konfigurasi lokal. Pemeriksaan online membaca status publik provider tanpa mencetak key/token; exit nonzero jika provider belum aktif. Pemeriksaan ini tidak dapat memvalidasi secret atau redirect allowlist di dashboard.

## Perubahan dan batas verifikasi

- Mobile memakai satu client Supabase dengan PKCE, callback kanonis, pertukaran kode satu kali, penanganan pembatalan, dan pembatasan login bersamaan.
- Sesi native dienkripsi dan diautentikasi sebelum disimpan di AsyncStorage; kunci disimpan di SecureStore. Migrasi sesi lama memverifikasi penulisan sebelum menghapus plaintext. Data aplikasi tidak dihapus.
- Callback menolak token bearer yang disisipkan melalui URL. Link email implicit lama perlu diminta ulang; alur PKCE perlu diselesaikan pada perangkat/browser yang menyimpan verifier awal.
- Mode recovery mengikuti hasil terverifikasi SDK. Logout memakai scope lokal dan menampilkan kegagalan, bukan memberi hasil sukses palsu.
- Request auth memakai timeout; token kedaluwarsa tidak dikembalikan sebagai fallback saat refresh gagal.
- Lulus 19 suite / 125 tes, TypeScript, dan export Android/iOS/web. Termasuk pengujian PKCE dengan SDK Supabase asli tetapi jaringan/storage native dimock.
- Login nyata Google/Apple, signing/build native, konfigurasi dashboard, dan audit backend/RLS menyeluruh belum terverifikasi. Kelulusan tes bukan bukti bahwa semua keamanan aplikasi sudah selesai.

Setelah provider aktif, uji login baru, batal login, callback berulang, restart aplikasi, refresh sesi, logout, konfirmasi email, dan reset password pada development build. Jangan menyimpulkan siap produksi hanya dari status provider aktif.

## Referensi

- [Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking?platform=react-native)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Expo authentication](https://docs.expo.dev/guides/authentication/)
