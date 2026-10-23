# Verifikasi satu per satu — WHENYA_MOBILE_UI_UX_IMPROVEMENTS.md

> **Snapshot audit sebelum perbaikan.** Implementasi dilanjutkan setelah laporan ini. Status “belum diperbaiki” dan nomor baris source di bawah merekam kondisi historis dan dapat tidak lagi cocok. Lihat [status implementasi dan bukti terbaru](/Users/user/Projects/superapp/docs/WHENYA_MOBILE_UI_UX_IMPROVEMENTS.md) untuk kondisi setelah perbaikan, hasil tes, serta batas validasi perangkat.

Tanggal audit: 22 Oktober 2026. Acuan: versi dokumen dan kode pada working tree saat pemeriksaan, termasuk bagian **Temuan tambahan**. Audit ini tidak mengubah kode aplikasi atau dokumen sumber.

**Kesimpulan:** tidak tepat menyebut seluruh isi dokumen sebagai bug yang sudah terbukti. Isinya mencampur rekomendasi desain, persyaratan implementasi, klaim status, dan temuan aktual. Temuan notifikasi statis, Life DNA dengan nilai semu, serta kode tidak terpakai benar. Banyak alur utama sudah ada dalam kode, tetapi klaim pencarian jurnal perlu dikoreksi dan sejumlah syarat belum dipenuhi atau belum diuji pada perangkat.

## Metode dan arti status

- **Terbukti:** ditemukan langsung di source atau direproduksi dengan fixture terkontrol.
- **Ada di kode:** implementasi terhubung secara statis; bukan bukti interaksi native telah lulus.
- **Sebagian:** ada implementasi tetapi masih ada syarat yang belum terpenuhi.
- **Rekomendasi:** pilihan desain yang masuk akal, bukan fakta bug maupun bukti bahwa solusi itu optimal.
- **Belum terverifikasi:** membutuhkan perangkat, pengukuran layout, screenshot pembanding, kondisi jaringan, atau pengguna nyata.

Pemeriksaan meliputi source dashboard, navigasi, sheet, pencarian, penyimpanan, hook tugas/kebiasaan/jurnal, tujuan, fokus, tema, terjemahan, serta tes yang relevan. Tidak ada screenshot awal yang tersedia dalam permintaan audit ini; tidak dilakukan observasi perangkat/emulator, pengujian keyboard native, atau percobaan pada akun cloud nyata. Source dan fixture tidak membuktikan semua kondisi visual.

## 1. Seluruh baris prioritas implementasi

