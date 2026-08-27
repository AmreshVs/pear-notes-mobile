import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { createThemedStylesheet, Text, useTheme, View } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  LetterSpacing,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_44,
  UI_SIZE_4,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

type FolderEmptyStateProps = {
  containerStyle: StyleProp<ViewStyle>
  hasSearchQuery: boolean
  isTrash: boolean
  showOnboarding: boolean
  onCreateNote: () => void
  onLinkDevice: () => void
  onRestoreBackup: () => void
}

export const FolderEmptyState = memo(function FolderEmptyState({
  containerStyle,
  hasSearchQuery,
  isTrash,
  showOnboarding,
  onCreateNote,
  onLinkDevice,
  onRestoreBackup,
}: FolderEmptyStateProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { colors } = useTheme()

  if (hasSearchQuery) {
    return (
      <View style={containerStyle}>
        <SymbolView name="magnifyingglass" size={UI_ICON_SIZE_44} tintColor={colors.textMuted} />
        <Text style={[styles.emptyTitle, commonThemedStyles.emptyTitle]}>
          {t('folderView.empty.noMatchesTitle')}
        </Text>
        <Text style={commonThemedStyles.emptySubtitle}>
          {t('folderView.empty.noMatchesSubtitle')}
        </Text>
      </View>
    )
  }

  if (isTrash) {
    return (
      <View style={containerStyle}>
        <SymbolView name="trash" size={UI_ICON_SIZE_44} tintColor={colors.textMuted} />
        <Text style={[styles.emptyTitle, commonThemedStyles.emptyTitle]}>
          {t('folderView.empty.trashEmptyTitle')}
        </Text>
        <Text style={commonThemedStyles.emptySubtitle}>
          {t('folderView.empty.trashEmptySubtitle')}
        </Text>
      </View>
    )
  }

  if (showOnboarding) {
    return (
      <View style={containerStyle}>
        <SymbolView name="book.closed" size={UI_ICON_SIZE_44} tintColor={colors.primary} />
        <Text style={styles.onboardingTitle}>{t('folderView.empty.onboardingTitle')}</Text>
        <Text style={commonThemedStyles.emptySubtitle}>
          {t('folderView.empty.onboardingSubtitle')}
        </Text>
        <View style={styles.ctaRow}>
          <Pressable
            onPress={onCreateNote}
            style={({ pressed }) => [styles.primaryBtn, pressed && commonStyles.pressed]}
          >
            <SymbolView name="plus" size={UI_ICON_SIZE_16} tintColor={colors.onPrimary} />
            <Text style={styles.primaryBtnText}>{t('folderView.empty.newNoteBtn')}</Text>
          </Pressable>
          <Pressable
            onPress={onLinkDevice}
            style={({ pressed }) => [styles.secondaryBtn, pressed && commonStyles.pressed]}
          >
            <SymbolView
              name="laptopcomputer.and.iphone"
              size={UI_ICON_SIZE_16}
              tintColor={colors.primary}
            />
            <Text style={styles.secondaryBtnText}>{t('folderView.empty.connectBtn')}</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={onRestoreBackup}
          style={({ pressed }) => [styles.tertiaryBtn, pressed && commonStyles.pressed]}
        >
          <SymbolView name="arrow.clockwise" size={UI_ICON_SIZE_16} tintColor={colors.textMuted} />
          <Text style={styles.tertiaryBtnText}>{t('folderView.empty.restoreBtn')}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={containerStyle}>
      <SymbolView name="note.text" size={UI_ICON_SIZE_44} tintColor={colors.textMuted} />
      <Text style={[styles.emptyTitle, commonThemedStyles.emptyTitle]}>
        {t('folderView.empty.noNotesTitle')}
      </Text>
      <Text style={commonThemedStyles.emptySubtitle}>{t('folderView.empty.noNotesSubtitle')}</Text>
    </View>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    emptyTitle: {
      marginTop: Space.md,
    },
    onboardingTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      letterSpacing: LetterSpacing.tight,
      textAlign: 'center',
      marginTop: Space.md,
      marginBottom: Space.sm,
      paddingHorizontal: UI_SIZE_4,
      color: theme.colors.text,
    },
    ctaRow: {
      flexDirection: 'row',
      gap: Space.sm,
      marginTop: Space.lg,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderRadius: Space.sm,
      backgroundColor: theme.colors.primary,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.md,
      borderRadius: Space.sm,
      borderWidth: 1,
      borderColor: theme.colors.separator,
    },
    primaryBtnText: {
      color: theme.colors.onPrimary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    secondaryBtnText: {
      color: theme.colors.primary,
      fontWeight: FontWeight.bold,
      fontSize: FontSize.body,
    },
    tertiaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
      marginTop: Space.md,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.md,
    },
    tertiaryBtnText: {
      color: theme.colors.textMuted,
      fontWeight: FontWeight.semibold,
      fontSize: FontSize.caption,
    },
  })
  return styles
})
