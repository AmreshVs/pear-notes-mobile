import { Fragment, memo, useCallback, useEffect, useMemo, useState } from 'react'
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
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_32,
  UI_SIZE_36,
  UI_SIZE_40,
  UI_SIZE_56,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultInitial, getVaultLabel } from '@/lib/vaultLabels'
import type { Vault } from '@/lib/vaults.types'

type Props = {
  visible: boolean
  vaults: Vault[]
  onSelectVault: (vault: Vault) => void
  onManage: () => void
  onClose: () => void
}

type ActionRow = { icon: IconName; labelKey: string }

const SHEET_TRAVEL = 480
const VAULT_AVATAR_TINT_ALPHA = 0.08

const MANAGE_ROW: ActionRow = { icon: 'gearshape', labelKey: 'vaults.manage' }

export function VaultSwitcherBottomSheet({
  visible,
  vaults,
  onSelectVault,
  onManage,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const { isDark, colors } = useTheme()
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

  const handleManage = useCallback(() => closeThen(onManage), [closeThen, onManage])

  const renderVault = useCallback(
    (vault: Vault, index: number) => (
      <Fragment key={vault.id}>
        {index > 0 && <RNView style={styles.vaultSeparator} />}
        <VaultRow vault={vault} label={getVaultLabel(vault, t)} onSelect={handleSelectVault} />
      </Fragment>
    ),
    [handleSelectVault, styles.vaultSeparator, t],
  )

  const bottomInsetStyle = useMemo(
    () => [styles.bottomInset, { height: Math.max(insets.bottom, UI_SIZE_16) }],
    [styles.bottomInset, insets.bottom],
  )

  if (!isPresented) return null

  const content = (
    <>
      <RNView style={styles.header}>
        <Text style={styles.title}>{t('vaults.title')}</Text>
        <Pressable
          onPress={handleCancel}
          hitSlop={UI_SIZE_8}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={({ pressed }) => pressed && commonStyles.pressed}
        >
          <RNView style={styles.closeBtn}>
            <SymbolIcon name="xmark" size={UI_ICON_SIZE_14} color={colors.textSecondary} />
          </RNView>
        </Pressable>
      </RNView>
      <RNView style={styles.group}>{vaults.map(renderVault)}</RNView>
      <RNView style={styles.group}>
        <ActionItem row={MANAGE_ROW} label={t(MANAGE_ROW.labelKey)} onPress={handleManage} />
      </RNView>
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
              intensity={GlassIntensity.sheet}
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
      style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
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
  onPress: () => void
}

const ActionItem = memo(function ActionItem({ row, label, onPress }: ActionItemProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
    >
      <RNView style={commonThemedStyles.iconBox34}>
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
    borderCurve: 'continuous' as const,
    ...commonStyles.centered,
  }
  const avatarTextBase = {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
  }
  const separatorBase = {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.separator,
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
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_20,
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
      borderColor: theme.colors.separator,
    },
    header: {
      ...commonStyles.rowBetween,
      paddingLeft: UI_SIZE_4,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    closeBtn: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: Radii.pill,
      ...commonStyles.centered,
      backgroundColor: theme.colors.controlBackground,
    },
    group: {
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: theme.colors.cardSurface,
    },
    row: {
      ...commonStyles.row,
      gap: Space.md,
      minHeight: UI_SIZE_56,
      paddingHorizontal: Space.base,
      paddingVertical: Space.md,
    },
    vaultSeparator: {
      ...separatorBase,
      marginLeft: Space.base + UI_SIZE_36 + Space.md,
    },
    avatar: {
      ...avatarBase,
      backgroundColor: hexWithAlpha(theme.colors.text, VAULT_AVATAR_TINT_ALPHA),
    },
    avatarCurrent: {
      ...avatarBase,
      backgroundColor: theme.colors.primary,
    },
    avatarText: {
      ...avatarTextBase,
      color: theme.colors.textSecondary,
    },
    avatarTextCurrent: {
      ...avatarTextBase,
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
    actionLabel: {
      fontSize: FontSize.subtitle,
      color: theme.colors.text,
    },
    bottomInset: {
      backgroundColor: theme.colors.transparent,
    },
  })
  return styles
})
