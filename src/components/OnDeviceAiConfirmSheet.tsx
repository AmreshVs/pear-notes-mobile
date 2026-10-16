import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'

import { formatBytes } from '@pear-notes/core/utils.js'

import { AiBottomSheet } from '@/components/AiBottomSheet'
import { createThemedStylesheet, Text } from '@/components/Themed'
import { FontFamily, FontSize, FontWeight, UI_SIZE_10, UI_SIZE_54 } from '@/constants/commonStyles'
import { hapticSelection } from '@/lib/haptics'

import type {
  OnDeviceAiConfirm,
  OnDeviceAiNotice,
} from '../app/settings/on-device-ai/useOnDeviceAiScreen'

type SheetContent =
  | { kind: 'confirm'; confirm: OnDeviceAiConfirm }
  | { kind: 'notice'; notice: OnDeviceAiNotice }

interface OnDeviceAiConfirmSheetProps {
  confirm: OnDeviceAiConfirm | null
  notice: OnDeviceAiNotice | null
  onTurnOn: () => void
  onTurnOff: (deleteModels: boolean) => void
  onDismissConfirm: () => void
  onDismissNotice: () => void
}

export function OnDeviceAiConfirmSheet({
  confirm,
  notice,
  onTurnOn,
  onTurnOff,
  onDismissConfirm,
  onDismissNotice,
}: OnDeviceAiConfirmSheetProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const current: SheetContent | null = confirm
    ? { kind: 'confirm', confirm }
    : notice
      ? { kind: 'notice', notice }
      : null
  const currentSource = confirm ?? notice
  const [shown, setShown] = useState<SheetContent | null>(current)
  const [shownSource, setShownSource] = useState<object | null>(currentSource)
  if (currentSource && currentSource !== shownSource) {
    setShownSource(currentSource)
    setShown(current)
  }

  const content = current ?? shown
  if (!content) return null

  const primaryButton = (label: string, onPress: () => void, destructive = false) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primaryButton,
        destructive && styles.destructiveButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  )

  const secondaryButton = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  )

  if (content.kind === 'notice') {
    const { notice: shownNotice } = content
    return (
      <AiBottomSheet
        visible={!!notice && !confirm}
        icon="externaldrive.badge.exclamationmark"
        tone="error"
        title={t('settings.onDeviceAi.notEnoughSpace.title')}
        subtitle={
          shownNotice.feature
            ? t('settings.onDeviceAi.notEnoughSpace.message', {
                feature: t(`settings.onDeviceAi.features.${shownNotice.feature}.title`),
                size: formatBytes(shownNotice.requiredBytes ?? 0),
                short: formatBytes(shownNotice.shortBytes ?? 0),
              })
            : t('settings.onDeviceAi.notEnoughSpace.messageGeneric')
        }
        onClose={onDismissNotice}
      >
        {(dismissThen) => (
          <View style={styles.actions}>
            {primaryButton(t('common.ok'), () => dismissThen(onDismissNotice))}
          </View>
        )}
      </AiBottomSheet>
    )
  }

  const { confirm: shownConfirm } = content
  const feature = t(`settings.onDeviceAi.features.${shownConfirm.feature}.inline`)
  const size = formatBytes(shownConfirm.bytes)
  const isTurnOn = shownConfirm.kind === 'turnOn'

  return (
    <AiBottomSheet
      visible={!!confirm}
      icon={isTurnOn ? 'arrow.down.circle' : 'sparkles'}
      title={t(
        isTurnOn ? 'settings.onDeviceAi.turnOn.title' : 'settings.onDeviceAi.turnOff.title',
        { feature },
      )}
      subtitle={
        isTurnOn
          ? t(
              shownConfirm.waitsForNetwork
                ? 'settings.onDeviceAi.turnOn.messageWaiting'
                : 'settings.onDeviceAi.turnOn.message',
              { size },
            )
          : t('settings.onDeviceAi.turnOff.message', { size })
      }
      onClose={onDismissConfirm}
    >
      {(dismissThen) =>
        isTurnOn ? (
          <View style={styles.actions}>
            {secondaryButton(t('common.cancel'), () => dismissThen(onDismissConfirm))}
            {primaryButton(
              shownConfirm.waitsForNetwork
                ? t('settings.onDeviceAi.turnOn.confirmWaiting')
                : t('settings.onDeviceAi.turnOn.confirm', { size }),
              () => {
                hapticSelection()
                dismissThen(onTurnOn)
              },
            )}
          </View>
        ) : (
          <View style={styles.actions}>
            {secondaryButton(t('settings.onDeviceAi.turnOff.keep'), () =>
              dismissThen(() => onTurnOff(false)),
            )}
            {primaryButton(
              t('settings.onDeviceAi.turnOff.delete'),
              () => dismissThen(() => onTurnOff(true)),
              true,
            )}
          </View>
        )
      }
    </AiBottomSheet>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    actions: {
      flexDirection: 'row',
      gap: UI_SIZE_10,
    },
    secondaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: UI_SIZE_54,
      borderRadius: 999,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.cardSurface,
    },
    secondaryButtonText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    primaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: UI_SIZE_54,
      borderRadius: 999,
      borderCurve: 'continuous',
      backgroundColor: theme.colors.primary,
    },
    destructiveButton: {
      backgroundColor: theme.colors.error,
    },
    primaryButtonText: {
      fontSize: FontSize.subtitle,
      fontFamily: FontFamily.semiBold,
      fontWeight: FontWeight.semibold,
      color: theme.colors.onPrimary,
    },
    pressed: {
      opacity: 0.6,
    },
  })
  return styles
})
