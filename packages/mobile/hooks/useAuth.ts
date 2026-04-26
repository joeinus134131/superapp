import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@superapp/shared'

interface User {
  id: string
  email: string
  user_metadata?: Record<string, any>
}

interface AuthResult {
  success: boolean
  user?: User
  error?: string
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bootstrapAsync()
  }, [])

  const bootstrapAsync = async (): Promise<void> => {
    try {
      // Try to get session from AsyncStorage
      const userId = await AsyncStorage.getItem('superapp_user_id')
      const token = await AsyncStorage.getItem('superapp_token')

      if (userId && token) {
        // Verify token with Supabase
        const { data, error } = await supabase.auth.getUser(token)
        if (!error && data.user?.email) {
          setUser({ id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata })
        } else {
          // Token invalid, clear storage
          await AsyncStorage.removeItem('superapp_user_id')
          await AsyncStorage.removeItem('superapp_token')
          setUser(null)
        }
      }
    } catch (err) {
      console.error('Bootstrap error:', err)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user?.email) {
        await AsyncStorage.setItem('superapp_user_id', data.user.id)
        await AsyncStorage.setItem('superapp_token', data.session?.access_token || '')
        const user: User = { id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata }
        setUser(user)
        return { success: true, user }
      }
      return { success: false, error: 'No user returned' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      return { success: false, error: message }
    }
  }

  const register = async (email: string, password: string, name: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
        },
      })

      if (error) throw error

      if (data.user?.email) {
        const user: User = { id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata }
        return { success: true, user }
      }
      return { success: false, error: 'No user returned' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      await AsyncStorage.removeItem('superapp_user_id')
      await AsyncStorage.removeItem('superapp_token')
      setUser(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return { user, loading, login, register, logout }
}
