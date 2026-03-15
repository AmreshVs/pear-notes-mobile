import { Stack } from 'expo-router'

/**
 * Note group layout — only used for deep-link fallback.
 * Normal in-app navigation bypasses this entirely via openNote().
 * Animation is disabled because the NoteEditorProvider overlay handles transitions.
 */
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
