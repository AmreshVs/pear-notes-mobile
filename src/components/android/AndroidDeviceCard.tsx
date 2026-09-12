import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Easing, FadeIn, LinearTransition } from 'react-native-reanimated'
import { useDispatch } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { DEVICE_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { updateSyncedDevice } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getDeviceDisplayName } from '@pear-notes/core/utils.js'

import { AndroidIndexerDialog } from '@/components/android/AndroidIndexerDialog'
import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  ListMotion,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_48,
  UI_SIZE_150,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useDeviceIndexer } from '@/hooks/useDeviceIndexer'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getDeviceActionFlags } from '@/utils/deviceCardMenu'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onBackground: string
}

type DeviceCardProps = {
  device: any
  isLocal?: boolean
  colors: {
    surfaceContainerHigh: string
    surfaceContainerHighest: string
    surfaceVariant: string
    primary: string
    onSurface: string
    onSurfaceVariant: string
    error: string
  }
  index: number
  onDelete: (key: string) => void
}

export const AndroidDeviceCard = memo(function AndroidDeviceCard({
  device,
  isLocal,
  colors: c,
  index,
  onDelete,
}: DeviceCardProps) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const platformKey =
    device.platform === 'darwin'
      ? 'macOS'
      : device.platform === 'win32'
        ? 'Windows'
        : device.platform === 'linux'
          ? 'Linux'
          : device.platform === 'android'
            ? 'Android'
            : device.platform === 'ios'
              ? 'iOS'
              : 'unknown'

  const platformLabel = t(`sync.platforms.${platformKey}`)

  const iconName =
    device.deviceType === 'mobile' || device.platform === 'android' || device.platform === 'ios'
      ? 'cellphone'
      : 'monitor'
  const displayName = getDeviceDisplayName(device)
  const presenceLabelKey = !device.presenceKnown
    ? 'sync.devices.presenceUnknown'
    : device.isOnline
      ? 'sync.devices.online'
      : 'sync.devices.offline'

  const presenceDotStyle = !device.presenceKnown
    ? styles.presenceDotUnknown
    : device.isOnline
      ? styles.presenceDotOnline
      : styles.presenceDotOffline
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')
  const inputRef = useRef<TextInput>(null)

  const {
    currentIndexer,
    isTransferring,
    stepKey,
    errorKey,
    isLocalTarget,
    outgoingName,
    confirmVisible,
    openConfirm,
    closeConfirm,
    confirmTransfer,
  } = useDeviceIndexer(device)

  const startEditing = useCallback(() => {
    if (!isLocal) return
    setEditedTitle(device.title || '')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isLocal, device.title])

  const commitEdit = useCallback(() => {
    const trimmed = editedTitle.trim()
    if (trimmed && trimmed !== device.title) {
      dispatch(updateSyncedDevice({ key: device.key, title: trimmed } as any))
    }
    setIsEditing(false)
  }, [dispatch, editedTitle, device.title, device.key])

  const cancelEdit = useCallback(() => {
    setEditedTitle(device.title || '')
    setIsEditing(false)
  }, [device.title])

  const handleKeyPress = useCallback(
    ({ nativeEvent }: { nativeEvent: { key: string } }) => {
      if (nativeEvent.key === 'Escape') cancelEdit()
    },
    [cancelEdit],
  )

  const [actionSheetVisible, setActionSheetVisible] = useState(false)
  const actionFlags = getDeviceActionFlags(device, currentIndexer)

  const openActionSheet = useCallback(() => setActionSheetVisible(true), [])
  const closeActionSheet = useCallback(() => setActionSheetVisible(false), [])

  const handleSheetRename = useCallback(() => {
    setActionSheetVisible(false)
    startEditing()
  }, [startEditing])

  const handleSheetMakeIndexer = useCallback(() => {
    setActionSheetVisible(false)
    openConfirm()
  }, [openConfirm])

  const handleSheetRemove = useCallback(() => {
    setActionSheetVisible(false)
    onDelete(device.key)
  }, [onDelete, device.key])

  const sheetActions = useMemo<SheetAction[]>(() => {
    const actions: SheetAction[] = []
    if (actionFlags.canRename) {
      actions.push({
        icon: 'pencil-outline',
        label: t('sync.devices.rename'),
        onPress: handleSheetRename,
      })
    }
    if (actionFlags.canMakeIndexer) {
      actions.push({
        icon: 'crown-outline',
        label: t('sync.devices.makeIndexer'),
        onPress: handleSheetMakeIndexer,
      })
    }
    if (actionFlags.canRemove) {
      actions.push({
        icon: 'delete-outline',
        label: t('sync.delete.remove'),
        onPress: handleSheetRemove,
        destructive: true,
      })
    }
    return actions
  }, [actionFlags, handleSheetRename, handleSheetMakeIndexer, handleSheetRemove, t])

  const entering = useMemo(
    () =>
      index <= ListMotion.enterMaxIndex
        ? FadeIn.duration(ListMotion.enterDuration).delay(index * ListMotion.enterStagger)
        : undefined,
    [index],
  )

  return (
    <MotionView
      entering={entering}
      layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
    >
      <Pressable
        onPress={isLocal ? startEditing : undefined}
        onLongPress={actionFlags.hasAny ? openActionSheet : undefined}
        android_ripple={ripple}
        style={styles.deviceCard}
      >
        <View style={styles.deviceIconCircle}>
          <MaterialCommunityIcons name={iconName} size={UI_ICON_SIZE_20} color={c.primary} />
          <View
            accessible
            accessibilityLabel={t(presenceLabelKey)}
            style={[styles.presenceDot, presenceDotStyle]}
          />
        </View>

        <View style={styles.deviceInfo}>
          {isEditing ? (
            <TextInput
              ref={inputRef}
              value={editedTitle}
              onChangeText={setEditedTitle}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              maxLength={DEVICE_NAME_MAX_LENGTH}
              style={styles.deviceRenameInput}
              returnKeyType="done"
              autoCapitalize="words"
              onKeyPress={handleKeyPress}
            />
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.deviceName} numberOfLines={1} ellipsizeMode="tail">
                {displayName}
              </Text>
              {device.isIndexer && (
                <View style={styles.leaderBadge}>
                  <MaterialCommunityIcons
                    name="crown-outline"
                    size={UI_ICON_SIZE_16}
                    color={c.onSurface}
                  />
                  <Text style={styles.leaderBadgeText} numberOfLines={1}>
                    {t('sync.devices.indexerBadge')}
                  </Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.devicePlatform} numberOfLines={1}>
            {platformLabel}
          </Text>
          {!!errorKey && <Text style={styles.leaderError}>{t(errorKey)}</Text>}
        </View>

        {isTransferring && (
          <View style={styles.transferRow}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={styles.transferring}>{t(stepKey)}</Text>
          </View>
        )}
      </Pressable>

      <BottomActionSheet
        visible={actionSheetVisible}
        onDismiss={closeActionSheet}
        title={displayName}
        subtitle={platformLabel}
        actions={sheetActions}
      />

      <AndroidIndexerDialog
        visible={confirmVisible}
        deviceName={displayName}
        outgoingName={outgoingName}
        isLocalTarget={isLocalTarget}
        onCancel={closeConfirm}
        onConfirm={confirmTransfer}
      />
    </MotionView>
  )
})

const useSyncHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    deviceCard: {
      ...commonStyles.row,
      overflow: 'hidden',
      borderRadius: UI_SIZE_24,
      padding: UI_SIZE_16,
      gap: UI_SIZE_16,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    deviceCardPressed: {
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
    },
    deviceIconCircle: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      position: 'relative',
      backgroundColor: hexWithAlpha(c.primary, 0.12),
    },
    presenceDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: UI_SIZE_12,
      height: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      borderColor: theme.colors.background,
    },
    presenceDotOnline: {
      backgroundColor: theme.colors.success,
    },
    presenceDotOffline: {
      backgroundColor: c.error,
    },
    presenceDotUnknown: {
      backgroundColor: c.onSurfaceVariant,
    },
    deviceInfo: {
      ...commonStyles.flex1,
      minWidth: 0,
    },
    deviceName: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    nameRow: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
    },
    devicePlatform: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      letterSpacing: 0.5,
      color: c.onSurfaceVariant,
    },
    deviceTapToRename: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      textTransform: 'none',
      letterSpacing: 0,
      color: c.onSurfaceVariant,
    },
    deviceRenameInput: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      borderRadius: UI_SIZE_10,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_6,
      marginBottom: UI_SIZE_2,
      color: c.onSurface,
      borderColor: c.primary,
      backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.5),
    },
    transferRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_6,
      maxWidth: UI_SIZE_150,
    },
    transferring: {
      flex: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    leaderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_4,
      flexShrink: 0,
      paddingHorizontal: UI_SIZE_10,
      paddingVertical: UI_SIZE_2,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.35),
    },
    leaderBadgeText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    leaderError: {
      fontSize: FontSize.caption,
      marginTop: UI_SIZE_2,
      color: c.error,
    },
  })

  return styles
}, useSyncHooks)
