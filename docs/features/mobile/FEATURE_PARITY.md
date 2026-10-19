# Mobile Feature Parity — iOS & Android

Dokumen ini merangkum semua perubahan yang dilakukan untuk mencapai feature parity antara web dan mobile (iOS + Android).

---

## Screens Baru yang Ditambahkan

| Screen | File | Fitur Utama |
|--------|------|-------------|
| Finance | `app/(app)/finance.tsx` | Income/expense tracker, balance card, filter kategori, CRUD transaksi |
| Goals | `app/(app)/goals.tsx` | Goal tracker, progress bar 0-100%, kategori, XP saat selesai (100 XP) |
| Health | `app/(app)/health.tsx` | Workout log, daily metrics (steps/water/sleep/weight), weekly stats, XP (15 XP) |
| Journal | `app/(app)/journal.tsx` | Mood tracking, tags, search, today's prompt, XP saat entri (20 XP) |
| Reading | `app/(app)/reading.tsx` | Book tracker, progress halaman (+1/+10 controls), status, rating bintang, XP saat selesai buku (75 XP) |
| Calendar | `app/(app)/calendar.tsx` | Kalender grid interaktif, CRUD events, kategori, all-day toggle, upcoming events |
| Achievements | `app/(app)/achievements.tsx` | 21 pencapaian berdasarkan data nyata (XP, tasks, habits, journal, dll.), level badge, stats summary |
| More (Hub) | `app/(app)/more.tsx` | Hub navigasi ke semua fitur, profile card dengan XP/level, theme toggle, logout |

---

## Navigasi yang Diperbarui

### `app/(app)/_layout.tsx`
- **Sebelum**: 5 tab — Home, Tasks, Habits, Focus, Profile
- **Sesudah**: 5 tab — Home, Tasks, Habits, Focus, **More**
- Tab `Profile` dipindah ke hidden (href: null) — bisa diakses via More
- Semua 7 screen baru didaftarkan sebagai hidden (`href: null`) agar tidak muncul di tab bar tapi bisa dinavigasi

### `app/(app)/index.tsx` (Dashboard)
- Quick Actions diperluas dari 4 → 8 item:
  - Tasks, Habits, Pomodoro, Finance, Goals, Reading, Health, Journal

---

## Sistem yang Digunakan di Semua Screen Baru

### Storage
- Semua screen menggunakan `lib/storage.ts` dengan `AsyncStorage`
- Key yang digunakan: `STORAGE_KEYS.READING`, `EVENTS`, `ACHIEVEMENTS`, dll.

### Gamification (XP)
```
TASK_COMPLETE  = 15 XP
HABIT_DONE     = 10 XP
JOURNAL_ENTRY  = 20 XP
POMODORO_SESSION = 25 XP
GOAL_COMPLETE  = 100 XP
BOOK_COMPLETE  = 75 XP
WORKOUT        = 15 XP
```

### Theme
- Semua screen mendukung dark/light mode via `useTheme()` + `useColors(isDark)`
- Toggle tersedia di More screen

---

## Konfigurasi iOS (app.json)

### Permissions yang Ditambahkan
```json
"infoPlist": {
  "NSCameraUsageDescription": "...",
  "NSPhotoLibraryUsageDescription": "...",
  "NSLocalNotificationUsageDescription": "...",
  "NSHealthShareUsageDescription": "...",
  "UIBackgroundModes": ["fetch", "remote-notification"]
}
```

### Android Permissions
```json
"permissions": ["VIBRATE", "POST_NOTIFICATIONS", "SCHEDULE_EXACT_ALARM"]
```

---

## Dependensi yang Ditambahkan

| Package | Versi | Kegunaan |
|---------|-------|----------|
| `react-native-svg` | ^15.12.1 | Icon dan grafik SVG |
| `expo-linking` | ^8.0.11 | Deep linking |
| `crypto-js` | ^4.2.0 | Enkripsi ID unik |
| `@expo/metro-runtime` | ^6.1.2 | Metro bundler runtime |

---

## Struktur File Final

```
packages/mobile/
├── app/
│   ├── _layout.tsx              # Root navigator (auth guard)
│   ├── (app)/
│   │   ├── _layout.tsx          # Tab navigator (5 tabs + 8 hidden)
│   │   ├── index.tsx            # Dashboard
│   │   ├── tasks.tsx            # Task manager
│   │   ├── habits.tsx           # Habit tracker
│   │   ├── pomodoro.tsx         # Pomodoro timer
│   │   ├── profile.tsx          # Profile (hidden, via More)
│   │   ├── more.tsx             # Hub / navigasi ke semua fitur ✨
│   │   ├── finance.tsx          # Keuangan ✨
│   │   ├── goals.tsx            # Tujuan ✨
│   │   ├── health.tsx           # Kesehatan ✨
│   │   ├── journal.tsx          # Jurnal ✨
│   │   ├── reading.tsx          # Membaca ✨
│   │   ├── calendar.tsx         # Kalender ✨
│   │   └── achievements.tsx     # Pencapaian ✨
│   └── (auth)/
│       ├── login.tsx
│       └── register.tsx
├── lib/
│   ├── storage.ts               # AsyncStorage adapter
│   ├── helpers.ts               # Utility functions
│   ├── gamification.ts          # XP system
│   └── theme.ts                 # Color tokens
├── context/
│   ├── themeContext.tsx
│   ├── premiumContext.tsx
│   └── languageContext.tsx
├── hooks/
│   └── useAuth.ts
└── assets/
    ├── fonts/SpaceMono-Regular.ttf
    ├── icon.png
    ├── splash.png
    ├── adaptive-icon.png
    └── favicon.png
```

---

## Build ke Production

### Android (APK/AAB)
```bash
cd packages/mobile
eas build --platform android --profile production
```

### iOS (IPA)
```bash
cd packages/mobile
eas build --platform ios --profile production
```

### Kedua Platform Sekaligus
```bash
eas build --platform all --profile production
```

### Dari Root Monorepo (via Turborepo)
```bash
pnpm run build:mobile
```

---

*Dibuat: 2026-04-25 | Versi Mobile: 1.0.0 | Expo SDK: ~54.0.33*
