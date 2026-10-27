import { createScanPdf, isPdfAttachment } from '../src/lib/pdfTools'

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(async () => ({ size: 2048 })),
}))
jest.mock('../src/lib/noteAttachmentManager', () => ({
  cleanupCachedAttachment: jest.fn(),
  downloadToCache: jest.fn(),
  toBackendPath: (uri: string) => uri.replace('file://', ''),
}))
jest.mock('../src/lib/thumbnailCache', () => ({
  notifyThumbnailWritten: jest.fn(),
  requestThumbnail: jest.fn(),
  thumbnailPath: jest.fn(),
  writePageCount: jest.fn(),
}))
describe('isPdfAttachment', () => {
  it('recognises PDFs by type or by name', () => {
    expect(isPdfAttachment('scan', 'application/pdf')).toBe(true)
    expect(isPdfAttachment('Report.PDF')).toBe(true)
    expect(isPdfAttachment('photo.png', 'image/png')).toBe(false)
    expect(isPdfAttachment(null, null)).toBe(false)
  })
})

describe('createScanPdf', () => {
  it('reports clearly when the native PDF tools are not available', async () => {
    await expect(createScanPdf(['file:///a.jpg'], 'Receipt')).rejects.toThrow(
      'PDF_TOOLS_UNAVAILABLE',
    )
  })
})
