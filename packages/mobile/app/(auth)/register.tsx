import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../context/themeContext'

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const { register, connection, refreshConnection } = useAuth()
  const { isDark } = useTheme()

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const result = await register(email, password, name)
      if (result?.success) {
        setSuccessMessage('Akun berhasil dibuat. Silakan buka email Anda dan klik link verifikasi untuk masuk di Android.')
        setTimeout(() => {
          router.replace('/(auth)/login')
        }, 1500)
      } else {
        setError(result?.error || 'Registration failed')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const bgColor = isDark ? '#1a1a1a' : '#ffffff'
  const textColor = isDark ? '#ffffff' : '#000000'
  const borderColor = isDark ? '#333333' : '#e0e0e0'

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: textColor, marginBottom: 10 }}>
            Create Account
          </Text>
          <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>
            Join SuperApp today
          </Text>
        </View>

        {error ? (
          <View style={{ backgroundColor: '#fee', padding: 12, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#f44' }}>
            <Text style={{ color: '#c00' }}>{error}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={{ backgroundColor: '#ecfdf3', padding: 12, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#16a34a' }}>
            <Text style={{ color: '#166534' }}>{successMessage}</Text>
          </View>
        ) : null}

        {!connection.ready ? (
          <View style={{ backgroundColor: '#fff7e6', padding: 12, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
            <Text style={{ color: '#9a6700', fontWeight: '600', marginBottom: 4 }}>
              Mobile backend belum siap
            </Text>
            <Text style={{ color: '#9a6700', marginBottom: 10 }}>
              {connection.message}
            </Text>
            <TouchableOpacity
              onPress={() => refreshConnection()}
              disabled={connection.checking}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#f59e0b',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
                opacity: connection.checking ? 0.6 : 1,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {connection.checking ? 'Checking...' : 'Cek Koneksi Lagi'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: textColor, marginBottom: 8, fontWeight: '600' }}>Full Name</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 8,
              padding: 12,
              color: textColor,
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
            }}
            placeholder="John Doe"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: textColor, marginBottom: 8, fontWeight: '600' }}>Email</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 8,
              padding: 12,
              color: textColor,
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
            }}
            placeholder="your@email.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: textColor, marginBottom: 8, fontWeight: '600' }}>Password</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 8,
              padding: 12,
              color: textColor,
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
            }}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: textColor, marginBottom: 8, fontWeight: '600' }}>Confirm Password</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 8,
              padding: 12,
              color: textColor,
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
            }}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading || connection.checking || !connection.ready}
          style={{
            backgroundColor: '#8b5cf6',
            padding: 14,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 20,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: textColor }}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
