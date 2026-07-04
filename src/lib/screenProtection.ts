import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture'

const SCREEN_PROTECTION_TAG = 'locked-note'

export async function enableScreenshotProtection(): Promise<void> {
  try {
    await preventScreenCaptureAsync(SCREEN_PROTECTION_TAG)
  } catch {}
}

export async function disableScreenshotProtection(): Promise<void> {
  try {
    await allowScreenCaptureAsync(SCREEN_PROTECTION_TAG)
  } catch {}
}
