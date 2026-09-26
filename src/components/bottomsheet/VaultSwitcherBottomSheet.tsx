import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassView } from '@/components/GlassView'
import type { IconName } from '@/components/SymbolIcon'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  GlassIntensity,
  Layout,
  Radii,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_32,
  UI_SIZE_36,
  UI_SIZE_40,
  UI_SIZE_52,
  UI_SIZE_56,
} from '@/constants/commonStyles'
import { getVaultInitial, getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'

export type VaultSheetAction = 'create' | 'join' | 'manage'

type Props = {
  visible: boolean
  vaults: Vault[]
  canAdd: boolean
  onSelectVault: (vault: Vault) => void
  onAction: (action: VaultSheetAction) => void
  onClose: () => void
}

type ActionRow = { action: VaultSheetAction; icon: IconName; labelKey: string }

const SHEET_TRAVEL = 480

const ADD_ROWS: ActionRow[] = [
  { action: 'create', icon: 'plus', labelKey: 'vaults.newVault' },
  { action: 'join', icon: 'qrcode.viewfinder', labelKey: 'vaults.join.sectionTitle' },
]
const MANAGE_ROW: ActionRow = { action: 'manage', icon: 'gearshape', labelKey: 'vaults.manage' }

export function VaultSwitcherBottomSheet({
  visible,
  vaults,
  canAdd,
  onSelectVault,
  onAction,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useStyles()

  const [isPresented, setIsPresented] = useState(visible)
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: sheetProgress.value }))
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - sheetProgress.value) * SHEET_TRAVEL }],
  }))

  const handleSheetShow = useCallback(() => {
    sheetProgress.value = withTiming(1, {
      duration: Durations.sheetOpen,
      easing: Easing.out(Easing.cubic),
    })
  }, [sheetProgress])

  useEffect(() => {
    if (visible) {
      sheetProgress.value = 0
      setIsPresented(true)
      return
    }
    sheetProgress.value = withTiming(
      0,
      { duration: Durations.sheetClose, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setIsPresented)(false)
      },
    )
  }, [sheetProgress, visible])

  const closeThen = useCallback(
    (after: () => void) => {
      sheetProgress.value = withTiming(
        0,
        { duration: Durations.sheetClose, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(setIsPresented)(false)
            runOnJS(after)()
          }
        },
      )
    },
    [sheetProgress],
  )

  const handleCancel = useCallback(() => closeThen(onClose), [closeThen, onClose])

  const handleSelectVault = useCallback(
    (vault: Vault) => {
      if (vault.current) {
        handleCancel()
        return
      }
      closeThen(() => onSelectVault(vault))
    },
    [closeThen, handleCancel, onSelectVault],
  )

  const handleAction = useCallback(
    (action: VaultSheetAction) => closeThen(() => onAction(action)),
    [closeThen, onAction],
  )

  const actionRows = useMemo(() => [...(canAdd ? ADD_ROWS : []), MANAGE_ROW], [canAdd])

  const renderVault = useCallback(
    (vault: Vault) => (
      <VaultRow
        key={vault.id}
        vault={vault}
        label={getVaultLabel(vault, t)}
        onSelect={handleSelectVault}
      />
    ),
    [handleSelectVault, t],
  )

  const renderAction = useCallback(
    (row: ActionRow) => (
      <ActionItem key={row.action} row={row} label={t(row.labelKey)} onPress={handleAction} />
    ),
    [handleAction, t],
  )

  const bottomInsetStyle = useMemo(
    () => [styles.bottomInset, { height: Math.max(insets.bottom, UI_SIZE_16) }],
    [styles.bottomInset, insets.bottom],
  )

  if (!isPresented) return null

  const content = (
    <>
      <RNView style={styles.grabber} />
      <Text style={styles.title}>{t('vaults.title')}</Text>
      <RNView style={styles.group}>{vaults.map(renderVault)}</RNView>
      <RNView style={styles.group}>{actionRows.map(renderAction)}</RNView>
      <Pressable
        onPress={handleCancel}
        accessibilityRole="button"
        style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
      >
        <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
      </Pressable>
      <RNView style={bottomInsetStyle} />
    </>
  )

  return (
    <Modal
      visible={isPresented}
      transparent
      animationType="none"
      onShow={handleSheetShow}
      onRequestClose={handleCancel}
    >
      <RNView style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleCancel}
            accessibilityLabel={t('common.cancel')}
          />
        </Animated.View>
        <Animated.View
          style={[styles.sheetWrap, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {isDark ? (
            <GlassView
              intensity={GlassIntensity.low}
              borderRadius={Radii.sheet}
              style={styles.sheet}
            >
              {content}
            </GlassView>
          ) : (
            <RNView style={[styles.sheet, styles.sheetLight]}>{content}</RNView>
          )}
        </Animated.View>
      </RNView>
    </Modal>
  )
}

