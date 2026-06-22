import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static"
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
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
  const ref = useRef<BottomSheetModal>(null)
  const { colors } = useMD3Theme()
  const c = colors as ExtendedColors
  const { height: screenHeight } = useWindowDimensions()

  useEffect(() => {
    if (visible) {
      ref.current?.present()
    } else {
      ref.current?.dismiss()
    }
  }, [visible])

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  )

  const sheetBg = c.surfaceContainerLow ?? c.surface

  const backgroundStyle = useMemo(
    () => ({ backgroundColor: sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }),
    [sheetBg],
  )

  const listCardStyle = useMemo(
    () => [
      styles.listCard,
      {
        backgroundColor: hexWithAlpha(
          (c as any).surfaceContainerHighest ?? c.surfaceVariant,
          0.5,
        ),
      },
    ],
    [c],
  )

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={[
        styles.handle,
        { backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.3) },
      ]}
      onDismiss={onDismiss}
    >
      <BottomSheetView>
        <View style={styles.headerRow}>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && {
                backgroundColor: hexWithAlpha(
                  (c as any).surfaceContainerHighest ?? c.surfaceVariant,
                  0.6,
                ),
              },
            ]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={c.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.onSurface }]}>Move to Folder</Text>
        </View>

        <ScrollView
          style={{ maxHeight: screenHeight * 0.55 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={listCardStyle}>
            {folders.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <Pressable
                  onPress={() => onSelect(folder.id)}
                  style={({ pressed }) => [
                    styles.folderRow,
                    pressed && {
                      backgroundColor: hexWithAlpha(c.primaryContainer, 0.18),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: hexWithAlpha(c.primaryContainer, 0.35) },
                    ]}
                  >
                    <MaterialCommunityIcons name="folder-outline" size={20} color={c.primary} />
                  </View>
                  <Text style={[styles.folderName, { color: c.onSurface }]}>{folder.name}</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={hexWithAlpha(c.onSurfaceVariant, 0.4)}
                  />
                </Pressable>
                {index < folders.length - 1 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: hexWithAlpha(c.outlineVariant, 0.14) },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
            {folders.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={[styles.emptyText, { color: c.onSurfaceVariant }]}>
                  No folders available
                </Text>
              </View>
            )}
          </View>
          <View style={styles.bottomPad} />
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  handle: {
    width: 36,
    height: 4,
    borderRadius: 9999,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 4,
  },
  backBtn: {
    padding: 8,
    borderRadius: 9999,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.3,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  listCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
    minHeight: 62,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
    marginRight: 16,
  },
  emptyRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  bottomPad: {
    height: 32,
  },
})
