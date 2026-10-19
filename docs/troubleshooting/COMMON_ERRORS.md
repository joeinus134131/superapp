# 🔧 Common Errors & Solutions

Solusi untuk error yang sering terjadi di SuperApp.

## 🚨 Installation Issues

### Error: npm ERR! code ERESOLVE

**Masalah**: Dependency conflict saat install

**Solusi**:
```bash
npm install --legacy-peer-deps

# atau
npm install --force
```

### Error: Module not found

**Masalah**: Package belum terinstall

**Solusi**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Error: Port 3000 already in use

**Masalah**: Port 3000 sudah digunakan process lain

**Solusi** (macOS):
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001
```

---

## ⚙️ Configuration Issues

### Error: .env.local not loading

**Masalah**: Environment variables tidak terbaca

**Solusi**:
1. File harus bernama `.env.local` (not `.env`)
2. Prefix harus `NEXT_PUBLIC_` untuk web client-side
3. Restart dev server setelah mengubah `.env.local`

```bash
# Correct format:
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Restart:
npm run dev
```

### Error: TypeScript compilation error

**Masalah**: TS error saat build

**Solusi**:
```bash
# Check errors
npm run type-check

# Fix in VS Code:
# - Ctrl/Cmd + Shift + P
# - TypeScript: Restart TS server
```

---

## 🌐 Web Development Issues

### Error: Sidebar not appearing

**Masalah**: Navigation sidebar tidak muncul

**Solusi**:
- Check `AppShell.js` wraps page component
- Check `Sidebar.js` is imported
- Check z-index CSS (sidebar should be higher)

### Error: Theme not persisting

**Masalah**: Dark/Light mode tidak tersimpan

**Solusi**:
```typescript
// Make sure useTheme hook is called:
const { isDark, toggleTheme } = useTheme()

// Should persist to localStorage automatically
```

### Error: Data not syncing

**Masalah**: Changes tidak sync dengan Supabase

**Solusi**:
1. Check internet connection
2. Check Supabase URL & key in `.env.local`
3. Check database permissions in Supabase dashboard
4. Check browser console for errors

---

## 📱 Mobile Development Issues

### Error: Too many open files

**Masalah**: Metro bundler tidak bisa watch files

**Solusi**:
```bash
# Increase file descriptor limit
ulimit -n 4096
npm start

# Or create/update .watchmanconfig
# (Already done in this project)
```

### Error: QR code not displaying

**Masalah**: Expo Start tidak menampilkan QR code

**Solusi**:
```bash
# Kill and restart
pkill -f "expo start"
sleep 1

# Clear cache
rm -rf .expo

# Restart with higher ulimit
ulimit -n 4096
npm start
```

### Error: Expo Go can't connect

**Masalah**: Phone tidak bisa scan QR code atau connect

**Solusi**:
1. Make sure phone & computer on **same WiFi**
2. Check firewall allows localhost:8081
3. Try web instead: press `w` in terminal
4. Try emulator instead: press `a` in terminal
5. Restart Expo Go app on phone

### Error: Module not found in mobile

**Masalah**: "Cannot find module '@superapp/shared'"

**Solusi**:
```bash
# Reinstall from mobile folder
cd packages/mobile
npm install --legacy-peer-deps

# Or rebuild shared
cd packages/shared
npm run build
```

### Error: React version mismatch

**Masalah**: React 18 vs 19 conflict

**Solusi**:
```bash
# Downgrade React to 18
npm install react@18.2.0 react-native@0.75.0

# Check package.json:
# "react": "^18.2.0"
# "react-native": "0.75.0"
```

### Error: Hot reload not working

**Masalah**: Changes tidak auto-apply

**Solusi**:
```bash
# Press 'r' in terminal to reload
# Or restart:
pkill -f "npm start"
npm start
```

---

## 🗄️ Database Issues

### Error: Supabase connection failed

**Masalah**: Tidak bisa connect ke Supabase

**Solusi**:
1. Check internet connection
2. Check Supabase URL is correct (no typo)
3. Check Supabase anon key is correct
4. Check Supabase project is not paused
5. Check RLS policies allow read/write

### Error: Authentication failed

**Masalah**: Login tidak berhasil

**Solusi**:
1. Check email & password correct
2. Check user exists in Supabase
3. Check `auth_users` table has data
4. Check email is confirmed (if required)

### Error: Data not saving

**Masalah**: Update/insert tidak menyimpan data

**Solusi**:
1. Check table exists in Supabase
2. Check RLS policies enabled correctly
3. Check column names match
4. Check data types match
5. Check user permissions

---

## 🔐 Authentication Issues

### Error: Can't login

**Masalah**: Email/password tidak work

**Solusi**:
```typescript
// Check in console:
try {
  const result = await auth.login(email, password)
  console.log('Result:', result)
} catch (err) {
  console.error('Error:', err)
}
```

### Error: Session expires immediately

**Masalah**: Logout terjadi tanpa alasan

**Solusi**:
1. Check token stored in AsyncStorage (mobile) or localStorage (web)
2. Check token not expired
3. Check Supabase session timeout settings
4. Try logout & login again

### Error: Refresh token invalid

**Masalah**: Refresh token tidak berfungsi

**Solusi**:
```bash
# Clear all stored tokens
# Web: DevTools > Application > localStorage > Clear
# Mobile: ResetApp or clear AsyncStorage

# Try login again
```

---

## 🎯 Performance Issues

### Problem: App slow on mobile

**Solusi**:
```typescript
// Use React.memo for heavy components
export const DashboardScreen = React.memo(
  ({ isDark }) => { /* ... */ }
)

// Use useMemo for expensive calculations
const stats = useMemo(() => calculateStats(), [data])
```

### Problem: High memory usage

**Solusi**:
```typescript
// Clear unused state
// Use lazy loading for lists
// Close WebSocket connections properly
```

---

## 🆘 Emergency Reset

Jika semua error, nuclear option:

```bash
# Web
rm -rf node_modules .next
npm install --legacy-peer-deps
npm run dev

# Mobile
rm -rf node_modules .expo .metro
npm install --legacy-peer-deps
npm start

# Monorepo
rm -rf node_modules
rm -rf packages/*/node_modules
npm install --legacy-peer-deps
```

---

## 📞 Getting Help

1. **Check this file** for similar error
2. **Check terminal output** for error details
3. **Check browser console** (F12 → Console)
4. **Check Supabase logs** (Supabase Dashboard → Logs)
5. **Search GitHub issues** for error message
6. **Ask in Discord/Slack** community

---

## 🐛 Debugging Tips

### Browser DevTools (Web)
```bash
# Open DevTools
F12 or Cmd+Option+I

# Check:
- Console tab for errors
- Network tab for API calls
- Application tab for localStorage
- Sources tab for breakpoints
```

### React DevTools
```bash
# Install React DevTools extension
# Then you can:
- Inspect component tree
- Check props & state
- Track re-renders
```

### Terminal Logs (Mobile)
```bash
# Expo shows all console.log
# Useful for debugging mobile app

# Or use:
console.warn()  # Yellow
console.error() # Red
console.log()   # White
```

---

**Still stuck?** Check mobile-specific errors in next file!
