import type { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react-native'

import settingsReducer from '@pear-notes/core/store/slices/settingsSlice.js'

export function renderWithStore(ui: ReactElement) {
  const store = configureStore({ reducer: { settings: settingsReducer } })
  return render(<Provider store={store}>{ui}</Provider>)
}
