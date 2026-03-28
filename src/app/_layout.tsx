import FontAwesome from '@expo/vector-icons/FontAwesome'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { appReady, initApp } from '@pear-notes/core/store/slices/uiSlice.js'
import { store } from '@pear-notes/core/store/store.js'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Directory, Paths } from 'expo-file-system'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LogBox, NativeModules, View } from 'react-native'
import 'react-native-reanimated'
import RNRestart from 'react-native-restart'
import { Provider, useSelector } from 'react-redux'

import { ErrorScreen } from '@/components/ErrorScreen'
import { PairingOverlay } from '@/components/PairingOverlay'
import { useResolvedColorScheme } from '@/components/Themed'
import { useColorScheme } from '@/components/useColorScheme'
import Colors from '@/constants/Colors'
import { NoteEditorProvider } from '@/providers/NoteEditorProvider'
import { startWorklet } from '@/utils/worklet'

export { ErrorBoundary } from 'expo-router'

LogBox.ignoreAllLogs()

SplashScreen.preventAutoHideAsync()

const documentDir = new Directory(Paths.document)
const storage = documentDir.uri.replace(/^file:\/+/, '/')

export default function RootLayout() {
  const [worketLoaded, setWorkletLoaded] = useState(false)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const splashHidden = useRef(false)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const [loaded, fontError] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  })

  const initWorklet = useCallback(async () => {
    try {
      setFatalError(null)
      await startWorklet(storage)
      await backendApi.ready({ storage, encryption: 'amresh' })
      console.log('Backend runtime initialized')
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
    SystemUI.setBackgroundColorAsync(isDark ? Colors.dark.background : Colors.light.background)
  }, [isDark])

  useEffect(() => {
    if (loaded && worketLoaded) {
      store.dispatch(appReady())
      store.dispatch(initApp())
    }
  }, [loaded, worketLoaded])

  if (fatalError) {
    return <ErrorScreen message={fatalError} onRetry={initWorklet} />
  }

  if (!loaded || !worketLoaded) {
    return null
  }

  const handleLayout = () => {
    if (!splashHidden.current) {
      splashHidden.current = true
      SplashScreen.hideAsync()
    }
  }

  return (
    <Provider store={store}>
      <View style={{ flex: 1 }} onLayout={handleLayout}>
        <RootLayoutNav />
      </View>
    </Provider>
  )
}

function RootLayoutNav() {
  const colorScheme = useResolvedColorScheme()
  const isDark = colorScheme === 'dark'
  const needsReload = useSelector((state: any) => state.sync.needsReload)

  useEffect(() => {
    if (needsReload) {
      if (__DEV__ && NativeModules.DevSettings) {
        NativeModules.DevSettings.reload()
      } else {
        RNRestart.restart()
      }
    }
  }, [needsReload])

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? Colors.dark.background : Colors.light.background)
  }, [isDark])

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <NoteEditorProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="note" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>

        <PairingOverlay />
      </NoteEditorProvider>
    </ThemeProvider>
  )
}
