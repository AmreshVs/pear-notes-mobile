import { FOLDER_ICONS } from '@pear-notes/core/constant.js'

import type { IconName } from '@/components/SymbolIcon.types'

export const FOLDER_ICON_SF: Record<string, IconName> = {
  folder: 'folder',
  briefcase: 'briefcase',
  home: 'house',
  people: 'person.2',
  idea: 'lightbulb',
  tasks: 'checklist',
  calendar: 'calendar',
  book: 'book',
  study: 'graduationcap',
  code: 'chevron.left.forwardslash.chevron.right',
  design: 'paintbrush',
  project: 'flask',
  chart: 'chart.bar',
  finance: 'creditcard',
  shopping: 'cart',
  recipes: 'fork.knife',
  travel: 'airplane',
  health: 'heart.text.square',
  star: 'star',
  archive: 'archivebox',
  heart: 'heart',
  music: 'music.note',
  camera: 'camera',
  film: 'film',
  mic: 'mic',
  pets: 'pawprint',
  leaf: 'leaf',
  coffee: 'cup.and.saucer',
  fitness: 'figure.run',
  target: 'target',
  globe: 'globe',
  building: 'building.2',
  gift: 'gift',
  map: 'map',
  trophy: 'trophy',
  allNotes: 'doc.text',
  attachments: 'paperclip',
  duplicates: 'doc.on.doc',
  recap: 'clock.arrow.circlepath',
  trash: 'trash',
}

export const FOLDER_ICON_MATERIAL: Record<string, string> = {
  folder: 'folder-outline',
  briefcase: 'briefcase-outline',
  home: 'home-outline',
  people: 'account-group-outline',
  idea: 'lightbulb-outline',
  tasks: 'format-list-checks',
  calendar: 'calendar-outline',
  book: 'book-open-outline',
  study: 'school-outline',
  code: 'code-tags',
  design: 'brush-outline',
  project: 'flask-outline',
  chart: 'chart-bar',
  finance: 'wallet-outline',
  shopping: 'cart-outline',
  recipes: 'silverware-fork-knife',
  travel: 'airplane',
  health: 'heart-pulse',
  star: 'star-outline',
  archive: 'archive-outline',
  heart: 'heart-outline',
  music: 'music-note-outline',
  camera: 'camera-outline',
  film: 'filmstrip',
  mic: 'microphone-outline',
  pets: 'paw',
  leaf: 'leaf',
  coffee: 'coffee-outline',
  fitness: 'dumbbell',
  target: 'target',
  globe: 'earth',
  building: 'office-building-outline',
  gift: 'gift-outline',
  map: 'map-outline',
  trophy: 'trophy-outline',
  allNotes: 'text-box-multiple-outline',
  attachments: 'paperclip',
  duplicates: 'content-copy',
  recap: 'history',
  trash: 'delete-outline',
}

export const FALLBACK_FOLDER_SF: IconName = 'folder'
export const FALLBACK_FOLDER_MATERIAL = 'folder-outline'

export const FOLDER_ICON_COLUMNS = 5

export const FOLDER_ICON_ROWS: (string | null)[][] = FOLDER_ICONS.reduce<(string | null)[][]>(
  (rows, icon, index) => {
    if (index % FOLDER_ICON_COLUMNS === 0) rows.push([])
    rows[rows.length - 1].push(icon)
    return rows
  },
  [],
).map((row) => {
  const padded: (string | null)[] = [...row]
  while (padded.length < FOLDER_ICON_COLUMNS) padded.push(null)
  return padded
})
