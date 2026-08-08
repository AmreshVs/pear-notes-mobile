import * as Haptics from 'expo-haptics'

import { backendApi } from '@pear-notes/core/backend/api.js'

export const HAPTICS_ENABLED_KEY = 'hapticsEnabled'

let hapticsEnabled = true

export function isHapticsEnabled(): boolean {
  return hapticsEnabled
}

export async function loadHapticsPreference(): Promise<boolean> {
  try {
    const value = await backendApi.getPreference({ key: HAPTICS_ENABLED_KEY })
    hapticsEnabled = value !== 'false'
  } catch {
    hapticsEnabled = true
  }
  return hapticsEnabled
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  hapticsEnabled = enabled
  try {
    await backendApi.updatePreference({
      key: HAPTICS_ENABLED_KEY,
      value: enabled ? 'true' : 'false',
    })
  } catch {}
}

function trigger(effect: () => Promise<void>) {
  if (!hapticsEnabled) return
  effect().catch(() => {})
}

export function hapticSelection() {
  trigger(() => Haptics.selectionAsync())
}

export function hapticLight() {
  trigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

export function hapticMedium() {
  trigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
}

export function hapticHeavy() {
  trigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
}

export function hapticSuccess() {
  trigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
}

export function hapticWarning() {
  trigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
}

export function hapticError() {
  trigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
}
