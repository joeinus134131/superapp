# Review Penuh — SelfOne Mobile (`mobile/`)

> **Tanggal review:** 16 Oktober 2026
> **Cakupan:** seluruh `mobile/` — 27 layar/rute (app + auth), 20 komponen, 10 hook, 5 context, 13 modul `lib/`, konfigurasi build (Expo SDK 57, RN 0.86.3, expo-router, EAS), ±13.200 baris TS/TSX
> **Metode:** audit statis menyeluruh + verifikasi langsung tiap temuan kritis (read file, grep lintas file, cek git tracking). Setiap temuan bernomor `M-xx` dilengkapi lokasi `file:line` dan rekomendasi.
> **Dokumen terkait:** [`../comprehensive_evaluation.md`](../comprehensive_evaluation.md) (evaluasi monorepo 12 Okt 2026 — review ini memperbarui bagian mobile)

---

## 1. Ringkasan Eksekutif

Mobile app adalah aplikasi offline-first Expo SDK 57 dengan 14+ modul (tasks, habits, finance, journal, goals, health, reading, pomodoro, social, calendar, achievements, squads, capture, finance-repository). Fondasinya sudah bagus: arsitektur layering rapi, storage namespaced per-user, enkripsi lokal untuk modul sensitif, dan profil build EAS yang lengkap.

**Tapi ada 2 masalah yang bersifat merusak data (data loss) dan beberapa masalah keamanan yang harus diselesaikan sebelum rilis:**

1. **Data loss aktif — QuickCapture menimpa seluruh data Finance & Journal.** `QuickCaptureModal` membaca modul dengan layer storage *plain* (`getData` dari `lib/storage.ts`) sementara tulisannya dilakukan via `EncryptedStorage`. Data terenkripsi dibaca sebagai string base64 → bukan array → di-reset jadi `[]` → seluruh riwayat transaksi/jurnal user hilang. Ini bug nyata, bukan teoretis.
2. **Konsistensi codec storage.** Ada 3 layer storage dengan codec berbeda di key yang sama; campuran pemakaian menyebar ke dashboard, achievements, dan konteks AI (count journal jadi "jumlah karakter base64", badge "budget master" mustahil terkunci, mood AI selalu `neutral`).
3. **Keamanan:** PIN aplikasi disimpan & dibandingkan plaintext (tanpa hash), fallback master key enkripsi hardcoded, `SYNC_PASSWORD` plaintext + fitur mati, dan Groq API key di-bundle ke binary app (arsitektur direct-to-client).
4. **Sync yang tidak andal:** modul terenkripsi (Finance/Journal) selalu dilewati saat sync ke backend karena JSON parse gagal di layer shared; beberapa modul tidak pernah memicu sync sama sekali; ada 3 jalur pemicu sync tanpa de-duplikasi.

### Scorecard Mobile

| Area | Status | Catatan singkat |
|---|---|---|
| Data integrity | **KRITIS** | Data loss aktif di QuickCapture (M-01, M-02); mismatch codec di 4+ pembaca (M-03) |
| Keamanan | **TINGGI–KRITIS** | PIN plaintext (M-06), master key fallback (M-07), API key AI di client (M-08), Firebase config ter-commit (M-20) |
| Sync & data cloud | **TINGGI** | Modul terenkripsi selalu di-skip (M-10), modul tanpa sync, multi-pemicu tanpa queue (M-11) |
| Auth & sesi | **SEDANG** | Alur lengkap & robust, tapi register tanpa token (M-13), session dual-source (M-14) |
| Gamifikasi | **SEDANG** | XP action typo → 0 XP (M-09), race condition read-modify-write (M-12) |
| Performa | **SEDANG** | Effect re-run per perubahan task (M-16), `StyleSheet.create` di render (M-23), timer di state updater (M-15) |
| UX & state | **SEDANG** | Hampir semua layar tanpa error state; loading state hanya di 2 layar |
| Aksesibilitas | **TINGGI** | Dozen tombol icon-only tanpa `accessibilityLabel`; `ui/Button` justru terbaik di codebase |
| i18n | **SEDANG** | `LanguageProvider` ada tapi mayoritas copy hardcoded Indonesia + beberapa Inggris campur |
| Testing | **KRITIS** | Jest terkonfigurasi, **0 test** di mobile |
| Build & release | **BAIK** | Profil EAS lengkap, preflight script, env ter-gitignore; submit config masih placeholder (M-19) |
| Arsitektur | **BAIK** | Layering jelas, provider rapi, adapter pattern untuk shared storage |

### Top 10 — Kerjakan Dulu

| # | Masalah | Lokasi | Prioritas |
|---|---|---|---|
| 1 | M-01 QuickCapture hapus seluruh data Finance | `components/QuickCaptureModal.tsx:71-78` | **P0** |
| 2 | M-02 QuickCapture hapus seluruh data Journal | `components/QuickCaptureModal.tsx:128-135` | **P0** |
| 3 | M-03 Pembaca codec salah (dashboard/achievements/AI) | `index.tsx:94`, `achievements.tsx:104`, `lib/ai.ts:26` | **P0** |
| 4 | M-06 PIN plaintext tanpa hash | `context/securityContext.tsx:60-66,101-109` | **P0** |
| 5 | M-09 Goal completion memberi 0 XP (typo action key) | `app/(app)/goals.tsx:121` | **P1** |
| 6 | M-10 Sync cloud selalu skip Finance/Journal (enkripsi) | `lib/syncService.ts:14-42` | **P1** |
| 7 | M-15 Pomodoro: side-effect di state updater → double record di StrictMode | `app/(app)/pomodoro.tsx:101-109` | **P1** |
| 8 | M-16 Dashboard re-load 8 key + re-register push tiap perubahan task | `app/(app)/index.tsx:87-152` | **P1** |
| 9 | M-08 Groq API key di-bundle ke binary app | `lib/ai.ts:5` | **P1** |
| 10 | M-19 Submit config EAS placeholder + path service account salah | `eas.json:32-44` | **P1** |

