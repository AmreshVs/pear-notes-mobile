import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View as RNView } from 'react-native'
import { FadeIn } from 'react-native-reanimated'

import { MotionView } from '@/components/MotionView'
import { BackgroundSyncSection } from '@/components/settings/BackgroundSyncSection'
import { MediaSyncSection } from '@/components/settings/MediaSyncSection'
import { SyncStatusSection } from '@/components/settings/SyncStatusSection'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  Durations,
  FontFamily,
  FontSize,
  Radii,
  Space,
  UI_ICON_SIZE_48,
  UI_SIZE_20,
  UI_SIZE_60,
} from '@/constants/commonStyles'

export default function SyncScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()

  return (
    <RNView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <MotionView entering={FadeIn.duration(Durations.fade)} style={styles.hero}>
          <RNView style={styles.heroIcon}>
            <SymbolIcon name="arrow.clockwise" size={UI_ICON_SIZE_48} color={colors.primary} />
          </RNView>
          <Text style={styles.heroTitle}>{t('settings.sync.screenTitle')}</Text>
          <Text style={styles.heroDesc}>{t('settings.sync.screenDesc')}</Text>
        </MotionView>

        <SyncStatusSection />
        <BackgroundSyncSection />
        <MediaSyncSection />
      </ScrollView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.backgroundElevated,
    },
    scroll: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_60,
      paddingTop: Space.md,
    },
    hero: {
      ...commonStyles.centered,
      marginBottom: Space.xl,
    },
    heroIcon: {
      width: 88,
      height: 88,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.cardSelected,
      ...commonStyles.centered,
      marginBottom: Space.md,
    },
    heroTitle: {
      fontSize: FontSize.title,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: Space.xs,
    },
    heroDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.45,
      maxWidth: 320,
    },
  })
  return styles
})
