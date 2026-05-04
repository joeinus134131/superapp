import { useState } from 'react'
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  ScrollView, KeyboardAvoidingView, StyleSheet, Dimensions, Image
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../context/themeContext'
import { useColors } from '../../lib/theme'
import { BrandLogo } from '../../components/BrandLogo'
import { MaterialIcons } from '@expo/vector-icons'
import { useLanguage } from '../../context/languageContext'

const { width } = Dimensions.get('window')

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login, connection, refreshConnection } = useAuth()
  const { isDark } = useTheme()
  const c = useColors(isDark)
  const { t } = useLanguage()

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

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      {/* Decorative background elements */}
      <View style={[styles.glowCircle, { backgroundColor: c.purple, opacity: 0.1, top: -100, right: -100 }]} />
      <View style={[styles.glowCircle, { backgroundColor: c.cyan, opacity: 0.05, bottom: -150, left: -100, width: 300, height: 300 }]} />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <BrandLogo size={100} textSize={44} style={{ flexDirection: 'column' }} />
          <Text style={[styles.brandTagline, { color: c.purple, marginTop: 16 }]}>
            {t('login.title')}
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary, marginTop: 12 }]}>
            {t('login.subtitle')}
          </Text>
        </View>

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: isDark ? '#442222' : '#fee', borderLeftColor: c.red }]}>
            <MaterialIcons name="error-outline" size={18} color={c.red} style={{ marginRight: 8 }} />
            <Text style={{ color: isDark ? '#ffaaaa' : '#c00', flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {!connection.ready ? (
          <View style={[styles.warningContainer, { backgroundColor: isDark ? '#332211' : '#fff7e6', borderLeftColor: c.yellow }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MaterialIcons name="wifi-off" size={18} color={c.yellow} style={{ marginRight: 8 }} />
              <Text style={{ color: isDark ? '#ffddaa' : '#9a6700', fontWeight: '700' }}>
                Backend belum siap
              </Text>
            </View>
            <Text style={{ color: isDark ? '#ccaa88' : '#9a6700', marginBottom: 12, fontSize: 13 }}>
              {connection.message}
            </Text>
            <TouchableOpacity
              onPress={() => refreshConnection()}
              disabled={connection.checking}
              style={[styles.refreshBtn, { backgroundColor: c.yellow, opacity: connection.checking ? 0.6 : 1 }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                {connection.checking ? 'Checking...' : 'Cek Koneksi'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: c.textPrimary }]}>{t('login.email')}</Text>
          <View style={[styles.inputWrapper, { backgroundColor: c.bgInput, borderColor: c.border }]}>
            <MaterialIcons name="alternate-email" size={20} color={c.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: c.textPrimary }]}
              placeholder={t('login.new_user_placeholder')}
              placeholderTextColor={c.textMuted}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: c.textPrimary }]}>{t('login.password')}</Text>
          <View style={[styles.inputWrapper, { backgroundColor: c.bgInput, borderColor: c.border }]}>
            <MaterialIcons name="lock-outline" size={20} color={c.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: c.textPrimary }]}
              placeholder="••••••••"
              placeholderTextColor={c.textMuted}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
              <MaterialIcons 
                name={showPassword ? "visibility" : "visibility-off"} 
                size={20} 
                color={c.textMuted} 
              />
            </TouchableOpacity>
          </View>
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 8, padding: 4 }}>
              <Text style={{ color: c.purple, fontSize: 13, fontWeight: '600' }}>{t('login.forgot_password')}</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading || connection.checking || !connection.ready}
          activeOpacity={0.8}
          style={[
            styles.signInBtn, 
            { backgroundColor: c.purple, opacity: (loading || connection.checking || !connection.ready) ? 0.5 : 1 }
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.signInBtnText}>{t('login.sign_in')}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: c.textSecondary }}>{t('login.register_link')}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 40, fontWeight: '900', marginBottom: 2, letterSpacing: -1 },
  brandTagline: { fontSize: 18, fontWeight: '700', opacity: 0.9, letterSpacing: 1, textTransform: 'uppercase' },
  subtitle: { fontSize: 14, textAlign: 'center', opacity: 0.6 },
  logoContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoImage: { width: '100%', height: '100%' },
  glowCircle: { position: 'absolute', width: 250, height: 250, borderRadius: 125 },
  
  errorContainer: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4 },
  warningContainer: { padding: 14, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4 },
  refreshBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  
  signInBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  signInBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
})


