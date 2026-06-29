import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  FontFamily,
  FontSize,
  FontWeight,
  UI_ICON_SIZE_48,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_40,
  UI_SIZE_8,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type EmptyStateProps = {
  hasSearch: boolean
  isOnboarding: boolean
  onLinkDevice: () => void
  onCreateNote: () => void
  height: number
}

export const AndroidEmptyState = memo(function AndroidEmptyState({
  hasSearch,
  isOnboarding,
  onLinkDevice,
  onCreateNote,
  height,
}: EmptyStateProps) {
  const { t } = useTranslation()
  const styles = useStyles()
  const md3 = useMD3Theme()
  const c = md3.colors

  return (
    <Animated.View
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
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <MaterialCommunityIcons
                name="plus"
                size={UI_SIZE_20}
                color={c.onPrimary}
              />
              <Text style={styles.primaryBtnText}>
                {t('folderView.empty.newNoteBtn')}
              </Text>
            </Pressable>
            <Pressable
              onPress={onLinkDevice}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <MaterialCommunityIcons
                name="devices"
                size={UI_SIZE_20}
                color={c.primary}
              />
              <Text style={styles.secondaryBtnText}>
                {t('folderView.empty.connectBtn')}
              </Text>
            </Pressable>
          </View>
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
    </Animated.View>
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_24,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_12,
      backgroundColor: c.primary,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: UI_SIZE_8,
      paddingHorizontal: UI_SIZE_24,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_12,
      borderWidth: 1,
      borderColor: c.outline,
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
  })
  return styles
}, useEmptyHooks)
