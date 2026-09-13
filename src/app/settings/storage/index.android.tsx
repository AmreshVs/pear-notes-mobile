import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { mediaKind } from '@pear-notes/core/store/slices/storageSlice.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { AndroidBackupBreakdownSection } from '@/components/android/AndroidBackupBreakdownSection'
import { AndroidBackupNotesListSection } from '@/components/android/AndroidBackupNotesListSection'
import { AndroidDownloadsSection } from '@/components/android/AndroidDownloadsSection'
import { AndroidUploadsSection } from '@/components/android/AndroidUploadsSection'
import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_48,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_48,
  UI_SIZE_96,
  UI_SIZE_120,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

import useStorageScreen from './useStorageScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  outlineVariant?: string
  primaryContainer?: string
  onSurfaceVariant?: string
  surfaceContainer?: string
}

export default function AndroidStorageScreen() {
  const { t } = useTranslation()
  const theme = useMD3Theme()
  const c = theme.colors as ExtendedColors
  const styles = useStyles()

  const {
    totalBlobBytes,
    totalOnDiskBytes,
    isReclaiming,
    cacheBytes,
    isClearingCache,
    handleClearCache,
    activeDownloads,
    activeUploads,
    noteTitleByKey,
    notesStorageRows,
    buckets,
    resetSheetVisible,
    handleDeleteMedia,
    handleReclaim,
    handleRetryDownload,
    handlePauseDownload,
    handleResetPress,
    handleResetConfirm,
    handleResetCancel,
  } = useStorageScreen()

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleDanger = useMemo(() => androidRipple(c.error), [c.error])

  const resetActions = useMemo(
    () => [
      {
        icon: 'trash-can-outline',
        label: t('settings.danger.clearStorage'),
        destructive: true,
        onPress: handleResetConfirm,
      },
    ],
    [handleResetConfirm, t],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_12}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('layouts.storage')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="database-outline"
              size={UI_ICON_SIZE_48}
              color={c.primary}
            />
          </View>
          <Text style={styles.heroDesc}>{t('storage.hero.description')}</Text>
        </View>

        <AndroidDownloadsSection
          downloads={activeDownloads}
          noteTitles={noteTitleByKey}
          formatBytes={formatBytes}
          onRetry={handleRetryDownload}
          onPause={handlePauseDownload}
        />

        <AndroidUploadsSection
          uploads={activeUploads}
          noteTitles={noteTitleByKey}
          formatBytes={formatBytes}
        />

        <View>
          <Text style={styles.sectionTitle}>{t('storage.usage')}</Text>
          <View style={styles.usageCard}>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>{t('storage.notesData')}</Text>
              <Text style={styles.usageValue}>{formatBytes(totalBlobBytes)}</Text>
            </View>
            <View style={[styles.usageRow, styles.usageRowBorder]}>
              <Text style={styles.usageLabel}>{t('storage.diskFootprint')}</Text>
              <Text style={styles.usageValue}>{formatBytes(totalOnDiskBytes)}</Text>
            </View>
            <View style={[styles.usageRow, styles.usageRowBorder]}>
              <View style={styles.reclaimLabelWrap}>
                <Text style={styles.usageLabel}>{t('storage.compact')}</Text>
                <Text style={styles.reclaimDesc}>{t('storage.compactDesc')}</Text>
              </View>
              <Pressable
                onPress={handleReclaim}
                disabled={isReclaiming}
                android_ripple={ripple}
                style={[styles.reclaimBtn, isReclaiming && styles.reclaimBtnDisabled]}
              >
                <Text style={styles.reclaimBtnText}>
                  {isReclaiming ? t('storage.compacting') : t('storage.compactNow')}
                </Text>
              </Pressable>
            </View>
            <View style={[styles.usageRow, styles.usageRowBorder]}>
              <View style={styles.reclaimLabelWrap}>
                <Text style={styles.usageLabel}>
                  {t('storage.cache')} · {formatBytes(cacheBytes)}
                </Text>
                <Text style={styles.reclaimDesc}>{t('storage.cacheDesc')}</Text>
              </View>
              <Pressable
                onPress={handleClearCache}
                disabled={isClearingCache}
                android_ripple={ripple}
                style={[styles.reclaimBtn, isClearingCache && styles.reclaimBtnDisabled]}
              >
                <Text style={styles.reclaimBtnText}>
                  {isClearingCache ? t('storage.clearingCache') : t('storage.clearCache')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <AndroidBackupBreakdownSection buckets={buckets} formatBytes={formatBytes} />

        <AndroidBackupNotesListSection
          notesStorageInfo={notesStorageRows}
          formatBytes={formatBytes}
          handleDeleteMedia={handleDeleteMedia}
          mediaKind={mediaKind}
        />

        <View>
          <Text style={styles.sectionTitleDanger}>{t('storage.dangerZone')}</Text>
          <View style={styles.dangerCard}>
            <View style={styles.dangerTextContent}>
              <Text style={styles.dangerCardTitle}>{t('storage.clearAllData')}</Text>
              <Text style={styles.dangerDesc}>{t('storage.clearAllDataDesc')}</Text>
            </View>
            <Pressable
              onPress={handleResetPress}
              android_ripple={rippleDanger}
              style={styles.dangerBtn}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={UI_ICON_SIZE_20}
                color={c.error}
              />
              <Text style={styles.dangerBtnText}>{t('storage.clearStorage')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <BottomActionSheet
        visible={resetSheetVisible}
        onDismiss={handleResetCancel}
        title={t('settings.reset.confirmTitle')}
        subtitle={t('settings.reset.confirmMessage')}
        showHeader
        actions={resetActions}
      />
    </View>
  )
}

const useAndroidStorageHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      ...commonStyles.row,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: UI_SIZE_16,
    },
    iconBtn: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      ...commonStyles.centered,
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      marginLeft: UI_SIZE_8,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    heroContainer: {
      alignItems: 'center',
      paddingBottom: Space.base,
      marginBottom: UI_SIZE_8,
    },
    heroIcon: {
      width: UI_SIZE_96,
      height: UI_SIZE_96,
      borderRadius: UI_SIZE_48,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
      marginBottom: UI_SIZE_24,
    },
    heroDesc: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
      textAlign: 'center',
      lineHeight: UI_SIZE_22,
      paddingHorizontal: UI_SIZE_8,
    },
    sectionTitle: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_8,
      letterSpacing: 0.5,
    },
    sectionTitleDanger: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      marginBottom: UI_SIZE_8,
      marginLeft: UI_SIZE_8,
      marginTop: UI_SIZE_24,
      letterSpacing: 0.5,
    },
    usageCard: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
    },
    usageRow: {
      ...commonStyles.rowBetween,
      padding: Space.base,
    },
    usageRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hexWithAlpha(c.outlineVariant ?? theme.colors.border ?? '#38383a', 0.5),
    },
    usageLabel: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
      fontFamily: FontFamily.regular,
    },
    usageValue: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    reclaimLabelWrap: {
      flex: 1,
      gap: UI_SIZE_4,
    },
    reclaimDesc: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    reclaimBtn: {
      overflow: 'hidden',
      minWidth: UI_SIZE_120,
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    reclaimBtnDisabled: {
      opacity: 0.5,
    },
    reclaimBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
      textAlign: 'center',
    },
    dangerCard: {
      ...commonStyles.centered,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_20,
      gap: UI_SIZE_16,
    },
    dangerTextContent: {
      flex: 1,
    },
    dangerCardTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    dangerDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: FontSize.caption * 1.4,
    },
    dangerBtn: {
      overflow: 'hidden',
      ...commonStyles.row,
      ...commonStyles.centered,
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
      borderRadius: UI_SIZE_12,
      borderColor: c.error,
      backgroundColor: hexWithAlpha(c.error, 0.08),
      width: '100%',
    },
    dangerBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.error,
    },
  })
  return styles
}, useAndroidStorageHooks)
