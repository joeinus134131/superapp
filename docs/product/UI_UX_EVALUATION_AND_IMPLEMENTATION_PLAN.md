# SelfOne UI/UX Evaluation & Implementation Plan

Tanggal audit: 2 Oktober 2026  
Cakupan: web desktop, responsive web, dan aplikasi Expo/React Native  
Tujuan pengalaman: clean, mudah dipahami, profesional, dan terasa personal/intim

## Ringkasan eksekutif

SelfOne sudah memiliki fondasi visual yang cukup kuat: warna gelap konsisten,
aksen ungu–cyan mudah dikenali, komponen kartu relatif seragam, dan cakupan
fiturnya lengkap. Masalah utamanya bukan kekurangan fitur, tetapi beban kognitif,
fragmentasi pola antarlayar, dan kurangnya narasi produk yang membantu pengguna
menentukan “apa yang perlu saya lakukan sekarang?”.

Prioritas desain sebaiknya bergeser dari **kumpulan modul** menjadi **pendamping
harian**. Dashboard harus menjadi pusat keputusan harian, Quick Capture menjadi
jalur input universal, dan modul lain menjadi detail yang dapat ditemukan saat
dibutuhkan. Nuansa intim dibangun lewat konteks, progres, bahasa yang hangat, dan
kontrol privasi—bukan lewat lebih banyak emoji atau dekorasi.

### Penilaian awal

| Area | Skor | Observasi |
|---|---:|---|
| Konsistensi visual | 6.5/10 | Palet cukup konsisten, tetapi banyak nilai/style lokal dan variasi pola komponen. |
| Information architecture | 5/10 | Web menampilkan terlalu banyak tujuan utama; mobile memindahkan terlalu banyak fitur ke “Lainnya”. |
| Kejelasan tugas utama | 5/10 | Modul lengkap, tetapi prioritas harian dan next best action belum dominan. |
| Onboarding & activation | 5/10 | Meminta profil/avatar lebih dulu tanpa memperlihatkan nilai inti atau goal setup. |
| Responsiveness | 6/10 | Breakpoint dasar tersedia; beberapa pola hanya ditumpuk, belum didesain ulang untuk layar kecil. |
| Accessibility | 2.5/10 | Label semantik, focus state menyeluruh, reduced motion, dan screen-reader support minim. |
| Trust & privacy UX | 5/10 | Pesan local storage/E2E ada, tetapi model penyimpanan dan status sinkronisasi tidak mudah dipahami. |
| Cross-platform parity | 5.5/10 | Warna dan fitur serupa, tetapi hierarchy, istilah, login, dan navigasi berbeda. |
| Emotional quality | 6/10 | Ramah dan gamified, tetapi kadang terasa ramai/juvenile dan belum kontekstual. |

## Temuan berbasis audit

### 1. Information architecture terlalu berorientasi modul — P0

Web menampilkan kurang lebih 15 menu dalam beberapa kelompok. Mobile memiliki
enam tab utama lalu menaruh goals, health, journal, reading, calendar,
achievements, social, dan settings di halaman “Lainnya”. Akibatnya:

- pengguna baru harus memahami struktur produk sebelum memperoleh manfaat;
- kepentingan semua fitur terlihat hampir sama;
- perpindahan web ↔ mobile terasa seperti mempelajari produk berbeda;
- mobile “Lainnya” menjadi sitemap, bukan destination yang berguna.

**Arah perbaikan:** gunakan empat destination lintas platform:

1. **Hari Ini** — agenda, fokus, kebiasaan, ringkasan uang/kesehatan, insight.
2. **Rencana** — tasks, goals, calendar.
3. **Catatan** — journal, finance, health, reading/history.
4. **Saya** — progress, achievements, social, settings, data/privacy.

Quick Capture tetap menjadi aksi global. Di desktop, destination dapat diperluas
menjadi submenu; di mobile gunakan empat tab + tombol capture. Pengguna boleh
pin maksimal tiga modul favorit, sehingga power user tetap cepat tanpa
menambah beban semua pengguna.

### 2. Dashboard belum menjadi command center — P0

Dashboard berisi banyak ringkasan, level, insight, dan kartu, namun belum punya
urutan keputusan yang tegas. Pengguna seharusnya dalam lima detik dapat menjawab:

