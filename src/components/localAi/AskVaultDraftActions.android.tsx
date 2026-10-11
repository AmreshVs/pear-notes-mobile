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
  UI_ICON_SIZE_16,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_16,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

import type { DraftDone } from './useAskVaultSheet'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  secondaryContainer?: string
  onSecondaryContainer?: string
}

interface AskVaultDraftActionsProps {
  turnId: number
  done: DraftDone | undefined
  target: string | null
  titleOf: (noteKey: string) => string
  onSave: (turnId: number) => void
  onAdd: (turnId: number) => void
}

export const AskVaultDraftActions = memo(function AskVaultDraftActions({
  turnId,
  done,
  target,
  titleOf,
  onSave,
  onAdd,
}: AskVaultDraftActionsProps) {
  const { t } = useTranslation()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleOnPrimary = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])
  if (done) {
    return (
      <View style={styles.doneRow}>
        <MaterialCommunityIcons name="check-circle" size={UI_ICON_SIZE_16} color={c.primary} />
        <Text style={styles.doneText} numberOfLines={1}>
          {done.addedTo
            ? t('localAi.askVault.draft.added', { title: titleOf(done.addedTo) })
            : t('localAi.askVault.draft.saved')}
        </Text>
      </View>
    )
  }
  return (
    <View style={styles.buttonRow}>
      <Pressable
        onPress={() => onSave(turnId)}
        android_ripple={rippleOnPrimary}
        accessibilityRole="button"
        style={styles.primaryButton}
      >
        <MaterialCommunityIcons
          name="file-plus-outline"
          size={UI_ICON_SIZE_16}
          color={c.onPrimary}
        />
        <Text style={styles.primaryButtonText}>{t('localAi.askVault.draft.saveNew')}</Text>
      </Pressable>
      {!!target && (
        <Pressable
          onPress={() => onAdd(turnId)}
          android_ripple={ripple}
          accessibilityRole="button"
          style={styles.tonalButton}
        >
          <MaterialCommunityIcons
            name="text-box-plus-outline"
            size={UI_ICON_SIZE_16}
            color={c.onSecondaryContainer}
          />
          <Text style={styles.tonalButtonText} numberOfLines={1}>
            {t('localAi.askVault.draft.addTo', { title: titleOf(target) })}
          </Text>
        </Pressable>
      )}
    </View>
  )
})

const useStyles = createThemedStylesheetWithHooks((_theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: UI_SIZE_8,
    },
    doneRow: {
      ...commonStyles.row,
      gap: UI_SIZE_6,
    },
    doneText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.primary,
    },
    primaryButton: {
      ...commonStyles.row,
      alignSelf: 'flex-start',
      gap: UI_SIZE_6,
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
    },
    primaryButtonText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onPrimary,
    },
    tonalButton: {
      ...commonStyles.row,
      flexShrink: 1,
      gap: UI_SIZE_6,
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.secondaryContainer,
    },
    tonalButtonText: {
      flexShrink: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSecondaryContainer,
    },
  })
  return styles
}, useMD3Theme)
