import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import { useDispatch } from 'react-redux'
import { type Href, router } from 'expo-router'

import { TIP, TIP_ACTION } from '@pear-notes/core/store/services/tips.js'
import { indexLocalAiNow, setLocalAiOffload } from '@pear-notes/core/store/slices/localAiSlice.js'

import { FloatingNoticeBanner } from '@/components/FloatingNoticeBanner'
import type { FloatingNoticeBannerProps } from '@/components/FloatingNoticeBanner.types'
import { TOOL_ROW, TOOL_ROW_ROUTE } from '@/constants/constants'
import { useRemindersSetting } from '@/hooks/useReminders'
import { useTips } from '@/hooks/useTips'
import {
  enableAlwaysOnSync,
  openBackgroundSyncSystemSettings,
  switchBackgroundSyncMode,
} from '@/lib/backgroundSyncMode'

const TIP_ICONS: Record<string, FloatingNoticeBannerProps['icon']> = {
  [TIP.SYNC_BLOCKED]: { ios: 'arrow.triangle.2.circlepath', android: 'sync-alert' },
  [TIP.ALWAYS_ON_SYNC]: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
  [TIP.BACKGROUND_SYNC]: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
  [TIP.INDEX_CHARGING]: { ios: 'magnifyingglass', android: 'magnify' },
  [TIP.USE_MAC]: { ios: 'laptopcomputer', android: 'laptop' },
  [TIP.REMINDERS_OFF]: { ios: 'bell', android: 'bell-outline' },
  [TIP.YEARLY_DATES]: { ios: 'calendar', android: 'calendar-month-outline' },
}

const PLATFORM_COPY_TIPS = new Set<string>([TIP.SYNC_BLOCKED])

const copyKey = (tip: string, field: string) =>
  PLATFORM_COPY_TIPS.has(tip)
    ? `tips.${tip}.${Platform.OS === 'ios' ? 'ios' : 'android'}.${field}`
    : `tips.${tip}.${field}`

export function TipBanner() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { tip, answer, deferredCount, macTitle } = useTips()
  const [remindersOn, toggleReminders] = useRemindersSetting()

  const accept = useCallback(async () => {
    if (tip === TIP.ALWAYS_ON_SYNC && !(await enableAlwaysOnSync(t))) return
    if (tip === TIP.SYNC_BLOCKED) openBackgroundSyncSystemSettings()
    if (tip === TIP.BACKGROUND_SYNC) switchBackgroundSyncMode('periodic')
    if (tip === TIP.INDEX_CHARGING) dispatch({ type: indexLocalAiNow.type })
    if (tip === TIP.USE_MAC) dispatch({ type: setLocalAiOffload.type, payload: { useMac: true } })
    if (tip === TIP.REMINDERS_OFF && !remindersOn) toggleReminders()
    if (tip === TIP.YEARLY_DATES) router.push(TOOL_ROW_ROUTE[TOOL_ROW.upcoming] as Href)
    answer(TIP_ACTION.ACCEPT)
  }, [tip, t, dispatch, remindersOn, toggleReminders, answer])

  const notNow = useCallback(() => answer(TIP_ACTION.NOT_NOW), [answer])
  const dismiss = useCallback(() => answer(TIP_ACTION.DISMISS), [answer])

  if (!tip || !TIP_ICONS[tip]) return null

  return (
    <FloatingNoticeBanner
      icon={TIP_ICONS[tip]}
      title={t(copyKey(tip, 'title'))}
      description={t(copyKey(tip, 'body'), { count: deferredCount, device: macTitle })}
      descriptionLines={3}
      actionLabel={t(copyKey(tip, 'action'))}
      onAction={accept}
      secondaryLabel={t('tips.notNow')}
      onSecondary={notNow}
      dismissLabel={t('tips.dismiss')}
      onDismiss={dismiss}
    />
  )
}
