import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useFocusEffect } from 'expo-router'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { ALL_NOTES_KEY } from '@pear-notes/core/constant.js'
import {
  ATTACHMENT_FILTER_ALL,
  ATTACHMENT_GROUP,
  groupAttachments,
} from '@pear-notes/core/store/services/noteAttachments.js'
import { getFolders } from '@pear-notes/core/store/slices/foldersSlice.js'

import type {
  AttachmentFilter,
  AttachmentGroupBy,
  AttachmentItem,
  GroupedAttachments,
} from '@/components/attachments/attachments.types'

const ATTACHMENT_COUNT_REFRESH_MS = 60 * 1000

type Folder = { id: string; name: string }

const loadAttachments = async (): Promise<AttachmentItem[]> => {
  try {
    return (await backendApi.getAttachments()) as AttachmentItem[]
  } catch {
    return []
  }
}

export function useAttachmentCount(): number {
  const [count, setCount] = useState(0)
  const refresh = useCallback(() => {
    loadAttachments().then((items) => setCount(items.length))
  }, [])
  useFocusEffect(
    useCallback(() => {
      refresh()
      const timer = setInterval(refresh, ATTACHMENT_COUNT_REFRESH_MS)
      return () => clearInterval(timer)
    }, [refresh]),
  )
  return count
}

export function useAttachmentsView() {
  const folders = useSelector(getFolders) as Folder[]
  const [items, setItems] = useState<AttachmentItem[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<AttachmentFilter>(ATTACHMENT_FILTER_ALL)
  const [by, setBy] = useState<AttachmentGroupBy>(ATTACHMENT_GROUP.FOLDER as AttachmentGroupBy)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    const next = await loadAttachments()
    if (mountedRef.current) setItems(next)
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    if (mountedRef.current) setRefreshing(false)
  }, [load])

  const folderNames = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder.name])),
    [folders],
  )

  const grouped = useMemo(
    () =>
      groupAttachments(items ?? [], {
        by,
        kind,
        query,
        folders: [...folderNames.keys()],
        allNotesKey: ALL_NOTES_KEY,
      }) as GroupedAttachments,
    [items, by, kind, query, folderNames],
  )

  const toggleSection = useCallback((key: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }, [])

  return {
    items,
    loaded: items !== null,
    refreshing,
    refresh,
    query,
    setQuery,
    kind,
    setKind,
    by,
    setBy,
    expanded,
    toggleSection,
    grouped,
    folderNames,
  }
}
