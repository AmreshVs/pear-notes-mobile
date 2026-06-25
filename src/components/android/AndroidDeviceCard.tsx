import { updateSyncedDevice } from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { memo, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useDispatch } from 'react-redux'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  Durations,
  FontFamily,
  FontWeight,
  commonStyles,
  UI_SIZE_2,
  UI_SIZE_3,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_48,
  UI_SIZE_9999,
  UI_FONT_SIZE_11,
  UI_FONT_SIZE_15,
} from '@/constants/commonStyles'

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

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
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
  const styles = useStyles() as any

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
  const displayName =
    device.title || (device.key ? `${device.key.slice(0, 6)}…${device.key.slice(-5)}` : 'Unknown')
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
    <Animated.View
      entering={FadeInDown.duration(Durations.fade).delay(
        Math.min(index, 6) * Durations.delayShort,
      )}
      layout={LinearTransition.springify().damping(20).stiffness(220)}
    >
      <Pressable
        onPress={!isLocal ? undefined : startEditing}
        style={({ pressed }) => [
          styles.deviceCard,
          { backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant },
          pressed && {
            backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
          },
        ]}
      >
        <View style={styles.deviceIconCircle}>
          <MaterialCommunityIcons name={iconName} size={UI_SIZE_20} color={c.primary} />
          {device.isLocal && <View style={styles.deviceOnlineDot} />}
        </View>

        <View style={styles.deviceInfo}>
          {isEditing ? (
            <TextInput
              ref={inputRef}
              value={editedTitle}
              onChangeText={setEditedTitle}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              style={[
                styles.deviceRenameInput,
                {
                  color: c.onSurface,
                  borderColor: c.primary,
                  backgroundColor: hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.5),
                },
              ]}
              returnKeyType="done"
              autoCapitalize="words"
              onKeyPress={handleKeyPress}
            />
          ) : (
            <Text style={styles.deviceName} numberOfLines={1}>
              {displayName}
            </Text>
          )}
          <Text style={styles.devicePlatform}>
            {platformLabel}
            {isLocal && !isEditing && (
              <Text style={styles.deviceTapToRename}>{t('sync.platforms.renameHint')}</Text>
            )}
          </Text>
        </View>

        {!isLocal && (
          <Pressable
            onPress={() => onDelete(device.key)}
            hitSlop={UI_SIZE_12}
            style={styles.deviceDeleteBtn}
          >
            <MaterialCommunityIcons name="delete-outline" size={UI_SIZE_18} color={c.error} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
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
      borderRadius: UI_SIZE_24,
      paddingHorizontal: UI_SIZE_20,
      paddingVertical: UI_SIZE_18,
      marginBottom: UI_SIZE_10,
      gap: UI_SIZE_16,
    },
    deviceIconCircle: {
      width: UI_SIZE_48,
      height: UI_SIZE_48,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      position: 'relative',
      backgroundColor: hexWithAlpha(c.primary, 0.12),
    },
    deviceOnlineDot: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: UI_SIZE_12,
      height: UI_SIZE_12,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.success,
      borderWidth: 2,
      borderColor: theme.colors.background,
    },
    deviceInfo: {
      ...commonStyles.flex1,
      minWidth: 0,
    },
    deviceName: {
      fontSize: UI_FONT_SIZE_15,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      letterSpacing: -0.3,
      marginBottom: UI_SIZE_3,
      color: c.onSurface,
    },
    devicePlatform: {
      fontSize: UI_FONT_SIZE_11,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: c.onSurfaceVariant,
    },
    deviceTapToRename: {
      fontSize: UI_FONT_SIZE_11,
      fontWeight: FontWeight.medium,
      textTransform: 'none',
      letterSpacing: 0,
      color: c.onSurfaceVariant,
    },
    deviceRenameInput: {
      fontSize: UI_FONT_SIZE_15,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      borderWidth: 1,
      borderRadius: UI_SIZE_10,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_6,
      marginBottom: UI_SIZE_2,
    },
    deviceDeleteBtn: {
      padding: UI_SIZE_6,
    },
  })

  return styles
}, useSyncHooks)
