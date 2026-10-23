# Whenya — Ringkasan Implementasi Perbaikan UI/UX Mobile

## Tujuan dan batas evaluasi

Membuat dashboard mobile membantu pengguna memahami prioritas hari ini dan langsung mengambil tindakan, sambil mempertahankan identitas cream, hijau gelap, dan aksen gold.

Rencana awal berasal dari screenshot dashboard. Pada 22 Oktober 2026, source diperiksa, temuan yang terbukti diperbaiki, dan jalur terkait diuji dengan fixture serta tes komponen. Status terbaru dan bukti berada di bagian akhir dokumen. Rekomendasi desain tetap dibedakan dari bug; hasil tes tidak dianggap sebagai bukti kenyamanan atau kelulusan visual pada perangkat.

## 1. Prioritas implementasi

| Prioritas | Area | Perubahan | Kriteria selesai |
| --- | --- | --- | --- |
| P0 | Status bar dan safe area | Gunakan ikon status bar gelap pada tema terang; hormati inset atas dan bawah perangkat | Jam dan ikon terbaca; header tidak tertutup notch; konten terakhir dapat di-scroll di atas bottom navigation |
| P0 | Hierarki dashboard | Pindahkan Today's Tasks ke atas progress mingguan | Tugas hari ini dapat ditemukan tanpa melewati kartu progress dan goals yang besar |
| P0 | Input pencarian | Tegaskan fungsi sebagai pencarian; gunakan placeholder pendek seperti “Cari tugas, catatan, atau tujuan…” | Mengetuk input membuka pencarian; hasil dan kondisi kosong jelas; jika fitur sebenarnya AI, gunakan label AI dan alur tersendiri |
| P0 | Empty state progress | Padatkan kartu saat belum ada aktivitas; tambahkan CTA “Buat tugas pertama” | Nilai 0% tidak terlihat sebagai aktivitas terisi; CTA membuka pembuatan tugas |
| P1 | Goal dan fokus | Tampilkan langkah berikutnya pada goal aktif; hubungkan sesi fokus ke tugas yang dipilih | Pengguna mengetahui tugas yang akan difokuskan; jika belum ada tugas, arahkan membuat atau memilih tugas |
| P1 | Tombol tambah | Buka bottom sheet berlabel: Tugas, Kebiasaan, Pengeluaran, Jurnal | Setiap pilihan membuka form yang sesuai; sheet dapat ditutup dan tetap nyaman saat keyboard terbuka |
| P1 | Notifikasi dashboard | Ganti daftar entri dan badge "2 baru" yang statis dengan data notifikasi nyata; sembunyikan badge bila kosong | Badge dan isi sheet mencerminkan notifikasi aktual; tidak ada entri fiktif |
| P1 | Empty state Life DNA | Tampilkan empty state eksplisit saat belum ada data; hilangkan nilai default yang tampak seperti data terukur | Layar tanpa data tidak menampilkan angka atau grafik radar yang menyerupai hasil |
| P1 | Header dan teks panjang | Gunakan judul fleksibel, batas baris sesuai konteks, dan ellipsis untuk judul ringkas | Nama panjang dan pembesaran teks tidak menabrak ikon; teks lengkap tersedia lewat detail atau aksi yang jelas |
| P1 | Konsistensi komponen | Samakan ikon, ukuran tombol, kapitalisasi, spacing, dan bahasa | Pola yang sama digunakan di dashboard serta halaman fitur utama |
| P2 | Ringkasan mingguan | Tampilkan metrik dan periode yang jelas | Pengguna memahami apa yang dihitung, termasuk kondisi tanpa data |
| P2 | Transisi dan feedback | Tambahkan loading, error, sukses, dan respons saat aksi | Tidak ada layar kosong tanpa penjelasan; kegagalan menyediakan coba lagi tanpa kehilangan input |

## 2. Susunan dashboard yang disarankan

1. Header ringkas: logo atau sapaan, notifikasi, dan profil.
2. Pencarian dengan fungsi yang eksplisit.
3. Shortcut: Kebiasaan, Jurnal, Tujuan, Kalender, Fokus. Tugas dan Keuangan diakses melalui navigasi bawah agar tidak menduplikasi tujuan navigasi. Kalender membuka jadwal; Fokus membuka timer.
4. Tugas hari ini: ringkasan jumlah, daftar pendek, dan “Lihat semua”.
5. Kebiasaan hari ini: checklist ringkas.
6. Goal aktif: progress, langkah berikutnya, dan aksi fokus.
7. Ringkasan progress mingguan.

