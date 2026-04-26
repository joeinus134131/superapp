import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: async () => {},
})

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const systemColorScheme = useColorScheme()
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark')

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
    const newTheme = !isDark
    setIsDark(newTheme)
    await AsyncStorage.setItem('superapp_theme', newTheme ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
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
