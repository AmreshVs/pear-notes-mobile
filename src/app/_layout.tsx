import '@/locales/i18n'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { getIsLoading as getNotesLoading } from '@pear-notes/core/store/slices/notesSlice.js'
import { setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
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
import {
  ActivityIndicator,
  Appearance,
  LogBox,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import { Provider, useDispatch, useSelector } from 'react-redux'

import { AppUpdateBanner } from '@/components/AppUpdateBanner'
import { AppUpdateRequiredOverlay } from '@/components/AppUpdateRequiredOverlay'
import { BackupProgressBanner } from '@/components/backup/BackupProgressBanner'
import { ErrorScreen } from '@/components/ErrorScreen'
import { LockUnavailableModal } from '@/components/LockUnavailableModal'
import { NoteUnlockPasswordModal } from '@/components/NoteUnlockPasswordModal'
import { PairingOverlay } from '@/components/PairingOverlay'
import { createThemedStylesheet, useResolvedColorScheme } from '@/components/Themed'
import Colors from '@/constants/Colors'
import { commonStyles, FontSize, FontWeight } from '@/constants/commonStyles'
import { getBackgroundSyncMode } from '@/lib/backgroundSync'
import { applyBackgroundSyncMode } from '@/lib/backgroundSyncTask'
import { sweepBackupCache } from '@/lib/backupFileManager'
import { clearStorageState } from '@/lib/clearStorageState'
import { getDbEncryptionKey, setDbEncryptionKey } from '@/lib/secureStore'
import { useMediaSyncAutoDetect } from '@/lib/useMediaSyncAutoDetect'
import { AndroidPaperProvider } from '@/providers/AndroidPaperProvider'
import { NoteEditorProvider } from '@/providers/NoteEditorProvider'
import { SheetProvider } from '@/providers/SheetProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { startWorklet } from '@/utils/worklet'

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary'

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
  const [remountKey, setRemountKey] = useState(0)
  const [isClearing, setIsClearing] = useState(false)

  const triggerReload = useCallback(() => {
    setRemountKey((k) => k + 1)
  }, [])

  useEffect(() => {
    return clearStorageState.subscribe((val) => {
      setIsClearing(val)
    })
  }, [])

  const colorScheme = Appearance.getColorScheme()
  const isDark = colorScheme === 'dark'
  const currentTheme = isDark ? Colors.dark : Colors.light
  const styles = getStyles(isDark)

  return (
    <View style={commonStyles.flex1}>
      <Provider key={remountKey} store={store}>
        <RootLayoutInner triggerReload={triggerReload} />
      </Provider>
      {isClearing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={currentTheme.primary} />
          <Text style={styles.title}>{t('pairing.overlay.resettingTitle')}</Text>
          <Text style={styles.desc}>{t('pairing.overlay.resettingDesc')}</Text>
        </View>
      )}
    </View>
  )
}

function RootLayoutInner({ triggerReload }: { triggerReload: () => void }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()

  useMediaSyncAutoDetect()

  const [fatalError, setFatalError] = useState<string | null>(null)
  const savedEncryptionKeyRef = useRef<string | null>(null)

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
      await startWorklet(storage, {
        onWorkletDied: () => initWorklet(),
        notificationTitle: t('sync.backgroundSync.notificationTitle'),
        notificationMessage: t('sync.backgroundSync.notificationMessage'),
      })
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
    sweepBackupCache()
  }, [])

  useEffect(() => {
    getBackgroundSyncMode().then(applyBackgroundSyncMode)
  }, [])

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
      pathnameRef.current.startsWith('/settings') &&
      Platform.OS === 'ios'
    ) {
      router.dismissAll()
      router.back()
    }
    prevNeedsConfirmRef.current = needsConfirm
  }, [inviterStatus?.step, receiverStatus?.step])

  useEffect(() => {
    if (!notesLoading && clearStorageState.getClearing()) {
      const timer = setTimeout(() => {
        clearStorageState.setClearing(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [notesLoading])

  if (fatalError) {
    return <ErrorScreen message={fatalError} onRetry={initWorklet} />
  }

  return (
    <GestureHandlerRootView style={styles.gestureView}>
      <RootLayoutNav />
    </GestureHandlerRootView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    gestureView: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.background,
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
              <LockUnavailableModal />
              <NoteUnlockPasswordModal />
              <BackupProgressBanner />
              <AppUpdateBanner />
              <AppUpdateRequiredOverlay />
            </NoteEditorProvider>
          </ToastProvider>
        </SheetProvider>
      </AndroidPaperProvider>
    </ThemeProvider>
  )
}

const getStyles = (isDark: boolean) => {
  const currentTheme = isDark ? Colors.dark : Colors.light
  const styles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: currentTheme.background,
      zIndex: 99999,
      gap: 12,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.semibold,
      color: currentTheme.text,
    },
    desc: {
      fontSize: FontSize.body,
      opacity: 0.7,
      textAlign: 'center',
      paddingHorizontal: 40,
      color: currentTheme.textSecondary,
    },
  })
  return styles
}
