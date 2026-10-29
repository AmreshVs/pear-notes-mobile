import type { ComponentProps } from 'react'
import { type ColorValue, type StyleProp, type TextStyle } from 'react-native'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import type { IconName, IconWeight } from '@/components/SymbolIcon.types'

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const MATERIAL_EQUIVALENT: Record<string, MaterialIconName> = {
  lock: 'lock',
  xmark: 'close',
  checkmark: 'check',
  'checkmark.shield': 'shield-check',
  'chevron.forward': 'chevron-right',
  'clock.arrow.circlepath': 'backup-restore',
  'square.and.arrow.up': 'export-variant',
  'arrow.up.circle': 'arrow-up-circle-outline',
  'arrow.down.circle': 'arrow-down-circle-outline',
  'exclamationmark.shield': 'shield-alert',
  eye: 'eye-outline',
  'eye.slash': 'eye-off-outline',
  touchid: 'fingerprint',
  link: 'link-variant',
  'arrow.counterclockwise': 'restore',
  'chevron.down': 'chevron-down',
  'square.and.arrow.down': 'download-outline',
  globe: 'earth',
  'qrcode.viewfinder': 'qrcode-scan',
  trash: 'trash-can-outline',
  'exclamationmark.circle': 'alert-circle-outline',
  'exclamationmark.triangle': 'alert-outline',
  hourglass: 'timer-sand',
  'cylinder.split.1x2': 'database-outline',
  'doc.text': 'file-document-outline',
  'doc.on.doc': 'content-copy',
  paperplane: 'send-outline',
  video: 'video-outline',
  folder: 'folder-outline',
  'folder.badge.plus': 'folder-plus-outline',
  internaldrive: 'harddisk',
  photo: 'image-outline',
  key: 'key-outline',
  'lock.shield': 'shield-lock-outline',
  'lock.open': 'lock-open-variant-outline',
  mic: 'microphone-outline',
  desktopcomputer: 'monitor',
  paperclip: 'paperclip',
  'pause.fill': 'pause',
  pencil: 'pencil-outline',
  pin: 'pin',
  'play.fill': 'play',
  'arrow.clockwise': 'refresh',
  faceid: 'face-recognition',
  'slider.horizontal.3': 'tune',
  iphone: 'cellphone',
  'square.and.pencil': 'square-edit-outline',
  'wifi.slash': 'wifi-off',
  gearshape: 'cog-outline',
  sparkles: 'creation',
  at: 'at',
}

const FALLBACK_ICON: MaterialIconName = 'help-circle-outline'

type SymbolIconProps = {
  name: IconName
  size: number
  color?: ColorValue
  weight?: IconWeight
  style?: StyleProp<TextStyle>
}

export function SymbolIcon({ name, size, color, style }: SymbolIconProps) {
  return (
    <MaterialCommunityIcons
      name={MATERIAL_EQUIVALENT[name] ?? FALLBACK_ICON}
      size={size}
      color={color as string}
      style={style}
    />
  )
}
