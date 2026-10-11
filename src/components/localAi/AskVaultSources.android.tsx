import { memo, useMemo } from 'react'
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
  UI_ICON_SIZE_20,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_10,
  UI_SIZE_20,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

import { getShownSources, type VaultTurnView } from './useAskVaultSheet'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

interface AskVaultSourcesProps {
  turn: VaultTurnView
  sourceMeta: (noteKey: string) => string
  onOpenNote: (noteKey: string) => void
}

export const AskVaultSources = memo(function AskVaultSources({
  turn,
  sourceMeta,
  onOpenNote,
}: AskVaultSourcesProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const { isCited, shown } = getShownSources(turn)
  if (!shown.length) return null
  return (
    <View style={styles.sources}>
      <Text style={styles.sourcesTitle}>
        {t(isCited ? 'localAi.askVault.fromYourNotes' : 'localAi.askVault.relatedNotes')}
      </Text>
      {shown.map((source, index) => {
        const meta = sourceMeta(source.noteKey)
        return (
          <Pressable
            key={`${turn.id}-${source.n}`}
            onPress={() => onOpenNote(source.noteKey)}
            android_ripple={ripple}
            accessibilityRole="button"
            style={styles.sourceRow}
          >
            <View style={styles.sourceNumber}>
              <Text style={styles.sourceNumberText}>{isCited ? source.n : index + 1}</Text>
            </View>
            <View style={commonStyles.flex1}>
              <Text style={styles.sourceTitle} numberOfLines={1}>
                {source.title || t('activity.untitledNote')}
              </Text>
              {!!meta && (
                <Text style={styles.sourceSnippet} numberOfLines={1}>
                  {meta}
                </Text>
              )}
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant ?? c.onSurface}
            />
          </Pressable>
        )
      })}
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors & {
    secondaryContainer?: string
    onSecondaryContainer?: string
  }
  const styles = StyleSheet.create({
    sources: {
      gap: UI_SIZE_4,
    },
    sourcesTitle: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurfaceVariant,
      textTransform: 'uppercase',
    },
    sourceRow: {
      ...commonStyles.row,
      gap: UI_SIZE_10,
      paddingVertical: UI_SIZE_6,
    },
    sourceNumber: {
      ...commonStyles.centered,
      width: UI_SIZE_20,
      height: UI_SIZE_20,
      borderRadius: UI_SIZE_6,
      backgroundColor: c.secondaryContainer,
    },
    sourceNumberText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSecondaryContainer,
    },
    sourceTitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurface,
    },
    sourceSnippet: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useMD3Theme)
