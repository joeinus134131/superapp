import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DICTIONARIES } from '@superapp/shared'

type Language = 'en' | 'id'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: async () => {},
  t: (key) => key,
})

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    // Load saved language
    const loadLanguage = async () => {
      const savedLang = await AsyncStorage.getItem('superapp_language')
      if (savedLang === 'id' || savedLang === 'en') {
        setLanguageState(savedLang)
      }
    }
    loadLanguage()
  }, [])

  const setLanguage = async (newLanguage: Language): Promise<void> => {
    setLanguageState(newLanguage)
    await AsyncStorage.setItem('superapp_language', newLanguage)
  }

  const t = (key: string): string => {
    try {
      const dict = DICTIONARIES as any
      if (language === 'id' && dict?.id?.[key]) {
        return dict.id[key] || key
      }
      if (dict?.en?.[key]) {
        return dict.en[key] || key
      }
    } catch (e) {
      console.warn('Translation error:', e)
    }
    return key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
