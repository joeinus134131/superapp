# 🏗️ Mobile Architecture

Dokumentasi lengkap arsitektur mobile app React Native + Expo.

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────┐
│            App Entry (_layout.tsx)          │ Root Layout
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │      Provider Stack                 │   │
│  │  ┌─────────────┐                    │   │
│  │  │ ThemeProvider    (Dark/Light)   │   │
│  │  ├─────────────┤                    │   │
│  │  │ PremiumProvider  (Premium check) │   │
│  │  ├─────────────┤                    │   │
│  │  │ LanguageProvider (i18n EN/ID)   │   │
│  │  └─────────────┘                    │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
          │
          ├──► ┌──────────────────────┐
          │    │  User Authenticated? │
          │    └──────────────────────┘
          │            │
      ┌───┴────────────┴───┐
      │                    │
   YES │                   │ NO
      ▼                    ▼
  ┌────────┐          ┌─────────────┐
  │ (app)  │          │   (auth)    │
  │ Routes │          │   Routes    │
  └────────┘          └─────────────┘
      │                    │
      ├─ Dashboard        ├─ Login
      ├─ Tasks            └─ Register
      ├─ Habits
      ├─ Pomodoro
      └─ Profile
```

## 🗂️ File Structure

```
packages/mobile/
│
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx              # Root layout + context providers
│   │
│   ├── (auth)/                  # Auth stack (group)
│   │   ├── _layout.tsx          # Auth layout
│   │   ├── login.tsx            # Login screen
│   │   └── register.tsx         # Register screen
│   │
│   └── (app)/                   # Main app (protected routes)
│       ├── _layout.tsx          # Tab navigation
│       ├── index.tsx            # Dashboard
│       ├── tasks.tsx            # Tasks feature
│       ├── habits.tsx           # Habits feature
│       ├── pomodoro.tsx         # Pomodoro timer
│       └── profile.tsx          # User profile
│
├── context/                     # Global state with Context API
│   ├── themeContext.tsx         # Theme provider (isDark toggle)
│   ├── premiumContext.tsx       # Premium status check
│   └── languageContext.tsx      # i18n (EN/ID support)
│
├── hooks/                       # Custom React hooks
│   └── useAuth.ts               # Authentication logic
│
├── lib/                         # Utilities (mobile-specific)
│   └── (Ready for extension)
│
├── config/                      # Configuration files
│   ├── app.json                 # Expo configuration
│   ├── metro.config.js          # Metro bundler config
│   ├── tsconfig.json            # TypeScript config
│   ├── babel.config.js          # Babel config
│   └── .env.local               # Environment variables
│
└── package.json                 # Dependencies (19 packages)
```

## 🔄 Data Flow

### Authentication Flow
```
User Input (Email/Password)
    │
    ▼
useAuth Hook
    │
    ├─ Calls: auth.signInWithPassword()
    │
    ▼
Supabase Auth
    │
    ├─ Returns: User + Session Token
    │
    ▼
AsyncStorage (Persist)
    │
    └─ localStorage: superapp_user_id, superapp_token
    │
    ▼
Update State (user != null)
    │
    ▼
Redirect to (app) routes
```

### Theme Toggle Flow
```
User presses theme button
    │
    ▼
useTheme Hook
    │
    ├─ Call: toggleTheme()
    │
    ▼
Update state (isDark)
    │
    ├─ Save to AsyncStorage
    │
    ├─ Re-render all UI
    │
    ▼
Colors update immediately (no reload)
```

## 🔌 State Management

Using **Context API** (same as web):

### 1. ThemeContext
```typescript
{
  isDark: boolean
  toggleTheme: () => Promise<void>
}
```
- Persists to AsyncStorage
- Auto-detect system preference
- Used by: All screens

### 2. PremiumContext
```typescript
{
  isPremium: boolean
  checkoutUrl: string | null
  loading: boolean
}
```
- Fetches from Supabase
- Checks user.is_premium field
- Used by: Premium gates

### 3. LanguageContext
```typescript
{
  language: 'en' | 'id'
  setLanguage: (lang) => Promise<void>
  t: (key: string) => string
}
```
- Translation function
- Persists choice
- Used by: All UI text

## 🎯 Component Hierarchy

```
RootLayout (_layout.tsx)
├── ThemeProvider
│   └── PremiumProvider
│       └── LanguageProvider
│           └── Stack Navigator
│               ├── (auth) Stack
│               │   ├── LoginScreen
│               │   └── RegisterScreen
│               └── (app) Tabs
│                   ├── DashboardScreen
│                   ├── TasksScreen
│                   ├── HabitsScreen
│                   ├── PomodoroScreen
│                   └── ProfileScreen
```

## 🔗 Shared Code Integration

All business logic from `packages/shared`:

```typescript
// In mobile screens:
import { 
  supabase,           // Supabase client
  DICTIONARIES,       // i18n data
  gamificationUtils,  // XP/level system
  authUtils,          // Auth helpers
} from '@superapp/shared'
```

100% same code as web! 🎯

## 📊 Screen Details

### Dashboard (index.tsx)
- Shows: XP, Level, Streak, Tasks stats
- 6 feature buttons
- Recent activity log
- Responsive grid layout

### Login (login.tsx)
- Email & password fields
- Error message display
- Loading state
- Link to register

### Register (register.tsx)
- Name, email, password fields
- Password confirmation
- Validation
- Link to login

### Tab Navigation (_layout.tsx)
- 5 tabs: Home, Tasks, Habits, Focus, Profile
- Bottom tab bar
- Active/inactive styling
- Theme-aware colors

## 🎨 Styling

Using **React Native StyleSheet**:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: bgColor,
  },
  text: {
    fontSize: 16,
    color: textColor,
  },
})
```

**Theme Colors**:
- Dark: `#1a1a1a` (bg), `#ffffff` (text)
- Light: `#ffffff` (bg), `#000000` (text)
- Accent: `#8b5cf6` (purple)

## 🔐 Security

- ✅ Supabase auth (Firebase-like)
- ✅ JWT tokens stored in AsyncStorage
- ✅ Auto-logout on token expiry
- ✅ Password hashing server-side
- ✅ HTTPS enforced

## 🚀 Performance

- ✅ TypeScript for type safety
- ✅ React.memo for component memoization
- ✅ Lazy loading for screens
- ✅ Metro bundler optimization
- ✅ <1MB app size possible

## 📱 Platform Support

- ✅ Android 8+
- 🔜 iOS (ready but not built yet)
- 🔜 Web (via Expo Web)

## 🔧 Development Tools

- **Debugger**: React DevTools via Expo
- **Logs**: Terminal shows all console.log
- **Hot Reload**: Auto-reload on save
- **Remote Debugging**: Via browser devtools

## 📚 Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.75 |
| Runtime | Expo 51 |
| Routing | Expo Router 4 |
| State | Context API |
| Storage | AsyncStorage |
| DB/Auth | Supabase |
| Language | TypeScript 5 |
| Build | Metro Bundler |

---

**Status**: ✅ Production-ready architecture!
