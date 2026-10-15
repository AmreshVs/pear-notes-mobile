import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Switch, View } from 'react-native'

import { Divider } from '@/components/Divider'
import { Text, useTheme } from '@/components/Themed'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

import { SUGGESTION_KINDS } from './onDeviceAiExtrasUtils'
import { useExtrasStyles } from './onDeviceAiStyles'
import { useSuggestionPrefs } from './useOnDeviceAiExtras'

export function SuggestionsSection() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useExtrasStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { prefs, toggle } = useSuggestionPrefs()
  const trackColor = useMemo(
    () => ({ false: colors.controlBackground, true: colors.primary }),
    [colors.controlBackground, colors.primary],
  )

  const renderRow = (kind: string, index: number) => (
    <Fragment key={kind}>
      {index > 0 && (
        <View style={styles.dividerWrap}>
          <Divider />
        </View>
      )}
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.rowTitle}>{t(`settings.onDeviceAi.suggestions.${kind}`)}</Text>
          <Text style={styles.rowDesc}>{t(`settings.onDeviceAi.suggestions.${kind}Desc`)}</Text>
        </View>
        <Switch
          value={prefs[kind] !== false}
          onValueChange={() => toggle(kind)}
          trackColor={trackColor}
          thumbColor={colors.white}
        />
      </View>
    </Fragment>
  )

  return (
    <View style={styles.section}>
      <Text style={commonThemedStyles.sectionCamelCase}>
        {t('settings.onDeviceAi.suggestions.title')}
      </Text>
      <View style={commonThemedStyles.card}>{SUGGESTION_KINDS.map(renderRow)}</View>
      <Text style={styles.footnote}>{t('settings.onDeviceAi.suggestions.synced')}</Text>
    </View>
  )
}
