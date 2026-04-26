# 🌐 Web Setup Guide

Panduan lengkap setup Next.js web development.

## ✅ Prerequisites

- Node.js 18+
- npm atau pnpm
- Code editor (VS Code recommended)

## 📋 Setup Steps

### 1. Navigate to Root Directory
```bash
cd /Users/user/superapp
```

### 2. Install Dependencies
```bash
npm install
# atau jika menggunakan pnpm:
pnpm install
```

### 3. Configure Environment
```bash
# Copy template
cp .env.example .env.local

# Edit dengan credentials:
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 4. Start Development Server
```bash
npm run dev
```

Expected output:
```
- Local:        http://localhost:3000
- Network:      http://10.97.182.39:3000

✓ Ready in 215ms
```

### 5. Open Browser
Navigate ke http://localhost:3000

## 📂 Project Structure

```
app/
├── layout.js            Root layout dengan contexts
├── globals.css          Global styling
├── page.js              Dashboard homepage
├── auth/                Authentication pages
├── api/                 API routes
│   └── checkout/        Midtrans payment
├── components/          Reusable components
├── lib/                 Business logic
├── public/              Static assets
└── privacy/             Legal pages
```

## ✨ Main Features

- ✅ Full authentication (login/register/logout)
- ✅ Dashboard dengan stats & XP system
- ✅ Dark/Light theme dengan toggle
- ✅ 10+ features (tasks, habits, pomodoro, etc)
- ✅ Premium membership system
- ✅ Gamification (levels, streaks, badges)
- ✅ Responsive design
- ✅ i18n support (EN/ID)

## 🔧 Available Commands

```bash
# Development
npm run dev              # Start dev server

# Production
npm run build            # Build for production
npm run start            # Start prod server

# Code quality
npm run lint             # Check lint errors
npm run type-check       # TypeScript check

# Testing
npm test                 # Run tests
```

## 🎨 Development Features

### Hot Reload
- Changes auto-apply when saving
- No manual refresh needed (usually)

### TypeScript
- Full type safety
- IntelliSense in editor

### Tailwind CSS
- Utility-first CSS framework
- Responsive design helpers

## 📚 File Organization

### Components (`components/`)
- `AppShell.js` - Main layout wrapper
- `Sidebar.js` - Navigation sidebar
- `XPBar.js` - Experience bar
- `LevelUpModal.js` - Level up notification
- etc.

### Pages/Routes (`app/`)
- `/` - Dashboard
- `/login` - Login page
- `/tasks` - Tasks page
- `/finance` - Finance tracker
- etc.

### Libraries (`lib/`)
- `auth.js` - Authentication utilities
- `gamification.js` - XP/level system
- `storage.js` - Local storage helpers
- `supabaseClient.js` - Supabase setup
- etc.

## 🐛 Troubleshooting

**Port 3000 already in use**
```bash
lsof -i :3000
kill -9 <PID>
```

**Module not found**
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

**Env variables not loading**
- Make sure file is `.env.local` (not `.env`)
- Restart dev server after changing `.env.local`
- Prefix must be `NEXT_PUBLIC_` for client-side

## 📚 More Info

- See `docs/guides/MONOREPO_SETUP.md` for full monorepo setup
- See `docs/architecture/DATABASE_SCHEMA.md` for database design
- See project `README.md` for overview

---

**Status**: ✅ Ready to develop!
