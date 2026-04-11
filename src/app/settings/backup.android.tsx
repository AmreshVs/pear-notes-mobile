import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  getExportBuffer,
  getExportStatus,
  getImportStatus,
  resetExport,
  resetImport,
  startExportBackup,
  startImportBackup,
} from '@pear-notes/core/store/slices/backupSlice.js'
import { getTotalStorageSize } from '@pear-notes/core/store/slices/storageSlice.js'
import { setNeedsReload } from '@pear-notes/core/store/slices/syncSlice.js'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { router, Stack } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'

import { useMD3Theme } from '@/components/android/useMD3Theme'

type BackupStatus = {
  step: string
  message: string
  progress: number
  current: number
  total: number
}

const LAST_BACKUP_FILE = (FileSystem.documentDirectory ?? '') + 'lastBackup.json'

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function uint8ArrayToBase64(buffer: Uint8Array): string {
  const CHUNK = 3 * 1024
  const parts: string[] = []
  for (let i = 0; i < buffer.length; i += CHUNK) {
    parts.push(btoa(String.fromCharCode.apply(null, buffer.subarray(i, i + CHUNK) as any)))
  }
  return parts.join('')
}

function toUint8Array(data: any): Uint8Array {
  if (data instanceof Uint8Array) return data
  return new Uint8Array(Object.values(data as Record<string, number>))
}

async function saveLastBackupDate(): Promise<void> {
  await FileSystem.writeAsStringAsync(
    LAST_BACKUP_FILE,
    JSON.stringify({ date: new Date().toISOString() }),
  )
}

async function loadLastBackupDate(): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(LAST_BACKUP_FILE)
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(LAST_BACKUP_FILE)
      return JSON.parse(content).date
    }
  } catch {}
  return null
}

