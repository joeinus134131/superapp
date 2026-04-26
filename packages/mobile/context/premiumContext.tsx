import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@superapp/shared'

interface PremiumContextType {
  isPremium: boolean
  checkoutUrl: string | null
  loading: boolean
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  checkoutUrl: null,
  loading: false,
})

interface PremiumProviderProps {
  children: ReactNode
}

export const PremiumProvider = ({ children }: PremiumProviderProps) => {
  const [isPremium, setIsPremium] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPremiumStatus()
  }, [])

  const checkPremiumStatus = async () => {
    try {
      const userId = await AsyncStorage.getItem('superapp_user_id')
      if (userId) {
        // Fetch from Supabase
        const { data, error } = await supabase
          .from('users')
          .select('is_premium')
          .eq('id', userId)
          .single()

        if (!error && data) {
          setIsPremium(data.is_premium || false)
        }
      }
    } catch (err) {
      console.error('Error checking premium status:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PremiumContext.Provider value={{ isPremium, checkoutUrl, loading }}>
      {children}
    </PremiumContext.Provider>
  )
}

export const usePremium = () => {
  const context = useContext(PremiumContext)
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider')
  }
  return context
}
