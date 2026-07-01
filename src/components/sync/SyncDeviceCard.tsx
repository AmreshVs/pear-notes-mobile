import {
  deleteSyncedDevice,
  updateSyncedDevice,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { Monitor, Smartphone, Trash2 } from 'lucide-react-native'
import { memo, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Pressable, StyleSheet, TextInput, View as RNView } from 'react-native'
import Reanimated, { Easing, FadeIn, LinearTransition } from 'react-native-reanimated'
import { useDispatch } from 'react-redux'

import { SyncDeleteModal } from '@/components/sync/SyncDeleteModal'
import { Text, createThemedStylesheet, useTheme } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_17,
  UI_ICON_SIZE_18,
  commonStyles,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getPlatformNames } from '@/utils/settingsUtils'

type Props = {
  device: any
  isOther?: boolean
  showSep: boolean
  animationIndex?: number
}

export const SyncDeviceCard = memo(function SyncDeviceCard({
  device,
  isOther,
  showSep,
  animationIndex = 0,
}: Props) {
  const theme = useTheme()
  const { colors } = theme
  const styles = useStyles()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const Icon = device.deviceType === 'desktop' ? Monitor : Smartphone

  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')
  const inputRef = useRef<TextInput>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current

  const openDeleteModal = useCallback(() => {
    setShowDeleteModal(true)
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start()
  }, [fadeAnim])

  const closeDeleteModal = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
      setShowDeleteModal(false),
    )
  }, [fadeAnim])

  const confirmDelete = useCallback(() => {
    dispatch(deleteSyncedDevice({ key: device.key } as any))
    setShowDeleteModal(false)
  }, [dispatch, device.key])

  const startEditing = useCallback(() => {
    if (isOther) return
    setEditedTitle(device.title || '')
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOther, device.title])

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

  const handleEscapeKey = useCallback(
    ({ nativeEvent }: { nativeEvent: { key: string } }) => {
      if (nativeEvent.key === 'Escape') cancelEdit()
    },
    [cancelEdit],
  )

  const platformNames = getPlatformNames(t)

  return (
    <>
      <Reanimated.View
        entering={FadeIn.duration(220).delay(Math.min(animationIndex, 8) * 35)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
      >
        <RNView style={styles.deviceRow}>
          <RNView style={styles.deviceIcon}>
            <Icon size={UI_ICON_SIZE_18} color={colors.primary} strokeWidth={1.5} />
            {device.isLocal && <RNView style={styles.onlineDot} />}
          </RNView>

          <RNView style={styles.deviceContent}>
            {isEditing ? (
              <TextInput
                ref={inputRef}
                value={editedTitle}
                onChangeText={setEditedTitle}
                onBlur={commitEdit}
                onSubmitEditing={commitEdit}
                style={styles.renameInput}
                returnKeyType="done"
                autoCapitalize="words"
                onKeyPress={handleEscapeKey}
              />
            ) : (
              <Pressable onPress={!isOther ? startEditing : undefined}>
                <Text numberOfLines={1} style={styles.deviceName}>
                  {device.title || device.key || t('sync.platforms.unknown')}
                </Text>
              </Pressable>
            )}
            <Text style={styles.deviceSub}>
              {platformNames[device.platform || ''] || device.platform || '—'}
              {!isOther && !isEditing && (
                <Text style={styles.tapToRename}>{t('sync.platforms.renameHint')}</Text>
              )}
            </Text>
          </RNView>

          {isOther && (
            <Pressable
              onPress={openDeleteModal}
              hitSlop={12}
              style={({ pressed }) => [styles.deleteBtn, pressed && commonStyles.pressed]}
            >
              <Trash2 size={UI_ICON_SIZE_17} color={colors.error} strokeWidth={1.5} />
            </Pressable>
          )}
        </RNView>

        {showSep && <RNView style={styles.deviceSep} />}
      </Reanimated.View>

      <SyncDeleteModal
        visible={showDeleteModal}
        fadeAnim={fadeAnim}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const isDark = theme.isDark
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)'
  const cardBorder = theme.colors.borderSecondary

  const styles = StyleSheet.create({
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    deviceContent: {
      flex: 1,
    },
    deviceIcon: {
      width: Space.huge,
      height: Space.huge,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.1 : 0.08),
    },
    onlineDot: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.colors.success,
      borderWidth: 2,
      borderColor: cardBg,
    },
    deviceName: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      letterSpacing: -0.3,
      marginBottom: 3,
      color: theme.colors.text,
    },
    deviceSub: {
      fontSize: FontSize.caption,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    tapToRename: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      textTransform: 'none',
      letterSpacing: 0,
      color: hexWithAlpha(theme.colors.primary, 0.56),
    },
    renameInput: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      borderWidth: 1,
      borderRadius: Radii.sm,
      paddingHorizontal: Space.md,
      paddingVertical: 6,
      marginBottom: 2,
      color: theme.colors.text,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.inputBackground,
    },
    deviceSep: {
      height: 1,
      backgroundColor: cardBorder,
      marginLeft: 70,
    },
    deleteBtn: {
      padding: Space.xs,
    },
  })
  return styles
})
