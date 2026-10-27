import { Text } from 'react-native'
import { render, screen } from '@testing-library/react-native'

import { HighlightedText } from '../src/components/HighlightedText'

const highlightStyle = { color: 'red' }

describe('HighlightedText', () => {
  it('highlights only the matching words', async () => {
    await render(
      <Text>
        <HighlightedText
          text="Buy milk and eggs"
          terms={['milk']}
          highlightStyle={highlightStyle}
        />
      </Text>,
    )
    expect(screen.getByText('milk')).toHaveStyle(highlightStyle)
    expect(screen.getByText('Buy milk and eggs')).toBeTruthy()
    expect(screen.queryByText('Buy')).toBeNull()
  })

  it('shows the text as is when nothing matches', async () => {
    await render(
      <Text>
        <HighlightedText text="Nothing here" terms={['zzz']} highlightStyle={highlightStyle} />
      </Text>,
    )
    expect(screen.getByText('Nothing here')).toBeTruthy()
  })
})
