import { useEffect, useState } from 'react'

import { type DeviceAuthMethod, getDeviceAuthMethod } from '@/lib/deviceAuth'
import {
  type NoteLockPromptKind,
  resolveNoteLockPrompt,
  useNoteLockPrompt,
} from '@/lib/noteLockPrompt'

type NoteLockPromptCopy = { title: string; body: string; confirm: string }

const PROMPT_COPY: Record<NoteLockPromptKind, NoteLockPromptCopy> = {
  migration: {
    title: 'noteLockPrompt.migrationTitle',
    body: 'noteLockPrompt.migrationBody',
    confirm: 'noteLockPrompt.setPassword',
  },
  biometricOffer: {
    title: 'noteLockPrompt.biometricTitle',
    body: 'noteLockPrompt.biometricBody',
    confirm: 'noteLockPrompt.useBiometric',
  },
  changeSuggested: {
    title: 'noteLockPrompt.changeTitle',
    body: 'noteLockPrompt.changeBody',
    confirm: 'noteLockPrompt.changePassword',
  },
}

export const declineNoteLockPrompt = () => resolveNoteLockPrompt(false)
export const acceptNoteLockPrompt = () => resolveNoteLockPrompt(true)

export function useNoteLockPromptModal() {
  const kind = useNoteLockPrompt()
  const [deviceMethod, setDeviceMethod] = useState<DeviceAuthMethod>('none')

  useEffect(() => {
    if (kind) getDeviceAuthMethod().then(setDeviceMethod)
  }, [kind])

  return {
    visible: kind !== null,
    isOffer: kind === 'biometricOffer',
    copy: PROMPT_COPY[kind ?? 'migration'],
    deviceMethod,
  }
}
