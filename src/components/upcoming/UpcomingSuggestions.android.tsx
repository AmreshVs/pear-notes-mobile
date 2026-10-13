import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { useUpcomingSuggestions } from '@/components/upcoming/useUpcomingSuggestions'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_ICON_SIZE_24,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

type SuggestionProps = {
  icon: 'content-copy' | 'format-title'
  text: string
  primary: string
  secondary: string
  onPrimary: () => void
  onSecondary: () => void
}

function Suggestion({ icon, text, primary, secondary, onPrimary, onSecondary }: SuggestionProps) {
  const styles = useStyles()
  const { colors } = useMD3Theme()
  const ripple = useMemo(() => androidRipple(colors.primary), [colors.primary])
  return (
    <View style={styles.group}>
      <View style={styles.textRow}>
        <MaterialCommunityIcons name={icon} size={UI_ICON_SIZE_24} color={colors.primary} />
        <Text style={styles.text}>{text}</Text>
      </View>
      <View style={styles.buttons}>
        <Pressable
          onPress={onSecondary}
          android_ripple={ripple}
          accessibilityRole="button"
          style={styles.textButton}
        >
          <Text style={styles.textButtonLabel}>{secondary}</Text>
        </Pressable>
        <Pressable onPress={onPrimary} accessibilityRole="button" style={styles.filledButton}>
          <Text style={styles.filledButtonLabel}>{primary}</Text>
        </Pressable>
      </View>
    </View>
  )
}

export function UpcomingSuggestions() {
  const { t } = useTranslation()
  const styles = useStyles()
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
    <View style={styles.section}>
      <Text style={styles.caption}>{t('upcoming.suggestions.title')}</Text>
      {duplicateText && (
        <Suggestion
          icon="content-copy"
          text={duplicateText}
          primary={t('upcoming.suggestions.reviewMerge')}
          secondary={t('upcoming.suggestions.notNow')}
          onPrimary={reviewMerge}
          onSecondary={snoozeDuplicate}
        />
      )}
      {titleText && (
        <Suggestion
          icon="format-title"
          text={titleText}
          primary={t('upcoming.suggestions.useTitle')}
          secondary={t('upcoming.suggestions.dismiss')}
          onPrimary={acceptTitle}
          onSecondary={dismissTitle}
        />
      )}
      <Text style={styles.footer}>{t('upcoming.suggestions.footer')}</Text>
    </View>
  )
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors as ExtendedColors
  const buttonLabel = {
    fontSize: FontSize.body,
    fontFamily: FontFamily.semiBold,
    fontWeight: FontWeight.semibold,
  }
  const styles = StyleSheet.create({
    section: {
      gap: UI_SIZE_8,
      marginTop: Space.xl,
    },
    caption: {
      marginLeft: Space.xs,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
    },
    group: {
      gap: Space.md,
      padding: UI_SIZE_20,
      borderRadius: UI_SIZE_28,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
    },
    textRow: {
      ...commonStyles.row,
      gap: Space.md,
    },
    text: {
      ...commonStyles.flex1,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    buttons: {
      ...commonStyles.row,
      justifyContent: 'flex-end',
      gap: Space.sm,
    },
    textButton: {
      ...commonStyles.centered,
      height: UI_SIZE_40,
      paddingHorizontal: UI_SIZE_16,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
    },
    textButtonLabel: {
      ...buttonLabel,
      color: c.primary,
    },
    filledButton: {
      ...commonStyles.centered,
      height: UI_SIZE_40,
      paddingHorizontal: UI_SIZE_20,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
    },
    filledButtonLabel: {
      ...buttonLabel,
      color: c.onPrimary,
    },
    footer: {
      marginHorizontal: Space.xs,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
