# Audit dan perbaikan sinkronisasi Whenya — 18 Oktober 2026

## Status dan cakupan bukti

Repository tersedia di `/Users/user/Projects/superapp`: web Next.js, mobile Expo/React Native, shared JavaScript, backend Go/Fiber/PostgreSQL. Workspace sudah berisi banyak perubahan dan file baru sebelum pekerjaan ini; perubahan tersebut tidak direset. Tool codebase-memory tidak tersedia dalam sesi ini, sehingga penelusuran memakai pencarian source.

Perbaikan kode dan pengujian otomatis lokal sudah dilakukan. **Belum terverifikasi end-to-end dengan PostgreSQL, akun cloud nyata, dua perangkat, atau backup pengguna yang sebenarnya.** Temuan tata letak berasal dari inspeksi source, bukan screenshot atau pengukuran frame rate.

## Prioritas 1 — restore dan cloud

### Akar masalah yang ditemukan

1. `shared/lib/backup.js` menulis backup mentah hanya ke localStorage, termasuk identitas/sesi. Pembacaan web mendahulukan localForage/IndexedDB, sehingga data lama dapat tetap terbaca. ID profil lama juga dapat menjadi namespace yang salah.
2. Tombol sync web memakai snapshot terenkripsi Supabase `user_sync_data`. Mobile mengirim `/context/sync`, yaitu snapshot konteks/AI, bukan endpoint penyimpanan dua arah. Shared sync lama memanggil `/sync` tanpa autentikasi dan tidak memeriksa HTTP error.
3. Mobile menyimpan ID pengguna dan token sebagai string biasa. `getRawData` semula mengembalikan null ketika JSON.parse gagal; akibatnya driver sinkronisasi dapat menganggap tidak ada pengguna aktif.
4. Mutasi melalui `mobile/lib/storage.ts` tidak menjadwalkan sync. Adapter shared lain membuat timer per mutasi tanpa debounce yang sama.
5. Finance, journal, dan kategori finance memakai EncryptedStorage dengan key global. Data ini tidak muncul di enumerasi namespace profil dan ciphertext dengan kunci perangkat tidak dapat dipakai langsung oleh web.
6. Metadata migrasi database web memakai satu key global lintas profil.

### Perubahan

- Restore memvalidasi format, memilih data modul, menormalkan prefix ID lama (termasuk ID yang pernah terbungkus JSON), dan memetakan ke profil aktif. Identitas, daftar akun, token, sesi cloud, master encryption key, dan metadata sinkronisasi tidak dipulihkan.
- Restore mengganti snapshot modul yang ada dalam backup; bukan append atau merge array. Duplikasi key hasil normalisasi ditolak. ID dan isi record tidak dibuat ulang. Duplikasi record yang sudah berada di dalam backup tidak otomatis dibersihkan.
- Restore web menulis IndexedDB dan localStorage, dengan upaya rollback jika salah satu penulisan gagal. Sukses lokal dan sukses cloud ditampilkan terpisah. Backup ekspor tidak lagi mengikutsertakan daftar akun/sesi.
- `shared/lib/databaseSync.js` menjadi mesin snapshot dua arah melalui GET `/storage` dan POST `/storage/migrations`. Transport web/mobile memakai access token akun cloud; identitas pemilik server tetap berasal dari middleware, bukan user ID dalam body.
- Sinkronisasi memakai baseline per profil, checksum, revision, dan readback setelah upload. Perubahan kedua sisi pada modul sama menghentikan seluruh rencana sebelum upload. Retry setelah respons hilang membandingkan snapshot cloud yang sudah tersimpan, sehingga tidak membuat record tambahan.
- UI web dan profil mobile menampilkan konflik dan pilihan seluruh versi lokal/cloud untuk modul yang konflik. Pilihan mengikat hash lokal, revision, dan checksum cloud yang ditinjau. Jika versi berubah, konflik harus ditinjau kembali. Ini bukan merge per record.
- Penghapusan modul setelah baseline direpresentasikan sebagai payload null (tombstone), sehingga perangkat lain tidak menghidupkan kembali data lama.
- Shared push/pull mendelegasikan ke driver platform yang sama. Snapshot konteks/AI mobile tetap terpisah setelah sinkronisasi data.
- Mutasi dijadwalkan dengan debounce. Mobile mencoba lagi ketika online, login selesai, atau aplikasi kembali aktif. Web mencoba lagi ketika event online terjadi; ada tombol manual untuk sinkronisasi.
- Kesalahan background web ditampilkan di dialog sync; mobile menyimpan status terakhir dan menampilkannya di profil. Tombol sync manual memberi hasil atau kesalahan eksplisit.
- EncryptedStorage mobile sekarang memakai namespace profil, membaca JSON legacy/web, mendekripsi sebelum transfer, dan mengenkripsi kembali hasil unduhan di perangkat. Dekripsi gagal menjadi error, bukan data kosong yang dianggap berhasil. Migrasi key global lama memakai penanda pemilik lokal satu kali.
- Pembacaan ID/token native menerima string biasa dan string JSON. Metadata migrasi database web dipisahkan per profil.
- Pemulihan backup Supabase lama tetap tersedia di web dan menulis kedua cache dengan pemetaan profil. Sync ID UUID tidak lagi selalu diubah menjadi huruf besar. Pengguna perlu menekan Sync Sekarang untuk mengirim hasil pemulihan backup lama ke database akun.

