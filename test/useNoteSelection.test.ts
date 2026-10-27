import { act, renderHook } from '@testing-library/react-native'

import { useNoteSelection } from '../src/hooks/useNoteSelection'

const KEYS = ['a', 'b', 'c']

describe('useNoteSelection', () => {
  it('starts with nothing selected', async () => {
    const { result } = await renderHook(() => useNoteSelection('folder', KEYS))
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.selectedCount).toBe(0)
  })

  it('starts selecting with the pressed note and toggles others', async () => {
    const { result } = await renderHook(() => useNoteSelection('folder', KEYS))
    await act(async () => result.current.startSelecting('a'))
    expect(result.current.isSelecting).toBe(true)
    expect(result.current.selectedKeys).toEqual(['a'])

    await act(async () => result.current.toggleSelect('b'))
    expect(result.current.selectedKeys).toEqual(['a', 'b'])
    await act(async () => result.current.toggleSelect('a'))
    expect(result.current.selectedKeys).toEqual(['b'])
  })

  it('selects all, reports it, and clears', async () => {
    const { result } = await renderHook(() => useNoteSelection('folder', KEYS))
    await act(async () => result.current.selectAll())
    expect(result.current.isAllSelected).toBe(true)
    expect(result.current.selectedCount).toBe(3)

    await act(async () => result.current.clearSelection())
    expect(result.current.isSelecting).toBe(true)
    expect(result.current.selectedCount).toBe(0)

    await act(async () => result.current.exitSelection())
    expect(result.current.isSelecting).toBe(false)
  })

  it('drops notes that disappear from the list', async () => {
    const { result, rerender } = await renderHook(
      ({ keys }: { keys: string[] }) => useNoteSelection('folder', keys),
      { initialProps: { keys: KEYS } },
    )
    await act(async () => result.current.selectAll())
    await rerender({ keys: ['a', 'c'] })
    expect(result.current.selectedKeys).toEqual(['a', 'c'])
    expect(result.current.isAllSelected).toBe(true)
  })

  it('ends the selection when the user opens another folder', async () => {
    const { result, rerender } = await renderHook(
      ({ folder }: { folder: string }) => useNoteSelection(folder, KEYS),
      { initialProps: { folder: 'one' } },
    )
    await act(async () => result.current.startSelecting('a'))
    await rerender({ folder: 'two' })
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.selectedKeys).toEqual([])
  })
})
