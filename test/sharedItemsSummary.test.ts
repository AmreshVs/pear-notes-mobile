import { buildSharedTrayLabels } from '../src/utils/sharedItemsSummary'

const t = ((key: string, options?: { count?: number }) =>
  options ? `${key}:${options.count}` : key) as any

describe('buildSharedTrayLabels', () => {
  it('says preparing before any item arrives', () => {
    expect(
      buildSharedTrayLabels({ itemCount: 0, showAddAction: true, categoryCounts: [] }, t),
    ).toEqual({ title: 'shareIntake.preparing', subtitle: null })
  })

  it('lists what was shared when it can be added to a note', () => {
    const labels = buildSharedTrayLabels(
      {
        itemCount: 3,
        showAddAction: true,
        categoryCounts: [
          ['photo', 2],
          ['link', 1],
        ],
      },
      t,
    )
    expect(labels.title).toBe('shareIntake.itemCount:3')
    expect(labels.subtitle).toBe('shareIntake.categories.photo:2, shareIntake.categories.link:1')
  })

  it('hints to open a note when adding is not possible yet', () => {
    const labels = buildSharedTrayLabels(
      { itemCount: 1, showAddAction: false, categoryCounts: [] },
      t,
    )
    expect(labels.subtitle).toBe('shareIntake.openNoteHint')
  })
})
