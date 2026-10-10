import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, AppState, DeviceEventEmitter, Linking } from 'react-native'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { buildReminderItems } from '@pear-notes/core/store/services/noteTasks.js'
import {
  isRemindersEnabled,
  setRemindersEnabled,
} from '@pear-notes/core/store/services/reminders.js'

import ExpoReminders from '../../modules/expo-reminders'

const CHECK_MS = 30 * 60 * 1000
const CHANGED_EVENT = 'pear-notes:reminders-changed'

type UpcomingTask = {
  noteKey: string
  title: string
  text: string
  date: string
  time: string | null
}

const asGranted = (result: unknown) =>
  result === true ||
  (typeof result === 'object' &&
    result !== null &&
    (result as { granted?: boolean }).granted === true)

export function useReminders() {
  const { t, i18n } = useTranslation()
  const syncing = useRef(false)

  useEffect(() => {
    if (!ExpoReminders) return
    const initialUrl = ExpoReminders.getInitialUrl?.()
    if (initialUrl) Linking.openURL(initialUrl).catch(() => {})
    const sync = async () => {
      if (syncing.current) return
      syncing.current = true
      try {
        if (!(await isRemindersEnabled(backendApi))) {
          await ExpoReminders?.cancelAll().catch(() => {})
          return
        }
        const tasks = (await backendApi.getUpcomingTasks().catch(() => [])) as UpcomingTask[]
        const items = buildReminderItems(tasks, {
          linkFor: (task: UpcomingTask) => `pearnotes://note/${task.noteKey}`,
          bodyFor: (task: UpcomingTask) => {
            const title = task.title || t('noteCard.untitled')
            if (!task.time) return title
            const [hour, minute] = task.time.split(':').map(Number)
            const at = new Date()
            at.setHours(hour, minute)
            return `${title} · ${at.toLocaleTimeString(i18n.language, { hour: 'numeric', minute: '2-digit' })}`
          },
        })
        await ExpoReminders?.schedule(items).catch(() => 0)
      } catch {
      } finally {
        syncing.current = false
      }
    }
    sync()
    const timer = setInterval(sync, CHECK_MS)
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') sync()
    })
    const changed = DeviceEventEmitter.addListener(CHANGED_EVENT, sync)
    return () => {
      clearInterval(timer)
      appState.remove()
      changed.remove()
    }
  }, [i18n.language, t])
}

export function useRemindersSetting(): [boolean, () => void, boolean] {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let active = true
    isRemindersEnabled(backendApi)
      .then((value: boolean) => active && setEnabled(value))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const toggle = useCallback(async () => {
    const next = !enabled
    if (next) {
      const granted = asGranted(await ExpoReminders?.requestPermission().catch(() => false))
      if (!granted) {
        Alert.alert(t('settings.general.reminders'), t('settings.general.remindersDenied'))
        return
      }
    }
    setEnabled(next)
    await setRemindersEnabled(backendApi, next).catch(() => setEnabled(!next))
    DeviceEventEmitter.emit(CHANGED_EVENT)
  }, [enabled, t])

  return [enabled, toggle, Boolean(ExpoReminders)]
}
