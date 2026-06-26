import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { useMD3Theme } from '@/components/android/useMD3Theme'
import { createThemedStylesheetWithHooks, Text } from '@/components/Themed'
import {
  FontFamily,
  FontWeight,
  UI_FONT_SIZE_11,
  UI_FONT_SIZE_13,
  UI_FONT_SIZE_14,
  UI_FONT_SIZE_20,
  UI_ICON_SIZE_48,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_18,
  UI_SIZE_2,
  UI_SIZE_20,
  UI_SIZE_24,
  UI_SIZE_32,
  UI_SIZE_40,
  UI_SIZE_8,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type EmptyStateProps = {
  hasSearch: boolean
  isSynced: boolean
  onLinkDevice: () => void
  height: number
}

export const AndroidEmptyState = memo(function AndroidEmptyState({
  hasSearch,
  isSynced,
  onLinkDevice,
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
          {!isSynced && (
            <View style={styles.linkBox}>
              <View style={styles.divider} />
              <Text style={styles.linkTitle}>
                {t('folderView.empty.linkTitle')}
              </Text>
              <Text style={styles.linkSub}>
                {t('folderView.empty.linkSub')}
              </Text>
              <Pressable
                onPress={onLinkDevice}
                style={({ pressed }) => [
                  styles.linkBtn,
                  pressed && styles.linkBtnPressed,
                ]}
              >
                <Text style={styles.linkBtnText}>
                  {t('folderView.empty.connectBtn')}
                </Text>
              </Pressable>
            </View>
          )}
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
      fontSize: UI_FONT_SIZE_20,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      marginTop: UI_SIZE_16,
      marginBottom: UI_SIZE_8,
      color: c.onSurface,
    },
    subtitle: {
      fontSize: UI_FONT_SIZE_14,
      textAlign: 'center',
      fontFamily: FontFamily.regular,
      lineHeight: UI_SIZE_20,
      color: c.onSurfaceVariant,
    },
    linkBox: {
      alignItems: 'center',
      marginTop: UI_SIZE_32,
      width: '100%',
    },
    divider: {
      width: UI_SIZE_40,
      height: 3,
      borderRadius: UI_SIZE_2,
      marginBottom: UI_SIZE_24,
      backgroundColor: hexWithAlpha(c.outlineVariant, 0.3),
    },
    linkTitle: {
      fontSize: UI_FONT_SIZE_11,
      fontWeight: FontWeight.heavy,
      fontFamily: FontFamily.extraBold,
      letterSpacing: 1.2,
      marginBottom: UI_SIZE_8,
      color: c.onSurface,
    },
    linkSub: {
      fontSize: UI_FONT_SIZE_13,
      marginBottom: UI_SIZE_18,
      fontFamily: FontFamily.regular,
      color: c.onSurfaceVariant,
    },
    linkBtn: {
      paddingHorizontal: UI_SIZE_24,
      paddingVertical: UI_SIZE_12,
      borderRadius: UI_SIZE_12,
      backgroundColor: c.primaryContainer,
    },
    linkBtnPressed: {
      opacity: 0.8,
    },
    linkBtnText: {
      fontSize: UI_FONT_SIZE_13,
      fontWeight: FontWeight.bold,
      fontFamily: FontFamily.bold,
      color: c.onPrimaryContainer,
    },
  })
  return styles
}, useEmptyHooks)
