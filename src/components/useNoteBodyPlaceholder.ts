import { useSelector } from 'react-redux'

import { getEditorFontSize } from '@pear-notes/core/store/slices/settingsSlice.js'
import { getNoteSummary } from '@pear-notes/core/utils.js'

import { useFontScale } from '@/components/Themed'
import { Durations } from '@/constants/commonStyles'
import { useDelayedFlag } from '@/hooks/useDelayedFlag'

export const PLACEHOLDER_TITLE_SCALE = 1.65
export const PLACEHOLDER_TITLE_LINE_HEIGHT = 1.2
export const PLACEHOLDER_BODY_LINE_HEIGHT = 1.65

export const useEditorFontSize = () => {
  const editorFontSize = useSelector(getEditorFontSize) as number
  const fontScale = useFontScale()
  return Math.round(editorFontSize * fontScale)
}

export function useNoteBodyPlaceholder(noteValue: object | null | undefined) {
  const showShimmer = useDelayedFlag(Durations.loadingIndicatorDelay)
  const title = (noteValue as { title?: string } | null)?.title || ''
  const preview = (getNoteSummary(noteValue) as { preview?: string }).preview || ''
  return { title, preview, showShimmer }
}
