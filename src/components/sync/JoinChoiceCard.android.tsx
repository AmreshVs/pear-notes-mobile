import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_20,
} from '@/constants/commonStyles'
import { JOIN_CHOICE } from '@/constants/vaultActions'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { JoinChoiceCardProps } from './joinChoiceCard.types'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

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
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  const selectSeparate = useCallback(() => onSelect(JOIN_CHOICE.separate), [onSelect])
  const selectCombine = useCallback(() => onSelect(JOIN_CHOICE.combine), [onSelect])
  const separateSelected = choice === JOIN_CHOICE.separate
  const combineSelected = choice === JOIN_CHOICE.combine

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('vaults.join.choiceLabel')}</Text>
      <Text style={styles.hint}>
        {t(hasNotes ? 'vaults.join.choiceDesc' : 'vaults.join.choiceDescEmpty', {
          name: vaultName,
        })}
      </Text>
      <Pressable
        onPress={selectSeparate}
        disabled={!canKeepSeparate}
        android_ripple={ripple}
        accessibilityRole="radio"
        accessibilityState={{ checked: separateSelected, disabled: !canKeepSeparate }}
        style={[
          styles.option,
          separateSelected && styles.optionSelected,
          !canKeepSeparate && commonStyles.disabled,
        ]}
      >
        <MaterialCommunityIcons
          name={separateSelected ? 'radiobox-marked' : 'radiobox-blank'}
          size={UI_ICON_SIZE_24}
          color={separateSelected ? c.primary : c.onSurfaceVariant}
        />
        <View style={commonStyles.flex1}>
          <Text style={styles.rowTitle}>{t('vaults.join.keepTitle')}</Text>
          <Text style={styles.rowDesc}>
            {canKeepSeparate
              ? t('vaults.join.keepDesc', { name: vaultName })
              : t('vaults.limitReached', { max: maxVaults })}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={selectCombine}
        android_ripple={ripple}
        accessibilityRole="radio"
        accessibilityState={{ checked: combineSelected }}
        style={[styles.option, combineSelected && styles.optionSelected]}
      >
        <MaterialCommunityIcons
          name={combineSelected ? 'radiobox-marked' : 'radiobox-blank'}
          size={UI_ICON_SIZE_24}
          color={combineSelected ? c.primary : c.onSurfaceVariant}
        />
        <View style={commonStyles.flex1}>
          <Text style={styles.rowTitle}>{t('vaults.join.combineTitle')}</Text>
          <Text style={styles.rowDesc}>
            {t(hasNotes ? 'vaults.join.combineDesc' : 'vaults.join.combineDescEmpty', {
              name: vaultName,
            })}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

const useChoiceHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3 }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    section: {
      gap: UI_SIZE_8,
    },
    label: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    hint: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    option: {
      ...commonStyles.row,
      alignItems: 'flex-start',
      gap: UI_SIZE_16,
      paddingVertical: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      overflow: 'hidden',
      borderRadius: UI_SIZE_20,
      borderWidth: 1,
      borderColor: hexWithAlpha(c.onSurface, 0.12),
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    optionSelected: {
      borderColor: c.primary,
      backgroundColor: hexWithAlpha(c.primary, 0.12),
    },
    rowTitle: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    rowDesc: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_2,
    },
  })
  return styles
}, useChoiceHooks)