---

## 2. Arsitektur Saat Ini

### 2.1 Struktur provider (`app/_layout.tsx:121-135`)

```
ThemeProvider → SettingsProvider → SecurityProvider → AuthProvider → PremiumProvider → LanguageProvider → RootNavigator
```

- `initMobileStorage()` dipanggil di module scope (`app/_layout.tsx:20`) — benar, sebelum komponen render.
- Splash di-hold sampai font + bootstrap auth selesai (`app/_layout.tsx:95-119`) — pola yang benar.
- Root navigator deklaratif: `(app)` jika ada `user`, else `(auth)`; `LockScreen` override jika `isLocked`; `onboarding` gate di depan auth.
- `initAutoSyncListener()` (`app/_layout.tsx:115`) memicu sync 1,5 detik setelah koneksi kembali — bagus.

### 2.2 Tiga layer storage (akar dari sebagian besar bug data)

| Layer | File | Codec | Pemakai utama |
|---|---|---|---|
| Plain + namespaced | `lib/storage.ts` (`getData/setData`) | JSON, key `${userId}_superapp_*` | tasks, health, reading, goals, pomodoro, gamification, **pembaca yang salah** di index/achievements/ai |
| Encrypted | `lib/secureStorage.ts` (`EncryptedStorage`) | AES (master key di SecureStore), **key sama** | `useFinance` (TRANSACTIONS), `useJournal` (JOURNAL) |
| Shared adapter | `shared/lib/storage.js` via `lib/storageAdapter.ts` | JSON + namespaced | `lib/syncService.ts` (read-only) |

**Bahaya utama:** layer plain dan encrypted berbagi nama key. `getData` plain membaca blob terenkripsi dan *mengembalikan string mentah* (`lib/storage.ts:72-77`) — caller yang tidak `Array.isArray` akan memegang data korup tanpa error. Sementara `shared/lib/storage.js` mengembalikan `null` untuk string yang bukan JSON — jadi modul terenkripsi selalu lenyap dari payload sync.

Catatan desain lain:
- Migration data legacy → namespaced ada dan benar (`lib/storage.ts:55-68`, `LEGACY_OWNER_KEY`).
- `EncryptedStorage.getItem` punya fallback `JSON.parse` untuk data legacy plaintext (`lib/secureStorage.ts:84-90`) — migration path yang baik.
- CryptoJS di-hijack ke `expo-crypto` untuk random bytes di Expo Go (`lib/secureStorage.ts:11-24`) — fix yang valid, tapi fragile terhadap upgrade versi.

### 2.3 Auth & sesi

- Supabase (`@superapp/shared`) sebagai sumber auth; sesi disimpan di **2 tempat**: memori supabase-js + AsyncStorage (`superapp_session`, `superapp_current_user`, `superapp_session_token` — `hooks/useAuth.tsx:106-117`).
- Bootstrap: cek koneksi Supabase → proses redirect OAuth (token_hash / access_token) → restore sesi tersimpan. Try/catch menyeluruh, connection state ditampilkan di UI. Ini bagian paling rapi di app.
- Token Supabase (JWT) dipakai sebagai Bearer token untuk backend Go — ada `middleware/jwks.go` di backend yang mengvalidasinya. Alur ini koheren.

### 2.4 Jalur AI

- `lib/ai.ts` memanggil Groq **langsung dari device** dengan `EXPO_PUBLIC_GROQ_API_KEY` (4 fungsi: insights, analisis jurnal, processing mood, prompts).
- Backend juga punya endpoint `/insights` (dipakai `CrossModuleInsights.tsx`) dan `/context/insights` (dipakai `syncService.getBackendInsights`).
- Artinya **2 jalur AI independen** (client-key Groq + backend) — salah satu harus dihapus, idealnya semua lewat backend.

### 2.5 Jalur sync ke backend Go (3 pemicu, tanpa koordinasi)

1. `SyncService.runSync()` dipanggil eksplisit dari `useTasks`, `useHabits`, `useFinance` (bukan dari useJournal, useReading, useCalendar, goals, pomodoro, quests, gamification).
2. `lib/storageAdapter.ts:14-18` — `setTimeout(2000ms)` + dynamic import di setiap `setItem` adapter (tapi app mobile menulis lewat `lib/storage.ts` langsung, **bukan** lewat adapter → pemicu ini praktis mati).
3. `shared/lib/storage.js:95` — `setData` shared memicu `cloudSync.triggerAutoSync`.
4. `initAutoSyncListener()` di reconnect.

Tidak ada queue, dedup, atau status "synced/pending" yang ditampilkan user.

---

## 3. Temuan P0 — Kriris (data loss & keamanan)

### M-01 · QuickCapture menghapus seluruh riwayat transaksi finance
**Lokasi:** `components/QuickCaptureModal.tsx:69-78` (juga undo path :89-90)
**Fakta terverifikasi:**
- `useFinance` menulis TRANSACTIONS via `EncryptedStorage.setItem` (`hooks/useFinance.ts:55`).
- QuickCapture membaca via `getData` plain (`QuickCaptureModal.tsx:71`) → mendapat string AES/base64 → `!Array.isArray` → `txs = []` → `setData` menimpa key dengan 1 transaksi plaintext.
- Akibat: **semua transaksi lama hilang permanen** (blob terenkripsi lama tidak bisa di-decrypt lagi oleh finance screen karena sudah tertimpa).

