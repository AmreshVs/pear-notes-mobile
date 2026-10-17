import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import { Switch } from 'react-native-paper'

import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { Text } from '@/components/Themed'
import { commonStyles } from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'

import { useExtrasStyles } from './onDeviceAiAndroidStyles'
import { getIndexCaption } from './onDeviceAiExtrasUtils'
import { useIndexOnlyWhileCharging, useIndexProgress } from './useOnDeviceAiExtras'

type IndexSectionProps = {
  statusText: string
  busy: boolean
  onRebuild: () => void
}

export function IndexSection({ statusText, busy, onRebuild }: IndexSectionProps) {
  const { t } = useTranslation()
  const styles = useExtrasStyles()
  const md3Styles = useMD3CommonStyles()
  const md3 = useMD3Theme()
  const ripple = useMemo(() => androidRipple(md3.colors.onSurface), [md3.colors.onSurface])
  const charging = useIndexOnlyWhileCharging()
  const { progress, bytes } = useIndexProgress()
  const { progressText, sizeText } = getIndexCaption(t, progress, bytes)
  const fillStyle = useMemo(() => ({ width: `${progress.percent}%` as const }), [progress.percent])

  return (
    <>
      <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
        {t('settings.onDeviceAi.yourNotes')}
      </Text>
      <View style={styles.groupCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.onDeviceAi.index.title')}</Text>
            <Text style={styles.rowDesc} accessibilityLiveRegion="polite">
              {statusText}
            </Text>
          </View>
          <Pressable
            onPress={onRebuild}
            disabled={busy}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            style={[styles.indexButton, busy && commonStyles.disabled]}
          >
            <Text style={styles.indexButtonText}>{t('settings.onDeviceAi.index.rebuild')}</Text>
          </Pressable>
        </View>
        {progress.total > 0 && (
          <View style={styles.progressBlock}>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityLabel={t('settings.onDeviceAi.index.title')}
              accessibilityValue={{ min: 0, max: 100, now: progress.percent }}
            >
              <View style={[styles.progressFill, fillStyle]} />
            </View>
            <View style={styles.captionRow}>
              <Text style={styles.caption}>{progressText}</Text>
              {sizeText && <Text style={styles.caption}>{sizeText}</Text>}
            </View>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.onDeviceAi.index.onlyWhileCharging')}</Text>
            <Text style={styles.rowDesc}>
              {t('settings.onDeviceAi.index.onlyWhileChargingDesc')}
            </Text>
          </View>
          <Switch value={charging.on} onValueChange={charging.toggle} />
        </View>
      </View>
    </>
  )
}
