import React from 'react'
import { BottomSheetModalProvider } from '@expo/ui/community/bottom-sheet'

export function SheetProvider({ children }: { children: React.ReactNode }) {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
}
