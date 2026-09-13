import { useCallback, useEffect, useRef } from 'react'
import { AppState, Linking } from 'react-native'
import { useSelector } from 'react-redux'
import { router, usePathname } from 'expo-router'

import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import { getIsLoading as getNotesLoading } from '@pear-notes/core/store/slices/notesSlice.js'

import { isNativeShareImportActive, subscribeToNativeShareInbox } from '@/lib/shareInbox'
import type { ShareInboxChange, SharePayload } from '@/lib/shareIntake.types'
import { refreshShareIntake, setSharePreparing } from '@/lib/shareIntakeState'
import { isShareIntakeUrl } from '@/utils/shareIntakeUrl'

const ALL_NOTES_PATH = `/folder/${ALL_NOTES_KEY}`
const HIDDEN_ROUTE_PREFIX = '/settings'
const ACTIVE_APP_STATE = 'active'
const FRESH_SHARE_WINDOW_MS = 2 * 60 * 1000
const NOTE_CLOSE_NAVIGATION_DELAY_MS = 350

const announcedPayloadIds = new Set<string>()

type ShareIntakeControllerOptions = {
  isNoteOpen: boolean
  closeNote: () => void
  onUnreadableItems: (count: number) => void
}

export function useShareIntakeController({
  isNoteOpen,
  closeNote,
  onUnreadableItems,
}: ShareIntakeControllerOptions) {
  const notesLoading = useSelector(getNotesLoading) as boolean
  const pathname = usePathname()

  const isNoteOpenRef = useRef(isNoteOpen)
  const closeNoteRef = useRef(closeNote)
  const onUnreadableItemsRef = useRef(onUnreadableItems)
  const pathnameRef = useRef(pathname)
  const notesLoadingRef = useRef(notesLoading)
  const pendingNavigationRef = useRef(false)
  const navigatedWhilePreparingRef = useRef(false)

  isNoteOpenRef.current = isNoteOpen
  closeNoteRef.current = closeNote
  onUnreadableItemsRef.current = onUnreadableItems
  pathnameRef.current = pathname

  const showAllNotes = useCallback(() => {
    if (notesLoadingRef.current) {
      pendingNavigationRef.current = true
      return
    }
    pendingNavigationRef.current = false
    if (pathnameRef.current.startsWith(HIDDEN_ROUTE_PREFIX)) return

    const wasNoteOpen = isNoteOpenRef.current
    const navigateToAllNotes = () => {
      if (pathnameRef.current !== ALL_NOTES_PATH) router.navigate(ALL_NOTES_PATH as any)
    }
    if (!wasNoteOpen) {
      navigateToAllNotes()
      return
    }
    closeNoteRef.current()
    setTimeout(navigateToAllNotes, NOTE_CLOSE_NAVIGATION_DELAY_MS)
  }, [])

  const announceFreshPayloads = useCallback(
    (payloads: SharePayload[]) => {
      const now = Date.now()
      const unseen = payloads.filter((payload) => !announcedPayloadIds.has(payload.id))
      unseen.forEach((payload) => announcedPayloadIds.add(payload.id))
      const fresh = unseen.filter((payload) => now - payload.createdAt <= FRESH_SHARE_WINDOW_MS)

      const skippedCount = fresh.reduce((total, payload) => total + payload.skipped, 0)
      if (skippedCount > 0) onUnreadableItemsRef.current(skippedCount)

      const alreadyNavigated = navigatedWhilePreparingRef.current
      if (!isNativeShareImportActive()) navigatedWhilePreparingRef.current = false
      if (fresh.length > 0 && !alreadyNavigated) showAllNotes()
    },
    [showAllNotes],
  )

  const syncInbox = useCallback(() => {
    refreshShareIntake().then(announceFreshPayloads)
  }, [announceFreshPayloads])

  const handleNativeInboxChange = useCallback(
    (change: ShareInboxChange) => {
      setSharePreparing(change.preparing)
      if (change.unreadableCount > 0) onUnreadableItemsRef.current(change.unreadableCount)
      if (change.preparing && !navigatedWhilePreparingRef.current) {
        navigatedWhilePreparingRef.current = true
        showAllNotes()
      }
      if (!change.preparing) syncInbox()
    },
    [showAllNotes, syncInbox],
  )

  useEffect(() => {
    const unsubscribeNativeInbox = subscribeToNativeShareInbox(handleNativeInboxChange)
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === ACTIVE_APP_STATE) syncInbox()
    })
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      if (isShareIntakeUrl(url)) syncInbox()
    })
    syncInbox()
    return () => {
      unsubscribeNativeInbox()
      appStateSubscription.remove()
      linkSubscription.remove()
    }
  }, [handleNativeInboxChange, syncInbox])

  useEffect(() => {
    notesLoadingRef.current = notesLoading
    if (!notesLoading && pendingNavigationRef.current) showAllNotes()
  }, [notesLoading, showAllNotes])
}
