import { useMemo, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Easing, Keyframe } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { Image } from 'expo-image'

import { MotionView } from '@/components/MotionView'
import { commonStyles } from '@/constants/commonStyles'

import { createThemedStylesheet } from './Themed'

const DURATION = 600

export function AnimatedSplashOverlay() {
  const { height } = useWindowDimensions()
  const initialScaleFactor = height / 90
  const [visible, setVisible] = useState(true)
  const styles = useStyles()

  const splashKeyframe = useMemo(
    () =>
      new Keyframe({
        0: {
          transform: [{ scale: initialScaleFactor }],
          opacity: 1,
        },
        20: {
          opacity: 1,
        },
        70: {
          opacity: 0,
          easing: Easing.elastic(0.7),
        },
        100: {
          opacity: 0,
          transform: [{ scale: 1 }],
          easing: Easing.elastic(0.7),
        },
      }),
    [initialScaleFactor],
  )

  if (!visible) return null

  return (
    <MotionView
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet'
        if (finished) {
          scheduleOnRN(setVisible, false)
        }
      })}
      style={styles.backgroundSolidColor}
    />
  )
}

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
})

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
})

export function AnimatedIcon() {
  const { height } = useWindowDimensions()
  const initialScaleFactor = height / 90
  const styles = useStyles()

  const keyframe = useMemo(
    () =>
      new Keyframe({
        0: {
          transform: [{ scale: initialScaleFactor }],
        },
        100: {
          transform: [{ scale: 1 }],
          easing: Easing.elastic(0.7),
        },
      }),
    [initialScaleFactor],
  )

  return (
    <View style={styles.iconContainer}>
      <MotionView entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </MotionView>

      <MotionView entering={keyframe.duration(DURATION)} style={styles.background} />
      <MotionView style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </MotionView>
    </View>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    imageContainer: {
      ...commonStyles.centered,
    },
    glow: {
      width: 201,
      height: 201,
      position: 'absolute',
    },
    iconContainer: {
      ...commonStyles.centered,
      width: 128,
      height: 128,
      zIndex: 100,
    },
    image: {
      position: 'absolute',
      width: 76,
      height: 71,
    },
    background: {
      borderRadius: 40,
      width: 128,
      height: 128,
      position: 'absolute',
      backgroundColor: theme.colors.primary,
    },
    backgroundSolidColor: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.colors.primary,
      zIndex: 1000,
    },
  })
  return styles
})
