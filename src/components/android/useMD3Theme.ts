import { useTheme } from 'react-native-paper'
import type { MD3Theme } from 'react-native-paper'

export function useMD3Theme(): MD3Theme {
  return useTheme<MD3Theme>()
}
