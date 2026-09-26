import { useTranslation } from 'react-i18next'
import { StyleSheet, View as RNView } from 'react-native'

import { assessSyncHealth } from '@pear-notes/core/utils.js'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Space,
  UI_SIZE_6,
  UI_SIZE_10,
} from '@/constants/commonStyles'

type Props = {
  snapshot: unknown
}

export function DebugHealthRows({ snapshot }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const health = assessSyncHealth(snapshot as any) as {
    level: string
    checks: { level: string; id: string; params: Record<string, unknown> }[]
  }
  const color: Record<string, string> = {
    healthy: colors.success,
    syncing: colors.primary,
    attention: colors.warning,
    problem: colors.error,
  }

  return (
    <RNView style={styles.container}>
      <RNView style={styles.header}>
        <RNView style={[styles.bigDot, { backgroundColor: color[health.level] }]} />
        <Text style={[styles.headerText, { color: color[health.level] }]}>
          {t(`debug.health.${health.level}`)}
        </Text>
      </RNView>
      {health.checks.map((check) => (
        <RNView key={check.id} style={styles.row}>
          <RNView style={[styles.dot, { backgroundColor: color[check.level] }]} />
          <Text style={styles.rowText}>{t(`debug.health.${check.id}`, check.params)}</Text>
        </RNView>
      ))}
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      paddingHorizontal: Space.base,
      paddingTop: Space.md,
    },
    bigDot: {
      width: UI_SIZE_10,
      height: UI_SIZE_10,
      borderRadius: UI_SIZE_10 / 2,
    },
    headerText: {
      fontFamily: FontFamily.bold,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      paddingHorizontal: Space.base,
      paddingTop: Space.sm,
    },
    dot: {
      width: UI_SIZE_6,
      height: UI_SIZE_6,
      borderRadius: UI_SIZE_6 / 2,
      marginTop: Space.xs + 2,
    },
    rowText: {
      flex: 1,
      fontSize: FontSize.caption,
      lineHeight: 18,
      color: theme.colors.text,
    },
  })
  return styles
})
