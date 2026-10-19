# SuperApp Monorepo Migration Summary

> Tanggal migrasi: 2026-04-26  
> Dari: Semi-monorepo (web di root) → Proper monorepo (Turborepo + pnpm workspaces)

---

## Struktur Sebelum vs Sesudah

### Sebelum
```
superapp/                   ← root = Next.js web app (masalah!)
├── app/
├── components/
├── lib/                    ← duplikat dari packages/shared/lib/
├── public/
├── next.config.mjs
├── jsconfig.json
├── package.json            ← berisi Next.js deps + pnpm workspace
├── package-lock.json       ← npm lock file (konflik dengan pnpm!)
├── pnpm-workspace.yaml
└── packages/
    ├── mobile/
    │   ├── package-lock.json  ← npm lock (inkonsisten)
    │   └── metro.config.js    ← broken monorepo config
    └── shared/
        └── package-lock.json  ← npm lock (inkonsisten)
```

### Sesudah
```
superapp/                   ← workspace root ONLY
├── packages/
│   ├── web/                ← Next.js app (pindah dari root)
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── next.config.mjs ← dengan transpilePackages shared
│   │   ├── jsconfig.json   ← paths ke @superapp/shared
│   │   └── package.json    ← @superapp/web
│   ├── mobile/             ← Expo React Native
│   │   ├── app/
│   │   ├── metro.config.js ← fixed monorepo support
│   │   ├── eas.json        ← EAS Build config (baru)
│   │   └── package.json    ← scripts lengkap
│   └── shared/             ← shared logic (auth, gamification, dll)
│       ├── lib/
│       ├── index.js
│       └── package.json    ← @superapp/shared
├── .github/
│   └── workflows/
│       ├── web-ci.yml         ← CI web (path-filtered)
│       ├── mobile-ci.yml      ← CI mobile (path-filtered)
│       └── mobile-release.yml ← manual production release
├── turbo.json              ← build orchestration (baru)
├── package.json            ← workspace root only + turbo scripts
├── pnpm-workspace.yaml     ← packages/*
└── .gitignore              ← monorepo-aware
```

---

## Perubahan Detail

### 1. Web App → `packages/web/`
- Semua file Next.js dipindah dari root ke `packages/web/`
- Package name: `@superapp/web`
- `next.config.mjs` ditambah `transpilePackages: ['@superapp/shared']`
- `jsconfig.json` ditambah path alias ke `@superapp/shared`

### 2. Root `package.json` → Workspace Root
- Tidak lagi berisi Next.js dependencies
- Hanya berisi Turborepo dev dependency + workspace scripts
- `packageManager: "pnpm@9.0.0"` untuk enforce pnpm

### 3. Standardisasi Package Manager → pnpm
| File | Action |
|------|--------|
| `/package-lock.json` | Dihapus |
| `packages/shared/package-lock.json` | Dihapus |
| `packages/mobile/package-lock.json` | Perlu dihapus manual (ada node_modules) |
- `.gitignore` sekarang mengexclude `package-lock.json` dan `yarn.lock`

### 4. Turborepo (`turbo.json`)
```json
tasks:
  build   → dependsOn ["^build"] (shared build dulu, baru web/mobile)
  dev     → cache: false, persistent: true
  lint    → dependsOn ["^build"]
  test    → dependsOn ["^build"]
```
Manfaat:
- **Caching**: kalau `packages/shared` tidak berubah, tidak di-rebuild
- **Parallelism**: web dan mobile bisa build paralel
- **Single command**: `pnpm build` di root build semua

### 5. Metro Config Mobile (Fixed)
```js
// packages/mobile/metro.config.js
config.watchFolders = [workspaceRoot];        // watch seluruh monorepo
config.resolver.nodeModulesPaths = [          // resolve dari kedua node_modules
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  '@superapp/shared': path.join(workspaceRoot, 'packages/shared'),
};
```

