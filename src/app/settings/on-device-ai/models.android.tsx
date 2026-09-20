import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { router, Stack } from 'expo-router'

import { formatBytes } from '@pear-notes/core/utils.js'

import { BottomActionSheet } from '@/components/android/BottomActionSheet'
import { useMD3CommonStyles } from '@/components/android/useMD3CommonStyles'
import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text, useTheme } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_24,
  UI_SIZE_4,
  UI_SIZE_8,
  UI_SIZE_10,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_28,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getDeleteConfirmText, getLicenseLabel, getModelSubtitle } from '@/lib/localAi/modelRows'

import useOnDeviceAiModelsScreen from './useOnDeviceAiModelsScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
}

export default function AndroidOnDeviceAiModelsScreen() {
  const { t } = useTranslation()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleDanger = useMemo(() => androidRipple(c.error), [c.error])
  const {
    loaded,
    models,
    bytesOnDisk,
    confirm,
    requestDeleteModel,
    requestDeleteAll,
    confirmDelete,
    dismissConfirm,
  } = useOnDeviceAiModelsScreen()

  const confirmText = confirm ? getDeleteConfirmText(t, confirm) : null
  const confirmActions = useMemo(
    () =>
      confirmText
        ? [
            {
              icon: 'trash-can-outline',
              label: confirmText.confirmLabel,
              destructive: true,
              onPress: confirmDelete,
            },
          ]
        : [],
    [confirmDelete, confirmText],
  )

  return (
    <View style={styles.root}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          android_ripple={ripple}
          hitSlop={UI_SIZE_12}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={UI_ICON_SIZE_24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.onDeviceAi.modelsTitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.intro}>
          {t('settings.onDeviceAi.modelsDesc', { size: formatBytes(bytesOnDisk) })}
        </Text>

        {!loaded ? (
          <View style={[styles.card, styles.loadingCard]}>
            <ActivityIndicator color={c.primary} />
            <Text style={styles.rowDesc}>{t('settings.onDeviceAi.loading')}</Text>
          </View>
        ) : models.length === 0 ? (
          <View style={[styles.card, styles.emptyCard]}>
            <Text style={styles.rowDesc}>{t('settings.onDeviceAi.modelsEmpty')}</Text>
          </View>
        ) : (
          <>
            <Text style={md3Styles.settingsSectionCamelCase}>
              {t('settings.onDeviceAi.downloaded')}
            </Text>
            <View style={styles.card}>
              {models.map((row, index) => (
                <View
                  key={row.name}
                  style={index < models.length - 1 ? styles.rowDivider : styles.row}
                >
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowLabel}>
                      {t(`settings.onDeviceAi.modelNames.${row.name}`)}
                    </Text>
                    <Text style={styles.rowDesc}>{getModelSubtitle(t, row)}</Text>
                    <Text style={styles.rowDesc}>{getLicenseLabel(t, row)}</Text>
                    {row.docsUrl && (
                      <Text
                        style={styles.rowLink}
                        accessibilityRole="link"
                        onPress={() => Linking.openURL(row.docsUrl as string)}
                      >
                        {t('settings.onDeviceAi.modelDocs')}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => requestDeleteModel(row)}
                    android_ripple={rippleDanger}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.onDeviceAi.deleteModel')}
                    style={styles.deleteIconBtn}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={UI_ICON_SIZE_20}
                      color={c.error}
                    />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.dangerCard}>
              <View style={styles.dangerTextContent}>
                <Text style={styles.dangerCardTitle}>
                  {t('settings.onDeviceAi.deleteAllModels')}
                </Text>
                <Text style={styles.dangerDesc}>
                  {t('settings.onDeviceAi.deleteAllModelsDesc')}
                </Text>
              </View>
              <Pressable
                onPress={requestDeleteAll}
                android_ripple={rippleDanger}
                style={styles.dangerBtn}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={UI_ICON_SIZE_20}
                  color={c.error}
                />
                <Text style={styles.dangerBtnText}>{t('settings.onDeviceAi.deleteAllModels')}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <BottomActionSheet
        visible={!!confirm}
        onDismiss={dismissConfirm}
        title={confirmText?.title ?? ''}
        subtitle={confirmText?.message}
        showHeader
        actions={confirmActions}
      />
    </View>
  )
}

const useModelsScreenHooks = () => {
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
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: UI_SIZE_16,
    },
    iconBtn: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      ...commonStyles.centered,
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
    },
    headerTitle: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
    },
    scrollContent: {
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    intro: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginHorizontal: UI_SIZE_8,
      marginBottom: UI_SIZE_16,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
    },
    loadingCard: {
      ...commonStyles.row,
      gap: UI_SIZE_12,
      padding: UI_SIZE_16,
    },
    emptyCard: {
      padding: UI_SIZE_16,
    },
    row: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      gap: UI_SIZE_16,
      padding: UI_SIZE_16,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      ...commonStyles.row,
      justifyContent: 'space-between',
      gap: UI_SIZE_16,
      marginHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_16,
      borderBottomColor: hexWithAlpha(c.onSurface, 0.12),
    },
    rowInfo: {
      ...commonStyles.flex1,
      gap: UI_SIZE_4,
    },
    rowLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    rowDesc: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    rowLink: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.primary,
      marginTop: 2,
    },
    deleteIconBtn: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      ...commonStyles.centered,
      overflow: 'hidden',
      borderRadius: UI_SIZE_9999,
      backgroundColor: hexWithAlpha(c.error, 0.08),
    },
    dangerCard: {
      ...commonStyles.centered,
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      padding: UI_SIZE_16,
      gap: UI_SIZE_16,
    },
    dangerTextContent: {
      alignSelf: 'stretch',
    },
    dangerCardTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurface,
      marginBottom: UI_SIZE_4,
    },
    dangerDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      lineHeight: FontSize.caption * 1.4,
    },
    dangerBtn: {
      overflow: 'hidden',
      ...commonStyles.row,
      ...commonStyles.centered,
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_10,
      borderRadius: UI_SIZE_12,
      backgroundColor: hexWithAlpha(c.error, 0.08),
      width: '100%',
    },
    dangerBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.error,
    },
  })
  return styles
}, useModelsScreenHooks)
