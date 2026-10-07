import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useDispatch } from 'react-redux'

import { SEARCH_SCOPE, setSearchScope } from '@pear-notes/core/store/slices/searchSlice.js'

import { SearchScopeChip } from '@/components/notes/SearchScopeChip'
import { createThemedStylesheet } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_SIZE_6,
  UI_SIZE_14,
} from '@/constants/commonStyles'
import { hapticLight } from '@/lib/haptics'

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

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Space.sm,
      marginHorizontal: Space.base,
      marginBottom: Space.md,
    },
    chip: {
      flexShrink: 1,
      paddingHorizontal: UI_SIZE_14,
      paddingVertical: UI_SIZE_6,
      borderRadius: Radii.pill,
      borderCurve: 'continuous',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.separator,
      backgroundColor: theme.colors.cardSurface,
    },
    chipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}1F`,
    },
    chipText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.medium,
      color: theme.colors.textSecondary,
    },
    chipTextSelected: {
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.primary,
    },
  })
  return styles
})
