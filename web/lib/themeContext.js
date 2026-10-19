'use client';

import { createContext, useContext, useEffect, useState } from 'react';

/** @typedef {'light' | 'dark'} Theme */
/** @typedef {{ theme: Theme, toggleTheme: () => void, setThemeMode: (theme: Theme) => void }} ThemeValue */

const ThemeContext = createContext(/** @type {ThemeValue | null} */ (null));

/** @param {Theme} theme */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark-mode', theme === 'dark');
  document.documentElement.classList.toggle('light-mode', theme === 'light');
}

/** @param {{ children: import('react').ReactNode }} props */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(/** @type {Theme} */ ('light'));

  useEffect(() => {
    let savedTheme = 'light';
    try {
      savedTheme = localStorage.getItem('superapp_theme') || 'light';
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  /** @param {Theme} nextTheme */
  const setThemeMode = (nextTheme) => {
    if (nextTheme !== 'light' && nextTheme !== 'dark') return;
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem('superapp_theme', nextTheme);
    } catch {
      // Persistence is optional; the current page keeps the selected theme.
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setThemeMode, toggleTheme: () => setThemeMode(theme === 'light' ? 'dark' : 'light') }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
