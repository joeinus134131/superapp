'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DICTIONARIES } from './dictionaries';
import { translateText, resolveTranslation } from './translations';

const LanguageContext = createContext(/** @type {{language: string, changeLanguage: (l: string) => void, t: (key: string) => any, tx: (text: string, values?: any[]) => string}} */ ({ language: 'en', changeLanguage: () => {}, t: (k) => k, tx: (text) => translateText(text, 'en') }));

/** @param {{children: React.ReactNode, dictionaries?: Record<string, any>}} props */
export function LanguageProvider({ children, dictionaries = DICTIONARIES }) {
  const [language, setLanguage] = useState('en'); // English unless the user has chosen another language
  const [mounted, setMounted] = useState(false);

  // Initialize from local storage
  useEffect(() => {
    let savedLang;
    try { savedLang = localStorage.getItem('superapp_language'); } catch { /* Storage may be unavailable. */ }
    if (savedLang && (savedLang === 'id' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
    setMounted(true);
  }, []);

  // Update language and save to local storage
  const changeLanguage = useCallback((newLang) => {
    if (newLang === 'id' || newLang === 'en') {
      setLanguage(newLang);
      try { localStorage.setItem('superapp_language', newLang); } catch { /* Keep the in-memory choice. */ }
    }
  }, []);

  // Translation function
  // Usage: t('login.title') -> looks up DICTIONARIES[language].login.title
  const t = useCallback((path) => {
    return resolveTranslation(dictionaries, language, path);
  }, [language, dictionaries]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const tx = useCallback((text, values = []) => translateText(text, language, values), [language]);
  const contextValue = React.useMemo(() => ({ language, changeLanguage, t, tx }), [language, changeLanguage, t, tx]);

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
