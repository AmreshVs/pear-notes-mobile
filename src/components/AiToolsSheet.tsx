import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { AiBottomSheet } from '@/components/AiBottomSheet'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  UI_ICON_SIZE_16,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_18,
  UI_SIZE_32,
  UI_SIZE_36,
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
  ask: 'questionmark.bubble',
  fixGrammar: 'checkmark.circle',
  rewrite: 'wand.and.stars',
  makeShorter: 'arrow.down.right.and.arrow.up.left',
  makeProfessional: 'briefcase',
  makeFriendly: 'face.smiling',
  cleanUp: 'sparkles',
  myStyle: 'person.text.rectangle',
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
  const { colors } = useTheme()
  const styles = useStyles()
  const { height: windowHeight } = useWindowDimensions()

  const excerpt = toExcerpt(selectionText)

  return (
    <AiBottomSheet
      visible={visible}
      icon="sparkles"
      title={t('localAi.writingTools.title')}
      subtitle={excerpt ? `“${excerpt}”` : t('localAi.writingTools.noSelectionHint')}
      subtitleLines={2}
      onClose={onClose}
    >
      {(dismissThen) => (
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
                        onPress={() => {
                          hapticSelection()
                          dismissThen(() => onSelect(tool))
                        }}
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
      )}
    </AiBottomSheet>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
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
