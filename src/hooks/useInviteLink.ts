import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as Clipboard from 'expo-clipboard'

import {
  createInvite,
  getInvite,
  getInviteExpiresAt,
  getInviterStatus,
  getReceiverStatus,
  getSyncIsLoading,
  resetInvite,
} from '@pear-notes/core/store/slices/syncSlice.js'
import { getInviteRemainingMs } from '@pear-notes/core/utils.js'

import { hapticError, hapticLight, hapticSuccess } from '@/lib/haptics'
import { shareQrImage } from '@/lib/qrShare'

const COUNTDOWN_TICK_MS = 1000
const EXPIRY_WARNING_MS = 60 * 1000
const COPIED_RESET_MS = 2000
const QR_RENDER_TIMEOUT_MS = 4000
const IDLE_INVITER_STEPS = ['idle', 'generating', 'ready', 'searching']
const IDLE_RECEIVER_STEPS = ['idle', 'connecting']

type QrCodeRef = { toDataURL: (callback: (data: string) => void) => void }

export function useInviteLink(format: (invite: string) => string) {
  const dispatch = useDispatch()
  const inviteCode = useSelector(getInvite) as string | null
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading) as boolean
  const inviterStatus = useSelector(getInviterStatus)
  const receiverStatus = useSelector(getReceiverStatus)

  const [copied, setCopied] = useState(false)
  const [isSharingQr, setIsSharingQr] = useState(false)
  const [countdownTick, setCountdownTick] = useState(0)
  const qrRef = useRef<QrCodeRef | null>(null)
  const statusRef = useRef({ inviterStatus, receiverStatus })

  useEffect(() => {
    statusRef.current = { inviterStatus, receiverStatus }
  }, [inviterStatus, receiverStatus])

  useEffect(() => {
    return () => {
      const inviterStep = statusRef.current.inviterStatus?.step
      const receiverStep = statusRef.current.receiverStatus?.step
      const inviterActive = inviterStep && !IDLE_INVITER_STEPS.includes(inviterStep)
      const receiverActive = receiverStep && !IDLE_RECEIVER_STEPS.includes(receiverStep)
      if (!inviterActive && !receiverActive) dispatch(resetInvite())
    }
  }, [dispatch])

  useEffect(() => {
    if (!inviteCode || !expiresAt) return
    const timer = setInterval(() => setCountdownTick((n) => n + 1), COUNTDOWN_TICK_MS)
    return () => clearInterval(timer)
  }, [inviteCode, expiresAt])

  const link = inviteCode ? format(inviteCode) : ''

  const remainingMs = useMemo(
    () => getInviteRemainingMs(expiresAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expiresAt, countdownTick],
  )
  const expired = !!inviteCode && !!expiresAt && remainingMs <= 0
  const expiringSoon = !expired && remainingMs > 0 && remainingMs <= EXPIRY_WARNING_MS

  const generate = useCallback(() => {
    hapticLight()
    dispatch(createInvite())
  }, [dispatch])

  const copy = useCallback(async () => {
    if (!link) return
    await Clipboard.setStringAsync(link)
    hapticSuccess()
    setCopied(true)
    setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }, [link])

  const handleQrRef = useCallback((instance: QrCodeRef | null) => {
    qrRef.current = instance
  }, [])

  const shareQr = useCallback(async () => {
    if (!qrRef.current || isSharingQr) return
    hapticLight()
    setIsSharingQr(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('QR_RENDER_TIMEOUT')), QR_RENDER_TIMEOUT_MS)
        qrRef.current?.toDataURL((data) => {
          clearTimeout(timer)
          resolve(data)
        })
      })
      await shareQrImage(base64, '')
    } catch (error) {
      console.error('shareQr', error)
      hapticError()
    } finally {
      setIsSharingQr(false)
    }
  }, [isSharingQr])

  return {
    inviteCode,
    link,
    isLoading,
    remainingMs,
    expired,
    expiringSoon,
    copied,
    isSharingQr,
    generate,
    copy,
    shareQr,
    handleQrRef,
  }
}

export type InviteLinkState = ReturnType<typeof useInviteLink>
