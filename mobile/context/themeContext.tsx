import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface ThemeContextType {
  isDark: boolean
  isChangingTheme: boolean
  toggleTheme: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  isChangingTheme: false,
  toggleTheme: async () => {},
})

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Whenya is light-first. Existing users keep their explicit preference.
  const [isDark, setIsDark] = useState(false)
  const [isChangingTheme, setIsChangingTheme] = useState(false)

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('superapp_theme')
      if (savedTheme) {
        setIsDark(savedTheme === 'dark')
      }
    }
    loadTheme()
  }, [])

  const toggleTheme = async (): Promise<void> => {
    setIsChangingTheme(true)
    const newTheme = !isDark
    setIsDark(newTheme)
    await AsyncStorage.setItem('superapp_theme', newTheme ? 'dark' : 'light')
    setIsChangingTheme(false)
  }

  return (
    <ThemeContext.Provider value={{ isDark, isChangingTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
