# 🎨 THEME TOGGLE SLIDER - DOCUMENTATION

Komponen slider toggle yang menarik untuk switch antara light dan dark mode.

## ✨ Features

- ✅ **Animated Slider** - Smooth sliding animation saat toggle
- ✅ **Icon Rotation** - Sun/Moon icons rotate saat perubahan
- ✅ **Pulse Glow** - Glowing animation pada toggle
- ✅ **Interactive Hover** - Border color berubah saat hover
- ✅ **Responsive** - Bekerja di semua ukuran screen
- ✅ **Accessible** - Button dengan title untuk accessibility

## 🎬 Animation Effects

### 1. **Slider Track Animation**
- Track bergeser ke kanan (50%) saat switch ke dark mode
- Duration: 300ms
- Timing: cubic-bezier(0.34, 1.56, 0.64, 1) untuk bounce effect

### 2. **Icon Rotation**
- Icons rotate 180 derajat
- Scale down ke 0.8 saat animasi
- Duration: 300ms

### 3. **Pulse Glow**
- Border glow effect saat toggle
- Color: rgba(139, 92, 246, 0.2) ke 0.4
- Animation: 300ms ease-in-out

### 4. **Hover Effect**
- Border color berubah ke accent-purple
- Box shadow muncul
- Smooth transition

## 🎯 Implementasi

Component di `/components/ThemeToggle.js`:

```javascript
import ThemeToggle from '@/components/ThemeToggle';

export default function MyComponent() {
  return <ThemeToggle />;
}
```

## 📝 CSS Classes

### Main Container
```css
.theme-toggle-slider          /* Main slider container */
.theme-toggle-slider:hover    /* Hover state */
.theme-toggle-slider.animating /* Animation state */
```

### Slider Parts
```css
.theme-toggle-track           /* Animated track background */
.theme-toggle-options         /* Options container */
.theme-toggle-option          /* Individual option button */
.theme-toggle-option.light    /* Light option */
.theme-toggle-option.dark     /* Dark option */
```

### Icons
```css
.theme-toggle-icon            /* Icon container */
```

## 🎨 Styling Breakdown

### Default State (Light Mode)
```
┌─────────────────────────────┐
│ ███ Light │  ☀️   │ Moon ☀️ │  ← Gradient track on left
│ ━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ ☀️ Light (white) │ Moon (gray) │
└─────────────────────────────┘
```

### After Toggle (Dark Mode)
```
┌─────────────────────────────┐
│ ☀️ Light │ Moon ☀️ │ ███ Dark │  ← Gradient track moved right
│ ━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Sun (gray) │ 🌙 Dark (white) │
└─────────────────────────────┘
```

## 🎬 Animation Timeline

```
0ms     → Click toggle
150ms   → handleToggle() execution
         - Start animation
         - Icons rotate & scale
         - Border glow effect
150ms   → toggleTheme() executes
         - Track slides
         - Text colors change
         - CSS variables update
300ms   → Animation complete
         - isAnimating = false
         - All transitions finish
```

## 🖼️ Visual Properties

### Slider Dimensions
- Width: 100% (full width)
- Height: 44px (comfortable touch target)
- Padding: 4px (internal padding)
- Border Radius: 12px (rounded corners)

### Track Properties
- Width: 50% (each half)
- Gradient: Purple to Indigo
- Border Radius: 10px
- Box Shadow: 0 2px 8px rgba(139, 92, 246, 0.3)

### Colors
- Light Option Text (Light Mode): White
- Dark Option Text (Light Mode): var(--text-secondary)
- Light Option Text (Dark Mode): var(--text-secondary)
- Dark Option Text (Dark Mode): White

## 🎯 Interaction Flow

```
User Clicks Toggle
    ↓
setIsAnimating(true)
    ↓
visual effects:
  - Icons rotate 180°
  - Icons scale 0.8
  - Border glow pulse
    ↓
(150ms delay)
    ↓
toggleTheme() executes
  - CSS variables update
  - Track slides 50%
  - Text colors change
    ↓
setIsAnimating(false)
    ↓
All animations complete
```

## 🚀 Performance

- CSS-based animations (hardware accelerated)
- Transition timing: 300ms (smooth, not too long)
- Cubic bezier for natural bounce
- No unnecessary re-renders

## 📱 Responsiveness

- Slider scales dengan parent container
- Touch-friendly size (44px height)
- Works on all screen sizes
- Labels visible on desktop/tablet
- Icons visible on mobile

## 🔧 Customization

### Change Animation Duration
Edit in `/app/theme-toggle.css`:
```css
transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
/* Change 0.3s to desired duration */
```

### Change Colors
Edit in `/lib/themeContext.js` atau `globals.css`:
```css
background: linear-gradient(135deg, #8b5cf6, #6366f1);
/* Change colors as needed */
```

### Change Animation Easing
```css
cubic-bezier(0.34, 1.56, 0.64, 1)
/* Try other values for different feels */
```

## ✅ Testing Checklist

- [ ] Click toggle - track slides smoothly
- [ ] Icons rotate during toggle
- [ ] Border glows during animation
- [ ] Text colors update correctly
- [ ] Theme persists on page refresh
- [ ] Works on mobile (touch)
- [ ] Works on desktop (click)
- [ ] Hover effect visible
- [ ] No layout shift during animation
- [ ] Accessibility (title attributes)

## 🎨 Related Files

- Component: `/components/ThemeToggle.js`
- Styles: `/app/theme-toggle.css`
- Theme System: `/lib/themeContext.js`
- Global Styles: `/app/globals.css`
- Usage: `/components/Sidebar.js` (user menu)

---

**Version**: 1.0  
**Created**: 2026-02-28  
**Status**: Production Ready ✅
