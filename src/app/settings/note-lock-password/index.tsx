import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type DimensionValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View as RNView,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams } from 'expo-router'

import { PASSWORD_MAX_LENGTH } from '@pear-notes/core/constant.js'

import { SymbolIcon } from '@/components/SymbolIcon'
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
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_54,
} from '@/constants/commonStyles'
import { useFocusAfterTransition } from '@/hooks/useFocusAfterTransition'
import { useKeyboardOverlap } from '@/hooks/useKeyboardOverlap'
import { PASSWORD_RULE_KEYS } from '@/utils/passwordStrength'

import useNoteLockPasswordScreen from './useNoteLockPasswordScreen'

export default function NoteLockPasswordScreen() {
  const { t } = useTranslation()
  const { mode, purpose } = useLocalSearchParams<{ mode: string; purpose: string }>()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const currentRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const noFocusRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)
  const overlap = useKeyboardOverlap()

  const {
    isCreate,
    needsCurrent,
    copy,
    reason,
    current,
    setCurrent,
    password,
    setPassword,
    confirm,
    setConfirm,
    secure,
    toggleSecure,
    strength,
    passwordsMatch,
    canSubmit,
    error,
    setError,
    understood,
    setUnderstood,
    showUnderstood,
    submit,
  } = useNoteLockPasswordScreen(mode, purpose)

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
    () => [
      styles.footer,
      { paddingBottom: overlap > 0 ? UI_SIZE_16 : Math.max(insets.bottom, UI_SIZE_16) },
    ],
    [styles.footer, insets.bottom, overlap],
  )

  const bodyStyle = useMemo(() => [commonStyles.flex1, { paddingBottom: overlap }], [overlap])

  const handleSubmit = useCallback(async () => {
    const failure = await submit()
    if (failure) {
      setError(
        failure.retryAfter > 0
          ? t('noteLockPassword.tooManyAttempts', { seconds: failure.retryAfter })
          : t('noteLockPassword.incorrect'),
      )
    }
  }, [submit, setError, t])

  useFocusAfterTransition(needsCurrent ? currentRef : isCreate ? noFocusRef : passwordRef)

  const focusPassword = useCallback(() => passwordRef.current?.focus(), [])

  const handleNext = useCallback(() => {
    if (isCreate) confirmRef.current?.focus()
    else handleSubmit()
  }, [isCreate, handleSubmit])

  const renderRule = useCallback(
    (rule: (typeof PASSWORD_RULE_KEYS)[number]) => {
      const met = strength.checks[rule.key]
      return (
        <RNView key={rule.key} style={styles.ruleRow}>
          {met ? (
            <SymbolIcon
              name="checkmark"
              size={UI_ICON_SIZE_16}
              color={colors.success}
              weight="semibold"
            />
          ) : (
            <SymbolIcon
              name="xmark"
              size={UI_ICON_SIZE_16}
              color={colors.textMuted}
              weight="semibold"
            />
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
          title: t(copy.title),
        }}
      />
      <RNView style={bodyStyle}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <RNView style={styles.iconCircle}>
            <SymbolIcon name="lock" size={UI_ICON_SIZE_28} color={colors.primary} weight="medium" />
          </RNView>

          <Text style={styles.subtitle}>{(!isCreate && reason) || t(copy.desc)}</Text>

          {isCreate && (
            <RNView style={styles.warningBox}>
              <SymbolIcon
                name="exclamationmark.triangle"
                size={UI_ICON_SIZE_16}
                color={colors.primary}
                weight="medium"
              />
              <Text style={styles.warningText}>{t('noteLockPassword.warning')}</Text>
            </RNView>
          )}

          {showUnderstood && (
            <RNView style={styles.understoodRow}>
              <Text style={styles.understoodText}>{t('noteLockPassword.understood')}</Text>
              <Switch
                value={understood}
                onValueChange={setUnderstood}
                trackColor={{ false: colors.borderSecondary, true: colors.primary }}
              />
            </RNView>
          )}

          {needsCurrent && (
            <RNView style={styles.inputRow}>
              <TextInput
                ref={currentRef}
                value={current}
                onChangeText={setCurrent}
                placeholder={t('noteLockPassword.currentPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={secure}
                maxLength={PASSWORD_MAX_LENGTH}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={focusPassword}
                style={styles.input}
              />
            </RNView>
          )}

          <RNView style={styles.inputRow}>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder={t(copy.placeholder)}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={secure}
              maxLength={PASSWORD_MAX_LENGTH}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isCreate ? 'new-password' : 'current-password'}
              textContentType={isCreate ? 'newPassword' : 'password'}
              returnKeyType={isCreate ? 'next' : 'done'}
              submitBehavior={isCreate ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={handleNext}
              style={styles.input}
            />
            <Pressable onPress={toggleSecure} hitSlop={UI_SIZE_8} style={styles.eyeBtn}>
              {secure ? (
                <SymbolIcon name="eye" size={UI_ICON_SIZE_18} color={colors.textMuted} />
              ) : (
                <SymbolIcon name="eye.slash" size={UI_ICON_SIZE_18} color={colors.textMuted} />
              )}
            </Pressable>
          </RNView>

          {isCreate && (
            <>
              <RNView style={styles.inputRow}>
                <TextInput
                  ref={confirmRef}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder={t('noteLockPassword.confirmPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={secure}
                  maxLength={PASSWORD_MAX_LENGTH}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
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
                <Text style={styles.mismatch}>{t('noteLockPassword.mismatch')}</Text>
              )}
            </>
          )}

          {error.length > 0 && <Text style={styles.mismatch}>{error}</Text>}
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
            <Text style={styles.confirmBtnText}>{t(copy.button)}</Text>
          </Pressable>
        </RNView>
      </RNView>
    </RNView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.backgroundElevated,
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
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      padding: Space.md,
      borderRadius: Radii.md,
      backgroundColor: theme.colors.cardSelected,
      marginBottom: Space.sm,
    },
    understoodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
      marginBottom: Space.sm,
    },
    understoodText: {
      flex: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
      lineHeight: FontSize.caption * 1.5,
    },
    warningText: {
      flex: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: theme.colors.textSecondary,
      lineHeight: FontSize.caption * 1.5,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.controlBackground,
      borderRadius: Radii.md,
      borderColor: theme.colors.borderSecondary,
      paddingHorizontal: Space.md,
      minHeight: UI_SIZE_54,
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
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: Space.xl,
      paddingTop: Space.md,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundElevated,
    },
    confirmBtn: {
      ...commonStyles.centered,
      minHeight: UI_SIZE_54,
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
