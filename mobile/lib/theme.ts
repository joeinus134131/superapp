// Theme color system matching web's CSS variables
// Used by all screens for consistent styling

export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgGlass: string;
  bgInput: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  border: string;
  borderLight: string;

  // Accents
  purple: string;
  green: string;
  red: string;
  yellow: string;
  cyan: string;
  blue: string;
  orange: string;
  pink: string;

  // Tab bar
  tabBg: string;
  tabBorder: string;
}

export const darkColors: ThemeColors = {
  bgPrimary: '#000000', // True Black OLED
  bgSecondary: '#0a0a0a',
  bgCard: '#111111',
  bgGlass: 'rgba(0, 0, 0, 0.8)',
  bgInput: '#151515',

  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#505050',

  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',

  purple: '#8b5cf6',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#f59e0b',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  orange: '#f97316',
  pink: '#ec4899',

  tabBg: '#000000',
  tabBorder: '#111111',
};

export const lightColors: ThemeColors = {
  bgPrimary: '#f8f9fc',
  bgSecondary: '#ffffff',
  bgCard: '#ffffff',
  bgGlass: 'rgba(255, 255, 255, 0.9)',
  bgInput: '#f3f4f6',

  textPrimary: '#1a1a2e',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',

  purple: '#8b5cf6',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#f59e0b',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  orange: '#f97316',
  pink: '#ec4899',

  tabBg: '#ffffff',
  tabBorder: '#e5e7eb',
};

export function useColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
