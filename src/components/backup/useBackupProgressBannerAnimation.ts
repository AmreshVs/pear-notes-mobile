import { interpolate, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated'

import { Durations } from '@/constants/commonStyles'

export function useBackupProgressBannerAnimation(isVisible: boolean, isCollapsed: boolean) {
  const fadeAnim = useDerivedValue(() => {
    return withTiming(isVisible ? 1 : 0, { duration: Durations.fade })
  }, [isVisible])

  const collapseAnim = useDerivedValue(() => {
    return withTiming(isCollapsed ? 0 : 1, { duration: Durations.fade })
  }, [isCollapsed])

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: interpolate(fadeAnim.value, [0, 1], [20, 0]) }],
    }
  })

  const textContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: collapseAnim.value,
      width: interpolate(collapseAnim.value, [0, 1], [0, 200]),
    }
  })

  const actionsContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: collapseAnim.value,
    }
  })

  return { containerStyle, textContainerStyle, actionsContainerStyle }
}
