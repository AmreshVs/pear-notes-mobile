import { View } from 'react-native'

import { useCommonThemedStyles } from '@/constants/commonThemedStyles'

export function Divider() {
  const commonThemedStyles = useCommonThemedStyles()
  return <View style={commonThemedStyles.divider} />
}
