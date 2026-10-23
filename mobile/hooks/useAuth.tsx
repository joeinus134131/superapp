import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'
import { AppState } from 'react-native'
import { getSupabaseConfigStatus } from '@superapp/shared'
import { authFetch } from '../lib/authFetch'
import { getMobileSupabaseConfig } from '../lib/runtimeConfig'
import axios from 'axios'
import { CONFIG } from '../lib/config'
import { mobileAuthClient as authClient } from '../lib/mobileAuthClient'
import { authRedirectUrl, AuthRedirectResult } from '../lib/authRedirect'
import { consumeMobileAuthRedirect, signInMobileOAuth } from '../lib/mobileOAuth'

interface User { id: string; email: string; name?: string; user_metadata?: Record<string, any> }
interface AuthResult extends AuthRedirectResult { user?: User; requiresEmailConfirmation?: boolean }
interface ConnectionState { checking: boolean; ready: boolean; source: string; message: string; issues: string[] }
interface AuthContextValue {
  user: User | null; loading: boolean; connection: ConnectionState
  login: (email: string, password: string) => Promise<AuthResult>
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<AuthResult>
  register: (email: string, password: string, name: string) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshConnection: () => Promise<ConnectionState>
  consumeAuthRedirect: (url: string) => Promise<AuthResult>
  resetPassword: (email: string) => Promise<AuthResult>
  needsPasswordReset: boolean
  finishPasswordReset: () => Promise<void>
  isOnboarded: boolean; setOnboarded: (value: boolean) => void
  updateProfile: (data: { name?: string; metadata?: Record<string, any> }) => Promise<AuthResult>
}
const initialConnection: ConnectionState = { checking: true, ready: false, source: 'unknown', message: 'Checking backend connection...', issues: [] }
const AuthContext = createContext<AuthContextValue | null>(null)
function buildUser(user: any): User {
  return { id: user.id, email: user.email || '', name: user.user_metadata?.display_name || user.user_metadata?.name || '', user_metadata: user.user_metadata }
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOnboarded, setOnboarded] = useState(false)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)
  const [connection, setConnection] = useState(initialConnection)
  const identityQueue = useRef(Promise.resolve())
  const mounted = useRef(true)
  const loginLock = useRef(false)
  const authRevision = useRef(0)
  // Session tokens are persisted by Supabase through the encrypted adapter.
  // Only the non-secret data namespace identifier remains in AsyncStorage.
  const persistIdentity = useCallback((session: any) => {
    const work = identityQueue.current.then(async () => {
      if (session?.user?.id) await AsyncStorage.setItem('superapp_current_user', session.user.id)
      else await AsyncStorage.removeItem('superapp_current_user')
      if (mounted.current) setUser(session?.user ? buildUser(session.user) : null)
    })
    identityQueue.current = work.catch(() => {})
    return work
  }, [])
  const refreshConnection = useCallback(async (): Promise<ConnectionState> => {
    const status = getSupabaseConfigStatus()
    if (!status.isConfigured) {
      const next = { checking: false, ready: false, source: status.source, message: 'Konfigurasi Supabase belum valid.', issues: status.issues }
      if (mounted.current) setConnection(next)
      return next
    }
    if (mounted.current) setConnection(current => ({ ...current, checking: true }))
    const { url, anonKey } = getMobileSupabaseConfig()
    let result: { ok: boolean; message: string }
    try {
      const response = await authFetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } })
      result = { ok: response.ok, message: response.ok ? 'Koneksi autentikasi siap.' : `Koneksi autentikasi gagal (HTTP ${response.status}).` }
    } catch { result = { ok: false, message: 'Koneksi autentikasi belum tersedia. Silakan coba lagi.' } }
    const next = { checking: false, ready: result.ok, source: status.source, message: result.message, issues: result.ok ? [] : [result.message] }
    if (mounted.current) setConnection(next)
    return next
  }, [])
  const consumeAuthRedirect = useCallback(async (url: string): Promise<AuthResult> => {
    const result = await consumeMobileAuthRedirect(url)
    if (!result.success) return result
    const { data, error } = await authClient.auth.getSession()
    if (error || !data.session || data.session.user.id !== result.user?.id) return { success: false, error: 'Sesi callback tidak lagi aktif. Silakan masuk kembali.' }
    if (result.recovery) setNeedsPasswordReset(true)
    await persistIdentity(data.session)
    return { ...result, user: buildUser(data.session.user) }
  }, [persistIdentity])
  useEffect(() => {
    mounted.current = true
    let alive = true
    // Do not return an async callback to Supabase's auth-state mutex.
    const { data: listener } = authClient.auth.onAuthStateChange((event, session) => {
      if (!alive) return
      authRevision.current += 1
      if (event === 'PASSWORD_RECOVERY') setNeedsPasswordReset(true)
      if (event === 'SIGNED_OUT') setNeedsPasswordReset(false)
      void persistIdentity(session).catch(() => {
        if (alive) setConnection(current => ({ ...current, ready: false, message: 'Identitas sesi belum tersimpan.', issues: ['Penyimpanan identitas gagal. Coba masuk kembali.'] }))
      })
      if (event === 'SIGNED_IN' && session) {
        // Authenticated, best-effort profile provisioning for every login method.
        void axios.post(`${CONFIG.API_URL}/users/sync`, { id: session.user.id, email: session.user.email }, { headers: { Authorization: `Bearer ${session.access_token}` }, timeout: 10000 }).catch(() => {})
      }
    })
    const urls = Linking.addEventListener('url', ({ url }) => { if (url) void consumeAuthRedirect(url).catch(() => {}) })
    const lifecycle = AppState.addEventListener('change', state => {
      if (state === 'active') authClient.auth.startAutoRefresh()
      else authClient.auth.stopAutoRefresh()
    })
    if (AppState.currentState === 'active') authClient.auth.startAutoRefresh()
    void (async () => {
      try {
        setOnboarded(await AsyncStorage.getItem('superapp_onboarded') === 'true')
        const initialUrl = await Linking.getInitialURL()
        if (initialUrl) await consumeAuthRedirect(initialUrl)
        const revision = authRevision.current
        const { data, error } = await authClient.auth.getSession()
        if (error) throw error
        if (revision === authRevision.current) await persistIdentity(data.session)
        else await identityQueue.current
      } catch {
        if (alive) setConnection(current => ({ ...current, ready: false, checking: false, message: 'Sesi belum dapat dipulihkan. Coba lagi atau masuk kembali.', issues: ['Pemulihan sesi gagal.'] }))
      } finally { if (alive) setLoading(false) }
      // Login startup does not wait on a network connectivity probe.
      if (alive) void refreshConnection()
    })()
    return () => { alive = false; mounted.current = false; listener.subscription.unsubscribe(); urls.remove(); lifecycle.remove(); authClient.auth.stopAutoRefresh() }
  }, [consumeAuthRedirect, persistIdentity, refreshConnection])
  const ensureReady = async () => {
    const status = connection.ready && !connection.checking ? connection : await refreshConnection()
    if (!status.ready) throw new Error(status.issues[0] || status.message)
  }
  const login = async (email: string, password: string): Promise<AuthResult> => {
    if (loginLock.current) return { success: false, error: 'Login masih berjalan.' }
    loginLock.current = true
    try {
      await ensureReady()
      const { data, error } = await authClient.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      if (!data.session) throw new Error('Sesi login tidak tersedia.')
      await persistIdentity(data.session)
      return { success: true, user: buildUser(data.session.user) }
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Login gagal.' } }
    finally { loginLock.current = false }
  }
  const loginWithOAuth = async (provider: 'google' | 'apple'): Promise<AuthResult> => {
    if (loginLock.current) return { success: false, error: 'Login masih berjalan.' }
    loginLock.current = true
    try {
      await ensureReady()
      const result = await signInMobileOAuth(provider)
      if (!result.success) return result
      const { data } = await authClient.auth.getSession()
      if (!data.session) return { success: false, error: 'Sesi OAuth tidak tersedia.' }
      await persistIdentity(data.session)
      return { success: true, user: buildUser(data.session.user) }
    } catch { return { success: false, error: 'Login OAuth gagal. Periksa koneksi dan konfigurasi provider.' } }
    finally { loginLock.current = false }
  }
  const register = async (email: string, password: string, name: string): Promise<AuthResult> => {
    try {
      await ensureReady()
      const { data, error } = await authClient.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim(), name: name.trim() }, emailRedirectTo: authRedirectUrl() } })
      if (error) throw error
      if (data.session) await persistIdentity(data.session)
      if (!data.user) throw new Error('Pendaftaran tidak dapat diselesaikan.')
      return { success: true, user: buildUser(data.user), requiresEmailConfirmation: !data.session }
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Pendaftaran gagal.' } }
  }
  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      await ensureReady()
      const { error } = await authClient.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl(true) })
      if (error) throw error
      return { success: true }
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Permintaan reset gagal.' } }
  }
  const logout = async () => {
    // Revoke this session only; failed server revocation is not reported as success.
    const { error } = await authClient.auth.signOut({ scope: 'local' })
    if (error && ![401, 403, 404].includes(error.status || 0)) throw new Error('Logout belum selesai. Periksa koneksi dan coba lagi.')
    consumeMobileAuthRedirect.clear()
    await persistIdentity(null)
    setNeedsPasswordReset(false)
    await AsyncStorage.multiRemove(['superapp_session', 'superapp_session_token'])
  }
  const updateProfile = async (updates: { name?: string; metadata?: Record<string, any> }): Promise<AuthResult> => {
    try {
      await ensureReady()
      const metadata = { ...updates.metadata, ...(updates.name ? { display_name: updates.name, name: updates.name } : {}) }
      const { data, error } = await authClient.auth.updateUser({ data: metadata })
      if (error) throw error
      if (!data.user) throw new Error('Profil tidak tersedia.')
      const { data: session } = await authClient.auth.getSession()
      await persistIdentity(session.session)
      return { success: true, user: buildUser(data.user) }
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Profil gagal diperbarui.' } }
  }
  return <AuthContext.Provider value={{ user, loading, connection, login, loginWithOAuth, register, logout, refreshConnection, consumeAuthRedirect, resetPassword, needsPasswordReset, finishPasswordReset: logout, isOnboarded, setOnboarded, updateProfile }}>{children}</AuthContext.Provider>
}
export const useAuth = () => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider tidak tersedia.')
  return value
}
