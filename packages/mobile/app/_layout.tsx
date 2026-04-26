'use client'

import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { useAssets } from 'expo-asset'
import * as SplashScreen from 'expo-splash-screen'
import { Stack } from 'expo-router'
import { ThemeProvider } from '../context/themeContext'
import { PremiumProvider } from '../context/premiumContext'
import { LanguageProvider } from '../context/languageContext'
import { useAuth } from '../hooks/useAuth'
import { StatusBar } from 'expo-status-bar'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false)
  const [fontsLoaded] = useFonts({
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  const { user, loading } = useAuth()

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

  const onLayoutRootView = async () => {
    if (appIsReady && fontsLoaded && !loading) {
      await SplashScreen.hideAsync()
    }
  }

  if (!appIsReady || !fontsLoaded || loading) {
    return null
  }

  return (
    <ThemeProvider>
      <PremiumProvider>
        <LanguageProvider>
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
        </LanguageProvider>
      </PremiumProvider>
    </ThemeProvider>
  )
}
