import { fireEvent, screen } from '@testing-library/react-native'

import { FolderEmptyState } from '../src/components/FolderEmptyState'

import { renderWithStore } from './renderWithStore'

const baseProps = {
  containerStyle: undefined,
  hasSearchQuery: false,
  isTrash: false,
  showOnboarding: false,
  onCreateNote: jest.fn(),
  onLinkDevice: jest.fn(),
  onRestoreBackup: jest.fn(),
}

describe('FolderEmptyState', () => {
  it('tells the user a search found nothing', async () => {
    await renderWithStore(<FolderEmptyState {...baseProps} hasSearchQuery />)
    expect(screen.getByText('folderView.empty.noMatchesTitle')).toBeTruthy()
  })

  it('explains an empty trash', async () => {
    await renderWithStore(<FolderEmptyState {...baseProps} isTrash />)
    expect(screen.getByText('folderView.empty.trashEmptyTitle')).toBeTruthy()
  })

  it('offers new note, link device and restore on a fresh install', async () => {
    const onCreateNote = jest.fn()
    const onLinkDevice = jest.fn()
    const onRestoreBackup = jest.fn()
    await renderWithStore(
      <FolderEmptyState
        {...baseProps}
        showOnboarding
        onCreateNote={onCreateNote}
        onLinkDevice={onLinkDevice}
        onRestoreBackup={onRestoreBackup}
      />,
    )
    await fireEvent.press(screen.getByText('folderView.empty.newNoteBtn'))
    await fireEvent.press(screen.getByText('folderView.empty.connectBtn'))
    await fireEvent.press(screen.getByText('folderView.empty.restoreBtn'))
    expect(onCreateNote).toHaveBeenCalledTimes(1)
    expect(onLinkDevice).toHaveBeenCalledTimes(1)
    expect(onRestoreBackup).toHaveBeenCalledTimes(1)
  })

  it('shows the plain empty message otherwise', async () => {
    await renderWithStore(<FolderEmptyState {...baseProps} />)
    expect(screen.getByText('folderView.empty.noNotesTitle')).toBeTruthy()
  })
})
