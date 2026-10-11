import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_14,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_9999,
} from '@/constants/commonStyles'

import type { DraftDone } from './useAskVaultSheet'

interface AskVaultDraftActionsProps {
  turnId: number
  done: DraftDone | undefined
  target: string | null
  titleOf: (noteKey: string) => string
  onSave: (turnId: number) => void
  onAdd: (turnId: number) => void
}

export const AskVaultDraftActions = memo(function AskVaultDraftActions({
  turnId,
  done,
  target,
  titleOf,
  onSave,
  onAdd,
}: AskVaultDraftActionsProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  if (done) {
    return (
      <View style={styles.primaryDone}>
        <SymbolView
          name="checkmark.circle.fill"
          size={UI_ICON_SIZE_14}
          tintColor={colors.primary}
          weight="semibold"
        />
        <Text style={styles.doneText} numberOfLines={1}>
          {done.addedTo
            ? t('localAi.askVault.draft.added', { title: titleOf(done.addedTo) })
            : t('localAi.askVault.draft.saved')}
        </Text>
      </View>
    )
  }
  return (
    <View style={styles.primaryActions}>
      <Pressable
        onPress={() => onSave(turnId)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryButton, pressed && commonStyles.pressed]}
      >
        <SymbolView
          name="doc.badge.plus"
          size={UI_ICON_SIZE_14}
          tintColor={colors.onPrimary}
          weight="semibold"
        />
        <Text style={styles.primaryButtonText}>{t('localAi.askVault.draft.saveNew')}</Text>
      </Pressable>
      {!!target && (
        <Pressable
          onPress={() => onAdd(turnId)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryButton, pressed && commonStyles.pressed]}
        >
          <SymbolView
            name="text.badge.plus"
            size={UI_ICON_SIZE_14}
            tintColor={colors.text}
            weight="semibold"
          />
          <Text style={styles.secondaryButtonText} numberOfLines={1}>
            {t('localAi.askVault.draft.addTo', { title: titleOf(target) })}
          </Text>
        </Pressable>
      )}
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    primaryActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: UI_SIZE_8,
    },
    primaryButton: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
    secondaryButton: {
      ...commonStyles.row,
      flexShrink: 1,
      gap: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_12,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      backgroundColor: theme.colors.controlBackground,
    },
    secondaryButtonText: {
      flexShrink: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    primaryDone: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
    },
    doneText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
  })
  return styles
})
