import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform, Pressable, StyleSheet, TextInput } from 'react-native'

import { VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'

import { createThemedStylesheet, Text, useColors, View } from '@/components/Themed'
import { FontFamily, FontSize, Radii, Space, UI_SIZE_44 } from '@/constants/commonStyles'
import type { JoinMode } from '@/lib/vaults.types'

type Props = {
  mode: JoinMode
  vaultName: string
  onChangeMode: (mode: JoinMode) => void
  onChangeVaultName: (name: string) => void
}

type Option = { mode: JoinMode; titleKey: string; bodyKey: string }

const OPTIONS: Option[] = [
  { mode: 'add', titleKey: 'vaults.join.addTitle', bodyKey: 'vaults.join.addBody' },
  { mode: 'replace', titleKey: 'vaults.join.combineTitle', bodyKey: 'pairing.overlay.mergeDesc' },
]

export function JoinVaultChoice({ mode, vaultName, onChangeMode, onChangeVaultName }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()

  const renderOption = useCallback(
    (option: Option) => {
      const selected = option.mode === mode
      return (
        <Pressable
          key={option.mode}
          onPress={() => onChangeMode(option.mode)}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          style={selected ? styles.optionSelected : styles.option}
        >
          <Text style={styles.optionTitle}>{t(option.titleKey)}</Text>
          <Text style={styles.optionBody}>{t(option.bodyKey)}</Text>
        </Pressable>
      )
    },
    [mode, onChangeMode, styles, t],
  )

  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {OPTIONS.map(renderOption)}
      {mode === 'add' && (
        <TextInput
          value={vaultName}
          onChangeText={onChangeVaultName}
          maxLength={VAULT_NAME_MAX_LENGTH}
          placeholder={t('vaults.namePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={t('vaults.nameLabel')}
          style={styles.input}
        />
      )}
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const optionBase = {
    width: '100%' as const,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Space.md,
    gap: Space.xs,
  }
  const styles = StyleSheet.create({
    container: {
      width: '100%',
      gap: Space.sm,
      backgroundColor: theme.colors.transparent,
    },
    option: {
      ...optionBase,
      borderColor: theme.colors.borderSecondary,
    },
    optionSelected: {
      ...optionBase,
      borderColor: theme.colors.cardSelectedBorder,
      backgroundColor: theme.colors.cardSelected,
    },
    optionTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
    optionBody: {
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    input: {
      width: '100%',
      height: UI_SIZE_44,
      borderRadius: Platform.OS === 'android' ? Radii.md : Radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
      paddingHorizontal: Space.base,
      fontSize: FontSize.body,
      color: theme.colors.text,
    },
  })
  return styles
})
