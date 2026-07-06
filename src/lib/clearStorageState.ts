type Listener = (isClearing: boolean) => void

const listeners = new Set<Listener>()
let isClearing = false

export const clearStorageState = {
  setClearing(val: boolean) {
    isClearing = val
    listeners.forEach((l) => l(val))
  },
  getClearing() {
    return isClearing
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
