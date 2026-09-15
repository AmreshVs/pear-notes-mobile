import { Fragment, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
} from 'react-native'

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
  UI_SIZE_60,
} from '@/constants/commonStyles'
import { useCommonThemedStyles } from '@/constants/commonThemedStyles'
import { getDeleteConfirmText, getLicenseLabel, getModelSubtitle } from '@/lib/localAi/modelRows'

import useOnDeviceAiModelsScreen from './useOnDeviceAiModelsScreen'

export default function OnDeviceAiModelsScreen() {
  const { t } = useTranslation()
  const colors = useColors()
  const styles = useStyles()
  const commonThemedStyles = useCommonThemedStyles()
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

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        {t('settings.onDeviceAi.modelsDesc', { size: formatBytes(bytesOnDisk) })}
      </Text>

      {!loaded ? (
        <RNView style={[commonThemedStyles.card, styles.loadingCard]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.rowDesc}>{t('settings.onDeviceAi.loading')}</Text>
        </RNView>
      ) : models.length === 0 ? (
        <RNView style={[commonThemedStyles.card, styles.emptyCard]}>
          <Text style={styles.rowDesc}>{t('settings.onDeviceAi.modelsEmpty')}</Text>
        </RNView>
      ) : (
        <>
          <Text style={commonThemedStyles.sectionCamelCase}>
            {t('settings.onDeviceAi.downloaded')}
          </Text>
          <RNView style={commonThemedStyles.card}>
            {models.map((row, index) => (
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
                    <Text style={styles.rowDesc}>{getModelSubtitle(t, row)}</Text>
                    <Text style={styles.rowDesc}>{getLicenseLabel(t, row)}</Text>
                  </RNView>
                  <Pressable
                    onPress={() => requestDeleteModel(row)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.onDeviceAi.deleteModel')}
                    style={({ pressed }) => [styles.iconBtn, pressed && commonStyles.pressed]}
                  >
                    <SymbolIcon
                      name="trash"
                      size={UI_ICON_SIZE_16}
                      color={colors.error}
                      weight="medium"
                    />
                  </Pressable>
                </RNView>
              </Fragment>
            ))}
          </RNView>

          <RNView style={styles.section}>
            <Text style={[commonThemedStyles.sectionCamelCase, commonStyles.sectionHeader]}>
              {t('storage.dangerZone')}
            </Text>
            <RNView style={[commonThemedStyles.card, styles.dangerCard]}>
              <Text style={styles.dangerTitle}>{t('settings.onDeviceAi.deleteAllModels')}</Text>
              <Text style={styles.dangerDesc}>{t('settings.onDeviceAi.deleteAllModelsDesc')}</Text>
              <Pressable
                onPress={requestDeleteAll}
                style={({ pressed }) => [styles.dangerBtn, pressed && commonStyles.pressed]}
              >
                <SymbolIcon
                  name="trash"
                  size={UI_ICON_SIZE_16}
                  color={colors.error}
                  weight="medium"
                />
                <Text style={styles.dangerBtnText}>{t('settings.onDeviceAi.deleteAllModels')}</Text>
              </Pressable>
            </RNView>
          </RNView>
        </>
      )}
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
      marginBottom: Space.lg,
    },
    section: {
      marginTop: Space.lg,
    },
    loadingCard: {
      ...commonStyles.row,
      gap: Space.sm,
      padding: Space.lg,
    },
    emptyCard: {
      padding: Space.lg,
    },
    row: {
      ...commonStyles.row,
      justifyContent: 'space-between',
      gap: Space.base,
      padding: Space.base,
    },
    rowInfo: {
      flex: 1,
      gap: Space.xs,
    },
    rowLabel: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      color: theme.colors.text,
    },
    rowDesc: {
      fontSize: FontSize.caption,
      color: theme.colors.textMuted,
    },
    dividerWrap: {
      marginHorizontal: Space.base,
    },
    iconBtn: {
      padding: Space.sm,
      borderRadius: Radii.md,
      backgroundColor: `${theme.colors.error}10`,
    },
    dangerCard: {
      padding: Space.lg,
    },
    dangerTitle: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: theme.colors.text,
      marginBottom: Space.xs,
    },
    dangerDesc: {
      fontSize: FontSize.body,
      fontFamily: FontFamily.regular,
      color: theme.colors.textMuted,
      lineHeight: FontSize.caption * 1.4,
    },
    dangerBtn: {
      ...commonStyles.row,
      ...commonStyles.centered,
      gap: Space.sm,
      paddingHorizontal: Space.base,
      paddingVertical: Space.sm,
      borderRadius: Radii.md,
      backgroundColor: `${theme.colors.error}10`,
      marginTop: Space.md,
    },
    dangerBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.semibold,
      fontFamily: FontFamily.semiBold,
      color: theme.colors.error,
    },
  })
  return styles
})