Hindari memperbesar semua section sekaligus. Tampilkan maksimal sekitar tiga tugas pada ringkasan dashboard; daftar lengkap tersedia pada halaman Tasks. Uji susunan ini pada layar kecil untuk memastikan tugas hari ini tetap mudah ditemukan.

## 3. Detail perilaku utama

### Tugas hari ini

- Tampilkan judul, waktu atau deadline jika ada, dan kontrol selesai.
- Pisahkan overdue dari tugas hari ini secara jelas jika ditampilkan bersama.
- Saat kosong: “Belum ada tugas hari ini” dengan tombol “Tambah tugas”.
- Saat semua selesai: tampilkan konfirmasi yang positif dan ringkas.
- Setelah menandai selesai, perbarui ringkasan yang terkait; sediakan Undo bila sesuai.

### Progress mingguan

- Jangan gunakan batang berwarna seperti data terisi ketika nilainya nol.
- Bedakan track kosong, aktivitas aktual, dan hari yang belum terjadi.
- Beri label metrik, misalnya “Tugas selesai minggu ini”.
- Tetapkan rumus sebelum implementasi. Usulan awal: persentase tugas selesai dari tugas yang dijadwalkan pada minggu tersebut; definisikan penanganan tugas terlambat, dibatalkan, dan dipindahkan.
- Hindari menggabungkan task dan habit dalam satu persentase tanpa aturan pembobotan yang jelas.
- Jika denominator nol, tampilkan “Belum ada tugas terjadwal”, bukan hasil perhitungan tidak valid.

### Goal dan sesi fokus

- Pertahankan nama goal, kategori bila berguna, serta progress.
- Tambahkan satu langkah konkret, misalnya “Berikutnya: susun skema sensor”.
- Tombol fokus harus memperlihatkan konteks tugas sebelum timer dimulai.
- Jika progress goal manual, jangan tampilkan seolah otomatis dihitung dari task.

### Navigasi mobile

- Pertahankan struktur bottom navigation yang sudah familiar selama perbaikan awal.
- Beri state aktif yang jelas melalui ikon, warna, dan label.
- Tombol tambah membuka pilihan aksi, bukan berpindah ke tab.
- Pastikan tab More memberi akses yang jelas ke fitur yang tidak ada di bottom navigation.
- Jika widget melayang pada screenshot milik Whenya, pindahkan agar tidak menutup Goals atau kontrol lain. Jika berasal dari aplikasi lain, tidak perlu diubah.

## 4. Panduan komponen mobile

Angka berikut merupakan target desain awal dan perlu disesuaikan dengan platform serta diuji pada perangkat.

| Elemen | Target awal |
| --- | --- |
| Padding horizontal | 16–20 dp |
| Jarak antar-section | 20–24 dp |
| Padding kartu | 16–20 dp |
| Area sentuh | Minimal 48 × 48 dp |
| Body text | Sekitar 14–16 sp, mendukung pembesaran teks |
| Judul section | Sekitar 18–22 sp |
| Ikon navigasi | Konsisten sekitar 24 dp |
| Radius | Gunakan 2–3 token konsisten untuk input, tombol, dan kartu |
| Padding bawah konten | Tinggi area navigasi yang menutupi konten + inset bawah + jarak nyaman |

- Pertahankan cream sebagai background, putih sebagai permukaan kartu, dan hijau gelap untuk aksi utama.
- Gunakan gold sebagai aksen; verifikasi keterbacaan bila digunakan untuk teks atau indikator.
- Jangan mengandalkan warna saja untuk membedakan status.
- Pada mobile, jangan mengandalkan hover tooltip. Sediakan teks lengkap melalui halaman detail, ekspansi, atau tombol informasi.
- Gunakan komponen bersama untuk header, section, tombol, empty state, dan bottom sheet.

## 5. Bahasa dan microcopy

Gunakan bahasa sesuai pengaturan pengguna. Jika mendukung Indonesia dan Inggris, terjemahkan satu layar secara lengkap.

