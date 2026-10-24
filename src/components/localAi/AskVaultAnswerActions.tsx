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
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_14,
} from '@/constants/commonStyles'
import { openReportProblem } from '@/lib/localAi/reportProblem'

interface AskVaultAnswerActionsProps {
  turnId: number
  copied: boolean
  saved: boolean
  canSave: boolean
  onCopy: (turnId: number) => void
  onSave: (turnId: number) => void
}

export const AskVaultAnswerActions = memo(function AskVaultAnswerActions({
  turnId,
  copied,
  saved,
  canSave,
  onCopy,
  onSave,
}: AskVaultAnswerActionsProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.footer}>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onCopy(turnId)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
          style={({ pressed }) => [styles.actionButton, pressed && commonStyles.pressed]}
        >
          <SymbolView
            name={copied ? 'checkmark' : 'doc.on.doc'}
            size={UI_ICON_SIZE_14}
            tintColor={copied ? colors.primary : colors.textSecondary}
            weight="semibold"
          />
          <Text style={styles.actionText}>
            {t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
          </Text>
        </Pressable>
        {canSave && (
          <Pressable
            onPress={() => onSave(turnId)}
            disabled={saved}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ disabled: saved }}
            style={({ pressed }) => [styles.actionButton, pressed && commonStyles.pressed]}
          >
            <SymbolView
              name={saved ? 'checkmark.circle.fill' : 'doc.badge.plus'}
              size={UI_ICON_SIZE_14}
              tintColor={saved ? colors.primary : colors.textSecondary}
              weight="semibold"
            />
            <Text style={[styles.actionText, saved && styles.actionTextDone]}>
              {t(saved ? 'localAi.askVault.saved' : 'localAi.askVault.saveAsNote')}
            </Text>
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={() => openReportProblem()}
        accessibilityRole="link"
        hitSlop={8}
        style={({ pressed }) => [styles.reportLink, pressed && commonStyles.pressed]}
      >
        <Text style={styles.reportLinkText}>{t('localAi.actions.reportProblem')}</Text>
      </Pressable>
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    footer: {
      gap: UI_SIZE_12,
    },
    actions: {
      ...commonStyles.row,
      gap: UI_SIZE_14,
    },
    actionButton: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
    },
    actionText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    actionTextDone: {
      color: theme.colors.primary,
    },
    reportLink: {
      alignSelf: 'flex-start',
    },
    reportLinkText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
  })
  return styles
})
