type TranslateFn = (key: string) => string

export type NoteSection = { title: string; data: any[] }

const DAY_MS = 86_400_000

export function buildNoteSections(
  notes: any[],
  t: TranslateFn,
  isTrashFolder: boolean,
): NoteSection[] {
  const sections: Record<string, any[]> = {
    [t('folderView.sections.pinned')]: [],
    [t('folderView.sections.today')]: [],
    [t('folderView.sections.yesterday')]: [],
    [t('folderView.sections.last7Days')]: [],
    [t('folderView.sections.older')]: [],
  }
  const now = Date.now()

  notes.forEach((note: any) => {
    if (!isTrashFolder && note.value?.pinned === true) {
      sections[t('folderView.sections.pinned')].push(note)
      return
    }
    const diff = now - (note.value?.updatedAt || note.value?.createdAt || 0)
    if (diff < DAY_MS) sections[t('folderView.sections.today')].push(note)
    else if (diff < 2 * DAY_MS) sections[t('folderView.sections.yesterday')].push(note)
    else if (diff < 7 * DAY_MS) sections[t('folderView.sections.last7Days')].push(note)
    else sections[t('folderView.sections.older')].push(note)
  })

  return Object.entries(sections)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }))
}