| Konteks | Contoh Indonesia |
| --- | --- |
| Sapaan | Halo, Made 👋 |
| Pencarian | Cari tugas, catatan, atau tujuan… |
| Tugas | Tugas hari ini |
| Ringkasan | 2 dari 5 tugas selesai |
| Empty state | Belum ada tugas hari ini |
| CTA awal | Tambah tugas |
| Goal | Tujuan utama |
| Fokus | Fokus pada tugas ini |
| Link section | Lihat semua |

## 6. Tahapan pengerjaan

### Tahap 1 — Tata letak dan kejelasan

- [x] Perbaiki status bar, safe area, serta jarak konten dari bottom navigation.
- [x] Ringkas header dan pindahkan tugas hari ini.
- [x] Perjelas pencarian.
- [x] Padatkan empty state progress dan tambahkan CTA.

### Tahap 2 — Interaksi utama

- [x] Implementasikan bottom sheet tombol tambah.
- [x] Hubungkan goal, next task, dan sesi fokus.
- [ ] Rapikan judul panjang, ikon, bahasa, dan komponen bersama. *(header bersama dan dashboard diperbaiki; konsistensi setiap kontrol di seluruh layar belum diklaim)*
- [x] Lengkapi loading, error, empty state, serta feedback aksi. *(cakupan dashboard; modul lain belum diaudit)*
- [x] Hubungkan modal notifikasi ke riwayat nyata lokal per akun; tes receipt, unread, deduplikasi, dan isolasi akun lulus.
- [x] Perbaiki empty state Life DNA, nilai nol, rumus metrik, dan kode mati dashboard; source serta tes komponen diperiksa.

### Tahap 3 — Validasi

- [ ] Uji layar kecil sekitar 320–360 dp dan layar lebih besar.
- [ ] Uji notch, navigasi gesture, dan navigasi tiga tombol.
- [ ] Uji teks sistem diperbesar, nama panjang, dan judul tugas panjang.
- [ ] Uji keyboard terbuka, perangkat offline, dan koneksi lambat.
- [ ] Uji kondisi tanpa data, sebagian selesai, serta semua tugas selesai.
- [ ] Pastikan setiap tombol menuju aksi atau halaman yang benar.
- [ ] Pastikan ringkasan dashboard mengikuti perubahan task, habit, dan goal sesuai definisinya.
- [ ] Minta pengguna mencoba mencari tugas hari ini, menambah tugas, dan memulai fokus; catat kebingungan sebelum melakukan polish tambahan.

## Definisi selesai

Perbaikan dinyatakan selesai setelah pengguna dapat menemukan prioritas hari ini, membuat tugas, dan memulai fokus dengan alur yang jelas; seluruh kontrol dapat disentuh; teks penting dapat dibaca; tidak ada konten yang tertutup elemen tetap; serta tampilan kosong dan progress sesuai data aktual.

## Status implementasi dan verifikasi — 22 Oktober 2026

Status berikut menggantikan klaim implementasi sebelum perbaikan. Checkbox implementasi berarti kode dan pemeriksaan yang disebutkan sudah ada, bukan kelulusan semua uji perangkat pada Tahap 3.

### Perbaikan temuan yang terbukti

