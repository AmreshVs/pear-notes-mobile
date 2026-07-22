import type { DownloadItem } from '@/components/backup/DownloadsSection'

export function getDownloadStatusKey(download: DownloadItem): string | null {
  if (!download.sourceOnline) return 'storage.waitingForDevice'
  if (download.status === 'paused') return 'storage.paused'
  if (download.status === 'error') return 'storage.transferFailed'
  if (download.status === 'downloading' && download.stalled) return 'storage.stalled'
  return null
}
