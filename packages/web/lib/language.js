'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DICTIONARIES } from './dictionaries';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('id'); // Default is Indonesian
  const [mounted, setMounted] = useState(false);

  // Initialize from local storage
  useEffect(() => {
    const savedLang = localStorage.getItem('superapp_language');
    if (savedLang && (savedLang === 'id' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
    setMounted(true);
  }, []);

  // Update language and save to local storage
  const changeLanguage = useCallback((newLang) => {
    if (newLang === 'id' || newLang === 'en') {
      setLanguage(newLang);
      localStorage.setItem('superapp_language', newLang);
    }
  }, []);

  // Translation function
  // Usage: t('login.title') -> looks up DICTIONARIES[language].login.title
  const t = useCallback((path) => {
    const keys = path.split('.');
    let current = DICTIONARIES[language];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation key not found: ${path} for language: ${language}`);
        return path; // Fallback to raw key path if missing
      }
      current = current[key];
    }
    
    return current;
  }, [language]);

  const contextValue = React.useMemo(() => ({ language, changeLanguage, t }), [language, changeLanguage, t]);

  if (!mounted) {
    // Avoid hydration mismatch on initial render, but still provide context
    return (
      <LanguageContext.Provider value={contextValue}>
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
