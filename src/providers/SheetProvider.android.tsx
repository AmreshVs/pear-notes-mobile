import { BottomSheetModalProvider } from '@expo/ui/community/bottom-sheet'
import React from 'react'

export function SheetProvider({ children }: { children: React.ReactNode }) {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
}
