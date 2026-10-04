import { memo, useMemo } from 'react'
import { View, type ViewStyle } from 'react-native'

type ToneBlockProps = { baseStyle: ViewStyle; color: string; grow?: number }

export const ToneBlock = memo(function ToneBlock({ baseStyle, color, grow }: ToneBlockProps) {
  const style = useMemo(
    () => ({
      ...baseStyle,
      backgroundColor: color,
      ...(grow === undefined ? null : { flex: grow }),
    }),
    [baseStyle, color, grow],
  )
  return <View style={style} />
})
