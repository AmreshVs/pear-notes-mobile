import { Redirect } from 'expo-router'

import { AI_SUGGESTION } from '@pear-notes/core/store/services/aiSuggestionPrefs.js'

import { BirthdaysPane } from '@/components/upcoming/BirthdaysPane'
import { useAiSuggestionOn } from '@/hooks/useAiSuggestionOn'

export default function BirthdaysScreen() {
  const on = useAiSuggestionOn(AI_SUGGESTION.TASKS)
  if (!on) return <Redirect href="/" />
  return <BirthdaysPane />
}
