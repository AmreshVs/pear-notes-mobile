import { Fragment, useCallback, useEffect, useState } from 'react'
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
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_18,
  UI_SIZE_32,
  UI_SIZE_36,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { hapticSelection } from '@/lib/haptics'
import { AI_TOOL_GROUPS, type AiTool } from '@/lib/localAi/aiTools'

interface AiToolsSheetProps {
  visible: boolean
  selectionText: string
  tools: AiTool[]
  onSelect: (tool: AiTool) => void
  onClose: () => void
}

const EXCERPT_MAX_CHARS = 140
const LIST_MAX_HEIGHT_RATIO = 0.6

const ICON_BY_MODE: Record<string, string> = {
  fixGrammar: 'checkmark.circle',
  rewrite: 'wand.and.stars',
  makeShorter: 'arrow.down.right.and.arrow.up.left',
  makeProfessional: 'briefcase',
  makeFriendly: 'face.smiling',
  summarizeNote: 'text.alignleft',
  keyPoints: 'list.bullet',
  suggestTitle: 'textformat',
  translate: 'character.bubble',
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
  const { colors, isDark } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
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

  const body = (
    <>
      <View style={styles.grabber} />

      <View style={styles.header}>
        <View style={styles.badge}>
          <SymbolView
            name="sparkles"
            size={UI_ICON_SIZE_20}
            tintColor={colors.primary}
            weight="semibold"
          />
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
              <View style={styles.card}>
                {groupTools.map((tool, index) => (
                  <Fragment key={tool.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <Pressable
                      onPress={() => handleSelect(tool)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    >
                      <View style={styles.rowIcon}>
                        <SymbolView
                          name={(ICON_BY_MODE[tool.mode] ?? 'sparkles') as never}
                          size={UI_ICON_SIZE_16}
                          tintColor={colors.primary}
                          weight="semibold"
                        />
                      </View>
                      <Text style={styles.rowLabel}>{t(tool.labelKey)}</Text>
                      <SymbolView
                        name="chevron.right"
                        size={UI_ICON_SIZE_16}
                        tintColor={colors.textMuted}
                        weight="semibold"
                      />
                    </Pressable>
                  </Fragment>
                ))}
              </View>
            </View>
          )
        })}
      </ScrollView>

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
        <Animated.View
          style={[styles.sheetWrap, sheetAnimatedStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {isDark ? (
            <GlassView intensity={70} borderRadius={Radii.sheet} style={styles.sheet}>
              {body}
            </GlassView>
          ) : (
            <View style={[styles.sheet, styles.sheetLight]}>{body}</View>
          )}
        </Animated.View>
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
    sheetWrap: {
      justifyContent: 'flex-end',
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
      color: theme.colors.textSecondary,
    },
    card: {
      borderRadius: Radii.card,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: theme.colors.cardSurface,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: UI_SIZE_14 + UI_SIZE_32 + UI_SIZE_12,
      backgroundColor: theme.colors.separator,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_12,
      minHeight: UI_SIZE_36 + UI_SIZE_18,
      paddingHorizontal: UI_SIZE_14,
    },
    rowPressed: {
      backgroundColor: theme.colors.controlBackground,
    },
    rowIcon: {
      width: UI_SIZE_32,
      height: UI_SIZE_32,
      borderRadius: UI_SIZE_10,
      borderCurve: 'continuous',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.primary}1F`,
    },
    rowLabel: {
      flex: 1,
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.medium,
      color: theme.colors.text,
    },
  })
  return styles
})
