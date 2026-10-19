# 🚀 Mobile Setup Guide

Panduan lengkap setup React Native + Expo mobile development.

## ✅ Prerequisites

- Node.js 18+ 
- npm atau pnpm
- Android device atau emulator
- Expo Go app (untuk testing)

## 📋 Setup Steps

### 1. Navigate to Mobile Directory
```bash
cd /Users/user/superapp/packages/mobile
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Configure Environment
```bash
# Copy template
cp .env.local.example .env.local

# Edit dengan credential Supabase:
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### 4. Verify All Files Green
```bash
# Should see no TypeScript errors
npm run type-check
```

### 5. Start Development Server
```bash
npm start
```

Expected output:
```
Starting Metro Bundler
✓ QR Code displayed
› Metro waiting on exp://10.97.182.39:8081
```

## 📱 Testing on Device

### Android Physical Device
1. Install "Expo Go" dari Google Play
2. Buka Expo Go app
3. Scan QR code dari terminal
4. App akan loading & membuka 🎊

### Android Emulator
```bash
# With emulator running:
npm run android
# Or press 'a' saat app running
```

### Web Browser (Quick Test)
```bash
# Tekan 'w' saat app running
npm run web
```

## 🔥 Hot Reload

Setiap kali save file:
- Changes auto-apply (no rebuild needed)
- Press 'r' untuk force reload
- Press 'm' untuk toggle menu

## 📦 Project Structure

```
packages/mobile/
├── app/                 10 screens (auth & app)
├── context/             3 providers (theme, premium, language)
├── hooks/               useAuth for authentication
├── lib/                 Mobile utilities
├── app.json             Expo configuration
├── tsconfig.json        TypeScript config
├── metro.config.js      Metro bundler config
└── package.json         19 dependencies
```

## ✨ Key Features Included

- ✅ Authentication (login/register)
- ✅ Bottom tab navigation
- ✅ Dark/Light theme
- ✅ English/Indonesian i18n
- ✅ 66% code reuse from web
- ✅ Supabase integration
- ✅ TypeScript full coverage

## 🐛 Troubleshooting

**Error: Too many open files**
```bash
ulimit -n 4096
npm start
```

**Error: Module not found**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**QR code not showing**
- Make sure Metro is running (`Starting Metro Bundler`)
- Check firewall allow localhost:8081
- Kill & restart: `pkill -f "npm start"`

## 📚 More Info

- See `docs/troubleshooting/MOBILE_ERRORS.md` for common issues
- See `docs/architecture/MOBILE_ARCHITECTURE.md` for structure
- See `packages/mobile/RUNNING.md` for current status

---

**Status**: ✅ Ready to develop!
