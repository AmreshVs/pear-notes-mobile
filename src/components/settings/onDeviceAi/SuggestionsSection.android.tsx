import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { Switch } from 'react-native-paper'

import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { Text } from '@/components/Themed'
import { commonStyles } from '@/constants/commonStyles'

import { useExtrasStyles } from './onDeviceAiAndroidStyles'
import { SUGGESTION_KINDS } from './onDeviceAiExtrasUtils'
import { useSuggestionPrefs } from './useOnDeviceAiExtras'

export function SuggestionsSection() {
  const { t } = useTranslation()
  const styles = useExtrasStyles()
  const md3Styles = useMD3CommonStyles()
  const { prefs, toggle } = useSuggestionPrefs()

  const renderRow = (kind: string, index: number) => (
    <Fragment key={kind}>
      {index > 0 && <View style={styles.divider} />}
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.rowTitle}>{t(`settings.onDeviceAi.suggestions.${kind}`)}</Text>
          <Text style={styles.rowDesc}>{t(`settings.onDeviceAi.suggestions.${kind}Desc`)}</Text>
        </View>
        <Switch value={prefs[kind] !== false} onValueChange={() => toggle(kind)} />
      </View>
    </Fragment>
  )

  return (
    <>
      <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
        {t('settings.onDeviceAi.suggestions.title')}
      </Text>
      <View style={styles.groupCard}>{SUGGESTION_KINDS.map(renderRow)}</View>
      <Text style={styles.footnote}>{t('settings.onDeviceAi.suggestions.synced')}</Text>
    </>
  )
}
