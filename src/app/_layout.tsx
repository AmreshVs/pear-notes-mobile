import '@/locales/i18n'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { getIsLoading as getNotesLoading } from '@pear-notes/core/store/slices/notesSlice.js'
import { getDeviceRemoved, setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import { appReady, initApp } from '@pear-notes/core/store/slices/uiSlice.js'
import { store } from '@pear-notes/core/store/store.js'
import * as Crypto from 'expo-crypto'
import { Directory, Paths } from 'expo-file-system'
import { router, Stack, usePathname } from 'expo-router'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Appearance, LogBox, StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import { Provider, useDispatch, useSelector } from 'react-redux'

import { ErrorScreen } from '@/components/ErrorScreen'
import { PairingOverlay } from '@/components/PairingOverlay'
import { createThemedStylesheet, useResolvedColorScheme, useTheme } from '@/components/Themed'
import Colors from '@/constants/Colors'
import { commonStyles, FontSize, FontWeight } from '@/constants/commonStyles'
import { getDbEncryptionKey, setDbEncryptionKey } from '@/lib/secureStore'
import { AndroidPaperProvider } from '@/providers/AndroidPaperProvider'
import { NoteEditorProvider } from '@/providers/NoteEditorProvider'
import { SheetProvider } from '@/providers/SheetProvider'
import { ToastProvider } from '@/providers/ToastProvider'
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
  const [remountKey, setRemountKey] = useState(0)

  const triggerReload = useCallback(() => {
    setRemountKey((k) => k + 1)
  }, [])

  return (
    <Provider key={remountKey} store={store}>
      <RootLayoutInner triggerReload={triggerReload} />
    </Provider>
  )
}

function RootLayoutInner({ triggerReload }: { triggerReload: () => void }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const theme = useTheme()
  const styles = useStyles()

  const [fatalError, setFatalError] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const prevDeviceRemovedRef = useRef(false)
  const savedEncryptionKeyRef = useRef<string | null>(null)
  const wasLoadingRef = useRef(false)

  const deviceRemoved = useSelector(getDeviceRemoved)
  const needsReload = useSelector((state: any) => state.sync.needsReload)
  const receiverStatus = useSelector((state: any) => state.sync.receiverStatus)
  const inviterStatus = useSelector((state: any) => state.sync.inviterStatus)
  const notesLoading = useSelector(getNotesLoading)
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const prevNeedsConfirmRef = useRef(false)

  const initWorklet = useCallback(async () => {
    try {
      setFatalError(null)
      await startWorklet(storage)
      let key = await getDbEncryptionKey()
      if (!key) {
        const bytes = new Uint8Array(32)
        Crypto.getRandomValues(bytes)
        key = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
        await setDbEncryptionKey(key)
      }
      await backendApi.ready({ storage, encryption: key })
      dispatch(appReady())
      dispatch(initApp())
    } catch (e) {
      console.error('Error in initWorklet', e)
      setFatalError(e instanceof Error ? e.message : t('error.backendFailed'))
    }
  }, [dispatch, t])

  useEffect(() => {
    initWorklet()
  }, [initWorklet])

  useEffect(() => {
    if (prevDeviceRemovedRef.current && !deviceRemoved) {
      setIsResetting(true)
    }
    prevDeviceRemovedRef.current = deviceRemoved
  }, [deviceRemoved])

  const encryptionKey = receiverStatus?.encryptionKey
  useEffect(() => {
    if (encryptionKey && encryptionKey !== savedEncryptionKeyRef.current) {
      savedEncryptionKeyRef.current = encryptionKey
      setDbEncryptionKey(encryptionKey).catch(console.error)
    }
  }, [encryptionKey])

  useEffect(() => {
    if (needsReload) {
      dispatch(setNeedsReload(false))
      router.dismissAll()
      router.replace('/(tabs)/(folders)')
      triggerReload()
    }
  }, [needsReload, dispatch, triggerReload])

  useEffect(() => {
    const needsConfirm =
      inviterStatus?.step === 'confirmation' || receiverStatus?.step === 'confirmation'
    if (
      needsConfirm &&
      !prevNeedsConfirmRef.current &&
      pathnameRef.current.startsWith('/settings')
    ) {
      router.dismissAll()
    }
    prevNeedsConfirmRef.current = needsConfirm
  }, [inviterStatus?.step, receiverStatus?.step])

  useEffect(() => {
    if (!isResetting) {
      wasLoadingRef.current = false
      return
    }
    if (notesLoading) {
      wasLoadingRef.current = true
    } else if (wasLoadingRef.current) {
      setIsResetting(false)
    }
  }, [isResetting, notesLoading])

  useEffect(() => {
    if (!isResetting) return
    const fallback = setTimeout(() => setIsResetting(false), 15000)
    return () => clearTimeout(fallback)
  }, [isResetting])

  if (fatalError) {
    return <ErrorScreen message={fatalError} onRetry={initWorklet} />
  }

  return (
    <>
      <GestureHandlerRootView style={styles.gestureView}>
        <RootLayoutNav />
      </GestureHandlerRootView>
      {isResetting && (
        <View style={styles.resetOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.resetTitle}>{t('pairing.overlay.resettingTitle')}</Text>
          <Text style={styles.resetDesc}>{t('pairing.overlay.resettingDesc')}</Text>
        </View>
      )}
    </>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    gestureView: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
    },
    resetOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      gap: 12,
      backgroundColor: theme.colors.background,
    },
    resetTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.semibold,
      marginTop: 4,
      color: theme.colors.text,
    },
    resetDesc: {
      fontSize: FontSize.body,
      opacity: 0.7,
      textAlign: 'center',
      paddingHorizontal: 40,
      color: theme.colors.textSecondary,
    },
  })
  return styles
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
          <ToastProvider>
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
          </ToastProvider>
        </SheetProvider>
      </AndroidPaperProvider>
    </ThemeProvider>
  )
}
