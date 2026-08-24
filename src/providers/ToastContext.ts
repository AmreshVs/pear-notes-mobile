import { createContext, useContext } from 'react'

type ToastContextType = {
  showToast: (message: string) => void
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast(): ToastContextType {
  return useContext(ToastContext)
}
