import { Lock } from 'lucide-react-native'
import { memo, useEffect, useState } from 'react'
import { AppState, type AppStateStatus, View as RNView, StyleSheet } from 'react-native'

import { createThemedStylesheet, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  Radii,
  Space,
  UI_ICON_SIZE_40,
} from '@/constants/commonStyles'
import { getLockPrivacyPreference, LOCK_SWITCHER_HIDE_KEY } from '@/lib/lockPrivacy'

export const LockedContentShield = memo(function LockedContentShield({
  active,
}: {
  active: boolean
}) {
  const styles = useStyles()
  const { colors } = useTheme()
  const [enabled, setEnabled] = useState(true)
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    let cancelled = false
    getLockPrivacyPreference(LOCK_SWITCHER_HIDE_KEY).then((value) => {
      if (!cancelled) setEnabled(value)
    })
    return () => {
      cancelled = true
    }
  }, [active])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState)
    return () => subscription.remove()
  }, [])

  if (!active || !enabled || appState === 'active') return null

  return (
    <RNView style={styles.overlay}>
      <RNView style={styles.iconRing}>
        <Lock size={UI_ICON_SIZE_40} color={colors.primary} strokeWidth={2} />
      </RNView>
    </RNView>
  )
})

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...commonStyles.centered,
      backgroundColor: theme.colors.background,
      zIndex: 9999,
      gap: Space.lg,
    },
    iconRing: {
      ...commonStyles.iconRing80,
      backgroundColor: `${theme.colors.primary}26`,
      borderColor: `${theme.colors.primary}4D`,
      borderRadius: Radii.card,
    },
    title: {
      fontSize: FontSize.title,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
  })
  return styles
})
