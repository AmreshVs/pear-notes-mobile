import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { INVITE_EXPIRY_MINUTES } from '@pear-notes/core/constant.js'
import { formatInviteCountdown } from '@pear-notes/core/utils.js'

import { type IconName, SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  MonoFontFamily,
  Radii,
  Space,
  UI_ICON_SIZE_13,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_44,
  UI_SIZE_36,
  UI_SIZE_120,
  UI_SIZE_180,
  UI_SIZE_200,
} from '@/constants/commonStyles'
import type { InviteLinkState } from '@/hooks/useInviteLink'
import { hexWithAlpha } from '@/lib/backupUtils'

import type { InviteCardCopy } from './inviteCard.types'

type Props = {
  invite: InviteLinkState
  copy: InviteCardCopy
  idleIcon: IconName
  idleBadgeIcon?: IconName
}

export function InviteCard({ invite, copy, idleIcon, idleBadgeIcon }: Props) {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
  const { inviteCode, link, isLoading, expired, expiringSoon, copied, isSharingQr } = invite

  if (!inviteCode || expired) {
    return (
      <RNView style={styles.heroCard}>
        <RNView style={styles.heroSection}>
          <RNView style={styles.heroCircle}>
            <SymbolIcon name={idleIcon} size={UI_ICON_SIZE_44} color={colors.primary} />
          </RNView>
          {idleBadgeIcon && (
            <RNView style={styles.heroBadge}>
              <SymbolIcon
                name={idleBadgeIcon}
                size={UI_ICON_SIZE_16}
                color={colors.onPrimary}
                weight="semibold"
              />
            </RNView>
          )}
        </RNView>

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
          style={({ pressed }) => [
            styles.primaryBtn,
            (isLoading || pressed) && commonStyles.pressed,
          ]}
        >
          {isLoading && (
            <ActivityIndicator size="small" color={colors.onPrimary} style={styles.indicator} />
          )}
          <Text style={styles.btnText}>
            {isLoading
              ? t('sync.hero.preparing')
              : expired
                ? t('sync.invite.regenerateBtn')
                : copy.generateBtn}
          </Text>
        </Pressable>
      </RNView>
    )
  }

  return (
    <RNView style={styles.heroCard}>
      <RNView style={styles.heroSection}>
        <RNView style={styles.heroCircle}>
          <SymbolIcon name="checkmark.shield" size={UI_ICON_SIZE_44} color={colors.primary} />
        </RNView>
      </RNView>

      <Text style={styles.heroTitle}>{copy.readyTitle}</Text>
      <RNView style={[styles.countdownPill, expiringSoon && styles.countdownPillUrgent]}>
        <SymbolIcon
          name="timer"
          size={UI_ICON_SIZE_13}
          color={expiringSoon ? colors.error : colors.primary}
          weight="semibold"
        />
        <Text style={[styles.countdownText, expiringSoon && styles.countdownTextUrgent]}>
          {t('sync.invite.expiresIn', { countdown: formatInviteCountdown(invite.remainingMs) })}
        </Text>
      </RNView>

      <RNView style={styles.qrSection}>
        <RNView style={styles.qrImageWrap}>
          <QRCode
            getRef={invite.handleQrRef}
            value={link}
            size={UI_SIZE_180}
            backgroundColor={colors.white}
            color={colors.qrDark}
          />
        </RNView>
        <Text style={styles.qrTitle}>{copy.qrTitle}</Text>
        <Text style={styles.qrDescription}>{copy.qrDescription}</Text>
        <Pressable
          onPress={invite.shareQr}
          disabled={isSharingQr}
          style={({ pressed }) => [
            styles.shareQrBtn,
            isSharingQr && commonStyles.disabled,
            pressed && commonStyles.pressed,
          ]}
        >
          <SymbolIcon
            name="square.and.arrow.up"
            size={UI_ICON_SIZE_13}
            color={colors.primary}
            weight="semibold"
          />
          <Text style={styles.shareQrBtnText}>{t('sync.invite.shareQrBtn')}</Text>
        </Pressable>
      </RNView>

      <Text style={styles.codeLabel}>{copy.codeLabel}</Text>
      <RNView style={styles.codeBox}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.codeScrollContent}
        >
          <Text selectable style={styles.codeText}>
            {link}
          </Text>
        </ScrollView>
      </RNView>

      <Pressable
        onPress={invite.copy}
        style={({ pressed }) => [
          styles.copyBtn,
          copied ? styles.copyBtnCopied : styles.copyBtnDefault,
          pressed && commonStyles.pressed,
        ]}
      >
        <SymbolIcon
          name={copied ? 'checkmark' : 'link'}
          size={UI_ICON_SIZE_14}
          color={copied ? colors.white : colors.onPrimary}
          weight="semibold"
        />
        <Text style={[styles.btnText, copied && styles.btnTextCopied]}>
          {copied ? t('sync.invite.copied') : copy.copyBtn}
        </Text>
      </Pressable>

      <RNView style={styles.warningCard}>
        <SymbolIcon
          name="checkmark.shield"
          size={UI_ICON_SIZE_14}
          color={colors.primary}
          style={styles.iconTopFix}
        />
        <Text style={styles.warningText}>{copy.warning}</Text>
      </RNView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const isDark = theme.isDark
  const buttonBase = {
    borderRadius: 14,
    width: '100%' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

  const styles = StyleSheet.create({
    heroCard: {
      borderRadius: Radii.card,
      paddingHorizontal: Space.lg,
      paddingTop: Space.xl,
      paddingBottom: Space.xl,
      marginBottom: Space.xl,
      backgroundColor: theme.colors.cardSurface,
      borderColor: theme.colors.borderSecondary,
    },
    heroSection: {
      alignItems: 'center',
      position: 'relative',
    },
    heroCircle: {
      width: UI_SIZE_120,
      height: UI_SIZE_120,
      borderRadius: Radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.13 : 0.1),
    },
    heroBadge: {
      position: 'absolute',
      bottom: 0,
      right: '33%',
      width: UI_SIZE_36,
      height: UI_SIZE_36,
      borderRadius: Radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    heroTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.5,
      marginTop: Space.lg,
      marginBottom: Space.md,
      textAlign: 'center',
      color: theme.colors.text,
    },
    heroDesc: {
      fontSize: FontSize.body,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: Space.xxl,
      paddingHorizontal: Space.sm,
      color: theme.colors.textMuted,
    },
    primaryBtn: {
      ...buttonBase,
      paddingVertical: 17,
      backgroundColor: theme.colors.primary,
    },
    indicator: {
      marginRight: Space.sm,
    },
    btnText: {
      color: theme.colors.onPrimary,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.2,
    },
    btnTextCopied: {
      color: theme.colors.white,
    },
    countdownPill: {
      ...commonStyles.row,
      alignSelf: 'center',
      gap: Space.xs,
      paddingVertical: Space.xs,
      paddingHorizontal: Space.md,
      borderRadius: Radii.pill,
      marginBottom: Space.lg,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.12),
    },
    countdownPillUrgent: {
      backgroundColor: hexWithAlpha(theme.colors.error, 0.14),
    },
    countdownText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    countdownTextUrgent: {
      color: theme.colors.error,
    },
    qrSection: {
      width: '100%',
      alignItems: 'center',
      marginBottom: Space.lg,
    },
    qrImageWrap: {
      width: UI_SIZE_200,
      height: UI_SIZE_200,
      borderRadius: Radii.md,
      marginBottom: Space.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.white,
    },
    qrTitle: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      marginBottom: Space.xs,
      color: theme.colors.text,
    },
    qrDescription: {
      fontSize: FontSize.caption,
      lineHeight: 18,
      textAlign: 'center',
      color: theme.colors.textMuted,
      paddingHorizontal: Space.sm,
    },
    shareQrBtn: {
      ...commonStyles.row,
      gap: Space.xs,
      marginTop: Space.md,
      paddingVertical: Space.sm,
      paddingHorizontal: Space.base,
      borderRadius: Radii.pill,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.1),
    },
    shareQrBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    codeLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      paddingBottom: Space.md,
      width: '100%',
      color: theme.colors.text,
    },
    codeBox: {
      borderStyle: 'dashed',
      borderRadius: Radii.md,
      paddingVertical: 15,
      paddingHorizontal: Space.md,
      width: '100%',
      backgroundColor: theme.colors.codeBg,
      borderColor: isDark
        ? hexWithAlpha(theme.colors.white, 0.18)
        : hexWithAlpha(theme.colors.black, 0.12),
    },
    codeScrollContent: {
      paddingHorizontal: 2,
    },
    codeText: {
      fontFamily: MonoFontFamily,
      fontSize: FontSize.caption,
      letterSpacing: 1,
      color: theme.colors.text,
    },
    copyBtn: {
      ...buttonBase,
      gap: Space.sm,
      paddingVertical: Space.base,
      marginTop: Space.md,
    },
    copyBtnDefault: {
      backgroundColor: theme.colors.primary,
    },
    copyBtnCopied: {
      backgroundColor: theme.colors.success,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      borderRadius: Radii.card,
      padding: 14,
      marginTop: Space.md,
      backgroundColor: hexWithAlpha(theme.colors.primary, isDark ? 0.07 : 0.08),
      borderColor: hexWithAlpha(theme.colors.primary, isDark ? 0.2 : 0.25),
    },
    iconTopFix: {
      marginTop: 1,
    },
    warningText: {
      flex: 1,
      fontSize: FontSize.caption,
      lineHeight: 17,
      color: theme.colors.textMuted,
    },
  })
  return styles
})
