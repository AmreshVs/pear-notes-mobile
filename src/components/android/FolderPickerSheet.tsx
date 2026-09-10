import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useSheetStyles } from '@/components/android/useSheetStyles'
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
  UI_SIZE_16,
  UI_SIZE_24,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import {
  FALLBACK_FOLDER_MATERIAL,
  FOLDER_ICON_MATERIAL,
} from '@/constants/folderIcons'
import { androidRipple } from '@/lib/androidRipple'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
}

type FolderItem = {
  id: string
  name: string
  icon?: string
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
  const sheet = useSheetStyles()
  const styles = useStyles()
  const { colors } = useMD3Theme()

  useEffect(() => {
    if (visible) {
      ref.current?.present()
    } else {
      ref.current?.dismiss()
    }
  }, [visible])

  const backgroundStyle = useMemo(() => sheet.sheetBackground, [sheet.sheetBackground])
  const ripple = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])
  const rippleBorderless = useMemo(() => androidRipple(colors.onSurface), [colors.onSurface])

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={sheet.handleIndicator}
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
          contentContainerStyle={sheet.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={sheet.card}>
            {folders.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <Pressable
                  onPress={() => onSelect(folder.id)}
                  android_ripple={ripple}
                  style={sheet.row}
                >
                  <View style={sheet.iconCircle}>
                    <MaterialCommunityIcons
                      name={
                        (FOLDER_ICON_MATERIAL[folder.icon ?? ''] ??
                          FALLBACK_FOLDER_MATERIAL) as never
                      }
                      size={UI_ICON_SIZE_20}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={sheet.rowLabel} numberOfLines={1}>
                    {folder.name}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={UI_ICON_SIZE_18}
                    color={colors.onSurfaceVariant}
                  />
                </Pressable>
                {index < folders.length - 1 && <View style={sheet.separator} />}
              </React.Fragment>
            ))}
            {folders.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>{t('noteCard.actions.noFolders')}</Text>
              </View>
            )}
          </View>
          <View style={sheet.bottomPad} />
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { md3Theme, screenHeight }) => {
    const c = md3Theme.colors as ExtendedColors
    const styles = StyleSheet.create({
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
        borderRadius: UI_SIZE_9999,
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
      emptyRow: {
        paddingVertical: UI_SIZE_24,
        alignItems: 'center',
      },
      emptyText: {
        fontSize: FontSize.body,
        fontFamily: FontFamily.regular,
        color: c.onSurfaceVariant,
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
