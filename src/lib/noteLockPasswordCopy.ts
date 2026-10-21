export type NoteLockPasswordCopy = {
  title: string
  desc: string
  placeholder: string
  button: string
}

const CREATE_COPY: Record<string, NoteLockPasswordCopy> = {
  set: {
    title: 'noteLockPassword.createTitle',
    desc: 'noteLockPassword.createDesc',
    placeholder: 'noteLockPassword.placeholder',
    button: 'noteLockPassword.createButton',
  },
  change: {
    title: 'noteLockPassword.changeTitle',
    desc: 'noteLockPassword.createDesc',
    placeholder: 'noteLockPassword.placeholderNew',
    button: 'noteLockPassword.changeButton',
  },
}

const ENTER_COPY: Record<string, NoteLockPasswordCopy> = {
  unlock: {
    title: 'noteLockPassword.enterTitle',
    desc: 'noteLockPassword.enterDesc',
    placeholder: 'noteLockPassword.placeholder',
    button: 'noteLockPassword.unlockButton',
  },
  lock: {
    title: 'noteLockPassword.enterTitle',
    desc: 'noteLockPassword.enterLockDesc',
    placeholder: 'noteLockPassword.placeholder',
    button: 'noteLockPassword.lockButton',
  },
  change: {
    title: 'noteLockPassword.enterTitle',
    desc: 'noteLockPassword.enterChangeDesc',
    placeholder: 'noteLockPassword.currentPlaceholder',
    button: 'noteLockPassword.continueButton',
  },
  biometric: {
    title: 'noteLockPassword.enterTitle',
    desc: 'noteLockPassword.enterDesc',
    placeholder: 'noteLockPassword.placeholder',
    button: 'noteLockPassword.continueButton',
  },
}

export function getNoteLockPasswordCopy(isCreate: boolean, purpose?: string): NoteLockPasswordCopy {
  if (isCreate) return CREATE_COPY[purpose ?? ''] ?? CREATE_COPY.set
  return ENTER_COPY[purpose ?? ''] ?? ENTER_COPY.unlock
}
