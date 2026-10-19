# 🚀 SuperApp - Web + Mobile Monorepo

A comprehensive productivity suite available on both web and mobile, sharing ~66% of codebase.

## 📚 Project Structure

```
superapp/
├── packages/
│   ├── shared/              # Shared logic & utilities (~66% reuse)
│   │   ├── lib/            # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── package.json
│   │
│   ├── web/                # 🌐 Next.js web app
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   │
│   └── mobile/             # 📱 React Native + Expo app
│       ├── app/           # Expo Router screens
│       ├── context/       # Context providers
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Mobile utilities
│       └── package.json
│
├── pnpm-workspace.yaml    # Monorepo configuration
├── ANDROID_IMPLEMENTATION_PLAN.md  # Detailed plan
└── README.md              # This file
```

## 🎯 Quick Start

### Setup

1. **Install pnpm:**
```bash
npm install -g pnpm
# or brew install pnpm (macOS)
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Setup environment variables:**
```bash
# Web
cp apps/web/.env.example apps/web/.env.local

# Mobile
cp packages/mobile/.env.example packages/mobile/.env.local
```

### Running Locally

**Web:**
```bash
cd packages/web
npm run dev
# Opens http://localhost:3000
```

**Mobile (Android):**
```bash
cd packages/mobile
npm start
npm run android
```

**Mobile (iOS):**
```bash
cd packages/mobile
npm start
npm run ios
```

## 📱 What's Included

### Features
- ✅ Task Management
- ✅ Habit Tracking
- ✅ Goal Setting
- ✅ Finance Tracking
- ✅ Pomodoro Timer
- ✅ Ambient Soundscapes
- ✅ Journal/Notes
- ✅ Reading Tracker
- ✅ Health Stats
- ✅ Gamification (XP, Levels, Streaks)
- ✅ Premium Subscription
- ✅ Cloud Sync
- ✅ Dark/Light Mode
- ✅ Multi-language (EN, ID)

### Shared Code

| Feature | Type | Status |
|---------|------|--------|
| Authentication | 100% | ✅ Shared |
| Gamification | 100% | ✅ Shared |
| Token System | 100% | ✅ Shared |
| Premium Logic | 100% | ✅ Shared |
| API Calls | 100% | ✅ Shared |
| Helpers | 100% | ✅ Shared |
| Storage Adapter | 90% | 🔄 Adapted |
| Theme System | 85% | 🔄 Adapted |
| i18n | 100% | ✅ Shared |
| UI Components | 40% | 🔄 Platform-specific |

**Total Code Reuse: ~66%** 🎉

## 🛠️ Tech Stack

### Shared (@superapp/shared)
- TypeScript
- Supabase (DB + Auth)
- Axios (HTTP)

### Web (packages/web)
- **Framework:** Next.js 16 + React 19
- **Styling:** CSS modules + CSS variables
- **State:** Context API + React Hooks
- **Build:** Next.js bundler
- **Deploy:** Vercel / Self-hosted

### Mobile (packages/mobile)
- **Framework:** React Native 0.74 + Expo
- **Routing:** Expo Router (file-based)
- **Styling:** React Native StyleSheet
- **State:** Context API + React Hooks
- **Storage:** AsyncStorage
- **Notifications:** Firebase + expo-notifications
- **Audio:** expo-av
- **Build:** EAS Build / Expo CLI
- **Deploy:** Google Play Store / App Store

## 📦 Monorepo Commands

### Install Dependencies
```bash
pnpm install
```

### Update Dependencies
```bash
pnpm update
```

### Run All Dev Servers
```bash
# Terminal 1
cd packages/web && npm run dev

# Terminal 2
cd packages/mobile && npm start
```

### Build All
```bash
pnpm -r run build
```

### Run Tests
```bash
pnpm -r run test
```

### Clean All
```bash
pnpm -r run clean
pnpm install
```

## 🔄 Development Workflow

1. **Shared Logic:** Modify in `packages/shared/lib/`
2. **Changes propagate** to both web and mobile automatically (via workspace references)
3. **Platform-specific code:** Implement in `packages/web/` or `packages/mobile/`

### Adding a New Shared Utility

1. Create in `packages/shared/lib/myUtility.ts`
2. Export from `packages/shared/index.js`
3. Import in apps:
```typescript
import { myUtility } from '@superapp/shared'
```

## 🚀 Deployment

### Web Deployment

**To Vercel:**
```bash
cd packages/web
npm run build
vercel deploy
```

**Self-hosted:**
```bash
cd packages/web
npm run build
npm run start
```

### Mobile Deployment

**Android to Google Play:**
```bash
cd packages/mobile
npm run eas-build
# Follow prompts to upload to Play Store
```

**iOS to App Store:**
```bash
cd packages/mobile
npm run eas-build -- --platform ios
# Follow prompts to upload to TestFlight/App Store
```

See [ANDROID_IMPLEMENTATION_PLAN.md](./ANDROID_IMPLEMENTATION_PLAN.md) for detailed deployment guide.

## 📊 Performance

### Web
- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1

### Mobile
- Cold start: < 3s
- Hot start: < 1s
- FPS: 60 FPS
- Memory: < 150MB

## 🔐 Environment Variables

### Shared (Required for both)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Web-only
```env
# Analytics
NEXT_PUBLIC_GA_ID=your-ga-id
```

### Mobile-only
```env
# Firebase (push notifications)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
```

## 🐛 Troubleshooting

### Dependencies not installing?
```bash
pnpm clean
pnpm install
```

### Mobile app not building?
```bash
cd packages/mobile
npm run prebuild -- --clean
npm start
npm run android
```

### Shared package not updating?
```bash
cd packages/shared
npm run build  # if there's a build script

# Then in mobile/web
rm -rf node_modules/@superapp/shared
pnpm install
```

## 📚 Documentation

- [Web App README](./packages/web/README.md)
- [Mobile App README](./packages/mobile/README.md)
- [Shared Package README](./packages/shared/README.md)
- [Android Implementation Plan](./ANDROID_IMPLEMENTATION_PLAN.md)
- [Midtrans Setup](./MIDTRANS_SETUP.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes in appropriate package
4. Test both web and mobile
5. Commit: `git commit -am 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Create Pull Request

## 📱 App Stores

- **Android:** [Google Play Store](https://play.google.com/store/apps/details?id=com.superapp.mobile)
- **iOS:** [App Store](https://apps.apple.com/app/superapp/id1234567890) (Coming soon)
- **Web:** [superapp.vercel.app](https://superapp.vercel.app)

## 📞 Support

- 📧 Email: support@superapp.com
- 💬 Discord: [Join our community](https://discord.gg/superapp)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/superapp/issues)
- 📖 Docs: [Full Documentation](https://docs.superapp.com)

## 📄 License

MIT - See LICENSE file

## 🎉 Credits

Built with ❤️ by SuperApp Team

---

## 🚀 Next Steps

1. ✅ Setup complete!
2. 📝 Install dependencies: `pnpm install`
3. ⚙️ Configure environment variables
4. 🏃 Start development: `npm run dev` (web) or `npm start` (mobile)
5. 🎉 Begin building amazing features!

Happy coding! 🚀
