import { Fragment, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import { Switch } from 'react-native-paper'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router } from 'expo-router'

import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { Text } from '@/components/Themed'
import { commonStyles, UI_ICON_SIZE_20 } from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

import { useExtrasStyles } from './onDeviceAiAndroidStyles'
import { SUGGESTION_KINDS } from './onDeviceAiExtrasUtils'
import { useSuggestionPrefs } from './useOnDeviceAiExtras'

const REMINDERS_ROUTE = '/settings/general'

export function SuggestionsSection() {
  const { t } = useTranslation()
  const styles = useExtrasStyles()
  const md3Styles = useMD3CommonStyles()
  const md3 = useMD3Theme()
  const ripple = useMemo(() => androidRipple(md3.colors.onSurface), [md3.colors.onSurface])
  const { prefs, toggle } = useSuggestionPrefs()
  const handleOpenReminders = useCallback(() => router.push(REMINDERS_ROUTE as never), [])

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
      <View style={styles.groupCard}>
        {SUGGESTION_KINDS.map(renderRow)}
        <View style={styles.divider} />
        <Pressable
          onPress={handleOpenReminders}
          android_ripple={ripple}
          accessibilityRole="button"
          style={styles.toggleRow}
        >
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.onDeviceAi.suggestions.reminders')}</Text>
            <Text style={styles.rowDesc}>{t('settings.onDeviceAi.suggestions.remindersDesc')}</Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={UI_ICON_SIZE_20}
            color={md3.colors.onSurfaceVariant}
          />
        </Pressable>
      </View>
      <Text style={styles.footnote}>{t('settings.onDeviceAi.suggestions.synced')}</Text>
    </>
  )
}