| No. | Poin dokumen | Putusan | Bukti dan batas kesimpulan |
| --- | --- | --- | --- |
| P01 | Status bar dan safe area | Ada di kode; native belum terverifikasi | [Layout tab](/Users/user/Projects/superapp/mobile/app/(app)/_layout.tsx:31) memilih ikon terang/gelap; [layout bersama](/Users/user/Projects/superapp/mobile/lib/layout.ts:10) membaca inset; [dashboard](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:309) memakai padding atas/bawah. Ini tidak membuktikan notch dan ikon sistem terbaca pada semua perangkat. |
| P02 | Tugas sebelum progress/goals | Ada di kode; bukan lagi bug pada urutan saat ini | Tugas mulai [baris 401](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:401), kebiasaan 511, tujuan 585, mingguan 645. Kemudahan menemukannya pada layar kecil belum diukur. |
| P03 | Pencarian jelas dan benar | Sebagian; ada bug jurnal yang terkonfirmasi | Pill membuka `DashboardSearch`, placeholder sesuai fitur. Tugas/tujuan diambil dari state. Jurnal dibaca dengan [getData](/Users/user/Projects/superapp/mobile/components/DashboardSearch.tsx:19), padahal [useJournal](/Users/user/Projects/superapp/mobile/hooks/useJournal.ts:28) memakai penyimpanan terenkripsi. Uji reproduksi membuktikan pembaca biasa mengembalikan ciphertext dan pencarian memperlakukannya sebagai daftar kosong. |
| P04 | Progress kosong ringkas dan CTA | Ada untuk tanpa jadwal; arti “belum ada aktivitas” perlu dipersempit | [Cabang `summary.total === 0`](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:654) menyembunyikan grafik dan menawarkan pembuatan tugas. Bila ada jadwal namun 0 tugas selesai, grafik lengkap tetap ditampilkan dengan fill 0. Jadi jangan mengklaim semua kondisi 0 aktivitas telah dipadatkan. |
| P05 | Goal, langkah berikutnya, fokus | Sebagian | [Langkah journey pertama](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:294) ditampilkan. Tombol goal [membuka seluruh daftar tugas](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:632), tanpa hubungan task–goal. Tombol fokus tugas membawa `taskId`; konteks tampil di timer. Integrasi goal→tugas spesifik belum ada. |
| P06 | Tombol tambah membuka sheet dan form | Ada di kode; kenyamanan keyboard belum terverifikasi | [CreateActionSheet](/Users/user/Projects/superapp/mobile/components/CreateActionSheet.tsx:11) berisi empat aksi; param `create` diproses [useCreateAction](/Users/user/Projects/superapp/mobile/hooks/useCreateAction.ts:4). Ada tutup/backdrop/Android request-close. Sheet tidak berisi input; keyboard berada di form berikutnya dan tetap membutuhkan pengujian. |
| P07 | Notifikasi dashboard statis | Terbukti valid dan belum diperbaiki | [Badge “2 baru”](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:999) tetap; [empat objek inline](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:1008) berisi waktu dan klaim streak/progres tetap. [Titik unread](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:334) juga selalu dirender. Tidak dibaca dari riwayat notifikasi. |
| P08 | Life DNA tanpa data memakai angka semu | Terbukti valid dan belum diperbaiki | [dnaData](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:252) memakai `|| 20` dan MONEY 50 saat tanpa pemasukan. [Modal](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:904) tetap merender radar dan persentase tanpa cabang empty state. Radar berada dalam modal yang dibuka dari dashboard; bukan selalu tampil pada halaman utama. |
| P09 | Header dan teks panjang | Sebagian | Sapaan dibatasi dua baris, judul tugas/goal membuka detail. [WhenyaHeader](/Users/user/Projects/superapp/mobile/components/WhenyaHeader.tsx:119) memakai ellipsis satu baris, tetapi tidak menyediakan aksi membaca judul/subtitle lengkap; baris header [tingginya 52](/Users/user/Projects/superapp/mobile/components/WhenyaHeader.tsx:255). Tidak boleh disimpulkan aman untuk semua nama/font besar. |
| P10 | Konsistensi komponen | Rekomendasi valid; belum terpenuhi menyeluruh | Header, Button, sheet, dan hook bersama ada. Dashboard tetap memakai header/empty state sendiri; radius, spacing, dan bahasa belum sepenuhnya sama. Ukuran target sentuh belum universal. |
| P11 | Metrik/periode mingguan jelas | Ada di kode dan unit test | [dashboardSummary](/Users/user/Projects/superapp/mobile/lib/dashboardSummary.ts:12) menghitung tugas bertenggat Senin–Minggu; [UI](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:653) menampilkan rentang dan done/total. Metrik bukan riwayat waktu penyelesaian. Apakah pengguna memahami rumusnya belum diuji. |
| P12 | Loading, error, sukses, retry tanpa kehilangan input | Sebagian | Dashboard tugas dan form tugas punya penanganan ini. Toggle kebiasaan dashboard [mengubah state dan XP sebelum simpan](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:163), dan `setData` non-strict [menelan error](/Users/user/Projects/superapp/mobile/lib/storage.ts:90). Form jurnal juga tidak memiliki `finally` untuk kegagalan penyimpanan. Tidak valid menyatakan semua modul sudah aman terhadap kegagalan. |

## 2. Susunan dashboard yang disarankan

