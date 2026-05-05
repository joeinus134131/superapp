import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../context/themeContext'

export default function AuthCallbackScreen() {
  const url = Linking.useURL()
  const { consumeAuthRedirect } = useAuth()
  const { isDark } = useTheme()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Memverifikasi email Anda...')

  useEffect(() => {
    async function verify() {
      if (!url) {
        setStatus('error')
        setMessage('Link verifikasi tidak ditemukan.')
        return
      }

      const result = await consumeAuthRedirect(url)

      if (result.success) {
        setStatus('success')
        setMessage('Email berhasil diverifikasi. Anda akan masuk ke aplikasi...')
        setTimeout(() => {
          router.replace('/(app)')
        }, 1200)
        return
      }

      setStatus('error')
      setMessage(result.error || 'Verifikasi email gagal.')
    }

    verify()
  }, [consumeAuthRedirect, url])

  const bgColor = isDark ? '#1a1a1a' : '#ffffff'
  const cardColor = isDark ? '#2a2a2a' : '#f8f8f8'
  const textColor = isDark ? '#ffffff' : '#111111'

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, justifyContent: 'center', padding: 24 }}>
      <View style={{ backgroundColor: cardColor, borderRadius: 16, padding: 24 }}>
        {status === 'loading' ? <ActivityIndicator color="#8b5cf6" size="large" /> : null}
        <Text style={{ color: textColor, fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 12 }}>
          Verifikasi Email
        </Text>
        <Text style={{ color: isDark ? '#d4d4d4' : '#555555', textAlign: 'center', lineHeight: 22 }}>
          {message}
        </Text>

        {status === 'error' ? (
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={{
              marginTop: 20,
              backgroundColor: '#8b5cf6',
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>Kembali ke Login</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}