- apa yang paling penting hari ini;
- apa yang sudah berjalan baik;
- satu tindakan berikutnya;
- apakah data terakhir sudah aman/sinkron.

**Susunan yang direkomendasikan:**

1. greeting kontekstual singkat + tanggal;
2. “Fokus berikutnya” dengan satu primary CTA;
3. strip progres hari ini (tasks, habits, focus), maksimal tiga metrik;
4. timeline/agenda gabungan;
5. insight personal tunggal yang dapat dijelaskan (“karena…”);
6. modul sekunder yang bisa dikustomisasi.

Hindari deretan kartu statistik yang bobot visualnya sama. Gunakan progressive
disclosure: detail dibuka dari kartu, bukan ditampilkan semua sekaligus.

### 3. Onboarding belum menjelaskan value dan komitmen privasi — P0

Web langsung meminta nama dan memilih satu dari 32 avatar. Pada mobile, login dan
onboarding menggunakan alur serta identitas yang berbeda. Banyaknya pilihan
avatar memperlambat aktivasi dan membuat kesan awal lebih playful daripada
profesional.

**Alur baru, maksimal 4 langkah:**

1. Value proposition: “Satu tempat untuk membuat harimu lebih terarah.”
2. Pilih outcome: lebih fokus / finansial teratur / habit sehat / semuanya.
3. Buat tindakan pertama yang nyata (task, habit, atau target), bukan hanya profil.
4. Pilih penyimpanan dan jelaskan privasi: perangkat saja atau akun + sinkronisasi.

Nama/avatar dijadikan opsional dan dapat dilewati. Setelah selesai, tampilkan
dashboard yang sudah terisi dari jawaban pengguna, bukan empty state generik.

### 4. Visual hierarchy perlu lebih tenang dan profesional — P1

Saat ini banyak gradien, glow, emoji, card border, dan bobot `800/900` digunakan
bersamaan. Setiap elemen ingin menarik perhatian sehingga hierarki melemah.

**Aturan visual baru:**

- satu aksen utama per screen; warna kategori hanya sebagai semantic accent;
- gradien hanya untuk brand/primary action, bukan dekorasi umum;
- gunakan maksimal tiga elevation levels;
- default heading weight 650–700, bukan hampir seluruhnya 800–900;
- emoji untuk ekspresi personal atau empty state, bukan sebagai sistem ikon;
- gunakan whitespace untuk grouping sebelum menambah border/card;
- card hanya bila konten benar-benar satu unit interaktif.

### 5. Design system belum menjadi sumber kebenaran — P0 teknis

Web memiliki sekitar 657 blok inline-style dan CSS global yang panjang. Mobile
sudah memiliki theme colors dan beberapa primitives, tetapi banyak screen tetap
menentukan font size, radius, warna, dan spacing sendiri. Ini menyebabkan drift,
review lambat, dan dark/light mode yang tidak konsisten.

Bangun shared semantic tokens:

```text
color.bg.canvas / surface / elevated
color.text.primary / secondary / subtle / inverse
color.action.primary / hover / pressed / disabled
color.status.success / warning / danger / info
space.1=4, 2=8, 3=12, 4=16, 5=24, 6=32
radius.control=12, card=16, modal=20, pill=999
type.display / h1 / h2 / body / label / caption
motion.fast=120ms, normal=200ms, slow=320ms
```

Komponen minimum lintas platform: Button, IconButton, Input, Select, Search,
Card, ListRow, Stat, Badge, Tabs/SegmentedControl, EmptyState, Skeleton, Toast,
Dialog/BottomSheet, PageHeader, SectionHeader, SyncStatus, ErrorState.

Web dan mobile tidak harus berbagi implementasi, tetapi harus berbagi nama,
state, token, hierarchy, dan acceptance criteria.

### 6. Responsive web masih berupa “desktop yang ditumpuk” — P1

Breakpoint saat ini terutama mengubah grid menjadi satu kolom dan sidebar
menjadi drawer. Pada viewport 390 px, halaman masuk masih terasa sangat panjang:
hero besar, tiga tab dengan label membungkus, dan 32 avatar sebelum CTA.

**Perbaikan:**

