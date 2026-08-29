import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import { FadeIn } from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'

import { TRASH_RETENTION_DAYS } from '@pear-notes/core/constant.js'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { MotionView } from '@/components/MotionView'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_20,
  UI_ICON_SIZE_48,
  UI_SIZE_8,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
import { hexWithAlpha } from '@/lib/backupUtils'

type EmptyStateProps = {
  hasSearch: boolean
  isOnboarding: boolean
  isTrash?: boolean
  onLinkDevice: () => void
  onCreateNote: () => void
  onRestoreBackup: () => void
  height: number
}

export const AndroidEmptyState = memo(function AndroidEmptyState({
  hasSearch,
  isOnboarding,
  isTrash,
  onLinkDevice,
  onCreateNote,
  onRestoreBackup,
  height,
}: EmptyStateProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors
  const ripplePrimary = useMemo(() => androidRipple(c.onPrimary), [c.onPrimary])
  const ripple = useMemo(() => androidRipple(c.onSurface), [c.onSurface])

  return (
    <MotionView
      entering={FadeIn.duration(300)}
      style={[styles.wrapper, { marginTop: height * 0.2 }]}
    >
      {hasSearch ? (
        <>
          <MaterialCommunityIcons
            name="text-search"
            size={UI_ICON_SIZE_48}
            color={hexWithAlpha(c.onSurfaceVariant, 0.3)}
          />
          <Text style={styles.title}>
            {t('folderView.empty.noMatchesTitle')}
          </Text>
          <Text style={styles.subtitle}>
            {t('folderView.empty.noMatchesSubtitle')}
          </Text>
        </>
      ) : isOnboarding ? (
        <>
          <MaterialCommunityIcons
            name="notebook-outline"
            size={UI_ICON_SIZE_48}
            color={c.primary}
          />
          <Text style={styles.title}>
            {t('folderView.empty.onboardingTitle')}
          </Text>
          <Text style={styles.subtitle}>
            {t('folderView.empty.onboardingSubtitle')}
          </Text>
          <View style={styles.ctaRow}>
            <Pressable
              onPress={onCreateNote}
              android_ripple={ripplePrimary}
              style={styles.primaryBtn}
            >
              <MaterialCommunityIcons
                name="plus"
                size={UI_ICON_SIZE_20}
                color={c.onPrimary}
              />
              <Text style={styles.primaryBtnText}>
                {t('folderView.empty.newNoteBtn')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onLinkDevice}
              android_ripple={ripple}
              style={styles.secondaryBtn}
            >
              <MaterialCommunityIcons
                name="devices"
                size={UI_ICON_SIZE_20}
                color={c.primary}
              />
              <Text style={styles.secondaryBtnText}>
                {t('folderView.empty.connectBtn')}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={onRestoreBackup}
            android_ripple={ripple}
            style={styles.tertiaryBtn}
          >
            <MaterialCommunityIcons
              name="restore"
              size={UI_ICON_SIZE_20}
              color={c.onSurfaceVariant}
            />
            <Text style={styles.tertiaryBtnText}>
              {t('folderView.empty.restoreBtn')}
            </Text>
          </Pressable>
        </>
      ) : isTrash ? (
        <>
          <MaterialCommunityIcons
            name="delete-empty-outline"
            size={UI_ICON_SIZE_48}
            color={hexWithAlpha(c.onSurfaceVariant, 0.3)}
          />
          <Text style={styles.title}>
            {t('folderView.empty.trashEmptyTitle')}
          </Text>
          <Text style={styles.subtitle}>
            {t('folderView.empty.trashEmptySubtitle', { days: TRASH_RETENTION_DAYS })}
          </Text>
        </>
      ) : (
        <>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={UI_ICON_SIZE_48}
            color={hexWithAlpha(c.onSurfaceVariant, 0.3)}
          />
          <Text style={styles.title}>
            {t('folderView.empty.noNotesTitle')}
          </Text>
          <Text style={styles.subtitle}>
            {t('folderView.empty.noNotesSubtitle')}
          </Text>
        </>
      )}
    </MotionView>
  )
})

const useEmptyHooks = () => {
  const md3 = useMD3Theme()
  return { md3 }
}

const useStyles = createThemedStylesheetWithHooks((theme, { md3 }) => {
  const c = md3.colors as any
  const styles = StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      paddingHorizontal: UI_SIZE_40,
    },
    title: {
      fontSize: FontSize.title,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      marginTop: UI_SIZE_16,
      marginBottom: UI_SIZE_8,
      color: c.onSurface,
    },
    subtitle: {
      fontSize: FontSize.body,
      textAlign: 'center',
      fontFamily: FontFamily.regular,
      lineHeight: UI_SIZE_20,
      color: c.onSurfaceVariant,
    },
    ctaRow: {
      flexDirection: 'row',
      gap: UI_SIZE_12,
      marginTop: UI_SIZE_24,
    },
    primaryBtn: {
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_24,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_12,
      backgroundColor: c.primary,
    },
    secondaryBtn: {
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_24,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_12,
      borderWidth: 1,
      borderColor: c.outline,
    },
    tertiaryBtn: {
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      marginTop: UI_SIZE_16,
      paddingHorizontal: UI_SIZE_16,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_20,
    },
    btnPressed: {
      opacity: 0.8,
    },
    primaryBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onPrimary,
    },
    secondaryBtnText: {
      fontSize: FontSize.body,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.primary,
    },
    tertiaryBtnText: {
      fontSize: FontSize.caption,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onSurfaceVariant,
    },
  })
  return styles
}, useEmptyHooks)
