import type { StyleProp, TextStyle } from 'react-native'

import { Text } from '@/components/Themed'

type Props = {
  title: string
  titleStyle: StyleProp<TextStyle>
}

export function VaultTitle({ title, titleStyle }: Props) {
  return <Text style={titleStyle}>{title}</Text>
}
