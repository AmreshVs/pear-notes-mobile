import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import React from 'react'

export function SheetProvider({ children }: { children: React.ReactNode }) {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
}
