import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks } from '@/components/Themed'
import { fmtTimer } from '@/components/useAudioRecorderModal'
import { useVoiceTypingBar, type VoiceTypingBarProps } from '@/components/useVoiceTypingBar'
import { VoiceTypingWave } from '@/components/VoiceTypingWave'
import {
  FontFamily,
  FontSize,
  SHEET_MAX_WIDTH,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_22,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_44,
  UI_SIZE_64,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { useKeyboardAnchoredBottom } from '@/hooks/useKeyboardAnchoredBottom'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

export function VoiceTypingBar(props: VoiceTypingBarProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors as any
  const containerStyle = useKeyboardAnchoredBottom({
    gap: UI_SIZE_12,
    enabled: props.keyboardAnchored ?? true,
  })

  const {
    elapsed,
    liveBars,
    statusKey,
    isRecording,
    isPreparing,
    isFinishing,
    isError,
    canOpenSettings,
    canAttachAudio,
    handleStop,
    handleRetry,
    handleClose,
    handleOpenSettings,
    handleAttachAudio,
  } = useVoiceTypingBar(props)

  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  return (
    <Animated.View style={[styles.row, containerStyle]}>
      <View style={styles.container}>
        <Pressable
          onPress={handleClose}
          android_ripple={ripple}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          style={styles.btn}
        >
          <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_22} color={c.onSurface} />
        </Pressable>

        <View style={styles.center}>
          {isRecording ? (
            <VoiceTypingWave values={liveBars} color={c.primary} active />
          ) : (
            <Text style={styles.status} numberOfLines={1}>
              {statusKey ? t(statusKey) : ''}
            </Text>
          )}
        </View>

        {isRecording && <Text style={styles.timer}>{fmtTimer(elapsed)}</Text>}

        {(isPreparing || isFinishing) && (
          <View style={styles.btn}>
            <ActivityIndicator color={c.primary} />
          </View>
        )}

        {isError && canAttachAudio && (
          <Pressable
            onPress={handleAttachAudio}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel={t('localAi.actions.attachAudio')}
            style={styles.btn}
          >
            <MaterialCommunityIcons name="waveform" size={UI_ICON_SIZE_22} color={c.onSurface} />
          </Pressable>
        )}

        {isError && (
          <Pressable
            onPress={canOpenSettings ? handleOpenSettings : handleRetry}
            accessibilityRole="button"
            accessibilityLabel={t(
              canOpenSettings ? 'localAi.actions.openSettings' : 'localAi.actions.again',
            )}
            style={styles.actionBtn}
          >
            <MaterialCommunityIcons
              name={canOpenSettings ? 'cog-outline' : 'refresh'}
              size={UI_ICON_SIZE_20}
              color={c.onPrimary}
            />
          </Pressable>
        )}

        {isRecording && (
          <Pressable
            onPress={handleStop}
            accessibilityRole="button"
            accessibilityLabel={t('localAi.actions.stop')}
            style={styles.actionBtn}
          >
            <MaterialCommunityIcons name="stop" size={UI_ICON_SIZE_20} color={c.onPrimary} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  )
}

const useBarHooks = () => {
  const md3 = useMD3Theme()
  const isDark = md3.dark
  return { md3, isDark }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, isDark }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    row: {
      position: 'absolute',
      left: UI_SIZE_12,
      right: UI_SIZE_12,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 10,
    },
    container: {
      flex: 1,
      maxWidth: SHEET_MAX_WIDTH,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      paddingVertical: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_8,
      backgroundColor: hexWithAlpha(c.surfaceContainerHigh ?? c.surface, 0.98),
      borderColor: hexWithAlpha(c.outlineVariant, isDark ? 0.15 : 0.3),
      elevation: 6,
      shadowColor: theme.colors.black,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
    },
    status: {
      fontFamily: FontFamily.medium,
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
    },
    timer: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      color: c.onSurface,
      minWidth: UI_SIZE_64,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    btn: {
      overflow: 'hidden',
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtn: {
      width: UI_SIZE_44,
      height: UI_SIZE_44,
      borderRadius: UI_SIZE_9999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
  })
  return styles
}, useBarHooks)
