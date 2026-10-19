# ⚡ Quick Start Guide

Panduan cepat untuk mulai develop SuperApp (5 menit!).

## 🚀 Setup Cepat

### 1️⃣ Clone & Install
```bash
git clone <repo-url>
cd superapp
npm install
```

### 2️⃣ Setup Environment
```bash
# Copy template
cp .env.example .env.local

# Edit dengan Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3️⃣ Start Development

**Web Development**
```bash
npm run dev
# Open: http://localhost:3000
```

**Mobile Development**
```bash
cd packages/mobile
npm install --legacy-peer-deps
npm start
# Scan QR code dengan Expo Go
```

## 📁 Project Structure

```
superapp/
├── app/                 Next.js web app
├── packages/
│   ├── mobile/          React Native + Expo
│   └── shared/          Shared code (66% reuse)
└── docs/                Documentation ← YOU ARE HERE
```

## ✨ Key Features

- 🔐 **Auth**: Login/Register with Supabase
- 📊 **Dashboard**: Stats, XP, levels
- 🎮 **Gamification**: Streaks, badges, rewards
- 🌙 **Theme**: Dark/Light mode
- 🌐 **i18n**: English & Indonesian
- 💎 **Premium**: Membership system
- 🔄 **Sync**: Cloud synchronization
- 📱 **Mobile**: Full React Native app

## 🛠️ Commands

```bash
# Web
npm run dev                 # Start dev server
npm run build             # Production build
npm run lint              # Check code quality

# Mobile
cd packages/mobile
npm start                 # Start Expo
npm run android           # Android emulator
npm run web              # Web version

# Monorepo
npm install              # Install all packages
pnpm --filter mobile start  # Run mobile only
```

## 🧪 Testing Checklist

```
✓ Web loads at localhost:3000
✓ Can login with email/password
✓ Dashboard shows stats
✓ Theme toggle works
✓ Language switch works (EN/ID)
✓ Mobile QR code scans
✓ Mobile app opens on phone
✓ Mobile auth works
```

## 📚 Need More Help?

| Topic | File |
|-------|------|
| Web setup | `docs/guides/WEB_SETUP.md` |
| Mobile setup | `docs/guides/MOBILE_SETUP.md` |
| Monorepo | `docs/guides/MONOREPO_SETUP.md` |
| Errors | `docs/troubleshooting/COMMON_ERRORS.md` |
| Architecture | `docs/architecture/MOBILE_ARCHITECTURE.md` |

## 🎯 Next Steps

1. ✅ Setup environment
2. ✅ Start web or mobile
3. ✅ Login with test account
4. ✅ Explore features
5. ✅ Start coding!

## 💡 Pro Tips

- **Hot reload**: Changes auto-apply (no restart needed)
- **TypeScript**: Full type safety for better dev experience
- **Shared code**: Use `@superapp/shared` in both web & mobile
- **Storage**: Data synced with Supabase (cloud)

---

**Ready?** Start with:
```bash
npm run dev              # Web
# OR
cd packages/mobile && npm start  # Mobile
```

**Stuck?** Check `docs/troubleshooting/` folder.

---

**Status**: ✅ Ready to rock! 🚀