function formatBackupDate(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
    ' • ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

export default function AndroidBackupScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const theme = useMD3Theme()
  const c = theme.colors as any
  const dispatch = useDispatch()

  const exportStatus = useSelector(getExportStatus) as BackupStatus
  const importStatus = useSelector(getImportStatus) as BackupStatus
  const exportBuffer = useSelector(getExportBuffer) as any
  const totalSize = (useSelector(getTotalStorageSize) as number) ?? 0

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)

  useEffect(() => {
    loadLastBackupDate().then(setLastBackupDate)
  }, [])

  const isExporting =
    exportStatus.step !== 'idle' && exportStatus.step !== 'done' && exportStatus.step !== 'error'
  const isImporting = importStatus.step !== 'idle' && importStatus.step !== 'error'
  const showProgressModal =
    isExporting || isImporting || exportStatus.step === 'error' || importStatus.step === 'error'

  const isError = exportStatus.step === 'error' || importStatus.step === 'error'
  const errorMessage = exportStatus.step === 'error' ? exportStatus.message : importStatus.message
  const progressStatus = isExporting ? exportStatus : importStatus
  const progressTitle = isExporting
    ? t('backup.progress.creatingTitle')
    : t('backup.progress.restoringTitle')

  useEffect(() => {
    if (exportStatus.step === 'done' && exportBuffer) {
      handleSaveBackup()
    }
  }, [exportStatus.step, exportBuffer])

  // Restore completion is handled in the modal now

  const handleSaveBackup = useCallback(async () => {
    if (!exportBuffer) return
    try {
      const uint8 = toUint8Array(exportBuffer)
      const base64 = uint8ArrayToBase64(uint8)
      const date = new Date().toISOString().split('T')[0]
      const filename = `pear-notes-${date}.pnbk`

      if (Platform.OS === 'ios') {
        const fileUri = (FileSystem.cacheDirectory ?? '') + filename
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        })
        await Share.share({ url: fileUri })
      } else {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync()
        if (permissions.granted) {
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            'application/octet-stream',
          )
          await FileSystem.writeAsStringAsync(uri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          })
        }
      }
      await saveLastBackupDate()
      setLastBackupDate(new Date().toISOString())
    } catch {
    } finally {
      dispatch(resetExport())
    }
  }, [exportBuffer, dispatch])

  const handleCreateBackup = useCallback(() => {
    dispatch(startExportBackup())
  }, [dispatch])

  const handleRestoreData = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      if (!asset.name?.endsWith('.pnbk')) {
        Alert.alert(t('backup.invalidFile'), t('backup.invalidFileDesc'))
        return
      }
      const decodedUri = decodeURI(asset.uri)
      const filePath = decodedUri.startsWith('file://')
        ? decodedUri.replace('file://', '')
        : decodedUri
      dispatch(startImportBackup({ filePath }))
    } catch (e) {
      Alert.alert(t('backup.restoreError'), String(e))
    }
  }, [dispatch, t])

  const handleCancelOrDismiss = useCallback(() => {
    if (exportStatus.step !== 'idle') dispatch(resetExport())
    if (importStatus.step !== 'idle') dispatch(resetImport())
  }, [exportStatus.step, importStatus.step, dispatch])

  const handleRestoreComplete = useCallback(() => {
    dispatch(resetImport())
    dispatch(setNeedsReload(true))
  }, [dispatch])

  const isActive = exportStatus.step !== 'idle' || importStatus.step !== 'idle'

  const dynStyles = useMemo(() => createDynamicStyles(c, insets), [c, insets])

  return (
    <View style={dynStyles.root}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={c.background}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={dynStyles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={dynStyles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={c.primary} />
        </Pressable>
        <Text style={dynStyles.headerTitle}>{t('backup.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dynStyles.scrollContent}
      >
        <Animated.View entering={FadeIn.duration(220)} style={dynStyles.heroContainer}>
          <View style={dynStyles.heroIcon}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={44} color={c.primary} />
          </View>
          <Text style={dynStyles.heroTitle}>{t('backup.hero.title')}</Text>
          <Text style={dynStyles.heroDesc}>{t('backup.hero.description')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(60)}
          style={dynStyles.buttonsContainer}
        >
          <Pressable
            onPress={handleCreateBackup}
            disabled={isActive}
            style={({ pressed }) => [
              dynStyles.primaryBtn,
              pressed && dynStyles.btnPressed,
              isActive && dynStyles.btnDisabled,
            ]}
          >
            <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="#000" />
            <Text style={dynStyles.primaryBtnText}>{t('backup.createBackup')}</Text>
          </Pressable>

          <Pressable
            onPress={handleRestoreData}
            disabled={isActive}
            style={({ pressed }) => [
              dynStyles.secondaryBtn,
              pressed && dynStyles.btnPressed,
              isActive && dynStyles.btnDisabled,
            ]}
          >
            <MaterialCommunityIcons name="restore" size={20} color={c.onSurface} />
            <Text style={dynStyles.secondaryBtnText}>{t('backup.restoreData')}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(240).delay(100)} style={dynStyles.infoCard}>
          <View style={dynStyles.infoIconWrap}>
            <MaterialCommunityIcons name="history" size={22} color={c.primary} />
          </View>
          <View style={dynStyles.infoText}>
            <Text style={dynStyles.infoLabel}>{t('backup.lastBackup')}</Text>
            <Text style={dynStyles.infoValue}>
              {lastBackupDate ? formatBackupDate(lastBackupDate) : t('backup.noBackup')}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(240).delay(130)} style={dynStyles.statsRow}>
          <View style={dynStyles.statCard}>
            <View style={dynStyles.statIconWrap}>
              <MaterialCommunityIcons name="database-outline" size={22} color={c.primary} />
            </View>
            <Text style={dynStyles.statLabel}>{t('backup.notesSize')}</Text>
            <Text style={dynStyles.statValue}>{formatBytes(totalSize)}</Text>
          </View>
          <View style={dynStyles.statCard}>
            <View style={dynStyles.statIconWrap}>
              <MaterialCommunityIcons name="lock-outline" size={22} color={c.primary} />
            </View>
            <Text style={dynStyles.statLabel}>{t('backup.encryption')}</Text>
            <Text style={dynStyles.statValue}>{t('backup.encryptionValue')}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal visible={showProgressModal} transparent animationType="fade" statusBarTranslucent>
        <View style={dynStyles.overlayCenter}>
          <View style={dynStyles.progressCard}>
            <View style={dynStyles.progressModalInner}>
              <View style={dynStyles.progressIconWrap}>
                {!isError && importStatus.step !== 'done' && (
                  <ActivityIndicator
                    size="large"
                    color={c.primary}
                    style={dynStyles.progressSpinner}
                  />
                )}
                <View style={dynStyles.progressIconInner}>
                  {importStatus.step === 'done' ? (
                    <MaterialCommunityIcons name="check" size={24} color={c.primary} />
                  ) : (
                    <MaterialCommunityIcons
                      name="cloud-upload-outline"
                      size={24}
                      color={c.primary}
                    />
                  )}
                </View>
              </View>

              <Text style={dynStyles.progressTitle}>
                {isError
                  ? t('backup.progress.creatingTitle')
                  : importStatus.step === 'done'
                    ? t('backup.restoreComplete')
                    : progressTitle}
              </Text>
              <Text style={dynStyles.progressDesc}>
                {isError
                  ? errorMessage
                  : importStatus.step === 'done'
                    ? t('backup.restoreCompleteDesc')
                    : `${progressStatus.message}${progressStatus.progress > 0 ? `  ${progressStatus.progress}%` : ''}`}
              </Text>

              {!isError && importStatus.step !== 'done' && (
                <View style={dynStyles.progressBarTrack}>
                  <View
                    style={[dynStyles.progressBarFill, { width: `${progressStatus.progress}%` }]}
                  />
                </View>
              )}

              {importStatus.step === 'done' ? (
                <Pressable
                  onPress={handleRestoreComplete}
                  style={({ pressed }) => [
                    dynStyles.cancelBtn,
                    pressed && dynStyles.cancelBtnPressed,
                  ]}
                >
                  <Text style={dynStyles.cancelBtnText}>{t('pairing.overlay.okay')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleCancelOrDismiss}
                  style={({ pressed }) => [
                    dynStyles.cancelBtn,
                    pressed && dynStyles.cancelBtnPressed,
                  ]}
                >
                  <Text style={dynStyles.cancelBtnText}>
                    {isError ? t('backup.progress.dismiss') : t('backup.progress.cancel')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function createDynamicStyles(c: any, insets: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      color: c.onSurface,
      marginLeft: 8,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 40,
      paddingTop: 10,
    },
    heroContainer: {
      alignItems: 'center',
      paddingVertical: 28,
      marginBottom: 8,
    },
    heroIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      color: c.onSurface,
      textAlign: 'center',
      marginBottom: 12,
    },
    heroDesc: {
      fontSize: 14,
      color: c.onSurfaceVariant,
      fontFamily: 'PlusJakartaSans_400Regular',
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 8,
    },
    buttonsContainer: {
      gap: 12,
      marginBottom: 24,
    },
    primaryBtn: {
      height: 54,
      borderRadius: 9999,
      backgroundColor: c.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: '#000',
    },
    secondaryBtn: {
      height: 54,
      borderRadius: 9999,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: c.onSurface,
    },
    btnPressed: { opacity: 0.7 },
    btnDisabled: { opacity: 0.4 },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: 28,
      padding: 16,
      marginBottom: 12,
      gap: 14,
    },
    infoIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: c.onSurface,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 14,
      color: c.onSurfaceVariant,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: 28,
      padding: 16,
      alignItems: 'flex-start',
    },
    statIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: c.onSurface,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 14,
      color: c.onSurfaceVariant,
      fontFamily: 'PlusJakartaSans_400Regular',
    },
    overlayCenter: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    progressCard: {
      width: '100%',
      backgroundColor: c.surfaceContainerHigh ?? c.surface,
      borderRadius: 28,
      overflow: 'hidden',
    },
    progressModalInner: {
      padding: 32,
      alignItems: 'center',
    },
    progressIconWrap: {
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    progressSpinner: {
      position: 'absolute',
      width: 72,
      height: 72,
    },
    progressIconInner: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressTitle: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
      color: c.onSurface,
      textAlign: 'center',
      marginBottom: 8,
    },
    progressDesc: {
      fontSize: 14,
      color: c.onSurfaceVariant,
      fontFamily: 'PlusJakartaSans_400Regular',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    progressBarTrack: {
      width: '100%',
      height: 4,
      borderRadius: 2,
      backgroundColor: hexWithAlpha(c.onSurface, 0.1),
      marginBottom: 24,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    cancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 32,
    },
    cancelBtnPressed: {
      opacity: 0.6,
    },
    cancelBtnText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'PlusJakartaSans_600SemiBold',
      color: c.primary,
    },
  })
}
