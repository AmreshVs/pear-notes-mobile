import { useTranslation } from 'react-i18next'
import { StyleSheet, Text } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_SIZE_2,
  UI_SIZE_6,
  UI_SIZE_8,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

export type MatchReason = 'exact' | 'meaning'

export function MatchReasonBadge({ reason }: { reason: MatchReason }) {
  const { t } = useTranslation()
  const styles = useStyles()
  return <Text style={styles.badge}>{t(`search.reason.${reason}`)}</Text>
}

const useStyles = createThemedStylesheetWithHooks((_theme, md3) => {
  const c = md3.colors
  const styles = StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      marginBottom: UI_SIZE_6,
      paddingHorizontal: UI_SIZE_8,
      paddingVertical: UI_SIZE_2,
      borderRadius: UI_SIZE_8,
      overflow: 'hidden',
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.primary,
      backgroundColor: hexWithAlpha(c.primary, 0.15),
    },
  })
  return styles
}, useMD3Theme)