type VaultRowProps = { vault: Vault; label: string; onSelect: (vault: Vault) => void }

const VaultRow = memo(function VaultRow({ vault, label, onSelect }: VaultRowProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const handlePress = useCallback(() => onSelect(vault), [onSelect, vault])
  const accessibilityState = useMemo(() => ({ selected: vault.current }), [vault.current])

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        vault.current && styles.rowCurrent,
        pressed && commonStyles.pressed,
      ]}
    >
      <RNView style={vault.current ? styles.avatarCurrent : styles.avatar}>
        <Text style={vault.current ? styles.avatarTextCurrent : styles.avatarText}>
          {getVaultInitial(label)}
        </Text>
      </RNView>
      <RNView style={commonStyles.flex1}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {vault.current ? t('vaults.open') : t('vaults.notOpen')}
        </Text>
      </RNView>
      {vault.current && (
        <SymbolIcon name="checkmark" size={UI_ICON_SIZE_20} color={colors.primary} />
      )}
    </Pressable>
  )
})

type ActionItemProps = {
  row: ActionRow
  label: string
  onPress: (action: VaultSheetAction) => void
}

const ActionItem = memo(function ActionItem({ row, label, onPress }: ActionItemProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const handlePress = useCallback(() => onPress(row.action), [onPress, row.action])

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
    >
      <RNView style={styles.actionIcon}>
        <SymbolIcon name={row.icon} size={UI_ICON_SIZE_20} color={colors.primary} />
      </RNView>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const avatarBase = {
    width: UI_SIZE_36,
    height: UI_SIZE_36,
    borderRadius: Radii.md,
    ...commonStyles.centered,
  }
  const styles = StyleSheet.create({
    overlay: {
      ...commonStyles.flex1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    sheetWrap: {
      justifyContent: 'flex-end',
    },
    sheet: {
      paddingHorizontal: UI_SIZE_24,
      paddingTop: UI_SIZE_12,
      paddingBottom: UI_SIZE_4,
      gap: UI_SIZE_16,
      borderCurve: 'continuous',
      borderTopLeftRadius: Radii.sheet,
      borderTopRightRadius: Radii.sheet,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      boxShadow: theme.isDark
        ? `0 -${UI_SIZE_10}px ${UI_SIZE_32}px ${theme.colors.sheetShadow}`
        : `0 -${UI_SIZE_12}px ${UI_SIZE_40}px ${theme.colors.sheetShadow}`,
    },
    sheetLight: {
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.sheetBorder,
    },
    grabber: {
      alignSelf: 'center',
      width: Layout.grabberWidth,
      height: Layout.grabberHeight,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.sheetGrabber,
      marginBottom: UI_SIZE_8,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
    },
    group: {
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: theme.colors.controlBackground,
    },
    row: {
      ...commonStyles.row,
      gap: Space.md,
      minHeight: UI_SIZE_56,
      paddingHorizontal: Space.base,
      paddingVertical: Space.md,
    },
    rowCurrent: {
      backgroundColor: theme.colors.cardSelected,
    },
    avatar: {
      ...avatarBase,
      backgroundColor: theme.colors.controlBackground,
    },
    avatarCurrent: {
      ...avatarBase,
      backgroundColor: theme.colors.primary,
    },
    avatarText: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
    },
    avatarTextCurrent: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      color: theme.colors.onPrimary,
    },
    rowLabel: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
    rowSub: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    actionIcon: {
      width: UI_SIZE_36,
      ...commonStyles.centered,
    },
    actionLabel: {
      fontSize: FontSize.subtitle,
      color: theme.colors.primary,
    },
    cancelBtn: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_52,
      borderRadius: Radii.btn,
      backgroundColor: theme.colors.sheetCancelBackground,
    },
    cancelBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    bottomInset: {
      backgroundColor: theme.colors.transparent,
    },
  })
  return styles
})
