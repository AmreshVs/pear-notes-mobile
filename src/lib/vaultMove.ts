import { Alert } from 'react-native'
import type { TFunction } from 'i18next'

export function getVaultMoveQuestion(name: string, noteCount: number, t: TFunction): string {
  return t('vaults.move.confirmNotes', { count: noteCount, name })
}

export function confirmVaultMove(
  name: string,
  noteCount: number,
  t: TFunction,
  onConfirm: () => void,
): void {
  Alert.alert(getVaultMoveQuestion(name, noteCount, t), t('vaults.move.explain', { name }), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('vaults.move.confirmBtn'), onPress: onConfirm },
  ])
}
