import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router } from 'expo-router'

import { MAX_VAULTS } from '@pear-notes/core/constant.js'

import { BottomActionSheet, type SheetAction } from '@/components/android/BottomActionSheet'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { VaultNameDialog } from '@/components/android/VaultNameDialog'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_56,
  UI_SIZE_64,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useVaultsScreen } from '@/hooks/useVaultsScreen'
import { JOIN_VAULT_ROUTE, VAULTS_SETTINGS_ROUTE } from '@/hooks/useVaultSwitcher'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticSelection } from '@/lib/haptics'
import { getVaultInitial, getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'

type Props = {
  visible: boolean
  onClose: () => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow?: string
  outlineVariant?: string
  onSecondaryContainer: string
  onTertiaryContainer?: string
  tertiaryContainer?: string
  onPrimaryContainer: string
}

type AvatarTone = { background: string; foreground: string }

const DRAWER_MAX_WIDTH = 360
const DRAWER_WIDTH_RATIO = 0.84
const OPEN_MS = 320
const CLOSE_MS = 220
const CLOSE_DISTANCE_RATIO = 0.3
const CLOSE_VELOCITY = 600
const EMPHASIZED_DECELERATE = Easing.bezier(0.05, 0.7, 0.1, 1)
const EMPHASIZED_ACCELERATE = Easing.bezier(0.3, 0, 0.8, 0.15)

export function VaultDrawer({ visible, onClose }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const { width: screenWidth } = useWindowDimensions()
  const drawerWidth = Math.min(DRAWER_MAX_WIDTH, screenWidth * DRAWER_WIDTH_RATIO)

  const screen = useVaultsScreen()
  const { vaults, canAdd, canRemove, busy, actionVault, removingVault, nameDialog } = screen
  const { setActionVault, setRemovingVault, setNameDialog } = screen
  const { openVault, submitName, confirmRemove } = screen

  const [isPresented, setIsPresented] = useState(visible)
  const offset = useSharedValue(-drawerWidth)

  const tones = useMemo<AvatarTone[]>(
    () => [
      { background: c.primaryContainer, foreground: c.onPrimaryContainer },
      {
        background: c.tertiaryContainer ?? c.secondaryContainer,
        foreground: c.onTertiaryContainer ?? c.onSecondaryContainer,
      },
      { background: c.secondaryContainer, foreground: c.onSecondaryContainer },
    ],
    [c],
  )

  const animateTo = useCallback(
    (open: boolean, after?: () => void) => {
      offset.value = withTiming(
        open ? 0 : -drawerWidth,
        {
          duration: open ? OPEN_MS : CLOSE_MS,
          easing: open ? EMPHASIZED_DECELERATE : EMPHASIZED_ACCELERATE,
        },
        (finished) => {
          if (finished && !open) {
            runOnJS(setIsPresented)(false)
            if (after) runOnJS(after)()
          }
        },
      )
    },
    [drawerWidth, offset],
  )

  useEffect(() => {
    if (visible) {
      offset.value = -drawerWidth
      setIsPresented(true)
      return
    }
    animateTo(false)
  }, [animateTo, drawerWidth, offset, visible])

  const handleShow = useCallback(() => animateTo(true), [animateTo])
  const closeThen = useCallback(
    (after?: () => void) => {
      animateTo(false, () => {
        onClose()
        after?.()
      })
    },
    [animateTo, onClose],
  )
  const handleDismiss = useCallback(() => closeThen(), [closeThen])

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .onUpdate((event) => {
          offset.value = Math.min(0, event.translationX)
        })
        .onEnd((event) => {
          const shouldClose =
            event.translationX < -drawerWidth * CLOSE_DISTANCE_RATIO ||
            event.velocityX < -CLOSE_VELOCITY
          if (shouldClose) runOnJS(handleDismiss)()
          else offset.value = withTiming(0, { duration: CLOSE_MS, easing: EMPHASIZED_DECELERATE })
        }),
    [drawerWidth, handleDismiss, offset],
  )

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }))
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 1 + offset.value / drawerWidth }))
  const drawerSize = useMemo(() => ({ width: drawerWidth }), [drawerWidth])

  const handleOpenVault = useCallback(
    (vault: Vault) => {
      if (vault.current) {
        handleDismiss()
        return
      }
      hapticSelection()
      closeThen(() => openVault(vault))
    },
    [closeThen, handleDismiss, openVault],
  )

  const handleVaultOptions = useCallback(
    (vault: Vault) => {
      hapticSelection()
      setActionVault(vault)
    },
    [setActionVault],
  )

  const handleNewVault = useCallback(
    () => closeThen(() => setNameDialog({ mode: 'create' })),
    [closeThen, setNameDialog],
  )
  const handleJoin = useCallback(
    () => closeThen(() => router.push(JOIN_VAULT_ROUTE as never)),
    [closeThen],
  )
  const handleManage = useCallback(
    () => closeThen(() => router.push(VAULTS_SETTINGS_ROUTE as never)),
    [closeThen],
  )

  const optionActions = useMemo<SheetAction[]>(() => {
    if (!actionVault) return []
    const run = (task: () => void) => () => {
      setActionVault(null)
      task()
    }
    return [
      ...(actionVault.current
        ? []
        : [
            {
              icon: 'folder-open-outline',
              label: t('vaults.openBtn'),
              onPress: run(() => handleOpenVault(actionVault)),
            },
          ]),
      {
        icon: 'pencil-outline',
        label: t('vaults.rename'),
        onPress: run(() => setNameDialog({ mode: 'rename', vault: actionVault })),
      },
      ...(canRemove
        ? [
            {
              icon: 'delete-outline',
              label: t('vaults.remove'),
              destructive: true,
              onPress: run(() => closeThen(() => setRemovingVault(actionVault))),
            },
          ]
        : []),
    ]
  }, [
    actionVault,
    canRemove,
    closeThen,
    handleOpenVault,
    setActionVault,
    setNameDialog,
    setRemovingVault,
    t,
  ])

  const removeActions = useMemo<SheetAction[]>(
    () =>
      removingVault
        ? [
            {
              icon: 'delete-outline',
              label: t('vaults.removeConfirm'),
              destructive: true,
              onPress: () => confirmRemove(removingVault),
            },
          ]
        : [],
    [confirmRemove, removingVault, t],
  )

  const closeOptions = useCallback(() => setActionVault(null), [setActionVault])
  const closeRemove = useCallback(() => setRemovingVault(null), [setRemovingVault])
  const closeNameDialog = useCallback(() => setNameDialog(null), [setNameDialog])

  const renderVault = useCallback(
    (vault: Vault, index: number) => (
      <VaultItem
        key={vault.id}
        vault={vault}
        label={getVaultLabel(vault, t)}
        tone={tones[index % tones.length]}
        disabled={busy}
        onOpen={handleOpenVault}
        onOptions={handleVaultOptions}
      />
    ),
    [busy, handleOpenVault, handleVaultOptions, t, tones],
  )

  const currentVault = vaults.find((vault) => vault.current)
  const removingName = removingVault ? getVaultLabel(removingVault, t) : ''
  const isCreateDialog = nameDialog?.mode === 'create'

  return (
    <>
      {isPresented && (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          navigationBarTranslucent
          onShow={handleShow}
          onRequestClose={handleDismiss}
        >
          <GestureHandlerRootView style={commonStyles.flex1}>
            <Animated.View style={[styles.scrim, scrimStyle]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={handleDismiss}
                accessibilityLabel={t('common.close')}
              />
            </Animated.View>
            <GestureDetector gesture={pan}>
              <Animated.View style={[styles.drawer, drawerSize, drawerStyle]}>
                <ScrollView
                  contentContainerStyle={styles.content}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.header}>
                    <Text style={styles.overline}>{t('vaults.drawer.overline')}</Text>
                    <Text style={styles.headline} numberOfLines={1}>
                      {currentVault ? getVaultLabel(currentVault, t) : t('vaults.title')}
                    </Text>
                    <Text style={styles.caption}>
                      {t('vaults.drawer.count', { count: vaults.length, max: MAX_VAULTS })}
                    </Text>
                  </View>

                  <Text style={styles.sectionLabel}>{t('vaults.title')}</Text>
                  <View style={styles.list}>{vaults.map(renderVault)}</View>

                  <View style={styles.divider} />

                  {canAdd && (
                    <>
                      <DrawerAction
                        icon="plus"
                        label={t('vaults.newVault')}
                        onPress={handleNewVault}
                      />
                      <DrawerAction
                        icon="qrcode-scan"
                        label={t('vaults.join.sectionTitle')}
                        onPress={handleJoin}
                      />
                    </>
                  )}
                  <DrawerAction
                    icon="cog-outline"
                    label={t('vaults.manage')}
                    onPress={handleManage}
                  />

                  <View style={styles.footer}>
                    <MaterialCommunityIcons
                      name="sync"
                      size={UI_ICON_SIZE_20}
                      color={c.onSurfaceVariant}
                    />
                    <Text style={styles.footerText}>{t('vaults.drawer.syncNote')}</Text>
                  </View>
                </ScrollView>
              </Animated.View>
            </GestureDetector>
          </GestureHandlerRootView>
        </Modal>
      )}

      <BottomActionSheet
        visible={!!actionVault}
        onDismiss={closeOptions}
        title={actionVault ? getVaultLabel(actionVault, t) : ''}
        subtitle={t('vaults.drawer.optionsSubtitle')}
        actions={optionActions}
      />
      <BottomActionSheet
        visible={!!removingVault}
        onDismiss={closeRemove}
        title={t('vaults.removeTitle', { name: removingName })}
        subtitle={t('vaults.removeDescription', { name: removingName })}
        showHeader
        actions={removeActions}
      />
      <VaultNameDialog
        visible={!!nameDialog}
        title={isCreateDialog ? t('vaults.newVault') : t('vaults.rename')}
        confirmLabel={isCreateDialog ? t('vaults.create') : t('vaults.rename')}
        initialName={nameDialog?.mode === 'rename' ? nameDialog.vault.name : ''}
        onCancel={closeNameDialog}
        onConfirm={submitName}
      />
    </>
  )
}

