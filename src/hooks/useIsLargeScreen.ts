import { useWindowDimensions } from 'react-native'

import { LARGE_SCREEN_MIN_WIDTH } from '@/constants/commonStyles'

export function useIsLargeScreen() {
  const { width } = useWindowDimensions()
  return width >= LARGE_SCREEN_MIN_WIDTH
}
