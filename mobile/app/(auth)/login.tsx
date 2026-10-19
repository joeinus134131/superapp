import { useState } from 'react'
import { GoogleMark } from '../../components/AuthGoogleMark'
import { authStyles as styles } from '../../components/authStyles'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, StyleSheet, Image, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../context/themeContext'
import { useColors } from '../../lib/theme'
import { BrandLogo } from '../../components/BrandLogo'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useLanguage } from '../../context/languageContext'


export default function LoginScreen() {
  const { tx: translateCopy } = useLanguage();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login, loginWithOAuth, connection, refreshConnection } = useAuth()
  const { isDark } = useTheme()
  const c = useColors(isDark)
  const { t, language, setLanguage } = useLanguage()
  const insets = useSafeAreaInsets()
  const busy = loading || !!oauthLoading
  const paper = isDark ? '#15281f' : '#FCFAF5'
  const ink = isDark ? '#EDF3E8' : '#173E30'
  const muted = isDark ? '#A8B8AA' : '#7C847B'
  const border = isDark ? '#34493A' : '#E1E5DA'

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider)
    setError('')
    try {
      const result = await loginWithOAuth(provider)
      if (!result?.success && result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : translateCopy("Login OAuth gagal"))
    } finally {
      setOauthLoading(null)
    }
  }

  const handleLogin = async () => {

    if (!email || !password) {
      setError(translateCopy("Please fill in all fields"))
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await login(email, password)
      if (result?.success) {
        router.replace('/(app)')
      } else {
        setError(result?.error || translateCopy("Login failed"))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : translateCopy("An error occurred")
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', backgroundColor: paper }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.landscape, { minHeight: insets.top + 260 }]}>
          <Image source={require('../../assets/auth/login-sanctuary.webp')} style={[StyleSheet.absoluteFill, styles.landscapeImage]} resizeMode="cover" accessible={false} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10,31,20,.45)' : 'rgba(252,250,245,.30)' }]} />
          <View style={[styles.landscapeContent, { paddingTop: insets.top + 20 }]}>
            <View style={styles.topbar}>
              <BrandLogo size={51} variant="horizontal" />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('login.lang_select')} onPress={() => setLanguage(language === 'en' ? 'id' : 'en').catch(() => setError(translateCopy("Pilihan bahasa belum dapat disimpan.")))} style={styles.languagePill}>
                <MaterialIcons name="language" size={15} color="#355442" />
                <Text style={styles.languageText}>{language === 'en' ? 'EN' : 'ID'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.eyebrow, { color: isDark ? '#E0EBDC' : '#536B53' }]}>{translateCopy("Ruang kecil untuk dirimu")}</Text>
              <Text style={[styles.heroTitle, { color: isDark ? '#FFFEF7' : '#173E30' }]}>{translateCopy("Temukan ritmemu.\nNikmati harimu.")}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: paper, paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
          <View style={[styles.handle, { backgroundColor: isDark ? '#3C5140' : '#DDE5D5' }]} />
          <Text accessibilityRole="header" style={[styles.welcomeTitle, { color: ink }]}>{translateCopy("Selamat datang kembali.")}</Text>
          <Text style={[styles.subtitle, { color: muted }]}>{translateCopy("Masuk untuk melanjutkan perjalanan menuju hari yang lebih tenang.")}</Text>

          {error ? <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: isDark ? '#422B29' : '#FCF0EA' }]}>
            <MaterialIcons name="error-outline" size={18} color={c.red} />
            <Text style={[styles.noticeText, { color: isDark ? '#FFC6BA' : '#A34937' }]}>{translateCopy(error)}</Text>
          </View> : null}

          {!connection.ready ? <View style={[styles.connectionNotice, { borderColor: border }]}>
            {connection.checking ? <ActivityIndicator size="small" color={muted} /> : <MaterialIcons name="wifi-off" size={16} color={muted} />}
            <Text style={[styles.connectionText, { color: muted }]}>{connection.checking ? translateCopy("Menghubungkan akunmu…") : translateCopy("Koneksi belum tersedia. Coba lagi sebentar.")}</Text>
            {!connection.checking && <TouchableOpacity onPress={() => refreshConnection()} accessibilityRole="button" accessibilityLabel={translateCopy("Coba lagi")} style={styles.retryButton}><MaterialIcons name="refresh" size={20} color={ink} /></TouchableOpacity>}
          </View> : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: ink }]}>{t('login.email')}</Text>
            <View style={[styles.inputWrapper, { borderColor: border }]}>
              <MaterialIcons name="mail-outline" size={18} color={muted} />
              <TextInput style={[styles.input, { color: ink }]} placeholder="name@example.com" placeholderTextColor={muted}
                value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" accessibilityLabel={translateCopy("Alamat email")} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: ink }]}>{t('login.password')}</Text>
            <View style={[styles.inputWrapper, { borderColor: border }]}>
              <MaterialIcons name="lock-outline" size={18} color={muted} />
              <TextInput style={[styles.input, { color: ink }]} placeholder="••••••••" placeholderTextColor={muted}
                value={password} onChangeText={setPassword} editable={!busy} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false}
                autoComplete="current-password" returnKeyType="go" onSubmitEditing={() => { if (!busy && connection.ready) handleLogin() }} accessibilityLabel={translateCopy("Kata sandi")} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton} accessibilityRole="button" accessibilityLabel={showPassword ? translateCopy("Sembunyikan kata sandi") : translateCopy("Tampilkan kata sandi")}>
                <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color={muted} />
              </TouchableOpacity>
            </View>
          </View>
          <Link href="/(auth)/forgot-password" asChild><TouchableOpacity style={styles.forgotButton}><Text style={[styles.forgotText, { color: isDark ? '#BDD2AD' : '#355B40' }]}>{t('login.forgot_password')}</Text></TouchableOpacity></Link>
          <TouchableOpacity onPress={handleLogin} disabled={busy || connection.checking || !connection.ready} activeOpacity={0.8}
            accessibilityRole="button" accessibilityLabel={translateCopy("Masuk ke Whenya")} accessibilityState={{ disabled: busy || connection.checking || !connection.ready, busy: loading }}
            style={[styles.signInBtn, { backgroundColor: isDark ? '#537A50' : '#193F30', opacity: busy || connection.checking || !connection.ready ? 0.55 : 1 }]}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.signInBtnText}>{t('login.sign_in')}</Text><MaterialIcons name="arrow-forward" size={18} color="#E0E9D6" style={styles.signInArrow} /></>}
          </TouchableOpacity>

          <View style={styles.dividerRow}><View style={[styles.dividerLine, { backgroundColor: border }]} /><Text style={[styles.dividerText, { color: muted }]}>{translateCopy("atau masuk dengan")}</Text><View style={[styles.dividerLine, { backgroundColor: border }]} /></View>

          <View style={styles.oauthStack}>
            {(['google', 'apple'] as const).map(provider => <TouchableOpacity
              key={provider} onPress={() => handleOAuth(provider)} disabled={busy} activeOpacity={0.75}
              accessibilityRole="button" accessibilityLabel={provider === 'google' ? translateCopy("Masuk dengan Google") : translateCopy("Masuk dengan Apple")}
              accessibilityState={{ disabled: busy, busy: oauthLoading === provider }}
              style={[styles.oauthBtn, { borderColor: border, opacity: busy ? 0.6 : 1 }]}>
              {oauthLoading === provider ? <ActivityIndicator size="small" color={ink} /> : <>
                <View style={styles.oauthIcon}>{provider === 'google' ? <GoogleMark /> : <Ionicons name="logo-apple" size={21} color={ink} />}</View>
                <Text style={[styles.oauthBtnText, { color: ink }]}>{provider === 'google' ? translateCopy("Masuk dengan Google") : translateCopy("Masuk dengan Apple")}</Text>
              </>}
            </TouchableOpacity>)}
          </View>
          <View style={styles.footer}><Text style={[styles.footerText, { color: muted }]}>{translateCopy("Belum punya akun?")}</Text><Link href="/(auth)/register" asChild><TouchableOpacity style={styles.registerButton}><Text style={[styles.registerText, { color: isDark ? '#BDD2AD' : '#355B40' }]}>{translateCopy("Daftar sekarang")}</Text></TouchableOpacity></Link></View>
          <View style={styles.calmNote}><MaterialIcons name="spa" size={13} color={muted} /><Text style={[styles.calmNoteText, { color: muted }]}>{translateCopy("Satu langkah kecil. Hari yang lebih baik.")}</Text></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

