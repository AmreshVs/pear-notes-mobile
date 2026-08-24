import type { Animated } from 'react-native'

export function snapTo(
  value: Animated.Value,
  toValue: number,
  callback?: Animated.EndCallback,
): void {
  value.setValue(toValue)
  callback?.({ finished: true })
}
