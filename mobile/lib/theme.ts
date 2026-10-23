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
  bgPrimary: '#101d17', // True Black OLED
  bgSecondary: '#14241c',
  bgCard: '#1a2d23',
  bgGlass: 'rgba(0, 0, 0, 0.8)',
  bgInput: '#151515',

  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textMuted: '#93A59A',

  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',

  purple: '#9baf99',
  green: '#397353',
  red: '#ef4444',
  yellow: '#f59e0b',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  orange: '#f97316',
  pink: '#ec4899',

  tabBg: '#101d17',
  tabBorder: '#1a2d23',
};

export const lightColors: ThemeColors = {
  bgPrimary: '#f7f4ec',
  bgSecondary: '#ffffff',
  bgCard: '#ffffff',
  bgGlass: 'rgba(255, 255, 255, 0.9)',
  bgInput: '#f0f2e9',

  textPrimary: '#172b23',
  textSecondary: '#526359',
  textMuted: '#68766e',

  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',

  purple: '#193f30',
  green: '#397353',
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
