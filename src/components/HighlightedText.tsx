import { memo, useCallback, useMemo } from 'react'
import { type StyleProp, Text, type TextStyle } from 'react-native'

import { findTermRanges, toHighlightSegments } from '@pear-notes/core/backend/noteSearch.js'

interface HighlightSegment {
  text: string
  match: boolean
}

interface HighlightedTextProps {
  text: string
  terms?: string[]
  ranges?: number[]
  highlightStyle: StyleProp<TextStyle>
}

export const HighlightedText = memo(function HighlightedText({
  text,
  terms,
  ranges,
  highlightStyle,
}: HighlightedTextProps) {
  const segments = useMemo<HighlightSegment[]>(
    () => toHighlightSegments(text, ranges ?? findTermRanges(text, terms ?? [])),
    [text, terms, ranges],
  )

  const renderSegment = useCallback(
    (segment: HighlightSegment, index: number) =>
      segment.match ? (
        <Text key={index} style={highlightStyle}>
          {segment.text}
        </Text>
      ) : (
        segment.text
      ),
    [highlightStyle],
  )

  return <>{segments.map(renderSegment)}</>
})
