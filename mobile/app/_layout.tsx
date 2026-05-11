import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { Stack } from 'expo-router'
import { ThemeProvider, useTheme } from '../context/themeContext'
import { PremiumProvider } from '../context/premiumContext'
import { LanguageProvider, useLanguage } from '../context/languageContext'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { SecurityProvider, useSecurity } from '../context/securityContext'
import { LockScreen } from '../components/LockScreen'
import { BrandLogo } from '../components/BrandLogo'
import { useColors } from '../lib/theme'
import { registerForPushNotificationsAsync } from '../lib/notifications'
import { configureSupabaseRuntime } from '@superapp/shared'
import { getMobileSupabaseConfig } from '../lib/runtimeConfig'
import { SettingsProvider } from '../context/settingsContext'
import { initMobileStorage } from '../lib/storageAdapter'
import { initAutoSyncListener } from '../lib/syncService'

initMobileStorage()
initAutoSyncListener()

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

configureSupabaseRuntime(getMobileSupabaseConfig())

function LoadingScreen() {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const c = useColors(isDark);
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.loadingMain}>
        <BrandLogo size={120} textSize={36} />
        <View style={styles.loadingSpinnerBox}>
          <ActivityIndicator size="large" color={c.purple} />
          <Text style={[styles.loadingText, { color: c.textSecondary, marginTop: 16 }]}>
            {t('login.loading_app')}
          </Text>
        </View>
      </View>
      <View style={styles.loadingBottom}>
        <Text style={[styles.loadingVersion, { color: c.textMuted }]}>SelfOne v2.0 • Premium Quality</Text>
      </View>
    </View>
  );
}

function RootNavigator() {
  const { user, loading, isOnboarded } = useAuth()
  const { isLocked } = useSecurity()
  const { isChangingTheme } = useTheme()
  const { isChangingLanguage } = useLanguage()

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync()
    }
  }, [loading])

  if (loading || isChangingTheme || isChangingLanguage) {
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
        await registerForPushNotificationsAsync();
        // Pre-load any assets or fonts here
        await new Promise((resolve) => setTimeout(resolve, 1500))
      } catch (e) {
        console.warn(e)
      } finally {
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

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
  loadingSpinnerBox: {
    marginTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loadingBottom: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  loadingVersion: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
