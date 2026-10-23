# Laporan Evaluasi Platform Mobile Whenya

| Atribut | Nilai |
|---|---|
| **No. Dokumen** | WHY-MOB-EVAL-2026-10-001 |
| **Versi** | 1.0 |
| **Tanggal** | 22 Oktober 2026 |
| **Objek Evaluasi** | `mobile/` (Expo SDK 57, React Native 0.86.3, React 19.2.3, expo-router 57) |
| **Commit Acuan** | `d31486d0` (branch `main`) |
| **Metode** | Static code review + eksekusi tooling (tsc, jest) |
| **Status** | Final – untuk ditindaklanjuti |

---

## 1. Ringkasan Eksekutif

Platform mobile Whenya **secara fungsional kaya** (21 layar app, 6 layar auth, ±15.300 LOC TypeScript) dengan fondasi yang **lebih baik dari rata-rata proyek tahap awal**: enkripsi data sensitif berbasis keystore, scoping data per pengguna, AI diproxy lewat backend (tidak ada API key AI di klien), dan TypeScript bersih tanpa error.

Namun, **belum siap produksi publik**. Gap terbesar ada pada:
1. **Aksesibilitas** – hanya 32 `accessibilityLabel` untuk 378 elemen sentuh (~8%).
2. **Observability** – tidak ada crash reporting maupun Error Boundary.
3. **Kualitas & pengujian** – `strict: false`, 128 penggunaan `any`, hanya 4 file test (14 test) untuk 15K LOC.
4. **Performa** – 116 `ScrollView` vs 3 list tervirtualisasi; layar Beranda 1.405 baris.
5. **Kesiapan rilis** – placeholder di `eas.json`, `google-services.json` kosong, bundle ID `com.selfone.mobile` tidak sesuai brand.

### Skor Keseluruhan: **58 / 100 — "Beta Fungsional"**

> Skor dihitung dari rata-rata berbobot dimensi pada §4. Skala: 0–39 Prototype · 40–59 Beta · 60–79 Production-ready · 80–100 Excellent.

---

## 2. Ruang Lingkup & Metodologi

### 2.1 Ruang Lingkup
- **Termasuk:** `app/`, `components/`, `hooks/`, `lib/`, `context/`, `locales/`, `__tests__/`, konfigurasi (`app.json`, `app.config.js`, `eas.json`, `tsconfig.json`, `jest.config.js`, `.gitignore`).
- **Tidak termasuk:** backend Go, web app, package `shared/` (hanya dirujuk), pengujian di perangkat fisik, penetration test dinamis.

### 2.2 Standar Acuan

| Kode | Standar | Dipakai untuk |
|---|---|---|
| **ISO 25010** | ISO/IEC 25010:2023 – Product Quality Model | Kerangka dimensi kualitas |
| **MASVS** | OWASP MASVS v2.1 (STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY) | Keamanan |
| **WCAG** | W3C WCAG 2.2 Level AA (1.4.3, 1.4.4, 2.5.8, 4.1.2) | Aksesibilitas |
| **HIG / M3** | Apple Human Interface Guidelines; Material Design 3 | UI/UX, ukuran sentuh (44pt / 48dp) |
| **RN Perf** | React Native docs – *Performance* & *Optimizing FlatList* | Performa |
| **Expo** | Expo docs – *Environment variables*, *EAS Build/Submit*, *Error handling* | Konfigurasi & rilis |
| **ISO 5055** | ISO/IEC 5055:2021 (CISQ) – maintainability | Kualitas kode |

