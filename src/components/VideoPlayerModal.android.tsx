import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static'
import { VideoView } from 'expo-video'

import { createThemedStylesheet, useTheme } from '@/components/Themed'
import { useVideoPlayerModal } from '@/components/useVideoPlayerModal'
import {
  commonStyles,
  UI_ICON_SIZE_24,
  UI_SIZE_12,
  UI_SIZE_16,
  UI_SIZE_40,
  UI_SIZE_9999,
} from '@/constants/commonStyles'
import { androidRipple } from '@/lib/androidRipple'
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
  const ripple = useMemo(() => androidRipple(colors.white), [colors.white])
  const {
    player,
    headerInset,
    controlsVisible,
    closeButtonAnimatedStyle,
    handleTouchStart,
    handleTouchEnd,
  } = useVideoPlayerModal(uri, title, onError)

  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
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
            android_ripple={ripple}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons name="close" size={UI_ICON_SIZE_24} color={colors.white} />
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
      borderRadius: UI_SIZE_9999,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hexWithAlpha(theme.colors.white, 0.15),
    },
  })
  return styles
})
