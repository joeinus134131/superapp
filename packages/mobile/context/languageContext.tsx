import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import { DICTIONARIES } from '@superapp/shared'

type Language = 'en' | 'id'

interface LanguageContextType {
  language: Language
  isChangingLanguage: boolean
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isChangingLanguage: false,
  setLanguage: async () => {},
  t: (key) => key,
})

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>('en')
  const [isChangingLanguage, setIsChangingLanguage] = useState(false)

  useEffect(() => {
    // Load saved language or detect device locale
    const loadLanguage = async () => {
      const savedLang = await AsyncStorage.getItem('superapp_language')
      if (savedLang === 'id' || savedLang === 'en') {
        setLanguageState(savedLang as Language)
      } else {
        // Auto-detect device language
        try {
          const locales = Localization.getLocales();
          const deviceLangCode = locales && locales.length > 0 ? locales[0].languageCode : 'en';
          const initialLang: Language = deviceLangCode === 'id' ? 'id' : 'en';
          setLanguageState(initialLang);
          await AsyncStorage.setItem('superapp_language', initialLang);
        } catch (e) {
          console.warn('Locale detection failed', e);
          setLanguageState('en');
        }
      }
    }
    loadLanguage()
  }, [])

  const setLanguage = async (newLanguage: Language): Promise<void> => {
    setIsChangingLanguage(true)
    // Artificial delay to show loading effect
    await new Promise(resolve => setTimeout(resolve, 800))
    setLanguageState(newLanguage)
    await AsyncStorage.setItem('superapp_language', newLanguage)
    setIsChangingLanguage(false)
  }

  /**
   * Translate key with dot notation support (e.g. "dashboard.morning")
   */
  const t = (key: string): string => {
    try {
      const dict = DICTIONARIES as any
      const keys = key.split('.')
      
      // Try current language
      let result = dict[language]
      for (const k of keys) {
        if (result && result[k] !== undefined) {
          result = result[k]
        } else {
          result = null
          break
        }
      }

      if (result && typeof result === 'string') return result

      // Fallback to English
      if (language !== 'en') {
        let fallback = dict['en']
        for (const k of keys) {
          if (fallback && fallback[k] !== undefined) {
            fallback = fallback[k]
          } else {
            fallback = null
            break
          }
        }
        if (fallback && typeof fallback === 'string') return fallback
      }

    } catch (e) {
      console.warn('Translation error for key:', key, e)
    }
    
    // Return key as last resort, or the last part of the key
    return key.split('.').pop() || key
  }

  return (
    <LanguageContext.Provider value={{ language, isChangingLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
