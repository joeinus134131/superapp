# 📦 Monorepo Setup Guide

Panduan setup & struktur monorepo SuperApp.

## 🏗️ Architecture Overview

Menggunakan **pnpm workspaces** untuk monorepo dengan 3 packages:

```
superapp/
├── app/                 Web (Next.js)
├── packages/
│   ├── mobile/          Android (React Native + Expo)
│   └── shared/          Shared code (~66% reuse)
└── pnpm-workspace.yaml  Workspace config
```

## 📊 Code Reuse Strategy

### 100% Shared (No Changes)
```
packages/shared/lib/
├── auth.js              Authentication logic
├── gamification.js      XP/levels/badges
├── tokenSystem.js       Token management
├── premium.js           Premium features
├── supabaseClient.js    Supabase setup
├── storage.js           Cross-platform storage
├── notifications.js     Push notifications
├── backup.js            Backup system
├── cloudSync.js         Cloud sync
├── dictionaries.js      i18n (EN/ID)
└── helpers.js           Utility functions
```

### 90% Adaptable (Minor Changes)
- **Storage**: `localStorage` (web) vs `AsyncStorage` (mobile)
- **Styling**: CSS (web) vs StyleSheet (mobile)
- **UI Components**: Next.js (web) vs React Native (mobile)

**Total Code Reuse: ~66%** 🎯

## 🚀 Setup Steps

### 1. Install pnpm (Global)
```bash
npm install -g pnpm
```

### 2. Install Dependencies
```bash
cd /Users/user/superapp

# Install all packages in monorepo
pnpm install

# or with npm
npm install
```

### 3. Workspace Commands

```bash
# Install package in specific workspace
pnpm add package-name -w                    # Root
pnpm add package-name --filter mobile       # Mobile
pnpm add package-name --filter shared       # Shared

# Run scripts in workspaces
pnpm --filter mobile start                  # Start mobile
pnpm --filter web dev                       # Start web
pnpm --filter shared build                  # Build shared
```

### 4. Linking Packages

Mobile can import from shared:
```typescript
import { supabase } from '@superapp/shared'
import { DICTIONARIES } from '@superapp/shared'
```

Web can import from shared:
```javascript
import { auth } from '@superapp/shared'
import { tokenSystem } from '@superapp/shared'
```

## 📁 Package Structure

### `/packages/shared/`
```
├── lib/                 Business logic
│   ├── auth.js
│   ├── gamification.js
│   ├── storage.js
│   └── ... (13+ files)
├── package.json         Published as @superapp/shared
└── index.js             Export all modules
```

### `/packages/mobile/`
```
├── app/                 10 screens
│   ├── (auth)/          Login/Register
│   ├── (app)/           Main app tabs
│   └── _layout.tsx      Root layout
├── context/             3 providers
├── hooks/               useAuth
├── package.json         @superapp/mobile
├── app.json             Expo config
├── metro.config.js      Metro config
└── tsconfig.json        TypeScript config
```

### `/app/` (Web)
```
├── layout.js            Root layout
├── page.js              Dashboard
├── components/          Reusable UI
├── lib/                 Web utilities
├── api/                 API routes
└── public/              Static files
```

## 🔄 Development Workflow

### Web Development
```bash
# Terminal 1: Start web
npm run dev

# Terminal 2: Start shared (if changes)
cd packages/shared
npm run build --watch
```

### Mobile Development
```bash
# Terminal 1: Start mobile
cd packages/mobile
npm start

# Terminal 2: Make changes
# Auto hot reload!
```

### Both Simultaneously
```bash
# Terminal 1: Web
npm run dev

# Terminal 2: Mobile
cd packages/mobile
npm start

# Terminal 3: Open editor
code .
```

## 🔗 Sharing Code Between Apps

### Example: Using auth from shared
```javascript
// In mobile: app/(auth)/login.tsx
import { supabase } from '@superapp/shared'

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})
```

```javascript
// In web: app/page.js
import { supabase } from '@superapp/shared'

const { user } = useAuth()  // Same user object!
```

## 📚 File Locations

| Item | Location |
|------|----------|
| Web setup | `docs/guides/WEB_SETUP.md` |
| Mobile setup | `docs/guides/MOBILE_SETUP.md` |
| Shared code | `packages/shared/` |
| Mobile code | `packages/mobile/` |
| Web code | `app/` |
| Config | Root: `pnpm-workspace.yaml` |

## 🎯 Benefits of Monorepo

✅ **Code Reuse**: 66% shared code between web & mobile
✅ **Consistency**: Same auth, same gamification, same DB
✅ **Faster Dev**: Update logic once, works everywhere
✅ **Easier Maintenance**: Single source of truth
✅ **Scalability**: Easy to add more packages (e.g., desktop, CLI)

## 🚨 Common Issues

**Package not found**
```bash
# Regenerate links
pnpm install
```

**Changes not reflected in other package**
```bash
# Rebuild shared
cd packages/shared
npm run build
```

**Module resolution error**
- Check `tsconfig.json` paths
- Check `package.json` dependencies
- Run `npm install` again

## 📖 More Info

- See `docs/architecture/SHARED_CODE_REUSE.md` for details
- See individual package README files
- See root `README.md` for overview

---

**Status**: ✅ Fully configured!
