type Listener = (invite: string | null) => void

const listeners = new Set<Listener>()
let pendingInvite: string | null = null

export const pendingInviteState = {
  setPendingInvite(val: string | null) {
    pendingInvite = val
    listeners.forEach((l) => l(val))
  },
  getPendingInvite() {
    return pendingInvite
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
