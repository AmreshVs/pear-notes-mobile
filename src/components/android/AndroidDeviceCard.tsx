import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Easing, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useDispatch } from 'react-redux'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { DEVICE_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { updateSyncedDevice } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getDeviceDisplayName } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_48,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

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
  const rippleDanger = useMemo(() => androidRipple(c.error), [c.error])

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

  return (
    <MotionView
      entering={FadeInDown.duration(Durations.fade).delay(
        Math.min(index, 6) * Durations.delayShort,
      )}
      layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
    >
      <Pressable
        onPress={!isLocal ? undefined : startEditing}
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
            <Text style={styles.deviceName} numberOfLines={1} ellipsizeMode="tail">
              {displayName}
            </Text>
          )}
          <Text style={styles.devicePlatform} numberOfLines={1}>
            {platformLabel}
            {isLocal && !isEditing && (
              <Text style={styles.deviceTapToRename}>{t('sync.platforms.renameHint')}</Text>
            )}
          </Text>
        </View>

        {!isLocal && (
          <Pressable
            onPress={() => onDelete(device.key)}
            android_ripple={rippleDanger}
            hitSlop={UI_SIZE_12}
            style={styles.deviceDeleteBtn}
          >
            <MaterialCommunityIcons name="delete-outline" size={UI_ICON_SIZE_18} color={c.error} />
          </Pressable>
        )}
      </Pressable>
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
      overflow: 'hidden',
      ...commonStyles.row,
      borderRadius: UI_SIZE_24,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
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
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      marginBottom: 3,
      color: c.onSurface,
    },
    devicePlatform: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
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
    deviceDeleteBtn: {
      padding: UI_SIZE_6,
    },
  })

  return styles
}, useSyncHooks)
