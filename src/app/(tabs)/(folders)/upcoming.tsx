import { Redirect } from 'expo-router'

import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'

import { UpcomingPane } from '@/components/upcoming/UpcomingPane'
import { useAiSuggestionOn } from '@/hooks/useAiSuggestionOn'

export default function UpcomingScreen() {
  const on = useAiSuggestionOn(AI_SUGGESTION.TASKS)
  if (!on) return <Redirect href="/" />
  return <UpcomingPane />
}
