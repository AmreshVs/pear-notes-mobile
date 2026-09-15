import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { SHEET_ICON_CHIP_ALPHA, useSheetStyles } from '@/components/android/useSheetStyles'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  Durations,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { hapticSelection } from '@/lib/haptics'
import { AI_TOOL_GROUPS, type AiTool } from '@/lib/localAi/aiTools'

interface AiToolsSheetProps {
  visible: boolean
  selectionText: string
  tools: AiTool[]
  onSelect: (tool: AiTool) => void
  onClose: () => void
}

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  surfaceContainerLow?: string
  onSurfaceVariant?: string
}

const EXCERPT_MAX_CHARS = 140
const LIST_MAX_HEIGHT_RATIO = 0.6

const ICON_BY_MODE: Record<string, string> = {
  fixGrammar: 'spellcheck',
  rewrite: 'auto-fix',
  makeShorter: 'arrow-collapse-vertical',
  makeProfessional: 'briefcase-outline',
  makeFriendly: 'emoticon-happy-outline',
  summarizeNote: 'text-short',
  keyPoints: 'format-list-bulleted',
  suggestTitle: 'format-title',
  translate: 'translate',
}

function toExcerpt(text: string) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > EXCERPT_MAX_CHARS ? `${flat.slice(0, EXCERPT_MAX_CHARS).trimEnd()}…` : flat
}

export function AiToolsSheet({
  visible,
  selectionText,
  tools,
  onSelect,
  onClose,
}: AiToolsSheetProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const sheet = useSheetStyles()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const [isPresented, setIsPresented] = useState(visible)
  const sheetProgress = useSharedValue(visible ? 1 : 0)
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const mutedColor = c.onSurfaceVariant ?? colors.textSecondary

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

  const dismissThen = useCallback(
    (after: () => void) => {
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

  const handleSelect = useCallback(
    (tool: AiTool) => {
      hapticSelection()
      dismissThen(() => onSelect(tool))
    },
    [dismissThen, onSelect],
  )

  if (!isPresented) return null

  const excerpt = toExcerpt(selectionText)

  return (
    <Modal
      visible={isPresented}
      transparent
      animationType="none"
      statusBarTranslucent
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
        <Animated.View
          style={[styles.sheetWrap, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <View style={styles.sheet}>
            <View style={[sheet.handleIndicator, styles.handleSpacing]} />

            <View style={styles.header}>
              <View style={styles.badge}>
                <MaterialCommunityIcons name="creation" size={UI_ICON_SIZE_20} color={c.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>{t('localAi.writingTools.title')}</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {excerpt ? `“${excerpt}”` : t('localAi.writingTools.noSelectionHint')}
                </Text>
              </View>
              <Pressable
                hitSlop={12}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={mutedColor} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: windowHeight * LIST_MAX_HEIGHT_RATIO }}
              contentContainerStyle={styles.groups}
              showsVerticalScrollIndicator={false}
            >
              {AI_TOOL_GROUPS.map((group) => {
                const groupTools = tools.filter((tool) => tool.group === group.id)
                if (groupTools.length === 0) return null
                return (
                  <View key={group.id} style={styles.group}>
                    <Text style={styles.groupLabel}>{t(group.labelKey)}</Text>
                    <View style={sheet.card}>
                      {groupTools.map((tool, index) => (
                        <Fragment key={tool.id}>
                          <Pressable
                            onPress={() => handleSelect(tool)}
                            android_ripple={ripple}
                            accessibilityRole="button"
                            accessibilityLabel={t(tool.labelKey)}
                            style={sheet.row}
                          >
                            <View style={sheet.iconCircle}>
                              <MaterialCommunityIcons
                                name={(ICON_BY_MODE[tool.mode] ?? 'creation') as never}
                                size={UI_ICON_SIZE_20}
                                color={c.primary}
                              />
                            </View>
                            <Text style={sheet.rowLabel}>{t(tool.labelKey)}</Text>
                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={UI_ICON_SIZE_20}
                              color={mutedColor}
                            />
                          </Pressable>
                          {index < groupTools.length - 1 && <View style={sheet.separator} />}
                        </Fragment>
                      ))}
                    </View>
                  </View>
                )
              })}
            </ScrollView>

            <View style={{ height: Math.max(insets.bottom, UI_SIZE_12) }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const useStyles = createThemedStylesheetWithHooks((theme, md3Theme) => {
  const c = md3Theme.colors as ExtendedColors
  const sheetBg = c.surfaceContainerLow ?? c.surface
  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.backdrop,
    },
    sheetWrap: {
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: UI_SIZE_28,
      borderTopRightRadius: UI_SIZE_28,
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_12,
      gap: UI_SIZE_18,
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: -12 },
      shadowOpacity: 0.15,
      shadowRadius: UI_SIZE_28,
      elevation: 24,
      backgroundColor: sheetBg,
    },
    handleSpacing: {
      marginTop: UI_SIZE_4,
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
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(
        md3Theme.colors.primaryContainer || md3Theme.colors.primary,
        SHEET_ICON_CHIP_ALPHA,
      ),
    },
    headerText: {
      flex: 1,
      gap: UI_SIZE_2,
    },
    title: {
      fontSize: FontSize.title,
      lineHeight: 26,
      fontFamily: FontFamily.bold,
      fontWeight: FontWeight.bold,
      color: c.onSurface,
    },
    subtitle: {
      fontSize: FontSize.body,
      lineHeight: 20,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant ?? theme.colors.textSecondary,
    },
    closeButton: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      marginTop: -UI_SIZE_4,
      marginRight: -UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groups: {
      gap: UI_SIZE_18,
    },
    group: {
      gap: UI_SIZE_8,
    },
    groupLabel: {
      paddingHorizontal: UI_SIZE_4,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: c.onSurfaceVariant ?? theme.colors.textSecondary,
    },
  })
  return styles
}, useMD3Theme)
