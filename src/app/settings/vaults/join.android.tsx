import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native'
import { TextInput as PaperTextInput } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import * as Clipboard from 'expo-clipboard'
import { Stack } from 'expo-router'

import { MAX_VAULTS, VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'

import { AndroidScannerModal } from '@/components/android/AndroidScannerModal'
import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { JoinChoiceCard } from '@/components/sync/JoinChoiceCard'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  UI_ICON_SIZE_18,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultLabel } from '@/lib/vaultLabels'

import { useJoinVaultScreen } from './useJoinVaultScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  onSurfaceVariant?: string
}

export default function AndroidJoinVaultScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const {
    openVault,
    vaultName,
    setVaultName,
    code,
    setCode,
    showCodeHint,
    nameFromInvite,
    hasNotes,
    canAdd,
    choice,
    setChoice,
    keepsSeparate,
    canJoin,
    join,
    scanner,
  } = useJoinVaultScreen()
  const openVaultName = getVaultLabel(openVault, t)
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const ripplePrimary = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])

  const handlePaste = useCallback(async () => {
    const text = (await Clipboard.getStringAsync()).trim()
    if (text) setCode(text)
  }, [setCode])

  const renderPasteIcon = useCallback(
    ({ size }: { size: number }) => (
      <MaterialCommunityIcons name="content-paste" size={size} color={c.primary} />
    ),
    [c.primary],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />
      <AndroidSettingsAppBar title={t('vaults.join.sectionTitle')} />

      <KeyboardAvoidingView behavior="height" style={commonStyles.flex1}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.description}>{t('vaults.join.screenDesc')}</Text>

          <View style={styles.pillRow}>
            <Pressable
              onPress={scanner.openScanner}
              android_ripple={ripple}
              accessibilityRole="button"
              accessibilityLabel={t('sync.paste.scanBtn')}
              style={styles.pill}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={UI_ICON_SIZE_18} color={c.primary} />
              <Text style={styles.pillText}>{t('sync.paste.scanBtn')}</Text>
            </Pressable>
            <Pressable
              onPress={scanner.attachQrImage}
              android_ripple={ripple}
              accessibilityRole="button"
              accessibilityLabel={t('sync.paste.attachBtn')}
              style={styles.pill}
            >
              <MaterialCommunityIcons
                name="image-outline"
                size={UI_ICON_SIZE_18}
                color={c.primary}
              />
              <Text style={styles.pillText}>{t('sync.paste.attachBtn')}</Text>
            </Pressable>
          </View>

          <PaperTextInput
            mode="outlined"
            value={code}
            onChangeText={setCode}
            onSubmitEditing={join}
            label={t('vaults.join.codeLabel')}
            placeholder={t('vaults.join.linkPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            error={showCodeHint}
            right={
              <PaperTextInput.Icon
                icon={renderPasteIcon}
                onPress={handlePaste}
                accessibilityLabel={t('sync.paste.pasteBtn')}
              />
            }
          />
          {!scanner.scannerVisible && !!scanner.scanError && (
            <Text style={styles.error}>{t(scanner.scanError)}</Text>
          )}
          {!scanner.scanError && showCodeHint && (
            <Text style={styles.hint}>{t('sync.paste.hintInvalid')}</Text>
          )}

          <JoinChoiceCard
            hasNotes={hasNotes}
            vaultName={openVaultName}
            choice={choice}
            canKeepSeparate={canAdd}
            maxVaults={MAX_VAULTS}
            onSelect={setChoice}
          />

          {keepsSeparate && (
            <PaperTextInput
              mode="outlined"
              value={vaultName}
              onChangeText={setVaultName}
              maxLength={VAULT_NAME_MAX_LENGTH}
              label={t('vaults.nameLabel')}
              placeholder={t('vaults.namePlaceholder')}
            />
          )}
          {keepsSeparate && nameFromInvite && (
            <Text style={styles.hint}>{t('vaults.join.nameFromInvite')}</Text>
          )}

          <Pressable
            onPress={join}
            disabled={!canJoin}
            android_ripple={ripplePrimary}
            accessibilityRole="button"
            style={canJoin ? styles.joinBtn : styles.joinBtnDisabled}
          >
            <Text style={styles.joinBtnText}>{t('vaults.join.joinBtn')}</Text>
          </Pressable>

          <Text style={styles.hint}>{t('vaults.join.hint')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <AndroidScannerModal
        visible={scanner.scannerVisible}
        onClose={scanner.closeScanner}
        onBarcodeScanned={scanner.handleBarcodeScanned}
        onAttachImage={scanner.attachQrImage}
        scanError={scanner.scanError}
        hasScanned={scanner.hasScanned}
      />
    </View>
  )
}

const useJoinHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((_theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const joinBase = {
    borderRadius: UI_SIZE_9999,
    paddingVertical: UI_SIZE_12,
    marginTop: UI_SIZE_8,
    overflow: 'hidden' as const,
    ...commonStyles.centered,
  }
  const styles = StyleSheet.create({
    root: {
      ...commonStyles.flex1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_20,
      paddingBottom: insets.bottom + UI_SIZE_40,
      gap: UI_SIZE_16,
    },
    description: {
      fontSize: FontSize.body,
      color: c.onSurfaceVariant,
    },
    pillRow: {
      ...commonStyles.row,
      gap: UI_SIZE_8,
    },
    pill: {
      ...commonStyles.row,
      gap: UI_SIZE_4,
      paddingVertical: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      backgroundColor: hexWithAlpha(c.primaryContainer || c.primary, 0.15),
    },
    pillText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.primary,
    },
    error: {
      fontSize: FontSize.caption,
      color: c.error,
    },
    hint: {
      fontSize: FontSize.caption,
      color: c.onSurfaceVariant,
    },
    joinBtn: {
      ...joinBase,
      backgroundColor: c.primary,
    },
    joinBtnDisabled: {
      ...joinBase,
      backgroundColor: hexWithAlpha(c.onSurface, 0.12),
    },
    joinBtnText: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onPrimary,
    },
  })
  return styles
}, useJoinHooks)