### Batas dan risiko

- Endpoint database yang tersedia menyimpan payload JSON, **bukan E2E dengan password backup lama**. UI web/mobile menjelaskan perbedaan ini. Enkripsi lokal native tetap dipertahankan. Konfigurasi HTTPS, middleware, provisioning user, serta migrasi tabel di deployment harus diverifikasi sebelum rilis.
- Kedua perangkat harus memakai akun Supabase yang sama dan backend/database yang sama. Kode lokal bukan pengganti identitas cloud.
- Konflik diselesaikan pada tingkat seluruh modul. Memilih satu versi mengganti isi modul pada sisi lainnya; ekspor backup terlebih dahulu jika kedua versi dibutuhkan. Tidak ada merge record otomatis.
- Marker pemilik data global legacy mengikuti profil pertama yang memigrasikannya. Data global lama tidak memiliki bukti pemilik; uji upgrade dengan backup sebelum dipakai pada perangkat yang sebelumnya memiliki beberapa akun.
- Rollback dua storage browser bukan transaksi lintas IndexedDB/localStorage yang tahan crash. Kuota tetap penuh atau kegagalan saat rollback juga dapat menyisakan ketidakkonsistenan; file backup asli harus disimpan.
- Tidak ada jaminan real-time ketika dua aplikasi terus terbuka tanpa mutasi, reconnect, resume, atau sync manual. Task web dan beberapa modul mobile menerima event selesai sync; modul web lain mungkin memerlukan muat ulang. Form edit yang sudah terbuka tidak di-merge dengan perubahan remote.
- Engine tidak memigrasikan skema semua record legacy. Backup JSON asli belum diberikan. Status task diketahui kompatibel setelah normalisasi; kesesuaian seluruh field finance/health/goal legacy masih harus diuji dengan fixture pengguna.
- Batas endpoint yang sudah ada: 100 modul per request dan 2 MB per payload, ditambah batas request server. Backup besar dapat ditolak; tidak ada chunking.
- Belum ada pembatalan request ketika logout; engine memeriksa profil sebelum upload/aplikasi unduhan. Backend tetap membatasi akses lewat token, tetapi pengujian pergantian akun nyata masih diperlukan.

## Prioritas 2 — header dan tata letak mobile

