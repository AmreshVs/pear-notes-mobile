import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { Snackbar } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type ToastContextType = {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast(): ToastContextType {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const insets = useSafeAreaInsets()

  const showToast = useCallback((msg: string) => {
    setMessage(msg)
    setVisible(true)
  }, [])

  const handleDismiss = useCallback(() => {
    setVisible(false)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  const wrapperStyle = useMemo(
    () => ({ bottom: Platform.OS === 'android' ? insets.bottom + 8 : insets.bottom }),
    [insets.bottom],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        visible={visible}
        onDismiss={handleDismiss}
        duration={3000}
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
    borderRadius: 12,
  },
})