**Rekomendasi:** satukan sumber — QuickCapture harus memakai `useFinance` (atau minimal `EncryptedStorage`) untuk baca-tulis TRANSACTIONS, dan `EncryptedStorage` juga untuk undo path.

### M-02 · QuickCapture menghapus seluruh riwayat journal
**Lokasi:** `components/QuickCaptureModal.tsx:126-135` (+ undo :145-147)
**Fakta terverifikasi:** identik dengan M-01; `useJournal` menulis via `EncryptedStorage` (`hooks/useJournal.ts:44`), QuickCapture membaca plain.
**Rekomendasi:** sama — route lewat `useJournal`/`EncryptedStorage`.

### M-03 · Pembaca dengan codec salah di 3 modul lain
| Lokasi | Dampak |
|---|---|
| `app/(app)/index.tsx:94,125` | `journalEntries` di dashboard menghitung **panjang string base64**, bukan jumlah entry → angka nonsense besar |
| `app/(app)/achievements.tsx:104,114` | Balance selalu 0 → badge "budget master" (`hasPositiveBalance`, :134) **mustahil terkunci** |
| `lib/ai.ts:26,51` | `lastMood` selalu `'neutral'` — konteks AI journal mati |

Bonus di `lib/ai.ts:34,46`: perbandingan tanggal `toLocaleDateString()` vs `completedDates` yang disimpan `YYYY-MM-DD` (`lib/helpers.ts:7-13`) → vektor `last7Days` habit selalu semua nol → fitur "Anti-Mager" tidak pernah terpicu.

**Rekomendasi:** semua pembaca finance/journal pindah ke `EncryptedStorage`; perbaiki format tanggal di `getAIContext` pakai `getToday()`/`YYYY-MM-DD`.

### M-04 · QuickCapture menulis task dengan skema berbeda
**Lokasi:** `components/QuickCaptureModal.tsx:101-106`
Task ditulis `{ id, title, completed, createdAt }` — **tanpa field `status`**. Semua layar tasks memfilter `status === 'done'` / `status !== 'done'` (`hooks/useTasks.ts:67,77-79`, `app/(app)/tasks.tsx:121`) → task dari capture **tidak pernah muncul** di daftar tasks (hanya sempat terlihat di "Tugas Menunggu" dashboard). `achievements.tsx:117` bahkan sudah mengakui drift skema ini dengan fallback `task.status === 'done' || task.completed` — tandanya masalahnya diketahui tapi tidak diperbaiki di sumbernya.
Juga: `date: new Date().toISOString()` (:76, :133) vs `YYYY-MM-DD` yang dipakai modul lain.
**Rekomendasi:** QuickCapture harus memakai `useTasks.addTask` / hook modul yang bersangkutan, bukan menulis storage manual. ID `Date.now()` (:70,:98) juga rawan tabrakan — pakai `generateId()` dari `lib/helpers.ts`.

### M-05 · `SYNC_PASSWORD` — fitur mati + plaintext
**Lokasi:** `app/(app)/profile.tsx:38,49,213-236`
Field "Enkripsi E2E Cloud Sync" menyimpan password di `AsyncStorage.getItem/setItem('SYNC_PASSWORD')` **plaintext**, dan **tidak ada satu pun** kode lain yang membaca key ini (diverifikasi via grep) — UI-nya menipu (mengklaim E2E encryption yang tidak ada).
**Rekomendasi:** hapus fiturnya sampai benar-benar diimplementasikan, atau implementasikan (hash di SecureStore + integrasi ke sync).

### M-06 · PIN aplikasi disimpan & dicek plaintext
**Lokasi:** `context/securityContext.tsx:101-109` (setPIN), `:60-66` (unlockApp)
PIN disimpan mentah di SecureStore dan dibandingkan `pin === correctPIN`. Siapa pun yang membaca SecureStore (backup, exploit) dapat PIN-nya langsung; juga tidak ada rate-limit/lockout saat salah terus (`components/LockScreen.tsx:64-75`, timer setTimeout tak terlacak).
**Rekomendasi:** simpan `HMAC-SHA256(pin, deviceSalt)` (salt via `expo-crypto` random, disimpan di SecureStore); tambahkan backoff setelah N kali gagal.
Catatan: `lockApp` hanya aktif jika `hasPIN` (:56-58) — device dengan biometrik saja tidak akan pernah terkunci; pertimbangkan kunci otomatis berbasis biometrik.

### M-07 · Fallback master key hardcoded
**Lokasi:** `lib/secureStorage.ts:50-52`
Jika SecureStore gagal, app tetap jalan dengan master key literal `'superapp_fallback_key_not_for_production'` — data "terenkripsi" dengan key yang ada di source code.
**Rekomendasi:** tanpa master key yang valid, tolak akses (tampilkan error state), jangan jatuh ke key statis.

### M-08 · Groq API key di-bundle ke binary app
**Lokasi:** `lib/ai.ts:5` (`process.env.EXPO_PUBLIC_GROQ_API_KEY`)
`EXPO_PUBLIC_*` di-inline ke bundle — key AI berbayar bisa diekstrak dari app terinstall dan dipakai orang lain (kredensial bocor, tagihan membengkak). Pola ini juga disebut di evaluasi monorepo 12 Okt.
**Rekomendasi:** pindahkan semua panggilan LLM ke backend Go (proxy `/ai/*` dengan Bearer JWT); mobile hanya mengirim context. Sekalian menyelesaikan duplikasi 2 jalur AI (§2.4).

