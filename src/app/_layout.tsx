import '@/devtools/reactotron'
import '@/locales/i18n'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Appearance,
  AppState,
  LogBox,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Provider, useDispatch, useSelector } from 'react-redux'
import * as Crypto from 'expo-crypto'
import { router, Stack, usePathname } from 'expo-router'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'

import { backendApi, setLocalDeviceName } from '@pear-notes/core/backend/api.js'
import { appBoot } from '@pear-notes/core/bootTimeline.js'
import * as log from '@pear-notes/core/log.js'
import { setLocalAiAdapter } from '@pear-notes/core/store/services/localAiAdapter.js'
import { LOCAL_AI_ENABLED } from '@pear-notes/core/store/services/localAiCatalog.js'
import { getIsLoading as getNotesLoading } from '@pear-notes/core/store/slices/notesSlice.js'
import { setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import {
  appReady,
  initApp,
  refreshHyperdriveAddress,
  resetAppState,
  resyncApp,
} from '@pear-notes/core/store/slices/uiSlice.js'
import {
  clearVaultError,
  getVaultEnteredAt,
  getVaultError,
  getVaultFailedAction,
} from '@pear-notes/core/store/slices/vaultsSlice.js'
import { store } from '@pear-notes/core/store/store.js'

import { AppUpdateBanner } from '@/components/AppUpdateBanner'
import { AppUpdateRequiredOverlay } from '@/components/AppUpdateRequiredOverlay'
import { BackupProgressBanner } from '@/components/backup/BackupProgressBanner'
import { BackupNudge } from '@/components/BackupNudge'
import { ErrorScreen } from '@/components/ErrorScreen'
import { ForceVaultRemovalPrompt } from '@/components/ForceVaultRemovalPrompt'
import { AskVaultSheet } from '@/components/localAi/AskVaultSheet'
import { LockUnavailableModal } from '@/components/LockUnavailableModal'
import { MergeNotesBanner } from '@/components/MergeNotesBanner'
import { NoteUnlockPasswordModal } from '@/components/NoteUnlockPasswordModal'
import { PairingOverlay } from '@/components/PairingOverlay'
import {
  ColorSchemeProvider,
  createThemedStylesheet,
  useReduceMotion,
  useResolvedColorScheme,
} from '@/components/Themed'
import { TipBanner } from '@/components/tips/TipBanner'
import { VaultChangeOverlay } from '@/components/VaultChangeOverlay'
import Colors from '@/constants/Colors'
import { commonStyles, FontSize, FontWeight } from '@/constants/commonStyles'
import { useIsLargeScreen } from '@/hooks/useIsLargeScreen'
import { useNoteAutoRelock } from '@/hooks/useNoteAutoRelock'
import { useReminders } from '@/hooks/useReminders'
import { loadAndroidColorTheme } from '@/lib/androidColorTheme'
import { WORKLET_STORAGE_PATH } from '@/lib/backendWorklet'
import { getBackgroundSyncMode } from '@/lib/backgroundSync'
import { applyBackgroundSyncMode } from '@/lib/backgroundSyncTask'
import { sweepBackupCache } from '@/lib/backupFileManager'
import { clearStorageState } from '@/lib/clearStorageState'
import { excludeFromDeviceBackups } from '@/lib/deviceBackupExclusion'
import { loadHapticsPreference } from '@/lib/haptics'
import { localAiAdapter } from '@/lib/localAi/localAi'
import { useAiJobConditions } from '@/lib/localAi/useAiJobConditions'
import { useLocalAiBridge } from '@/lib/localAi/useLocalAiBridge'
import {
  getDbEncryptionKey,
  getVaultEntropy,
  isKeychainLockedError,
  setDbEncryptionKey,
  setVaultEntropy,
} from '@/lib/secureStore'
import { useAttachmentCachePrune } from '@/lib/useAttachmentCachePrune'
import { useMediaSyncAutoDetect } from '@/lib/useMediaSyncAutoDetect'
import { getVaultErrorKey } from '@/lib/vaultLabels'
import { AndroidPaperProvider } from '@/providers/AndroidPaperProvider'
import { NoteEditorProvider } from '@/providers/NoteEditorProvider'
import { SheetProvider } from '@/providers/SheetProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { getLocalDeviceName } from '@/utils/deviceName'
import { markBackendReady, startWorklet } from '@/utils/worklet'

export { AppErrorBoundary as ErrorBoundary } from '@/components/AppErrorBoundary'

LogBox.ignoreAllLogs()

if (LOCAL_AI_ENABLED) setLocalAiAdapter(localAiAdapter)

const _initialScheme = Appearance.getColorScheme()
SystemUI.setBackgroundColorAsync(
  _initialScheme === 'dark' ? Colors.dark.background : Colors.light.background,
)

SplashScreen.setOptions({ duration: 200, fade: true })
SplashScreen.preventAutoHideAsync()

const storage = WORKLET_STORAGE_PATH
const MAX_WORKLET_RESTART_ATTEMPTS = 5
const MAX_KEYCHAIN_RETRY_ATTEMPTS = 5
const KEYCHAIN_RETRY_DELAY_MS = 1000
const READY_SLOW_LOG_MS = 30_000
const ALERTED_VAULT_ACTIONS: (string | null)[] = ['move', 'switch']

// rootSaga dispatches initApp once, off the first appReady it sees. Every later boot of
// the backend - a worklet restart, or the soft reload below - has to ask for it, and the
// flag has to outlive the remount that soft reload performs.
let hasInitializedBackend = false

const randomHex32 = () => {
  const bytes = new Uint8Array(32)
  Crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

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

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const currentTheme = isDark ? Colors.dark : Colors.light
  const styles = isDark ? darkOverlayStyles : lightOverlayStyles

  return (
    <View style={commonStyles.flex1}>
      <Provider key={remountKey} store={store}>
        <ColorSchemeProvider>
          <RootLayoutInner triggerReload={triggerReload} />
        </ColorSchemeProvider>
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
  const insets = useSafeAreaInsets()

  const gestureViewStyle = useMemo(
    () => [styles.gestureView, { paddingLeft: insets.left, paddingRight: insets.right }],
    [styles.gestureView, insets.left, insets.right],
  )

  useMediaSyncAutoDetect()
  useAttachmentCachePrune()
  useLocalAiBridge()
  const onUserTouch = useAiJobConditions()
  useNoteAutoRelock()
  useReminders()

  const [fatalError, setFatalError] = useState<string | null>(null)
  // LEGACY(hyperdb-migration): see docs/HYPERDB-VIEW-MIGRATION-PLAN-2026-09-23.md section 8
  const [legacyVault, setLegacyVault] = useState(false)
  const openBackupAfterReadyRef = useRef(false)
  const savedEncryptionKeyRef = useRef<string | null>(null)
  const workletRestartAttemptsRef = useRef(0)
  const keychainRetryAttemptsRef = useRef(0)

  const needsReload = useSelector((state: any) => state.sync.needsReload)
  const vaultEnteredAt = useSelector(getVaultEnteredAt)
  const vaultError = useSelector(getVaultError)
  const vaultFailedAction = useSelector(getVaultFailedAction)
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
      setLegacyVault(false)
      appBoot.mark('app js reached initWorklet')
      excludeFromDeviceBackups(storage)
      await startWorklet(storage, {
        onWorkletDied: () => {
          workletRestartAttemptsRef.current += 1
          log.error('[boot] worklet died, restart attempt ' + workletRestartAttemptsRef.current)
          if (workletRestartAttemptsRef.current > MAX_WORKLET_RESTART_ATTEMPTS) {
            setFatalError(t('error.backendFailed'))
            return
          }
          initWorklet()
        },
        onResumed: () => {
          dispatch(refreshHyperdriveAddress())
          dispatch(resyncApp())
        },
        notificationTitle: t('sync.backgroundSync.notificationTitle'),
        notificationMessage: t('sync.backgroundSync.notificationMessage'),
      })
      appBoot.mark('worklet started')
      let key = await getDbEncryptionKey()
      if (!key) {
        key = randomHex32()
        await setDbEncryptionKey(key)
      }
      let entropy = await getVaultEntropy()
      if (!entropy) {
        entropy = randomHex32()
        await setVaultEntropy(entropy)
      }
      const readyStartedAt = Date.now()
      const readySlowTimer = setTimeout(
        () => log.error('[boot] backend ready still pending after ' + READY_SLOW_LOG_MS + 'ms'),
        READY_SLOW_LOG_MS,
      )
      let readyResult
      try {
        readyResult = await backendApi.ready({ storage, encryption: key, entropy })
      } finally {
        clearTimeout(readySlowTimer)
      }
      if (readyResult?.done !== true) {
        log.error('[boot] backend ready failed', {
          reason: readyResult?.reason ?? 'none',
          ms: Date.now() - readyStartedAt,
        })
        if (readyResult?.reason === 'LEGACY_VAULT') {
          setLegacyVault(true)
          return
        }
        setFatalError(
          readyResult?.reason === 'VAULT_KEY_SEALED'
            ? t('error.vaultSealed')
            : t('error.backendFailed'),
        )
        return
      }
      appBoot.mark('backendApi.ready resolved')
      markBackendReady()
      log.info('[boot] backend ready in ' + (Date.now() - readyStartedAt) + 'ms')
      workletRestartAttemptsRef.current = 0
      keychainRetryAttemptsRef.current = 0
      loadHapticsPreference()
      loadAndroidColorTheme()
      getBackgroundSyncMode().then(applyBackgroundSyncMode)
      dispatch(appReady())
      if (hasInitializedBackend) dispatch(initApp())
      hasInitializedBackend = true
      setLocalDeviceName(getLocalDeviceName())
    } catch (e) {
      if (
        isKeychainLockedError(e) &&
        keychainRetryAttemptsRef.current < MAX_KEYCHAIN_RETRY_ATTEMPTS
      ) {
        keychainRetryAttemptsRef.current += 1
        log.warn('[boot] keychain locked, retry ' + keychainRetryAttemptsRef.current)
        if (AppState.currentState === 'active') {
          setTimeout(initWorklet, KEYCHAIN_RETRY_DELAY_MS)
        } else {
          const sub = AppState.addEventListener('change', (state) => {
            if (state !== 'active') return
            sub.remove()
            initWorklet()
          })
        }
        return
      }
      log.error('[boot] initWorklet failed', e)
      setFatalError(e instanceof Error ? e.message : t('error.backendFailed'))
    }
  }, [dispatch, t])

  const workletStartedRef = useRef(false)

  useEffect(() => {
    if (workletStartedRef.current) return
    workletStartedRef.current = true
    initWorklet()
  }, [initWorklet])

  useEffect(() => {
    sweepBackupCache()
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
      // The remount below rebuilds the React tree, not the store, so without this the
      // wiped or restored notes stay on screen until the app is killed and reopened.
      dispatch(resetAppState())
      triggerReload()
    }
  }, [needsReload, dispatch, triggerReload])

  useEffect(() => {
    if (!vaultEnteredAt) return
    if (router.canDismiss()) router.dismissAll()
    router.replace('/(tabs)/(folders)')
  }, [vaultEnteredAt])

  useEffect(() => {
    const errorKey = getVaultErrorKey(vaultError)
    if (!errorKey || !ALERTED_VAULT_ACTIONS.includes(vaultFailedAction)) return
    Alert.alert(t(errorKey))
    dispatch(clearVaultError())
  }, [vaultError, vaultFailedAction, dispatch, t])

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

  // LEGACY(hyperdb-migration): see docs/HYPERDB-VIEW-MIGRATION-PLAN-2026-09-23.md section 8
  const startFreshFromLegacyVault = useCallback(async () => {
    const fresh = await backendApi.startFreshVault({ storage }).catch(() => null)
    if (fresh?.done !== true) {
      setLegacyVault(false)
      setFatalError(t('error.legacyVaultStartFreshFailed'))
      return
    }
    openBackupAfterReadyRef.current = true
    initWorklet()
  }, [initWorklet, t])

  const confirmStartFresh = useCallback(() => {
    Alert.alert(t('error.legacyVaultConfirmTitle'), t('error.legacyVaultConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('error.legacyVaultConfirmAction'),
        style: 'destructive',
        onPress: startFreshFromLegacyVault,
      },
    ])
  }, [startFreshFromLegacyVault, t])

  useEffect(() => {
    if (legacyVault || fatalError) SplashScreen.hideAsync()
  }, [legacyVault, fatalError])

  useEffect(() => {
    if (notesLoading || !openBackupAfterReadyRef.current) return
    openBackupAfterReadyRef.current = false
    router.push('/settings/backup')
  }, [notesLoading])

  useEffect(() => {
    if (!notesLoading && clearStorageState.getClearing()) {
      const timer = setTimeout(() => {
        clearStorageState.setClearing(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [notesLoading])

  if (legacyVault) {
    return (
      <ErrorScreen
        title={t('error.legacyVaultTitle')}
        message={t('error.legacyVault')}
        onRetry={initWorklet}
        action={{ label: t('error.legacyVaultStartFresh'), onPress: confirmStartFresh }}
      />
    )
  }

  if (fatalError) {
    return <ErrorScreen message={fatalError} onRetry={initWorklet} />
  }

  return (
    <GestureHandlerRootView style={gestureViewStyle} onTouchStart={onUserTouch}>
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
      appBoot.mark('splash hidden')
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

const SETTINGS_PATH_PREFIX = '/settings'

function RootLayoutNav() {
  const colorScheme = useResolvedColorScheme()
  const isDark = colorScheme === 'dark'
  const reduceMotion = useReduceMotion()
  const isLargeScreen = useIsLargeScreen()
  const pathname = usePathname()
  const isSettingsOpen = pathname.startsWith(SETTINGS_PATH_PREFIX)
  const [settingsUsesPanel, setSettingsUsesPanel] = useState(isLargeScreen)

  useEffect(() => {
    if (isSettingsOpen) return
    setSettingsUsesPanel(isLargeScreen)
  }, [isSettingsOpen, isLargeScreen])

  const settingsOptions = useMemo(
    () =>
      settingsUsesPanel && Platform.OS === 'ios'
        ? {
            presentation: 'transparentModal' as const,
            headerShown: false,
            animation: 'fade' as const,
          }
        : { presentation: 'modal' as const, headerShown: false, sheetGrabberVisible: true },
    [settingsUsesPanel],
  )

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? Colors.dark.background : Colors.light.background)
  }, [isDark])

  return (
    <ThemeProvider value={isDark ? CustomDarkTheme : CustomLightTheme}>
      <ReducedMotionConfig mode={reduceMotion ? ReduceMotion.Always : ReduceMotion.Never} />
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
                <Stack.Screen
                  name="note"
                  options={{
                    headerShown: false,
                    animation: 'none',
                    presentation: 'transparentModal',
                  }}
                />
                <Stack.Screen name="settings" options={settingsOptions} />
              </Stack>

              <PairingOverlay />
              <VaultChangeOverlay />
              <ForceVaultRemovalPrompt />
              <LockUnavailableModal />
              <NoteUnlockPasswordModal />
              {LOCAL_AI_ENABLED && <AskVaultSheet />}
              <BackupProgressBanner />
              <AppUpdateBanner />
              <TipBanner />
              <MergeNotesBanner />
              <BackupNudge />
              <AppUpdateRequiredOverlay />
            </NoteEditorProvider>
          </ToastProvider>
        </SheetProvider>
      </AndroidPaperProvider>
    </ThemeProvider>
  )
}

const createOverlayStyles = (isDark: boolean) => {
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

const lightOverlayStyles = createOverlayStyles(false)
const darkOverlayStyles = createOverlayStyles(true)