| Urutan/usulan | Hasil pemeriksaan |
| --- | --- |
| 1. Header ringkas | Header tersedia. Error dan banner sync dapat muncul sebelum header; “ringkas/nyaman” masih penilaian desain. |
| 2. Pencarian | Ada sesudah header, tetapi pencarian jurnal terenkripsi bermasalah. |
| 3. Kebiasaan, Jurnal, Tujuan, Kalender, Fokus | Kelima shortcut ada dengan rute yang tersedia; Tugas/Keuangan tetap ada di bawah. Pembagian lebar memakai `flex: 1`. |
| 4. Tugas hari ini | Urutan sesuai; `slice(0, 3)` membatasi tiga tugas terbuka. Tidak mengurutkan otomatis menurut urgensi/priority. |
| 5. Kebiasaan | Ada sesudah tugas; maksimal tiga. |
| 6. Goal aktif | Ada sesudah kebiasaan. “Utama” berarti goal aktif pertama dalam array, bukan pilihan prioritas eksplisit pengguna. |
| 7. Ringkasan mingguan | Ada sesudah goal; masih diikuti ringkasan keuangan dan insight. |
| Daftar lengkap melalui Tasks | Tombol “Lihat semua” membuka halaman Tugas. |
| Mudah ditemukan pada 320–360 dp | Belum terverifikasi. Lima shortcut, sapaan, dan kontrol lain tetap memakai ruang sebelum daftar tugas; urutan yang benar belum membuktikan tugas terlihat tanpa scroll. |

Bukti: [shortcut dan tugas](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:373), [pemilihan goal](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:291), [urutan berikutnya](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:511).

## 3. Detail perilaku utama, per butir

### Tugas hari ini

| Butir | Verifikasi |
| --- | --- |
| Judul, waktu/deadline, kontrol selesai | Ada. Deadline timestamp menampilkan waktu lokal; tanggal tanpa jam memakai “Hari ini”. Judul membuka form detail. |
| Overdue dipisahkan | Ada sebagai jumlah/tautan di atas daftar hari ini; tidak ada daftar overdue terpisah dalam dashboard. |
| Kosong dengan CTA Tambah tugas | Ada dan menuju form, dengan tenggat hari ini. |
| Semua selesai berbeda dari belum ada tugas | Ada, melalui `todayTotal > 0` ketika tidak ada tugas terbuka. |
| Setelah selesai ringkasan diperbarui | Ada lewat state `useTasks` dan hitung ulang summary. Ada pesan sukses empat detik. |
| Undo bila sesuai | Tidak ada tombol Undo khusus. Halaman Tugas bisa mengubah status kembali, tetapi itu bukan fitur Undo satu ketukan. Karena rekomendasinya kondisional, ketiadaan Undo bukan otomatis bug P0. |

Bukti: [render tugas](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:410), [empty state](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:495), [penyimpanan status](/Users/user/Projects/superapp/mobile/hooks/useTasks.ts:76), [form baru](/Users/user/Projects/superapp/mobile/app/(app)/tasks.tsx:119).

### Progress mingguan

| Butir | Verifikasi |
| --- | --- |
| Tidak ada fill semu pada nol | Ada: ring menggunakan stroke transparan saat 0; batang memakai tinggi 0%. Tidak berarti seluruh Life DNA sudah mengikuti aturan ini. |
| Bedakan track, aktual, hari mendatang | Track dan fill berbeda; hari mendatang diredupkan dan diberi label aksesibilitas. Untuk pengguna yang melihat layar, konteks mendatang terutama bergantung pada opacity, belum label teks “mendatang” yang terlihat. |
| Label metrik | Ada “Tugas minggu ini” dan “tugas selesai • berdasarkan tenggat”. |
| Rumus terdefinisi | Ada dan sesuai source. Audit memverifikasi keadaan saat ini, bukan kronologi apakah rumus ditetapkan sebelum menulis kode. |
| Overdue/dibatalkan/dipindahkan | Tenggat pada minggu ini tetap masuk; tenggat sebelum minggu ini tidak masuk. Status cancelled/canceled/archived dikecualikan. Dipindahkan mengikuti tenggat terbaru. |
| Tidak mencampur task dan habit | Benar untuk kartu mingguan. Habit tidak masuk `dashboardSummary`. |
| Denominator nol | Menampilkan “Belum ada tugas terjadwal” dan CTA; perhitungan mengembalikan 0 yang finite. |

