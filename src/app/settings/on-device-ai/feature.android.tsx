import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { Stack, useLocalSearchParams } from 'expo-router'

import { LOCAL_AI_LANGUAGE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { AndroidSettingsAppBar } from '@/components/android/AndroidSettingsAppBar'
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
  UI_SIZE_8,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_28,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'
import { getDeleteConfirmText, getFeatureTitles, getLicenseLabel } from '@/lib/localAi/modelRows'

import useOnDeviceAiFeatureScreen from './useOnDeviceAiFeatureScreen'

type ExtendedColors = ReturnType<typeof useMD3Theme>['colors'] & {
  surfaceContainerHigh?: string
  onSurfaceVariant?: string
  warning?: string
}

export default function AndroidOnDeviceAiFeatureScreen() {
  const { t } = useTranslation()
  const { feature } = useLocalSearchParams<{ feature: string }>()
  const theme = useTheme()
  const md3 = useMD3Theme()
  const c = md3.colors as ExtendedColors
  const styles = useStyles()
  const md3Styles = useMD3CommonStyles()
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])
  const rippleDanger = useMemo(() => androidRipple(c.error), [c.error])
  const {
    featureId,
    tiers,
    languages,
    models,
    confirm,
    selectTier,
    selectLanguage,
    requestDeleteModel,
    confirmDelete,
    dismissConfirm,
  } = useOnDeviceAiFeatureScreen(feature)
  const limitationsValue = featureId
    ? (t(`settings.onDeviceAi.features.${featureId}.limitations`, {
        returnObjects: true,
        defaultValue: [],
      }) as unknown)
    : []
  const limitations = Array.isArray(limitationsValue) ? (limitationsValue as string[]) : []

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

      <AndroidSettingsAppBar
        title={featureId ? t(`settings.onDeviceAi.features.${featureId}.title`) : ''}
      />

      {featureId && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.intro}>{t(`settings.onDeviceAi.features.${featureId}.desc`)}</Text>

          {languages.length > 0 && (
            <>
              <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
                {t('settings.onDeviceAi.language')}
              </Text>
              <View style={styles.card}>
                {languages.map((option, index) => (
                  <Pressable
                    key={option.language}
                    onPress={() => selectLanguage(option.language)}
                    android_ripple={ripple}
                    accessibilityRole="button"
                    accessibilityState={{ selected: option.selected }}
                    style={index < languages.length - 1 ? styles.rowDivider : styles.row}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowLabel}>
                        {t(`settings.onDeviceAi.languages.${option.language}`)}
                      </Text>
                      {option.language === LOCAL_AI_LANGUAGE.ENGLISH && (
                        <Text style={styles.rowDesc}>
                          {t('settings.onDeviceAi.languageEnglishDesc')}
                        </Text>
                      )}
                    </View>
                    {option.selected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={UI_ICON_SIZE_20}
                        color={c.primary}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {tiers.length > 0 && (
            <>
              <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
                {t('settings.onDeviceAi.quality')}
              </Text>
              <View style={styles.card}>
                {tiers.map((option, index) => (
                  <Pressable
                    key={option.tier}
                    onPress={() => selectTier(option.tier)}
                    android_ripple={ripple}
                    accessibilityRole="button"
                    accessibilityState={{ selected: option.selected }}
                    accessibilityHint={
                      option.fits ? undefined : t('settings.onDeviceAi.tierNeedsMemory')
                    }
                    style={index < tiers.length - 1 ? styles.rowDivider : styles.row}
                  >
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowLabel}>
                        {t(`settings.onDeviceAi.tiers.${option.tier}`)}
                      </Text>
                      <Text style={styles.rowDesc}>
                        {t(
                          [
                            `settings.onDeviceAi.features.${featureId}.tierDescriptions.${option.tier}`,
                            `settings.onDeviceAi.tierDescriptions.${option.tier}`,
                          ],
                          { size: formatBytes(option.bytes) },
                        )}
                      </Text>
                      {!option.fits && (
                        <Text style={styles.rowWarning}>
                          {t('settings.onDeviceAi.tierNeedsMemory')}
                        </Text>
                      )}
                    </View>
                    {option.selected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={UI_ICON_SIZE_20}
                        color={c.primary}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
              <Text style={styles.note}>{t('settings.onDeviceAi.tierSwitchNote')}</Text>
            </>
          )}

          {limitations.length > 0 && (
            <>
              <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
                {t('settings.onDeviceAi.limitations')}
              </Text>
              <View style={styles.card}>
                {limitations.map((item, index) => (
                  <View
                    key={item}
                    style={index < limitations.length - 1 ? styles.rowDivider : styles.row}
                  >
                    <Text style={styles.limitationText}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={[md3Styles.settingsSectionCamelCase, commonStyles.sectionHeader]}>
            {t('settings.onDeviceAi.model')}
          </Text>
          <View style={styles.card}>
            {models.length === 0 && (
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowDesc}>{t('settings.onDeviceAi.noLanguagesYet')}</Text>
                </View>
              </View>
            )}
            {models.map((row, index) => {
              const otherUsers = row.users.filter((user) => user !== featureId)
              return (
                <Fragment key={row.name}>
                  <View style={index < models.length - 1 ? styles.rowDivider : styles.row}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowLabel}>
                        {t(`settings.onDeviceAi.modelNames.${row.name}`)}
                      </Text>
                      <Text style={styles.rowDesc}>
                        {`${formatBytes(row.bytes)} · ${getLicenseLabel(t, row)}`}
                      </Text>
                      {row.onDevice && otherUsers.length > 0 && (
                        <Text style={styles.rowDesc}>
                          {t('settings.onDeviceAi.sharedModel', {
                            features: getFeatureTitles(t, otherUsers),
                          })}
                        </Text>
                      )}
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
                    {!row.onDevice && (
                      <Text style={styles.statusText}>
                        {t('settings.onDeviceAi.notDownloaded')}
                      </Text>
                    )}
                    {row.onDevice && otherUsers.length === 0 && (
                      <Pressable
                        onPress={() => requestDeleteModel(row)}
                        android_ripple={rippleDanger}
                        accessibilityRole="button"
                        style={styles.deleteBtn}
                      >
                        <Text style={styles.deleteBtnText}>
                          {t('settings.onDeviceAi.deleteModel')}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Fragment>
              )
            })}
          </View>
        </ScrollView>
      )}

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

const useFeatureScreenHooks = () => {
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
    scrollContent: {
      paddingHorizontal: UI_SIZE_16,
      paddingBottom: insets.bottom + UI_SIZE_40,
    },
    intro: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginHorizontal: UI_SIZE_8,
    },
    card: {
      backgroundColor: c.surfaceContainerHigh ?? c.surfaceVariant,
      borderRadius: UI_SIZE_28,
      overflow: 'hidden',
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
    },
    rowLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: c.onSurface,
    },
    rowDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    rowWarning: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.warning ?? c.onSurfaceVariant,
    },
    rowLink: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: c.primary,
      marginTop: 2,
    },
    limitationText: {
      flex: 1,
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      lineHeight: FontSize.body * 1.4,
      color: c.onSurface,
    },
    note: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
      marginTop: UI_SIZE_8,
      marginHorizontal: UI_SIZE_8,
    },
    statusText: {
      fontSize: FontSize.caption,
      fontFamily: FontFamily.medium,
      color: c.onSurfaceVariant,
    },
    deleteBtn: {
      overflow: 'hidden',
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_8,
      borderRadius: UI_SIZE_20,
      backgroundColor: hexWithAlpha(c.error, 0.08),
    },
    deleteBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: c.error,
    },
  })
  return styles
}, useFeatureScreenHooks)
