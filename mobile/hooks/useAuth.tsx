import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'
import {
  supabase,
  getSupabaseConfigStatus,
  checkSupabaseConnection,
} from '@superapp/shared'
import axios from 'axios'
import { CONFIG } from '../lib/config'

const authClient: any = supabase

interface User {
  id: string
  email: string
  name?: string
  user_metadata?: Record<string, any>
}

interface AuthResult {
  success: boolean
  user?: User
  error?: string
}

interface ConnectionState {
  checking: boolean
  ready: boolean
  source: string
  message: string
  issues: string[]
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  connection: ConnectionState
  login: (email: string, password: string) => Promise<AuthResult>
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<AuthResult>
  register: (email: string, password: string, name: string) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshConnection: () => Promise<ConnectionState>
  consumeAuthRedirect: (url: string) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  isOnboarded: boolean
  setOnboarded: (val: boolean) => void
  updateProfile: (data: { name?: string, metadata?: Record<string, any> }) => Promise<AuthResult>
}

const initialConnection: ConnectionState = {
  checking: true,
  ready: false,
  source: 'unknown',
  message: 'Checking backend connection...',
  issues: [],
}

const defaultAuthContext: AuthContextValue = {
  user: null,
  loading: true,
  connection: initialConnection,
  login: async () => ({ success: false, error: 'Auth context not initialized' }),
  loginWithOAuth: async () => ({ success: false, error: 'Auth context not initialized' }),
  register: async () => ({ success: false, error: 'Auth context not initialized' }),

  logout: async () => {},
  refreshConnection: async () => initialConnection,
  consumeAuthRedirect: async () => ({ success: false, error: 'Auth context not initialized' }),
  resetPassword: async () => ({ success: false, error: 'Auth context not initialized' }),
  isOnboarded: false,
  setOnboarded: () => {},
  updateProfile: async () => ({ success: false, error: 'Auth context not initialized' }),
}

const AuthContext = createContext<AuthContextValue>(defaultAuthContext)

function buildUser(dataUser: any): User {
  return {
    id: dataUser.id,
    email: dataUser.email,
    name: dataUser.user_metadata?.display_name || dataUser.user_metadata?.name || '',
    user_metadata: dataUser.user_metadata,
  }
}

