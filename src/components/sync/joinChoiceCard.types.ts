import type { JoinChoice } from '@/lib/vaults.types'

export type JoinChoiceCardProps = {
  vaultName: string
  choice: JoinChoice | null
  canKeepSeparate: boolean
  maxVaults: number
  onSelect: (choice: JoinChoice) => void
}