- desktop content max-width 1280–1440 px; line-length body maksimal 70 karakter;
- tablet memakai compact rail/drawer dan two-pane bila relevan;
- mobile web memakai top bar + bottom navigation yang sama dengan mobile native;
- modal pada ponsel menjadi bottom sheet/full screen sesuai kompleksitas;
- login mobile: hero lebih kecil, mode masuk sebagai link/segmented compact,
  avatar ditunda;
- jangan hanya mengecilkan font; ubah hierarchy dan urutan konten.

### 7. Accessibility merupakan blocker kualitas — P0

Audit statis menemukan sangat sedikit semantik eksplisit pada web dan tidak
menemukan `accessibilityLabel`/`accessibilityRole` pada komponen mobile yang
dipindai. Tombol ikon dan emoji berisiko tidak memiliki nama yang dapat dibaca.

Target minimum:

- WCAG 2.2 AA untuk web;
- contrast 4.5:1 body text dan 3:1 large text/UI boundaries;
- keyboard navigation lengkap, visible focus ring, skip link;
- semua IconButton memiliki accessible name;
- field memiliki label terasosiasi, hint, error, dan status loading;
- dialog mengunci fokus, Escape menutup, fokus kembali ke trigger;
- target sentuh minimal 44×44 web dan 48×48 mobile;
- dukung font scaling sampai 200% dan Dynamic Type;
- `prefers-reduced-motion`/Reduce Motion;
- status warna selalu disertai ikon atau teks;
- TalkBack dan VoiceOver smoke test untuk alur kritis.

### 8. Bahasa produk belum sepenuhnya konsisten — P1

Ada campuran Indonesia/Inggris seperti “AI Coach”, “Quick Capture”, “Sync”,
“Explorer”, “Stable”, dan beberapa fallback hardcoded. Label mobile tersembunyi
juga memakai Inggris. Tone perlu hangat tetapi tidak menggurui.

**Voice principles:** singkat, konkret, tidak menyalahkan, transparan.

- “Kamu belum konsisten” → “Mau lanjutkan ritme kemarin?”
- “Sync gagal” → “Belum tersimpan ke cloud. Data di perangkat tetap aman.”
- “Hapus Semua Data” → jelaskan lingkup, dampak, backup, dan konfirmasi spesifik.

Gunakan satu glossary Indonesia/Inggris dan larang string user-facing langsung
di component selain fallback darurat.

### 9. State penting belum mempunyai pola terpadu — P0

Setiap fitur perlu menangani:

- first-use empty state dengan satu aksi;
- loading skeleton yang menyerupai layout akhir;
- error inline yang dapat dipulihkan;
- offline state;
- optimistic update + undo;
- sync pending/conflict/verified;
- permission denied;
- premium/locked state tanpa dead end.

Saat migrasi PostgreSQL berjalan, status data harus terlihat sebagai bahasa
produk: **Tersimpan di perangkat**, **Menunggu sinkronisasi**, **Tersimpan**, atau
**Perlu tindakan**. Jangan menjadikan istilah database sebagai beban pengguna.

### 10. Nuansa “intim” harus dibangun secara etis — P1

SelfOne menangani jurnal, finansial, kesehatan, dan kebiasaan. Personalisasi akan
terasa intim hanya jika pengguna memahami dan mengontrolnya.

- jelaskan mengapa insight muncul dan data apa yang digunakan;
- izinkan modul sensitif disembunyikan dari dashboard;
- sediakan mode privasi untuk saldo, jurnal, dan notifikasi;
- beri kontrol atas gaya komunikasi: suportif, netral, atau tegas;
- gunakan check-in ringan, bukan notifikasi yang membuat rasa bersalah;
- insight sensitif harus opt-in dan dapat dihapus;
- avatar/nama, sapaan, dan goal memengaruhi pengalaman secara relevan.

## Target experience lintas platform

### Web desktop

- left navigation compact, dapat collapse, maksimum empat kelompok utama;
- header konsisten berisi breadcrumb/title, sync status, search/capture, profile;
- canvas menggunakan max-width dan grid 12 kolom;
- forms panjang memakai section + sticky action bar;
- data-heavy modules dapat memanfaatkan table/two-pane, bukan meniru mobile.