### M-09 · Premium: status selalu false + badge hardcoded
**Lokasi:** `context/premiumContext.tsx:34` membaca `superapp_user_id` — key yang **tidak pernah ditulis** (auth menulis `superapp_current_user`, `hooks/useAuth.tsx:109`). `usePremium` tidak dipakai layar mana pun (diverifikasi), sementara `app/(app)/profile.tsx:131-134` merender badge `PREMIUM` **unconditional**.
**Rekomendasi:** perbaiki key (`superapp_current_user`), hubungkan layar ke `usePremium`, hapus badge hardcoded. Ini masalah monetisasi — gate premium yang salah berarti fitur berbayar terbuka semua atau tertutup semua.

---

## 4. Temuan P1 — Tinggi

### M-10 · Sync cloud selalu melewatkan Finance & Journal
**Lokasi:** `lib/syncService.ts:14-42`
`collectContextSnapshots` memakai `getData` dari shared (`shared/lib/storage.js:73-84`) yang mengembalikan `null` saat `JSON.parse` gagal → payload AES Finance/Journal selalu hilang dari snapshot, padahal keduanya terdaftar di daftar modul (:21-22). Backend PostgreSQL tidak pernah menerima data finance/journal dari mobile.
**Rekomendasi:** `collectContextSnapshots` harus membaca lewat layer yang sesuai (EncryptedStorage untuk 2 modul tsb), atau sync di-ubah modelnya (event-based, bukan snapshot blob).

### M-11 · Modul yang tidak pernah memicu sync
`useJournal`, `useReading`, `useCalendar`, goals, pomodoro, quests, gamification tidak memanggil `SyncService.runSync()` di jalur tulis mereka (hanya `useTasks:47`, `useHabits:49`, `useFinance:56,83`). Artinya perubahan di modul-modul itu hanya terkirim ke backend kalau kebetulan ada sync lain (login/reconnect/task change). Tidak ada indikator "menunggu sync" di UI.
**Rekomendasi:** satukan pemicu di satu fungsi `saveX → queueSync()` dengan dedup (1 timer global), dan tampilkan status di UI (icon sync di header).

### M-12 · `addXP` race condition read-modify-write
**Lokasi:** `lib/gamification.ts:74-95`
`addXP` = baca GAMIFICATION → tambah → tulis, tanpa lock. Dua aksi serentak (mis. habit + daily login saat mount dashboard, M-16 memperbesar peluangnya) → salah satu XP hilang (last-writer-wins). Pola sama di `useHealth.saveToStorage` (:57-61) dan semua hook yang read-merge-write.
**Rekomendasi:** untuk v1, cukup serialisasi dengan queue sederhana (promise chain) per key di `lib/gamification.ts`; jangka panjang, pindahkan state gamifikasi ke satu reducer/hook.

### M-13 · Register: sync ke backend Go tanpa Authorization
**Lokasi:** `hooks/useAuth.tsx:323-327` (bandingkan login :279-288 yang menyertakan token).
POST `/users/sync` saat register tidak membawa header auth — bisa ditolak backend (401 yang hanya di-`console.warn` :330) atau, tergantung middleware, membuat user anonim.
**Rekomendasi:** sertakan `access_token` dari data signUp (jika email confirmation off); jika on, tunda sync sampai login pertama.

### M-14 · Sesi duplikat & `updateProfile` persist token stale
**Lokasi:** `hooks/useAuth.tsx:106-117` (persistSession) dan `:387-390`
Sesi disimpan di memori supabase-js **dan** AsyncStorage. `updateProfile` membaca sesi *tersimpan* (bukan sesi live) untuk re-persist — bisa menulis access token yang sudah kedaluwarsa.
**Rekomendasi:** jadikan supabase-js satu-satunya sumber sesi; AsyncStorage hanya untuk `current_user` + token untuk kebutuhan sync.

### M-15 · Pomodoro: side-effect di dalam state updater
**Lokasi:** `app/(app)/pomodoro.tsx:101-109`
`handleSessionComplete()` dipanggil **di dalam updater `setTimeLeft(prev => ...)`**. Di React 19/StrictMode updater bisa dijalankan 2× → sesi pomodoro tercatat 2× (double XP, double history). Tambahan:
- interval di-recreate **tiap tick** (deps `[isRunning, timeLeft]`, :99-113) — seharusnya 1 interval dengan `useRef` untuk timeLeft;
- `calculateStreak()` jalan di setiap render (:253, O(365) dengan `includes` O(n) per iterasi);
- `useKeepAwake()` aktif selama mount (:75) meski timer dijeda.

**Rekomendasi:** pindahkan deteksi `timeLeft <= 1` ke effect terpisah; memo streak; stop keep-awake saat paused.

### M-16 · Dashboard re-run semua load + re-register push tiap perubahan task
**Lokasi:** `app/(app)/index.tsx:87-130` (`loadData = useCallback(..., [today, tasks])`) dan `:148-152` (`useEffect(..., [loadData])`)
Setiap perubahan state `tasks` (yang datang dari context/hook tasks) → `loadData` baru → effect re-run → `Promise.all` 8 key storage + `checkDailyLogin()` + `registerForPushNotificationsAsync()` ulang. Di layar home, ini terjadi setiap kali user menyelesaikan/menambah task dari modul lain.
**Rekomendasi:** `loadData` tidak perlu dependen `tasks`; pisah state dashboard dari hook tasks, atau muat sekali + subscribe perubahan per modul.

### M-17 · `useAICoach` polling 30 detik sepanjang hidup app
**Lokasi:** `hooks/useAICoach.ts:43-44` (dipanggil dari `app/(app)/_layout.tsx`)
Polling berjalan di semua tab; catch kosong (:37-39) menyembunyikan kegagalan; POST mark-as-read tidak dicek hasilnya (:27-34) → kalau gagal, pesan yang sama di-notify ulang tiap poll (spam); tidak ada handling 401/token kedaluwarsa.
**Rekomendasi:** poll hanya saat app foregrounded + throttle saat di layar tertentu; tangani 401 (trigger re-login/refresh); retry mark-as-read.

