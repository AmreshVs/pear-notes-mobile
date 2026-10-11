import { useSelector } from 'react-redux'

import { selectAiSuggestionOn } from '@pear-notes/core/store/slices/localAiSlice.js'

export function useAiSuggestionOn(kind: string): boolean {
  return useSelector((state) => selectAiSuggestionOn(state, kind)) as boolean
}
