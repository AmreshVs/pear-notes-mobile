import { TextStyle } from 'react-native'

import { FontSize } from './commonStyles'

export const Typography = {
  h1: {
    fontSize: FontSize.hero,
    lineHeight: 40,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  h2: {
    fontSize: FontSize.heading,
    lineHeight: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
  },
  h3: {
    fontSize: FontSize.title,
    lineHeight: 28,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  body: {
    fontSize: FontSize.subtitle,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodyBold: {
    fontSize: FontSize.subtitle,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  caption: {
    fontSize: FontSize.body,
    lineHeight: 20,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  label: {
    fontSize: FontSize.caption,
    lineHeight: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
}