| ID | Kondisi sebelum perbaikan | Implementasi sekarang | Bukti otomatis |
| --- | --- | --- | --- |
| F01 | Pembaca biasa memperlakukan ciphertext jurnal native sebagai daftar kosong | Pencarian dan loader dashboard memakai pembaca jurnal terenkripsi bersama; kegagalan baca menyediakan retry | Fixture ciphertext native terbaca kembali; tes pencarian membuka entri dan membedakan gagal baca dari tanpa hasil |
| F02 | Ringkasan pengeluaran berlabel bulan ini menjumlah seluruh riwayat | Beranda memakai laporan bulan/tahun lokal yang sama dengan mesin laporan Keuangan | Tes komponen memastikan transaksi bulan sebelumnya tidak dihitung |
| F03 | Dashboard memanggil aksi `HABIT_COMPLETE` yang tidak ada dan mendapat 0 XP | Dashboard dan halaman Kebiasaan memakai repository bersama dengan `HABIT_DONE` (10 XP) | Tes check-in menghasilkan 10 XP; undo/redo tidak menggandakan XP |
| F04 | Dashboard menambah angka streak lama meskipun check-in terputus | Kedua layar menghitung ulang `completedDates` dengan `habitStreak` shared | Check-in 1 dan 22 Oktober menghasilkan streak 1 |
| F05 | Checklist/reward berubah sebelum keberhasilan simpan diketahui | Persistensi strict selesai sebelum state/reward; perubahan habit diserialisasi; gagal simpan ditampilkan; gagal XP dipisahkan dari gagal check-in | Fault injection disk gagal tidak mengubah state/reward; dua check-in bersamaan tersimpan; retry XP idempoten, termasuk kegagalan penulisan receipt |
| F06 | Save jurnal gagal dapat meninggalkan spinner aktif dan entri optimistis | Repository menyimpan dahulu, UI memakai lock dan try/catch/finally; draft dipertahankan; AI opsional dibatasi waktu | Tes hook tidak memasukkan entri gagal; tes form spinner berhenti, draft tetap ada, retry berhasil; AI menggantung tidak menghalangi simpan setelah batas waktu |
| Tambahan: notifikasi | Empat entri dan badge “2 baru” statis | Sheet memakai receipt aktual, waktu aktual, unread, mark read, empty/error/retry | Tes history terenkripsi, deduplikasi, baca, payload native, dan pergantian akun |
| Tambahan: Life DNA | Default 20/50% dan radius minimal grafik memberi kesan aktivitas | Tanpa data ada empty state; tidak ada nilai pengganti; nilai 0 berada di pusat radar; rumus/periode dijelaskan | Tes data kosong, nol nyata, tanpa pemasukan, batas nilai, dan empty state komponen |
| Tambahan: kode mati | `quickActions` tak dirender, FAB/import/style/animasi dan modal tak terjangkau | Dashboard diringkas; sheet notifikasi/DNA serta section/empty state dipisah menjadi komponen | TypeScript dan bundling ketiga platform lulus; ini perbaikan pemeliharaan, bukan klaim peningkatan performa terukur |

Implementasi terkait: [repository jurnal](/Users/user/Projects/superapp/mobile/lib/journalRepository.ts), [pencarian](/Users/user/Projects/superapp/mobile/components/DashboardSearch.tsx), [loader dashboard](/Users/user/Projects/superapp/mobile/lib/dashboardSources.ts), [repository habit](/Users/user/Projects/superapp/mobile/lib/habitRepository.ts), [reward](/Users/user/Projects/superapp/mobile/lib/gamification.ts), [form jurnal](/Users/user/Projects/superapp/mobile/app/(app)/journal.tsx), [dashboard](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx).

### Alur dan tata letak yang diperbarui

- Status bar mengikuti tema. Tinggi tab dan padding bawah memakai satu helper inset; header memakai tinggi minimum, bukan tinggi tetap. Pengujian notch/gesture/tiga tombol tetap memerlukan perangkat.
- Urutan dashboard: header, pencarian, Kebiasaan/Jurnal/Tujuan/Kalender/Fokus, maksimal tiga tugas hari ini, maksimal tiga kebiasaan, tujuan, progres mingguan, dan ringkasan pengeluaran. Tugas dan Keuangan tersedia di navigasi bawah. Shortcut membungkus saat skala font besar.
- Tugas hari ini memakai tanggal lokal; overdue dihitung terpisah; tugas tanpa tenggat tersedia di daftar Tugas. Form baru diberi tenggat hari ini. Setelah selesai, dashboard menyediakan Undo yang memulihkan status sebelumnya. Reward tugas dicatat sekali per ID tugas; Undo tidak menarik kembali XP.
- Pencarian lokal mencakup tugas, jurnal terenkripsi, dan tujuan; hasil membuka detail. Ini bukan pencarian AI dan belum mencakup modul Catatan. Tombol tambah membuka form Tugas/Kebiasaan/Pengeluaran/Jurnal, termasuk ketika tab sudah pernah dibuka.
- Goal menampilkan langkah `journey` pertama yang belum selesai. Jika sudah ada tugas terbuka dengan `goalId` tersebut, aksi fokus membawa ID tugas ke timer. Jika belum ada, form tugas dibuka dengan langkah dan relasi tujuan yang dapat ditinjau/dihapus sebelum disimpan. Daftar tugas dari konteks tujuan difilter, dengan aksi menampilkan semua. Sesi fokus menyimpan konteks tugas dan tujuan. Tidak ada pencocokan judul otomatis; progres tujuan tetap manual.
- Tanpa jadwal mingguan: kartu ringkas dan CTA. Ada jadwal tetapi nol selesai: angka ringkas dan CTA daftar jadwal, tanpa grafik besar. Hari mendatang diberi label “Nanti”/“Later”.
- Section dan empty state dashboard memakai komponen bersama. Header bersama menyediakan aksi membaca judul/subtitle lengkap, kontrol/tabs minimal 48 dp, dan teks dua baris. Button kecil, tutup pencarian, serta sheet tambah diperbesar. Warna muted tema gelap diperjelas. Ini tidak berarti setiap kontrol di seluruh aplikasi sudah diukur atau lulus audit aksesibilitas.
- Dashboard mempertahankan sumber yang berhasil dibaca saat sumber lain gagal, menampilkan error/retry, dan memperbarui sumber saat fokus atau event perubahan jurnal/tujuan/keuangan. Tanggal diperbarui saat app aktif dan pergantian hari.
- Simpan tujuan kini ditunggu sebelum state/modal menyatakan berhasil; kegagalan mempertahankan draft. Reward tujuan memakai aksi `GOAL_COMPLETE`, bukan nama aksi yang tidak dikenal.

