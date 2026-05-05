import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'
import {
  supabase,
  getSupabaseConfigStatus,
  checkSupabaseConnection,
} from '@superapp/shared'

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
  register: (email: string, password: string, name: string) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshConnection: () => Promise<ConnectionState>
  consumeAuthRedirect: (url: string) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  isOnboarded: boolean
  setOnboarded: (val: boolean) => void
}

const initialConnection: ConnectionState = {
  checking: true,
  ready: false,
  source: 'unknown',
  message: 'Checking backend connection...',
  issues: [],
}

const AuthContext = createContext<AuthContextValue | null>(null)

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
  }, [])

  const persistSession = async (session: any, dataUser: any) => {
    await AsyncStorage.multiSet([
      ['superapp_user_id', dataUser.id],
      ['superapp_token', session.access_token || ''],
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
      setIsOnboarded(onboarded === 'true' || onboarded === true)

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
        const { data, error } = await supabase.auth.setSession({
          access_token: parsedSession.access_token,
          refresh_token: parsedSession.refresh_token,
        })

        if (!error && data.user?.email) {
          await persistSession(parsedSession, data.user)
        } else {
          await AsyncStorage.multiRemove(['superapp_user_id', 'superapp_token', 'superapp_session'])
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
        const { data, error } = await supabase.auth.verifyOtp({
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
        const { data, error } = await supabase.auth.setSession({
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user?.email && data.session) {
        const nextUser = await persistSession(data.session, data.user)
        return { success: true, user: nextUser }
      }

      return { success: false, error: 'No user/session returned from Supabase' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      return { success: false, error: message }
    }
  }

  const register = async (email: string, password: string, name: string): Promise<AuthResult> => {
    try {
      const readinessError = await ensureReadyForAuth()
      if (readinessError) {
        return { success: false, error: readinessError }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name, name },
          emailRedirectTo: Linking.createURL('/auth/callback'),
        },
      })

      if (error) throw error

      if (data.user?.email) {
        return { success: true, user: buildUser(data.user) }
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

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
      await supabase.auth.signOut()
      await AsyncStorage.multiRemove(['superapp_user_id', 'superapp_token', 'superapp_session'])
      setUser(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, connection, login, register, logout, refreshConnection, consumeAuthRedirect, resetPassword, isOnboarded, setOnboarded: setIsOnboarded }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
