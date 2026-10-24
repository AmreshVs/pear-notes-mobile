import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_SIZE_6,
  UI_SIZE_12,
  UI_SIZE_16,
} from '@/constants/commonStyles'
import { openReportProblem } from '@/lib/localAi/reportProblem'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

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
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const mutedColor = c.onSurfaceVariant ?? c.onSurface
  const styles = useStyles()
  return (
    <View style={styles.footer}>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onCopy(turnId)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(copied ? 'localAi.actions.copied' : 'localAi.actions.copy')}
          style={styles.actionButton}
        >
          <MaterialCommunityIcons
            name={copied ? 'check' : 'content-copy'}
            size={UI_ICON_SIZE_16}
            color={copied ? c.primary : mutedColor}
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
            style={styles.actionButton}
          >
            <MaterialCommunityIcons
              name={saved ? 'check-circle' : 'file-plus-outline'}
              size={UI_ICON_SIZE_16}
              color={saved ? c.primary : mutedColor}
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

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    footer: {
      gap: UI_SIZE_12,
    },
    actions: {
      ...commonStyles.row,
      gap: UI_SIZE_16,
    },
    actionButton: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
    },
    actionText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    actionTextDone: {
      color: c.primary,
    },
    reportLink: {
      alignSelf: 'flex-start',
    },
    reportLinkText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
    },
  })
  return styles
}, useMD3Theme)
