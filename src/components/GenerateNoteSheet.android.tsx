import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { KeyboardSheetShell } from '@/components/android/KeyboardSheetShell'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA } from '@/components/android/useSheetStyles'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import { useGenerateNoteSheet } from '@/components/useGenerateNoteSheet'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

const RESULT_MAX_HEIGHT_RATIO = 0.5

const noopLanguageName = (code: string | null) => code ?? ''

interface GenerateNoteSheetProps {
  visible: boolean
  task: string | null
  noteKeys: string[]
  onClose: () => void
}

export function GenerateNoteSheet({ visible, task, noteKeys, onClose }: GenerateNoteSheetProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const { height: windowHeight } = useWindowDimensions()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const mutedColor = c.onSurfaceVariant ?? c.onSurface
  const { title, status, lines, workView, copied, saved, handleCopy, handleSave, handleClose } =
    useGenerateNoteSheet({ visible, task, noteKeys, onClose })
  const resultStyle = useMemo(
    () => ({ maxHeight: windowHeight * RESULT_MAX_HEIGHT_RATIO }),
    [windowHeight],
  )
  const done = status === 'done'

  return (
    <KeyboardSheetShell visible={visible} onClose={handleClose}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_20} color={c.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {status === 'working'
              ? t('localAi.work.onDevice')
              : t('generate.fromCount', { count: noteKeys.length })}
          </Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={mutedColor} />
        </Pressable>
      </View>

      {status === 'working' && lines.length === 0 && workView && (
        <LocalAiWorkProgress view={workView} languageName={noopLanguageName} />
      )}
      {status === 'failed' && (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-outline" size={UI_ICON_SIZE_16} color={c.error} />
          <Text style={styles.errorText}>{t('generate.failed')}</Text>
        </View>
      )}
      {lines.length > 0 && (
        <ScrollView style={resultStyle} contentContainerStyle={styles.result}>
          <View style={styles.answerCard}>
            {lines.map((line, index) => (
              <Text
                key={index}
                style={line.heading ? styles.heading : styles.answerText}
                selectable
              >
                {line.text}
              </Text>
            ))}
          </View>
        </ScrollView>
      )}
      <Text style={styles.note}>{t('generate.disclaimer')}</Text>
      <View style={styles.actions}>
        <Pressable
          onPress={handleCopy}
          disabled={!done}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t(copied ? 'localAi.actions.copied' : 'generate.copy')}
          accessibilityState={{ disabled: !done }}
          style={[styles.actionButton, !done && commonStyles.disabled]}
        >
          <MaterialCommunityIcons
            name={copied ? 'check' : 'content-copy'}
            size={UI_ICON_SIZE_16}
            color={copied ? c.primary : mutedColor}
          />
          <Text style={styles.actionText}>
            {t(copied ? 'localAi.actions.copied' : 'generate.copy')}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={!done || saved}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityState={{ disabled: !done || saved }}
          style={[styles.actionButton, !done && commonStyles.disabled]}
        >
          <MaterialCommunityIcons
            name={saved ? 'check-circle' : 'note-plus-outline'}
            size={UI_ICON_SIZE_16}
            color={saved ? c.primary : mutedColor}
          />
          <Text style={[styles.actionText, saved && styles.actionTextDone]}>
            {t(saved ? 'localAi.askVault.saved' : 'generate.save')}
          </Text>
        </Pressable>
      </View>
    </KeyboardSheetShell>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
    },
    badge: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_12,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, SHEET_ICON_CHIP_ALPHA),
    },
    headerText: {
      flex: 1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.title,
      lineHeight: 26,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    subtitle: {
      fontSize: FontSize.body,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    closeButton: {
      ...commonStyles.centered,
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      marginTop: -UI_SIZE_6,
      marginRight: -UI_SIZE_8,
    },
    result: {
      gap: UI_SIZE_12,
    },
    answerCard: {
      gap: UI_SIZE_8,
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_20,
      backgroundColor: c.surfaceContainerHigh ?? theme.colors.cardSurface,
    },
    answerText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    heading: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    errorRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    errorText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.error,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    actions: {
      ...commonStyles.row,
      gap: UI_SIZE_16,
    },
    actionButton: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
      paddingVertical: UI_SIZE_8,
    },
    actionText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    actionTextDone: {
      color: c.primary,
    },
  })
  return styles
}, useMD3Theme)
