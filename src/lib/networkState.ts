import * as Network from 'expo-network'

export type ConnectionKind = 'wifi' | 'cellular' | 'other' | 'offline' | 'unknown'

function toConnectionKind(
  type: Network.NetworkStateType | undefined,
  isConnected?: boolean | null,
) {
  if (isConnected === false) return 'offline' as ConnectionKind
  switch (type) {
    case Network.NetworkStateType.WIFI:
      return 'wifi' as ConnectionKind
    case Network.NetworkStateType.CELLULAR:
      return 'cellular' as ConnectionKind
    case Network.NetworkStateType.NONE:
      return 'offline' as ConnectionKind
    case Network.NetworkStateType.UNKNOWN:
    case undefined:
      return 'unknown' as ConnectionKind
    default:
      return 'other' as ConnectionKind
  }
}

export async function getConnectionKind(): Promise<ConnectionKind> {
  try {
    const state = await Network.getNetworkStateAsync()
    return toConnectionKind(state.type, state.isConnected)
  } catch {
    return 'unknown'
  }
}

export function subscribeConnectionKind(listener: (kind: ConnectionKind) => void): () => void {
  let subscription: { remove: () => void } | null = null
  try {
    subscription = Network.addNetworkStateListener(({ type, isConnected }) => {
      listener(toConnectionKind(type, isConnected))
    })
  } catch {
    subscription = null
  }
  return () => {
    subscription?.remove()
  }
}
