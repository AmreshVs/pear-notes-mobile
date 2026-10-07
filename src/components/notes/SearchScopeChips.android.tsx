import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useDispatch } from 'react-redux'

import { SEARCH_SCOPE, setSearchScope } from '@pear-notes/core/store/slices/searchSlice.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SearchScopeChip } from '@/components/notes/SearchScopeChip'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { FontFamily, FontSize, FontWeight, UI_SIZE_8, UI_SIZE_16 } from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticLight } from '@/lib/haptics'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

interface SearchScopeChipsProps {
  folderName: string
  scope: string
}

export function SearchScopeChips({ folderName, scope }: SearchScopeChipsProps) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const styles = useStyles()

  const chipStyles = useMemo(
    () => ({
      chip: styles.chip,
      chipSelected: styles.chipSelected,
      chipText: styles.chipText,
      chipTextSelected: styles.chipTextSelected,
    }),
    [styles.chip, styles.chipSelected, styles.chipText, styles.chipTextSelected],
  )

  const chooseScope = useCallback(
    (value: string) => {
      if (value === scope) return
      hapticLight()
      dispatch(setSearchScope(value))
    },
    [dispatch, scope],
  )

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('search.scopeLabel')}
      style={styles.row}
    >
      <SearchScopeChip
        value={SEARCH_SCOPE.FOLDER}
        label={folderName}
        selected={scope === SEARCH_SCOPE.FOLDER}
        onChoose={chooseScope}
        chipStyles={chipStyles}
      />
      <SearchScopeChip
        value={SEARCH_SCOPE.ALL}
        label={t('search.scopeAll')}
        selected={scope === SEARCH_SCOPE.ALL}
        onChoose={chooseScope}
        chipStyles={chipStyles}
      />
    </View>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: UI_SIZE_8,
    },
    chip: {
      flexShrink: 1,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_8,
      borderWidth: 1,
      borderColor: hexWithAlpha(md3Theme.colors.onSurface, 0.2),
    },
    chipSelected: {
      borderColor: c.primary,
      backgroundColor: c.primaryContainer,
    },
    chipText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant ?? theme.colors.textSecondary,
    },
    chipTextSelected: {
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onPrimaryContainer,
    },
  })
  return styles
}, useMD3Theme)
