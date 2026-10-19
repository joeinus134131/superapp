import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { translateText } from '@superapp/shared/translations'
import { DICTIONARIES } from '@superapp/shared'

type Language = 'en' | 'id'

interface LanguageContextType {
  language: Language
  isChangingLanguage: boolean
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string) => string
  tx: (text: string, values?: any[]) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isChangingLanguage: false,
  setLanguage: async () => {},
  t: (key) => key,
  tx: (text) => translateText(text, 'en'),
})

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>('en')
  const [isChangingLanguage, setIsChangingLanguage] = useState(false)

  useEffect(() => {
    // Respect an explicit choice; first launch always uses English.
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('superapp_language')
        if (savedLang === 'id' || savedLang === 'en') setLanguageState(savedLang)
      } catch (error) {
        console.warn('Could not load language preference', error)
      }
    }
    loadLanguage()
  }, [])

  const setLanguage = async (newLanguage: Language): Promise<void> => {
    if (newLanguage !== 'en' && newLanguage !== 'id') return
    setIsChangingLanguage(true)
    setLanguageState(newLanguage)
    try {
      await AsyncStorage.setItem('superapp_language', newLanguage)
    } finally {
      setIsChangingLanguage(false)
    }
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

  const tx = useCallback((text: string, values: any[] = []) => translateText(text, language, values), [language])

  return (
    <LanguageContext.Provider value={{ language, isChangingLanguage, setLanguage, t, tx }}>
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
