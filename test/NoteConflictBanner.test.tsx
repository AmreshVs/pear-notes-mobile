import { fireEvent, screen } from '@testing-library/react-native'

import { NoteConflictBanner } from '../src/components/NoteConflictBanner'
import { useNoteConflict } from '../src/components/useNoteConflict'

import { renderWithStore } from './renderWithStore'

jest.mock('../src/components/useNoteConflict')
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

const mockedUseNoteConflict = useNoteConflict as jest.Mock

describe('NoteConflictBanner', () => {
  it('shows nothing when there is no conflict', async () => {
    mockedUseNoteConflict.mockReturnValue({ isVisible: false })
    await renderWithStore(<NoteConflictBanner noteKey="n1" />)
    expect(screen.queryByText('noteEditor.conflict.title')).toBeNull()
  })

  it('lets the user keep their version or take the other one', async () => {
    const keepMine = jest.fn()
    const useTheirs = jest.fn()
    mockedUseNoteConflict.mockReturnValue({ isVisible: true, keepMine, useTheirs })
    await renderWithStore(<NoteConflictBanner noteKey="n1" />)
    expect(screen.getByText('noteEditor.conflict.title')).toBeTruthy()
    await fireEvent.press(screen.getByText('noteEditor.conflict.keepMine'))
    expect(keepMine).toHaveBeenCalledTimes(1)
    await fireEvent.press(screen.getByText('noteEditor.conflict.useTheirs'))
    expect(useTheirs).toHaveBeenCalledTimes(1)
  })
})