### M-18 · Squad: progress bar hardcoded 50% + mock data saat error
**Lokasi:** `app/(app)/squad/[id].tsx:160` (width 50% konstan), `:38-44` (fetch gagal → menampilkan squad palsu `{name:'Squad Challenge', member_count:1}` sebagai data riil)
Menampilkan data fiktif sebagai data asli adalah antipola. Juga `parseInt` `target`/`xpStake` bisa menghasilkan `NaN` yang dikirim ke API (:74-75).
**Rekomendasi:** tampilkan state "gagal memuat + retry"; validasi numerik sebelum submit.

### M-19 · Konfigurasi build/submit EAS
**Lokasi:** `eas.json:32-44`
- `serviceAccountKeyPath: "./google-service-account.json"` — file yang ada di repo adalah `google-services.json` (dan itu *sudah ter-commit ke git*, lihat M-20). Path service account tidak akan pernah resolve → `eas submit --platform android` gagal.
- Submit iOS masih placeholder (`your@apple.com`, `YOUR_APP_STORE_CONNECT_APP_ID`).
- `app.config.js:2` hardcode EAS project ID (harmless, tapi ada juga di env — pilih satu sumber).
**Rekomendasi:** isi service account path yang benar + taruh file-nya di luar repo (EAS secret), lengkapi iOS.

### M-20 · `google-services.json` ter-commit ke git
**Lokasi:** `mobile/google-services.json` (diverifikasi ter-track via `git ls-files`)
Kredensial Firebase di version control. File `google-services.json` sensitivitasnya menengah (bukan service account key), tapi tetap standar praktik untuk tidak di-commit. `.env` dan `.env.local` sudah benar di-gitignore.
**Rekomendasi:** hapus dari git (tetap ada lokal), tambahkan ke `.gitignore`, dokumentasikan cara memperolehnya.

### M-21 · Journal save flow tanpa `finally` + AI reflection stale
**Lokasi:** `app/(app)/journal.tsx:78-99` — `setIsSaving(false)` (:99) tidak pernah jalan jika `updateEntry`/`addEntry` reject → tombol save stuck disabled selamanya sampai reload.
`aiReflection` state tidak di-reset saat `viewEntry` berubah (:343,:350) → reflection entry sebelumnya bocor ke entry berikutnya.
Panggilan AI juga memblokir save (network tanpa timeout).
**Rekomendasi:** `try/.../finally`; reset `aiReflection` per entry; jalankan AI setelah save (async, non-blocking) atau beri timeout.

---

## 5. Temuan P2 — Sedang

### M-22 · Error state hampir tidak ada di mana-mana
Akar masalah: `lib/storage.ts` dan `EncryptedStorage` menelan semua error ke `console.error` dan mengembalikan `null` (`lib/storage.ts:78-81,87-89`; `lib/secureStorage.ts:66-68,93-95`) → tidak ada layar yang bisa membedakan "kosong" vs "gagal". Konsekuensi:
- `index.tsx:87-130` `loadData` tanpa try/catch (rejection `Promise.all` unhandled);
- `social.tsx` 3 panggilan network hanya `console.warn` (:113-117,:129-131,:149-152) — gagal = layar blank tanpa retry;
- `achievements.tsx:145-147` gagal = angka nol permanen tanpa indikasi;
- `CrossModuleInsights.tsx:75-88` fetch gagal menampilkan kartu "Belum ada insight" — error disamarkan sebagai empty state;
- `QuickCaptureModal.tsx:43-50` fetch NLP tanpa timeout → modal "Memproses dengan AI..." bisa nyangkut selamanya (dan fallback diam-diam menyimpan sebagai task :57-60 tanpa memberi tahu user).

**Rekomendasi:** storage layer jangan swallow — kembalikan `Result<T, Error>` atau lempar error; buat `ErrorState` component reusable (pesan + retry) dan pasang di semua layar dengan data.

### M-23 · `StyleSheet.create` di dalam render
`social.tsx:169` dan `more.tsx:89` membuat seluruh style object ulang di tiap render (pabrik `getStyles`/`styles(c,isDark)`). Di RN ini membuang diff work. **Rekomendasi:** memo per kombinasi tema (`useMemo`) atau dua set style statis.

### M-24 · Duplikasi sistemik antar layar
| Duplikasi | Jumlah | Lokasi |
|---|---|---|
| Header (back + icon + judul) | 11 layar copy-paste | tasks :144-167, habits :84-103, finance :113-133, journal :129-149, goals :139-159, health :106-126, reading :96-116, calendar :151-171, achievements :154-174, social :174-194, pomodoro :265-295 — padahal `components/PageHeader.tsx` sudah ada (dipakai 1 komponen) |
| XP toast | 6 layar | tasks :434-438, habits :297-301, goals :296-300, health :370-374, reading :217-221, pomodoro :461-465 |
| Modal bottom-sheet chrome | ±10 layar | overlay/content/header identik |
| `Alert.alert` konfirmasi hapus | 7 tempat (2× di habits) | tasks :107-112, habits :61-66+:222-227, finance :96-101, journal :325-330, goals :126-131, reading :76-81, calendar :125-130 |
| Pola XP reward + toast timeout | 5 hook | useTasks :50-56, useHabits :94-101, useJournal :58-61, useHealth :74-77, useReading :61-65 |
| Bearer-token boilerplate | 8 file | social, squad/[id], useAICoach, CrossModuleInsights, QuickCapture, useAuth |
| Perhitungan streak | 2 algoritma beda | useHabits :78-90 vs pomodoro :232-251 |
| Agregasi stats dashboard | 3 salinan | index :88-128, achievements :97-147, `lib/insights.ts` (dead) |

