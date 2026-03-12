# 🎨 LIGHT/DARK MODE THEME SYSTEM

SuperApp sekarang dilengkapi dengan sistem theme light/dark mode yang comprehensive.

## 🌅 Fitur

- ✅ **Light Mode** - Default untuk pengguna baru
- ✅ **Dark Mode** - Untuk preferensi gelap
- ✅ **Persistent Storage** - Preferensi disimpan di localStorage
- ✅ **Smooth Transitions** - Perubahan tema dengan animasi halus
- ✅ **Consistent Colors** - Accent colors sama di kedua tema
- ✅ **No Flash** - Tidak ada flash of unstyled content

## 🎛️ Cara Menggunakan

### User dapat mengganti tema dengan:

1. **Sidebar Menu** - Klik menu user (avatar) → Pilih "Dark Mode" atau "Light Mode"
2. **Automatic pada First Login** - Default modenya adalah Light Mode

### Developer - Akses Theme

```javascript
import { useTheme } from '@/lib/themeContext';

export default function MyComponent() {
  const { theme, toggleTheme, setThemeMode } = useTheme();
  
  return (
    <>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setThemeMode('light')}>Light</button>
      <button onClick={() => setThemeMode('dark')}>Dark</button>
    </>
  );
}
```

## 🎨 CSS Variables

Semua colors tersedia sebagai CSS variables dan otomatis berubah berdasarkan theme:

### Background Colors
```css
--bg-primary        /* Main background */
--bg-secondary      /* Secondary background */
--bg-card           /* Card background */
--bg-glass          /* Glassmorphism background */
--bg-input          /* Input field background */
```

### Text Colors
```css
--text-primary      /* Main text */
--text-secondary    /* Secondary text */
--text-muted        /* Muted text */
--text-accent       /* Accent text */
```

### Accent Colors (Sama di kedua tema)
```css
--accent-purple     /* #8b5cf6 */
--accent-cyan       /* #06b6d4 */
--accent-pink       /* #ec4899 */
--accent-green      /* #10b981 */
--accent-yellow     /* #f59e0b */
--accent-red        /* #ef4444 */
--accent-blue       /* #3b82f6 */
--accent-orange     /* #f97316 */
```

## 📊 Light Mode Palette

| Element | Color |
|---------|-------|
| Background | #f8fafc (Slate-50) |
| Secondary | #f1f5f9 (Slate-100) |
| Text Primary | #1e293b (Slate-900) |
| Text Secondary | #64748b (Slate-500) |
| Border | rgba(0, 0, 0, 0.08) |

## 🌙 Dark Mode Palette

| Element | Color |
|---------|-------|
| Background | #0a0e1a (Deep dark) |
| Secondary | #111827 (Slate-900) |
| Text Primary | #f1f5f9 (Slate-100) |
| Text Secondary | #94a3b8 (Slate-400) |
| Border | rgba(255, 255, 255, 0.08) |

## 🔧 Implementation Details

### ThemeContext (`lib/themeContext.js`)

Provider yang manage state theme dan apply ke DOM:

```javascript
<ThemeProvider>
  {children}
</ThemeProvider>
```

**Methods:**
- `theme` - Current theme ('light' atau 'dark')
- `toggleTheme()` - Toggle antara light dan dark
- `setThemeMode(themeName)` - Set ke theme tertentu

### AppShell Integration

`AppShell.js` sudah wrap dengan `ThemeProvider` di hierarchy tertinggi.

### CSS Architecture

**globals.css** menggunakan CSS custom properties dengan selector:
- `:root` - Default (light mode)
- `[data-theme="light"]` - Explicit light mode
- `[data-theme="dark"]` - Dark mode
- `.light-mode` - Alternative selector
- `.dark-mode` - Alternative selector

### Storage

Theme preference disimpan di `localStorage`:
```
Key: 'superapp_theme'
Values: 'light' | 'dark'
```

## ✨ Best Practices

1. **Always use CSS variables** untuk colors, jangan hardcode
   ```css
   /* ✅ Good */
   color: var(--text-primary);
   background: var(--bg-card);
   
   /* ❌ Bad */
   color: #1e293b;
   background: #f1f5f9;
   ```

2. **Accent colors yang consistent** di kedua tema
   - Gunakan accent colors untuk buttons, links, highlights
   - Jangan mengubah accent berdasarkan theme

3. **Test di kedua tema**
   - Pastikan contrast cukup baik
   - Test readability di light dan dark

4. **Smooth transitions**
   - CSS transitions sudah di-apply otomatis
   - Jangan override dengan `transition: none`

## 🧪 Testing

### Manual Testing

1. Login ke aplikasi
2. Buka sidebar user menu
3. Klik "Dark Mode" untuk switch ke dark
4. Klik "Light Mode" untuk kembali ke light
5. Refresh page - theme harus persist

### Testing Readability

Pastikan text readable di kedua tema:
- Light mode: Text should be dark enough
- Dark mode: Text should be light enough
- Contrast ratio minimal WCAG AA (4.5:1)

## 🚀 Future Enhancements

Potential improvements:
- [ ] Auto detect system theme preference
- [ ] Scheduled mode (e.g., dark at night)
- [ ] Per-page theme override
- [ ] Custom theme creator
- [ ] Theme preview sebelum apply

## 📝 Notes

- Default untuk new users adalah **Light Mode**
- Theme preference per-user (stored locally)
- Accent colors tidak berubah untuk consistency
- Shadows dan opacity disesuaikan per tema untuk readability

---

**Version**: 1.0  
**Created**: 2026-02-28  
**Status**: Production Ready ✅