Bukti: [perhitungan](/Users/user/Projects/superapp/mobile/lib/dashboardSummary.ts:12), [ring](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:667), [batang](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:699), [tes](/Users/user/Projects/superapp/mobile/__tests__/dashboardSummary.test.js:1).

### Goal dan sesi fokus

| Butir | Verifikasi |
| --- | --- |
| Nama, kategori, progress dipertahankan | Ada. Judul goal membuka detail; kategori/description dapat terpotong satu baris. |
| Satu langkah konkret | Memakai langkah `journey` pertama yang belum selesai. Jika kosong hanya instruksi menambah langkah, bukan langkah yang dibuat otomatis. |
| Konteks sebelum timer dimulai | Ada jika masuk dengan `taskId` valid. Judul ditampilkan, timer menunggu tombol mulai. Sesi selesai menyimpan ID/judul tugas. |
| Jika belum ada tugas arahkan memilih/membuat | Ada tautan memilih tugas; fokus bebas tetap dapat dimulai. Jangan menyatakan pengguna wajib memilih tugas atau selalu diarahkan otomatis. |
| Progress manual jangan tampak dihitung dari task | Prinsip kondisional masuk akal. Implementasi goal saat ini menghitung `progress` dari journey yang selesai, bukan dari task. Dashboard membaca nilai itu dan menulis “Progres dicatat pada halaman tujuan”. |

Bukti: [goal dashboard](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:596), [perhitungan journey](/Users/user/Projects/superapp/mobile/app/(app)/goals.tsx:140), [taskId dan reset timer](/Users/user/Projects/superapp/mobile/app/(app)/pomodoro.tsx:69), [konteks dan pilihan tugas](/Users/user/Projects/superapp/mobile/app/(app)/pomodoro.tsx:316), [metadata sesi](/Users/user/Projects/superapp/mobile/app/(app)/pomodoro.tsx:135).

### Navigasi mobile

| Butir | Verifikasi |
| --- | --- |
| Struktur bottom navigation | Saat ini Beranda, Tugas, Tambah, Keuangan, Lainnya. Apakah familiar untuk pengguna membutuhkan riwayat/uji pengguna. |
| State aktif ikon/warna/label | Ada ikon filled/outline dan tint aktif/inaktif. Label tetap ada pada empat tab; tombol tambah hanya ikon plus dengan label aksesibilitas. |
| Tambah membuka aksi, tidak pindah tab | Handler tombol membuka sheet; tidak memanggil navigasi ke `capture`. Rute `capture` lama masih ada untuk akses langsung, bukan aksi tombol bawah. |
| More memberi akses fitur lain | Ada Kebiasaan, Jurnal, Tujuan, Kalender, Fokus, Kesehatan, Bacaan, Prestasi, Sosial. Jangan menggeneralisasi bahwa seluruh route tersembunyi ada di More; Insights misalnya dibuka lewat dashboard. |
| Widget melayang milik app atau app lain | Belum terverifikasi; screenshot asal tidak tersedia. Dashboard mengimpor FAB tetapi tidak merendernya, sehingga impor itu sendiri bukan bukti widget yang menutup goal. |

Bukti: [tab](/Users/user/Projects/superapp/mobile/app/(app)/_layout.tsx:64), [aksi tambah](/Users/user/Projects/superapp/mobile/app/(app)/_layout.tsx:96), [More](/Users/user/Projects/superapp/mobile/app/(app)/more.tsx:146).

## 4. Seluruh target komponen dan prinsip visual

Ini adalah target desain dokumen, bukan daftar pelanggaran standar yang otomatis terbukti.

