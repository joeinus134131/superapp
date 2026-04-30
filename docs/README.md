# SuperApp — Documentation

Dokumentasi lengkap untuk SuperApp monorepo (Web + Mobile).

---

## Mulai dari Sini

| Tujuan | Dokumen |
|--------|---------|
| Pertama kali setup | [guides/GETTING_STARTED.md](./guides/GETTING_STARTED.md) |
| Quick start mobile | [guides/QUICK_START_MOBILE.md](./guides/QUICK_START_MOBILE.md) |
| Setup monorepo | [guides/MONOREPO_SETUP.md](./guides/MONOREPO_SETUP.md) |
| Ada error? | [troubleshooting/COMMON_ERRORS.md](./troubleshooting/COMMON_ERRORS.md) |

---

## Struktur Dokumentasi

```
docs/
├── README.md                          ← kamu di sini
│
├── guides/                            ← cara penggunaan & setup
│   ├── GETTING_STARTED.md             first-time setup semua platform
│   ├── QUICK_START.md                 ringkasan cepat
│   ├── QUICK_START_MOBILE.md          mobile-specific quickstart
│   ├── COMMAND_REFERENCE.md           referensi perintah CLI
│   ├── MONOREPO_SETUP.md              setup pnpm workspaces + Turborepo
│   ├── MOBILE_SETUP.md                setup Expo + EAS Build
│   ├── WEB_SETUP.md                   setup Next.js
│   └── mobile/
│       ├── IMPLEMENTATION_SUMMARY.md  ringkasan fitur yang dibangun
│       ├── IMPLEMENTATION_CHECKLIST.md checklist status fitur
│       ├── SETUP_COMPLETE.md           catatan setup lengkap
│       └── LAUNCH.md                   catatan launch & run
│
├── architecture/                      ← keputusan desain sistem
│   ├── MONOREPO.md                    struktur & rationale monorepo
│   ├── MONOREPO_MIGRATION.md          riwayat migrasi ke monorepo
│   ├── MOBILE_ARCHITECTURE.md         arsitektur app mobile
│   └── SHARED_CODE_REUSE.md           strategi shared code
│
├── features/                          ← dokumentasi per fitur
│   └── mobile/
│       └── FEATURE_PARITY.md          parity fitur web ↔ mobile
│
├── deployment/                        ← build & release guide
│   └── ANDROID_IMPLEMENTATION_PLAN.md rencana implementasi Android
│
└── troubleshooting/                   ← penyelesaian error
    ├── COMMON_ERRORS.md               error umum semua platform
    └── mobile/
        ├── ERROR_FIXES.md             perbaikan error mobile
        ├── ALL_FIXED.md               status semua fix
        └── FIXED_STATUS.md            detail status perbaikan
```

---

## Platform

| Platform | Package | Tech Stack |
|----------|---------|-----------|
| Web | `packages/web` | Next.js 15, React 19 |
| Mobile | `packages/mobile` | Expo SDK 54, React Native 0.81 |
| Shared | `packages/shared` | TypeScript utilities |

---

## Development

```bash
# Install semua dependencies
pnpm install

# Jalankan semua (web + mobile)
pnpm dev

# Hanya web
pnpm dev:web

# Hanya mobile
pnpm dev:mobile
```