**Rekomendasi:** ekstrak `PageHeader` (sudah ada!), `XpToast`, `SheetModal`, `ConfirmDelete`, `apiWithToken()` ke `components/` & `lib/`.

### M-25 · Dead code (diverifikasi tidak terpakai)
- `lib/insights.ts` seluruh file (tidak di-import);
- `lib/ai.ts:getJournalPrompts` (:234);
- `components/DailyQuestCard.tsx` — di-import tapi tidak pernah dirender;
- `index.tsx`: Emergency Modal ~100 baris (:377-480, setter tak pernah dipanggil), AI Insight Modal (:541-580, setter tak pernah dipanggil — **insight dari `useAIInsights` di-fetch + kena biaya API tapi tidak pernah ditampilkan**, :52), `quickActions` (:172-182), `LevelUpModal` di-import (:24) tapi tidak dirender (level-up di dashboard tak terlihat), `sendImmediateNotification`, `greetingTime`, imports SVG (:8);
- `context/premiumContext.tsx` — tidak ada konsumen;
- `context/settingsContext.tsx:6,19,42` `autoStartPomodoro` — tidak pernah dibaca;
- `habits.tsx:61-66` `handleDeleteHabit` (logika duplikat dengan inline :222-227);
- `lib/helpers.ts:getRandomQuote`.

**Rekomendasi:** hapus semua (kecuali yang memang direncanakan dekat), atau hubungkan.

### M-26 · Masalah performa lain per layar
- `habits.tsx:165` — filter habits per hari yang terlihat (O(days×habits), sampai 30 hari), tanpa memo;
- `health.tsx:85-86` — `last7Days/last30Days` `useMemo` dengan **deps kosong** → list basi kalau app terbuka melewati tengah malam;
- `calendar.tsx:202` — `events.some` per sel kalender di render (O(cells×events));
- `pomodoro.tsx:398-417` — 7-day history map `new Date` per hari tiap render;
- `tasks.tsx:185,267` — `filter().length` per chip/kolom tiap render;
- `journal.tsx:211-236` — entry di `ScrollView` plain (bukan `FlatList`) → jelek saat entry banyak;
- `components/DailyQuestCard.tsx:14` — `new Animated.Value` di body komponen (reset tiap render; harus `useRef`);
- `components/MomentumHabitCard.tsx:52-61` — interval haptic 150ms **tidak di-clear saat unmount** → haptic terus bergetar setelah layar ditutup;
- `index.tsx:68-85` — `Animated.loop` pulse jalan selama tab hidup, tak pernah stop; `LevelUpModal.tsx:32-42` — `Animated.loop` tak di-`.stop()` saat hide;
- `social.tsx:95,136,383` — flag `loading` dipakai bersama untuk fetch list **dan** create squad (spinner semantik bercampur).

### M-27 · Kalender: input tanggal free-text
`calendar.tsx:265-270` — `Input placeholder="YYYY-MM-DD"` tanpa `@react-native-community/datetimepicker` (dependensi sudah ada, dipakai di finance) dan tanpa validasi → tanggal salah format menghasilkan event yang tidak pernah cocok dengan sel kalender mana pun.
**Rekomendasi:** ganti `DateTimePicker` + validasi.

### M-28 · Pomodoro soundscape
- `DEFAULT_SOUNDSCAPES` URL CDN eksternal (GitHub raw/SoundHelix) hardcoded `pomodoro.tsx:40-44` — gagal load di offline/region-blocked;
- custom sound menyimpan `file.uri` dari cache document-picker (:200-217) — OS bisa meng-evict cache → bunyi mati diam-diam, tidak ada revalidasi.
**Rekomendasi:** bundle aset default di `assets/`; salin file custom ke `FileSystem.documentDirectory`.

### M-29 · i18n tidak konsisten
`LanguageProvider` + `t()` tersedia, tapi mayoritas copy hardcoded: judul tab di `app/(app)/_layout.tsx` (:124-133, campur 'Buku Keuangan'/'Social'/'Goals'), `Kembali` hardcoded Indonesia di ±10 layar, `index.tsx` paksa locale `id-ID` (:186), `social.tsx` campur Inggris/Indonesia (:190-191, :284 'Sedang Fokus'), `goals.tsx:220` English "+ n more steps", `LevelUpModal.tsx:73,83` (typo `SIAAP`).
**Rekomendasi:** lint sederhana untuk string literal UI; selesaikan dictionary.

### M-30 · `achievements.tsx` — gamifikasi setengah palsu
Selain M-03 (budget), layar ini menghitung ulang stats sendiri (M-24) dan `useEffect` tanpa dep `loadRealStats` (:93-95, exhaustive-deps violation). Layar gamifikasi menampilkan angka nol tanpa loading indicator dan tanpa error state.
**Rekomendasi:** pakai satu agregator stats bersama + loading/error state.

### M-31 · Finance: umpan balik minim
`finance.tsx:81-94` — amount invalid → `return` diam-diam tanpa pesan; kategori disimpan dengan **nama Indonesia sebagai value** (`CATEGORY_CONFIG` :23-36) → data terikat locale, `translateCategory` :72-74 fallback mentah. `deleteCustomCategory` tidak memicu sync (:90 vs :83).
**Rekomendasi:** simpan key kategori stabil, terjemahkan hanya di display.

