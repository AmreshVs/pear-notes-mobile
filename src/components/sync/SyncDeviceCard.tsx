import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
} from 'react-native'
import Reanimated, { Easing, FadeIn, LinearTransition } from 'react-native-reanimated'
import { useDispatch } from 'react-redux'

import { DEVICE_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import {
  deleteSyncedDevice,
  updateSyncedDevice,
} from '@pear-notes/core/store/slices/syncedDevicesSlice.js'
import { getDeviceDisplayName } from '@pear-notes/core/utils.js'

import { type IconName, SymbolIcon } from '@/components/SymbolIcon'
import { SyncDeleteModal } from '@/components/sync/SyncDeleteModal'
import { SyncIndexerModal } from '@/components/sync/SyncIndexerModal'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_18,
} from '@/constants/commonStyles'
import { DEVICE_ACTION } from '@/constants/deviceActions'
import { useDeviceIndexer } from '@/hooks/useDeviceIndexer'
import { hexWithAlpha } from '@/lib/backupUtils'
import { buildDeviceCardMenu, getDeviceActionFlags } from '@/utils/deviceCardMenu'
import { getPlatformNames } from '@/utils/settingsUtils'

import { ContextMenuView } from '../../../modules/expo-context-menu'

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
  const iconName: IconName = device.deviceType === 'desktop' ? 'desktopcomputer' : 'iphone'

  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')
  const inputRef = useRef<TextInput>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current

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

  const actionFlags = getDeviceActionFlags(device, currentIndexer)
  const menuItems = useMemo(
    () =>
      buildDeviceCardMenu(actionFlags, {
        rename: t('sync.devices.rename'),
        makeIndexer: t('sync.devices.makeIndexer'),
        remove: t('sync.delete.remove'),
      }),
    [actionFlags, t],
  )

  const handleMenuSelect = useCallback(
    (actionId: string) => {
      if (actionId === DEVICE_ACTION.rename) startEditing()
      if (actionId === DEVICE_ACTION.makeIndexer) openConfirm()
      if (actionId === DEVICE_ACTION.remove) openDeleteModal()
    },
    [startEditing, openConfirm, openDeleteModal],
  )

  const platformNames = getPlatformNames(t)
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

  const row = (
    <RNView style={styles.deviceRow}>
      <RNView style={styles.deviceIcon}>
        <SymbolIcon name={iconName} size={UI_ICON_SIZE_18} color={colors.primary} />
        <RNView
          accessible
          accessibilityLabel={t(presenceLabelKey)}
          style={[styles.presenceDot, presenceDotStyle]}
        />
      </RNView>

      <RNView style={styles.deviceContent}>
        {isEditing ? (
          <TextInput
            ref={inputRef}
            value={editedTitle}
            onChangeText={setEditedTitle}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            maxLength={DEVICE_NAME_MAX_LENGTH}
            style={styles.renameInput}
            returnKeyType="done"
            autoCapitalize="words"
            onKeyPress={handleEscapeKey}
          />
        ) : (
          <Pressable onPress={!isOther ? startEditing : undefined}>
            <Text numberOfLines={1} style={styles.deviceName} ellipsizeMode="tail">
              {getDeviceDisplayName(device) || t('sync.platforms.unknown')}
            </Text>
          </Pressable>
        )}
        <Text style={styles.deviceSub} numberOfLines={1}>
          {platformNames[device.platform || ''] || device.platform || '—'}
          {!isOther && !isEditing && (
            <Text style={styles.tapToRename}>{t('sync.platforms.renameHint')}</Text>
          )}
        </Text>
        {device.isIndexer && (
          <RNView style={styles.leaderBadge}>
            <SymbolIcon name="crown" size={UI_ICON_SIZE_16} color={colors.primary} />
            <Text style={styles.leaderBadgeText}>{t('sync.devices.indexerBadge')}</Text>
          </RNView>
        )}
        {!!errorKey && <Text style={styles.leaderError}>{t(errorKey)}</Text>}
      </RNView>

      {isTransferring && (
        <RNView style={styles.transferRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.transferring}>{t(stepKey)}</Text>
        </RNView>
      )}
    </RNView>
  )

  return (
    <>
      <Reanimated.View
        entering={FadeIn.duration(220).delay(Math.min(animationIndex, 8) * 35)}
        layout={LinearTransition.duration(250).easing(Easing.out(Easing.cubic))}
      >
        {menuItems.length > 0 ? (
          <ContextMenuView
            items={menuItems}
            onSelect={handleMenuSelect}
            previewCornerRadius={Radii.card}
          >
            {row}
          </ContextMenuView>
        ) : (
          row
        )}

        {showSep && <RNView style={styles.deviceSep} />}
      </Reanimated.View>

      <SyncIndexerModal
        visible={confirmVisible}
        deviceName={getDeviceDisplayName(device) || t('sync.platforms.unknown')}
        outgoingName={outgoingName}
        isLocalTarget={isLocalTarget}
        onCancel={closeConfirm}
        onConfirm={confirmTransfer}
      />

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
  const cardBg = isDark
    ? hexWithAlpha(theme.colors.white, 0.05)
    : hexWithAlpha(theme.colors.white, 0.9)

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
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.15 : 0.08),
    },
    presenceDot: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 11,
      height: 11,
      borderRadius: 6,
      borderColor: cardBg,
    },
    presenceDotOnline: {
      backgroundColor: theme.colors.success,
    },
    presenceDotOffline: {
      backgroundColor: theme.colors.error,
    },
    presenceDotUnknown: {
      backgroundColor: theme.colors.textMuted,
    },
    deviceName: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.3,
      marginBottom: 3,
      color: theme.colors.text,
    },
    deviceSub: {
      fontSize: FontSize.caption,
      letterSpacing: 0.7,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    tapToRename: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      textTransform: 'none',
      letterSpacing: 0,
      color: theme.colors.textSecondary,
    },
    renameInput: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      borderRadius: Radii.sm,
      paddingHorizontal: Space.md,
      paddingVertical: 6,
      marginBottom: 2,
      color: theme.colors.text,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.inputBackground,
    },
    deviceSep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginHorizontal: Space.base,
    },
    transferRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      maxWidth: 150,
    },
    transferring: {
      flex: 1,
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    leaderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      alignSelf: 'flex-start',
      marginTop: 6,
      paddingHorizontal: Space.sm,
      paddingVertical: 2,
      borderRadius: Radii.sm,
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.22 : 0.12),
    },
    leaderBadgeText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      letterSpacing: 0.4,
      color: theme.colors.primary,
    },
    leaderError: {
      fontSize: FontSize.caption,
      marginTop: 4,
      color: theme.colors.error,
    },
  })
  return styles
})
