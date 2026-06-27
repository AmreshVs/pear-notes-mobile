import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, View as RNView, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontSize,
  FontWeight,
  GlassIntensity,
  Layout,
  Radii,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_27,
  UI_SIZE_32,
  UI_SIZE_4,
  UI_SIZE_40,
  UI_SIZE_54,
  UI_SIZE_8,
} from '@/constants/commonStyles'

interface ClearStorageBottomSheetProps {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ClearStorageBottomSheet({
  visible,
  onConfirm,
  onCancel,
}: ClearStorageBottomSheetProps) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useStyles()

  const [isPresented, setIsPresented] = useState(visible)
  const sheetProgress = useSharedValue(visible ? 1 : 0)

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetProgress.value * 1,
  }))

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: (1 - sheetProgress.value) * 450,
      },
    ],
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
      {
        duration: Durations.sheetClose,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
        }
      },
    )
  }, [sheetProgress, visible])

  const handleCancel = useCallback(() => {
    sheetProgress.value = withTiming(
      0,
      {
        duration: Durations.sheetClose,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
          runOnJS(onCancel)()
        }
      },
    )
  }, [sheetProgress, onCancel])

  const handleConfirm = useCallback(() => {
    sheetProgress.value = withTiming(
      0,
      {
        duration: Durations.sheetClose,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false)
          runOnJS(onConfirm)()
        }
      },
    )
  }, [sheetProgress, onConfirm])

  if (!isPresented) return null

  const bottomInset = Math.max(insets.bottom, UI_SIZE_16)

  return (
    <Modal
      visible={isPresented}
      transparent
      allowSwipeDismissal
      animationType="fade"
      onShow={handleSheetShow}
      onRequestClose={handleCancel}
    >
      <RNView style={styles.overlay} pointerEvents={visible ? 'box-none' : 'none'}>
        <Animated.View
          style={[styles.backdrop, backdropAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        </Animated.View>

        <Animated.View
          style={[styles.sheetWrap, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {isDark ? (
            <GlassView intensity={GlassIntensity.low} borderRadius={34} style={styles.sheet}>
              <RNView style={styles.grabber} />
              <RNView style={styles.content}>
                <Text style={styles.title}>{t('settings.reset.confirmTitle')}</Text>
                <Text style={styles.subtitle}>{t('settings.reset.confirmMessage')}</Text>

                <RNView style={styles.buttonsContainer}>
                  <Pressable
                    onPress={handleConfirm}
                    style={({ pressed }) => [styles.confirmBtn, pressed && commonStyles.pressed]}
                  >
                    <Text style={styles.confirmBtnText}>{t('settings.danger.clearStorage')}</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </Pressable>
                </RNView>
              </RNView>
              <RNView style={{ height: bottomInset }} />
            </GlassView>
          ) : (
            <RNView style={[styles.sheet, styles.sheetLight]}>
              <RNView style={styles.grabber} />
              <RNView style={styles.content}>
                <Text style={styles.title}>{t('settings.reset.confirmTitle')}</Text>
                <Text style={styles.subtitle}>{t('settings.reset.confirmMessage')}</Text>

                <RNView style={styles.buttonsContainer}>
                  <Pressable
                    onPress={handleConfirm}
                    style={({ pressed }) => [styles.confirmBtn, pressed && commonStyles.pressed]}
                  >
                    <Text style={styles.confirmBtnText}>{t('settings.danger.clearStorage')}</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [styles.cancelBtn, pressed && commonStyles.pressed]}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </Pressable>
                </RNView>
              </RNView>
              <RNView style={{ height: bottomInset }} />
            </RNView>
          )}
        </Animated.View>
      </RNView>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    overlay: {
      ...commonStyles.flex1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    sheetWrap: {
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
    },
    sheet: {
      paddingHorizontal: UI_SIZE_24,
      paddingTop: UI_SIZE_12,
      paddingBottom: UI_SIZE_4,
      gap: UI_SIZE_18,
      borderCurve: 'continuous',
      borderTopLeftRadius: Radii.sheet,
      borderTopRightRadius: Radii.sheet,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      boxShadow: theme.isDark
        ? `0 -${UI_SIZE_10}px ${UI_SIZE_32}px ${theme.colors.sheetShadow}`
        : `0 -${UI_SIZE_12}px ${UI_SIZE_40}px ${theme.colors.sheetShadow}`,
    },
    sheetLight: {
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.sheetBorder,
    },
    grabber: {
      alignSelf: 'center',
      width: Layout.grabberWidth,
      height: Layout.grabberHeight,
      borderRadius: 9999,
      backgroundColor: theme.colors.sheetGrabber,
      marginBottom: UI_SIZE_8,
    },
    content: {
      gap: UI_SIZE_16,
      alignItems: 'center',
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: UI_SIZE_20,
      paddingHorizontal: UI_SIZE_12,
    },
    buttonsContainer: {
      width: '100%',
      gap: UI_SIZE_12,
      marginTop: UI_SIZE_8,
    },
    confirmBtn: {
      ...commonStyles.centered,
      height: UI_SIZE_54,
      borderRadius: UI_SIZE_27,
      backgroundColor: theme.colors.error,
    },
    confirmBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.white,
    },
    cancelBtn: {
      ...commonStyles.centered,
      height: UI_SIZE_54,
      borderRadius: UI_SIZE_27,
      backgroundColor: theme.colors.sheetCancelBackground,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
    },
    cancelBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
  })

  return styles
})
