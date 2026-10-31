import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native'
import * as Clipboard from 'expo-clipboard'

import { SymbolIcon } from '@/components/SymbolIcon'
import {
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_15,
} from '@/constants/commonStyles'
import { type Crash, crashDetails, formatCrashReport, sendCrashReport } from '@/lib/crashReport'

import { createThemedStylesheet, Text, useTheme, View } from './Themed'

const COPIED_RESET_MS = 2000

type SendState = 'idle' | 'sending' | 'sent' | 'failed'

interface CrashReportPanelProps {
  crash: Crash
  title: string
  message: string
}

export function CrashReportPanel({ crash, title, message }: CrashReportPanelProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [sendState, setSendState] = useState<SendState>('idle')
  const [copied, setCopied] = useState(false)
  const details = crashDetails(crash)
  const report = () => formatCrashReport(crash, { title, message })

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(report())
      setCopied(true)
    } catch {}
  }

  const send = async () => {
    setSendState('sending')
    const sent = await sendCrashReport(report(), { source: crash.source, email })
    setSendState(sent ? 'sent' : 'failed')
  }

  return (
    <View style={styles.container}>
      {details ? (
        <>
          <Text style={styles.label}>{t('crash.details')}</Text>
          <ScrollView style={styles.details} nestedScrollEnabled>
            <Text style={styles.detailsText} selectable>
              {details}
            </Text>
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.label}>{t('crash.sendTitle')}</Text>
      {sendState === 'sent' ? (
        <View style={styles.sentRow} accessibilityRole="text" accessibilityLiveRegion="polite">
          <SymbolIcon name="checkmark" size={UI_ICON_SIZE_15} color={colors.primary} />
          <Text style={styles.sentText}>{t('crash.sent')}</Text>
        </View>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('crash.emailPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('crash.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            style={styles.input}
          />
          <Text
            style={[styles.hint, sendState === 'failed' && styles.hintError]}
            accessibilityLiveRegion={sendState === 'failed' ? 'assertive' : 'none'}
          >
            {t(sendState === 'failed' ? 'crash.sendFailed' : 'crash.sendHint')}
          </Text>
        </>
      )}

      <View style={styles.buttons}>
        <Pressable
          onPress={copy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <SymbolIcon
            name={copied ? 'checkmark' : 'doc.on.doc'}
            size={UI_ICON_SIZE_15}
            color={colors.text}
          />
          <Text style={styles.buttonText}>{t(copied ? 'crash.copied' : 'crash.copy')}</Text>
        </Pressable>
        {sendState !== 'sent' ? (
          <Pressable
            onPress={send}
            disabled={sendState === 'sending'}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            {sendState === 'sending' ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <SymbolIcon name="paperplane" size={UI_ICON_SIZE_15} color={colors.text} />
            )}
            <Text style={styles.buttonText}>
              {t(sendState === 'sending' ? 'crash.sending' : 'crash.send')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      gap: Space.sm,
      marginBottom: Space.xl,
    },
    label: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: Space.sm,
    },
    details: {
      maxHeight: 200,
      borderRadius: Radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.inputBackground,
      padding: Space.md,
    },
    detailsText: {
      fontFamily: FontFamily.mono,
      fontSize: FontSize.caption,
      color: theme.colors.textSecondary,
    },
    input: {
      borderRadius: Radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.inputBackground,
      paddingHorizontal: Space.md,
      paddingVertical: Space.md,
      fontSize: FontSize.body,
      color: theme.colors.text,
    },
    hint: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    hintError: {
      color: theme.colors.error,
    },
    sentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    sentText: {
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
    },
    buttons: {
      flexDirection: 'row',
      gap: Space.md,
      marginTop: Space.sm,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Space.sm,
      paddingVertical: Space.md,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    buttonText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
  })
  return styles
})