Sumber: [header](/Users/user/Projects/superapp/mobile/components/WhenyaHeader.tsx), [section](/Users/user/Projects/superapp/mobile/components/ui/DashboardSection.tsx), [layout](/Users/user/Projects/superapp/mobile/lib/layout.ts), [tugas](/Users/user/Projects/superapp/mobile/app/(app)/tasks.tsx), [timer](/Users/user/Projects/superapp/mobile/app/(app)/pomodoro.tsx).

### Definisi metrik dan reward

Minggu dimulai Senin dan berakhir Minggu dalam tanggal lokal. Persentase mingguan = tugas `done` ÷ seluruh tugas bertenggat pada minggu berjalan, termasuk jadwal mendatang. `cancelled`, `canceled`, dan `archived` dikecualikan. Habit, tugas tanpa tenggat, dan overdue sebelum minggu ini tidak masuk denominator. Pemindahan tugas mengikuti tenggat terbaru. Ini penyelesaian jadwal saat ini, bukan riwayat tanggal tombol selesai ditekan.

Life DNA adalah ringkasan indikator aplikasi, bukan pengukuran kesehatan atau kualitas pribadi. Rumus ditampilkan di sheet; angka dibatasi 0–100%:

| Indikator | Rumus dan periode |
| --- | --- |
| Fokus | Sesi fokus hari ini ÷ 4 sesi; tidak tersedia bila belum ada sesi |
| Rutinitas | Rata-rata penyelesaian kebiasaan hari ini dan latihan tujuh hari terakhir ÷ 3, hanya dari komponen yang tersedia |
| Arus kas | (Pemasukan − pengeluaran) bulan ini ÷ pemasukan; tidak tersedia tanpa pemasukan |
| Jurnal | Jumlah seluruh entri tersimpan ÷ 10; tidak tersedia bila belum ada entri |
| Penyelesaian | Rata-rata rasio tugas selesai yang tidak dibatalkan/diarsipkan dan progres tujuan yang tidak diarsipkan, dari komponen tersedia |

Tidak ada skor Social karena sumber/rumusnya belum didefinisikan. Radar hanya muncul bila minimal tiga indikator tersedia. Nol aktual tidak diganti nilai minimum. Pengaturan privasi menyembunyikan indikator keuangan dari angka dan radar. Pembagi 4/3/10 adalah target tampilan yang dijelaskan, bukan tolok ukur ilmiah. [Rumus](/Users/user/Projects/superapp/mobile/lib/lifeDna.ts), [sheet](/Users/user/Projects/superapp/mobile/components/LifeDnaSheet.tsx).

Reward baru menggunakan ID idempoten: sekali per tugas, per jurnal baru, per tujuan, dan per habit per tanggal. Batal/selesai ulang tidak menambah reward lagi. Check-in legacy yang sudah selesai dianggap sudah direward agar tidak membayar dua kali; tidak dilakukan penyesuaian XP historis. Habit menyimpan pending reward bila check-in berhasil namun XP gagal; retry pada hari yang sama tetap tersedia setelah hook dimuat ulang. Retry jurnal tersedia selama state sesi masih menyimpan kegagalan reward; pemulihan reward jurnal setelah restart belum diimplementasikan. Kegagalan XP tidak disamarkan sebagai kegagalan menyimpan jurnal/check-in.

