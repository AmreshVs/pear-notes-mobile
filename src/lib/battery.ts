type BatteryModule = typeof import('expo-battery')

export function loadBattery(): BatteryModule | null {
  try {
    return require('expo-battery') as BatteryModule
  } catch {
    return null
  }
}

export const isPluggedInState = (battery: BatteryModule, state: number) =>
  state === battery.BatteryState.CHARGING ||
  state === battery.BatteryState.FULL ||
  state === battery.BatteryState.NOT_CHARGING

export async function isPluggedIn(): Promise<boolean> {
  const battery = loadBattery()
  if (!battery) return false
  const state = await battery.getBatteryStateAsync().catch(() => battery.BatteryState.UNKNOWN)
  return isPluggedInState(battery, state)
}
