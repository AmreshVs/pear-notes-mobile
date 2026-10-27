import { fireEvent, screen } from '@testing-library/react-native'

import { ErrorScreen } from '../src/components/ErrorScreen'

import { renderWithStore } from './renderWithStore'

describe('ErrorScreen', () => {
  it('shows the message and retries when asked', async () => {
    const onRetry = jest.fn()
    await renderWithStore(<ErrorScreen message="Could not open your notes" onRetry={onRetry} />)
    expect(screen.getByText('Could not open your notes')).toBeTruthy()
    await fireEvent.press(screen.getByText('error.retry'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('offers the custom action instead of retry', async () => {
    const onRetry = jest.fn()
    const onPress = jest.fn()
    await renderWithStore(
      <ErrorScreen
        message="Update needed"
        onRetry={onRetry}
        action={{ label: 'Open store', onPress }}
      />,
    )
    expect(screen.queryByText('error.retry')).toBeNull()
    await fireEvent.press(screen.getByText('Open store'))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(onRetry).not.toHaveBeenCalled()
  })
})
