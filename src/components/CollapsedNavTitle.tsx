import { memo } from 'react'
import { StyleSheet } from 'react-native'
import { FadeIn } from 'react-native-reanimated'

import { MotionView } from '@/components/MotionView'
import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  Durations,
  FontSize,
  FontWeight,
  LetterSpacing,
  UI_SIZE_14,
  UI_SIZE_20,
} from '@/constants/commonStyles'

type CollapsedNavTitleProps = {
  title: string
  subtitle?: string
}

export const CollapsedNavTitle = memo(function CollapsedNavTitle({
  title,
  subtitle,
}: CollapsedNavTitleProps) {
  const styles = useStyles()

  return (
    <MotionView entering={FadeIn.duration(Durations.fade)} style={styles.container}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </MotionView>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.transparent,
    },
    title: {
      fontSize: FontSize.subtitle,
      lineHeight: UI_SIZE_20,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: FontSize.body,
      lineHeight: UI_SIZE_14,
      fontWeight: FontWeight.semibold,
      letterSpacing: LetterSpacing.caps,
      color: theme.colors.textSecondary,
    },
  })
  return styles
})
