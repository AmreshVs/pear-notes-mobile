import React from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { SymbolView } from 'expo-symbols'
import { VideoView } from 'expo-video'

import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { useVideoPlayerModal } from '@/components/useVideoPlayerModal'
import {
  commonStyles,
  Radii,
  UI_ICON_SIZE_20,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_40,
} from '@/constants/commonStyles'
import { hexWithAlpha } from '@/lib/backupUtils'

type Props = {
  uri: string
  title: string
  onClose: () => void
  onError: () => void
}

export function VideoPlayerModal({ uri, title, onClose, onError }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const {
    player,
    headerInset,
    controlsVisible,
    closeButtonAnimatedStyle,
    handleTouchStart,
    handleTouchEnd,
  } = useVideoPlayerModal(uri, title, onError)

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View
        style={styles.container}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <VideoView
          player={player}
          style={commonStyles.flex1}
          nativeControls
          contentFit="contain"
          allowsPictureInPicture={false}
        />
        <Animated.View
          style={[styles.header, headerInset, closeButtonAnimatedStyle]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={UI_SIZE_12}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && commonStyles.pressed]}
          >
            <SymbolView
              name="xmark"
              size={UI_ICON_SIZE_20}
              tintColor={colors.white}
              weight="semibold"
            />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.black,
    },
    header: {
      position: 'absolute',
      right: UI_SIZE_16,
    },
    closeButton: {
      width: UI_SIZE_40,
      height: UI_SIZE_40,
      borderRadius: Radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(theme.colors.white, 0.15),
    },
  })
  return styles
})