### Mobile native

- empat tab utama + central capture;
- halaman “Saya” menggantikan “Lainnya” sebagai destination bermakna;
- one-hand reach: aksi primer berada di lower half/bottom sheet;
- gunakan native patterns untuk date picker, alerts, share, biometrics;
- loading/offline/sync state tidak memblokir input;
- haptics hanya untuk confirmation, selection, dan warning penting.

### Responsive web

- hierarchy mengikuti mobile, tetapi tetap mempertahankan keyboard support;
- bottom navigation pada lebar kecil;
- data table berubah menjadi list/detail, bukan overflow horizontal tanpa konteks;
- safe-area dan virtual keyboard diperhitungkan.

## Roadmap implementasi

### Fase 0 — Baseline dan keputusan produk (3–5 hari)

Deliverables:

- tetapkan 3 persona/jobs-to-be-done utama;
- pilih 5 alur kritis: activation, plan today, quick capture, review progress,
  backup/restore;
- inventaris semua route/screen dan owner datanya;
- rekam baseline funnel, task completion, error, dan retention;
- putuskan IA empat destination dan glossary.

Exit criteria: sitemap, user-flow, success metrics, dan daftar route lama→baru
disetujui.

### Fase 1 — Foundations/design system (1–2 minggu)

Deliverables:

- semantic tokens web dan mobile;
- typography scale, spacing, radii, elevation, icons, motion;
- core component library beserta state dan contoh;
- Storybook atau component gallery web; preview screen mobile;
- lint rule untuk warna/spacing hardcoded baru;
- accessibility checklist otomatis dan manual.

Exit criteria: core components mencapai WCAG AA, dark/light theme parity, dan
tidak ada inline style baru pada feature yang dimigrasikan.

### Fase 2 — IA, shell, dan onboarding (1–2 minggu)

Deliverables:

- web navigation baru dan mobile four-tab navigation;
- global header, search, capture, sync indicator;
- onboarding outcome-first empat langkah;
- empty states dan sample starter data;
- konsistensi auth/profile antara web dan mobile.

Exit criteria: pengguna baru membuat item pertama ≤2 menit; seluruh fitur lama
tetap dapat ditemukan ≤2 interaksi dari destination utama.

### Fase 3 — Hari Ini + Quick Capture (2 minggu)

Deliverables:

- dashboard command center baru;
- unified daily timeline;
- next best action;
- capture task/habit/expense/journal dari satu pola;
- undo, offline queue, dan sync feedback;
- widget order/pinning.

Exit criteria: ≥80% usability-test participants dapat menentukan dan
menyelesaikan aksi terpenting tanpa bantuan.

### Fase 4 — Migrasi modul (3–5 minggu, incremental)

Urutan berdasarkan frekuensi dan dependensi:

1. Tasks + Goals + Calendar
2. Habits + Pomodoro
3. Finance
4. Journal + Health
5. Reading + Achievements + Social
6. Settings, data, privacy, premium

Untuk setiap modul: map user journey → wireframe → component migration → state
matrix → accessibility → analytics → usability test → rollout flag.

Exit criteria per modul: functional parity, empty/loading/error/offline states,
AA contrast, keyboard/screen reader smoke test, dan tidak ada P0/P1 defect.

### Fase 5 — Personalization dan intimacy (1–2 minggu)

Deliverables:

- configurable dashboard;
- communication style preference;
- explainable insights;
- privacy mode per module;
- notification preference center dan quiet hours;
- weekly review yang suportif.

Exit criteria: personalisasi dapat dinonaktifkan, sumber insight transparan, dan
tidak ada sensitive data pada notification preview tanpa izin.

### Fase 6 — Hardening dan rollout (1–2 minggu)

Deliverables:

- responsive/device matrix QA;
- VoiceOver/TalkBack/keyboard audit;
- performance budget dan bundle/profile review;
- visual regression tests;
- staged release 5% → 25% → 50% → 100%;
- rollback playbook dan support FAQ.

## Prioritized implementation backlog

