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
import { Check, CloudUpload, HardDrive, Lock, RotateCcw, X } from 'lucide-react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  View as RNView,
  ScrollView,
  Share,
  StyleSheet,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useDispatch, useSelector } from 'react-redux'

import { Text, Theme, useTheme, useThemedStyles } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  LetterSpacing,
  Radii,
  Space,
  useCommonStyles,
} from '@/constants/commonStyles'

type BackupStatus = {
  step: string
  message: string
  progress: number
  current: number
  total: number
}

const LAST_BACKUP_FILE = (FileSystem.documentDirectory ?? '') + 'lastBackup.json'

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

export default function BackupScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const { colors } = theme
  const styles = useThemedStyles(createStyles)
  const common = useCommonStyles()
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

  return (
    <RNView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [styles.closeBtn, pressed && common.pressed]}
            >
              <X size={16} color={colors.text} strokeWidth={2.5} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(220)} style={styles.heroContainer}>
          <RNView style={styles.heroIcon}>
            <CloudUpload size={44} color={colors.primary} strokeWidth={1.5} />
          </RNView>
          <Text style={styles.heroTitle}>{t('backup.hero.title')}</Text>
          <Text style={styles.heroDesc}>{t('backup.hero.description')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(240).delay(60)}
          style={styles.buttonsContainer}
        >
          <Pressable
            onPress={handleCreateBackup}
            disabled={isActive}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.btnPressed,
              isActive && styles.btnDisabled,
            ]}
          >
            <CloudUpload size={18} color="#000" strokeWidth={2} />
            <Text style={styles.primaryBtnText}>{t('backup.createBackup')}</Text>
          </Pressable>

          <Pressable
            onPress={handleRestoreData}
            disabled={isActive}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.btnPressed,
              isActive && styles.btnDisabled,
            ]}
          >
            <RotateCcw size={18} color={colors.text} strokeWidth={2} />
            <Text style={styles.secondaryBtnText}>{t('backup.restoreData')}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(240).delay(100)}>
          <RNView style={common.card}>
            <RNView style={styles.infoRow}>
              <RNView style={[common.iconBox34, styles.goldIconBox]}>
                <RotateCcw size={16} color={colors.primary} strokeWidth={1.8} />
              </RNView>
              <RNView style={styles.infoText}>
                <Text style={styles.infoLabel}>{t('backup.lastBackup')}</Text>
                <Text style={styles.infoValue}>
                  {lastBackupDate ? formatBackupDate(lastBackupDate) : t('backup.noBackup')}
                </Text>
              </RNView>
            </RNView>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(240).delay(130)} style={styles.statsRow}>
          <RNView style={[common.card, styles.statCard]}>
            <RNView style={[common.iconBox34, styles.goldIconBox]}>
              <HardDrive size={16} color={colors.primary} strokeWidth={1.8} />
            </RNView>
            <Text style={styles.statLabel}>{t('backup.notesSize')}</Text>
            <Text style={styles.statValue}>{formatBytes(totalSize)}</Text>
          </RNView>
          <RNView style={[common.card, styles.statCard]}>
            <RNView style={[common.iconBox34, styles.goldIconBox]}>
              <Lock size={16} color={colors.primary} strokeWidth={1.8} />
            </RNView>
            <Text style={styles.statLabel}>{t('backup.encryption')}</Text>
            <Text style={styles.statValue}>{t('backup.encryptionValue')}</Text>
          </RNView>
        </Animated.View>
      </ScrollView>

      <Modal visible={showProgressModal} transparent animationType="fade" statusBarTranslucent>
        <RNView style={[common.modalOverlay, styles.overlayCenter]}>
          <RNView style={[common.modalCard, styles.progressCard]}>
            <RNView style={common.modalInner}>
              <RNView style={styles.progressIconWrap}>
                {!isError && importStatus.step !== 'done' && (
                  <ActivityIndicator
                    size="large"
                    color={colors.primary}
                    style={styles.progressSpinner}
                  />
                )}
                <RNView style={styles.progressIconInner}>
                  {importStatus.step === 'done' ? (
                    <Check size={24} color={colors.primary} strokeWidth={2.5} />
                  ) : (
                    <CloudUpload size={24} color={colors.primary} strokeWidth={1.5} />
                  )}
                </RNView>
              </RNView>

              <Text style={styles.progressTitle}>
                {isError
                  ? t('backup.progress.creatingTitle')
                  : importStatus.step === 'done'
                    ? t('backup.restoreComplete')
                    : progressTitle}
              </Text>
              <Text style={styles.progressDesc}>
                {isError
                  ? errorMessage
                  : importStatus.step === 'done'
                    ? t('backup.restoreCompleteDesc')
                    : `${progressStatus.message}${progressStatus.progress > 0 ? `  ${progressStatus.progress}%` : ''}`}
              </Text>

              {!isError && importStatus.step !== 'done' && (
                <RNView style={styles.progressBarTrack}>
                  <RNView
                    style={[styles.progressBarFill, { width: `${progressStatus.progress}%` }]}
                  />
                </RNView>
              )}

              {importStatus.step === 'done' ? (
                <Pressable
                  onPress={handleRestoreComplete}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.cancelBtnText}>{t('pairing.overlay.okay')}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleCancelOrDismiss}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.cancelBtnText}>
                    {isError ? t('backup.progress.dismiss') : t('backup.progress.cancel')}
                  </Text>
                </Pressable>
              )}
            </RNView>
          </RNView>
        </RNView>
      </Modal>
    </RNView>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      paddingHorizontal: Space.lg,
      paddingBottom: 60,
      paddingTop: Space.xl,
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroContainer: {
      alignItems: 'center',
      paddingVertical: Space.xl,
      marginBottom: Space.xl,
    },
    heroIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.cardSelected,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Space.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
    },
    heroTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.md,
    },
    heroDesc: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    buttonsContainer: {
      gap: Space.md,
      marginBottom: Space.xl,
    },
    primaryBtn: {
      height: 54,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
    },
    primaryBtnText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: '#000',
    },
    secondaryBtn: {
      height: 54,
      borderRadius: Radii.pill,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
    },
    secondaryBtnText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    btnPressed: { opacity: 0.7 },
    btnDisabled: { opacity: 0.4 },
    goldIconBox: {
      backgroundColor: theme.colors.cardSelected,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Space.base,
      gap: Space.md,
    },
    infoText: {
      flex: 1,
    },
    infoLabel: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    statsRow: {
      flexDirection: 'row',
      gap: Space.md,
      marginTop: Space.md,
    },
    statCard: {
      flex: 1,
      padding: Space.base,
      alignItems: 'flex-start',
    },
    statLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
      marginTop: Space.sm,
      marginBottom: 2,
    },
    statValue: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    overlayCenter: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressCard: {
      borderRadius: Radii.xl,
      backgroundColor: theme.colors.surface,
      marginHorizontal: Space.xl,
    },
    progressIconWrap: {
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Space.xl,
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
      backgroundColor: theme.colors.cardSelected,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.sm,
    },
    progressDesc: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: Space.xl,
    },
    progressBarTrack: {
      width: '100%',
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.borderSecondary,
      marginBottom: Space.xl,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: theme.colors.primary,
    },
    cancelBtn: {
      paddingVertical: Space.md,
      paddingHorizontal: Space.xxl,
    },
    cancelBtnText: {
      fontSize: FontSize.base,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
    sectionCapMargin: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.caps,
      marginBottom: Space.md,
      marginTop: Space.xxxl,
      textTransform: 'uppercase',
      color: theme.colors.textMuted,
    },
  })
