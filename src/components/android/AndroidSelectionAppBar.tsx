import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_48,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { MAX_FONT_SCALE_CHROME } from '@/utils/dynamicType'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
}

type AndroidSelectionAppBarProps = {
  selectedCount: number
  isAllSelected: boolean
  isTrash: boolean
  canMove: boolean
  onClose: () => void
  onToggleSelectAll: () => void
  onMove: () => void
  onRestore: () => void
  onMerge: () => void
  canCreate: boolean
  onCreate: () => void
  onDelete: () => void
}

export const AndroidSelectionAppBar = memo(function AndroidSelectionAppBar({
  selectedCount,
  isAllSelected,
  isTrash,
  canMove,
  onClose,
  onToggleSelectAll,
  onMove,
  onRestore,
  onMerge,
  canCreate,
  onCreate,
  onDelete,
}: AndroidSelectionAppBarProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const hasSelection = selectedCount > 0
  const actionColor = hasSelection ? c.primary : c.onSurfaceVariant

  return (
    <View style={styles.appBar}>
      <Pressable
        onPress={onClose}
        android_ripple={ripple}
        style={styles.iconBtn}
        hitSlop={UI_SIZE_8}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={c.primary} />
      </Pressable>

      <Text
        style={styles.title}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SCALE_CHROME}
        accessibilityLiveRegion="polite"
      >
        {t('folderView.selection.selectedTitle', { count: selectedCount })}
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onToggleSelectAll}
          android_ripple={ripple}
          style={styles.textBtn}
          hitSlop={UI_SIZE_8}
          accessibilityRole="button"
          accessibilityLabel={
            isAllSelected
              ? t('folderView.selection.deselectAll')
              : t('folderView.selection.selectAll')
          }
        >
          <Text
            style={styles.textBtnLabel}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SCALE_CHROME}
          >
            {isAllSelected
              ? t('folderView.selection.deselectAll')
              : t('folderView.selection.selectAll')}
          </Text>
        </Pressable>

        {isTrash ? (
          <Pressable
            onPress={onRestore}
            android_ripple={ripple}
            style={styles.iconBtn}
            disabled={!hasSelection}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityLabel={t('folderView.selection.restore')}
          >
            <MaterialCommunityIcons
              name="backup-restore"
              size={UI_ICON_SIZE_24}
              color={actionColor}
            />
          </Pressable>
        ) : (
          canMove && (
            <Pressable
              onPress={onMove}
              android_ripple={ripple}
              style={styles.iconBtn}
              disabled={!hasSelection}
              hitSlop={UI_SIZE_8}
              accessibilityRole="button"
              accessibilityLabel={t('folderView.selection.move')}
            >
              <MaterialCommunityIcons
                name="folder-move-outline"
                size={UI_ICON_SIZE_24}
                color={actionColor}
              />
            </Pressable>
          )
        )}

        {!isTrash && (
          <Pressable
            onPress={onMerge}
            android_ripple={ripple}
            style={styles.iconBtn}
            disabled={selectedCount < 2}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityLabel={t('notesList.merge.action')}
          >
            <MaterialCommunityIcons
              name="call-merge"
              size={UI_ICON_SIZE_24}
              color={selectedCount >= 2 ? c.primary : c.onSurfaceVariant}
            />
          </Pressable>
        )}

        {!isTrash && canCreate && (
          <Pressable
            onPress={onCreate}
            android_ripple={ripple}
            style={styles.iconBtn}
            disabled={!hasSelection}
            hitSlop={UI_SIZE_8}
            accessibilityRole="button"
            accessibilityLabel={t('generate.create')}
          >
            <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_24} color={actionColor} />
          </Pressable>
        )}

        <Pressable
          onPress={onDelete}
          android_ripple={ripple}
          style={styles.iconBtn}
          disabled={!hasSelection}
          hitSlop={UI_SIZE_8}
          accessibilityRole="button"
          accessibilityLabel={
            isTrash ? t('folderView.permanentlyDeleteTitle') : t('noteCard.actions.delete')
          }
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={UI_ICON_SIZE_24}
            color={hasSelection ? c.error : c.onSurfaceVariant}
          />
        </Pressable>
      </View>
    </View>
  )
})

const useSelectionAppBarHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { md3, insets }: ReturnType<typeof useSelectionAppBarHooks>) => {
    const c = md3.colors as ExtendedColors
    const styles = StyleSheet.create({
      appBar: {
        ...commonStyles.row,
        alignItems: 'center',
        paddingHorizontal: UI_SIZE_8,
        paddingTop: insets.top + UI_SIZE_4,
        paddingBottom: UI_SIZE_4,
        backgroundColor: c.background,
      },
      title: {
        ...commonStyles.flex1,
        marginLeft: UI_SIZE_12,
        fontSize: FontSize.subtitle,
        fontFamily: FontFamily.medium,
        fontWeight: FontWeight.medium,
        color: c.onSurface,
      },
      actions: {
        ...commonStyles.row,
        alignItems: 'center',
      },
      iconBtn: {
        width: UI_SIZE_48,
        height: UI_SIZE_48,
        alignItems: 'center',
        justifyContent: 'center',
      },
      textBtn: {
        height: UI_SIZE_48,
        paddingHorizontal: UI_SIZE_8,
        alignItems: 'center',
        justifyContent: 'center',
      },
      textBtnLabel: {
        fontSize: FontSize.body,
        fontFamily: FontFamily.medium,
        fontWeight: FontWeight.medium,
        color: c.primary,
      },
    })
    return styles
  },
  useSelectionAppBarHooks,
)
