import type { ScrollJumpDirection } from '@/components/TiptapEditor'

export type ScrollJumpButtonProps = {
  direction: ScrollJumpDirection | null
  bottom: number
  onJump: () => void
}
