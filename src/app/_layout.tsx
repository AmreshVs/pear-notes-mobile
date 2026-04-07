import '@/locales/i18n'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { getIsLoading as getNotesLoading } from '@pear-notes/core/store/slices/notesSlice.js'
import { getDeviceRemoved, setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import { appReady, initApp } from '@pear-notes/core/store/slices/uiSlice.js'
import { store } from '@pear-notes/core/store/store.js'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { Directory, Paths } from 'expo-file-system'
import { router, Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Appearance, LogBox, StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import { Provider, useSelector } from 'react-redux'

import { ErrorScreen } from '@/components/ErrorScreen'
import { PairingOverlay } from '@/components/PairingOverlay'
import { useResolvedColorScheme } from '@/components/Themed'
import { useColorScheme } from '@/components/useColorScheme'
import Colors from '@/constants/Colors'
import { AndroidPaperProvider } from '@/providers/AndroidPaperProvider'
import { NoteEditorProvider } from '@/providers/NoteEditorProvider'
import { SheetProvider } from '@/providers/SheetProvider'
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
  const { t } = useTranslation()
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [remountKey, setRemountKey] = useState(0)
  const [isResetting, setIsResetting] = useState(false)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const prevDeviceRemovedRef = useRef(false)

  const initWorklet = useCallback(async () => {
    try {
      setFatalError(null)
      await startWorklet(storage)
      await backendApi.ready({ storage, encryption: 'amresh' })
      store.dispatch(appReady())
      store.dispatch(initApp())
    } catch (e) {
      console.error('Error in initWorklet', e)
      setFatalError(e instanceof Error ? e.message : t('error.backendFailed'))
    }
  }, [])

  useEffect(() => {
    initWorklet()
  }, [initWorklet])

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState()
      const deviceRemoved = getDeviceRemoved(state)

      if (prevDeviceRemovedRef.current && !deviceRemoved) {
        setIsResetting(true)
      }
      prevDeviceRemovedRef.current = deviceRemoved

      if (state.sync.needsReload) {
        store.dispatch(setNeedsReload(false))
        router.dismissAll()
        router.replace('/(tabs)/(folders)')
        setRemountKey((k) => k + 1)
        initWorklet()
      }
    })
    return unsubscribe
  }, [initWorklet])

  useEffect(() => {
    if (!isResetting) return
    let wasLoading = false
    const fallback = setTimeout(() => setIsResetting(false), 15000)
    const unsubscribe = store.subscribe(() => {
      const notesLoading = getNotesLoading(store.getState())
      if (notesLoading) wasLoading = true
      if (wasLoading && !notesLoading) {
        clearTimeout(fallback)
        setIsResetting(false)
      }
    })
    return () => {
      unsubscribe()
      clearTimeout(fallback)
    }
  }, [isResetting])

  const bgColor = isDark ? Colors.dark.background : Colors.light.background
  const textColor = isDark ? Colors.dark.text : Colors.light.text
  const subtextColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary

  if (fatalError) {
    return <ErrorScreen message={fatalError} onRetry={initWorklet} />
  }

  return (
    <>
      <Provider key={remountKey} store={store}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </Provider>
      {isResetting && (
        <View style={[StyleSheet.absoluteFill, styles.resetOverlay, { backgroundColor: bgColor }]}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={[styles.resetTitle, { color: textColor }]}>
            {t('pairing.overlay.resettingTitle')}
          </Text>
          <Text style={[styles.resetDesc, { color: subtextColor }]}>
            {t('pairing.overlay.resettingDesc')}
          </Text>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  resetOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    gap: 12,
  },
  resetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  resetDesc: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
})

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

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? Colors.dark.background : Colors.light.background)
  }, [isDark])

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.background,
      card: Colors.dark.surface,
      text: Colors.dark.text,
      border: Colors.dark.border,
      primary: Colors.dark.primary,
    },
  }

  const CustomLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light.background,
      card: Colors.light.surface,
      text: Colors.light.text,
      border: Colors.light.border,
      primary: Colors.light.primary,
    },
  }

  return (
    <ThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
      <AndroidPaperProvider>
        <SheetProvider>
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
        </SheetProvider>
      </AndroidPaperProvider>
    </ThemeProvider>
  )
}
