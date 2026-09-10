import React, { useEffect, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA, useSheetStyles } from '@/components/android/useSheetStyles'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_20,
  UI_SIZE_44,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  errorContainer: string
}

export type SheetAction = {
  icon: string
  label: string
  onPress: () => void
  destructive?: boolean
  selected?: boolean
  noRightIcon?: boolean
}

type Props = {
  visible: boolean
  onDismiss: () => void
  title: string
  subtitle?: string
  showHeader?: boolean
  actions: SheetAction[]
}

export function BottomActionSheet({
  visible,
  onDismiss,
  title,
  subtitle,
  showHeader,
  actions,
}: Props) {
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
  const rippleDestructive = useMemo(() => androidRipple(colors.error), [colors.error])

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={sheet.handleIndicator}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={sheet.content}>
        {showHeader ? (
          <View style={sheet.header}>
            <Text style={sheet.title}>{title}</Text>
            {subtitle ? <Text style={sheet.subtitle}>{subtitle}</Text> : null}
          </View>
        ) : null}

        <View style={sheet.card}>
          {actions.map((action, index) => (
            <React.Fragment key={action.label}>
              <Pressable
                onPress={action.onPress}
                android_ripple={action.destructive ? rippleDestructive : ripple}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{ selected: !!action.selected }}
                style={sheet.row}
              >
                <View
                  style={
                    action.destructive
                      ? styles.iconCircleDestructive
                      : action.selected
                        ? styles.iconCircleSelected
                        : sheet.iconCircle
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
                      ? styles.rowLabelDestructive
                      : action.selected
                        ? styles.rowLabelSelected
                        : sheet.rowLabel
                  }
                >
                  {action.label}
                </Text>
                {action.noRightIcon ? null : action.selected ? (
                  <MaterialCommunityIcons
                    name="check"
                    size={UI_ICON_SIZE_20}
                    color={colors.primary}
                  />
                ) : (
                  !action.destructive && (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={UI_ICON_SIZE_18}
                      color={colors.onSurfaceVariant}
                    />
                  )
                )}
              </Pressable>
              {index < actions.length - 1 && <View style={sheet.separator} />}
            </React.Fragment>
          ))}
        </View>

        <View style={sheet.bottomPad} />
      </BottomSheetView>
    </BottomSheetModal>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors

  const chip = {
    width: UI_SIZE_44,
    height: UI_SIZE_44,
    borderRadius: UI_SIZE_9999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

  const styles = StyleSheet.create({
    iconCircleDestructive: {
      ...chip,
      backgroundColor: hexWithAlpha(c.errorContainer ?? c.error, SHEET_ICON_CHIP_ALPHA),
    },
    iconCircleSelected: {
      ...chip,
      backgroundColor: hexWithAlpha(c.primary, SHEET_ICON_CHIP_ALPHA),
    },
    rowLabelSelected: {
      flex: 1,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.primary,
    },
    rowLabelDestructive: {
      flex: 1,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.error,
    },
  })
  return styles
}, useMD3Theme)