### 2.3 Bukti yang Dikumpulkan (Reproducible)

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Type check | `npx tsc --noEmit` | **0 error** (dengan `strict: false`) |
| Unit test | `npx jest` | **4 suite, 14 test, semua lulus** |
| Dependency audit | `npm audit` | **Tidak bisa dijalankan** – tidak ada lockfile npm (proyek memakai pnpm) |
| Label aksesibilitas | `grep accessibilityLabel` | 32 kemunculan di 21 file |
| Elemen sentuh | `grep TouchableOpacity\|Pressable` | 378 kemunculan |
| `console.*` | grep | 85 kemunculan |
| `any` | grep `: any\|as any` | 128 kemunculan |
| Warna hardcoded | grep `#RRGGBB` | 234 kemunculan |
| Font < 12 | grep `fontSize: 8–11` | 81 kemunculan |
| List virtualisasi | grep `FlatList\|FlashList` | 3 file vs 116 `ScrollView` |
| Crash reporting | grep sentry/crashlytics/bugsnag | **Tidak ada** |
| Error Boundary | grep `ErrorBoundary` | **Tidak ada** |

> [!NOTE]
> Angka grep adalah indikator, bukan pengukuran presisi (mis. satu `ScrollView` bisa wajar). Temuan kritis telah diverifikasi dengan membaca kode sumbernya.

---

## 3. Profil Teknis

| Aspek | Temuan |
|---|---|
| Stack | Expo 57 + expo-router (file-based), Supabase Auth, backend Go (`/api/v1`) |
| Arsitektur data | Local-first (AsyncStorage) + sinkronisasi cloud (`lib/databaseSync.ts`) |
| State | React Context (theme, language, security, premium, settings) + custom hooks per modul |
| Navigasi | Tabs (`app/(app)/_layout.tsx`) + grup `(auth)` |
| i18n | `languageContext` dengan fungsi `tx()`; `locales/*.json` hanya 10 baris (metadata app) |
| Build | EAS (development / preview / production), OTA via `expo-updates` (`runtimeVersion: appVersion`) |
| Modul fitur | Tasks, Habits, Finance, Journal, Goals, Health, Reading, Pomodoro, Calendar, Notes, Social/Squad, Insights, Achievements, Capture |

---

## 4. Penilaian per Dimensi (ISO/IEC 25010)

| # | Dimensi | Bobot | Skor | Status |
|---|---|---|---|---|
| 4.1 | Keamanan (MASVS) | 20% | 68 | 🟡 |
| 4.2 | Kesesuaian Fungsional | 15% | 75 | 🟢 |
| 4.3 | Usability & UI/UX | 15% | 62 | 🟡 |
| 4.4 | Aksesibilitas (WCAG 2.2) | 10% | 30 | 🔴 |
| 4.5 | Performa | 10% | 50 | 🟡 |
| 4.6 | Reliabilitas & Observability | 10% | 40 | 🔴 |
| 4.7 | Maintainability | 10% | 50 | 🟡 |
| 4.8 | Testability | 5% | 30 | 🔴 |
| 4.9 | Kesiapan Rilis & Portabilitas | 5% | 45 | 🔴 |
| | **Total berbobot** | 100% | **≈58** | **Beta** |

### 4.1 Keamanan — 68/100

