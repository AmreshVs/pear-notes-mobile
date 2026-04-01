import { backendApi } from '@pear-notes/core/backend/api.js'
import { getIsLoading as getNotesLoading } from '@pear-notes/core/store/slices/notesSlice.js'
import { appReady, initApp } from '@pear-notes/core/store/slices/uiSlice.js'
import { store } from '@pear-notes/core/store/store.js'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Directory, Paths } from 'expo-file-system'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Appearance, LogBox, NativeModules, View } from 'react-native'
import 'react-native-reanimated'
import RNRestart from 'react-native-restart'
import { Provider, useSelector } from 'react-redux'

import { ErrorScreen } from '@/components/ErrorScreen'
import { PairingOverlay } from '@/components/PairingOverlay'
import { useResolvedColorScheme } from '@/components/Themed'
import { useColorScheme } from '@/components/useColorScheme'
import Colors from '@/constants/Colors'
import { AndroidPaperProvider } from '@/providers/AndroidPaperProvider'
import { NoteEditorProvider } from '@/providers/NoteEditorProvider'
import { startWorklet } from '@/utils/worklet'

export { ErrorBoundary } from 'expo-router'

LogBox.ignoreAllLogs()

const _initialScheme = Appearance.getColorScheme()
SystemUI.setBackgroundColorAsync(
  _initialScheme === 'dark' ? Colors.dark.background : Colors.light.background,
)

SplashScreen.setOptions({ duration: 200, fade: true })
SplashScreen.preventAutoHideAsync()

const documentDir = new Directory(Paths.document)
const storage = documentDir.uri.replace(/^file:\/+/, '/')

export default function RootLayout() {
  const [fatalError, setFatalError] = useState<string | null>(null)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const initWorklet = useCallback(async () => {
    try {
      setFatalError(null)
      await startWorklet(storage)
      await backendApi.ready({ storage, encryption: 'amresh' })
      store.dispatch(appReady())
      store.dispatch(initApp())
    } catch (e) {
      console.error('Error in initWorklet', e)
      setFatalError(e instanceof Error ? e.message : 'Failed to initialize backend runtime.')
    }
  }, [])

  useEffect(() => {
    initWorklet()
  }, [initWorklet])

  const bgColor = isDark ? Colors.dark.background : Colors.light.background

  if (fatalError) {
    return <ErrorScreen message={fatalError} onRetry={initWorklet} />
  }

  return (
    <Provider store={store}>
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <RootLayoutNav />
      </View>
    </Provider>
  )
}

function SplashGate() {
  const notesLoading = useSelector(getNotesLoading)
  const hiddenRef = useRef(false)

  const hide = useCallback(() => {
    if (!hiddenRef.current) {
      hiddenRef.current = true
      setTimeout(() => {
        SplashScreen.hideAsync()
      })
    }
  }, [])

  useEffect(() => {
    if (!notesLoading) hide()
  }, [notesLoading, hide])

  return null
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
      <AndroidPaperProvider>
        <SplashGate />
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
      </AndroidPaperProvider>
    </ThemeProvider>
  )
}
