type TranslateFn = (key: string) => string

export type NoteSection = { title: string; data: any[]; meaning?: boolean }

type CountTranslateFn = (key: string, options: { count: number }) => string

export function buildSearchSections(
  notes: any[],
  meaningRows: any[],
  t: CountTranslateFn,
): NoteSection[] {
  const sections: NoteSection[] = []
  if (notes.length > 0) {
    sections.push({
      title: t('search.sections.words', { count: notes.length }),
      data: notes.map((note) => ({ ...note, matchReason: 'exact' })),
    })
  }
  if (meaningRows.length > 0) {
    sections.push({
      title: t('search.sections.meaning', { count: meaningRows.length }),
      data: meaningRows.map((note) => ({ ...note, matchReason: 'meaning' })),
      meaning: true,
    })
  }
  return sections
}

const DAY_MS = 86_400_000

export function buildNoteSections(
  notes: any[],
  t: TranslateFn,
  isTrashFolder: boolean,
): NoteSection[] {
  const pinned: any[] = []
  const today: any[] = []
  const yesterday: any[] = []
  const last7Days: any[] = []
  const older: any[] = []
  const now = Date.now()

  notes.forEach((note: any) => {
    if (!isTrashFolder && note.value?.pinned === true) {
      pinned.push(note)
      return
    }
    const diff = now - (note.value?.updatedAt || note.value?.createdAt || 0)
    if (diff < DAY_MS) today.push(note)
    else if (diff < 2 * DAY_MS) yesterday.push(note)
    else if (diff < 7 * DAY_MS) last7Days.push(note)
    else older.push(note)
  })

  const sections: NoteSection[] = []
  if (pinned.length > 0) sections.push({ title: t('folderView.sections.pinned'), data: pinned })
  if (today.length > 0) sections.push({ title: t('folderView.sections.today'), data: today })
  if (yesterday.length > 0) {
    sections.push({ title: t('folderView.sections.yesterday'), data: yesterday })
  }
  if (last7Days.length > 0) {
    sections.push({ title: t('folderView.sections.last7Days'), data: last7Days })
  }
  if (older.length > 0) sections.push({ title: t('folderView.sections.older'), data: older })

  return sections
}

export function formatTimeOfDay(timestamp?: number): string {
  if (!timestamp) return ''
  try {
    return new Date(timestamp)
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      .toUpperCase()
  } catch {
    return ''
  }
}
