import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_32,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
}

type FolderItem = {
  id: string
  name: string
}

type Props = {
  visible: boolean
  onDismiss: () => void
  folders: FolderItem[]
  onSelect: (folderId: string) => void
}

export function FolderPickerSheet({ visible, onDismiss, folders, onSelect }: Props) {
  const { t } = useTranslation()
  const ref = useRef<BottomSheetModal>(null)
  const styles = useStyles()
  const { colors } = useMD3Theme()

  useEffect(() => {
    if (visible) {
      ref.current?.present()
    } else {
      ref.current?.dismiss()
    }
  }, [visible])

  const backgroundStyle = useMemo(() => styles.sheetBackground, [styles.sheetBackground])
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const rippleBorderless = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={onDismiss}
    >
      <BottomSheetView>
        <View style={styles.headerRow}>
          <Pressable
            onPress={onDismiss}
            android_ripple={rippleBorderless}
            style={styles.backBtn}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={UI_ICON_SIZE_22}
              color={colors.primary}
            />
          </Pressable>
          <Text style={styles.headerTitle}>{t('noteCard.actions.moveToFolder')}</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.listCard}>
            {folders.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <Pressable
                  onPress={() => onSelect(folder.id)}
                  android_ripple={ripple}
                  style={styles.folderRow}
                >
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons
                      name="folder-outline"
                      size={UI_ICON_SIZE_20}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.folderName}>{folder.name}</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={UI_ICON_SIZE_18}
                    color={colors.onSurfaceVariant}
                  />
                </Pressable>
                {index < folders.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
            {folders.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t('noteCard.actions.noFolders')}</Text>
              </View>
            )}
          </View>
          <View style={styles.bottomPad} />
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { md3Theme, screenHeight }) => {
    const c = md3Theme.colors as ExtendedColors
    const sheetBg = c.background

    const styles = StyleSheet.create({
      sheetBackground: {
        backgroundColor: sheetBg,
        borderTopLeftRadius: UI_SIZE_28,
        borderTopRightRadius: UI_SIZE_28,
      },
      handleIndicator: {
        width: 36,
        height: 4,
        borderRadius: 9999,
        alignSelf: 'center',
        backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.5),
      },
      headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: UI_SIZE_12,
        paddingTop: UI_SIZE_8,
        paddingBottom: UI_SIZE_16,
        gap: UI_SIZE_4,
      },
      backBtn: {
        overflow: 'hidden',
        padding: UI_SIZE_8,
        borderRadius: 9999,
      },
      headerTitle: {
        fontSize: FontSize.title,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        letterSpacing: -0.3,
        color: c.onSurface,
      },
      scrollView: {
        maxHeight: screenHeight * 0.55,
      },
      listContent: {
        paddingHorizontal: UI_SIZE_20,
      },
      listCard: {
        borderRadius: UI_SIZE_20,
        overflow: 'hidden',
        backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      },
      folderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: UI_SIZE_16,
        paddingVertical: UI_SIZE_14,
        gap: UI_SIZE_16,
        minHeight: 62,
      },
      iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexWithAlpha(c.primaryContainer, 0.35),
      },
      folderName: {
        flex: 1,
        fontSize: FontSize.subtitle,
        fontWeight: FontWeight.semibold,
        fontFamily: FontFamily.semiBold,
        color: c.onSurface,
      },
      separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 76,
        marginRight: UI_SIZE_16,
        backgroundColor: hexWithAlpha(c.outlineVariant, 0.14),
      },
      emptyRow: {
        paddingVertical: UI_SIZE_24,
        alignItems: 'center',
      },
      emptyText: {
        fontSize: FontSize.body,
        fontFamily: FontFamily.regular,
        color: c.onSurfaceVariant,
      },
      bottomPad: {
        height: UI_SIZE_32,
      },
    })
    return styles
  },
  () => {
    const md3Theme = useMD3Theme()
    const { height: screenHeight } = useWindowDimensions()
    return { md3Theme, screenHeight }
  },
)
