import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { SymbolView } from 'expo-symbols'

import { GlassView } from '@/components/GlassView'
import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import { fmtTimer } from '@/components/useAudioRecorderModal'
import { useVoiceTypingBar, type VoiceTypingBarProps } from '@/components/useVoiceTypingBar'
import { VoiceTypingWave } from '@/components/VoiceTypingWave'
import {
  FontFamily,
  FontSize,
  Radii,
  SHEET_MAX_WIDTH,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_SIZE_52,
  UI_SIZE_64,
} from '@/constants/commonStyles'

export function VoiceTypingBar({ toolbarBottom = 0, ...options }: VoiceTypingBarProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
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
  } = useVoiceTypingBar(options)

  const wrapStyle = useMemo(
    () => [styles.wrap, { bottom: toolbarBottom }],
    [styles.wrap, toolbarBottom],
  )

  return (
    <View style={wrapStyle}>
      <GlassView intensity={0} borderRadius={Radii.btn} style={styles.bar} isInteractive>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <SymbolView
            name="xmark"
            size={UI_ICON_SIZE_16}
            tintColor={colors.text}
            weight="semibold"
          />
        </Pressable>

        <View style={styles.center}>
          {isRecording ? (
            <VoiceTypingWave values={liveBars} color={colors.primary} active />
          ) : (
            <Text style={styles.status} numberOfLines={1}>
              {statusKey ? t(statusKey) : ''}
            </Text>
          )}
        </View>

        {isRecording && <Text style={styles.timer}>{fmtTimer(elapsed)}</Text>}

        {(isPreparing || isFinishing) && (
          <View style={styles.iconButton}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {isError && canAttachAudio && (
          <Pressable
            onPress={handleAttachAudio}
            accessibilityRole="button"
            accessibilityLabel={t('localAi.actions.attachAudio')}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <SymbolView
              name="waveform"
              size={UI_ICON_SIZE_20}
              tintColor={colors.text}
              weight="semibold"
            />
          </Pressable>
        )}

        {isError && (
          <Pressable
            onPress={canOpenSettings ? handleOpenSettings : handleRetry}
            accessibilityRole="button"
            accessibilityLabel={t(
              canOpenSettings ? 'localAi.actions.openSettings' : 'localAi.actions.again',
            )}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <SymbolView
              name={canOpenSettings ? 'gearshape' : 'arrow.clockwise'}
              size={UI_ICON_SIZE_20}
              tintColor={colors.background}
              weight="semibold"
            />
          </Pressable>
        )}

        {isRecording && (
          <Pressable
            onPress={handleStop}
            accessibilityRole="button"
            accessibilityLabel={t('localAi.actions.stop')}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <SymbolView
              name="stop.fill"
              size={UI_ICON_SIZE_20}
              tintColor={colors.background}
              weight="semibold"
            />
          </Pressable>
        )}
      </GlassView>
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: Space.base,
      right: Space.base,
      alignItems: 'center',
    },
    bar: {
      width: '100%',
      maxWidth: SHEET_MAX_WIDTH,
      minHeight: UI_SIZE_52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.sm,
      gap: Space.sm,
      overflow: 'hidden',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
    },
    status: {
      fontFamily: FontFamily.medium,
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    timer: {
      fontFamily: FontFamily.semiBold,
      fontSize: FontSize.body,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
      minWidth: UI_SIZE_64,
      textAlign: 'center',
    },
    iconButton: {
      width: Space.xxl + Space.sm,
      height: Space.xxl + Space.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radii.pill,
    },
    actionButton: {
      width: Space.xxl + Space.sm,
      height: Space.xxl + Space.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.primary,
    },
    pressed: {
      opacity: 0.7,
    },
  })
  return styles
})
