import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'

import { Divider } from '@/components/Divider'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_20,
  UI_SIZE_44,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { JOIN_CHOICE } from '@/constants/vaultActions'

import type { JoinChoiceCardProps } from './joinChoiceCard.types'

export function JoinChoiceCard({
  vaultName,
  hasNotes = true,
  choice,
  canKeepSeparate,
  maxVaults,
  onSelect,
}: JoinChoiceCardProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const commonThemedStyles = useCommonThemedStyles()

  const selectSeparate = useCallback(() => onSelect(JOIN_CHOICE.separate), [onSelect])
  const selectCombine = useCallback(() => onSelect(JOIN_CHOICE.combine), [onSelect])
  const separateSelected = choice === JOIN_CHOICE.separate
  const combineSelected = choice === JOIN_CHOICE.combine

  return (
    <RNView style={styles.section}>
      <Text style={styles.label}>{t('vaults.join.choiceLabel')}</Text>
      <Text style={styles.hint}>
        {t(hasNotes ? 'vaults.join.choiceDesc' : 'vaults.join.choiceDescEmpty', {
          name: vaultName,
        })}
      </Text>
      <RNView style={commonThemedStyles.card}>
        <Pressable
          onPress={selectSeparate}
          disabled={!canKeepSeparate}
          accessibilityRole="radio"
          accessibilityState={{ checked: separateSelected, disabled: !canKeepSeparate }}
          style={({ pressed }) => [
            styles.row,
            !canKeepSeparate && commonStyles.disabled,
            pressed && commonStyles.pressed,
          ]}
        >
          <RNView style={commonStyles.flex1}>
            <Text style={styles.rowTitle}>{t('vaults.join.keepTitle')}</Text>
            <Text style={styles.rowDesc}>
              {canKeepSeparate
                ? t('vaults.join.keepDesc', { name: vaultName })
                : t('vaults.limitReached', { max: maxVaults })}
            </Text>
          </RNView>
          {separateSelected && (
            <SymbolIcon name="checkmark" size={UI_ICON_SIZE_20} color={colors.primary} />
          )}
        </Pressable>
        <RNView style={styles.dividerWrap}>
          <Divider />
        </RNView>
        <Pressable
          onPress={selectCombine}
          accessibilityRole="radio"
          accessibilityState={{ checked: combineSelected }}
          style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
        >
          <RNView style={commonStyles.flex1}>
            <Text style={styles.rowTitle}>{t('vaults.join.combineTitle')}</Text>
            <Text style={styles.rowDesc}>
              {t(hasNotes ? 'vaults.join.combineDesc' : 'vaults.join.combineDescEmpty', {
                name: vaultName,
              })}
            </Text>
          </RNView>
          {combineSelected && (
            <SymbolIcon name="checkmark" size={UI_ICON_SIZE_20} color={colors.primary} />
          )}
        </Pressable>
      </RNView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    section: {
      gap: Space.sm,
    },
    label: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    hint: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    row: {
      ...commonStyles.row,
      gap: Space.md,
      minHeight: UI_SIZE_44,
      padding: Space.base,
    },
    rowTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
      marginTop: Space.xs,
    },
    dividerWrap: {
      marginHorizontal: Space.base,
    },
  })
  return styles
})
