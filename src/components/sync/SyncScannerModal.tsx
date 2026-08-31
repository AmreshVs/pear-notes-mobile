import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View as RNView } from 'react-native'
import { CameraView } from 'expo-camera'

import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text } from '@/components/Themed'
import {
  commonStyles,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_20,
} from '@/constants/commonStyles'

type Props = {
  visible: boolean
  hasScanned: boolean
  cameraGranted: boolean
  scanError: string | null
  onClose: () => void
  onBarcodeScanned: (result: { data: string }) => void
  onRequestPermission: () => void
  onAttachImage: () => void
}

export function SyncScannerModal({
  visible,
  hasScanned,
  cameraGranted,
  scanError,
  onClose,
  onBarcodeScanned,
  onRequestPermission,
  onAttachImage,
}: Props) {
  const { t } = useTranslation()
  const styles = useStyles()

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <RNView style={styles.scannerScreen}>
        {cameraGranted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={hasScanned ? undefined : onBarcodeScanned}
            />
            <RNView style={styles.scannerOverlay} pointerEvents="none">
              <RNView style={styles.scannerFrame} />
            </RNView>
            <RNView style={styles.scannerHeader}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.scannerCloseBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="xmark"
                  size={UI_ICON_SIZE_20}
                  color={styles.scannerTitle.color}
                  weight="semibold"
                />
              </Pressable>
            </RNView>
            <RNView style={styles.scannerFooter}>
              <Text style={styles.scannerTitle}>{t('sync.scanner.title')}</Text>
              <Text style={styles.scannerDescription}>{t('sync.scanner.description')}</Text>
              {!!scanError && <Text style={styles.scannerError}>{t(scanError)}</Text>}
              <Pressable
                onPress={onAttachImage}
                style={({ pressed }) => [styles.attachBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="photo.on.rectangle"
                  size={UI_ICON_SIZE_20}
                  color={styles.scannerTitle.color}
                  weight="semibold"
                />
                <Text style={styles.attachBtnText}>{t('sync.scanner.attachBtn')}</Text>
              </Pressable>
            </RNView>
          </>
        ) : (
          <RNView style={styles.scannerPermissionCard}>
            <Text style={styles.scannerTitle}>{t('sync.permissions.cameraTitle')}</Text>
            <Text style={styles.scannerDescription}>{t('sync.permissions.cameraDescription')}</Text>
            <Pressable
              onPress={onRequestPermission}
              style={({ pressed }) => [styles.permissionBtn, pressed && commonStyles.pressed]}
            >
              <Text style={styles.permissionBtnText}>{t('sync.permissions.allowBtn')}</Text>
            </Pressable>
            <Pressable
              onPress={onAttachImage}
              style={({ pressed }) => [styles.attachBtn, pressed && commonStyles.pressed]}
            >
              <SymbolIcon
                name="photo.on.rectangle"
                size={UI_ICON_SIZE_20}
                color={styles.scannerTitle.color}
                weight="semibold"
              />
              <Text style={styles.attachBtnText}>{t('sync.scanner.attachBtn')}</Text>
            </Pressable>
            {!!scanError && <Text style={styles.scannerError}>{t(scanError)}</Text>}
            <Pressable onPress={onClose} style={styles.permissionCancelBtn}>
              <Text style={styles.permissionCancelText}>{t('sync.permissions.cancelBtn')}</Text>
            </Pressable>
          </RNView>
        )}
      </RNView>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scannerScreen: {
      flex: 1,
      backgroundColor: theme.colors.black,
    },
    scannerOverlay: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Space.xl,
    },
    scannerFrame: {
      width: '100%',
      maxWidth: 280,
      maxHeight: 280,
      aspectRatio: 1,
      borderRadius: Radii.card,
      borderWidth: 2,
      borderColor: theme.colors.white,
      backgroundColor: theme.colors.transparent,
    },
    scannerHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: 56,
      paddingHorizontal: Space.lg,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    scannerCloseBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.scannerOverlay,
    },
    scannerFooter: {
      position: 'absolute',
      left: Space.lg,
      right: Space.lg,
      bottom: 56,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.lg,
      borderRadius: Radii.card,
      backgroundColor: theme.colors.scannerOverlay,
      gap: Space.sm,
    },
    scannerError: {
      fontSize: FontSize.caption,
      textAlign: 'center',
      fontWeight: FontWeight.semibold,
      color: theme.colors.error,
    },
    attachBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: Space.sm,
      marginTop: Space.xs,
      paddingVertical: Space.md,
      paddingHorizontal: Space.lg,
      borderRadius: Radii.pill,
      backgroundColor: theme.colors.scannerOverlay,
    },
    attachBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      color: theme.colors.white,
    },
    scannerPermissionCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Space.xl,
      gap: Space.md,
    },
    scannerTitle: {
      fontSize: FontSize.heading,
      fontWeight: FontWeight.bold,
      textAlign: 'center',
      color: theme.colors.white,
    },
    scannerDescription: {
      fontSize: FontSize.body,
      lineHeight: 21,
      textAlign: 'center',
      color: theme.colors.overlayText,
    },
    permissionBtn: {
      marginTop: Space.sm,
      borderRadius: Radii.md,
      paddingHorizontal: Space.xl,
      paddingVertical: Space.base,
      backgroundColor: theme.colors.primary,
    },
    permissionBtnText: {
      color: theme.colors.onPrimary,
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
    },
    permissionCancelBtn: {
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
    },
    permissionCancelText: {
      fontSize: FontSize.body,
      color: theme.colors.overlayText,
    },
  })
  return styles
})
