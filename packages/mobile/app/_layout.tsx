import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { Stack } from 'expo-router'
import { ThemeProvider } from '../context/themeContext'
import { PremiumProvider } from '../context/premiumContext'
import { LanguageProvider } from '../context/languageContext'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { configureSupabaseRuntime } from '@superapp/shared'
import { getMobileSupabaseConfig } from '../lib/runtimeConfig'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

configureSupabaseRuntime(getMobileSupabaseConfig())

function RootNavigator() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync()
    }
  }, [loading])

  if (loading) {
    return null
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
        // Pre-load any assets or fonts here
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (e) {
        console.warn(e)
      } finally {
        setAppIsReady(true)
      }
    }

    prepare()
  }, [])

  if (!appIsReady || !fontsLoaded) {
    return null
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <PremiumProvider>
          <LanguageProvider>
            <RootNavigator />
          </LanguageProvider>
        </PremiumProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
