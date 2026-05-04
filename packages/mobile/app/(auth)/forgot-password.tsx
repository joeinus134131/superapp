import { useState } from 'react'
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  ScrollView, KeyboardAvoidingView, StyleSheet, Dimensions
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../context/themeContext'
import { useColors } from '../../lib/theme'
import { BrandLogo } from '../../components/BrandLogo'
import { MaterialIcons } from '@expo/vector-icons'
import { useLanguage } from '../../context/languageContext'

const { width } = Dimensions.get('window')

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { resetPassword } = useAuth()
  const { isDark } = useTheme()
  const c = useColors(isDark)
  const { t } = useLanguage()

  const handleReset = async () => {
    if (!email) {
      setError('Masukkan email Anda')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await resetPassword(email)
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || t('profile.update_fail_desc'))
      }
    } catch (err) {
      setError(t('profile.update_fail_desc'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>

        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <BrandLogo size={80} showText={false} />
          <Text style={[styles.title, { color: c.textPrimary, marginTop: 24 }]}>{t('login.code_login_title')}</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary, marginTop: 8 }]}>
            {t('login.code_login_subtitle')}
          </Text>
        </View>

        {success ? (
          <View style={[styles.successCard, { backgroundColor: c.green + '10', borderColor: c.green }]}>
            <MaterialIcons name="check-circle" size={48} color={c.green} />
            <Text style={[styles.successTitle, { color: c.textPrimary }]}>Email Terkirim!</Text>
            <Text style={[styles.successDesc, { color: c.textSecondary }]}>
              Silakan cek inbox Anda (dan folder spam) untuk instruksi selanjutnya.
            </Text>
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: c.purple, marginTop: 24, width: '100%' }]} 
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.btnText}>Kembali ke Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: c.red + '10', borderLeftColor: c.red }]}>
                <Text style={{ color: c.red }}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: c.textPrimary }]}>Email Address</Text>
              <View style={[styles.inputWrapper, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                <MaterialIcons name="alternate-email" size={20} color={c.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.input, { color: c.textPrimary }]}
                  placeholder="name@example.com"
                  placeholderTextColor={c.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleReset}
              disabled={loading}
              style={[styles.btn, { backgroundColor: c.purple, opacity: loading ? 0.6 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('login.submit_code')}</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  backBtn: { position: 'absolute', top: 60, left: 24, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, fontSize: 15 },
  btn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  errorContainer: { padding: 16, borderRadius: 12, borderLeftWidth: 4, marginBottom: 24 },
  successCard: { padding: 32, borderRadius: 24, borderWidth: 1, alignItems: 'center' },
  successTitle: { fontSize: 22, fontWeight: '900', marginTop: 16 },
  successDesc: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 }
})
