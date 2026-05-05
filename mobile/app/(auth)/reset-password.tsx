import { useState } from 'react'
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  ScrollView, KeyboardAvoidingView, StyleSheet, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@superapp/shared'
import { useTheme } from '../../context/themeContext'
import { useColors } from '../../lib/theme'
import { BrandLogo } from '../../components/BrandLogo'
import { MaterialIcons } from '@expo/vector-icons'
import { useLanguage } from '../../context/languageContext'

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { isDark } = useTheme()
  const c = useColors(isDark)
  const { t } = useLanguage()

  const handleUpdate = async () => {
    if (!password || password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    if (password !== confirmPassword) {
      setError('Password tidak cocok')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      
      Alert.alert(t('profile.update_success_title'), t('profile.update_success_desc'), [
        { text: 'Login', onPress: () => router.replace('/(auth)/login') }
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.update_fail_desc'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <BrandLogo size={80} showText={false} />
          <Text style={[styles.title, { color: c.textPrimary, marginTop: 24 }]}>Set Password Baru</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary, marginTop: 8 }]}>
            Masukkan password baru Anda di bawah ini.
          </Text>
        </View>

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: c.red + '10', borderLeftColor: c.red }]}>
            <Text style={{ color: c.red }}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: c.textPrimary }]}>Password Baru</Text>
          <View style={[styles.inputWrapper, { backgroundColor: c.bgInput, borderColor: c.border }]}>
            <MaterialIcons name="lock-outline" size={20} color={c.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: c.textPrimary }]}
              placeholder="••••••••"
              placeholderTextColor={c.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: c.textPrimary }]}>Konfirmasi Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: c.bgInput, borderColor: c.border }]}>
            <MaterialIcons name="lock-clock" size={20} color={c.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: c.textPrimary }]}
              placeholder="••••••••"
              placeholderTextColor={c.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleUpdate}
          disabled={loading}
          style={[styles.btn, { backgroundColor: c.purple, opacity: loading ? 0.6 : 1 }]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Simpan Password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', opacity: 0.7 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, fontSize: 15 },
  btn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  errorContainer: { padding: 16, borderRadius: 12, borderLeftWidth: 4, marginBottom: 24 }
})
