import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet'
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons/static"
import React, { useEffect, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useMD3Theme } from '@/components/android/useMD3Theme'

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
  const { colors } = useMD3Theme()
  const c = colors as ExtendedColors

  useEffect(() => {
    if (visible) {
      ref.current?.present()
    } else {
      ref.current?.dismiss()
    }
  }, [visible])

  const sheetBg = c.surfaceContainerLow ?? c.surface

  const backgroundStyle = useMemo(
    () => ({ backgroundColor: sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }),
    [sheetBg],
  )

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={[
        styles.handle,
        { backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.3) },
      ]}
      onDismiss={onDismiss}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.onSurface }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: c.onSurfaceVariant }]}>{subtitle}</Text>
          ) : null}
        </View>

        <View
          style={[
            styles.actionsCard,
            {
              backgroundColor:
                hexWithAlpha(c.surfaceContainerHighest ?? c.surfaceVariant, 0.5),
            },
          ]}
        >
          {actions.map((action, index) => (
            <React.Fragment key={action.label}>
              <Pressable
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && {
                    backgroundColor: hexWithAlpha(
                      action.destructive
                        ? (c as any).errorContainer ?? '#4e0d19'
                        : c.primaryContainer,
                      0.18,
                    ),
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: action.destructive
                        ? hexWithAlpha((c as any).errorContainer ?? '#4e0d19', 0.22)
                        : hexWithAlpha(c.primaryContainer, 0.35),
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={action.icon as any}
                    size={21}
                    color={action.destructive ? c.error : c.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: action.destructive ? c.error : c.onSurface },
                  ]}
                >
                  {action.label}
                </Text>
                {!action.destructive && (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={18}
                    color={hexWithAlpha(c.onSurfaceVariant, 0.4)}
                  />
                )}
              </Pressable>
              {index < actions.length - 1 && (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: hexWithAlpha(c.outlineVariant, 0.14) },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.bottomPad} />
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 4,
    paddingTop: 0,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 18,
  },
  actionsCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionRow: {
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
  actionLabel: {
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
  bottomPad: {
    height: 24,
  },
})
