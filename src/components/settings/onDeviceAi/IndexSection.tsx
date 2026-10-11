import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Switch, View } from 'react-native'

import { Divider } from '@/components/Divider'
import { Text, useTheme } from '@/components/Themed'
import { commonStyles } from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

import { getIndexCaption } from './onDeviceAiExtrasUtils'
import { useExtrasStyles } from './onDeviceAiStyles'
import { useIndexOnlyWhileCharging, useIndexProgress } from './useOnDeviceAiExtras'

type IndexSectionProps = {
  statusText: string
  busy: boolean
  onRebuild: () => void
}

export function IndexSection({ statusText, busy, onRebuild }: IndexSectionProps) {
  const { t } = useTranslation()
  const styles = useExtrasStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const { colors } = useTheme()
  const charging = useIndexOnlyWhileCharging()
  const trackColor = useMemo(
    () => ({ false: colors.controlBackground, true: colors.primary }),
    [colors.controlBackground, colors.primary],
  )
  const { progress, bytes } = useIndexProgress()
  const { progressText, sizeText } = getIndexCaption(t, progress, bytes)
  const fillStyle = useMemo(() => ({ width: `${progress.percent}%` as const }), [progress.percent])

  return (
    <View style={styles.section}>
      <Text style={commonThemedStyles.sectionCamelCase}>{t('settings.onDeviceAi.yourNotes')}</Text>
      <View style={commonThemedStyles.card}>
        <View style={styles.indexRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.onDeviceAi.index.title')}</Text>
            <Text style={styles.rowDesc} accessibilityLiveRegion="polite">
              {statusText}
            </Text>
          </View>
          <Pressable
            onPress={onRebuild}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            style={({ pressed }) => [
              styles.indexButton,
              busy && commonStyles.disabled,
              pressed && commonStyles.pressed,
            ]}
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
        <View style={styles.dividerWrap}>
          <Divider />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.rowTitle}>{t('settings.onDeviceAi.index.onlyWhileCharging')}</Text>
            <Text style={styles.rowDesc}>
              {t('settings.onDeviceAi.index.onlyWhileChargingDesc')}
            </Text>
          </View>
          <Switch
            value={charging.on}
            onValueChange={charging.toggle}
            trackColor={trackColor}
            thumbColor={colors.white}
          />
        </View>
      </View>
    </View>
  )
}