type VaultItemProps = {
  vault: Vault
  label: string
  tone: AvatarTone
  disabled: boolean
  onOpen: (vault: Vault) => void
  onOptions: (vault: Vault) => void
}

const VaultItem = memo(function VaultItem({
  vault,
  label,
  tone,
  disabled,
  onOpen,
  onOptions,
}: VaultItemProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const avatarStyle = useMemo(
    () => [styles.avatar, { backgroundColor: tone.background }],
    [styles.avatar, tone.background],
  )
  const avatarTextStyle = useMemo(
    () => [styles.avatarText, { color: tone.foreground }],
    [styles.avatarText, tone.foreground],
  )
  const handlePress = useCallback(() => onOpen(vault), [onOpen, vault])
  const handleLongPress = useCallback(() => onOptions(vault), [onOptions, vault])

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={disabled}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityState={{ selected: vault.current, disabled }}
      accessibilityLabel={label}
      accessibilityHint={t('vaults.longPressHint')}
      style={vault.current ? styles.itemActive : styles.item}
    >
      <View style={avatarStyle}>
        <Text style={avatarTextStyle}>{getVaultInitial(label)}</Text>
      </View>
      <View style={commonStyles.flex1}>
        <Text style={vault.current ? styles.itemLabelActive : styles.itemLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.itemSub} numberOfLines={1}>
          {vault.current ? t('vaults.open') : t('vaults.notOpen')}
        </Text>
      </View>
      {vault.current && (
        <MaterialCommunityIcons
          name="check-circle"
          size={UI_ICON_SIZE_24}
          color={c.onSecondaryContainer}
        />
      )}
    </Pressable>
  )
})

