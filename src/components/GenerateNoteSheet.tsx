import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { AiBottomSheet } from '@/components/AiBottomSheet'
import { LocalAiWorkProgress } from '@/components/LocalAiWorkProgress'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { useGenerateNoteSheet } from '@/components/useGenerateNoteSheet'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_14,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_14,
  UI_SIZE_16,
} from '@/constants/commonStyles'

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
  const { colors } = useTheme()
  const styles = useStyles()
  const { height: windowHeight } = useWindowDimensions()
  const { title, status, lines, workView, copied, saved, handleCopy, handleSave, handleClose } =
    useGenerateNoteSheet({ visible, task, noteKeys, onClose })
  const resultStyle = useMemo(
    () => ({ maxHeight: windowHeight * RESULT_MAX_HEIGHT_RATIO }),
    [windowHeight],
  )
  const done = status === 'done'

  return (
    <AiBottomSheet
      visible={visible}
      icon="sparkles"
      title={title}
      subtitle={
        status === 'working'
          ? t('localAi.work.onDevice')
          : t('generate.fromCount', { count: noteKeys.length })
      }
      onClose={handleClose}
    >
      {() => (
        <>
          {status === 'working' && lines.length === 0 && workView && (
            <LocalAiWorkProgress view={workView} languageName={noopLanguageName} />
          )}
          {status === 'failed' && (
            <View style={styles.errorRow}>
              <SymbolView
                name="exclamationmark.triangle"
                size={UI_ICON_SIZE_14}
                tintColor={colors.error}
                weight="semibold"
              />
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
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t(copied ? 'localAi.actions.copied' : 'generate.copy')}
              accessibilityState={{ disabled: !done }}
              style={({ pressed }) => [
                styles.actionButton,
                !done && commonStyles.disabled,
                pressed && commonStyles.pressed,
              ]}
            >
              <SymbolView
                name={copied ? 'checkmark' : 'doc.on.doc'}
                size={UI_ICON_SIZE_14}
                tintColor={copied ? colors.primary : colors.textSecondary}
                weight="semibold"
              />
              <Text style={styles.actionText}>
                {t(copied ? 'localAi.actions.copied' : 'generate.copy')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!done || saved}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ disabled: !done || saved }}
              style={({ pressed }) => [
                styles.actionButton,
                !done && commonStyles.disabled,
                pressed && commonStyles.pressed,
              ]}
            >
              <SymbolView
                name={saved ? 'checkmark.circle.fill' : 'doc.badge.plus'}
                size={UI_ICON_SIZE_14}
                tintColor={saved ? colors.primary : colors.textSecondary}
                weight="semibold"
              />
              <Text style={[styles.actionText, saved && styles.actionTextDone]}>
                {t(saved ? 'localAi.askVault.saved' : 'generate.save')}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </AiBottomSheet>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    result: {
      gap: UI_SIZE_10,
    },
    answerCard: {
      gap: UI_SIZE_8,
      padding: UI_SIZE_14,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    answerText: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    heading: {
      fontSize: FontSize.subtitle,
      lineHeight: 24,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    errorRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    errorText: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.error,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    actions: {
      ...commonStyles.row,
      gap: UI_SIZE_16,
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
  })
  return styles
})