- `HeaderText` diterapkan pada judul/subjudul Tasks, Habits, Finance, Journal, Calendar, Pomodoro, Reading, Achievements, Health, Social, dan Goals. Teks memakai ellipsis satu baris, accessibility label teks lengkap, dan tekan lama untuk melihat teks lengkap.
- Container teks diberi ruang menyusut (`flex: 1`, `minWidth: 0`) sementara kotak ikon/back tetap stabil. Ukuran kotak ikon/back yang sudah 44 px dipertahankan; action PageHeader tetap 48 px.
- PageHeader bersama yang dipakai destination hub membatasi judul/subjudul, melindungi ruang action, dan menyediakan dialog teks lengkap melalui tekan lama.
- Lebar kartu dashboard dan achievements memakai `useWindowDimensions`, sehingga mengikuti perubahan ukuran jendela.
- Onboarding memakai safe area dari layout bersama dan ScrollView agar konten panjang/keyboard tidak bergantung pada tinggi tetap.

Belum ada bukti visual pada 320/360/390/430 px, tablet, landscape, notch, font scaling besar, atau screen reader. Perubahan ini lulus pemeriksaan tipe, bukan sertifikasi tampilan seluruh aplikasi.

## Prioritas 3 — task List/Kanban

Akar masalah tambahan yang nyata: web memfilter status `in-progress`, mobile memfilter `in_progress`. Record yang tersinkron dapat tidak masuk kolom yang diharapkan.

- Normalisasi bersama membaca alias lama dan memakai `in_progress` pada kedua UI; ID dan field lain dipertahankan.
- Pemilih mobile sekarang dua tombol dengan status selected yang eksplisit, bukan ikon tujuan pergantian yang dapat dibaca sebagai status aktif.
- Pilihan disimpan per profil/perangkat. Hydration asinkron tidak menimpa pilihan yang baru disentuh pengguna. Preferensi ini tidak ikut konflik sinkronisasi modul.
- Filter status berlaku di Kanban maupun List. Ukuran dan interval snapping Kanban mengikuti lebar jendela aktif. Kolom memperoleh pull-to-refresh.
- Task yang diunduh memperbarui UI; payload null mengosongkan daftar. Hook mobile untuk habit/finance/journal/reading/health/calendar serta layar goals/dashboard menerima event data tersinkron.

## Audit mobile yang lebih luas

| Area | Hasil inspeksi source / tindakan | Verifikasi tersisa |
| --- | --- | --- |
| Dashboard | Lebar grid reaktif dan refresh setelah sync ditambahkan. Ada kartu horizontal dengan lebar tetap yang memang perlu dilihat pada layar kecil. | Screenshot, beban data besar, waktu render |
| Tasks | Status, selector, persistence, filter, refresh dan snapping diperbaiki. | Tap cepat, navigasi bolak-balik, rotasi, ribuan task |
| Habits, Journal, Reading, Health, Calendar | Header diperbaiki; event refresh dan reset state kosong ditambahkan. | Form, keyboard, font besar, scroll panjang |
| Finance | Header dan namespace encrypted storage diperbaiki. Style grid masih menggunakan Dimensions statis. | Rotasi, format uang, kompatibilitas schema legacy, data besar |
| Goals | Header dan refresh hasil sync diperbaiki. | Semua variasi goal/journey legacy, keyboard, konflik form terbuka |
| Pomodoro | Header diperbaiki. | Background timer, resume, audio, animasi dan konsumsi baterai |
| Achievements | Header dan grid reaktif diperbaiki. | Tablet, font besar, animasi |
| Plan, Notes, Capture / destination hub | Memakai perbaikan PageHeader bersama. | Semua quick action dan navigasi tujuan |
| Profile | Sync manual, status gagal, dan resolusi konflik ditambahkan. | Upgrade multiakun dan render nama/email panjang |
| Social dan Squad | Header utama Social diperbaiki; beberapa kalkulasi layout masih statis. | Network lambat, keyboard/chat, daftar panjang, squad detail |
| Insights dan More | Struktur layout/safe-area dipindai; belum ada audit visual menyeluruh. | Empty/error/loading state, aksesibilitas, nav back |
| Login/Register/Reset/Callback | Jalur token/ID terkait sync ditelusuri. Tidak ada klaim desain auth telah diperbaiki. | Deep link, refresh token, jaringan putus dan font besar |
| Onboarding | Safe area dan scrolling ditambahkan. | Keyboard, perangkat pendek, semua langkah |
| LockScreen, LevelUpModal | Ditemukan ukuran tetap / Dimensions statis; belum diubah. | Perangkat sempit, orientation, biometric flow dan animasi |
| Tab bar/navigation | Sudah memakai safe area dan ukuran jendela. | Android gesture nav, iOS home indicator, screen reader |

