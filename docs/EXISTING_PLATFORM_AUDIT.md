# Whenya — audit dan hasil implementasi

Tanggal: 17 Oktober 2026. Acuan: `WHENYA_MASTER_PLAN.md` dan empat board visual pengguna.

## Kondisi repository

Monorepo pnpm/Turbo dengan Next.js 16 App Router (JavaScript dan TypeScript checking), React Native/Expo, shared business logic, dan Go/Fiber. Backend existing menggunakan Fiber, bukan Gin seperti rekomendasi master plan. Memindahkan framework atau direktori tidak diperlukan untuk redesign dan berisiko memutus integrasi yang ada.

Working tree sudah berisi banyak perubahan sebelum pekerjaan ini, termasuk migrasi database, auth, finance repository dan penghapusan data PostgreSQL yang ter-track. Perubahan tersebut dipertahankan. Tidak ada reset, commit, migrasi database, deploy, atau publikasi yang dilakukan.

## Inventory fitur

| Modul | Web | Mobile | Hasil pekerjaan ini |
| --- | --- | --- | --- |
| Auth | AuthGuard, profil lokal, pemulihan, cloud account | Login/register/reset | Branding Whenya pada UI yang memakai nama lama |
| Dashboard | `/` | `(app)/index` | Ringkasan habit, tujuan, keuangan bulanan, task harian, loading/retry; prioritas P1 dikenali |
| Tugas | `/tasks` | `(app)/tasks` | Pencarian judul/deskripsi web; normalisasi status quick capture web/mobile |
| Kebiasaan | `/habits` | `(app)/habits` | Fungsi streak bersama, tanggal lokal, tidak dibatasi 60 hari; streak kemarin tetap berlaku sebelum check-in hari ini |
| Tujuan | `/goals` | `(app)/goals` | Arsip/pulihkan; normalisasi milestones/journey dan targetDate/deadline |
| Keuangan | `/finance`, `/finance/repository` | finance, finance-repository | Palet dan identitas baru; ringkasan insight dari transaksi bulan berjalan |
| Jurnal | `/journal` | `(app)/journal` | Quick capture mengisi judul/mood/tanggal; pencarian web toleran judul legacy kosong; mobile quick capture memakai storage terenkripsi seperti modul utama |
| Kalender | `/calendar` | `(app)/calendar` | Tema bersama; akses dari quick actions |
| Insights | `/insights` baru | `(app)/insights` baru | Task completion, habit 7/30 hari, progres tujuan, keuangan bulanan dari data tersimpan |
| Fokus | `/pomodoro` | `(app)/pomodoro` | Tema bersama |
| Modul tambahan | health, reading, achievements, squads, premium, notifications | health, reading, achievements, social, squad, more/profile | Dipertahankan, memperoleh palet/branding bersama |

Storage web memakai localforage dengan namespacing pengguna dan adapter shared. Mobile memakai AsyncStorage dan EncryptedStorage pada finance/journal. Auth lokal dan cloud merupakan dua jalur existing; pekerjaan ini tidak mengklaim migrasi penuh ke OIDC.

API existing mencakup context sync, user, social/squads, coach, parse, insights, storage migration/list, serta finance entities/accounts/journals/goals/forecast/imports/documents/research. Endpoint contoh dashboard/tasks/habits pada master plan belum semuanya tersedia sebagai CRUD terpisah. UI baru menggunakan storage existing dan tidak membuat endpoint dummy.

## Design dan kompatibilitas

- Palet hijau `#193F30`, sage `#9BAF99`, cream `#F7F4EC`, gold `#C8AD80`.
- Web memakai Plus Jakarta Sans melalui Google Fonts CSS; fallback system font jika offline. Native masih memakai font sistem existing.
- Mark W vektor dan gold dot yang konsisten di komponen web/mobile, favicon dan ikon PWA. Ini interpretasi vektor referensi, bukan ekstraksi logo resmi dari gambar.
- Mobile web navigation: Beranda, Tugas, tambah cepat, Insight, Profil. Expo menambahkan tab Insight; destination hub lainnya tetap tersedia.
- URL master plan dialihkan permanen ke route existing: dashboard, productivity/tasks/calendar/focus dan life/habits/goals/journal.
- Nama aplikasi Expo berubah; slug, scheme, package/bundle ID, EAS identity, nama package monorepo dan storage keys dipertahankan untuk kompatibilitas.
- Ikon raster/splash native existing belum diganti dengan aset produksi final.

## Definisi metrik

Task insight memakai seluruh tugas tersimpan; dashboard task harian memakai deadline/dueDate atau createdAt pada tanggal hari ini. Habit memakai check-in harian terhadap kebiasaan yang sudah dibuat pada tiap tanggal; belum memperhitungkan jadwal mingguan khusus. Goal memakai milestone, termasuk konversi journey mobile; arsip dikecualikan dari insight. Finance memakai tanggal transaksi pada bulan kalender lokal berjalan, bukan semua transaksi sepanjang waktu. Tidak ada persentase atau grafik contoh yang dipaksakan menjadi data pengguna.

## Verifikasi

- Production build Next.js berhasil, termasuk route Insight.
- Web ESLint berhasil.
- Shared test suite: 122 tes lulus, mencakup empty data, transaksi lintas bulan, nominal string, tanggal lokal, denominator habit, streak lintas bulan, arsip goal, dan kompatibilitas journey/milestones.
- TypeScript mobile dan shared lulus setelah perubahan terakhir.
- Browser: membuat profil lokal `Whenya QA`, membuka dashboard dan Insight, memeriksa layout pada lebar 390px (tidak ada horizontal overflow), membuat task lewat quick capture dan memverifikasi task masuk kolom To Do, kemudian memverifikasi pencarian menyaring task.
- Browser QA bukan E2E seluruh journey. Belum menjalankan APK, perangkat fisik, push notification, atau sinkronisasi dua perangkat.

## Pekerjaan yang masih diperlukan untuk seluruh master plan

Dokumen ini tidak menyatakan seluruh roadmap selesai. Sisa implementasi/validasi:

1. Audit kontrak API lengkap dan penyelarasan authenticated CRUD/sync lintas perangkat untuk semua modul; uji isolasi akun, khususnya jalur encrypted storage mobile existing.
2. Recurring tasks, reminder habit, goal history, journal rich text/attachments dan view kalender mingguan sesuai acceptance criteria yang belum dipenuhi implementasi existing.
3. Memastikan budgets/savings/reporting personal finance terhubung konsisten dengan finance repository, bukan menggabungkan dua model keuangan secara implisit.
4. Font native Plus Jakarta Sans, ikon/splash native final, serta QA visual per layar dan semua detail dialog terhadap board.
5. Perhitungan streak saat aplikasi dibuka setelah hari terlewat: fungsi bersama benar saat dipanggil; beberapa tampilan existing masih membaca cache `streak` tersimpan sampai check-in berikutnya.
6. Loading/empty/error/offline dan aksesibilitas setiap modul lama, pengujian integrasi backend/database dan journey E2E lengkap.
7. AI permissions/audit/rate limits/recommendations, external calendar sync, offline synchronization, observability dan analytics produksi.
8. Build dan uji Android, staging, backup/rollback, domain/store migration dan proses rilis. Semua ini memerlukan verifikasi lingkungan nyata; tidak dianggap selesai oleh build web.
