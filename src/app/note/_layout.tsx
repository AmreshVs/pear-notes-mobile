import { StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

import { createThemedStylesheet } from '@/components/Themed'

export default function NoteLayout() {
  const styles = useStyles()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: styles.content,
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  )
}

const useStyles = createThemedStylesheet((theme) => {
  const styles = StyleSheet.create({
    content: {
      backgroundColor: theme.colors.transparent,
    },
  })
  return styles
})