function parseUrlParams(url: string) {
  const normalizedUrl = url.replace('#', '?')
  const parsed = Linking.parse(normalizedUrl)
  const rawPath = parsed.path || ''
  const cleanedPath = rawPath.replace(/^--\//, '').replace(/^\/+/, '')

  return {
    path: cleanedPath,
    params: parsed.queryParams || {},
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [connection, setConnection] = useState<ConnectionState>(initialConnection)

  useEffect(() => {
    bootstrapAsync()

    const sub = Linking.addEventListener('url', async ({ url }) => {
      if (url) {
        await consumeAuthRedirect(url)
      }
    })

    const { data: authListener } = authClient.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (session && session.user) {
          await AsyncStorage.multiSet([
            ['superapp_current_user', session.user.id],
            ['superapp_session_token', session.access_token || ''],
            ['superapp_session', JSON.stringify(session)],
          ])
          setUser(buildUser(session.user))
        } else if (event === 'SIGNED_OUT') {
          await AsyncStorage.multiRemove(['superapp_current_user', 'superapp_session_token', 'superapp_session'])
          setUser(null)
        }
      }
    )

    return () => {
      sub.remove()
      authListener?.subscription?.unsubscribe()
    }
  }, [])


  const persistSession = async (session: any, dataUser: any) => {
    // Gunakan key yang sama dengan yang diharapkan oleh SyncService dan Shared Storage
    await AsyncStorage.multiSet([
      ['superapp_current_user', dataUser.id],
      ['superapp_session_token', session.access_token || ''],
      ['superapp_session', JSON.stringify(session)],
    ])

    const nextUser = buildUser(dataUser)
    setUser(nextUser)
    return nextUser
  }

  const refreshConnection = async (): Promise<ConnectionState> => {
    const status = getSupabaseConfigStatus()

    if (!status.isConfigured) {
      const nextState = {
        checking: false,
        ready: false,
        source: status.source,
        message: 'Supabase config belum valid untuk mobile app.',
        issues: status.issues,
      }
      setConnection(nextState)
      return nextState
    }

    setConnection((current) => ({
      ...current,
      checking: true,
      source: status.source,
      message: 'Checking Supabase connection...',
      issues: [],
    }))

    const result = await checkSupabaseConnection()
    const nextState = {
      checking: false,
      ready: result.ok,
      source: status.source,
      message: result.message,
      issues: result.ok ? [] : [result.message],
    }
    setConnection(nextState)
    return nextState
  }

  const bootstrapAsync = async (): Promise<void> => {
    try {
      await refreshConnection()
      
      const onboarded = await AsyncStorage.getItem('superapp_onboarded')
      setIsOnboarded(onboarded === 'true')

      const initialUrl = await Linking.getInitialURL()
      if (initialUrl) {
        const authResult = await consumeAuthRedirect(initialUrl)
        if (authResult.success && authResult.user) {
          return
        }
      }

      const sessionPayload = await AsyncStorage.getItem('superapp_session')

      if (sessionPayload) {
        const parsedSession = JSON.parse(sessionPayload)
        const { data, error } = await authClient.auth.setSession({
          access_token: parsedSession.access_token,
          refresh_token: parsedSession.refresh_token,
        })

        if (!error && data.user?.email) {
          await persistSession(data.session || parsedSession, data.user)
        } else if (parsedSession?.refresh_token) {
          // If setSession failed (e.g. access_token expired), try refreshSession
          const { data: refreshData, error: refreshError } = await authClient.auth.refreshSession({
            refresh_token: parsedSession.refresh_token,
          })
          if (!refreshError && refreshData.session && refreshData.user) {
            await persistSession(refreshData.session, refreshData.user)
          } else {
            await AsyncStorage.multiRemove(['superapp_current_user', 'superapp_session_token', 'superapp_session'])
            setUser(null)
          }
        } else {
          await AsyncStorage.multiRemove(['superapp_current_user', 'superapp_session_token', 'superapp_session'])
          setUser(null)
        }
      }
    } catch (err) {
      console.error('Bootstrap error:', err)
    } finally {
      setLoading(false)
    }
  }

  const ensureReadyForAuth = async (): Promise<string | null> => {
    const currentStatus = connection.ready && !connection.checking ? connection : await refreshConnection()

    if (!currentStatus.ready) {
      return currentStatus.issues[0] || currentStatus.message || 'Database belum bisa dihubungi dari mobile app.'
    }

    return null
  }

  const consumeAuthRedirect = async (url: string): Promise<AuthResult> => {
    try {
      const readinessError = await ensureReadyForAuth()
      if (readinessError) {
        return { success: false, error: readinessError }
      }

      const { path, params } = parseUrlParams(url)
      const isAuthCallback = path === 'auth/callback' || path === '(auth)/callback'

      if (!isAuthCallback) {
        return { success: false, error: 'Ignored non-auth redirect URL' }
      }

      const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : ''
      const type = typeof params.type === 'string' ? params.type : ''
      const accessToken = typeof params.access_token === 'string' ? params.access_token : ''
      const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : ''

      if (tokenHash && type) {
        const { data, error } = await authClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        })

        if (error) {
          throw error
        }

        if (data.user && data.session) {
          const nextUser = await persistSession(data.session, data.user)
          return { success: true, user: nextUser }
        }
      }

      if (accessToken && refreshToken) {
        const { data, error } = await authClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          throw error
        }

        if (data.user && data.session) {
          const nextUser = await persistSession(data.session, data.user)
          return { success: true, user: nextUser }
        }
      }

      return { success: false, error: 'Verification link tidak mengandung session yang valid.' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      return { success: false, error: message }
    }
  }

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const readinessError = await ensureReadyForAuth()
      if (readinessError) {
        return { success: false, error: readinessError }
      }

      const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user?.email && data.session) {
        const nextUser = await persistSession(data.session, data.user)
        
        // SINKRONISASI KE BACKEND GOLANG
        try {
          await axios.post(`${CONFIG.API_URL}/users/sync`, {
            id: data.user.id,
            email: data.user.email
          }, {
            headers: { Authorization: `Bearer ${data.session.access_token}` }
          });
          console.log('[Auth] User synced to backend');
        } catch (syncErr) {
          console.warn('[Auth] Gagal sinkron user ke backend:', syncErr);
        }

        return { success: true, user: nextUser }
      }

      return { success: false, error: 'No user/session returned from Supabase' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      return { success: false, error: message }
    }
  }

  const loginWithOAuth = async (provider: 'google' | 'apple'): Promise<AuthResult> => {
    try {
      const readinessError = await ensureReadyForAuth()
      if (readinessError) {
        return { success: false, error: readinessError }
      }

      const redirectUrl = Linking.createURL('/auth/callback')
      const { data, error } = await authClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      })

      if (error) throw error

      if (data?.url) {
        await Linking.openURL(data.url)
        return { success: true }
      }

      return { success: false, error: 'Tidak dapat membuka browser untuk autentikasi.' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login OAuth gagal'
      return { success: false, error: message }
    }
  }


  const register = async (email: string, password: string, name: string): Promise<AuthResult> => {
    try {
      const readinessError = await ensureReadyForAuth()
      if (readinessError) {
        return { success: false, error: readinessError }
      }

      const { data, error } = await authClient.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name, name },
          emailRedirectTo: Linking.createURL('/auth/callback'),
        },
      })

      if (error) throw error

      if (data.user?.email) {
        const nextUser = buildUser(data.user)
        
        // SINKRONISASI KE BACKEND GOLANG (Opsional saat register, atau tunggu login)
        // Kita coba sync di sini juga
        try {
          await axios.post(`${CONFIG.API_URL}/users/sync`, {
            id: data.user.id,
            email: data.user.email
          });
          console.log('[Auth] User registered to backend');
        } catch (syncErr) {
          console.warn('[Auth] Gagal register user ke backend:', syncErr);
        }

        return { success: true, user: nextUser }
      }

      return { success: false, error: 'No user returned from Supabase' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      return { success: false, error: message }
    }
  }

  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      const readinessError = await ensureReadyForAuth()
      if (readinessError) {
        return { success: false, error: readinessError }
      }

      const { error } = await authClient.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL('/auth/callback'),
      })

      if (error) throw error

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed'
      return { success: false, error: message }
    }
  }

  const logout = async () => {
    try {
      await authClient.auth.signOut()
      await AsyncStorage.multiRemove(['superapp_current_user', 'superapp_session_token', 'superapp_session'])
      setUser(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const updateProfile = async (data: { name?: string, metadata?: Record<string, any> }): Promise<AuthResult> => {
    try {
      const readinessError = await ensureReadyForAuth()
      if (readinessError) return { success: false, error: readinessError }

      const updateData: any = { data: { ...data.metadata } }
      if (data.name) {
        updateData.data.display_name = data.name
        updateData.data.name = data.name
      }

      const { data: res, error } = await authClient.auth.updateUser(updateData)
      if (error) throw error

      if (res.user) {
        const sessionPayload = await AsyncStorage.getItem('superapp_session')
        const session = sessionPayload ? JSON.parse(sessionPayload) : {}
        const nextUser = await persistSession(session, res.user)
        return { success: true, user: nextUser }
      }
      return { success: false, error: 'Failed to update user' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      return { success: false, error: message }
    }
  }

  return (
    <AuthContext.Provider
      value={{ 
        user, loading, connection, login, loginWithOAuth, register, logout, 
        refreshConnection, consumeAuthRedirect, resetPassword, 
        isOnboarded, setOnboarded: setIsOnboarded, updateProfile 
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  return context || defaultAuthContext
}
