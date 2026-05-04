import { useState, useEffect, useRef } from 'react'
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
  ScrollView, KeyboardAvoidingView, StyleSheet, Dimensions,
  Animated, Easing, Image
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../context/themeContext'
import { useColors } from '../../lib/theme'
import { MaterialIcons } from '@expo/vector-icons'
import { BrandLogo } from '../../components/BrandLogo'
import { useLanguage } from '../../context/languageContext'

const { width, height } = Dimensions.get('window')

export default function RegisterScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const { register, connection, refreshConnection } = useAuth()
  const { isDark } = useTheme()
  const c = useColors(isDark)
  const { t } = useLanguage()

  // Animation values using standard Animated
  const blob1Pos = useRef(new Animated.Value(0)).current
  const blob2Pos = useRef(new Animated.Value(0)).current
  const blobScale = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start()

    // Floating and pulsating animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Pos, { toValue: 20, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob1Pos, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Pos, { toValue: -30, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob2Pos, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(blobScale, { toValue: 1.1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blobScale, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start()
  }, [])

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await register(email, password, name)
      if (result?.success) {
        setSuccessMessage('Akun berhasil dibuat. Silakan cek email Anda.')
        setTimeout(() => router.replace('/(auth)/login'), 2000)
      } else {
        setError(result?.error || 'Registration failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      {/* Animated Blobs using standard Animated.View */}
      <Animated.View style={[
        styles.glowCircle, 
        { 
          backgroundColor: c.purple, opacity: 0.1, top: -50, left: -50,
          transform: [{ translateY: blob1Pos }, { scale: blobScale }] 
        }
      ]} />
      <Animated.View style={[
        styles.glowCircle, 
        { 
          backgroundColor: c.cyan, opacity: 0.08, bottom: height * 0.2, right: -100, width: 300, height: 300, borderRadius: 150,
          transform: [{ translateX: blob2Pos }, { scale: blobScale }] 
        }
      ]} />
      
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <Animated.View style={{ 
          marginBottom: 32, alignItems: 'center', 
          opacity: fadeAnim, transform: [{ translateY: slideAnim }] 
        }}>
          <BrandLogo size={60} textSize={28} />
          <Text style={[styles.subtitle, { color: c.textSecondary, marginTop: 8 }]}>{t('login.subtitle')}</Text>
        </Animated.View>


        <Animated.View style={{ opacity: fadeAnim }}>
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: isDark ? '#442222' : '#fee', borderLeftColor: c.red }]}>
              <MaterialIcons name="error-outline" size={18} color={c.red} style={{ marginRight: 8 }} />
              <Text style={{ color: isDark ? '#ffaaaa' : '#c00', flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={[styles.successContainer, { backgroundColor: isDark ? '#113311' : '#ecfdf3', borderLeftColor: c.green }]}>
              <MaterialIcons name="check-circle-outline" size={18} color={c.green} style={{ marginRight: 8 }} />
              <Text style={{ color: isDark ? '#aaffaa' : '#166534', flex: 1 }}>{successMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textPrimary }]}>{t('login.new_user_label')}</Text>
            <View style={[styles.inputWrapper, { backgroundColor: c.bgInput, borderColor: c.border }]}>
              <MaterialIcons name="person-outline" size={20} color={c.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: c.textPrimary }]}
                placeholder={t('login.new_user_placeholder')}
                placeholderTextColor={c.textMuted}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textPrimary }]}>{t('login.email')}</Text>
            <View style={[styles.inputWrapper, { backgroundColor: c.bgInput, borderColor: c.border }]}>
              <MaterialIcons name="alternate-email" size={20} color={c.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: c.textPrimary }]}
                placeholder="your@email.com"
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
                <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading || connection.checking || !connection.ready}
            activeOpacity={0.8}
            style={[
              styles.registerBtn, 
              { backgroundColor: c.purple, opacity: (loading || connection.checking || !connection.ready) ? 0.5 : 1 }
            ]}
          >
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.registerBtnText}>{t('login.create_account')}</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={{ color: c.textSecondary }}>{t('login.login_link')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  subtitle: { fontSize: 14, opacity: 0.6, textAlign: 'center' },
  logoSmall: { width: 60, height: 60, marginBottom: 12 },
  glowCircle: { position: 'absolute', width: 250, height: 250, borderRadius: 125 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 20, borderLeftWidth: 4 },
  successContainer: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 20, borderLeftWidth: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  registerBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  registerBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
})



