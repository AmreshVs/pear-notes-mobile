import { Alert, Linking } from 'react-native'

export function showCameraPermissionAlert(t: (key: string) => string) {
  Alert.alert(t('permissions.camera.title'), t('permissions.camera.message'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('permissions.openSettings'), onPress: () => Linking.openSettings() },
  ])
}
