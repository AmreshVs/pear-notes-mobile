import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type DimensionValue,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_16,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_ICON_SIZE_28,
  UI_SIZE_4,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_40,
  UI_SIZE_54,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { PASSWORD_RULE_KEYS } from '@/utils/passwordStrength'

import useNoteLockPasswordScreen from './useNoteLockPasswordScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  surfaceContainerHighest?: string
  primaryContainer?: string
  onSurfaceVariant?: string
  onPrimary?: string
}

export default function AndroidNoteLockPasswordScreen() {
  const { t } = useTranslation()
  const { mode } = useLocalSearchParams<{ mode: string; purpose: string }>()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const rippleBorderless = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const ripplePrimary = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])
  const styles = useStyles()

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
    error,
    setError,
    submit,
  } = useNoteLockPasswordScreen(mode)

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

  const renderRule = useCallback(
    (rule: (typeof PASSWORD_RULE_KEYS)[number]) => {
      const met = strength.checks[rule.key]
      return (
        <View key={rule.key} style={styles.ruleRow}>
          <MaterialCommunityIcons
            name={met ? 'check-circle' : 'circle-outline'}
            size={UI_ICON_SIZE_16}
            color={met ? c.primary : c.onSurfaceVariant}
          />
          <Text style={met ? styles.ruleTextMet : styles.ruleText}>{t(rule.labelKey)}</Text>
        </View>
      )
    },
    [strength.checks, styles, c, t],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          android_ripple={rippleBorderless}
          hitSlop={UI_SIZE_12}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isCreate ? t('noteLockPassword.createTitle') : t('noteLockPassword.enterTitle')}
        </Text>
      </View>

      <KeyboardAvoidingView style={commonStyles.flex1} behavior={undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconChip}>
            <MaterialCommunityIcons name="lock" size={UI_ICON_SIZE_28} color={c.primary} />
          </View>

          <Text style={styles.subtitle}>
            {isCreate ? t('noteLockPassword.createDesc') : t('noteLockPassword.enterDesc')}
          </Text>

          {isCreate && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={UI_ICON_SIZE_16}
                color={c.primary}
              />
              <Text style={styles.warningText}>{t('noteLockPassword.warning')}</Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('noteLockPassword.placeholder')}
              placeholderTextColor={c.onSurfaceVariant}
              secureTextEntry={secure}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              autoFocus={!isCreate}
            />
            <Pressable
              onPress={toggleSecure}
              android_ripple={rippleBorderless}
              hitSlop={UI_SIZE_12}
              style={styles.eyeBtn}
            >
              <MaterialCommunityIcons
                name={secure ? 'eye-outline' : 'eye-off-outline'}
                size={UI_ICON_SIZE_20}
                color={c.onSurfaceVariant}
              />
            </Pressable>
          </View>

          {isCreate && (
            <>
              <View style={styles.inputRow}>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder={t('noteLockPassword.confirmPlaceholder')}
                  placeholderTextColor={c.onSurfaceVariant}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <View style={styles.strengthRow}>
                <View style={styles.barTrack}>
                  <View style={barFillStyle} />
                </View>
                <Text style={styles.strengthLabel}>{t(strength.labelKey)}</Text>
              </View>

              <View style={styles.rules}>{PASSWORD_RULE_KEYS.map(renderRule)}</View>

              {confirm.length > 0 && !passwordsMatch && (
                <Text style={styles.mismatch}>{t('noteLockPassword.mismatch')}</Text>
              )}
            </>
          )}

          {error.length > 0 && <Text style={styles.mismatch}>{error}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            android_ripple={ripplePrimary}
            style={[styles.confirmBtn, !canSubmit && styles.confirmBtnDisabled]}
          >
            <Text style={[styles.confirmBtnText, !canSubmit && styles.confirmBtnTextDisabled]}>
              {isCreate ? t('noteLockPassword.createButton') : t('noteLockPassword.unlockButton')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const useNoteLockPasswordHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    header: {
      ...commonStyles.row,
      paddingTop: insets.top + UI_SIZE_16,
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: UI_SIZE_16,
    },
    iconBtn: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      ...commonStyles.centered,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    scroll: {
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_16,
      paddingBottom: UI_SIZE_20,
      gap: UI_SIZE_12,
    },
    iconChip: {
      alignSelf: 'center',
      width: 72,
      height: 72,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      ...commonStyles.centered,
      marginBottom: UI_SIZE_4,
    },
    subtitle: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: FontSize.body * 1.45,
      marginBottom: UI_SIZE_12,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: UI_SIZE_12,
      padding: UI_SIZE_16,
      borderRadius: UI_SIZE_16,
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
      marginBottom: UI_SIZE_4,
    },
    warningText: {
      flex: 1,
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: FontSize.caption * 1.5,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceContainerHighest ?? c.surfaceVariant,
      borderRadius: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
      minHeight: UI_SIZE_54,
    },
    input: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    eyeBtn: {
      paddingLeft: UI_SIZE_12,
    },
    strengthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_12,
      marginTop: UI_SIZE_4,
    },
    barTrack: {
      flex: 1,
      height: UI_SIZE_4,
      borderRadius: UI_SIZE_4,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: UI_SIZE_4,
    },
    barError: {
      backgroundColor: c.error,
    },
    barPrimary: {
      backgroundColor: c.primary,
    },
    barSuccess: {
      backgroundColor: c.primary,
    },
    strengthLabel: {
      width: 64,
      textAlign: 'right',
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
    },
    rules: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: UI_SIZE_4,
      columnGap: UI_SIZE_12,
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
      color: c.onSurfaceVariant,
    },
    ruleTextMet: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurface,
    },
    mismatch: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.error,
      marginLeft: UI_SIZE_4,
    },
    footer: {
      paddingHorizontal: UI_SIZE_20,
      paddingTop: UI_SIZE_12,
      paddingBottom: Math.max(insets.bottom, UI_SIZE_16),
      backgroundColor: c.background,
    },
    confirmBtn: {
      overflow: 'hidden',
      ...commonStyles.centered,
      minHeight: UI_SIZE_54,
      borderRadius: UI_SIZE_9999,
      backgroundColor: c.primary,
    },
    confirmBtnDisabled: {
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
    },
    confirmBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onPrimary,
    },
    confirmBtnTextDisabled: {
      color: hexWithAlpha(c.onSurface, 0.38),
    },
  })
  return styles
}, useNoteLockPasswordHooks)