### M-32 · `more.tsx` — destructive action & version
`handleClearData` (:67-76) menghapus semua data user tanpa konfirmasi mengetik, dan `clearAll()` diam-diam no-op jika belum ada user id (`lib/storage.ts:100-104`) → tombol tampak sukses padahal tidak terjadi apa-apa. Version hardcoded `'1.0.0 Stable'` (:229) alih-alih `CONFIG.VERSION` (`lib/config.ts:31`).
**Rekomendasi:** konfirmasi eksplisit + tampilkan hasil; ambil versi dari config.

---

## 6. Temuan P3 — Rendah / nitpicks

| # | Temuan | Lokasi |
|---|---|---|
| M-33 | `config.ts` hardcode IP `10.254.29.39` sebagai special-case | `lib/config.ts:11` |
| M-34 | `TabBarIconProps { color: any }` | `app/(app)/_layout.tsx:10-12` |
| M-35 | `DestinationHub` `router.push(item.href as never)` — escape tipe | `components/DestinationHub.tsx:34` |
| M-36 | `LevelUpModal` `backgroundColor: '#0a0a0a'` mengabaikan tema; `filter:'blur(40px)'` bukan style RN valid | `components/LevelUpModal.tsx:60,110` |
| M-37 | `RadarChart` tidak guard `data.length === 0` → NaN | `components/RadarChart.tsx:21` |
| M-38 | `@types/react-native` ^0.72 vs RN 0.86 | `package.json:83` |
| M-39 | `microTimer` effect deps kurang `duration` | `components/MicroTimer.tsx:50-61` |
| M-40 | `notifications.ts:122` memakai `SchedulableTriggerInputTypes` (API lama) dan `scheduleNotification` tanpa cek izin granted | `lib/notifications.ts:113-142` |
| M-41 | `bootstrapAsync` tanpa abort — set state setelah unmount (React 19 sudah tidak memperingatkan, tapi pola tetap rapuh) | `hooks/useAuth.tsx:102-104` |
| M-42 | `profile.tsx:58-72` `handlePickImage` tanpa catch (rejection unhandled) | `app/(app)/profile.tsx` |
| M-43 | ID berbasis `Date.now()` di QuickCapture — tabrakan jika 2 capture <1 detik | `components/QuickCaptureModal.tsx:70,98,127` |
| M-44 | `finance-repository.tsx` JSX minified satu baris — sulit direview | `app/(app)/finance-repository.tsx` |

---

## 7. Aksesibilitas (sweep)

Pola konsisten: tombol icon-only tanpa `accessibilityLabel`. Daftar lengkap:
- `components/FloatingActionButton.tsx:29-46` — dipakai 8+ layar, **tanpa** label/role (prioritas 1);
- close modal: tasks :334, habits :247, finance :267/:370/:457, journal :322-335, goals :234, health, reading, calendar :253, pomodoro tip :449, squad/[id] :115-117 (back);
- delete icon: tasks (check), finance :225-227, reading :175-177, calendar :54-56, goals :283-285, pomodoro sound :374-385;
- playback: pomodoro play/pause :328-333, reset :334-336;
- `LockScreen` biometric :121-127, backspace :132-139;
- dashboard: avatar button `index.tsx:214-216`, FAB 🔮 :583-606.

Sebagai kontras, `components/ui/Button.tsx` (role, label, hint, `accessibilityState.busy`) dan `PageHeader.tsx:87` sudah benar — tandanya standar-nya ada, hanya belum ditegakkan.
**Rekomendasi:** lint rule `jsx-a11y`-setara untuk RN + aturan "setiap TouchableOpacity dengan isi icon-only wajib `accessibilityLabel`".

---

## 8. Loading / Empty / Error State (ringkasan)

| Layar | Initial loading | Empty | Error |
|---|---|---|---|
| index | ❌ | ✅ per-seksi | ❌ |
| tasks / habits / goals / health / reading / calendar | ❌ (RefreshControl only) | ✅ | ❌ |
| finance | ❌ (menampilkan Rp 0 saat load) | ✅ | ❌ |
| journal | ❌ | ✅ | ❌ |
| pomodoro | ❌ | ❌ | Alert only |
| social | ❌ | squads only (leaderboard ❌) | ❌ (console.warn) |
| achievements | ❌ (nol diam) | n/a | ❌ (diam) |
| squad/[id] | ✅ | ✅ | ❌ (diam untuk GET) + **mock data** |
| finance-repository | ✅ | ✅ | ✅ ← **standar terbaik di app** |
| CrossModuleInsights | ✅ | ✅ (disalahgunakan untuk error) | ❌ |

Satu-satunya layar dengan penanganan error sejati (AbortController + error UI + `accessibilityRole="alert"` + idempotency key) adalah `finance-repository` + `components/finance/Review.tsx` & `Research.tsx` — jadikan pola ini template untuk semua layar network.

---

## 9. Build, Release & Testing

**Yang sudah benar:**
- Profil EAS `development / preview / production` lengkap, `autoIncrement` di production, channel EAS Update terpasang (`eas.json`).
- Script `preflight` jalan sebelum semua command (`package.json:7-24`) — gate kualitas yang baik.
- `.env`/`.env.local` ter-gitignore; `.env.example` bersih (placeholder; EAS project ID tidak sensitif).
- `app.config.js` dynamic config dengan fallback env — standar.

**Yang perlu diperbaiki:** M-19 (submit config), M-20 (firebase config ter-commit), dan:
- **0 test di mobile** (`test: jest --passWithNoTests`). Prioritas: (1) pure logic — gamification (level/XP, M-12), helpers (getToday/generateId), storage key building & legacy migration; (2) `syncService.collectContextSnapshots` dengan adapter mock (regresi M-10); (3) QuickCapture codec (regresi M-01/M-02 — ini yang akan menangkap bug data loss di masa depan); (4) snapshot render `ui/*`.
- `package.json` memakai `pnpm dlx eas-cli` di setiap script build — lebih andal jika eas-cli masuk devDependencies workspace.

