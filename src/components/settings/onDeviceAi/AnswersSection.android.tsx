import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { Text } from '@/components/Themed'
import { commonStyles } from '@/constants/commonStyles'

import { useExtrasStyles } from './onDeviceAiAndroidStyles'
import { useAnswers } from './useOnDeviceAiExtras'

export function AnswersSection() {
  const { t } = useTranslation()
  const styles = useExtrasStyles()
  const md3Styles = useMD3CommonStyles()
  const { deviceModels, macTitle, macAvailable } = useAnswers()

  return (
    <>
      <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
        {t('settings.onDeviceAi.answers.title')}
      </Text>
      <View style={styles.groupCard}>
        <View style={styles.toggleRow}>
          <Text style={styles.rowTitle}>{t('settings.onDeviceAi.answers.onThisDevice')}</Text>
          <Text style={styles.rowValue}>
            {deviceModels ?? t('settings.onDeviceAi.answers.notReady')}
          </Text>
        </View>
        {!!macTitle && (
          <>
            <View style={styles.divider} />
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
    </>
  )
}
