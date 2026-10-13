import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View as RNView } from 'react-native'

import { createThemedStylesheet, Text } from '@/components/Themed'
import { useUpcomingSuggestions } from '@/components/upcoming/useUpcomingSuggestions'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_SIZE_6,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

type SuggestionProps = {
  text: string
  primary: string
  secondary: string
  onPrimary: () => void
  onSecondary: () => void
  divided: boolean
}

function Suggestion({
  text,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  divided,
}: SuggestionProps) {
  const styles = useStyles()
  return (
    <RNView style={[styles.row, divided && styles.divided]}>
      <Text style={styles.text}>{text}</Text>
      <RNView style={styles.buttons}>
        <Pressable
          onPress={onPrimary}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, styles.primary, pressed && commonStyles.pressed]}
        >
          <Text style={styles.primaryText}>{primary}</Text>
        </Pressable>
        <Pressable
          onPress={onSecondary}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            styles.secondary,
            pressed && commonStyles.pressed,
          ]}
        >
          <Text style={styles.secondaryText}>{secondary}</Text>
        </Pressable>
      </RNView>
    </RNView>
  )
}

export function UpcomingSuggestions() {
  const { t } = useTranslation()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const {
    visible,
    duplicateText,
    titleText,
    reviewMerge,
    snoozeDuplicate,
    acceptTitle,
    dismissTitle,
  } = useUpcomingSuggestions()
  if (!visible) return null

  return (
    <RNView style={styles.section}>
      <Text style={[commonThemedStyles.sectionCamelCase, styles.header]}>
        {t('upcoming.suggestions.title')}
      </Text>
      <RNView style={styles.card}>
        {duplicateText && (
          <Suggestion
            text={duplicateText}
            primary={t('upcoming.suggestions.reviewMerge')}
            secondary={t('upcoming.suggestions.notNow')}
            onPrimary={reviewMerge}
            onSecondary={snoozeDuplicate}
            divided={false}
          />
        )}
        {titleText && (
          <Suggestion
            text={titleText}
            primary={t('upcoming.suggestions.useTitle')}
            secondary={t('upcoming.suggestions.dismiss')}
            onPrimary={acceptTitle}
            onSecondary={dismissTitle}
            divided={Boolean(duplicateText)}
          />
        )}
      </RNView>
      <Text style={styles.footer}>{t('upcoming.suggestions.footer')}</Text>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const buttonText = {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  }
  const styles = StyleSheet.create({
    section: {
      marginTop: Space.base,
    },
    header: {
      marginLeft: Space.base,
      marginBottom: Space.sm,
    },
    card: {
      marginHorizontal: Space.base,
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.cardSurface,
    },
    row: {
      gap: Space.sm,
      paddingHorizontal: Space.base,
      paddingVertical: Space.md,
    },
    divided: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.separator,
    },
    text: {
      fontSize: FontSize.subtitle,
      color: theme.colors.text,
    },
    buttons: {
      ...commonStyles.row,
      gap: Space.sm,
    },
    button: {
      paddingHorizontal: Space.md,
      paddingVertical: UI_SIZE_6,
      borderRadius: Radii.pill,
    },
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.controlBackground,
    },
    primaryText: {
      ...buttonText,
      color: theme.colors.onPrimary,
    },
    secondaryText: {
      ...buttonText,
      color: theme.colors.text,
    },
    footer: {
      marginHorizontal: Space.lg,
      marginTop: Space.md,
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
