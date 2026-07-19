import { Stack, useLocalSearchParams } from 'expo-router'
import { Check, Eye, EyeOff, Lock, X } from 'lucide-react-native'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type DimensionValue,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View as RNView,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import useBackupPasswordScreen from './useBackupPasswordScreen'

import { createThemedStylesheet, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_18,
  UI_ICON_SIZE_28,
  UI_SIZE_16,
  UI_SIZE_4,
  UI_SIZE_54,
  UI_SIZE_8,
} from '@/constants/commonStyles'
import { PASSWORD_RULE_KEYS } from '@/utils/passwordStrength'

export default function BackupPasswordScreen() {
  const { t } = useTranslation()
  const { mode } = useLocalSearchParams<{ mode: string }>()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)

  const handleRevealRequirements = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)
  }, [])

  const {
    isCreate,
    password,
    setPassword,
    confirm,
    setConfirm,
    secure,
    toggleSecure,
    strength,
    passwordsMatch,
    canSubmit,
    submit,
  } = useBackupPasswordScreen(mode)

  const barFillStyle = useMemo(() => {
    const colorStyle =
      strength.score >= 5
        ? styles.barSuccess
        : strength.score >= 3
          ? styles.barPrimary
          : styles.barError
    const width = `${(strength.score / 5) * 100}%` as DimensionValue
    return [styles.barFill, colorStyle, { width }]
  }, [strength.score, styles.barFill, styles.barSuccess, styles.barPrimary, styles.barError])

  const footerStyle = useMemo(
    () => [styles.footer, { paddingBottom: Math.max(insets.bottom, UI_SIZE_16) }],
    [styles.footer, insets.bottom],
  )

  const handleSubmit = useCallback(() => {
    submit(t('backup.progress.restoringDesc'))
  }, [submit, t])

  const renderRule = useCallback(
    (rule: (typeof PASSWORD_RULE_KEYS)[number]) => {
      const met = strength.checks[rule.key]
      return (
        <RNView key={rule.key} style={styles.ruleRow}>
          {met ? (
            <Check size={UI_ICON_SIZE_16} color={colors.success} strokeWidth={2.5} />
          ) : (
            <X size={UI_ICON_SIZE_16} color={colors.textMuted} strokeWidth={2.5} />
          )}
          <Text style={met ? styles.ruleTextMet : styles.ruleText}>{t(rule.labelKey)}</Text>
        </RNView>
      )
    },
    [strength.checks, styles, colors, t],
  )

  return (
    <RNView style={styles.root}>
      <Stack.Screen
        options={{
          title: isCreate ? t('backup.password.createTitle') : t('backup.password.enterTitle'),
        }}
      />
      <KeyboardAvoidingView
        style={commonStyles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + UI_SIZE_54}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <RNView style={styles.iconCircle}>
            <Lock size={UI_ICON_SIZE_28} color={colors.primary} strokeWidth={2} />
          </RNView>

          <Text style={styles.subtitle}>
            {isCreate ? t('backup.password.createDesc') : t('backup.password.enterDesc')}
          </Text>

          <RNView style={styles.inputRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('backup.password.placeholder')}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={secure}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={handleRevealRequirements}
              style={styles.input}
            />
            <Pressable onPress={toggleSecure} hitSlop={UI_SIZE_8} style={styles.eyeBtn}>
              {secure ? (
                <Eye size={UI_ICON_SIZE_18} color={colors.textMuted} />
              ) : (
                <EyeOff size={UI_ICON_SIZE_18} color={colors.textMuted} />
              )}
            </Pressable>
          </RNView>

          {isCreate && (
            <>
              <RNView style={styles.inputRow}>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder={t('backup.password.confirmPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </RNView>

              <RNView style={styles.strengthRow}>
                <RNView style={styles.barTrack}>
                  <RNView style={barFillStyle} />
                </RNView>
                <Text style={styles.strengthLabel}>{t(strength.labelKey)}</Text>
              </RNView>

              <RNView style={styles.rules}>{PASSWORD_RULE_KEYS.map(renderRule)}</RNView>

              {confirm.length > 0 && !passwordsMatch && (
                <Text style={styles.mismatch}>{t('backup.password.mismatch')}</Text>
              )}
            </>
          )}
        </ScrollView>

        <RNView style={footerStyle}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.confirmBtn,
              !canSubmit && styles.confirmBtnDisabled,
              pressed && commonStyles.pressed,
            ]}
          >
            <Text style={styles.confirmBtnText}>
              {isCreate ? t('backup.password.createButton') : t('backup.password.restoreButton')}
            </Text>
          </Pressable>
        </RNView>
      </KeyboardAvoidingView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      paddingHorizontal: Space.xl,
      paddingTop: Space.xl,
      paddingBottom: Space.lg,
      gap: Space.md,
    },
    iconCircle: {
      alignSelf: 'center',
      width: 64,
      height: 64,
      borderRadius: Radii.lg,
      backgroundColor: theme.colors.cardSelected,
      ...commonStyles.centered,
      marginBottom: Space.sm,
    },
    subtitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.45,
      marginBottom: Space.md,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.controlBackground,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSecondary,
      paddingHorizontal: Space.md,
      height: UI_SIZE_54,
    },
    input: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.text,
    },
    eyeBtn: {
      paddingLeft: Space.sm,
    },
    strengthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.md,
      marginTop: UI_SIZE_4,
    },
    barTrack: {
      flex: 1,
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_4,
      backgroundColor: theme.colors.borderSecondary,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: UI_SIZE_4,
    },
    barError: {
      backgroundColor: theme.colors.error,
    },
    barPrimary: {
      backgroundColor: theme.colors.primary,
    },
    barSuccess: {
      backgroundColor: theme.colors.success,
    },
    strengthLabel: {
      width: 64,
      textAlign: 'right',
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.textMuted,
    },
    rules: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: UI_SIZE_4,
      columnGap: Space.md,
      marginTop: UI_SIZE_4,
    },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_4,
      width: '46%',
    },
    ruleText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
    },
    ruleTextMet: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.success,
    },
    mismatch: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.error,
      marginLeft: UI_SIZE_4,
    },
    footer: {
      paddingHorizontal: Space.xl,
      paddingTop: Space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.borderSecondary,
      backgroundColor: theme.colors.background,
    },
    confirmBtn: {
      ...commonStyles.centered,
      height: UI_SIZE_54,
      borderRadius: Radii.lg,
      backgroundColor: theme.colors.primary,
    },
    confirmBtnDisabled: {
      opacity: 0.4,
    },
    confirmBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.onPrimary,
    },
  })
  return styles
})
