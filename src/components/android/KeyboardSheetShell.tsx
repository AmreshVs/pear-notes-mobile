import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { useSheetStyles } from '@/components/android/useSheetStyles'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import {
  Durations,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_20,
  UI_SIZE_28,
} from '@/constants/commonStyles'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerLow?: string
}

const SHEET_TRAVEL = 700

interface KeyboardSheetShellProps {
  visible: boolean
  onClose: () => void
  children: ReactNode
}

export function KeyboardSheetShell({ visible, onClose, children }: KeyboardSheetShellProps) {
  const styles = useStyles()
  const sheet = useSheetStyles()
  const insets = useSafeAreaInsets()
  const [isPresented, setIsPresented] = useState(visible)
  const sheetProgress = useSharedValue(visible ? 1 : 0)
  const bottomSpacerStyle = useMemo(
    () => ({ height: Math.max(insets.bottom, UI_SIZE_12) }),
    [insets.bottom],
  )

  const backdropAnimatedStyle = useAnimatedStyle(() => ({ opacity: sheetProgress.value }))
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - sheetProgress.value) * SHEET_TRAVEL }],
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

  if (!isPresented) return null

  return (
    <Modal
      visible={isPresented}
      transparent
      animationType="none"
      statusBarTranslucent
      onShow={handleSheetShow}
      onRequestClose={onClose}
    >
      <View style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView style={styles.keyboardArea} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheetWrap, sheetAnimatedStyle]}
            pointerEvents={visible ? 'auto' : 'none'}
          >
            <View style={styles.sheet}>
              <View style={[sheet.handleIndicator, styles.handleSpacing]} />
              {children}
              <View style={bottomSpacerStyle} />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
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
    sheet: {
      borderTopLeftRadius: UI_SIZE_28,
      borderTopRightRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_12,
      gap: UI_SIZE_14,
      elevation: 24,
      backgroundColor: c.surfaceContainerLow ?? c.surface,
    },
    handleSpacing: {
      marginTop: UI_SIZE_4,
    },
  })
  return styles
}, useMD3Theme)