### 6. EAS Build Config (`packages/mobile/eas.json`)
| Profile | Platform | Output | Tujuan |
|---------|----------|--------|--------|
| `development` | Android/iOS | APK + Simulator | Dev testing |
| `preview` | Android/iOS | APK (internal) | QA/staging |
| `production` | Android/iOS | AAB + IPA | Store release |

### 7. Mobile Scripts Baru
```bash
pnpm --filter @superapp/mobile build:android   # AAB production
pnpm --filter @superapp/mobile build:ios        # IPA production
pnpm --filter @superapp/mobile build:preview    # APK preview
pnpm --filter @superapp/mobile submit:android   # Upload ke Play Store
pnpm --filter @superapp/mobile submit:ios       # Upload ke App Store
pnpm --filter @superapp/mobile update           # OTA update via EAS Update
```

### 8. GitHub Actions (Path-Filtered)
| Workflow | Trigger | Yang di-build |
|----------|---------|---------------|
| `web-ci.yml` | push/PR ke `packages/web/**` atau `packages/shared/**` | Next.js lint + build |
| `mobile-ci.yml` | push/PR ke `packages/mobile/**` atau `packages/shared/**` | RN test + EAS preview (main only) |
| `mobile-release.yml` | Manual (`workflow_dispatch`) | EAS production build + optional submit |

---

## Cara Deploy Production

### Web (Vercel)
1. Connect repo ke Vercel
2. Set **Root Directory**: `packages/web`
3. Build command: `next build` (Vercel auto-detect)
4. Environment variables di Vercel dashboard

### Mobile Android (Play Store)
```bash
# Via GitHub Actions (recommended)
# → GitHub → Actions → "Mobile Release" → Run workflow → platform: android → submit: true

# Atau manual dari local:
cd packages/mobile
eas build --platform android --profile production
eas submit --platform android --profile production
```

### Mobile iOS (App Store)
```bash
# Via GitHub Actions:
# → GitHub → Actions → "Mobile Release" → Run workflow → platform: ios → submit: true

# Atau manual:
cd packages/mobile
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

### OTA Update (tanpa store review)
```bash
# Update JS bundle langsung ke user (untuk bug fix minor)
cd packages/mobile
eas update --branch production --message "Fix: deskripsi update"
```

---

## Setup Awal yang Perlu Dilakukan

### 1. Install pnpm (jika belum)
```bash
npm install -g pnpm@9
```

### 2. Install semua dependencies
```bash
# Di root monorepo
pnpm install
```

### 3. Setup EAS (mobile)
```bash
npm install -g eas-cli
cd packages/mobile
eas login
eas project:init   # generate projectId, update app.json
```

### 4. Setup Vercel (web)
- Connect repo di vercel.com
- Set Root Directory: `packages/web`
- Tambah env variables

### 5. Setup GitHub Secrets
```
EXPO_TOKEN          → dari expo.dev/accounts/[user]/settings/access-tokens
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Commands Sehari-hari

```bash
# Development
pnpm dev              # start semua (web + mobile)
pnpm dev:web          # start web only
pnpm dev:mobile       # start mobile only (Expo)

# Build
pnpm build            # build semua packages
pnpm build:web        # build web only
pnpm build:mobile     # EAS build production

# Per-package langsung
pnpm --filter @superapp/web dev
pnpm --filter @superapp/mobile start
pnpm --filter @superapp/shared build
```

---

## Next Steps (Opsional tapi Recommended)

1. **Konsolidasi `packages/web/lib/`** → gunakan `@superapp/shared` langsung
   - Saat ini web masih punya `lib/` sendiri yang duplikat dengan shared
   - Ganti import `@/lib/xxx` → `@superapp/shared/xxx`

2. **Tambah `packages/mobile/package-lock.json` ke .gitignore** dan hapus
   - Sudah ada di `.gitignore` baru, tinggal `git rm --cached`

3. **Tambah ESLint config** di `packages/web/` untuk `pnpm lint` bisa jalan di CI

4. **Setup Expo EAS Project ID** di `packages/mobile/app.json` setelah `eas project:init`

5. **Pertimbangkan TypeScript** untuk `packages/web/` (dari .js ke .tsx)
