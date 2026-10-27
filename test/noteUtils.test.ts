import { isChecklistNote } from '../src/utils/noteUtils'

describe('isChecklistNote', () => {
  it('is true only for notes with task items', () => {
    expect(isChecklistNote('<ul data-type="taskList"><li data-type="taskItem">x</li></ul>')).toBe(
      true,
    )
    expect(isChecklistNote('<p>plain</p>')).toBe(false)
    expect(isChecklistNote('')).toBe(false)
  })
})
