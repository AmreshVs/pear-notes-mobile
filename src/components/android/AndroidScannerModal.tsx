import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { CameraView, useCameraPermissions } from 'expo-camera'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_14,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_42,
  UI_SIZE_280,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onBackground: string
}

type AndroidScannerModalProps = {
  visible: boolean
  onClose: () => void
  onBarcodeScanned: (event: { data: string }) => void
  onAttachImage: () => void
  scanError: string | null
  hasScanned: boolean
}

export function AndroidScannerModal({
  visible,
  onClose,
  onBarcodeScanned,
  onAttachImage,
  scanError,
  hasScanned,
}: AndroidScannerModalProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const styles = useStyles()
  const md3Colors = useMD3Theme().colors
  const ripple = useMemo(() => androidRipple(md3Colors.onSurface), [md3Colors.onSurface])
  const rippleOnScrim = useMemo(() => androidRipple(theme.colors.white), [theme.colors.white])

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (hasScanned) return
      onBarcodeScanned({ data })
    },
    [hasScanned, onBarcodeScanned],
  )

  const handleRequestPermission = useCallback(async () => {
    if (cameraPermission && !cameraPermission.granted && !cameraPermission.canAskAgain) {
      await Linking.openSettings()
      return
    }
    await requestCameraPermission()
  }, [cameraPermission, requestCameraPermission])

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.scannerScreen}>
        {cameraPermission?.granted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />
            <View style={styles.scannerOverlay} pointerEvents="none">
              <View style={styles.scannerFrame} />
            </View>
            <View style={styles.scannerHeader}>
              <Pressable
                onPress={onClose}
                android_ripple={rippleOnScrim}
                style={styles.scannerCloseBtn}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={UI_ICON_SIZE_20}
                  color={theme.colors.white}
                />
              </Pressable>
            </View>
            <View style={styles.scannerFooter}>
              <Text style={styles.scannerTitle}>{t('sync.scanner.title')}</Text>
              <Text style={styles.scannerDesc}>{t('sync.scanner.description')}</Text>
              {!!scanError && <Text style={styles.scannerError}>{t(scanError)}</Text>}
              <Pressable
                onPress={onAttachImage}
                android_ripple={rippleOnScrim}
                style={styles.attachBtn}
              >
                <MaterialCommunityIcons
                  name="image-outline"
                  size={UI_ICON_SIZE_20}
                  color={theme.colors.white}
                />
                <Text style={styles.attachBtnText}>{t('sync.scanner.attachBtn')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.permissionCard}>
            <Text style={styles.scannerTitle}>{t('sync.permissions.cameraTitle')}</Text>
            <Text style={styles.scannerDesc}>{t('sync.permissions.cameraDescription')}</Text>
            <Pressable
              onPress={handleRequestPermission}
              android_ripple={ripple}
              style={styles.permissionBtn}
            >
              <Text style={styles.permissionBtnText}>{t('sync.permissions.allowBtn')}</Text>
            </Pressable>
            <Pressable onPress={onAttachImage} android_ripple={ripple} style={styles.attachBtn}>
              <MaterialCommunityIcons
                name="image-outline"
                size={UI_ICON_SIZE_20}
                color={styles.attachBtnText.color}
              />
              <Text style={styles.attachBtnText}>{t('sync.scanner.attachBtn')}</Text>
            </Pressable>
            {!!scanError && <Text style={styles.scannerError}>{t(scanError)}</Text>}
            <Pressable onPress={onClose} android_ripple={ripple} style={styles.permissionCancelBtn}>
              <Text style={styles.permissionCancelText}>{t('sync.permissions.cancelBtn')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  )
}

const useSyncHooks = () => {
  const md3 = useMD3Theme()
  const insets = useSafeAreaInsets()
  return { md3, insets }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3, insets }) => {
  const c = md3.colors as ExtendedColors
  const styles = StyleSheet.create({
    scannerScreen: {
      ...commonStyles.flex1,
      backgroundColor: theme.colors.qrDark,
    },
    scannerOverlay: {
      ...StyleSheet.absoluteFill,
      ...commonStyles.centered,
      paddingHorizontal: UI_SIZE_40,
    },
    scannerFrame: {
      width: '100%',
      maxWidth: UI_SIZE_280,
      maxHeight: UI_SIZE_280,
      aspectRatio: 1,
      borderRadius: UI_SIZE_20,
      borderColor: 'rgba(255,255,255,0.92)',
    },
    scannerHeader: {
      position: 'absolute',
      left: 0,
      right: 0,
      paddingHorizontal: UI_SIZE_16,
      ...commonStyles.row,
      justifyContent: 'flex-end',
      top: insets.top + UI_SIZE_16,
    },
    scannerCloseBtn: {
      overflow: 'hidden',
      width: UI_SIZE_42,
      height: UI_SIZE_42,
      borderRadius: UI_SIZE_9999,
      ...commonStyles.centered,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    scannerFooter: {
      position: 'absolute',
      left: UI_SIZE_20,
      right: UI_SIZE_20,
      padding: UI_SIZE_20,
      borderRadius: UI_SIZE_20,
      backgroundColor: 'rgba(0,0,0,0.55)',
      gap: UI_SIZE_8,
      bottom: insets.bottom + UI_SIZE_24,
    },
    scannerTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      textAlign: 'center',
      color: theme.colors.white,
    },
    scannerDesc: {
      fontSize: FontSize.body,
      lineHeight: UI_SIZE_20,
      textAlign: 'center',
      color: theme.colors.overlayText,
      fontFamily: FontFamily.regular,
    },
    scannerError: {
      fontSize: FontSize.caption,
      textAlign: 'center',
      color: c.error,
      fontFamily: FontFamily.semiBold,
    },
    attachBtn: {
      overflow: 'hidden',
      ...commonStyles.row,
      alignSelf: 'center',
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_8,
      paddingVertical: UI_SIZE_12,
      paddingHorizontal: UI_SIZE_20,
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(theme.colors.white, 0.16),
    },
    attachBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.white,
    },
    permissionCard: {
      ...commonStyles.flex1,
      ...commonStyles.centered,
      paddingHorizontal: UI_SIZE_40,
      gap: UI_SIZE_12,
    },
    permissionBtn: {
      overflow: 'hidden',
      marginTop: UI_SIZE_8,
      borderRadius: UI_SIZE_9999,
      paddingHorizontal: UI_SIZE_32,
      paddingVertical: UI_SIZE_14,
      backgroundColor: c.primary,
    },
    permissionBtnText: {
      fontSize: FontSize.subtitle,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onPrimary || theme.colors.text,
    },
    permissionCancelBtn: {
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
    },
    permissionCancelText: {
      fontSize: FontSize.body,
      color: theme.colors.overlayTextMuted,
      fontFamily: FontFamily.regular,
    },
  })

  return styles
}, useSyncHooks)
