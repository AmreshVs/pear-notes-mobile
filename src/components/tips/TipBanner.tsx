import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { type Href, router } from 'expo-router'

import { TIP, TIP_ACTION } from '@pear-notes/core/store/services/tips.js'
import { indexLocalAiNow, setLocalAiOffload } from '@pear-notes/core/store/slices/localAiSlice.js'

import { FloatingNoticeBanner } from '@/components/FloatingNoticeBanner'
import type { FloatingNoticeBannerProps } from '@/components/FloatingNoticeBanner.types'
import { TOOL_ROW, TOOL_ROW_ROUTE } from '@/constants/constants'
import { useRemindersSetting } from '@/hooks/useReminders'
import { useTips } from '@/hooks/useTips'

const TIP_ICONS: Record<string, FloatingNoticeBannerProps['icon']> = {
  [TIP.INDEX_CHARGING]: { ios: 'magnifyingglass', android: 'magnify' },
  [TIP.USE_MAC]: { ios: 'laptopcomputer', android: 'laptop' },
  [TIP.REMINDERS_OFF]: { ios: 'bell', android: 'bell-outline' },
  [TIP.YEARLY_DATES]: { ios: 'calendar', android: 'calendar-month-outline' },
}

export function TipBanner() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { tip, answer, deferredCount, macTitle } = useTips()
  const [remindersOn, toggleReminders] = useRemindersSetting()

  const accept = useCallback(() => {
    if (tip === TIP.INDEX_CHARGING) dispatch({ type: indexLocalAiNow.type })
    if (tip === TIP.USE_MAC) dispatch({ type: setLocalAiOffload.type, payload: { useMac: true } })
    if (tip === TIP.REMINDERS_OFF && !remindersOn) toggleReminders()
    if (tip === TIP.YEARLY_DATES) router.push(TOOL_ROW_ROUTE[TOOL_ROW.upcoming] as Href)
    answer(TIP_ACTION.ACCEPT)
  }, [tip, dispatch, remindersOn, toggleReminders, answer])

  const notNow = useCallback(() => answer(TIP_ACTION.NOT_NOW), [answer])
  const dismiss = useCallback(() => answer(TIP_ACTION.DISMISS), [answer])

  if (!tip || !TIP_ICONS[tip]) return null

  return (
    <FloatingNoticeBanner
      icon={TIP_ICONS[tip]}
      title={t(`tips.${tip}.title`)}
      description={t(`tips.${tip}.body`, { count: deferredCount, device: macTitle })}
      descriptionLines={3}
      actionLabel={t(`tips.${tip}.action`)}
      onAction={accept}
      secondaryLabel={t('tips.notNow')}
      onSecondary={notNow}
      dismissLabel={t('tips.dismiss')}
      onDismiss={dismiss}
    />
  )
}
