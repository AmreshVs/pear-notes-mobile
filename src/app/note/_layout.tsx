import { Stack } from 'expo-router'
import { useColorScheme } from 'react-native'

export default function NoteLayout() {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTransparent: false,
        headerStyle: {
          backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
        },
        headerTintColor: isDark ? '#FFFFFF' : '#000000',
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