Tidak ada benchmark FPS, JS thread, memory, scrolling atau cold start yang dijalankan. Dengan demikian, belum ada klaim bahwa smoothness/performa keseluruhan telah membaik.

## Pengujian

- Shared Jest: **136 test, 8 suite lulus**. Termasuk restore/remap/credential exclusion, dua klien simulasi upload–pull–edit–delete, retry respons hilang, konflik, pilihan resolusi, resolusi kedaluwarsa, account filtering, status task, dan raw ID/token native.
- Jest di mobile: **7 test, 2 suite lulus**. Memakai storage/keystore mock untuk encrypted roundtrip dan isolasi akun, JSON dari web, dekripsi gagal, migrasi global legacy, penggantian cache IndexedDB stale, rollback ketika kuota gagal, dan tombstone yang mencegah data legacy terhapus muncul kembali.
- Shared/web/mobile TypeScript: lulus.
- ESLint file web yang diubah: lulus.
- Next.js production build: lulus pada pemeriksaan akhir.
- Expo export Android/Hermes: lulus; bundle disimpan di `/tmp/whenya-mobile-audit-export`. Ini memverifikasi bundling, bukan pemasangan APK atau interaksi perangkat.
- Go handler HTTP: kontrak payload UTF-8, checksum salah, HTTP 409, identitas terautentikasi, GET readback dan penolakan tanpa identitas lulus dengan repository in-memory.
- Test middleware JWT yang sudah ada: enam skenario lulus. Eksekusi membutuhkan akses loopback/cache di luar sandbox; retry dengan izin tool berhasil.
- Test repository PostgreSQL `TestMigrationConflicts`: **SKIP**, karena `FINANCE_TEST_DATABASE_URL` tidak disediakan.
- Docker diperiksa; daemon tidak berjalan. Backend localhost tidak merespons. CoreSimulator tidak dapat diakses dari sesi ini. Tidak ada akun nyata atau data produksi yang dimutasi untuk pengujian.

Test dua klien dan HTTP handler adalah pengujian integrasi dengan dependency simulasi, **bukan E2E perangkat–cloud**.

## Tahap penerimaan berikutnya

1. Sediakan PostgreSQL uji terisolasi, jalankan migrasi backend, dan set `FINANCE_TEST_DATABASE_URL`; ulangi test repository tanpa SKIP.
2. Jalankan backend uji dan kedua aplikasi dengan endpoint dan akun Supabase uji yang sama. Restore salinan backup asli yang sudah disanitasi.
3. Buktikan reload/relogin web mempertahankan data, lalu unduh di mobile; lakukan edit/hapus mobile dan verifikasi di web. Cocokkan jumlah/ID record setiap modul dengan database.
4. Uji offline → mutate → online; respons upload hilang; dua perangkat mengedit modul sama; review resolusi; logout/login dan pergantian profil; payload besar dan kuota storage.
5. Lakukan matriks UI perangkat kecil/besar, landscape, font scaling, keyboard dan safe area. Ukur performa dengan data representatif sebelum mengklaim aplikasi lebih smooth.

Status pekerjaan: implementasi tahap awal dan verifikasi lokal tersedia; penerimaan E2E nyata dan audit visual/performa perangkat masih terbuka.
