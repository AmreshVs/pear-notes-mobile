import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_SIZE_2,
  UI_SIZE_6,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

export type MatchReason = 'exact' | 'meaning'

export function MatchReasonBadge({ reason }: { reason: MatchReason }) {
  const { t } = useTranslation()
  const styles = useStyles()
  return <Text style={styles.badge}>{t(`search.reason.${reason}`)}</Text>
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      marginBottom: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_6,
      paddingVertical: UI_SIZE_2,
      borderRadius: Space.xs,
      overflow: 'hidden',
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.15),
    },
  })
  return styles
})
