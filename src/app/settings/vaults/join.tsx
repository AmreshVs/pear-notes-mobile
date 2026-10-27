import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, TextInput, View as RNView } from 'react-native'
import * as Clipboard from 'expo-clipboard'

import { MAX_VAULTS, VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'

import { SymbolIcon } from '@/components/SymbolIcon'
import { JoinChoiceCard } from '@/components/sync/JoinChoiceCard'
import { SyncScannerModal } from '@/components/sync/SyncScannerModal'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_14,
  UI_ICON_SIZE_18,
  UI_SIZE_32,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getVaultLabel } from '@/lib/vaultLabels'

import { useJoinVaultScreen } from './useJoinVaultScreen'

export default function JoinVaultScreen() {
  const { t } = useTranslation()
  const styles = useStyles()
  const colors = useColors()
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

  const handlePaste = useCallback(async () => {
    const text = (await Clipboard.getStringAsync()).trim()
    if (text) setCode(text)
  }, [setCode])

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.description}>{t('vaults.join.screenDesc')}</Text>

      <RNView style={styles.section}>
        <RNView style={styles.labelRow}>
          <Text style={styles.label}>{t('vaults.join.codeLabel')}</Text>
          <RNView style={styles.pillRow}>
            <Pressable
              onPress={scanner.attachQrImage}
              accessibilityRole="button"
              accessibilityLabel={t('sync.paste.attachBtn')}
              style={({ pressed }) => [styles.pill, pressed && commonStyles.pressed]}
            >
              <SymbolIcon name="photo.on.rectangle" size={UI_ICON_SIZE_14} color={colors.primary} />
              <Text style={styles.pillText}>{t('sync.paste.attachBtn')}</Text>
            </Pressable>
            <Pressable
              onPress={scanner.openScanner}
              accessibilityRole="button"
              accessibilityLabel={t('sync.paste.scanBtn')}
              style={({ pressed }) => [styles.pill, pressed && commonStyles.pressed]}
            >
              <SymbolIcon name="qrcode.viewfinder" size={UI_ICON_SIZE_14} color={colors.primary} />
              <Text style={styles.pillText}>{t('sync.paste.scanBtn')}</Text>
            </Pressable>
          </RNView>
        </RNView>
        <RNView style={styles.codeRow}>
          <TextInput
            value={code}
            onChangeText={setCode}
            onSubmitEditing={join}
            placeholder={t('vaults.join.linkPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('vaults.join.codeLabel')}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.codeInput}
          />
          <Pressable
            onPress={handlePaste}
            hitSlop={Space.sm}
            accessibilityRole="button"
            accessibilityLabel={t('sync.paste.pasteBtn')}
            style={({ pressed }) => [styles.pasteButton, pressed && commonStyles.pressed]}
          >
            <SymbolIcon name="doc.on.clipboard" size={UI_ICON_SIZE_18} color={colors.primary} />
          </Pressable>
        </RNView>
        {!scanner.scannerVisible && !!scanner.scanError && (
          <Text style={styles.error}>{t(scanner.scanError)}</Text>
        )}
        {!scanner.scanError && showCodeHint && (
          <Text style={styles.hint}>{t('sync.paste.hintInvalid')}</Text>
        )}
      </RNView>

      <JoinChoiceCard
        hasNotes={hasNotes}
        vaultName={openVaultName}
        choice={choice}
        canKeepSeparate={canAdd}
        maxVaults={MAX_VAULTS}
        onSelect={setChoice}
      />

      {keepsSeparate && (
        <RNView style={styles.section}>
          <Text style={styles.label}>{t('vaults.nameLabel')}</Text>
          <RNView style={styles.inputRow}>
            <TextInput
              value={vaultName}
              onChangeText={setVaultName}
              maxLength={VAULT_NAME_MAX_LENGTH}
              placeholder={t('vaults.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('vaults.nameLabel')}
              style={styles.input}
            />
          </RNView>
          {nameFromInvite && <Text style={styles.hint}>{t('vaults.join.nameFromInvite')}</Text>}
        </RNView>
      )}

      <Pressable
        onPress={join}
        disabled={!canJoin}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.joinBtn,
          !canJoin && commonStyles.disabled,
          pressed && commonStyles.pressed,
        ]}
      >
        <Text style={styles.joinBtnText}>{t('vaults.join.joinBtn')}</Text>
      </Pressable>

      <Text style={styles.hint}>{t('vaults.join.hint')}</Text>

      <SyncScannerModal
        visible={scanner.scannerVisible}
        onAttachImage={scanner.attachQrImage}
        scanError={scanner.scanError}
        hasScanned={scanner.hasScanned}
        cameraGranted={scanner.cameraGranted}
        onClose={scanner.closeScanner}
        onBarcodeScanned={scanner.handleBarcodeScanned}
        onRequestPermission={scanner.requestPermission}
      />
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scroll: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.md,
      paddingBottom: Space.scrollBottom,
      gap: Space.xl,
    },
    description: {
      fontSize: FontSize.body,
      color: theme.colors.textSecondary,
    },
    section: {
      gap: Space.sm,
    },
    labelRow: {
      ...commonStyles.rowBetween,
    },
    label: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.text,
    },
    pillRow: {
      ...commonStyles.row,
      gap: Space.xs,
    },
    pill: {
      ...commonStyles.row,
      gap: Space.xs,
      paddingVertical: Space.xs,
      paddingHorizontal: Space.sm,
      borderRadius: Radii.xs,
      backgroundColor: hexWithAlpha(theme.colors.primary, 0.1),
    },
    pillText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      color: theme.colors.primary,
    },
    codeRow: {
      ...commonStyles.row,
      gap: Space.xs,
      borderRadius: Space.base,
      paddingLeft: Space.base,
      paddingRight: Space.xs,
      paddingVertical: Space.xs,
      backgroundColor: theme.colors.inputBackground,
    },
    inputRow: {
      borderRadius: Space.base,
      paddingHorizontal: Space.base,
      paddingVertical: Space.xs,
      backgroundColor: theme.colors.inputBackground,
    },
    input: {
      fontSize: FontSize.body,
      paddingVertical: Space.sm,
      color: theme.colors.text,
    },
    codeInput: {
      ...commonStyles.flex1,
      fontSize: FontSize.body,
      paddingVertical: Space.sm,
      color: theme.colors.text,
    },
    pasteButton: {
      ...commonStyles.centered,
      width: UI_SIZE_32,
      height: UI_SIZE_32,
    },
    error: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      color: theme.colors.error,
    },
    hint: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    joinBtn: {
      borderRadius: Space.md,
      paddingVertical: Space.md,
      ...commonStyles.centered,
      backgroundColor: theme.colors.primary,
    },
    joinBtnText: {
      color: theme.colors.onPrimary,
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
    },
  })
  return styles
})
