import { fireEvent, screen } from '@testing-library/react-native'

import { FloatingNoticeBanner } from '../src/components/FloatingNoticeBanner'

import { renderWithStore } from './renderWithStore'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

const baseProps = {
  icon: { ios: 'info.circle', android: 'information' },
  title: 'Update available',
  description: 'A new version is ready',
  actionLabel: 'Update',
  onAction: jest.fn(),
  dismissLabel: 'Dismiss',
  onDismiss: jest.fn(),
} as any

describe('FloatingNoticeBanner', () => {
  it('shows the notice and runs its action', async () => {
    const onAction = jest.fn()
    await renderWithStore(<FloatingNoticeBanner {...baseProps} onAction={onAction} />)
    expect(screen.getByText('Update available')).toBeTruthy()
    expect(screen.getByText('A new version is ready')).toBeTruthy()
    await fireEvent.press(screen.getByText('Update'))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('can be dismissed', async () => {
    const onDismiss = jest.fn()
    await renderWithStore(<FloatingNoticeBanner {...baseProps} onDismiss={onDismiss} />)
    await fireEvent.press(screen.getByLabelText('Dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('shows the second action only when it is fully provided', async () => {
    const onSecondary = jest.fn()
    await renderWithStore(
      <FloatingNoticeBanner {...baseProps} secondaryLabel="Later" onSecondary={onSecondary} />,
    )
    await fireEvent.press(screen.getByText('Later'))
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })

  it('hides the second action without a handler', async () => {
    await renderWithStore(<FloatingNoticeBanner {...baseProps} secondaryLabel="Later" />)
    expect(screen.queryByText('Later')).toBeNull()
  })
})
