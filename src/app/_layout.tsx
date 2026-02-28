import FontAwesome from '@expo/vector-icons/FontAwesome'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { store } from '@pear-notes/core/store/store.js'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Directory, Paths } from 'expo-file-system'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useCallback, useEffect, useState } from 'react'
import 'react-native-reanimated'
import { Provider } from 'react-redux'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import AppTabs from '@/components/app-tabs'
import { ErrorScreen } from '@/components/ErrorScreen'
import { useColorScheme } from '@/components/useColorScheme'
import { startWorklet } from '@/utils/worklet'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

const documentDir = new Directory(Paths.document)
const storage = documentDir.uri.replace(/^file:\/+/, '/')

export default function RootLayout() {
  const [worketLoaded, setWorkletLoaded] = useState(false)
  const [fatalError, setFatalError] = useState<string | null>(null)

  const [loaded, fontError] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  })

  const initWorklet = useCallback(async () => {
    try {
      setFatalError(null)
      await startWorklet(storagePath)
      await backendApi.ready({ storage, encryption: 'amresh' })
      setWorkletLoaded(true)
    } catch (e) {
      console.error('Error in initWorklet', e)
      setFatalError(e instanceof Error ? e.message : 'Failed to initialize backend runtime.')
      setWorkletLoaded(false)
    }
  }, [])

  useEffect(() => {
    if (fontError) setFatalError('Failed to load system fonts.')
  }, [fontError])

  useEffect(() => {
    initWorklet()
  }, [initWorklet])

  useEffect(() => {
    if (loaded && worketLoaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded, worketLoaded])

  if (fatalError) {
    return <ErrorScreen message={fatalError} onRetry={initWorklet} />
  }

  if (!loaded || !worketLoaded) {
    return null
  }

  return <RootLayoutNav />
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppTabs />
        <AnimatedSplashOverlay />
      </ThemeProvider>
    </Provider>
  )
}