| Target | Keadaan aktual / penilaian |
| --- | --- |
| Padding horizontal 16–20 dp | Dashboard 20; beberapa layar utama/form masih 24. Belum konsisten dengan target, bukan bukti layout rusak. |
| Antar-section 20–24 dp | Dashboard banyak memakai margin 16/18. Target belum seragam. |
| Padding kartu 16–20 dp | Kartu utama dashboard 18; pola ini sesuai. Tidak semua kartu seluruh app diaudit. |
| Target sentuh minimal 48×48 | Banyak kontrol inti sudah 48. Namun tab pill shared hanya padding vertikal 6 + teks 12, tombol tutup notifikasi berupa ikon 24 tanpa minHeight/hitSlop. Tidak ada jaminan 48 pada semua kontrol. Back button shared berukuran visual 36 tetapi memiliki hitSlop 8; jangan menyebutnya otomatis gagal karena visualnya kecil. |
| Body 14–16 sp dan font scaling | Judul tugas dan kebiasaan 15, search 14. Supporting text masih 10–13. Tidak ditemukan pematian font scaling eksplisit pada source mobile yang dicari; ini tidak membuktikan layout aman saat skala besar. |
| Section 18–22 sp | Section utama 18 sesuai; beberapa judul kartu 15. Jangan menyebut seluruh judul sudah seragam. |
| Ikon navigasi sekitar 24 | Bottom tab 22; plus 28. Ini variasi kecil dari target “sekitar”, bukan bug sendiri. |
| Radius 2–3 token | Belum seragam; banyak angka inline (misalnya 7, 8, 10, 11, 12, 14, 16, 18, 20, 24). Token bersama ada tetapi belum dipakai menyeluruh. |
| Padding bawah sesuai nav+inset | Ada padding berbasis inset. Helper memakai asumsi tinggi berbeda dari style tab aktual; belum ada bukti konten tertutup, juga belum ada pengukuran perangkat yang membuktikan semuanya aman. |
| Cream, putih, hijau | Sesuai tema terang (#f7f4ec, #ffffff, #193f30). Tema gelap memang berbeda. |
| Gold aksen dan keterbacaan | Ada. Kalkulasi pasangan warna #C8AD80 pada putih menghasilkan rasio sekitar 2,15:1. Ini relevan untuk peninjauan; ikon dekoratif tidak otomatis memiliki tuntutan yang sama dengan teks informasi. |
| Jangan warna saja | Task/habit memakai check, nav memakai bentuk ikon, dan label metrik ada. Hari mendatang belum memiliki teks terlihat yang eksplisit; indikator unread ada dot/border, tetapi datanya masih statis. Belum audit aksesibilitas penuh. |
| Jangan bergantung pada hover | Tidak menemukan hover tooltip pada komponen dashboard yang diperiksa. Task/goal punya detail, tetapi judul/subtitle shared header yang terpotong tidak punya aksi detail. |
| Komponen bersama | Header, Button, sheet, hook, dan search ada. Shared section/empty-state belum dipakai seragam; dashboard menggunakan JSX/styles sendiri. |

Bukti: [token layout](/Users/user/Projects/superapp/mobile/lib/layout.ts:3), [styles dashboard](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:1094), [section title](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:1225), [shared tab pill](/Users/user/Projects/superapp/mobile/components/WhenyaHeader.tsx:323), [close notifikasi](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:1002), [button sizes](/Users/user/Projects/superapp/mobile/components/ui/Button.tsx:119), [tema](/Users/user/Projects/superapp/mobile/lib/theme.ts:63).

Tambahan hasil hitung warna dari nilai source: `textMuted` dark #505050 pada kartu #1a2d23 sekitar **1,80:1**, dan ikon hijau #193F30 pada kartu yang sama sekitar **1,24:1**. Ini bukti numerik pasangan warna berkontras rendah, bukan hasil pengamatan screenshot perangkat.

## 5. Bahasa dan setiap contoh microcopy

| Contoh dokumen | Keadaan aktual |
| --- | --- |
| Halo, Made 👋 | Menggunakan nama depan pengguna; ketika kosong fallback literal “Sahabat” tidak berubah di bahasa Inggris. |
| Cari tugas, catatan, atau tujuan… | Aktual “Cari tugas, jurnal, atau tujuan…”. Ini lebih jujur terhadap cakupan; Catatan tidak diindeks. Pencarian jurnal native tetap bermasalah. |
| Tugas hari ini | Ada, diterjemahkan melalui catalog. |
| 2 dari 5 tugas selesai | Aktual `2/5 tugas selesai`; makna sama, bukan ketidaksesuaian fungsional. |
| Belum ada tugas hari ini | Ada beserta versi Inggris. |
| Tambah tugas | Ada; kapitalisasi aktual “Tambah Tugas”. |
| Tujuan utama | Ada; versi Inggris catalog “Main Goals”. |
| Fokus pada tugas ini | Teks ini ada pada halaman Tugas; tombol dashboard memakai ikon + label aksesibilitas “Fokus pada {judul}”. Tombol kartu goal memakai “Pilih tugas untuk fokus”. |
| Lihat semua | Ada variasi “Lihat semua” dan “Lihat Semua”, yang juga diterjemahkan menjadi “View all”/“View All”. Kapitalisasi belum konsisten. |
| Satu layar diterjemahkan lengkap | Belum terbukti terpenuhi. Fallback Sahabat tidak diterjemahkan, kategori tugas ditampilkan mentah, dan sebagian istilah Life DNA tetap bergantung pada catalog. Nama/isi buatan pengguna memang tidak perlu diterjemahkan. |

Bukti: [nama](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:275), [pencarian](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:369), [kategori](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:489), [translator](/Users/user/Projects/superapp/shared/lib/translations.js:11).

## 6. Seluruh checklist tahapan pengerjaan

| Checkbox | Status audit |
| --- | --- |
| Tahap 1: status bar/safe area/bottom nav | Kode ada; validasi native terbuka. |
| Tahap 1: header ringkas/tugas dipindahkan | Urutan ada; keringkasan/kemudahan di layar kecil belum diuji. |
| Tahap 1: pencarian jelas | Label/alur ada; jurnal native gagal dibaca. |
| Tahap 1: progress kosong ringkas + CTA | Ada untuk denominator nol. |
| Tahap 2: bottom sheet tambah | Kode/rute/hook ada; interaksi native belum diuji. |
| Tahap 2: goal–next task–fokus | Journey dan task→timer ada; relasi goal→task belum ada. |
| Tahap 2: judul/ikon/bahasa/shared components | Sebagian; belum selesai menyeluruh. |
| Tahap 2: loading/error/empty/success | Sebagian; tugas lebih lengkap, kebiasaan/jurnal masih celah. |
| Tahap 3: layar kecil/besar | Tidak dilakukan pada audit ini. |
| Tahap 3: notch/gesture/tiga tombol | Tidak dilakukan pada audit ini. |
| Tahap 3: font besar/nama/judul panjang | Source ditinjau; tidak dilakukan pengujian visual. |
| Tahap 3: keyboard/offline/koneksi lambat | Belum pengujian interaksi nyata. Ada fixture kegagalan penyimpanan, yang berbeda dari jaringan/keyboard native. |
| Tahap 3: kosong/sebagian/semua selesai | Unit test summary ada; state tampilan belum dites lewat renderer/perangkat. |
| Tahap 3: setiap tombol benar | Rute utama di dokumen ditelusuri; tidak mengklaim audit setiap tombol seluruh aplikasi. |
| Tahap 3: summary mengikuti task/habit/goal | Ada state/event reload; hitung habit, jurnal, dan ringkasan keuangan masih temuan. |
| Tahap 3: uji pengguna | Tidak dilakukan pada audit ini. |

Checkbox yang belum dicentang tidak otomatis berarti tidak ada kode. Dokumen menggabungkan implementasi dengan syarat verifikasi visual; jangan mencentang semuanya hanya karena build lolos.

## 7. Pemeriksaan seluruh klaim “Status implementasi” dan “Temuan tambahan”

| Klaim | Hasil |
| --- | --- |
| Status bar/inset/padding tersedia | Benar pada source, belum bukti native. |
| Urutan/lima shortcut/maksimal tiga item | Benar; banner sync/error dapat mendahului header. |
| Tugas hari ini berbasis tenggat lokal; overdue terpisah; tugas baru tenggat hari ini | Benar sesuai summary dan form. |
| Pencarian tugas/jurnal/tujuan berfungsi pada data lokal | **Perlu koreksi:** tugas/tujuan terhubung; jurnal native terenkripsi tidak terbaca. Judul/isi hanya diindeks apabila data berbentuk array. |
| Hasil membuka detail dan tidak memanggil AI | Handler rute/detail ada; benar untuk jalur DashboardSearch. Input AI lama berbeda dan tidak dipakai pill dashboard. |
| Empat aksi membuka form; pengeluaran direset | Benar pada source. Habit membuka form yang ada tanpa mereset draft; dokumen tidak mengklaim reset habit. |
| Goal menampilkan journey tanpa menebak relasi | Benar. Ini sekaligus berarti integrasi goal→task khusus belum ada. |
| Task→focus membawa ID/judul dan menyimpan sesi | Benar pada source; timer native belum diuji. |
| Empty state dan progress tidak semu | Benar untuk tugas/kartu mingguan; **jangan diperluas ke Life DNA/notifikasi**. |
| Loading/retry/sukses dan input task tetap ada | Benar pada jalur tugas; tidak boleh digeneralisasi ke semua modul. |
| XP tugas dashboard tidak lagi diberikan dua kali | Benar: dashboard memanggil moveTask dan reward berada di hook. Habit punya masalah berbeda (lihat berikutnya). |
| Kontrol utama diperbesar, dua baris, shared hook | Benar untuk contoh yang ada; bukan bukti semua target 48×48 terpenuhi. |
| Rumus mingguan di bagian metrik sesuai kode | Benar. |
| Bukti tes 6 suite/34 tes | Benar pada rerun audit ini. Angka tersebut bukan jumlah tes UI. |
| Notifikasi empat entri dan badge statis | Benar dan belum diperbaiki. |
| Life DNA 20%/50% tanpa data | Benar dan belum diperbaiki; grafik tampil ketika modal dibuka. BODY juga memiliki fallback 20%. |
| quickActions/FAB/columnWidth/style tidak terpakai | Benar. AST menunjukkan masing-masing tiga identifier itu hanya muncul pada deklarasi/import; shortcut aktif memakai array inline. Contoh styles yang tidak diacu: `brandTitle`, `dateText`, `focusCard`, `xpHeader`. Ini masalah maintainability, bukan bukti crash atau performa buruk. |
| Seluruh cakupan pencarian sudah diverifikasi cocok | **Terlalu kuat:** nama kelompok pencarian cocok, tetapi jalur data jurnal salah. Perlu membedakan keberadaan label dari keberhasilan membaca data. |
| Definisi selesai belum diklaim penuh | Tepat; jangan mengubahnya menjadi “semua sudah valid/selesai”. |

## 8. Temuan tambahan yang terkonfirmasi saat audit

1. **Jurnal terenkripsi tidak masuk pencarian dan jumlah jurnal dashboard.** Pembaca biasa mengembalikan string ciphertext; komponen membuangnya menjadi `[]`. Reproduksi fixture satu jurnal terenkripsi berhasil. Jalur yang benar terbukti melalui `EncryptedStorage.getItem`. [Search](/Users/user/Projects/superapp/mobile/components/DashboardSearch.tsx:19), [loader/stat jurnal](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:119), [penyimpanan jurnal](/Users/user/Projects/superapp/mobile/hooks/useJournal.ts:43).
2. **Label “Total Pengeluaran Bulan Ini” menghitung seluruh riwayat.** Loader menjumlah semua pengeluaran tanpa filter bulan; kartu memakai hasil itu. Dua transaksi beda bulan akan sama-sama dihitung. [Jumlah semua transaksi](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:141), [label](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:733). Ini kartu ringkasan Beranda, bukan mesin laporan Keuangan baru yang sudah memfilter periode.
3. **Checklist habit dashboard memberi 0 XP.** Dashboard memakai `HABIT_COMPLETE`; tabel reward hanya punya `HABIT_DONE`, dengan fallback reward 0. Reproduksi `addXP` mengonfirmasi 0 versus 10 XP. [Pemanggilan dashboard](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:172), [tabel reward](/Users/user/Projects/superapp/mobile/lib/gamification.ts:27), [fallback](/Users/user/Projects/superapp/mobile/lib/gamification.ts:80).
4. **Streak dashboard dapat berbeda dari halaman Kebiasaan.** Dashboard menambah/mengurangi angka streak lama; hook menghitung ulang tanggal berurutan. Contoh tanggal 1 Oktober lalu 22 Oktober dengan streak lama 1: dashboard menjadi 2, sedangkan `habitStreak` pada tanggal 22 mengembalikan 1. [Dashboard](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:170), [hook](/Users/user/Projects/superapp/mobile/hooks/useHabits.ts:82), [fungsi shared](/Users/user/Projects/superapp/shared/lib/insights.js:76).
5. **Kegagalan simpan habit bisa tampak berhasil.** State berubah sebelum `setData`, XP dipanggil sebelum simpan, dan pemanggilan tidak strict. Ini mengikuti jalur kode; belum fault injection pada UI native. [Handler](/Users/user/Projects/superapp/mobile/app/(app)/index.tsx:163), [storage](/Users/user/Projects/superapp/mobile/lib/storage.ts:90).
6. **Save jurnal gagal dapat meninggalkan indikator saving aktif.** Error penyimpanan `addEntry/updateEntry` tidak ditangkap oleh blok try AI; baris `setIsSaving(false)` tidak tercapai saat promise penyimpanan reject. Tidak ada `finally` di jalur tersebut. [Submit jurnal](/Users/user/Projects/superapp/mobile/app/(app)/journal.tsx:86).

Ini bukti bahwa lolos tes yang ada tidak menjamin seluruh UX benar. Pemeriksaan ini hanya mencatat temuan; tidak menerapkan perbaikan.

## 9. Bukti pengujian yang benar-benar dijalankan

- `pnpm --dir mobile exec tsc --noEmit`: exit 0.
- `pnpm --dir mobile exec jest --runInBand`: 6 suite, 34 tes lulus.
- Fixture sementara: 1 tes membuktikan perbedaan pembaca journal terenkripsi; 2 tes membuktikan reward habit serta perhitungan streak. Ketiga tes lulus karena mengonfirmasi perilaku cacat yang diamati, **bukan** karena fitur telah benar. File fixture sementara sudah dihapus; tidak ada perubahan tes produksi dalam audit ini.
- Evaluasi translator untuk contoh microcopy; analisis AST untuk identifier/style tidak terpakai; hitung rasio pasangan warna dari token source.
- Percobaan import langsung fungsi shared melalui Node menemui extensionless import; verifikasi streak kemudian dijalankan melalui Jest dan berhasil. Tidak ada klaim hasil dari percobaan import yang gagal.
- Tidak menjalankan ulang build/native preview atau full suite shared untuk audit UX ini. Klaim bundling pada dokumen adalah bukti pekerjaan sebelumnya, bukan pengujian interaksi baru.

**Putusan akhir dokumen:** valid sebagai backlog desain yang berhati-hati dan sebagian besar sesuai kode, tetapi tidak valid sebagai klaim bahwa seluruh UI/UX sudah selesai atau semua temuan merupakan bug saat ini. Notifikasi, Life DNA, pencarian jurnal, konsistensi feedback, dan keterbacaan/target sentuh masih perlu ditangani; validasi perangkat dan uji pengguna tetap terbuka.
