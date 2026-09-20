import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SymbolView } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  Layout,
  Radii,
  SHEET_MAX_WIDTH,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_18,
  UI_SIZE_32,
  UI_SIZE_40,
} from '@/constants/commonStyles'

export type DismissThen = (after: () => void) => void

interface AiBottomSheetProps {
  visible: boolean
  icon: string
  tone?: 'default' | 'error'
  title: string
  subtitle?: string
  subtitleLines?: number
  avoidKeyboard?: boolean
  onClose: () => void
  children: (dismissThen: DismissThen) => ReactNode
}

export function AiBottomSheet({
  visible,
  icon,
  tone = 'default',
  title,
  subtitle,
  subtitleLines,
  avoidKeyboard = false,
  onClose,
  children,
}: AiBottomSheetProps) {
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const [isPresented, setIsPresented] = useState(visible)
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: sheetProgress.value }))
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - sheetProgress.value) * 700 }],
  }))

  const handleSheetShow = useCallback(() => {
    sheetProgress.value = withTiming(1, {
      duration: Durations.sheetOpen,
      easing: Easing.out(Easing.cubic),
    })
  }, [sheetProgress])

  useEffect(() => {
    if (visible) {
      sheetProgress.value = 0
      setIsPresented(true)
      return
    }
    sheetProgress.value = withTiming(
      0,
      { duration: Durations.sheetClose, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setIsPresented)(false)
      },
    )
  }, [sheetProgress, visible])

  const dismissThen = useCallback<DismissThen>(
    (after) => {
      sheetProgress.value = withTiming(
        0,
        { duration: Durations.sheetClose, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (!finished) return
          runOnJS(setIsPresented)(false)
          runOnJS(after)()
        },
      )
    },
    [sheetProgress],
  )

  const handleClose = useCallback(() => dismissThen(onClose), [dismissThen, onClose])

  if (!isPresented) return null

  const isError = tone === 'error'

  const body = (
    <>
      <View style={styles.grabber} />

      <View style={styles.header}>
        <View style={[styles.badge, isError && styles.badgeError]}>
          <SymbolView
            name={icon as never}
            size={UI_ICON_SIZE_20}
            tintColor={isError ? colors.error : colors.primary}
            weight="semibold"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={subtitleLines}>
              {subtitle}
            </Text>
          )}
        </View>
        <Pressable
          hitSlop={12}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <SymbolView
            name="xmark"
            size={UI_ICON_SIZE_16}
            tintColor={colors.textSecondary}
            weight="semibold"
          />
        </Pressable>
      </View>

      {children(dismissThen)}

      <View style={{ height: Math.max(insets.bottom, UI_SIZE_12) }} />
    </>
  )

  return (
    <Modal
      visible={isPresented}
      transparent
      animationType="none"
      onShow={handleSheetShow}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior="padding"
          enabled={avoidKeyboard}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheetWrap, sheetAnimatedStyle]}
            pointerEvents={visible ? 'auto' : 'none'}
          >
            <View style={styles.sheetSizer}>
              {isDark ? (
                <GlassView intensity={70} borderRadius={Radii.sheet} style={styles.sheet}>
                  {body}
                </GlassView>
              ) : (
                <View style={[styles.sheet, styles.sheetLight]}>{body}</View>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    keyboardArea: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheetWrap: {
      justifyContent: 'flex-end',
    },
    sheetSizer: {
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
    },
    sheet: {
      paddingHorizontal: UI_SIZE_18,
      paddingTop: UI_SIZE_10,
      gap: UI_SIZE_18,
      borderCurve: 'continuous',
      borderTopLeftRadius: Radii.sheet,
      borderTopRightRadius: Radii.sheet,
      boxShadow: theme.colors.sheetBoxShadow,
    },
    sheetLight: {
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.separator,
    },
    grabber: {
      alignSelf: 'center',
      width: Layout.grabberWidth,
      height: Layout.grabberHeight,
      borderRadius: 999,
      backgroundColor: theme.colors.sheetGrabber,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
    },
    badge: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: UI_SIZE_12,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.primary}1F`,
    },
    badgeError: {
      backgroundColor: `${theme.colors.error}1F`,
    },
    headerText: {
      flex: 1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.title,
      lineHeight: 26,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      letterSpacing: -0.4,
      paddingRight: UI_SIZE_2,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: FontSize.body,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.controlBackground,
    },
    pressed: {
      opacity: 0.6,
    },
  })
  return styles
})
