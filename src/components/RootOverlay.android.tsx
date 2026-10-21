import type { ReactNode } from 'react'
import { Modal } from 'react-native'

type RootOverlayProps = {
  visible: boolean
  onRequestClose: () => void
  children: ReactNode
}

export function RootOverlay({ visible, onRequestClose, children }: RootOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  )
}
