import { Fragment, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View as RNView } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'

import { LOCAL_AI_LANGUAGE } from '@pear-notes/core/store/services/localAiCatalog.js'
import { formatBytes } from '@pear-notes/core/utils.js'

import { Divider } from '@/components/Divider'
import { SymbolIcon } from '@/components/SymbolIcon'
import { createThemedStylesheet, Text, useColors } from '@/components/Themed'
import {
  commonStyles,
  FontFamily,
  FontSize,
  FontWeight,
  Radii,
  Space,
  UI_ICON_SIZE_16,
  UI_SIZE_44,
  UI_SIZE_60,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getDeleteConfirmText, getFeatureTitles, getLicenseLabel } from '@/lib/localAi/modelRows'

import useOnDeviceAiFeatureScreen from './useOnDeviceAiFeatureScreen'

export default function OnDeviceAiFeatureScreen() {
  const { t } = useTranslation()
  const { feature } = useLocalSearchParams<{ feature: string }>()
  const colors = useColors()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
  const {
    featureId,
    tiers,
    routing,
    advancedChoices,
    advancedExpanded,
    toggleAdvanced,
    selectModel,
    languages,
    models,
    confirm,
    selectTier,
    selectLanguage,
    requestDeleteModel,
    confirmDelete,
    dismissConfirm,
  } = useOnDeviceAiFeatureScreen(feature)

  useEffect(() => {
    if (!confirm) return
    const text = getDeleteConfirmText(t, confirm)
    Alert.alert(
      text.title,
      text.message,
      [
        { text: t('common.cancel'), style: 'cancel', onPress: dismissConfirm },
        { text: text.confirmLabel, style: 'destructive', onPress: confirmDelete },
      ],
      { cancelable: true, onDismiss: dismissConfirm },
    )
  }, [confirm, confirmDelete, dismissConfirm, t])

  if (!featureId) return null

  const limitationsValue = t(`settings.onDeviceAi.features.${featureId}.limitations`, {
    returnObjects: true,
    defaultValue: [],
  }) as unknown
  const limitations = Array.isArray(limitationsValue) ? (limitationsValue as string[]) : []

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t(`settings.onDeviceAi.features.${featureId}.title`) }} />
      <Text style={styles.intro}>{t(`settings.onDeviceAi.features.${featureId}.desc`)}</Text>

      {languages.length > 0 && (
        <RNView style={styles.section}>
          <Text style={commonThemedStyles.sectionCamelCase}>
            {t('settings.onDeviceAi.language')}
          </Text>
          <RNView style={commonThemedStyles.card}>
            {languages.map((option, index) => (
              <Fragment key={option.language}>
                {index > 0 && (
                  <RNView style={styles.dividerWrap}>
                    <Divider />
                  </RNView>
                )}
                <Pressable
                  onPress={() => selectLanguage(option.language)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.selected }}
                  style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
                >
                  <RNView style={styles.rowInfo}>
                    <Text style={styles.rowLabel}>
                      {t(`settings.onDeviceAi.languages.${option.language}`)}
                    </Text>
                    {option.language === LOCAL_AI_LANGUAGE.ENGLISH && (
                      <Text style={styles.rowDesc}>
                        {t('settings.onDeviceAi.languageEnglishDesc')}
                      </Text>
                    )}
                  </RNView>
                  {option.selected && (
                    <SymbolIcon name="checkmark" size={UI_ICON_SIZE_16} color={colors.primary} />
                  )}
                </Pressable>
              </Fragment>
            ))}
          </RNView>
        </RNView>
      )}

      {tiers.length > 0 && (
        <RNView style={styles.section}>
          <Text style={commonThemedStyles.sectionCamelCase}>
            {t('settings.onDeviceAi.quality')}
          </Text>
          <RNView style={commonThemedStyles.card}>
            {tiers.map((option, index) => (
              <Fragment key={option.tier}>
                {index > 0 && (
                  <RNView style={styles.dividerWrap}>
                    <Divider />
                  </RNView>
                )}
                <Pressable
                  onPress={() => selectTier(option.tier)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.selected }}
                  accessibilityHint={
                    option.fits ? undefined : t('settings.onDeviceAi.tierNeedsMemory')
                  }
                  style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
                >
                  <RNView style={styles.rowInfo}>
                    <Text style={styles.rowLabel}>
                      {t(`settings.onDeviceAi.tiers.${option.tier}`)}
                    </Text>
                    <Text style={styles.rowDesc}>
                      {t(
                        [
                          `settings.onDeviceAi.features.${featureId}.tierDescriptions.${option.tier}`,
                          `settings.onDeviceAi.tierDescriptions.${option.tier}`,
                        ],
                        { size: formatBytes(option.bytes), model: option.modelLabel },
                      )}
                    </Text>
                    {!option.fits && (
                      <Text style={styles.rowWarning}>
                        {t('settings.onDeviceAi.tierNeedsMemory')}
                      </Text>
                    )}
                  </RNView>
                  {option.selected && (
                    <SymbolIcon name="checkmark" size={UI_ICON_SIZE_16} color={colors.primary} />
                  )}
                </Pressable>
              </Fragment>
            ))}
          </RNView>
          {routing && (
            <Text style={styles.note}>
              {t(`settings.onDeviceAi.features.${featureId}.bestRouting`, routing)}
            </Text>
          )}
          {advancedChoices.length > 0 && (
            <RNView style={[commonThemedStyles.card, styles.advancedCard]}>
              <Pressable
                onPress={toggleAdvanced}
                accessibilityRole="button"
                accessibilityState={{ expanded: advancedExpanded }}
                style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
              >
                <Text style={styles.rowLabel}>
                  {t(`settings.onDeviceAi.features.${featureId}.advanced`)}
                </Text>
                <SymbolIcon
                  name={advancedExpanded ? 'chevron.down' : 'chevron.right'}
                  size={UI_ICON_SIZE_16}
                  color={colors.textMuted}
                />
              </Pressable>
              {advancedExpanded &&
                advancedChoices.map((choice) => (
                  <Fragment key={choice.key}>
                    <RNView style={styles.dividerWrap}>
                      <Divider />
                    </RNView>
                    <Pressable
                      onPress={() => selectModel(choice.model)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: choice.selected }}
                      accessibilityHint={
                        choice.fits ? undefined : t('settings.onDeviceAi.tierNeedsMemory')
                      }
                      style={({ pressed }) => [styles.row, pressed && commonStyles.pressed]}
                    >
                      <RNView style={styles.rowInfo}>
                        <Text style={styles.rowLabel}>
                          {choice.model
                            ? t(`settings.onDeviceAi.features.${featureId}.advancedModel`, {
                                model: choice.modelLabel,
                                size: formatBytes(choice.bytes),
                              })
                            : t(`settings.onDeviceAi.features.${featureId}.advancedAuto`, {
                                model: choice.modelLabel,
                              })}
                        </Text>
                        {choice.largeOnPhone && (
                          <Text style={styles.rowDesc}>
                            {t(`settings.onDeviceAi.features.${featureId}.largeOnPhoneNote`)}
                          </Text>
                        )}
                        {!choice.fits && (
                          <Text style={styles.rowWarning}>
                            {t('settings.onDeviceAi.tierNeedsMemory')}
                          </Text>
                        )}
                      </RNView>
                      {choice.selected && (
                        <SymbolIcon
                          name="checkmark"
                          size={UI_ICON_SIZE_16}
                          color={colors.primary}
                        />
                      )}
                    </Pressable>
                  </Fragment>
                ))}
            </RNView>
          )}
          <Text style={styles.note}>{t('settings.onDeviceAi.tierSwitchNote')}</Text>
        </RNView>
      )}

      {limitations.length > 0 && (
        <RNView style={styles.section}>
          <Text style={commonThemedStyles.sectionCamelCase}>
            {t('settings.onDeviceAi.limitations')}
          </Text>
          <RNView style={commonThemedStyles.card}>
            {limitations.map((item, index) => (
              <Fragment key={item}>
                {index > 0 && (
                  <RNView style={styles.dividerWrap}>
                    <Divider />
                  </RNView>
                )}
                <RNView style={styles.row}>
                  <Text style={styles.limitationText}>{item}</Text>
                </RNView>
              </Fragment>
            ))}
          </RNView>
        </RNView>
      )}

      <RNView style={styles.section}>
        <Text style={commonThemedStyles.sectionCamelCase}>{t('settings.onDeviceAi.model')}</Text>
        <RNView style={commonThemedStyles.card}>
          {models.length === 0 && (
            <RNView style={styles.row}>
              <RNView style={styles.rowInfo}>
                <Text style={styles.rowDesc}>{t('settings.onDeviceAi.noLanguagesYet')}</Text>
              </RNView>
            </RNView>
          )}
          {models.map((row, index) => {
            const otherUsers = row.users.filter((user) => user !== featureId)
            return (
              <Fragment key={row.name}>
                {index > 0 && (
                  <RNView style={styles.dividerWrap}>
                    <Divider />
                  </RNView>
                )}
                <RNView style={styles.row}>
                  <RNView style={styles.rowInfo}>
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
                  </RNView>
                  {!row.onDevice && (
                    <Text style={styles.statusText}>{t('settings.onDeviceAi.notDownloaded')}</Text>
                  )}
                  {row.onDevice && otherUsers.length === 0 && (
                    <Pressable
                      onPress={() => requestDeleteModel(row)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.deleteBtn, pressed && commonStyles.pressed]}
                    >
                      <Text style={styles.deleteBtnText}>
                        {t('settings.onDeviceAi.deleteModel')}
                      </Text>
                    </Pressable>
                  )}
                </RNView>
              </Fragment>
            )
          })}
        </RNView>
      </RNView>
    </ScrollView>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    scroll: {
      paddingHorizontal: Space.lg,
      paddingTop: Space.md,
      paddingBottom: UI_SIZE_60,
    },
    intro: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      lineHeight: FontSize.body * 1.45,
      marginHorizontal: Space.xs,
    },
    section: {
      marginTop: Space.lg,
    },
    advancedCard: {
      marginTop: Space.md,
    },
    row: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      gap: Space.base,
      minHeight: UI_SIZE_44,
      padding: Space.base,
    },
    rowInfo: {
      flex: 1,
    },
    rowLabel: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.body,
      color: theme.colors.textMuted,
    },
    rowLink: {
      fontSize: FontSize.body,
      color: theme.colors.primary,
      marginTop: 2,
    },
    rowWarning: {
      fontSize: FontSize.body,
      color: theme.colors.warning,
    },
    limitationText: {
      flex: 1,
      fontSize: FontSize.body,
      lineHeight: FontSize.body * 1.4,
      color: theme.colors.text,
    },
    dividerWrap: {
      marginHorizontal: Space.base,
    },
    note: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
      marginTop: Space.sm,
      marginHorizontal: Space.sm,
    },
    statusText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.medium,
      color: theme.colors.textMuted,
    },
    deleteBtn: {
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.md,
      backgroundColor: `${theme.colors.error}10`,
    },
    deleteBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.error,
    },
  })
  return styles
})
