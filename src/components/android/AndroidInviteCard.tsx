import { type ComponentProps, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { INVITE_EXPIRY_MINUTES } from '@pear-notes/core/constant.js'
import { formatInviteCountdown } from '@pear-notes/core/utils.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import type { InviteCardCopy } from '@/components/sync/inviteCard.types'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_48,
  UI_SIZE_2,
  UI_SIZE_4,
  UI_SIZE_6,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_17,
  UI_SIZE_18,
  UI_SIZE_20,
  UI_SIZE_22,
  UI_SIZE_32,
  UI_SIZE_36,
  UI_SIZE_120,
  UI_SIZE_180,
  UI_SIZE_200,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import type { InviteLinkState } from '@/hooks/useInviteLink'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh: string
  surfaceContainerHighest: string
}

type Props = {
  invite: InviteLinkState
  copy: InviteCardCopy
  idleIcon: IconName
  idleBadgeIcon?: IconName
}

export function AndroidInviteCard({ invite, copy, idleIcon, idleBadgeIcon }: Props) {
  const { t } = useTranslation()
  const theme = useTheme()
  const c = useMD3Theme().colors as ExtendedColors
  const styles = useStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const ripplePrimary = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])
  const loaderColor = theme.isDark ? theme.colors.text : theme.colors.background
  const onPrimary = c.onPrimary || theme.colors.text
  const { inviteCode, link, isLoading, expired, expiringSoon, copied, isSharingQr } = invite

  if (!inviteCode || expired) {
    return (
      <View>
        <View style={styles.heroSection}>
          <View style={styles.heroCircle}>
            <MaterialCommunityIcons name={idleIcon} size={UI_ICON_SIZE_48} color={c.primary} />
          </View>
          {idleBadgeIcon && (
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name={idleBadgeIcon} size={UI_ICON_SIZE_18} color={onPrimary} />
            </View>
          )}
        </View>

        <Text style={styles.heroTitle}>
          {expired ? t('sync.invite.expiredTitle') : copy.idleTitle}
        </Text>
        <Text style={styles.heroDesc}>
          {expired
            ? t('sync.invite.expiredDesc', { minutes: INVITE_EXPIRY_MINUTES })
            : copy.idleDesc}
        </Text>

        <Pressable
          onPress={invite.generate}
          disabled={isLoading}
          android_ripple={ripplePrimary}
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
        >
          {isLoading && (
            <ActivityIndicator size="small" color={loaderColor} style={styles.indicator} />
          )}
          <Text style={styles.primaryBtnText}>
            {isLoading
              ? t('sync.hero.preparing')
              : expired
                ? t('sync.invite.regenerateBtn')
                : copy.generateBtn}
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View>
      <View style={styles.heroSection}>
        <View style={styles.heroCircle}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={UI_ICON_SIZE_48}
            color={c.primary}
          />
        </View>
      </View>

      <Text style={styles.heroTitle}>{copy.readyTitle}</Text>
      <View style={styles.countdownRow}>
        <View style={[styles.countdownPill, expiringSoon && styles.countdownPillUrgent]}>
          <MaterialCommunityIcons
            name="timer-outline"
            size={UI_ICON_SIZE_14}
            color={expiringSoon ? c.error : c.primary}
          />
          <Text style={[styles.countdownText, expiringSoon && styles.countdownTextUrgent]}>
            {t('sync.invite.expiresIn', { countdown: formatInviteCountdown(invite.remainingMs) })}
          </Text>
        </View>
        <Pressable
          onPress={invite.regenerate}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={t('sync.invite.regenerateBtn')}
          hitSlop={UI_SIZE_8}
          android_ripple={ripple}
          style={[styles.regenerateBtn, isLoading && styles.btnDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={UI_ICON_SIZE_18} color={c.primary} />
          )}
        </Pressable>
      </View>

      <View style={styles.qrWrap}>
        <View style={styles.qrBox}>
          <QRCode
            getRef={invite.handleQrRef}
            value={link}
            size={UI_SIZE_180}
            backgroundColor={theme.colors.white}
            color={theme.colors.qrDark}
          />
        </View>
        <Text style={styles.qrTitle}>{copy.qrTitle}</Text>
        <Text style={styles.qrDescription}>{copy.qrDescription}</Text>
        <Pressable
          onPress={invite.shareQr}
          disabled={isSharingQr}
          android_ripple={ripple}
          style={[styles.shareQrBtn, isSharingQr && styles.btnDisabled]}
        >
          <MaterialCommunityIcons name="share-variant" size={UI_ICON_SIZE_14} color={c.primary} />
          <Text style={styles.shareQrBtnText}>{t('sync.invite.shareQrBtn')}</Text>
        </Pressable>
      </View>

      <Text style={styles.codeLabelText}>{copy.codeLabel}</Text>
      <View style={styles.codeBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text selectable style={styles.codeText}>
            {link}
          </Text>
        </ScrollView>
      </View>

      <Pressable
        onPress={invite.copy}
        android_ripple={ripplePrimary}
        style={[styles.primaryBtn, copied ? styles.copyBtnSuccess : styles.copyBtnDefault]}
      >
        <MaterialCommunityIcons
          name={copied ? 'check' : 'content-copy'}
          size={UI_ICON_SIZE_18}
          color={copied ? theme.colors.white : onPrimary}
        />
        <Text
          style={[
            styles.primaryBtnText,
            copied ? styles.copyTextSuccess : styles.copyTextDefault,
          ]}
        >
          {copied ? t('sync.invite.copied') : copy.copyBtn}
        </Text>
      </Pressable>

      <View style={styles.warningRow}>
        <MaterialCommunityIcons
          name="shield-check"
          size={UI_ICON_SIZE_14}
          color={c.primary}
          style={styles.warningIconMargin}
        />
        <Text style={styles.warningText}>{copy.warning}</Text>
      </View>
    </View>
  )
}

const useStyles = createThemedStylesheetWithHooks(
  (theme, { md3 }) => {
    const c = md3.colors as ExtendedColors
    const styles = StyleSheet.create({
      heroSection: {
        alignItems: 'center',
        position: 'relative',
      },
      heroCircle: {
        width: UI_SIZE_120,
        height: UI_SIZE_120,
        borderRadius: UI_SIZE_9999,
        ...commonStyles.centered,
        backgroundColor: hexWithAlpha(c.onSurfaceVariant, 0.12),
      },
      heroBadge: {
        position: 'absolute',
        bottom: 0,
        right: '33%',
        width: UI_SIZE_36,
        height: UI_SIZE_36,
        borderRadius: UI_SIZE_9999,
        ...commonStyles.centered,
        backgroundColor: c.primary,
      },
      heroTitle: {
        fontSize: FontSize.heading,
        fontWeight: FontWeight.black,
        fontFamily: FontFamily.extraBold,
        textAlign: 'center',
        marginTop: UI_SIZE_20,
        marginBottom: UI_SIZE_12,
        letterSpacing: -0.5,
        color: c.onSurface,
      },
      heroDesc: {
        fontSize: FontSize.body,
        lineHeight: UI_SIZE_22,
        textAlign: 'center',
        marginBottom: UI_SIZE_32,
        paddingHorizontal: UI_SIZE_8,
        fontFamily: FontFamily.regular,
        color: c.onSurfaceVariant,
      },
      primaryBtn: {
        overflow: 'hidden',
        borderRadius: UI_SIZE_9999,
        width: '100%',
        ...commonStyles.row,
        justifyContent: 'center',
        paddingVertical: UI_SIZE_18,
        backgroundColor: c.primary,
      },
      primaryBtnText: {
        fontSize: FontSize.subtitle,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        color: c.onPrimary || theme.colors.text,
      },
      btnDisabled: {
        opacity: 0.7,
      },
      indicator: {
        marginRight: UI_SIZE_8,
      },
      qrWrap: {
        alignItems: 'center',
        marginBottom: UI_SIZE_20,
      },
      qrBox: {
        width: UI_SIZE_200,
        height: UI_SIZE_200,
        borderRadius: UI_SIZE_16,
        ...commonStyles.centered,
        backgroundColor: theme.colors.white,
      },
      qrTitle: {
        fontSize: FontSize.subtitle,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        marginTop: UI_SIZE_12,
        marginBottom: UI_SIZE_4,
        color: c.onSurface,
      },
      qrDescription: {
        fontSize: FontSize.body,
        lineHeight: UI_SIZE_18,
        textAlign: 'center',
        color: c.onSurfaceVariant,
        paddingHorizontal: UI_SIZE_20,
      },
      shareQrBtn: {
        overflow: 'hidden',
        ...commonStyles.row,
        gap: UI_SIZE_6,
        marginTop: UI_SIZE_12,
        paddingVertical: UI_SIZE_8,
        paddingHorizontal: UI_SIZE_16,
        borderRadius: UI_SIZE_9999,
        backgroundColor: hexWithAlpha(c.primary, 0.1),
      },
      shareQrBtnText: {
        fontSize: FontSize.caption,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        color: c.primary,
      },
      countdownRow: {
        ...commonStyles.row,
        alignSelf: 'center',
        gap: UI_SIZE_8,
        marginBottom: UI_SIZE_32,
      },
      countdownPill: {
        ...commonStyles.row,
        gap: UI_SIZE_6,
        paddingVertical: UI_SIZE_6,
        paddingHorizontal: UI_SIZE_12,
        borderRadius: UI_SIZE_9999,
        backgroundColor: hexWithAlpha(c.primary, 0.12),
      },
      regenerateBtn: {
        overflow: 'hidden',
        width: UI_SIZE_32,
        height: UI_SIZE_32,
        borderRadius: UI_SIZE_9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hexWithAlpha(c.primary, 0.12),
      },
      countdownPillUrgent: {
        backgroundColor: hexWithAlpha(c.error, 0.14),
      },
      countdownText: {
        fontSize: FontSize.caption,
        fontWeight: FontWeight.bold,
        fontFamily: FontFamily.bold,
        color: c.primary,
      },
      countdownTextUrgent: {
        color: c.error,
      },
      codeLabelText: {
        fontSize: FontSize.caption,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.4,
        marginBottom: UI_SIZE_10,
        color: c.onSurfaceVariant,
      },
      codeBox: {
        borderStyle: 'dashed',
        borderRadius: UI_SIZE_12,
        paddingVertical: UI_SIZE_14,
        paddingHorizontal: UI_SIZE_14,
        marginBottom: UI_SIZE_16,
        backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
        borderColor: hexWithAlpha(c.outlineVariant, 0.25),
      },
      codeText: {
        fontFamily: 'monospace',
        fontSize: FontSize.body,
        letterSpacing: 1,
        color: c.onSurface,
      },
      copyBtnSuccess: {
        backgroundColor: theme.colors.success,
      },
      copyBtnDefault: {
        backgroundColor: c.primary,
      },
      copyTextSuccess: {
        color: theme.colors.white,
        marginLeft: UI_SIZE_8,
      },
      copyTextDefault: {
        color: c.onPrimary || theme.colors.text,
        marginLeft: UI_SIZE_8,
      },
      warningRow: {
        ...commonStyles.row,
        alignItems: 'flex-start',
        gap: UI_SIZE_8,
        borderRadius: UI_SIZE_12,
        padding: UI_SIZE_14,
        marginTop: UI_SIZE_12,
        backgroundColor: hexWithAlpha(c.primary, 0.08),
        borderColor: hexWithAlpha(c.primary, 0.2),
      },
      warningIconMargin: {
        marginTop: UI_SIZE_2,
      },
      warningText: {
        ...commonStyles.flex1,
        fontSize: FontSize.caption,
        lineHeight: UI_SIZE_17,
        fontFamily: FontFamily.regular,
        color: c.onSurfaceVariant,
      },
    })
    return styles
  },
  () => ({ md3: useMD3Theme() }),
)
