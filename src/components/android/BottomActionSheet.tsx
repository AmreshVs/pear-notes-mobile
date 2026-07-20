import React, { useEffect, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
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
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_28,
  UI_SIZE_36,
} from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  surfaceContainerLowest: string
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return hex.length === 7 ? `${hex}${a}` : hex
}

export type SheetAction = {
  icon: string
  label: string
  onPress: () => void
  destructive?: boolean
  selected?: boolean
}

type Props = {
  visible: boolean
  onDismiss: () => void
  title: string
  subtitle?: string
  actions: SheetAction[]
}

export function BottomActionSheet({ visible, onDismiss, title, subtitle, actions }: Props) {
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

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={styles.handleIndicator}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.actionsCard}>
          {actions.map((action, index) => (
            <React.Fragment key={action.label}>
              <Pressable
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed &&
                    (action.destructive ? styles.actionRowPressedDestructive : styles.actionRowPressed),
                ]}
              >
                <View
                  style={
                    action.destructive
                      ? styles.iconCircleDestructive
                      : action.selected
                        ? styles.iconCircleSelected
                        : styles.iconCircle
                  }
                >
                  <MaterialCommunityIcons
                    name={action.icon as any}
                    size={UI_ICON_SIZE_20}
                    color={action.destructive ? colors.error : colors.primary}
                  />
                </View>
                <Text
                  style={
                    action.destructive
                      ? styles.actionLabelDestructive
                      : action.selected
                        ? styles.actionLabelSelected
                        : styles.actionLabel
                  }
                >
                  {action.label}
                </Text>
                {action.selected ? (
                  <MaterialCommunityIcons name="check" size={UI_ICON_SIZE_20} color={colors.primary} />
                ) : (
                  !action.destructive && (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={UI_ICON_SIZE_18}
                      color={hexWithAlpha(colors.onSurfaceVariant, 0.4)}
                    />
                  )
                )}
              </Pressable>
              {index < actions.length - 1 && <View style={styles.separator} />}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, md3Theme) => {
    const c = md3Theme.colors as ExtendedColors
    const sheetBg = c.background

    const styles = StyleSheet.create({
      sheetBackground: {
        backgroundColor: sheetBg,
        borderTopLeftRadius: UI_SIZE_28,
        borderTopRightRadius: UI_SIZE_28,
      },
      handleIndicator: {
        width: UI_SIZE_36,
        height: UI_SIZE_4,
        borderRadius: 9999,
        alignSelf: 'center',
        backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.5),
      },
      container: {
        paddingHorizontal: UI_SIZE_20,
        paddingTop: UI_SIZE_4,
      },
      header: {
        paddingBottom: UI_SIZE_24,
        paddingHorizontal: UI_SIZE_4,
        paddingTop: 0,
        gap: UI_SIZE_4,
      },
      title: {
        fontSize: FontSize.title,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        letterSpacing: -0.3,
        marginBottom: UI_SIZE_12,
        color: c.onSurface,
      },
      subtitle: {
        fontSize: FontSize.body,
        fontFamily: FontFamily.regular,
        lineHeight: 18,
        color: c.onSurfaceVariant,
      },
      actionsCard: {
        borderRadius: UI_SIZE_20,
        overflow: 'hidden',
        backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      },
      actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: UI_SIZE_16,
        paddingVertical: UI_SIZE_14,
        gap: UI_SIZE_16,
        minHeight: 62,
      },
      actionRowPressed: {
        backgroundColor: hexWithAlpha(c.primaryContainer, 0.18),
      },
      actionRowPressedDestructive: {
        backgroundColor: hexWithAlpha((c as any).errorContainer ?? '#4e0d19', 0.18),
      },
      iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexWithAlpha(c.primaryContainer, 0.35),
      },
      iconCircleDestructive: {
        width: 44,
        height: 44,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexWithAlpha((c as any).errorContainer ?? '#4e0d19', 0.22),
      },
      iconCircleSelected: {
        width: 44,
        height: 44,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexWithAlpha(c.primary, 0.18),
      },
      actionLabel: {
        flex: 1,
        fontSize: FontSize.subtitle,
        fontWeight: FontWeight.semibold,
        fontFamily: FontFamily.semiBold,
        color: c.onSurface,
      },
      actionLabelSelected: {
        flex: 1,
        fontSize: FontSize.subtitle,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        color: c.primary,
      },
      actionLabelDestructive: {
        flex: 1,
        fontSize: FontSize.subtitle,
        fontWeight: FontWeight.semibold,
        fontFamily: FontFamily.semiBold,
        color: c.error,
      },
      separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 76,
        marginRight: UI_SIZE_16,
        backgroundColor: hexWithAlpha(c.outlineVariant, 0.14),
      },
      bottomPad: {
        height: UI_SIZE_24,
      },
    })
    return styles
  },
  useMD3Theme,
)
