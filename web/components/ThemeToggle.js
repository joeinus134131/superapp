'use client';

import { useTheme } from '@/lib/themeContext';
import { useLanguage } from '@superapp/shared/language';
import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import '@/app/theme-toggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const copy = (id, en) => (language === 'id' ? id : en);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      toggleTheme();
      setIsAnimating(false);
    }, 150);
  };

  return (
    <div
      className={`theme-toggle-slider ${isAnimating ? 'animating' : ''}`}
      data-theme={theme}
      style={{ cursor: 'pointer' }}
    >
      <div className="theme-toggle-track" />
      <div className="theme-toggle-options">
        <button
          className="theme-toggle-option light"
          onClick={handleToggle}
          title={copy('Mode Terang', 'Switch to Light Mode')}
        >
          <span className="theme-toggle-icon">
            <Sun size={16} />
          </span>
          <span>{copy('Terang', 'Light')}</span>
        </button>
        <button
          className="theme-toggle-option dark"
          onClick={handleToggle}
          title={copy('Mode Gelap', 'Switch to Dark Mode')}
        >
          <span className="theme-toggle-icon">
            <Moon size={16} />
          </span>
          <span>{copy('Gelap', 'Dark')}</span>
        </button>
      </div>
    </div>
  );
}

