import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { Divider } from '@/components/Divider'
import { Text } from '@/components/Themed'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

import { useExtrasStyles } from './onDeviceAiStyles'
import { useAnswers } from './useOnDeviceAiExtras'

export function AnswersSection() {
  const { t } = useTranslation()
  const styles = useExtrasStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { deviceModels, macTitle, macAvailable } = useAnswers()

  return (
    <View style={styles.section}>
      <Text style={commonThemedStyles.sectionCamelCase}>
        {t('settings.onDeviceAi.answers.title')}
      </Text>
      <View style={commonThemedStyles.card}>
        <View style={styles.toggleRow}>
          <Text style={styles.rowTitle}>{t('settings.onDeviceAi.answers.onThisDevice')}</Text>
          <Text style={styles.rowValue}>
            {deviceModels ?? t('settings.onDeviceAi.answers.notReady')}
          </Text>
        </View>
        {!!macTitle && (
          <>
            <View style={styles.dividerWrap}>
              <Divider />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.rowTitle}>{macTitle}</Text>
              <Text style={styles.rowValue}>
                {macAvailable
                  ? t('settings.onDeviceAi.answers.macAvailable')
                  : t('settings.onDeviceAi.answers.macUnavailable')}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}
