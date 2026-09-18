import { Keyboard } from 'react-native'

export const KEYBOARD_HIDE_TIMEOUT_MS = 450

const keyboardHiddenListeners = new Set<() => void>()

export function subscribeKeyboardHidden(listener: () => void): () => void {
  keyboardHiddenListeners.add(listener)
  return () => {
    keyboardHiddenListeners.delete(listener)
  }
}

export function notifyKeyboardHidden(): void {
  for (const listener of Array.from(keyboardHiddenListeners)) listener()
}

export function dismissKeyboard(): void {
  notifyKeyboardHidden()
  Keyboard.dismiss()
}