type DrawerActionProps = { icon: string; label: string; onPress: () => void }

const DrawerAction = memo(function DrawerAction({ icon, label, onPress }: DrawerActionProps) {
  const styles = useStyles()
  const md3 = useMD3Theme()
  const ripple = useMemo(() => androidRipple(md3.colors.onSurface), [md3.colors.onSurface])

  return (
    <Pressable
      onPress={onPress}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.action}
    >
      <MaterialCommunityIcons
        name={icon as never}
        size={UI_ICON_SIZE_24}
        color={md3.colors.onSurfaceVariant}
      />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  )
})

const useDrawerHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const itemBase = {
    ...commonStyles.row,
    gap: UI_SIZE_12,
    minHeight: UI_SIZE_64,
    paddingLeft: UI_SIZE_12,
    paddingRight: UI_SIZE_16,
    borderRadius: UI_SIZE_9999,
    overflow: 'hidden' as const,
  }
  const labelBase = {
    fontSize: FontSize.subtitle,
    fontFamily: FontFamily.semiBold,
  }
  const styles = StyleSheet.create({
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    drawer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: c.surfaceContainerLow ?? c.surface,
      borderTopRightRadius: UI_SIZE_16,
      borderBottomRightRadius: UI_SIZE_16,
      elevation: 1,
    },
    content: {
      paddingTop: insets.top + UI_SIZE_12,
      paddingBottom: insets.bottom + UI_SIZE_24,
      paddingHorizontal: UI_SIZE_12,
    },
    header: {
      marginHorizontal: UI_SIZE_4,
      marginBottom: UI_SIZE_16,
      padding: UI_SIZE_20,
      borderRadius: UI_SIZE_28,
      gap: UI_SIZE_4,
      backgroundColor: hexWithAlpha(c.primary, 0.12),
    },
    overline: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.primary,
    },
    headline: {
      fontSize: FontSize.heading,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    caption: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    sectionLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
    },
    list: {
      gap: UI_SIZE_4,
    },
    item: {
      ...itemBase,
    },
    itemActive: {
      ...itemBase,
      backgroundColor: c.secondaryContainer,
    },
    avatar: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
    },
    avatarText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.bold,
    },
    itemLabel: {
      ...labelBase,
      color: c.onSurface,
    },
    itemLabelActive: {
      ...labelBase,
      color: c.onSecondaryContainer,
    },
    itemSub: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: UI_SIZE_12,
      marginHorizontal: UI_SIZE_16,
      backgroundColor: c.outlineVariant ?? hexWithAlpha(c.onSurface, 0.12),
    },
    action: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      minHeight: UI_SIZE_56,
      paddingHorizontal: UI_SIZE_16,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    actionLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSurfaceVariant,
    },
    footer: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_24,
      paddingHorizontal: UI_SIZE_16,
    },
    footerText: {
      ...commonStyles.flex1,
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useDrawerHooks)