---

## 10. Yang Sudah Baik (pertahankan)

1. **Provider layering & splash handling** di `app/_layout.tsx` — bersih, splash di-hold sampai siap, permission prompt tidak dipaksa saat cold start (:103).
2. **`finance-repository` + `components/finance/*`** — AbortController dengan cleanup, idempotency key (`Crypto.randomUUID()`), validasi regex penuh, error UI aksesibel. Referensi terbaik di app.
3. **`useAuth`** — try/catch menyeluruh, connection state dipaparkan ke UI, dukungan OAuth redirect (`token_hash` & `access_token`), session restore yang defensif.
4. **`ui/Button`** — standar aksesibilitas terbaik di codebase.
5. **Storage namespacing per-user + legacy owner migration** (`lib/storage.ts:28-68`) — pola multi-user yang benar dengan migration path.
6. **`EncryptedStorage`** — master key di SecureStore, fallback decrypt untuk data legacy, error handling per-op. (Perbaiki fallback key statis, M-07.)
7. **`initAutoSyncListener`** — reconnect trigger dengan debounce 1,5 detik.
8. **`lib/notifications.ts`** — guard Expo Go/Android, fallback token projectId, local notification API. (Fix warning simulator sudah dilakukan 16 Okt.)
9. **`useAICoach` architecture** — idempotent mark-as-read *diarahkan* ke backend yang benar (perbaiki M-17, bukan hapus fiturnya).
10. **EAS/Expo setup** — preflight, dev client, EAS Update channel, dynamic `app.config.js`.

---

## 11. Roadmap Perbaikan (usulan urutan)

**Sprint 1 — Stop pendarahan (P0)**
1. M-01/M-02/M-04: refactor `QuickCaptureModal` memakai hook modul (`useTasks`/`useFinance`/`useJournal`) — hapus tulis storage manual.
2. M-03: pindahkan pembaca finance/journal di `index.tsx`, `achievements.tsx`, `lib/ai.ts` ke `EncryptedStorage`; perbaiki format tanggal `getAIContext`.
3. M-06: hash PIN (HMAC-SHA256 + salt) + backoff lockout; M-07: hapus fallback key statis; M-05: hapus fitur SYNC_PASSWORD palsu.
4. Tambahkan 3 test regresi untuk codec storage (item 9).

**Sprint 2 — Integritas data & gamifikasi (P1)**
5. M-09: perbaiki premium key + hubungkan `usePremium`; M-05 badge.
6. M-10/M-11: satu jalur sync (queue + dedup), baca modul terenkripsi dengan codec yang benar, tambah pemicu untuk jurnal/reading/calendar; status sync di UI.
7. M-12: serialisasi `addXP`; M-09b typo `GOAL_ACHIEVED`→`GOAL_COMPLETE` (goals.tsx:121) + `DailyQuestCard` action key.
8. M-15: pomodoro timer rewrite (effect terpisah, interval stabil, streak memo).
9. M-16: dashboard effect decouple dari `tasks`.
10. M-19/M-20: selesaikan EAS submit + keluarkan firebase config dari git.

**Sprint 3 — Keamanan arsitektur (P1)**
11. M-08: semua LLM lewat proxy backend; hapus key `EXPO_PUBLIC_GROQ_API_KEY` dari mobile.
12. M-13/M-14: auth register dengan token; single source of truth sesi.
13. M-17: polling AI coach — foreground-only + handling 401.

**Sprint 4 — Kualitas UX (P2)**
14. M-22: storage return error + `ErrorState` component + pasang di semua layar (template: finance-repository).
15. M-24/M-25: ekstrak komponen bersama (PageHeader sudah ada!), hapus dead code (termasuk emergency/insight modal di index).
16. M-21: journal `finally` + reset AI reflection + non-blocking AI.
17. M-18: hapus mock squad, progress dari data.
18. M-27: DateTimePicker di calendar. M-28: bundle soundscape + salin file custom.

**Sprint 5 — Aksesibilitas & performa (P2/P3)**
19. Sweep `accessibilityLabel` (mulai dari `FloatingActionButton` — efek terluas).
20. `StyleSheet.create` di render (social, more); FlatList untuk journal; fix memo deps (health, index pulse, LevelUpModal loop).
21. i18n pass: title tab, `Kembali`, copy campur locale; lint untuk string literal.
22. Test suite bertahap (§9); pertimbangkan CI untuk mobile (lint + typecheck + jest).

---

## A. Lampiran — Inventaris file

| Area | File |
|---|---|
| Rute | `app/_layout.tsx`, `app/onboarding.tsx`, `app/(app)/*` (19 layar), `app/(auth)/*` (6 layar) |
| Komponen | `components/*.tsx` (16) + `components/ui/*` (4) + `components/finance/*` (2) |
| Hook | `hooks/use{Auth,AICoach,AIInsights,Calendar,Finance,Habits,Health,Journal,Reading,Tasks}.ts(x)` |
| Context | `context/{theme,settings,security,premium,language}Context.tsx` |
| Lib | `lib/{config,runtimeConfig,storage,storageAdapter,secureStorage,syncService,ai,insights,gamification,quests,helpers,notifications,haptics,soundPlayer,theme,financeRepository}.ts` |
| Konfig | `app.json`, `app.config.js`, `eas.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, `scripts/preflight.mjs` |

*Review selesai — semua temuan P0/P1 diverifikasi langsung terhadap kode pada 16 Oktober 2026 (branch `codex/web-postgres-migration`).*
