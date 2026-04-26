# 📱 SuperApp Mobile - React Native + Expo

SuperApp mobile app built with React Native and Expo, sharing ~66% code with the web version.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android emulator or physical Android device
- (Optional) iOS: Xcode for testing

### Installation

1. **Install dependencies:**
```bash
cd packages/mobile
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase and Firebase credentials
```

3. **Start development server:**
```bash
npm start
```

4. **Run on Android:**
```bash
# Emulator
npm run android

# Or scan QR code with Expo Go app on physical device
```

5. **Run on iOS (macOS only):**
```bash
npm run ios
```

## 📁 Project Structure

```
packages/mobile/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout
│   ├── (auth)/                  # Auth screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/                   # App screens (after login)
│       ├── _layout.tsx          # Bottom tab navigation
│       ├── index.tsx            # Dashboard
│       ├── tasks.tsx
│       ├── habits.tsx
│       ├── pomodoro.tsx
│       └── profile.tsx
├── context/                      # Context providers
│   ├── themeContext.tsx         # Dark/Light theme
│   ├── premiumContext.tsx       # Premium status
│   └── languageContext.tsx      # i18n
├── hooks/                        # Custom hooks
│   └── useAuth.ts               # Auth logic
├── lib/                          # Mobile-specific utilities
│   ├── storage.ts               # AsyncStorage wrapper
│   ├── notifications.ts         # Push notifications
│   └── sounds.ts                # Audio management
├── components/                   # Reusable React Native components
├── app.json                      # Expo configuration
├── babel.config.js              # Babel configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

## 🔄 Code Reuse from Web

### 100% Reusable (No changes needed)
- Authentication logic (`@superapp/shared/auth`)
- Gamification system (`@superapp/shared/gamification`)
- Token system (`@superapp/shared/token-system`)
- Premium logic (`@superapp/shared/premium`)
- Supabase client (`@superapp/shared/supabase`)
- Helper functions (`@superapp/shared/helpers`)

### Adaptable (Minor changes)
- Storage: Web `localStorage` → Mobile `AsyncStorage`
- Theme: CSS variables → React Native StyleSheet
- Notifications: Web API → Firebase Cloud Messaging
- Audio: Web Audio API → expo-av

## 🎯 Key Features

✅ **Authentication**
- Login / Register with Supabase
- Session persistence
- Auto-logout on token expiration

✅ **Dashboard**
- XP & Level system
- Quick stats display
- Recent activity log
- Feature shortcuts

✅ **Theme System**
- Light/Dark mode toggle
- System preference detection
- Persistent theme preference

✅ **Internationalization**
- English & Indonesian support
- Language switching
- Persistent language preference

✅ **Premium Features** (When implemented)
- Pomodoro timer with soundscapes
- Advanced analytics
- Cloud sync
- Priority support

## 🔧 Development

### Running tests
```bash
npm test
```

### Building for production
```bash
# Build unsigned APK (for testing)
npm run build

# Build with EAS (recommended)
npm run eas-build
```

### Hot Reload
The app supports hot reload. Just save files and the app will refresh automatically.

## 📱 Firebase Setup for Push Notifications

1. Create a Firebase project at https://console.firebase.google.com
2. Get your credentials and add to `.env.local`
3. Configure push notifications in app:

```typescript
// In context/notificationContext.tsx (to be created)
import * as Notifications from 'expo-notifications'
import { getMessaging } from 'firebase/messaging'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})
```

## 🚀 Deployment

### Google Play Store

1. **Generate signing key:**
```bash
eas build:configure
```

2. **Build for production:**
```bash
eas build --platform android --release-channel production
```

3. **Upload to Play Store:**
   - Create app in Google Play Console
   - Upload AAB file
   - Fill in store listing
   - Submit for review

4. **Release:**
   - Start with 10% rollout
   - Monitor for crashes
   - Gradually increase to 100%

### iOS App Store (macOS only)

```bash
eas build --platform ios --release-channel production
# Then upload from Xcode Organizer or TestFlight
```

## 📊 Performance

### Target Metrics
- Cold start: < 3 seconds
- Hot start: < 1 second
- Frame rate: 60 FPS
- Memory: < 150MB
- App size: < 100MB

### Optimization Tips
- Use `React.memo()` for expensive components
- Implement FlatList for long lists
- Code-split screens with React.lazy
- Image optimization with react-native-fast-image

## 🐛 Debugging

### Using React DevTools
```bash
# In development, press 'd' in terminal
# Opens remote debugger
```

### Using Flipper
1. Download from https://fbflipper.com
2. Select device from device list
3. Browse React Components & Network calls

### Console Logging
```bash
# View logs in terminal while app runs
# Or connect Android Studio logcat for system logs
```

## 📖 Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Expo Router Guide](https://expo.github.io/router/introduction)
- [Android Design Guidelines](https://developer.android.com/design)
- [Firebase Setup](https://firebase.google.com/docs/android/setup)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test
3. Commit: `git commit -am 'Add new feature'`
4. Push: `git push origin feature/my-feature`
5. Create Pull Request

## 📝 Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
# Supabase (same as web)
EXPO_PUBLIC_SUPABASE_URL=your-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key

# Firebase (for push notifications)
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## ⚠️ Known Limitations

- Some web-only features not available on mobile
- Android 9+ required for optimal experience
- iOS support coming soon
- Offline mode needs manual implementation

## 📞 Support

For issues and feature requests:
1. Check [GitHub Issues](https://github.com/yourusername/superapp/issues)
2. Read [Documentation](../../ANDROID_IMPLEMENTATION_PLAN.md)
3. Join community chat

## 📄 License

MIT - See LICENSE file
