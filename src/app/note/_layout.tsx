import { Stack } from 'expo-router'

export default function NoteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
