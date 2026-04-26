import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../context/themeContext'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()
  const { isDark } = useTheme()

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await login(email, password)
      if (result?.success) {
        router.replace('/(app)')
      } else {
        setError(result?.error || 'Login failed')
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
            SuperApp
          </Text>
          <Text style={{ fontSize: 16, color: '#888', textAlign: 'center' }}>
            Your all-in-one productivity companion
          </Text>
        </View>

        {error ? (
          <View style={{ backgroundColor: '#fee', padding: 12, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#f44' }}>
            <Text style={{ color: '#c00' }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: 20 }}>
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

        <View style={{ marginBottom: 20 }}>
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

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
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
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: textColor }}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#8b5cf6', fontWeight: 'bold' }}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