**Kekuatan (terverifikasi):**
- ✅ **MASVS-STORAGE-1 / CRYPTO-2:** Data sensitif (transaksi, jurnal, kategori) dienkripsi AES dengan master key 256-bit yang disimpan di `expo-secure-store` (Keychain/Keystore) — [secureStorage.ts](file:///Users/user/Projects/superapp/mobile/lib/secureStorage.ts).
- ✅ **MASVS-CRYPTO-1:** RNG CryptoJS dialihkan ke `expo-crypto` (CSPRNG native), bukan `Math.random`.
- ✅ **MASVS-AUTH:** Token Supabase dikirim sebagai `Bearer`; AI dipanggil lewat backend (`/ai/insights`, `/ai/journal`) sehingga tidak ada kunci LLM di kode klien — [ai.ts](file:///Users/user/Projects/superapp/mobile/lib/ai.ts).
- ✅ Data diskop per user (`${userId}_${key}`) — [storage.ts](file:///Users/user/Projects/superapp/mobile/lib/storage.ts).
- ✅ `.env*` di-ignore git; ada `LockScreen` + `securityContext`.

**Temuan:**

| ID | Severity | Temuan | Acuan |
|---|---|---|---|
| SEC-01 | 🟠 High | `EXPO_PUBLIC_GROQ_API_KEY` ada di `.env`. Saat ini **tidak direferensikan kode** sehingga tidak ter-inline ke bundle, tetapi prefix `EXPO_PUBLIC_` berarti satu kali `process.env.EXPO_PUBLIC_GROQ_API_KEY` dipakai → kunci bocor ke semua APK. Hapus & rotasi. | Expo Env Vars docs; MASVS-STORAGE-2 |
| SEC-02 | 🟠 High | Fallback `http://${ip}:8080` dan `http://localhost` di [config.ts](file:///Users/user/Projects/superapp/mobile/lib/config.ts#L8-L25). Jika `EXPO_PUBLIC_API_URL` tidak di-set saat build produksi, token dikirim lewat HTTP polos. Juga ada IP internal `10.254.29.39` di-hardcode. | MASVS-NETWORK-1 |
| SEC-03 | 🟡 Medium | Data non-finance (tasks, habits, health, goals, profil) disimpan plaintext di AsyncStorage. Health data tergolong sensitif. | MASVS-STORAGE-1, MASVS-PRIVACY |
| SEC-04 | 🟡 Medium | `crypto-js` sudah **tidak dirawat (discontinued 2023)** dan memerlukan patch RNG manual. Pertimbangkan `react-native-quick-crypto` / AES-GCM terautentikasi. | MASVS-CRYPTO-1 |
| SEC-05 | 🟡 Medium | 85 `console.*` tanpa guard `__DEV__` berpotensi membocorkan data di log produksi. | MASVS-STORAGE-2 |
| SEC-06 | 🔵 Low | Tidak ada certificate pinning / deteksi root-jailbreak. Opsional untuk app produktivitas, disarankan untuk modul finance. | MASVS-NETWORK-2, MASVS-RESILIENCE |

### 4.2 Kesesuaian Fungsional — 75/100
- ✅ Cakupan fitur sangat luas untuk "superapp" produktivitas; local-first + sync dengan resolusi konflik (`resolutions`) adalah keputusan arsitektur yang tepat.
- ✅ Alur auth lengkap: login, register, forgot/reset password, OAuth callback.
- ⚠️ **Risiko scope creep**: 14+ modul dengan kedalaman bervariasi. Bandingkan dengan "core value" di [WHENYA_MASTER_PLAN.md](file:///Users/user/Projects/superapp/docs/WHENYA_MASTER_PLAN.md).
- ⚠️ `scheduleDatabaseSync` hanya debounce 2 detik tanpa retry/backoff atau antrean offline yang eksplisit — kegagalan hanya dicatat ke `console.error`.

### 4.3 Usability & UI/UX — 62/100
- ✅ Ada design system dasar (`components/ui/` Button, Card, Badge, Input; `lib/theme.ts`, dark mode, haptics, safe-area insets di tab bar).
- ⚠️ **234 warna hex hardcoded** di layar/komponen (mis. tab bar `#6BB289`, `#14241C`) — mem-bypass token tema, menyulitkan konsistensi.
- ⚠️ **81 penggunaan font 8–11pt**; label tab 9.5–10.5pt. HIG merekomendasikan minimum 11pt (caption), M3 label-small 11sp. Keterbacaan rendah.
- ⚠️ 5+ tab + layar `more` dengan banyak destinasi — beban kognitif tinggi (Hick's Law). HIG menyarankan 3–5 tab.

### 4.4 Aksesibilitas — 30/100 🔴

| ID | Kriteria WCAG 2.2 | Temuan |
|---|---|---|
| A11Y-01 | 4.1.2 Name, Role, Value (A) | Hanya ~8% elemen sentuh memiliki `accessibilityLabel`/`Role`. Tombol ikon tanpa label tidak terbaca VoiceOver/TalkBack. |
| A11Y-02 | 1.4.4 Resize Text (AA) | Tidak ditemukan penanganan `allowFontScaling`/`maxFontSizeMultiplier` secara sistematis; layout dengan font kecil tetap rawan terpotong saat Dynamic Type besar. *(Perlu uji perangkat.)* |
| A11Y-03 | 1.4.3 Contrast (AA) | Warna inaktif `#8A9784` di atas `#FFFFFF` ≈ **3.1:1** (dihitung dengan rumus relative luminance WCAG) → **gagal** 4.5:1 untuk teks kecil. |
| A11Y-04 | 2.5.8 Target Size (AA) | Perlu audit ukuran sentuh terhadap 44pt (HIG) / 48dp (M3); pastikan `hitSlop` pada ikon kecil. |

### 4.5 Performa — 50/100
- ⚠️ **116 `ScrollView` vs 3 `FlatList`** — daftar tugas/transaksi/jurnal yang tumbuh akan merender seluruh item (RN docs: *Optimizing FlatList Configuration*). Gunakan `FlatList`/`FlashList`.
- ⚠️ [index.tsx](file:///Users/user/Projects/superapp/mobile/app/(app)/index.tsx) **1.405 baris, 22 `useState`** — setiap perubahan state me-render ulang seluruh dashboard.
- ⚠️ Enkripsi AES CryptoJS (JS murni) di thread JS untuk seluruh blob jurnal/finance — akan melambat seiring data membesar.
- ⚠️ AsyncStorage menyimpan seluruh modul sebagai satu JSON — O(n) parse per baca. Pertimbangkan `expo-sqlite` / MMKV untuk skala.

### 4.6 Reliabilitas & Observability — 40/100 🔴
- ❌ **Tidak ada crash reporting** (Sentry / Crashlytics). Crash di produksi tidak terlihat sama sekali.
- ❌ **Tidak ada Error Boundary** — expo-router mendukung `export function ErrorBoundary` per route; satu error render = white screen.
- ⚠️ Error sync hanya disimpan ke `whenya_last_sync_status`; tidak ada retry.

### 4.7 Maintainability — 50/100
- ✅ Struktur folder jelas (app / components / hooks / lib / context), path alias `@/*`, kode shared dengan web via `@superapp/shared`.
- ❌ `tsconfig.json`: **`strict: false`** → `tsc` 0 error tidak bermakna kuat; ditambah 128 `any`.
- ⚠️ `@types/react-native@0.72` terpasang padahal RN 0.86 sudah membawa tipe sendiri — potensi konflik tipe.
- ⚠️ Campuran bahasa pesan error/komentar (ID/EN) & teks UI di-hardcode bahasa Indonesia lalu diterjemahkan runtime via `tx("Beranda")` — rawan string tak terjemah.
- ⚠️ Folder `scratch/` di dalam `mobile/`.

### 4.8 Testability — 30/100 🔴
- 4 file test / 14 test untuk ±15.300 LOC; seluruhnya unit test `lib/` (storage, secureStorage, dashboardSummary, webRestore). **Nol** test komponen/hook/alur auth/sync, padahal `@testing-library/react-native` sudah terpasang.
- `"test": "jest --passWithNoTests"` menyembunyikan kondisi tanpa test.
- Tidak ada E2E (Maestro/Detox) maupun CI yang terlihat untuk mobile.

### 4.9 Kesiapan Rilis — 45/100 🔴

| ID | Temuan |
|---|---|
| REL-01 | `eas.json` submit iOS berisi placeholder (`your@apple.com`, `YOUR_APPLE_TEAM_ID`). |
| REL-02 | `google-services.json` berisi `{}` — FCM push Android tidak akan berfungsi di build standalone. |
| REL-03 | Bundle ID/package `com.selfone.mobile` tidak sesuai brand "Whenya"; **tidak bisa diubah setelah rilis store**. Putuskan sekarang. |
| REL-04 | `npm audit` tidak dapat dijalankan (pnpm); jalankan `pnpm audit` di pipeline. |
| REL-05 | Skrip `dev`/`start` memaksa `--go` (Expo Go); fitur native (SecureStore keystore, notifikasi) perlu diuji di development build. |

---

## 5. Matriks Prioritas Tindakan

| Prioritas | ID | Tindakan | Effort | Dampak |
|---|---|---|---|---|
| **P0** (minggu ini) | SEC-01 | Hapus `EXPO_PUBLIC_GROQ_API_KEY` dari `.env`, rotasi kunci di Groq | XS | Tinggi |
| **P0** | SEC-02 | Gagal-build/throw jika `!__DEV__ && !API_URL.startsWith('https')`; hapus IP hardcoded | S | Tinggi |
| **P0** | REL-03 | Finalisasi bundle ID sebelum submit store | XS | Tinggi |
| **P0** | 4.6 | Pasang `@sentry/react-native` + `ErrorBoundary` di root layout | S | Tinggi |
| **P1** (≤ 1 bulan) | A11Y-01/03 | Label & role untuk semua tombol ikon; perbaiki kontras warna inaktif | M | Tinggi |
| **P1** | 4.5 | Migrasi list data ke `FlatList`/`FlashList`; pecah `index.tsx` menjadi komponen | M | Sedang |
| **P1** | 4.8 | Test hook kritis (useAuth, useFinance, databaseSync) target coverage `lib/`+`hooks/` ≥ 60% | M | Sedang |
| **P1** | SEC-05 | Babel `transform-remove-console` di produksi | XS | Sedang |
| **P2** (kuartal) | 4.7 | Aktifkan `strict: true` bertahap; kurangi `any`; hapus `@types/react-native` | L | Sedang |
| **P2** | SEC-03/04 | Enkripsi data health; ganti crypto-js dengan AES-GCM native | M | Sedang |
| **P2** | 4.3 | Ganti hex hardcoded dengan token `useColors`; font minimum 11–12pt | M | Sedang |
| **P2** | REL-01/02 | Lengkapi kredensial EAS Submit & `google-services.json` via EAS secrets | S | Sedang |

---

## 6. Penilaian Jujur

**Yang sudah sangat baik:** keputusan arsitektur (local-first, enkripsi keystore, AI via backend, kode shared dengan web) menunjukkan kematangan teknis di atas rata-rata proyek solo/tim kecil. Ini fondasi yang layak dipertahankan.

**Yang paling mengkhawatirkan:** produk tumbuh **melebar lebih cepat daripada menguat**. Penambahan fitur (14+ modul) tidak diimbangi test, observability, dan aksesibilitas. Jika dirilis sekarang, Anda akan buta terhadap crash, dan sebagian pengguna (pembaca layar, low-vision) praktis tidak bisa memakai aplikasi.

**Rekomendasi strategis:** bekukan fitur baru 2–4 minggu, selesaikan seluruh P0 + P1, lalu evaluasi ulang. Target realistis setelahnya: **≥ 72/100 (Production-ready)**.

---

## 7. Keterbatasan Evaluasi
- Tidak ada pengujian runtime di perangkat fisik (performa, Dynamic Type, VoiceOver/TalkBack belum diukur).
- `npm audit` / `expo-doctor` tidak menghasilkan data kerentanan dependensi.
- Kode backend & `shared/` (termasuk logika `createDatabaseSync`) tidak diaudit.
- Skor bersifat penilaian ahli berbasis bukti, bukan sertifikasi formal.

## 8. Referensi
1. ISO/IEC 25010:2023 – *Systems and software Quality Requirements and Evaluation (SQuaRE) – Product quality model*.
2. OWASP MASVS v2.1 – https://mas.owasp.org/MASVS/
3. W3C WCAG 2.2 – https://www.w3.org/TR/WCAG22/
4. Apple Human Interface Guidelines – https://developer.apple.com/design/human-interface-guidelines/
5. Material Design 3 – https://m3.material.io/
6. React Native – Performance Overview & Optimizing FlatList – https://reactnative.dev/docs/performance
7. Expo – Environment variables – https://docs.expo.dev/guides/environment-variables/
8. Expo Router – Error handling – https://docs.expo.dev/router/error-handling/
9. ISO/IEC 5055:2021 – *Automated source code quality measures*.

## 9. Riwayat Revisi

| Versi | Tanggal | Perubahan | Penyusun |
|---|---|---|---|
| 1.0 | 2026-10-22 | Rilis awal | Antigravity (AI code reviewer) |