| ID | Priority | Item | Platform | Effort |
|---|---|---|---|---:|
| UX-001 | P0 | Finalize four-destination IA and route mapping | Both | M |
| UX-002 | P0 | Semantic design tokens and core components | Both | L |
| UX-003 | P0 | Accessible navigation, controls, forms, dialogs | Both | L |
| UX-004 | P0 | Outcome-first onboarding and first-action activation | Both | L |
| UX-005 | P0 | Dashboard “Hari Ini” hierarchy | Both | L |
| UX-006 | P0 | Unified empty/loading/error/offline/sync states | Both | L |
| UX-007 | P0 | Auth, profile, and data-status parity | Both | L |
| UX-008 | P1 | Mobile bottom navigation and “Saya” screen | Mobile | M |
| UX-009 | P1 | Responsive-web bottom nav and bottom-sheet patterns | Web | M |
| UX-010 | P1 | Quick Capture redesign with undo | Both | M |
| UX-011 | P1 | Indonesian/English glossary and copy audit | Both | M |
| UX-012 | P1 | Privacy modes and explainable insights | Both | M |
| UX-013 | P1 | Replace inline styles/hardcoded values incrementally | Both | L |
| UX-014 | P2 | Subtle motion and haptic system | Both | S |
| UX-015 | P2 | Dashboard customization and pinned modules | Both | M |

## Definition of done untuk setiap screen

- tujuan screen dan primary action dapat disebutkan dalam satu kalimat;
- satu H1, hierarchy heading berurutan, dan copy telah masuk i18n;
- seluruh interactive states: default, hover/focus/pressed, disabled, loading;
- empty, error, offline, sync pending, dan success tersedia;
- keyboard + screen reader path diverifikasi;
- touch target, contrast, font scaling, safe area, dan reduced motion lulus;
- diuji pada 320/390/768/1024/1440 px web;
- diuji minimal satu perangkat Android kecil dan satu iPhone;
- analytics event tidak menyimpan journal/financial/health content;
- screenshot regression dan acceptance test lulus.

## Metrics keberhasilan

### Activation

- waktu sampai item pertama dibuat;
- persentase onboarding selesai;
- persentase user kembali pada hari ke-1 dan hari ke-7.

### Efficiency

- waktu dan jumlah tap untuk add task/expense/journal;
- success rate menemukan fitur;
- penggunaan Quick Capture dan undo rate.

### Quality

- task completion ≥90% untuk alur kritis;
- accessibility violations P0/P1 = 0;
- crash-free sessions ≥99.8%;
- web Core Web Vitals “good” pada p75;
- sync success dan restore success ≥99%.

### Perception

Uji berkala dengan lima pernyataan skala 1–5:

- “Saya tahu apa yang harus dilakukan berikutnya.”
- “Aplikasi terasa tenang, bukan ramai.”
- “Saya percaya data saya aman.”
- “Aplikasi memahami kebutuhan saya tanpa terasa mengawasi.”
- “Web dan mobile terasa sebagai produk yang sama.”

## Risiko dan guardrails

- Jangan redesign seluruh modul sekaligus; gunakan feature flag dan vertical
  slice agar produk tetap dapat dirilis.
- Jangan menghapus navigasi lama sebelum telemetry membuktikan route baru mudah
  ditemukan.
- Jangan menggunakan dark patterns untuk premium, notification, atau cloud sync.
- Jangan menampilkan insight sensitif pada lock screen secara default.
- Jangan menghapus local cache sampai migrasi database terverifikasi dan restore
  drill berhasil.
- Jangan mengejar visual polish sebelum P0 IA, accessibility, dan state handling
  selesai.

## Urutan pekerjaan yang direkomendasikan sekarang

1. Workshop singkat untuk menyetujui IA empat destination dan lima critical flow.
2. Implement semantic tokens + Button/Input/Card/IconButton/Dialog/PageHeader.
3. Redesign onboarding dan shell navigasi sebagai vertical slice web dahulu.
4. Bangun dashboard “Hari Ini” web dan ukur usability.
5. Port tokens, navigation, onboarding, dan dashboard ke mobile.
6. Migrasikan modul satu per satu sesuai urutan Fase 4.
7. Tambahkan personalisasi setelah hierarchy dan data trust stabil.

Dokumen ini menjadi baseline. Setiap perubahan besar harus memperbarui route
mapping, component inventory, state matrix, accessibility evidence, dan metrik
yang terdampak.
