'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('superapp_theme');
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default: light mode for new users
      setTheme('light');
      applyTheme('light');
    }
    setMounted(true);
  }, []);

  const applyTheme = (themeName) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeName);
    root.classList.toggle('dark-mode', themeName === 'dark');
    root.classList.toggle('light-mode', themeName === 'light');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('superapp_theme', newTheme);
  };

  const setThemeMode = (themeName) => {
    if (themeName === 'light' || themeName === 'dark') {
      setTheme(themeName);
      applyTheme(themeName);
      localStorage.setItem('superapp_theme', themeName);
    }
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
