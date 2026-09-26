import React, { useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { Snackbar } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Durations, Radii, UI_SIZE_8 } from '@/constants/commonStyles'
import { useToastBottomOffset } from '@/lib/toastOffset'
import { ToastContext } from '@/providers/ToastContext'
import { useToastState } from '@/providers/useToastState'

export { useToast } from '@/providers/ToastContext'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  const { visible, message, value, hideToast } = useToastState()

  const bottomOffset = useToastBottomOffset()

  const wrapperStyle = useMemo(
    () => ({ bottom: bottomOffset ?? insets.bottom + UI_SIZE_8 }),
    [bottomOffset, insets.bottom],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={hideToast}
        duration={Durations.toast}
        style={styles.snackbar}
        wrapperStyle={wrapperStyle}
      >
        {message}
      </Snackbar>
    </ToastContext.Provider>
  )
}

const styles = StyleSheet.create({
  snackbar: {
    borderRadius: Radii.md,
  },
})
