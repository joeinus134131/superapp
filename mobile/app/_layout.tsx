import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, AppState, Image } from 'react-native'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { Stack } from 'expo-router'
import { ThemeProvider, useTheme } from '../context/themeContext'
import { PremiumProvider } from '../context/premiumContext'
import { LanguageProvider, useLanguage } from '../context/languageContext'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { SecurityProvider, useSecurity } from '../context/securityContext'
import { LockScreen } from '../components/LockScreen'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '../lib/theme'
import { configureSupabaseRuntime } from '@superapp/shared'
import { getMobileSupabaseConfig } from '../lib/runtimeConfig'
import { SettingsProvider } from '../context/settingsContext'
import { initMobileStorage } from '../lib/storageAdapter'
import { scheduleDatabaseSync } from '../lib/databaseSync'
import { initAutoSyncListener } from '../lib/syncService'

initMobileStorage()

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

configureSupabaseRuntime(getMobileSupabaseConfig())

function LoadingScreen() {
  const { isDark } = useTheme();
  const { t, tx: translateCopy } = useLanguage();
  const c = useColors(isDark);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.loadingContainer, { backgroundColor: c.bgPrimary, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.loadingMain}>
        <Image source={isDark ? require('../assets/branding/splash-mark-dark.png') : require('../assets/branding/splash-mark.png')} style={styles.loadingMark} resizeMode="contain" accessible={false} />
        <Text style={[styles.loadingBrand, { color: c.textPrimary }]}>Whenya</Text>
        <View style={styles.loadingSpinnerBox}>
          <ActivityIndicator size="small" color={isDark ? '#6BB289' : '#193F30'} />
          <Text style={[styles.loadingText, { color: c.textSecondary, marginTop: 12 }]}>
            {t('login.loading_app')}
          </Text>
        </View>
      </View>
      <View style={[styles.loadingBottom, { bottom: Math.max(insets.bottom, 16) + 12 }]}>
        <Text style={[styles.loadingVersion, { color: c.textMuted }]}>{translateCopy("Whenya · ruang personalmu")}</Text>
      </View>
    </View>
  );
}

function RootNavigator() {
  const { user, loading, isOnboarded } = useAuth()
  const { isLocked } = useSecurity()
  const { isChangingTheme } = useTheme()

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync()
    }
  }, [loading])

  useEffect(() => {
    if (loading || !user?.id) return;
    scheduleDatabaseSync();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') scheduleDatabaseSync();
    });
    return () => subscription.remove();
  }, [loading, user?.id]);

  if (loading || isChangingTheme) {
    return <LoadingScreen />
  }

  if (!isOnboarded) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    )
  }

  if (isLocked) {
    return <LockScreen />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {user ? (
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
    </Stack>
  )
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false)
  const [fontsLoaded] = useFonts({
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    async function prepare() {
      try {
        // Permission prompts are requested in context, never during cold start.
        await Promise.resolve()
      } catch (e) {
        console.warn(e)
      } finally {
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

  useEffect(() => initAutoSyncListener(), [])

  if (!appIsReady || !fontsLoaded) {
    return null // This will keep the native splash screen until appIsReady is true
  }

  return (
    <ThemeProvider>
      <SettingsProvider>
        <SecurityProvider>
          <AuthProvider>
            <PremiumProvider>
              <LanguageProvider>
                <RootNavigator />
              </LanguageProvider>
            </PremiumProvider>
          </AuthProvider>
        </SecurityProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingMain: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMark: { width: 160, height: 160 },
  loadingBrand: { fontSize: 30, lineHeight: 38, fontWeight: '600', letterSpacing: -0.8, marginTop: 10 },
  loadingSpinnerBox: {
    marginTop: 28,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '400',
  },
  loadingBottom: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  loadingVersion: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