### Riwayat notifikasi dan batas integrasi

Riwayat berisi maksimal 100 receipt nyata, terenkripsi, lokal per akun, dan tidak disinkronkan ke cloud. Pesan coach yang benar-benar diterima dicatat dengan ID stabil, termasuk ketika native notification library tidak tersedia. Receipt dari listener native memakai ID, judul, isi, tanggal, dan owner payload. Status baca disimpan sebelum UI berubah. Payload tanpa `historyOwner` atau milik akun lain tidak dimasukkan, agar pesan akun sebelumnya tidak masuk akun aktif. Pengirim remote yang belum menyediakan owner payload belum terintegrasi dengan riwayat ini.

Perubahan ini **tidak** membuktikan remote push Android/iOS telah aktif. Pesan `Remote push skipped (notifications library unavailable)` masih mungkin terjadi sesuai runtime. Tidak ada entri contoh yang ditampilkan sebagai pesan pengguna. [Riwayat](/Users/user/Projects/superapp/mobile/lib/notificationHistory.ts), [listener](/Users/user/Projects/superapp/mobile/lib/notifications.ts), [sheet](/Users/user/Projects/superapp/mobile/components/NotificationSheet.tsx).

### Bukti verifikasi dan batas klaim

- TypeScript: `pnpm --dir mobile exec tsc --noEmit` — exit 0.
- Jest mobile: `pnpm --dir mobile test -- --runInBand` — **10 suite, 68 tes lulus**. Mencakup tes lama serta regresi persistence, hook, komponen, notifikasi, dan rumus. Native primitives, router, dan layanan eksternal pada tes komponen dimock; ini bukan E2E perangkat.
- Expo export Android, iOS, web: `CI=1 EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 pnpm --dir mobile exec expo export --platform all --output-dir /tmp/whenya-review-verified` — berhasil. Ini bundle JavaScript/assets; bukan APK/IPA atau pengujian native terpasang.
- `git diff --check` — tidak ada error whitespace.
- Fixture layout 320 dp/font scale 1,8/tema gelap berhasil dirender dan memilih shortcut membungkus. Renderer tidak menghitung geometri native: tidak membuktikan tidak ada clipping atau target sentuh bertabrakan.
- Pada pemeriksaan awal belum ada simulator dan `adb` tidak ditemukan. **Pembaruan setup:** iOS 26.4 dan Expo Go SDK 57 kemudian dipasang; dashboard Whenya terlihat di Whenya iPhone (iPhone 17), koneksi Metro terdeteksi, dan Fast Refresh diuji dengan perubahan teks sementara lalu dikembalikan. Ini baru verifikasi setup dan tampilan awal, bukan kelulusan seluruh Tahap 3. Ada banner kegagalan sumber data serta peringatan migrasi iOS yang dicatat di [catatan setup](/Users/user/Projects/superapp/docs/mobile/IOS_SIMULATOR_WORKFLOW.md).
- Keyboard, notch, navigasi sistem, kualitas visual pada font besar, penerimaan push nyata, jaringan cloud lambat/offline, rekonsiliasi konflik akun nyata, dan uji pengguna belum diverifikasi lewat runtime native. Tidak ada klaim seluruh source aman atau seluruh aplikasi bebas bug.

Tes: [persistence](/Users/user/Projects/superapp/mobile/__tests__/reviewPersistence.test.js), [interaksi komponen](/Users/user/Projects/superapp/mobile/__tests__/reviewUI.test.js), [Life DNA](/Users/user/Projects/superapp/mobile/__tests__/lifeDna.test.js), [notifikasi](/Users/user/Projects/superapp/mobile/__tests__/notifications.test.js).

[Laporan audit awal](/Users/user/Projects/superapp/docs/mobile/WHENYA_UI_UX_VERIFICATION.md) dipertahankan sebagai snapshot sebelum perbaikan. Status lama “belum diperbaiki” dan nomor baris source di laporan itu bersifat historis; gunakan status implementasi terbaru di dokumen ini untuk kondisi setelah perubahan.

Temuan yang terbukti sudah ditangani pada source dan tes terkait. Definisi selesai secara keseluruhan belum diklaim terpenuhi sebelum validasi perangkat dan uji pengguna dilakukan.
