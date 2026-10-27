import { buildNoteSections } from '../src/utils/noteSections'

const DAY = 86_400_000
const key = (k: string) => k

describe('buildNoteSections', () => {
  it('groups notes pinned, today, yesterday, last 7 days, older', () => {
    const now = Date.now()
    const note = (id: string, ago: number, pinned = false) => ({
      id,
      value: { updatedAt: now - ago, pinned },
    })
    const sections = buildNoteSections(
      [
        note('p', 30 * DAY, true),
        note('t', 1000),
        note('y', DAY + 1000),
        note('w', 4 * DAY),
        note('o', 30 * DAY),
      ],
      key,
      false,
    )
    expect(sections.map((s) => [s.title, s.data.map((n) => n.id)])).toEqual([
      ['folderView.sections.pinned', ['p']],
      ['folderView.sections.today', ['t']],
      ['folderView.sections.yesterday', ['y']],
      ['folderView.sections.last7Days', ['w']],
      ['folderView.sections.older', ['o']],
    ])
  })

  it('ignores pinning in trash', () => {
    const sections = buildNoteSections(
      [{ id: 'a', value: { updatedAt: Date.now(), pinned: true } }],
      key,
      true,
    )
    expect(sections.map((s) => s.title)).toEqual(['folderView.sections.today'])
  })
})
