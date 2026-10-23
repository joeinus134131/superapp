import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../context/themeContext'
import { useLanguage } from '../../context/languageContext'

export default function AuthCallbackScreen() {
  const { tx } = useLanguage()
  const url = Linking.useURL()
  const { consumeAuthRedirect, isOnboarded } = useAuth()
  const { isDark } = useTheme()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setError('')
    void (async () => {
      const incoming = url || await Linking.getInitialURL()
      if (!incoming) { if (active) setError('Tautan autentikasi tidak ditemukan. Silakan mulai login kembali.'); return }
      const result = await consumeAuthRedirect(incoming)
      if (!active) return
      if (!result.success) { setError(result.error || 'Autentikasi belum berhasil.'); return }
      router.replace(result.recovery ? '/(auth)/reset-password' : isOnboarded ? '/(app)' : '/onboarding')
    })().catch(() => { if (active) setError('Autentikasi belum dapat diselesaikan. Silakan coba lagi.') })
    return () => { active = false }
  }, [url, consumeAuthRedirect, isOnboarded])
  return <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: isDark ? '#101D17' : '#F7F4EC' }}>
    {!error && <ActivityIndicator size="large" color={isDark ? '#88C9A0' : '#193F30'} />}
    <Text accessibilityRole="header" style={{ color: isDark ? '#EDF3E8' : '#173E30', fontSize: 24, fontWeight: '700', textAlign: 'center', marginVertical: 20 }}>{tx(error ? 'Autentikasi belum berhasil' : 'Menyelesaikan autentikasi…')}</Text>
    {!!error && <><Text accessibilityRole="alert" style={{ color: isDark ? '#A8B8AA' : '#536B53', textAlign: 'center', lineHeight: 24 }}>{tx(error)}</Text><TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} style={{ minHeight: 56, borderRadius: 16, marginTop: 24, padding: 16, backgroundColor: '#193F30', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }}>{tx('Kembali ke Login')}</Text></TouchableOpacity></>}
  </View>
}
